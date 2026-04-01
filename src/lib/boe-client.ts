import { DisposicionRaw } from "@/types";

const BOE_API_BASE = "https://www.boe.es/datosabiertos/api/boe/sumario";

function formatDateBOE(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}${m}${d}`;
}

function formatDateISO(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function formatDateLabel(date: Date): string {
  return date.toLocaleDateString("es-ES", {
    day: "numeric", month: "long", year: "numeric",
  });
}

function cleanText(text: string): string {
  return text
    .replace(/&amp;/g, "&").replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">").replace(/&quot;/g, '"')
    .replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim();
}

function extractTag(content: string, tag: string): string {
  const regex = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, "i");
  const match = content.match(regex);
  return match ? match[1].trim() : "";
}

function extractAttr(tag: string, attr: string): string {
  const regex = new RegExp(`${attr}="([^"]*)"`, "i");
  const match = tag.match(regex);
  return match ? match[1] : "";
}

function extractSeccionFromContext(fullXml: string, position: number): string {
  const before = fullXml.substring(0, position);
  const seccionMatches = [...before.matchAll(/<seccion[^>]*num="([^"]+)"/g)];
  if (seccionMatches.length > 0) {
    return seccionMatches[seccionMatches.length - 1][1];
  }
  return "I";
}

function parseXMLSumario(xmlText: string, fecha: string): { disposiciones: DisposicionRaw[]; numeroBoe: string } {
  const disposiciones: DisposicionRaw[] = [];
  const nboMatch = xmlText.match(/nbo="([^"]+)"/);
  const numeroBoe = nboMatch ? `BOE-${nboMatch[1]}` : "BOE-HOY";
  const itemRegex = /<item[^>]*>([\s\S]*?)<\/item>/g;
  let match;
  while ((match = itemRegex.exec(xmlText)) !== null) {
    const itemContent = match[1];
    const itemTag = match[0];
    const id = extractAttr(itemTag, "id") || extractTag(itemContent, "identificador") || "";
    const seccion = extractSeccionFromContext(xmlText, match.index);
    const departamento = extractTag(itemContent, "departamento") || extractTag(itemContent, "emisor") || "";
    const epigrafe = extractTag(itemContent, "epigrafe") || "";
    const titulo = extractTag(itemContent, "titulo") || epigrafe;
    const urlHtm = `https://www.boe.es/diario_boe/txt.php?id=${id}`;
    const urlPdf = `https://www.boe.es/boe/dias/${fecha.replace(/-/g, "/")}/pdfs/${id}.pdf`;
    if (id && (titulo || epigrafe)) {
      disposiciones.push({
        id, seccion,
        departamento: cleanText(departamento),
        epigrafe: cleanText(epigrafe),
        titulo: cleanText(titulo),
        url_pdf: urlPdf, url_htm: urlHtm, fecha,
      });
    }
  }
  return { disposiciones, numeroBoe };
}

export interface FetchBoeResult {
  disposiciones: DisposicionRaw[];
  fecha: string; fechaLabel: string;
  numeroBoe: string; error?: string;
}

export async function fetchBoeDia(date?: Date): Promise<FetchBoeResult> {
  const targetDate = date || new Date();
  const fechaBOE = formatDateBOE(targetDate);
  const fechaISO = formatDateISO(targetDate);
  const fechaLabel = formatDateLabel(targetDate);
  const url = `${BOE_API_BASE}/${fechaBOE}`;
  try {
    const response = await fetch(url, {
      next: { revalidate: 3600 },
      headers: { Accept: "application/xml, text/xml, */*" },
    });
    if (!response.ok) {
      if (response.status === 404) {
        const yesterday = new Date(targetDate);
        yesterday.setDate(yesterday.getDate() - 1);
        const diff = Math.abs((new Date().getTime() - yesterday.getTime()) / (1000 * 60 * 60 * 24));
        if (diff < 7) return fetchBoeDia(yesterday);
      }
      throw new Error(`BOE API error: ${response.status}`);
    }
    const xmlText = await response.text();
    const { disposiciones, numeroBoe } = parseXMLSumario(xmlText, fechaISO);
    return { disposiciones, fecha: fechaISO, fechaLabel, numeroBoe };
  } catch (error) {
    return {
      disposiciones: [], fecha: fechaISO, fechaLabel,
      numeroBoe: "BOE-ERR",
      error: error instanceof Error ? error.message : "Error desconocido",
    };
  }
}
