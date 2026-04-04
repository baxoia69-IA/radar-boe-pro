import { analyzeOfficialSource, type SourceType } from "./contentEngine";
import {
  saveNote,
  isProcessed,
  generateId,
  type RadarNote,
  type ImpactLevel,
} from "./radarStore";

// ─── CONSTANTES ───────────────────────────────────────────────────
const USER_AGENT =
  "Mozilla/5.0 (compatible; LexFiscalIA-Radar/1.0; +https://lexfiscalia.es)";

// Palabras que activan la detección fiscal
const FISCAL_TERMS = [
  "iva", "irpf", "impuesto", "tribut", "hacienda", "fiscal",
  "renta", "sociedades", "autónom", "retención", "declaración",
  "modelo", "recargo", "sanción", "deducción", "cotización",
  "aeat", "tributaria", "factura", "patrimonio", "intracomunit",
  "estimación directa", "pago fraccionado", "compensación",
];

// Palabras que elevan el impacto a "alto"
const HIGH_IMPACT_TERMS = [
  "sanción", "multa", "recargo", "obligatori", "plazo",
  "real decreto", "ley orgánica", "nuevo", "modifica", "cambio",
  "urgente", "inmediato", "penalización", "inspección",
];

// Palabras que reducen el impacto a "bajo"
const LOW_IMPACT_TERMS = [
  "estadístic", "informativo", "aclaratorio", "consulta vinculante",
  "nota de prensa", "recordatorio",
];

// Keywords fiscales etiquetadas para mostrar en la UI
const KEYWORD_MAP: [RegExp, string][] = [
  [/\biva\b/i, "IVA"],
  [/\birpf\b|\brenta\b/i, "IRPF"],
  [/\bsociedad(es)?\b/i, "Sociedades"],
  [/autónom/i, "Autónomos"],
  [/retención/i, "Retenciones"],
  [/declaración/i, "Declaraciones"],
  [/\bmodelo\s+\d+/i, "Modelos"],
  [/recargo/i, "Recargos"],
  [/sanción|multa/i, "Sanciones"],
  [/deducción/i, "Deducciones"],
  [/cotización/i, "Cotizaciones"],
  [/factura/i, "Facturación"],
  [/patrimonio/i, "Patrimonio"],
  [/pago fraccionado/i, "Pagos fraccionados"],
];

// Items máximos a procesar por ciclo (controla coste y latencia)
const MAX_ITEMS_PER_RUN = 3;

// ─── HELPERS HTML ─────────────────────────────────────────────────
function htmlToText(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
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

async function fetchText(url: string): Promise<string> {
  const res = await fetch(url, {
    headers: { "User-Agent": USER_AGENT },
    next: { revalidate: 0 }, // siempre fresco
  });
  if (!res.ok) throw new Error(`HTTP ${res.status} al fetch ${url}`);
  return res.text();
}

// ─── ANÁLISIS DE CONTENIDO ────────────────────────────────────────
function isFiscalContent(text: string): boolean {
  const lower = text.toLowerCase();
  return FISCAL_TERMS.some((kw) => lower.includes(kw));
}

function detectImpact(title: string, snippet: string): ImpactLevel {
  const text = (title + " " + snippet).toLowerCase();
  if (HIGH_IMPACT_TERMS.some((kw) => text.includes(kw))) return "alto";
  if (LOW_IMPACT_TERMS.some((kw) => text.includes(kw))) return "bajo";
  return "medio";
}

function extractKeywords(title: string, content: string): string[] {
  const text = title + " " + content;
  const found = new Set<string>();
  for (const [pattern, label] of KEYWORD_MAP) {
    if (pattern.test(text)) found.add(label);
  }
  return [...found].slice(0, 6);
}

function extractMainText(html: string): string {
  // BOE: buscar div#textoBOE o div.dario_boe
  const boeMatch = html.match(
    /<div[^>]*(?:id|class)="(?:textoBOE|dario_boe|textoBoe)[^"]*"[^>]*>([\s\S]*?)<\/div>/i
  );
  if (boeMatch) return htmlToText(boeMatch[1]).slice(0, 7000);

  // AEAT: buscar main, article o section principal
  const mainMatch = html.match(/<(?:main|article)[^>]*>([\s\S]*?)<\/(?:main|article)>/i);
  if (mainMatch) return htmlToText(mainMatch[1]).slice(0, 7000);

  // Fallback: cuerpo completo
  const body = html.match(/<body[^>]*>([\s\S]*?)<\/body>/i)?.[1] ?? html;
  return htmlToText(body).slice(0, 7000);
}

