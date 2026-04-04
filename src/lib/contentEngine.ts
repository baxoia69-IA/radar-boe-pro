// ─── TIPOS ───────────────────────────────────────────────────────
export type SourceType = "AEAT" | "BOE";

export interface AnalysisInput {
  sourceType: SourceType;
  url: string;
  /** Texto del documento pre-extraído. Cuando está presente la IA analiza
   *  el contenido real en lugar de inferirlo desde la URL. */
  extractedContent?: string;
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

  const system = `Eres el mejor comunicador fiscal de España. Combinas el rigor técnico de un inspector de Hacienda con la claridad de un periodista económico y el instinto de un asesor que cobra por resultados, no por horas.

Tu trabajo es tomar documentos oficiales áridos e ininteligibles y convertirlos en contenido que la gente entienda, guarde y comparta porque les afecta directamente al bolsillo.

MENTALIDAD:
Escribes como si le estuvieras explicando el cambio a un amigo autónomo, propietario de una pyme o particular que tiene que presentar declaraciones. No al abogado de su empresa. A él directamente.

REGLAS DE ORO:
1. Si hay una cifra (€, %, fecha), ponla. Los números son credibilidad.
2. El riesgo de no actuar siempre es más motivador que el beneficio de actuar. Úsalo.
3. Nada de frases que empiece por "La presente disposición", "En virtud de", "A los efectos de", "Cabe destacar que". Si lo escribes así, estás fallando.
4. El titular tiene que generar una reacción: "Esto me afecta a mí. Tengo que leerlo."
5. Cada punto de acción debe poder hacerse hoy, no "consultar con un experto en algún momento".

EJEMPLOS DE TITULAR MALO vs BUENO:
✗ "Modificación del régimen de estimación directa simplificada"
✓ "Hacienda cambia cómo calculas tus gastos deducibles — y puede salirte caro si no lo revisas"

✗ "Actualización normativa sobre cotización de autónomos"
✓ "Tu cuota de autónomo va a cambiar. Así calculas si subes o bajas"

EJEMPLOS DE CTA MALO vs BUENO:
✗ "Consulte con su asesor fiscal para más información"
✓ "El próximo trimestre es en X semanas. Si no calculas esto antes, pagas de más — o te arriesgas a un recargo"`;

  // Si hay contenido pre-extraído del documento, incluirlo como contexto primario
  const contentBlock = input.extractedContent
    ? `\nContenido extraído del documento (primeros 7000 caracteres):\n---\n${input.extractedContent.slice(0, 7000)}\n---\n`
    : "\n(Analiza el documento disponible en la URL con tu conocimiento sobre normativa fiscal española.)\n";

  const user = `Analiza el siguiente documento oficial de la ${sourceLabel}:

URL: ${input.url}
${contentBlock}
Devuelve ÚNICAMENTE un objeto JSON válido con esta estructura exacta. Sin markdown. Sin texto antes o después del JSON.

{
  "title": "TITULAR DE IMPACTO. Máx. 110 caracteres. Debe activar la lectura: qué cambia + consecuencia concreta o para quién. Nada de títulos de BOE literales. Empieza por el cambio o su consecuencia, no por 'La AEAT' ni 'El BOE'.",

  "summary": "Exactamente 3 frases. F1: qué cambia y desde cuándo (con fecha si la hay). F2: por qué importa en términos económicos o de riesgo. F3: quién se lleva la peor o mejor parte. Ninguna frase supera 25 palabras. Cero gerundios innecesarios.",

  "affectedAudience": "Lista los segmentos afectados con máxima precisión. Incluye: tipo de contribuyente (autónomo, sociedad, particular), régimen fiscal si aplica, sector si es específico, umbrales de ingresos o plantilla si los hay. Si afecta a todos, explica cómo afecta diferente a cada perfil.",

  "practicalImpact": "Párrafo de 3-5 frases centrado en dinero y riesgo. Cuantifica: cuánto puede subir o bajar una cuota, qué porcentaje de deducción se pierde, cuál es la sanción por incumplir, qué plazo hay. Si el documento no da cifras exactas, da rangos realistas basados en casos típicos. Termina con la consecuencia de no actuar.",

  "actionPoints": [
    "Verbo imperativo en 2ª persona + acción específica + contexto (cuándo, con qué dato, en qué apartado). Ej: 'Revisa tu base de cotización actual en Seguridad Social y compárala con tu rendimiento neto estimado de este año'",
    "Segunda acción. Distinta a la anterior. Accionable hoy.",
    "Tercera acción. Puede ser preventiva o de documentación.",
    "Cuarta acción. Si hay plazo inminente, ponlo aquí.",
    "Quinta acción. Cierre: qué guardar, qué confirmar, qué evitar."
  ],

  "cta": "2 frases máximo. Primera: urgencia con fecha o coste concreto ('El trimestre cierra el X', 'Cada mes de retraso suma un X% de recargo'). Segunda: qué acción inmediata y específica recomiendas hacer ahora mismo. No 'llama a tu asesor'. Sí 'Calcula tu nueva base en 10 minutos con la calculadora de la AEAT'."
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

/**
 * Versión para X/Twitter.
 * Estructura: gancho → tensión → checklist mínimo → CTA → fuente → hashtags
 * Diseñada para retención y compartición. Tono directo, sin suavizadores.
 */
export function generateXVersion(note: AnalysisResult): string {
  // Primera frase del resumen como gancho independiente
  const hook = note.summary.split(/[.!?]/)[0].trim();
  // Dos puntos de acción más concretos (los del medio suelen ser los más accionables)
  const points = note.actionPoints.slice(1, 3);

  return `⚠️ ${note.title}

${hook}.

${note.practicalImpact.split(/[.!?]/)[0].trim()}.

Qué hacer ahora:
${points.map((p) => `→ ${p}`).join("\n")}

${note.cta}

🔗 ${note.sourceUrl}

#Fiscal #Hacienda #Autónomos #IRPF #IVA`;
}

/**
 * Versión para WhatsApp.
 * Estructura: contexto → impacto → afectados → checklist → urgencia
 * Tono cercano, como un mensaje de un asesor de confianza.
 * Usa negrita (*texto*) que WhatsApp renderiza nativamente.
 */
export function generateWhatsAppVersion(note: AnalysisResult): string {
  const points = note.actionPoints.slice(0, 5);

  return `Hola,

Te mando esto porque puede afectarte directamente.

📌 *${note.title}*

${note.summary}

*¿A quién afecta?*
${note.affectedAudience}

*Impacto real:*
${note.practicalImpact}

*Lo que tienes que revisar ahora:*
${points.map((p, i) => `${i + 1}. ${p}`).join("\n")}

⏰ ${note.cta}

Fuente oficial: ${note.sourceUrl}`;
}
