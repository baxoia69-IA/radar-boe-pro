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
  /** Cuántos caracteres de contenido real se extrajeron del documento */
  extractedChars: number;
  /** "real" = documento concreto analizado; "limited" = contenido parcial */
  analysisSource: "real" | "limited";
}

export interface UrlAnalysisError {
  error: string;
  code:
    | "INDEX_PAGE"
    | "INSUFFICIENT_CONTENT"
    | "PDF"
    | "FETCH_ERROR"
    | "BLOCKED"
    | "AI_ERROR"
    | "CONFIG_ERROR"
    | "INVALID_INPUT";
  suggestion?: string;
}

// ─── HELPERS HTML ─────────────────────────────────────────────────
const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";

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

// ─── CLASIFICACIÓN DE URL ─────────────────────────────────────────
/**
 * Detecta si una URL apunta a un índice/listado en lugar de un documento concreto.
 * Retorna true si parece índice → hay que rechazar antes de llamar a la IA.
 */
const INDEX_URL_PATTERNS: RegExp[] = [
  // AEAT listados
  /todas-noticias/i,
  /\/Sede\/?$/i,
  /\/Sede\/index\.html?$/i,
  /\/Inicio\/Novedades\/?$/i,
  /\/Inicio\/?$/i,
  /\/AEAT\.internet\/?$/i,
  /\/AEAT\.internet\/Inicio\/?$/i,
  // BOE índices
  /boe\.es\/boe\/dias\//i,
  /boe\.es\/?$/i,
  /boe\.es\/buscar\/boe\?/i,
  /boe\.es\/buscar\/legislacion\?/i,
  // Búsquedas genéricas
  /[?&]tipobusqueda=/i,
  /[?&]page=\d+/i,
  // Páginas raíz sin path significativo
  /^https?:\/\/[^/]+\/?$/,
];

function isIndexUrl(url: string): boolean {
  return INDEX_URL_PATTERNS.some((p) => p.test(url));
}

// ─── EXTRACCIÓN DE CONTENIDO ──────────────────────────────────────
interface ExtractionResult {
  text: string;
  strategy: string;
}

function extractContent(html: string, url: string): ExtractionResult {
  const lower = url.toLowerCase();

  // ── Estrategia 1: BOE documento (id=BOE-A-...) ──────────────────
  if (lower.includes("boe.es")) {
    const boe = html.match(
      /<div[^>]*id="(?:textoBOE|cuerpoPublicacion)"[^>]*>([\s\S]*?)<\/div>/i
    );
    if (boe) {
      const text = htmlToText(boe[1]);
      if (text.length > 200) return { text: text.slice(0, 9000), strategy: "boe-body" };
    }
    // BOE alternativo: div class que contiene texto
    const boe2 = html.match(/<div[^>]*class="[^"]*dario_boe[^"]*"[^>]*>([\s\S]*?)<\/div>/i);
    if (boe2) {
      const text = htmlToText(boe2[1]);
      if (text.length > 200) return { text: text.slice(0, 9000), strategy: "boe-dario" };
    }
  }

  // ── Estrategia 2: AEAT / Sede contenido principal ───────────────
  if (lower.includes("agenciatributaria") || lower.includes("sede.agencia")) {
    const aeatPatterns = [
      /<div[^>]*id="[^"]*contenido[^"]*"[^>]*>([\s\S]*?)<\/div>/i,
      /<div[^>]*class="[^"]*(?:contenidoTexto|textoNormativo|contenedor-texto)[^"]*"[^>]*>([\s\S]*?)<\/div>/i,
      /<div[^>]*class="[^"]*(?:cuerpo|body-content|main-content)[^"]*"[^>]*>([\s\S]*?)<\/div>/i,
    ];
    for (const p of aeatPatterns) {
      const m = html.match(p);
      if (m) {
        const text = htmlToText(m[1]);
        if (text.length > 200) return { text: text.slice(0, 9000), strategy: "aeat-div" };
      }
    }
  }

  // ── Estrategia 3: Semántica estándar (<main> / <article>) ───────
  const semantic = html.match(
    /<(?:main|article)\b[^>]*>([\s\S]*?)<\/(?:main|article)>/i
  );
  if (semantic) {
    const text = htmlToText(semantic[1]);
    if (text.length > 200) return { text: text.slice(0, 9000), strategy: "semantic" };
  }

  // ── Estrategia 4: <div id="content"> ───────────────────────────
  const divContent = html.match(
    /<div[^>]*id="(?:content|main|contenido)"[^>]*>([\s\S]*?)<\/div>/i
  );
  if (divContent) {
    const text = htmlToText(divContent[1]);
    if (text.length > 200) return { text: text.slice(0, 9000), strategy: "div-content" };
  }

  // ── Fallback: body completo ────────────────────────────────────
  const body = html.match(/<body[^>]*>([\s\S]*?)<\/body>/i)?.[1] ?? html;
  return { text: htmlToText(body).slice(0, 9000), strategy: "body-fallback" };
}

// ─── VALIDACIÓN DE CALIDAD ────────────────────────────────────────
interface ContentQuality {
  ok: boolean;
  isIndex: boolean;
  reason?: string;
}

