import { NextRequest, NextResponse } from "next/server";
import { runRadarCycle } from "@/lib/radarScraper";
import { getStats } from "@/lib/radarStore";

/**
 * POST /api/radar/fetch
 * Dispara un ciclo completo del radar: scraping BOE+AEAT → IA → almacenamiento.
 *
 * Autenticación:
 * - Si CRON_SECRET está definida, requiere header: Authorization: Bearer <CRON_SECRET>
 * - Sin CRON_SECRET (desarrollo local), el endpoint es libre
 * - Vercel Cron Jobs envía este header automáticamente
 *
 * Variables de entorno:
 *   CRON_SECRET     — protege el endpoint en producción
 *   OPENAI_API_KEY  — requerida para el análisis IA
 *   RADAR_NOTES_FILE — ruta opcional al archivo de notas (default: .radar-data/notes.json)
 */
export async function POST(req: NextRequest) {
  // ── Auth ─────────────────────────────────────────────────────────
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret) {
    const auth = req.headers.get("Authorization");
    if (auth !== `Bearer ${cronSecret}`) {
      console.warn("[/api/radar/fetch] Intento de acceso no autorizado");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  // ── Ejecución ────────────────────────────────────────────────────
  console.log("[/api/radar/fetch] Ciclo iniciado");
  const start = Date.now();

  try {
    const result = await runRadarCycle();
    const elapsed = ((Date.now() - start) / 1000).toFixed(1);
    console.log(`[/api/radar/fetch] Ciclo completado en ${elapsed}s:`, result);

    return NextResponse.json({
      ok: true,
      elapsed: `${elapsed}s`,
      ...result,
      stats: getStats(),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Error desconocido";
    console.error("[/api/radar/fetch] Error en ciclo:", err);
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}

/**
 * GET /api/radar/fetch
 * Devuelve el estado actual del almacén sin disparar un nuevo ciclo.
 * Útil para comprobar el funcionamiento sin coste.
 */
export async function GET(req: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret) {
    const auth = req.headers.get("Authorization");
    if (auth !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  return NextResponse.json({ ok: true, stats: getStats() });
}
