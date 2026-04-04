import fs from "fs";
import path from "path";

// ─── TIPOS ───────────────────────────────────────────────────────
export type ImpactLevel = "alto" | "medio" | "bajo";

export interface RadarNote {
  id: string;
  source: "BOE" | "AEAT";
  sourceUrl: string;
  originalTitle: string;
  detectedAt: string;        // ISO 8601
  impactLevel: ImpactLevel;
  keywords: string[];
  analysis: {
    title: string;
    summary: string;
    affectedAudience: string;
    practicalImpact: string;
    actionPoints: string[];
    cta: string;
  };
}

// ─── RUTA DE ALMACENAMIENTO ───────────────────────────────────────
// Local dev: <project>/.radar-data/notes.json  (persistente)
// Producción serverless: set RADAR_NOTES_FILE=/tmp/radar-notes.json
// Upgrade path: sustituir loadNotes/saveNote por Vercel KV / Upstash Redis
const DATA_FILE =
  process.env.RADAR_NOTES_FILE ??
  path.join(process.cwd(), ".radar-data", "notes.json");

function ensureFile(): void {
  const dir = path.dirname(DATA_FILE);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  if (!fs.existsSync(DATA_FILE)) fs.writeFileSync(DATA_FILE, "[]", "utf-8");
}

// ─── OPERACIONES ─────────────────────────────────────────────────
export function loadNotes(): RadarNote[] {
  try {
    ensureFile();
    const raw = fs.readFileSync(DATA_FILE, "utf-8");
    return JSON.parse(raw) as RadarNote[];
  } catch {
    return [];
  }
}

export function saveNote(note: RadarNote): void {
  const notes = loadNotes();
  // Evitar duplicados por id
  if (notes.some((n) => n.id === note.id)) return;
  notes.unshift(note); // más recientes primero
  fs.writeFileSync(DATA_FILE, JSON.stringify(notes, null, 2), "utf-8");
}

export function isProcessed(url: string): boolean {
  const notes = loadNotes();
  return notes.some((n) => n.sourceUrl === url);
}

export function getRecentNotes(limit = 50): RadarNote[] {
  return loadNotes().slice(0, limit);
}

export function getStats(): {
  total: number;
  bySource: { BOE: number; AEAT: number };
  byImpact: { alto: number; medio: number; bajo: number };
  lastDetected: string | null;
} {
  const notes = loadNotes();
  return {
    total: notes.length,
    bySource: {
      BOE: notes.filter((n) => n.source === "BOE").length,
      AEAT: notes.filter((n) => n.source === "AEAT").length,
    },
    byImpact: {
      alto: notes.filter((n) => n.impactLevel === "alto").length,
      medio: notes.filter((n) => n.impactLevel === "medio").length,
      bajo: notes.filter((n) => n.impactLevel === "bajo").length,
    },
    lastDetected: notes[0]?.detectedAt ?? null,
  };
}

// ─── HELPERS ─────────────────────────────────────────────────────
export function generateId(url: string): string {
  let hash = 0;
  for (const ch of url) {
    hash = (hash << 5) - hash + ch.charCodeAt(0);
    hash = hash & hash;
  }
  return Math.abs(hash).toString(36);
}