// ─── SCRAPING BOE ─────────────────────────────────────────────────
interface ScrapedItem {
  source: SourceType;
  url: string;
  originalTitle: string;
}

/**
 * Obtiene los ítems fiscales del BOE del día actual usando el sumario XML oficial.
 * API: https://www.boe.es/diario_boe/xml.php?id=BOE-S-YYYY-MM-DD
 */
async function scrapeBoe(): Promise<ScrapedItem[]> {
  const now = new Date();
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, "0");
  const dd = String(now.getDate()).padStart(2, "0");
  const sumarioUrl = `https://www.boe.es/diario_boe/xml.php?id=BOE-S-${yyyy}-${mm}-${dd}`;

  let xml: string;
  try {
    xml = await fetchText(sumarioUrl);
  } catch (e) {
    console.error("[radarScraper] Error al obtener sumario BOE:", e);
    return [];
  }

  const items: ScrapedItem[] = [];

  // Parsear bloques <item> del XML
  for (const [wholeMatch] of xml.matchAll(/<item\s[^>]*>[\s\S]*?<\/item>/g)) {
    const rawTitle = wholeMatch.match(/<titulo>([\s\S]*?)<\/titulo>/)?.[1] ?? "";
    const docUrl = wholeMatch
      .match(/<urlHtm[^>]*>(https?:\/\/[^<]+)<\/urlHtm>/)?.[1]
      ?.trim();

    if (!rawTitle || !docUrl) continue;

    const title = rawTitle
      .replace(/&amp;/g, "&")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/&quot;/g, '"')
      .trim();

    if (isFiscalContent(title)) {
      items.push({ source: "BOE", url: docUrl, originalTitle: title });
    }
  }

  console.log(`[radarScraper] BOE: ${items.length} ítems fiscales detectados`);
  return items;
}

// ─── SCRAPING AEAT ────────────────────────────────────────────────
/**
 * Obtiene las últimas noticias fiscales de la AEAT.
 * Página: https://sede.agenciatributaria.gob.es/Sede/todas-noticias.html
 */
async function scrapeAeat(): Promise<ScrapedItem[]> {
  const indexUrl =
    "https://sede.agenciatributaria.gob.es/Sede/todas-noticias.html";

  let html: string;
  try {
    html = await fetchText(indexUrl);
  } catch (e) {
    console.error("[radarScraper] Error al obtener noticias AEAT:", e);
    return [];
  }

  const items: ScrapedItem[] = [];
  const base = "https://sede.agenciatributaria.gob.es";

  // Extraer enlaces con texto dentro de la sección de noticias
  for (const [, href, rawText] of html.matchAll(
    /<a[^>]+href="(\/Sede\/[^"?#]+)"[^>]*>([\s\S]*?)<\/a>/g
  )) {
    const title = htmlToText(rawText).trim();
    if (!title || title.length < 15) continue;
    if (!isFiscalContent(title)) continue;

    const url = href.startsWith("http") ? href : `${base}${href}`;
    items.push({ source: "AEAT", url, originalTitle: title });
  }

  // Deduplicar por URL
  const seen = new Set<string>();
  const unique = items.filter(({ url }) => {
    if (seen.has(url)) return false;
    seen.add(url);
    return true;
  });

  console.log(`[radarScraper] AEAT: ${unique.length} ítems fiscales detectados`);
  return unique.slice(0, 10); // limitar a 10 candidatos de AEAT
}

