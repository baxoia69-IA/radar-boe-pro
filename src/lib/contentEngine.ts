// ─── TIPOS ───────────────────────────────────────────────────────
export type SourceType = "AEAT" | "BOE";

export interface AnalysisInput {
  sourceType: SourceType;
  url: string;
}

export interface AnalysisResult {
  title: string;
  summary: string;
  affectedAudience: string;
  practicalImpact: string;
  actionPoints: string[];
  sourceUrl: string;
  cta: string;
}

// ─── PROMPT ──────────────────────────────────────────────────────
/**
 * Genera el system prompt y el user prompt enviados a OpenAI.
 * El modelo analiza el documento en la URL y devuelve un JSON estructurado.
 */
export function buildPrompt(input: AnalysisInput): { system: string; user: string } {
  const sourceLabel =
    input.sourceType === "AEAT"
      ? "Agencia Tributaria española (AEAT)"
      : "Boletín Oficial del Estado español (BOE)";

  const system = `Eres un asesor fiscal senior especializado en legislación tributaria española con más de 15 años de experiencia asesorando a autónomos, pymes y particulares. Tu misión es transformar documentos fiscales oficiales en análisis claros, concretos y directamente útiles para el ciudadano.

Principios de escritura:
- Lenguaje directo: ninguna frase que no aporte valor concreto.
- Sin jerga institucional: nada de "en virtud de lo establecido en", "a los efectos oportunos", "la presente disposición".
- Cuantifica siempre que sea posible: porcentajes, importes, plazos exactos.
- Señala el riesgo real si no se actúa: multa, recargo, pérdida de deducción.
- Tono de asesor que conoce el caso del lector, no de funcionario que emite comunicado.`;

  const user = `Analiza el contenido del siguiente documento oficial de la ${sourceLabel}:

URL: ${input.url}

Genera un análisis editorial profesional y devuelve ÚNICAMENTE un objeto JSON válido con esta estructura exacta (sin markdown, sin texto adicional):

{
  "title": "Titular periodístico: qué cambia y para quién. Máx. 100 caracteres. Sin verbo 'ser' al inicio.",
  "summary": "3-4 frases. Explica QUÉ cambia, POR QUÉ importa y DESDE CUÁNDO aplica. Incluye cifras concretas si el documento las menciona. Evita parafrasear el título de la norma.",
  "affectedAudience": "Segmentos exactos afectados: tipo de contribuyente, régimen fiscal, sector o situación concreta. Si hay umbrales (ingresos, plantilla, actividad), menciónalos.",
  "practicalImpact": "Consecuencia tangible en euros, porcentajes o plazos cuando sea posible. Qué declaración, cuota o liquidación se ve afectada. Qué ocurre si no se adaptan.",
  "actionPoints": [
    "Acción 1: verbo imperativo + qué hacer + cuándo o con qué herramienta",
    "Acción 2: verbo imperativo + qué hacer + cuándo o con qué herramienta",
    "Acción 3: verbo imperativo + qué hacer + cuándo o con qué herramienta",
    "Acción 4: verbo imperativo + qué hacer + cuándo o con qué herramienta",
    "Acción 5: verbo imperativo + qué hacer + cuándo o con qué herramienta"
  ],
  "cta": "1-2 frases. Urgencia real (fecha límite, coste de esperar). Qué pérdida concreta se evita actuando ahora. No usar 'consulta con tu asesor' como única salida."
}`;

  return { system, user };
}

// ─── LLAMADA AL LLM ───────────────────────────────────────────────
/**
 * Llama a OpenAI con el modelo más capaz disponible.
 * Lanza error explícito si la API key no está configurada o la llamada falla.
 * Los errores se loggean en consola para debugging.
 *
 * Variable de entorno requerida: OPENAI_API_KEY
 * - Desarrollo: .env.local en la raíz del proyecto
 * - Vercel: Settings → Environment Variables
 */
