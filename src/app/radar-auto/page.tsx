import { getRecentNotes, getStats } from "@/lib/radarStore";
import RadarAutoClient from "./RadarAutoClient";

export const metadata = {
  title: "Radar automático — LexFiscalIA",
  description:
    "Novedades fiscales del BOE y la AEAT detectadas y analizadas automáticamente.",
};

// Revalidar cada 15 minutos para reflejar nuevas notas sin rebuild
export const revalidate = 900;

export default function RadarAutoPage() {
  const initialNotes = getRecentNotes(50);
  const initialStats = getStats();
  return <RadarAutoClient initialNotes={initialNotes} initialStats={initialStats} />;
}
