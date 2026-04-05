import { NextRequest, NextResponse } from "next/server";

// ─── TIPOS PÚBLICOS ───────────────────────────────────────────────
export interface UrlAnalysis {
  title: string;
  whatHappened: string;
  whoAffected: string;
  whatToDo: string[];
  risk: string;
  recommendation: string;
  sourceUrl: string;
  /** Caracteres de texto útil extraídos del documento */
  extractedChars: number;
  /** "real" ≥ 600 chars de contenido concreto; "limited" 300–599 */
  analysisSource: "real" | "limited";
}

export interface UrlAnalysisError {
  error: string;
  code:
    | "INDEX_PAGE"       // URL es un listado general → 400
    | "INSUFFICIENT"     // Contenido extraído < 300 chars → 422
    | "PDF"              // PDF detectado → 422
    | "FETCH_ERROR"      // Error de red → 502
    | "BLOCKED"          // 403/429 del servidor → 502
    | "AI_ERROR"         // Error de OpenAI → 500
    | "CONFIG_ERROR"     // Falta API key → 503
    | "INVALID_INPUT";   // Body inválido → 400
  suggestion?: string;
}

// ─── USER-AGENT ───────────────────────────────────────────────────
const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 " +
  "(KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";

// ─── LOG HELPER ───────────────────────────────────────────────────
function log(
  level: "info" | "warn" | "error",
  msg: string,
  meta?: Record<string, unknown>
) {
  const prefix = `[analyze-url][${level.toUpperCase()}]`;
  const line = meta ? `${msg} ${JSON.stringify(meta)}` : msg;
  if (level === "error") console.error(prefix, line);
  else if (level === "warn") console.warn(prefix, line);
  else console.log(prefix, line);
}