function assessContentQuality(text: string, url: string): ContentQuality {
  // Mínimo absoluto
  if (text.length < 250) {
    return {
      ok: false, isIndex: false,
      reason: "El contenido extraído es demasiado corto para un análisis fiable.",
    };
  }

  // Detectar índice por densidad de contenido:
  // Si hay muchas líneas cortas y pocas largas → es una lista de titulares
  const lines = text.split(/\s{3,}|\n/).filter((l) => l.trim().length > 10);
  const longLines = lines.filter((l) => l.trim().length > 120);
  const shortLines = lines.filter((l) => l.trim().length <= 120);

  const isIndexByDensity =
    lines.length > 10 &&
    longLines.length < 3 &&
    shortLines.length > longLines.length * 4;

  if (isIndexByDensity) {
    return {
      ok: false, isIndex: true,
      reason:
        "El contenido parece ser un listado de titulares, no un documento concreto.",
    };
  }

  // Comprobar si tiene contenido fiscal real (mínimo señal temática)
  const fiscalTerms = [
    "impuesto", "tributar", "hacienda", "renta", "iva", "irpf",
    "autónomo", "modelo", "declaración", "retención", "fiscal",
    "aeat", "agencia tributaria", "boe", "real decreto", "resolución",
    "orden", "ley", "reglamento", "artículo",
  ];
  const lower = text.toLowerCase();
  const hasFiscalContent = fiscalTerms.some((t) => lower.includes(t));

  if (!hasFiscalContent && url.length > 0) {
    return {
      ok: false, isIndex: false,
      reason:
        "El contenido extraído no parece ser un documento fiscal. Verifica que la URL apunta a un documento de la AEAT o el BOE.",
    };
  }

  return { ok: true, isIndex: false };
}

