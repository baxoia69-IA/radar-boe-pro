import { NextRequest, NextResponse } from "next/server";
import { analyzeOfficialSource, type SourceType } from "@/lib/contentEngine";

export async function POST(req: NextRequest) {
  let url = "";
  let sourceType: SourceType = "AEAT";

  // ── Parse body ───────────────────────────────────────────────────
  try {
    const body = await req.json() as { url?: string; sourceType?: string };
    url = typeof body.url === "string" ? body.url.trim() : "";
    sourceType = body.sourceType === "BOE" ? "BOE" : "AEAT";
  } catch {
    return NextResponse.json(
      { error: "El cuerpo de la petición no es JSON válido." },
      { status: 400 }
    );
  }

  if (!url) {
    return NextResponse.json(
      { error: "El campo url es obligatorio." },
      { status: 400 }
    );
  }

  // ── Llamada a OpenAI ─────────────────────────────────────────────
  try {
    const result = await analyzeOfficialSource({ url, sourceType });
    return NextResponse.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Error desconocido";
    console.error(`[/api/analyze] Error al procesar "${url}":`, err);

    // Distinguir errores de configuración de errores de ejecución
    const isConfigError =
      message.includes("API key") || message.includes("OPENAI_API_KEY");

    return NextResponse.json(
      {
        error: isConfigError
          ? "La IA no está configurada. Añade OPENAI_API_KEY en las variables de entorno."
          : `Error al analizar la fuente: ${message}`,
      },
      { status: isConfigError ? 503 : 500 }
    );
  }
}