async function callLLM(system: string, user: string): Promise<string> {
  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    console.error("[contentEngine] OPENAI_API_KEY no está definida en las variables de entorno.");
    throw new Error("API key no configurada. Añade OPENAI_API_KEY en las variables de entorno.");
  }

  const { default: OpenAI } = await import("openai");
  const openai = new OpenAI({ apiKey });

  console.log(`[contentEngine] Llamando a OpenAI (gpt-4o) para analizar: ${user.match(/URL: (.+)/)?.[1] ?? "—"}`);

  const completion = await openai.chat.completions.create({
    model: "gpt-4o",
    max_tokens: 1800,
    temperature: 0.2,
    response_format: { type: "json_object" },
    messages: [
      { role: "system", content: system },
      { role: "user", content: user },
    ],
  });

  const content = completion.choices[0].message.content;
  if (!content) {
    console.error("[contentEngine] OpenAI devolvió una respuesta vacía.", completion);
    throw new Error("OpenAI devolvió una respuesta vacía.");
  }

  console.log(`[contentEngine] Respuesta recibida. Tokens usados: ${completion.usage?.total_tokens ?? "?"}`);
  return content;
}

// ─── PARSER DE RESPUESTA ──────────────────────────────────────────
/**
 * Parsea el JSON devuelto por el LLM y valida todos los campos.
 * Lanza error descriptivo si la estructura no es correcta.
 */
function parseResponse(raw: string, sourceUrl: string): AnalysisResult {
  let parsed: Record<string, unknown>;

  try {
    // Extraer el primer bloque JSON por si el modelo añade texto alrededor
    const match = raw.match(/\{[\s\S]*\}/);
    if (!match) throw new Error("No se encontró un objeto JSON en la respuesta.");
    parsed = JSON.parse(match[0]) as Record<string, unknown>;
  } catch (e) {
    console.error("[contentEngine] Error al parsear la respuesta del LLM:", raw);
    throw new Error(`Error al interpretar la respuesta de la IA: ${e instanceof Error ? e.message : String(e)}`);
  }

  const actionPoints = Array.isArray(parsed.actionPoints)
    ? (parsed.actionPoints as unknown[]).map((p) => String(p).trim()).filter(Boolean)
    : [];

  if (actionPoints.length === 0) {
    console.error("[contentEngine] actionPoints vacío o ausente en:", parsed);
    throw new Error("La respuesta de la IA no incluye puntos de acción válidos.");
  }

  return {
    title: String(parsed.title ?? "").trim(),
    summary: String(parsed.summary ?? "").trim(),
    affectedAudience: String(parsed.affectedAudience ?? "").trim(),
    practicalImpact: String(parsed.practicalImpact ?? "").trim(),
    actionPoints,
    sourceUrl,
    cta: String(parsed.cta ?? "").trim(),
  };
}

// ─── FUNCIÓN PRINCIPAL ────────────────────────────────────────────
/**
 * Analiza una fuente oficial usando OpenAI GPT-4o.
 * Lanza error si la API key no está configurada, la llamada falla
 * o la respuesta no tiene la estructura esperada.
 * El llamador (API route) es responsable de capturar y propagar el error a la UI.
 */
export async function analyzeOfficialSource(
  input: AnalysisInput
): Promise<AnalysisResult> {
  const { system, user } = buildPrompt(input);
  const raw = await callLLM(system, user);
  return parseResponse(raw, input.url);
}

// ─── GENERADORES DE VERSIONES ─────────────────────────────────────
export function generateXVersion(note: AnalysisResult): string {
  const points = note.actionPoints.slice(0, 3);
  return `${note.title}

${note.summary.split(".")[0]}.

Qué revisar ahora:
${points.map((p) => `→ ${p}`).join("\n")}

${note.cta}

Fuente oficial: ${note.sourceUrl}

#Fiscal #Impuestos #AEAT #Autónomos`;
}

export function generateWhatsAppVersion(note: AnalysisResult): string {
  const points = note.actionPoints.slice(0, 4);
  return `Hola 👋

*${note.title}*

${note.summary}

*¿A quién afecta?*
${note.affectedAudience}

*Qué deberías revisar:*
${points.map((p) => `• ${p}`).join("\n")}

${note.cta}

Fuente oficial: ${note.sourceUrl}`;
}