// ─── PROCESAMIENTO DE UN ÍTEM ─────────────────────────────────────
async function processItem(item: ScrapedItem): Promise<RadarNote | null> {
  const { source, url, originalTitle } = item;
  console.log(`[radarScraper] Procesando [${source}]: ${originalTitle.slice(0, 80)}`);

  // Obtener texto del documento para pasar como contexto a la IA
  let extractedContent: string | undefined;
  try {
    const html = await fetchText(url);
    extractedContent = extractMainText(html);
    console.log(`[radarScraper] Texto extraído: ${extractedContent.length} caracteres`);
  } catch (e) {
    console.warn(`[radarScraper] No se pudo extraer texto de ${url}:`, e);
    // Continuar sin contenido — la IA usará el contexto de la URL
  }

  // Análisis con IA
  let analysis;
  try {
    analysis = await analyzeOfficialSource({ sourceType: source, url, extractedContent });
  } catch (e) {
    console.error(`[radarScraper] Error en análisis IA para ${url}:`, e);
    return null;
  }

  const note: RadarNote = {
    id: generateId(url),
    source,
    sourceUrl: url,
    originalTitle,
    detectedAt: new Date().toISOString(),
    impactLevel: detectImpact(originalTitle, extractedContent ?? ""),
    keywords: extractKeywords(originalTitle, extractedContent ?? ""),
    analysis: {
      title: analysis.title,
      summary: analysis.summary,
      affectedAudience: analysis.affectedAudience,
      practicalImpact: analysis.practicalImpact,
      actionPoints: analysis.actionPoints,
      cta: analysis.cta,
    },
  };

  saveNote(note);
  console.log(`[radarScraper] Nota guardada: "${note.analysis.title}" [${note.impactLevel}]`);
  return note;
}

// ─── CICLO PRINCIPAL ──────────────────────────────────────────────
/**
 * Ejecuta un ciclo completo del radar:
 * 1. Scraping de BOE y AEAT
 * 2. Filtrado por contenido fiscal
 * 3. Exclusión de URLs ya procesadas
 * 4. Análisis IA de los top N ítems
 * 5. Almacenamiento de notas generadas
 *
 * Máximo MAX_ITEMS_PER_RUN ítems por ciclo para controlar coste y latencia.
 */
export async function runRadarCycle(): Promise<{
  processed: number;
  skipped: number;
  errors: number;
}> {
  console.log("[radarScraper] Iniciando ciclo de radar...");

  // Scraping paralelo de ambas fuentes
  const [boeItems, aeatItems] = await Promise.all([scrapeBoe(), scrapeAeat()]);
  const allItems = [...boeItems, ...aeatItems];

  // Filtrar ya procesados
  const pending = allItems.filter((item) => !isProcessed(item.url));
  console.log(
    `[radarScraper] ${allItems.length} detectados, ${pending.length} pendientes, ${allItems.length - pending.length} ya procesados`
  );

  // Priorizar: "alto" impacto primero
  const sorted = pending.sort((a, b) => {
    const score = (item: ScrapedItem) => {
      const t = item.originalTitle.toLowerCase();
      return HIGH_IMPACT_TERMS.filter((kw) => t.includes(kw)).length;
    };
    return score(b) - score(a);
  });

  // Procesar los top N secuencialmente (evitar saturar OpenAI)
  const toProcess = sorted.slice(0, MAX_ITEMS_PER_RUN);
  let processed = 0;
  let errors = 0;

  for (const item of toProcess) {
    const result = await processItem(item);
    if (result) processed++;
    else errors++;
  }

  const skipped = allItems.length - pending.length;
  console.log(
    `[radarScraper] Ciclo completado — procesados: ${processed}, saltados: ${skipped}, errores: ${errors}`
  );

  return { processed, skipped, errors };
}