// ─── PROMPT ──────────────────────────────────────────────────────
function buildMessages(url: string, content: string) {
  const system = `Eres el mejor asesor fiscal de España. Traduces documentos oficiales áridos en explicaciones claras para contribuyentes medios: autónomos, pequeñas empresas y particulares.

REGLAS ESTRICTAS:
1. Usa SOLO la información del documento proporcionado. No inventes ni generalices.
2. Si el documento menciona cifras (€, %, fechas), inclúyelas SIEMPRE.
3. Cero lenguaje administrativo: nada de "en virtud de", "a los efectos", "la presente".
4. El riesgo de no actuar es más motivador que el beneficio: ponlo primero.
5. Cada acción debe ser ejecutable hoy por una persona sin conocimientos jurídicos.
6. Si el contenido es un listado de noticias o no corresponde a un documento fiscal específico, devuelve: {"error": "CONTENT_IS_INDEX", "message": "El contenido no corresponde a un documento específico."}.`;

  const user = `Analiza este documento oficial fiscal:

URL: ${url}

CONTENIDO EXTRAÍDO DEL DOCUMENTO:
---
${content}
---

Devuelve ÚNICAMENTE el siguiente JSON válido. Sin markdown. Sin texto fuera del JSON.
Si el contenido no es un documento fiscal específico, devuelve el JSON de error indicado.

{
  "title": "TITULAR DE IMPACTO. Máx. 95 chars. Lo primero que leerá el contribuyente. Empieza por la consecuencia o el cambio, nunca por 'La AEAT' ni 'El BOE'. Usa datos reales del documento.",
  "whatHappened": "2-3 frases con datos específicos del documento: qué cambia, desde cuándo, bajo qué condiciones. Incluye la referencia normativa si aparece (ej: 'Resolución de 15 de marzo de 2024').",
  "whoAffected": "Exacto y segmentado: tipo de contribuyente, régimen, sector, umbrales si los hay. Ejemplo: 'Autónomos en estimación directa simplificada con rendimientos netos superiores a 21.000 €'.",
  "whatToDo": [
    "Verbo imperativo + acción específica + dato concreto del documento",
    "Segunda acción ejecutable hoy",
    "Qué documentación conservar o revisar y dónde encontrarla",
    "Plazo límite si el documento lo menciona"
  ],
  "risk": "Consecuencia concreta de no actuar: recargo exacto, multa, pérdida de deducción. Si el documento da cifras, úsalas. Si no, indica el rango habitual.",
  "recommendation": "La acción más urgente en una sola frase. Específica y con herramienta concreta si existe (calculadora AEAT, modelo concreto, sede electrónica)."
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
      { error: "Cuerpo JSON inválido.", code: "INVALID_INPUT" },
      { status: 400 }
    );
  }

  if (!url) {
    return NextResponse.json<UrlAnalysisError>(
      { error: "El campo url es obligatorio.", code: "INVALID_INPUT" },
      { status: 400 }
    );
  }

  // 2. Detección temprana de índice por URL
  if (isIndexUrl(url)) {
    console.log(`[/api/analyze-url] INDEX_PAGE detectado por URL: ${url}`);
    return NextResponse.json<UrlAnalysisError>(
      {
        error:
          "Esta URL es un listado general, no un documento concreto. No puedo analizarla.",
        code: "INDEX_PAGE",
        suggestion:
          "Haz clic en una noticia o disposición concreta de ese listado y pega esa URL aquí.",
      },
      { status: 422 }
    );
  }

  // 3. Validar API key
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    console.error("[/api/analyze-url] OPENAI_API_KEY no configurada");
    return NextResponse.json<UrlAnalysisError>(
      {
        error: "La IA no está configurada. Añade OPENAI_API_KEY en las variables de entorno.",
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
      },
      signal: AbortSignal.timeout(12_000),
    });

    if (res.status === 403 || res.status === 429) {
      return NextResponse.json<UrlAnalysisError>(
        {
          error: `El servidor bloqueó la petición (HTTP ${res.status}). Prueba copiando el contenido manualmente.`,
          code: "BLOCKED",
        },
        { status: 502 }
      );
    }

    if (!res.ok) {
      throw new Error(`HTTP ${res.status}`);
    }

    const contentType = res.headers.get("content-type") ?? "";
    if (contentType.includes("pdf")) {
      return NextResponse.json<UrlAnalysisError>(
        {
          error: "El documento es un PDF.",
          code: "PDF",
          suggestion:
            "En el BOE, usa el enlace 'HTML' del documento en lugar del PDF.",
        },
        { status: 422 }
      );
    }

    rawHtml = await res.text();
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    const isTimeout = msg.includes("abort") || msg.includes("timeout");
    console.error(`[/api/analyze-url] Fetch error "${url}":`, e);
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

  // 5. Extraer contenido
  const { text: content, strategy } = extractContent(rawHtml, url);
  console.log(
    `[/api/analyze-url] Extraído ${content.length} chars (estrategia: ${strategy})`
  );

  // 6. Validar calidad del contenido
  const quality = assessContentQuality(content, url);
  if (!quality.ok) {
    const code: UrlAnalysisError["code"] = quality.isIndex
      ? "INDEX_PAGE"
      : "INSUFFICIENT_CONTENT";
    return NextResponse.json<UrlAnalysisError>(
      {
        error: quality.reason ?? "Contenido insuficiente.",
        code,
        suggestion: quality.isIndex
          ? "Haz clic en una noticia o disposición concreta del listado y pega esa URL aquí."
          : "Asegúrate de que la URL apunta a la página HTML del documento, no a un buscador o índice.",
      },
      { status: 422 }
    );
  }

  // 7. Análisis IA
  try {
    const { default: OpenAI } = await import("openai");
    const openai = new OpenAI({ apiKey });
    const { system, user } = buildMessages(url, content);

    console.log(`[/api/analyze-url] Enviando a GPT-4o — chars: ${content.length}`);

    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      max_tokens: 1500,
      temperature: 0.15, // máxima fidelidad al documento
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
    });

    const raw = completion.choices[0].message.content ?? "";
    console.log(`[/api/analyze-url] Tokens: ${completion.usage?.total_tokens ?? "?"}`);

    // 8. Parse
    const parsed = JSON.parse(raw) as Record<string, unknown>;

    // GPT detectó que el contenido es un índice
    if (parsed.error === "CONTENT_IS_INDEX") {
      return NextResponse.json<UrlAnalysisError>(
        {
          error:
            "El contenido analizado no corresponde a un documento fiscal concreto.",
          code: "INDEX_PAGE",
          suggestion:
            "Pega la URL de una disposición o noticia específica, no de una página de listado.",
        },
        { status: 422 }
      );
    }

    // 9. Validar y sanitizar respuesta
    const whatToDo = Array.isArray(parsed.whatToDo)
      ? (parsed.whatToDo as unknown[]).map((s) => String(s).trim()).filter(Boolean)
      : [];

    const title = String(parsed.title ?? "").trim();
    const whatHappened = String(parsed.whatHappened ?? "").trim();

    // Anti-genérico: detectar respuestas vagas
    const GENERIC_PHRASES = [
      "nueva nota informativa",
      "documento relevante",
      "información fiscal relevante",
      "nueva disposición",
      "sin información suficiente",
    ];
    const isGeneric = GENERIC_PHRASES.some(
      (p) =>
        title.toLowerCase().includes(p) ||
        whatHappened.toLowerCase().includes(p)
    );

    if (isGeneric || !title || whatToDo.length === 0) {
      console.warn("[/api/analyze-url] Respuesta genérica detectada:", { title });
      return NextResponse.json<UrlAnalysisError>(
        {
          error:
            "La IA no pudo extraer información específica de este documento. Es posible que la página requiera autenticación o que el contenido no sea textual.",
          code: "INSUFFICIENT_CONTENT",
          suggestion:
            "Prueba con la versión en texto plano del documento (en el BOE: enlace 'HTML' en lugar de 'PDF').",
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
      extractedChars: content.length,
      analysisSource: content.length >= 600 ? "real" : "limited",
    };

    return NextResponse.json(result);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Error desconocido";
    console.error(`[/api/analyze-url] AI error:`, e);
    return NextResponse.json<UrlAnalysisError>(
      { error: `Error en análisis IA: ${msg}`, code: "AI_ERROR" },
      { status: 500 }
    );
  }
}
