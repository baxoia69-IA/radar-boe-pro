import { NextRequest, NextResponse } from "next/server";
import { parse } from "node-html-parser";

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
  /todas-noticias/i,
  /\/Sede\/?(?:[?#]|$)/i,
  /\/Inicio\/Novedades\/?(?:[?#]|$)/i,
  /\/Inicio\/?(?:[?#]|$)/i,
  /\/AEAT\.internet\/?(?:[?#]|$)/i,
  /boe\.es\/boe\/dias\//i,
  /boe\.es\/buscar\//i,
  /[?&](?:page|pagina|p)=\d+/i,
  /[?&]tipobusqueda=/i,
  /^https?:\/\/(?:www\.)?boe\.es\/?(?:[?#]|$)/i,
  /^https?:\/\/(?:www\.)?agenciatributaria\.es\/?(?:[?#]|$)/i,
  /^https?:\/\/(?:www\.)?hacienda\.gob\.es\/?(?:[?#]|$)/i,
  /^https?:\/\/sede\.agenciatributaria\.gob\.es\/?(?:[?#]|$)/i,
];

function isIndexByUrl(url: string): boolean {
  return INDEX_URL_PATTERNS.some((p) => p.test(url));
}

// ─── EXTRACCIÓN DE CONTENIDO (DOM real) ───────────────────────────
interface ExtractionResult {
  text: string;
  strategy: string;
}

/**
 * Convierte texto bruto de un nodo DOM en texto limpio.
 */
function nodeText(el: { text: string }): string {
  return el.text
    .replace(/\s+/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#\d+;/g, "")
    .trim();
}

/**
 * Extrae el contenido principal del HTML usando DOM real (node-html-parser).
 * NO tiene "body-fallback" genérico — si no encuentra contenido retorna vacío.
 */
function extractContent(html: string, url: string): ExtractionResult {
  const lower = url.toLowerCase();
  const root = parse(html, { blockTextElements: { script: false, style: false } });

  // Eliminar bloques ruidosos antes de cualquier extracción
  for (const tag of ["script", "style", "nav", "header", "footer", "aside", "noscript"]) {
    root.querySelectorAll(tag).forEach((n) => n.remove());
  }

  // ── BOE: id="textoBOE" o id="cuerpoPublicacion" ─────────────────
  if (lower.includes("boe.es")) {
    for (const id of ["textoBOE", "cuerpoPublicacion", "textoBoe"]) {
      const el = root.getElementById(id);
      if (el) {
        // Extraer todos los párrafos dentro del div
        const paras = el.querySelectorAll("p, div")
          .map((p) => nodeText(p).trim())
          .filter((t) => t.length > 30);
        const text = paras.join("\n\n").slice(0, 9000);
        if (text.length >= 150) return { text, strategy: `boe-id-${id}` };
        // Fallback: texto completo del nodo
        const full = nodeText(el).slice(0, 9000);
        if (full.length >= 150) return { text: full, strategy: `boe-id-${id}-raw` };
      }
    }
    // BOE: clase diario_boe
    const diario = root.querySelector(".diario_boe, .dario_boe");
    if (diario) {
      const text = nodeText(diario).slice(0, 9000);
      if (text.length >= 150) return { text, strategy: "boe-class" };
    }
  }

  // ── AEAT / Hacienda: IDs y clases conocidas ──────────────────────
  if (lower.includes("agenciatributaria") || lower.includes("hacienda.gob")) {
    const aeatSelectors = [
      "#contenido",
      "#contenidoTexto",
      "#textoInformacion",
      "#main-content",
      ".contenidoTexto",
      ".textoInformacion",
      ".cuerpo-texto",
      ".contenedor-texto",
      ".articulo",
      "[id*='contenido']",
      "[class*='contenido']",
    ];
    for (const sel of aeatSelectors) {
      try {
        const el = root.querySelector(sel);
        if (el) {
          const text = nodeText(el).slice(0, 9000);
          if (text.length >= 150) return { text, strategy: `aeat-${sel}` };
        }
      } catch {
        // selector inválido, ignorar
      }
    }
  }

  // ── Semántica estándar: <main> / <article> ───────────────────────
  for (const tag of ["main", "article", "[role='main']"]) {
    try {
      const el = root.querySelector(tag);
      if (el) {
        const text = nodeText(el).slice(0, 9000);
        if (text.length >= 150) return { text, strategy: `semantic-${tag}` };
      }
    } catch {
      // ignorar
    }
  }

  // ── Párrafos significativos: último recurso sin body-dump ────────
  const paragraphs = root.querySelectorAll("p")
    .map((p) => nodeText(p).trim())
    .filter((t) => t.length > 80);
  if (paragraphs.length >= 3) {
    const text = paragraphs.join("\n\n").slice(0, 9000);
    if (text.length >= 150) return { text, strategy: "paragraphs" };
  }

  return { text: "", strategy: "none" };
}

// ─── DETECCIÓN DE ÍNDICE POR HTML ────────────────────────────────
function isIndexByHtml(html: string): boolean {
  const root = parse(html);
  const anchorCount = root.querySelectorAll("a").length;
  const paragraphCount = root.querySelectorAll("p").length;
  const hasListClass = root.querySelector(".lista, .listado, .news-list, .article-list, .noticias");

  const linkHeavy = anchorCount > 20 && anchorCount > paragraphCount * 4;
  return linkHeavy || Boolean(hasListClass);
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

  // 1. Parse body
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

  // 2. Índice por URL — corta antes del fetch
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
        Referer: "https://www.google.com/",
      },
      signal: AbortSignal.timeout(15_000),
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
    log("info", "HTML descargado", { url, htmlLength: rawHtml.length });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    const isTimeout = msg.toLowerCase().includes("abort") || msg.toLowerCase().includes("timeout");
    log("error", "Error de fetch", { url, msg });
    return NextResponse.json<UrlAnalysisError>(
      {
        error: isTimeout
          ? "La página tardó demasiado en responder (>15s). Inténtalo de nuevo."
          : `No se pudo acceder a la URL: ${msg}`,
        code: "FETCH_ERROR",
      },
      { status: 502 }
    );
  }

  // 5. Detección de índice por HTML
  if (isIndexByHtml(rawHtml)) {
    log("warn", "INDEX_PAGE detectado por análisis HTML", { url });
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

  // 6. Extracción de contenido con DOM real
  const { text: content, strategy } = extractContent(rawHtml, url);
  const charsExtracted = content.length;

  log("info", "Contenido extraído", { url, strategy, charsExtracted });

  // 7. Validación: mínimo 300 chars reales
  if (charsExtracted < 300) {
    log("warn", "INSUFFICIENT: texto demasiado corto", { url, charsExtracted, strategy });
    return NextResponse.json<UrlAnalysisError>(
      {
        error: `Contenido insuficiente para análisis (${charsExtracted} chars extraídos con estrategia: ${strategy}).`,
        code: "INSUFFICIENT",
        suggestion:
          "Comprueba que la URL apunta al texto completo del documento (HTML), no a un resumen ni a un portal de acceso.",
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
  } catch {
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
    "sin datos suficientes",
    "no se han proporcionado",
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