// ─── DETECCIÓN DE ÍNDICE POR URL ──────────────────────────────────
const INDEX_URL_PATTERNS: RegExp[] = [
  // AEAT listados conocidos
  /todas-noticias/i,
  /\/Sede\/?(?:[?#]|$)/i,
  /\/Inicio\/Novedades\/?(?:[?#]|$)/i,
  /\/Inicio\/?(?:[?#]|$)/i,
  /\/AEAT\.internet\/?(?:[?#]|$)/i,
  /agenciatributaria\.es\/?(?:[?#]|$)/i,
  /sede\.agenciatributaria\.gob\.es\/?(?:[?#]|$)/i,
  // BOE índices y buscadores
  /boe\.es\/boe\/dias\//i,
  /boe\.es\/?(?:[?#]|$)/i,
  /boe\.es\/buscar\//i,
  // Paginación / búsquedas
  /[?&](?:page|pagina|p)=\d+/i,
  /[?&]tipobusqueda=/i,
  // Raíz de dominios conocidos sin path específico
  /^https?:\/\/(?:www\.)?(?:boe\.es|agenciatributaria\.es|hacienda\.gob\.es)\/?(?:[?#]|$)/i,
];

function isIndexByUrl(url: string): boolean {
  return INDEX_URL_PATTERNS.some((p) => p.test(url));
}

// ─── DETECCIÓN DE ÍNDICE POR HTML ────────────────────────────────
/**
 * Analiza el HTML crudo para determinar si es una página de listado.
 * Criterio: muchos enlaces con poco contenido de párrafos = índice.
 */
function isIndexByHtml(html: string): boolean {
  const anchorCount = (html.match(/<a[\s>]/gi) ?? []).length;
  const paragraphCount = (html.match(/<p[\s>]/gi) ?? []).length;

  // Firmas de páginas de listado
  const hasListClass = /<[^>]+class="[^"]*(?:lista|listado|news-list|article-list|noticias)[^"]*"/i.test(html);

  // Muchos links, pocos párrafos = índice
  const linkHeavy = anchorCount > 20 && anchorCount > paragraphCount * 4;

  return linkHeavy || hasListClass;
}

// ─── EXTRACCIÓN DE CONTENIDO ──────────────────────────────────────
interface ExtractionResult {
  text: string;
  strategy: string;
}

function htmlToText(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<nav[\s\S]*?<\/nav>/gi, "")
    .replace(/<header[\s\S]*?<\/header>/gi, "")
    .replace(/<footer[\s\S]*?<\/footer>/gi, "")
    .replace(/<aside[\s\S]*?<\/aside>/gi, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#\d+;/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Extrae el contenido principal del HTML usando estrategias específicas por fuente.
 * NO tiene "body-fallback" genérico — si no encuentra contenido, devuelve vacío.
 */
function extractContent(html: string, url: string): ExtractionResult {
  const lower = url.toLowerCase();

  // ── BOE: id="textoBOE" o id="cuerpoPublicacion" ─────────────────
  if (lower.includes("boe.es")) {
    for (const id of ["textoBOE", "cuerpoPublicacion", "textoBoe"]) {
      const re = new RegExp(`<div[^>]+id="${id}"[^>]*>([\\s\\S]+?)(?=<div[^>]+id="|<\\/body>)`, "i");
      const m = html.match(re);
      if (m) {
        const text = htmlToText(m[1]);
        if (text.length >= 150) return { text: text.slice(0, 9000), strategy: `boe-${id}` };
      }
    }
    // BOE alternativo: recoger todos los <p> después del encabezado
    const boeSection = html.match(/<div[^>]*class="[^"]*dario_boe[^"]*"[^>]*>([\s\S]+)/i);
    if (boeSection) {
      const paras = [...boeSection[1].matchAll(/<p[^>]*>([\s\S]*?)<\/p>/gi)]
        .map((m) => htmlToText(m[1]).trim())
        .filter((t) => t.length > 30);
      if (paras.length >= 2) return { text: paras.join("\n\n").slice(0, 9000), strategy: "boe-paragraphs" };
    }
  }

  // ── AEAT / Sede: clases y IDs conocidos ─────────────────────────
  if (lower.includes("agenciatributaria") || lower.includes("hacienda.gob")) {
    const aeatSelectors = [
      /<div[^>]+id="[^"]*(?:contenido|content|main-content)[^"]*"[^>]*>([\s\S]+?)(?=<div[^>]+id="|<\/main>|<\/body>)/i,
      /<div[^>]+class="[^"]*(?:contenidoTexto|textoInformacion|cuerpo-texto|contenedor-texto|articulo)[^"]*"[^>]*>([\s\S]+?)(?=<div[^>]+class="|<\/section>|<\/main>)/i,
    ];
    for (const re of aeatSelectors) {
      const m = html.match(re);
      if (m) {
        const text = htmlToText(m[1]);
        if (text.length >= 150) return { text: text.slice(0, 9000), strategy: "aeat-selector" };
      }
    }
  }

  // ── Semántica estándar: <main> / <article> ───────────────────────
  const semantic = html.match(/<(?:main|article)\b[^>]*>([\s\S]+?)<\/(?:main|article)>/i);
  if (semantic) {
    const text = htmlToText(semantic[1]);
    if (text.length >= 150) return { text: text.slice(0, 9000), strategy: "semantic-main" };
  }

  // ── Todos los párrafos largos como último recurso ────────────────
  const allParas = [...html.matchAll(/<p[^>]*>([\s\S]*?)<\/p>/gi)]
    .map((m) => htmlToText(m[1]).trim())
    .filter((t) => t.length > 60);
  if (allParas.length >= 3) {
    return { text: allParas.join("\n\n").slice(0, 9000), strategy: "all-paragraphs" };
  }

  // Sin contenido útil encontrado
  return { text: "", strategy: "none" };
}

// ─── PROMPT ──────────────────────────────────────────────────────
function buildMessages(url: string, content: string) {
  const system = `Eres el mejor asesor fiscal de España. Tu único trabajo en este momento es analizar el documento que te proporcionan y explicarlo en lenguaje claro para contribuyentes medios.

REGLAS ABSOLUTAS — sin excepciones:
1. Usa EXCLUSIVAMENTE la información del documento. Cero inventiva. Cero generalización.
2. Si el documento menciona cifras (€, %, fechas, artículos de ley), inclúyelas literalmente.
3. Nunca escribas "en virtud de", "a los efectos de", "la presente disposición" ni similar.
4. Si el contenido no es un documento fiscal específico, devuelve SOLO: {"error":"CONTENT_IS_INDEX"}.
5. Si no hay suficiente información para responder con datos concretos, devuelve SOLO: {"error":"INSUFFICIENT"}.`;

  const user = `Documento oficial a analizar:

URL: ${url}

CONTENIDO EXTRAÍDO:
---
${content}
---

Devuelve ÚNICAMENTE el JSON. Sin markdown. Sin texto fuera del JSON.

{
  "title": "Titular de impacto. Máx. 90 chars. Empieza por la consecuencia. Usa datos del documento (fechas, porcentajes, importes). Nunca empieces por 'La AEAT', 'El BOE' ni 'Nueva'.",
  "whatHappened": "2-3 frases con datos específicos: qué cambia, desde cuándo, referencia normativa exacta si aparece.",
  "whoAffected": "Segmentos precisos con umbrales si los hay (ejemplo: autónomos en módulos con rendimientos >X€). No listas genéricas.",
  "whatToDo": [
    "Verbo imperativo + acción específica + datos concretos del documento",
    "Segunda acción ejecutable esta semana",
    "Qué conservar o dónde verificar (con nombre exacto del modelo o portal si aplica)",
    "Plazo límite si el documento lo menciona"
  ],
  "risk": "Consecuencia exacta de no actuar: recargo X%, multa €Y, pérdida de deducción. Si el documento no da cifras, indica 'el documento no especifica el importe'.",
  "recommendation": "Una sola frase. La acción más urgente con herramienta concreta (modelo X, sede electrónica, calculadora AEAT)."
}`;

  return { system, user };
}

// ─── HANDLER ─────────────────────────────────────────────────────
export async function POST(req: NextRequest) {

  // 1. Parse
  let url = "";
  try {
    const body = (await req.json()) as { url?: string };
    url = typeof body.url === "string" ? body.url.trim() : "";
  } catch {
    return NextResponse.json<UrlAnalysisError>(
      { error: "Body JSON inválido.", code: "INVALID_INPUT" },
      { status: 400 }
    );
  }

  if (!url) {
    return NextResponse.json<UrlAnalysisError>(
      { error: "El campo url es obligatorio.", code: "INVALID_INPUT" },
      { status: 400 }
    );
  }

  log("info", "Petición recibida", { url });

  // 2. Detección de índice por URL — corta antes del fetch
  if (isIndexByUrl(url)) {
    log("warn", "INDEX_PAGE detectado por URL", { url });
    return NextResponse.json<UrlAnalysisError>(
      {
        error: "Esta URL es un listado general, no un documento concreto.",
        code: "INDEX_PAGE",
        suggestion:
          "Haz clic en una noticia o disposición concreta del listado y pega esa URL aquí.",
      },
      { status: 400 }
    );
  }

  // 3. API key
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    log("error", "OPENAI_API_KEY no configurada");
    return NextResponse.json<UrlAnalysisError>(
      {
        error: "IA no configurada. Añade OPENAI_API_KEY en las variables de entorno.",
        code: "CONFIG_ERROR",
      },
      { status: 503 }
    );
  }

  // 4. Fetch del documento
  let rawHtml = "";
  try {
    const res = await fetch(url, {
      headers: {
        "User-Agent": UA,
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "es-ES,es;q=0.9",
        "Cache-Control": "no-cache",
      },
      signal: AbortSignal.timeout(12_000),
    });

    if (res.status === 403 || res.status === 429) {
      log("warn", "Servidor bloqueó la petición", { status: res.status, url });
      return NextResponse.json<UrlAnalysisError>(
        {
          error: `El servidor bloqueó el acceso (HTTP ${res.status}). Este sitio puede requerir autenticación.`,
          code: "BLOCKED",
          suggestion: "Comprueba que la URL es pública y no requiere login.",
        },
        { status: 502 }
      );
    }

    if (!res.ok) throw new Error(`HTTP ${res.status}`);

    const ct = res.headers.get("content-type") ?? "";
    if (ct.includes("pdf")) {
      log("warn", "PDF detectado", { url });
      return NextResponse.json<UrlAnalysisError>(
        {
          error: "El documento es un PDF y no puede procesarse directamente.",
          code: "PDF",
          suggestion: "En el BOE, usa el enlace «HTML» del documento en lugar del PDF.",
        },
        { status: 422 }
      );
    }

    rawHtml = await res.text();
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    const isTimeout = msg.toLowerCase().includes("abort") || msg.toLowerCase().includes("timeout");
    log("error", "Error de fetch", { url, msg });
    return NextResponse.json<UrlAnalysisError>(
      {
        error: isTimeout
          ? "La página tardó demasiado en responder (>12s). Inténtalo de nuevo."
          : `No se pudo acceder a la URL: ${msg}`,
        code: "FETCH_ERROR",
      },
      { status: 502 }
    );
  }

  // 5. Detección de índice por HTML (segunda capa)
  if (isIndexByHtml(rawHtml)) {
    log("warn", "INDEX_PAGE detectado por HTML", { url });
    return NextResponse.json<UrlAnalysisError>(
      {
        error: "Esta página contiene un listado de documentos, no un documento concreto.",
        code: "INDEX_PAGE",
        suggestion:
          "Accede a un documento individual del listado y pega esa URL aquí.",
      },
      { status: 400 }
    );
  }

  // 6. Extracción de contenido
  const { text: content, strategy } = extractContent(rawHtml, url);
  const charsExtracted = content.length;

  log("info", "Contenido extraído", { url, strategy, charsExtracted });

  // 7. Validación de contenido mínimo
  if (charsExtracted < 300) {
    log("warn", "INSUFFICIENT: texto demasiado corto", { url, charsExtracted, strategy });
    return NextResponse.json<UrlAnalysisError>(
      {
        error: `Contenido insuficiente para análisis (${charsExtracted} chars extraídos).`,
        code: "INSUFFICIENT",
        suggestion:
          "Comprueba que la URL apunta al texto completo del documento, no a un resumen o portal de acceso.",
      },
      { status: 422 }
    );
  }

  // 8. Análisis IA
  let aiRaw = "";
  try {
    const { default: OpenAI } = await import("openai");
    const openai = new OpenAI({ apiKey });
    const { system, user } = buildMessages(url, content);

    log("info", "Llamando a GPT-4o", { url, charsExtracted });

    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      max_tokens: 1500,
      temperature: 0.1,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
    });

    aiRaw = completion.choices[0].message.content ?? "";
    log("info", "Respuesta GPT-4o recibida", { tokens: completion.usage?.total_tokens });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Error desconocido";
    log("error", "Error llamando a OpenAI", { url, msg });
    return NextResponse.json<UrlAnalysisError>(
      { error: `Error en análisis IA: ${msg}`, code: "AI_ERROR" },
      { status: 500 }
    );
  }

  // 9. Parse de respuesta IA
  let parsed: Record<string, unknown>;
  try {
    const match = aiRaw.match(/\{[\s\S]*\}/);
    if (!match) throw new Error("Sin JSON en respuesta");
    parsed = JSON.parse(match[0]) as Record<string, unknown>;
  } catch (e) {
    log("error", "Error parseando respuesta IA", { aiRaw: aiRaw.slice(0, 200) });
    return NextResponse.json<UrlAnalysisError>(
      { error: "La IA devolvió una respuesta malformada.", code: "AI_ERROR" },
      { status: 500 }
    );
  }

  // 10. GPT detectó contenido inválido
  if (parsed.error === "CONTENT_IS_INDEX") {
    log("warn", "GPT detectó contenido como índice", { url });
    return NextResponse.json<UrlAnalysisError>(
      {
        error: "El documento analizado es un listado, no una disposición concreta.",
        code: "INDEX_PAGE",
        suggestion: "Pega la URL de una noticia o disposición específica.",
      },
      { status: 400 }
    );
  }
  if (parsed.error === "INSUFFICIENT") {
    log("warn", "GPT detectó contenido insuficiente", { url });
    return NextResponse.json<UrlAnalysisError>(
      {
        error: "El documento no contiene suficiente información fiscal específica para analizarlo.",
        code: "INSUFFICIENT",
        suggestion: "Prueba con un documento que tenga el texto completo de la disposición.",
      },
      { status: 422 }
    );
  }

  // 11. Validar y sanitizar campos
  const title = String(parsed.title ?? "").trim();
  const whatHappened = String(parsed.whatHappened ?? "").trim();
  const whatToDo = Array.isArray(parsed.whatToDo)
    ? (parsed.whatToDo as unknown[]).map((s) => String(s).trim()).filter(Boolean)
    : [];

  // Detección de respuesta genérica (última línea de defensa)
  const GENERIC_SIGNALS = [
    "nueva nota informativa",
    "documento relevante",
    "información fiscal relevante",
    "nueva disposición con impacto",
    "el documento no especifica",
    "sin datos suficientes",
  ];
  const combinedText = (title + " " + whatHappened).toLowerCase();
  const isGeneric = GENERIC_SIGNALS.some((s) => combinedText.includes(s));

  if (isGeneric || !title || whatToDo.length === 0) {
    log("warn", "Respuesta genérica detectada — rechazada", { title, url });
    return NextResponse.json<UrlAnalysisError>(
      {
        error: "No se pudo extraer información específica de este documento.",
        code: "INSUFFICIENT",
        suggestion:
          "Comprueba que la URL apunta a la versión HTML del documento completo (no a un PDF ni a una página de acceso).",
      },
      { status: 422 }
    );
  }

  const result: UrlAnalysis = {
    title,
    whatHappened,
    whoAffected: String(parsed.whoAffected ?? "").trim(),
    whatToDo,
    risk: String(parsed.risk ?? "").trim(),
    recommendation: String(parsed.recommendation ?? "").trim(),
    sourceUrl: url,
    extractedChars: charsExtracted,
    analysisSource: charsExtracted >= 600 ? "real" : "limited",
  };

  log("info", "Análisis completado", {
    url,
    sourceType: result.analysisSource,
    charsExtracted,
    strategy,
  });

  return NextResponse.json(result);
}
