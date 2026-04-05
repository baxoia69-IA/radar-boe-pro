import { NextRequest, NextResponse } from "next/server";

/**
 * /api/analyze — DEPRECADO
 * Este endpoint ha sido reemplazado por /api/analyze-url que incluye
 * validación de contenido, detección de índices y análisis real del documento.
 * Se mantiene solo para evitar 404 en clientes desactualizados.
 */
export async function POST(_req: NextRequest) {
  return NextResponse.json(
    {
      error:
        "Este endpoint está deprecado. Usa POST /api/analyze-url en su lugar.",
      code: "DEPRECATED",
    },
    {
      status: 410, // 410 Gone
      headers: { "X-Replaced-By": "/api/analyze-url" },
    }
  );
}
