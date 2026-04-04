import { NextRequest, NextResponse } from "next/server";
import { analyzeOfficialSource, type SourceType } from "@/lib/contentEngine";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as { url?: string; sourceType?: string };
    const url = typeof body.url === "string" ? body.url.trim() : "";
    const sourceType: SourceType =
      body.sourceType === "BOE" ? "BOE" : "AEAT";

    if (!url) {
      return NextResponse.json(
        { error: "El campo url es obligatorio." },
        { status: 400 }
      );
    }

    const result = await analyzeOfficialSource({ url, sourceType });
    return NextResponse.json(result);
  } catch {
    return NextResponse.json(
      { error: "Error interno al analizar la fuente. Inténtalo de nuevo." },
      { status: 500 }
    );
  }
}
