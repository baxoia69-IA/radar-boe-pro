import { fetchBoeDia } from "./boe-client";
import { classifyAll } from "./classify";
import { DisposicionClassified, DisposicionViewModel, BoeDaySnapshot, PolicyArea, ResumenItem } from "@/types";

function extractMinisterioCorto(departamento: string): string {
  const map: [string, string][] = [["interior", "Interior"], ["hacienda", "Hacienda"], ["justicia", "Justicia"], ["defensa", "Defensa"], ["educacion", "Educación"], ["sanidad", "Sanidad"], ["trabajo", "Trabajo"], ["presidencia", "Presidencia"]];
  const n = departamento.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  for (const [key, val] of map) { if (n.includes(key)) return val; }
  return departamento.split(" ").slice(0, 2).join(" ") || "Otro";
}

const ALERT_COLOR: Record<string, string> = { CRÍTICA: "text-red-400", ALTA: "text-amber-400", MEDIA: "text-blue-400", BAJA: "text-zinc-500" };

function toViewModel(d: DisposicionClassified): DisposicionViewModel {
  return { ...d, ministerioCorto: extractMinisterioCorto(d.departamento), tipoLabel: d.tipo, scoreColor: ALERT_COLOR[d.alertLevel] || "text-zinc-400" };
}

function buildSnapshot(disposiciones: DisposicionClassified[], fecha: string, fechaLabel: string, numeroBoe: string): BoeDaySnapshot {
  const todas = disposiciones;
  const relevantes = todas.filter(d => !d.esRuido);
  const urgentes = todas.filter(d => d.alertLevel === "CRÍTICA" || d.alertLevel === "ALTA").length;
  const criticas = todas.filter(d => d.alertLevel === "CRÍTICA").length;
  const altas = todas.filter(d => d.alertLevel === "ALTA").length;
  const impactoFCS = todas.filter(d => d.areas.includes("Seguridad Pública") || d.tags.includes("FCS") || d.tags.includes("POLICÍA")).length;
  const impactoFP = todas.filter(d => d.areas.includes("Función Pública") || d.areas.includes("Empleo Público")).length;
  const cambiosDetectados = todas.filter(d => d.cambioDetectado).length;
  const top10 = relevantes.sort((a, b) => b.score - a.score).slice(0, 10);
  const scoreGlobal = top10.length > 0 ? Math.round(top10.reduce((sum, d) => sum + d.score, 0) / top10.length) : 0;
  const ministerioCount: Record<string, number> = {};
  todas.forEach(d => { const m = extractMinisterioCorto(d.departamento); ministerioCount[m] = (ministerioCount[m] || 0) + 1; });
  const ministerioActivo = Object.entries(ministerioCount).sort((a, b) => b[1] - a[1])[0]?.[0] || "—";
  const areaCount: Partial<Record<PolicyArea, number>> = {};
  todas.forEach(d => { d.areas.forEach(area => { areaCount[area] = (areaCount[area] || 0) + 1; }); });
  const totalAreaMentions = Object.values(areaCount).reduce((s, v) => s + (v || 0), 0);
  const topAreas = (Object.entries(areaCount) as [PolicyArea, number][]).sort((a, b) => b[1] - a[1]).slice(0, 6).map(([nombre, count]) => ({ nombre, count, pct: Math.round((count / Math.max(totalAreaMentions, 1)) * 100) }));
  const resumenEjecutivo: ResumenItem[] = relevantes.sort((a, b) => b.score - a.score).slice(0, 4).map(d => ({ accion: d.accion, texto: d.titulo.length > 110 ? d.titulo.substring(0, 107) + "..." : d.titulo, area: d.areas[0] || "General", disposicionId: d.id }));
  const alertOrder: Record<string, number> = { CRÍTICA: 0, ALTA: 1, MEDIA: 2, BAJA: 3 };
  const viewModels = todas.sort((a, b) => { const ao = alertOrder[a.alertLevel] ?? 3; const bo = alertOrder[b.alertLevel] ?? 3; return ao !== bo ? ao - bo : b.score - a.score; }).map(toViewModel);
  return { fecha, fechaLabel, numeroBoe, totalDisposiciones: todas.length, urgentes, criticas, altas, impactoFCS, impactoFP, cambiosDetectados, scoreGlobal, ministerioActivo, topAreas, resumenEjecutivo, disposiciones: viewModels };
}

export async function runBoePipeline(date?: Date): Promise<BoeDaySnapshot> {
  const { disposiciones: raw, fecha, fechaLabel, numeroBoe, error } = await fetchBoeDia(date);
  if (error || raw.length === 0) {
    return { fecha, fechaLabel, numeroBoe, totalDisposiciones: 0, urgentes: 0, criticas: 0, altas: 0, impactoFCS: 0, impactoFP: 0, cambiosDetectados: 0, scoreGlobal: 0, ministerioActivo: "—", topAreas: [], resumenEjecutivo: [], disposiciones: [] };
  }
  const classified = classifyAll(raw);
  return buildSnapshot(classified, fecha, fechaLabel, numeroBoe);
}
