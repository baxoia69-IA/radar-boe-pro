import { NextRequest, NextResponse } from "next/server";

// ─── TIPOS ────────────────────────────────────────────────────────
export interface UrlAnalysis {
  title: string;
  whatHappened: string;
  whoAffected: string;
  whatToDo: string[];
  risk: string;
  recommendation: string;
  sourceUrl: string;
}

// ─── HELPERS ─────────────────────────────────────────────────────
const UA = "Mozilla/5.0 (compatible; LexFiscalIA/1.0; +https://lexfiscalia.es)";

function htmlToText(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<nav[\s\S]*?<\/nav>/gi, "")
    .replace(/<header[\s\S]*?<\/header>/gi, "")
    .replace(/<footer[\s\S]*?<\/footer>/gi, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ").replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<").replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"').replace(/&#\d+;/g, "")
    .replace(/\s+/g, " ").trim();
}

function extractContent(html: string): string {
  // BOE: div#textoBOE
  const boe = html.match(/<div[^>]*id="textoBOE"[^>]*>([\s\S]*?)<\/div>/i);
  if (boe) return htmlToText(boe[1]).slice(0, 8000);
  // Genérico: <main> o <article>
  const main = html.match(/<(?:main|article)[^>]*>([\s\S]*?)<\/(?:main|article)>/i);
  if (main) return htmlToText(main[1]).slice(0, 8000);
  // Fallback: body completo
  const body = html.match(/<body[^>]*>([\s\S]*?)<\/body>/i)?.[1] ?? html;
  return htmlToText(body).slice(0, 8000);
}

// ─── PROMPT ──────────────────────────────────────────────────────
function buildMessages(url: string, content: string) {
  const system = `Actúa como asesor fiscal experto en España. Tu misión es explicar documentos oficiales de la AEAT y el BOE a contribuyentes medios: autónomos, pequeñas empresas y particulares.

Reglas de escritura:
- Lenguaje claro, directo, sin tecnicismos.
- Nada de "en virtud de lo establecido" ni lenguaje administrativo.
- Cuantifica siempre: euros, porcentajes, fechas concretas.
- El riesgo de no actuar importa más que el beneficio de actuar: úsalo.
- Cada punto de acción debe poder ejecutarse hoy, no "contactar con un experto".`;

  const user = `Analiza el siguiente documento oficial y genera una explicación para el contribuyente.

URL: ${url}

Contenido del documento:
---
${content}
---

Devuelve ÚNICAMENTE este JSON válido, sin markdown ni texto adicional:

{
  "title": "Qué es esto en una frase directa. Máx. 90 caracteres. Empieza por el impacto, no por el organismo.",
  "whatHappened": "2-3 frases. Qué cambia o qué dice este documento. Incluye fecha de entrada en vigor si la hay. Sin lenguaje oficial.",
  "whoAffected": "Lista precisa: tipo de contribuyente, régimen, sector, umbrales de ingresos o plantilla si los hay.",
  "whatToDo": [
    "Acción concreta 1 — verbo imperativo, qué hacer exactamente y cuándo",
    "Acción concreta 2 — accionable hoy",
    "Acción concreta 3 — qué documento guardar o qué revisar",
    "Acción concreta 4 — si hay plazo, ponlo aquí"
  ],
  "risk": "Qué pasa exactamente si no actúas: multa, recargo, pérdida de deducción. Con cifras si el documento las menciona.",
  "recommendation": "Una sola frase. La acción más importante que el lector debe hacer hoy mismo. Específica y directa."
}`;

  return { system, user };
}

// ─── HANDLER ─────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  // 1. Parse body
  let url = "";
  try {
    const body = await req.json() as { url?: string };
    url = typeof body.url === "string" ? body.url.trim() : "";
  } catch {
    return NextResponse.json({ error: "Cuerpo JSON inválido." }, { status: 400 });
  }

  if (!url) {
    return NextResponse.json({ error: "El campo url es obligatorio." }, { status: 400 });
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    console.error("[/api/analyze-url] OPENAI_API_KEY no configurada");
    return NextResponse.json(
      { error: "La IA no está configurada. Añade OPENAI_API_KEY en las variables de entorno." },
      { status: 503 }
    );
  }

  // 2. Fetch de la URL
  let content = "";
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": UA },
      signal: AbortSignal.timeout(10_000),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const contentType = res.headers.get("content-type") ?? "";
    if (contentType.includes("pdf")) {
      return NextResponse.json(
        { error: "El documento es un PDF. Usa la versión HTML del mismo documento en el BOE." },
        { status: 422 }
      );
    }
    const html = await res.text();
    content = extractContent(html);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error(`[/api/analyze-url] Error al fetch "${url}":`, e);
    return NextResponse.json(
      { error: `No se pudo acceder a la URL: ${msg}` },
      { status: 502 }
    );
  }

  if (!content || content.length < 100) {
    return NextResponse.json(
      { error: "No se pudo extraer contenido útil de esta URL. Prueba con la versión HTML del documento." },
      { status: 422 }
    );
  }

  // 3. Análisis IA
  try {
    const { default: OpenAI } = await import("openai");
    const openai = new OpenAI({ apiKey });
    const { system, user } = buildMessages(url, content);

    console.log(`[/api/analyze-url] Analizando "${url}" (${content.length} chars)`);

    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      max_tokens: 1400,
      temperature: 0.2,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
    });

    const raw = completion.choices[0].message.content ?? "";
    console.log(`[/api/analyze-url] Tokens: ${completion.usage?.total_tokens ?? "?"}`);

    // 4. Parse y validar
    const parsed = JSON.parse(raw) as Partial<UrlAnalysis>;
    const result: UrlAnalysis = {
      title: String(parsed.title ?? "").trim(),
      whatHappened: String(parsed.whatHappened ?? "").trim(),
      whoAffected: String(parsed.whoAffected ?? "").trim(),
      whatToDo: Array.isArray(parsed.whatToDo)
        ? parsed.whatToDo.map((s) => String(s).trim()).filter(Boolean)
        : [],
      risk: String(parsed.risk ?? "").trim(),
      recommendation: String(parsed.recommendation ?? "").trim(),
      sourceUrl: url,
    };

    if (!result.title || result.whatToDo.length === 0) {
      throw new Error("La respuesta de la IA está incompleta.");
    }

    return NextResponse.json(result);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Error desconocido";
    console.error(`[/api/analyze-url] Error IA:`, e);
    return NextResponse.json(
      { error: `Error al analizar con IA: ${msg}` },
      { status: 500 }
    );
  }
}
