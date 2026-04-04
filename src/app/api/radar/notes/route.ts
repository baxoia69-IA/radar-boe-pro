import { NextRequest, NextResponse } from "next/server";
import { getRecentNotes, getStats, type ImpactLevel } from "@/lib/radarStore";

/**
 * GET /api/radar/notes
 * Devuelve las notas almacenadas con filtros opcionales.
 *
 * Query params:
 *   limit    — número máximo de notas (default: 50)
 *   source   — "BOE" | "AEAT" (opcional)
 *   impact   — "alto" | "medio" | "bajo" (opcional)
 */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const limit = Math.min(Number(searchParams.get("limit") ?? "50"), 100);
  const source = searchParams.get("source") as "BOE" | "AEAT" | null;
  const impact = searchParams.get("impact") as ImpactLevel | null;

  let notes = getRecentNotes(100); // cargar más y luego filtrar

  if (source) notes = notes.filter((n) => n.source === source);
  if (impact) notes = notes.filter((n) => n.impactLevel === impact);

  return NextResponse.json({
    notes: notes.slice(0, limit),
    stats: getStats(),
  });
}
