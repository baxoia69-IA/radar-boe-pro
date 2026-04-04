"use client";

import { useState, useCallback } from "react";
import Link from "next/link";
import type { RadarNote, ImpactLevel } from "@/lib/radarStore";
import { generateXVersion, generateWhatsAppVersion } from "@/lib/contentEngine";

// ─── CONSTANTES ──────────────────────────────────────────────────
const SYNE = { fontFamily: "'Syne', sans-serif" };

const IMPACT_STYLES: Record<ImpactLevel, { pill: string; dot: string; label: string }> = {
  alto:  { pill: "bg-red-50 text-red-700 border-red-200",    dot: "bg-red-500",    label: "Impacto alto" },
  medio: { pill: "bg-amber-50 text-amber-700 border-amber-200", dot: "bg-amber-400",  label: "Impacto medio" },
  bajo:  { pill: "bg-gray-100 text-gray-500 border-gray-200",  dot: "bg-gray-400",   label: "Impacto bajo" },
};

const SOURCE_STYLES: Record<string, string> = {
  BOE:  "bg-blue-50 text-blue-700 border-blue-200",
  AEAT: "bg-violet-50 text-violet-700 border-violet-200",
};

type FilterSource = "all" | "BOE" | "AEAT";
type FilterImpact = "all" | ImpactLevel;

// ─── HELPERS ─────────────────────────────────────────────────────
function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString("es-ES", {
    day: "2-digit", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

function noteToAnalysisResult(note: RadarNote) {
  return {
    title: note.analysis.title,
    summary: note.analysis.summary,
    affectedAudience: note.analysis.affectedAudience,
    practicalImpact: note.analysis.practicalImpact,
    actionPoints: note.analysis.actionPoints,
    sourceUrl: note.sourceUrl,
    cta: note.analysis.cta,
  };
}

// ─── COMPONENTE PRINCIPAL ─────────────────────────────────────────
interface Props {
  initialNotes: RadarNote[];
  initialStats: {
    total: number;
    bySource: { BOE: number; AEAT: number };
    byImpact: { alto: number; medio: number; bajo: number };
    lastDetected: string | null;
  };
}

export default function RadarAutoClient({ initialNotes, initialStats }: Props) {
  const [notes, setNotes] = useState<RadarNote[]>(initialNotes);
  const [stats, setStats] = useState(initialStats);
  const [filterSource, setFilterSource] = useState<FilterSource>("all");
  const [filterImpact, setFilterImpact] = useState<FilterImpact>("all");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [activeVersion, setActiveVersion] = useState<Record<string, "x" | "whatsapp" | null>>({});
  const [copied, setCopied] = useState<Record<string, boolean>>({});
  const [fetching, setFetching] = useState(false);
  const [fetchMsg, setFetchMsg] = useState<string | null>(null);

  // ── Filtrado ──────────────────────────────────────────────────
  const filtered = notes.filter((n) => {
    if (filterSource !== "all" && n.source !== filterSource) return false;
    if (filterImpact !== "all" && n.impactLevel !== filterImpact) return false;
    return true;
  });

  // ── Actualización manual ──────────────────────────────────────
  const triggerFetch = useCallback(async () => {
    setFetching(true);
    setFetchMsg(null);
    try {
      const res = await fetch("/api/radar/fetch", { method: "POST" });
      const data = await res.json() as {
        ok: boolean; processed?: number; skipped?: number; error?: string;
        stats?: typeof initialStats;
      };
      if (!data.ok) throw new Error(data.error ?? "Error desconocido");
      setFetchMsg(`Ciclo completado: ${data.processed ?? 0} nuevas notas procesadas`);
      // Recargar notas
      const notesRes = await fetch("/api/radar/notes?limit=50");
      const notesData = await notesRes.json() as { notes: RadarNote[]; stats: typeof initialStats };
      setNotes(notesData.notes);
      setStats(notesData.stats);
    } catch (e) {
      setFetchMsg(e instanceof Error ? e.message : "Error al ejecutar el ciclo");
    } finally {
      setFetching(false);
      setTimeout(() => setFetchMsg(null), 6000);
    }
  }, []);

  // ── Copy ─────────────────────────────────────────────────────
  const copy = useCallback((text: string, key: string) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied((p) => ({ ...p, [key]: true }));
      setTimeout(() => setCopied((p) => ({ ...p, [key]: false })), 1800);
    });
  }, []);

  // ── Toggle versión ────────────────────────────────────────────
  const toggleVersion = useCallback((id: string, v: "x" | "whatsapp") => {
    setActiveVersion((p) => ({ ...p, [id]: p[id] === v ? null : v }));
  }, []);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* ── Nav ── */}
      <nav className="sticky top-0 z-50 bg-white/95 backdrop-blur border-b border-gray-100">
        <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between gap-4">
          <Link href="/" className="flex items-center gap-2 text-blue-900 font-semibold text-sm hover:opacity-80 transition-opacity">
            <svg width="18" height="18" viewBox="0 0 20 20" fill="none">
              <path d="M12 5l-5 5 5 5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            LexFiscalIA
          </Link>
          <h1 className="text-sm font-semibold text-gray-900" style={SYNE}>Radar automático</h1>
          <div className="flex items-center gap-2">
            <Link href="/content" className="text-xs font-medium text-gray-500 hover:text-blue-900 transition-colors border border-gray-200 rounded-lg px-3 py-1.5">
              Análisis manual
            </Link>
            <Link href="/radar" className="text-xs font-medium text-gray-500 hover:text-blue-900 transition-colors border border-gray-200 rounded-lg px-3 py-1.5">
              Radar BOE
            </Link>
          </div>
        </div>
      </nav>

      <div className="max-w-6xl mx-auto px-4 py-8 flex flex-col gap-6">

        {/* ── Header + stats ── */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold text-gray-900" style={SYNE}>
              Novedades fiscales detectadas
            </h2>
            <p className="text-sm text-gray-500 mt-0.5">
              BOE y AEAT monitorizados automáticamente cada 6 horas · Análisis por GPT-4o
            </p>
          </div>
          <button
            onClick={triggerFetch}
            disabled={fetching}
            className="self-start sm:self-auto flex items-center gap-2 bg-blue-900 hover:bg-blue-800 disabled:opacity-60 text-white text-sm font-semibold px-4 py-2.5 rounded-xl transition-colors"
          >
            {fetching ? (
              <>
                <svg className="animate-spin" width="14" height="14" viewBox="0 0 24 24" fill="none">
                  <circle cx="12" cy="12" r="10" stroke="white" strokeWidth="3" strokeOpacity="0.25" />
                  <path d="M12 2a10 10 0 0110 10" stroke="white" strokeWidth="3" strokeLinecap="round" />
                </svg>
                Analizando…
              </>
            ) : (
              <>
                <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                  <path d="M13.5 2.5v4h-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  <path d="M13.5 6.5A6 6 0 1 1 10 2.06" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                </svg>
                Actualizar ahora
              </>
            )}
          </button>
        </div>

        {/* ── Feedback mensaje ── */}
        {fetchMsg && (
          <div className={`text-sm px-4 py-2.5 rounded-xl border ${
            fetchMsg.includes("Error") || fetchMsg.includes("error")
              ? "bg-red-50 text-red-700 border-red-200"
              : "bg-emerald-50 text-emerald-700 border-emerald-200"
          }`}>
            {fetchMsg}
          </div>
        )}

        {/* ── Stats bar ── */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: "Total notas", value: stats.total },
            { label: "Impacto alto", value: stats.byImpact.alto, color: "text-red-600" },
            { label: "Del BOE", value: stats.bySource.BOE, color: "text-blue-700" },
            { label: "De la AEAT", value: stats.bySource.AEAT, color: "text-violet-700" },
          ].map(({ label, value, color }) => (
            <div key={label} className="bg-white border border-gray-100 rounded-2xl px-4 py-3">
              <div className={`text-2xl font-bold ${color ?? "text-gray-900"}`} style={SYNE}>
                {value}
              </div>
              <div className="text-xs text-gray-500 mt-0.5">{label}</div>
            </div>
          ))}
        </div>

        {stats.lastDetected && (
          <p className="text-xs text-gray-400">
            Última detección: {formatDate(stats.lastDetected)}
          </p>
        )}

        {/* ── Filtros ── */}
        <div className="flex flex-wrap gap-2">
          <span className="text-xs font-semibold text-gray-400 self-center mr-1">Fuente:</span>
          {(["all", "BOE", "AEAT"] as const).map((s) => (
            <button
              key={s}
              onClick={() => setFilterSource(s)}
              className={`text-xs font-semibold px-3 py-1.5 rounded-lg border transition-all ${
                filterSource === s
                  ? "bg-blue-900 text-white border-blue-900"
                  : "bg-white text-gray-600 border-gray-200 hover:border-blue-900 hover:text-blue-900"
              }`}
            >
              {s === "all" ? "Todas" : s}
            </button>
          ))}
          <span className="text-xs font-semibold text-gray-400 self-center ml-2 mr-1">Impacto:</span>
          {(["all", "alto", "medio", "bajo"] as const).map((imp) => (
            <button
              key={imp}
              onClick={() => setFilterImpact(imp)}
              className={`text-xs font-semibold px-3 py-1.5 rounded-lg border transition-all capitalize ${
                filterImpact === imp
                  ? "bg-blue-900 text-white border-blue-900"
                  : "bg-white text-gray-600 border-gray-200 hover:border-blue-900 hover:text-blue-900"
              }`}
            >
              {imp === "all" ? "Todos" : imp}
            </button>
          ))}
        </div>

        {/* ── Lista de notas ── */}
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3 text-center">
            <div className="w-14 h-14 rounded-2xl bg-blue-50 flex items-center justify-center">
              <svg width="26" height="26" viewBox="0 0 24 24" fill="none">
                <circle cx="11" cy="11" r="7" stroke="#1e3a5f" strokeWidth="1.6" />
                <path d="M20 20l-3-3" stroke="#1e3a5f" strokeWidth="1.6" strokeLinecap="round" />
              </svg>
            </div>
            <p className="text-sm font-semibold text-gray-700">
              {stats.total === 0
                ? "Aún no hay notas generadas"
                : "No hay notas con estos filtros"}
            </p>
            <p className="text-xs text-gray-400 max-w-xs">
              {stats.total === 0
                ? "Pulsa «Actualizar ahora» para ejecutar el primer ciclo de detección."
                : "Prueba cambiando los filtros de fuente o impacto."}
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {filtered.map((note) => {
              const imp = IMPACT_STYLES[note.impactLevel];
              const isExpanded = expandedId === note.id;
              const version = activeVersion[note.id] ?? null;
              const analysisResult = noteToAnalysisResult(note);
              const xText = generateXVersion(analysisResult);
              const waText = generateWhatsAppVersion(analysisResult);

              return (
                <div key={note.id} className="bg-white border border-gray-100 rounded-2xl overflow-hidden">
                  {/* ── Cabecera de la nota ── */}
                  <div className="p-5 flex flex-col gap-3">
                    {/* Badges + fecha */}
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={`inline-flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full border ${imp.pill}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${imp.dot}`} />
                        {imp.label}
                      </span>
                      <span className={`text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full border ${SOURCE_STYLES[note.source]}`}>
                        {note.source}
                      </span>
                      {note.keywords.map((kw) => (
                        <span key={kw} className="text-[10px] font-medium text-gray-500 bg-gray-50 border border-gray-200 px-2 py-0.5 rounded-full">
                          {kw}
                        </span>
                      ))}
                      <span className="text-[10px] text-gray-400 ml-auto">{formatDate(note.detectedAt)}</span>
                    </div>

                    {/* Título generado por IA */}
                    <h3 className="text-sm font-bold text-gray-900 leading-snug" style={SYNE}>
                      {note.analysis.title}
                    </h3>

                    {/* Resumen */}
                    <p className="text-sm text-gray-600 leading-relaxed">{note.analysis.summary}</p>

                    {/* Acciones rápidas */}
                    <div className="flex flex-wrap items-center gap-2 pt-1">
                      <button
                        onClick={() => setExpandedId(isExpanded ? null : note.id)}
                        className="text-xs font-semibold text-blue-900 hover:underline flex items-center gap-1"
                      >
                        {isExpanded ? "Cerrar análisis" : "Ver análisis completo"}
                        <svg
                          width="12" height="12" viewBox="0 0 12 12" fill="none"
                          className={`transition-transform ${isExpanded ? "rotate-180" : ""}`}
                        >
                          <path d="M2 4l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      </button>
                      <span className="text-gray-200">|</span>
                      <button
                        onClick={() => toggleVersion(note.id, "x")}
                        className={`text-xs font-medium px-2.5 py-1 rounded-lg border transition-all ${
                          version === "x"
                            ? "bg-gray-900 text-white border-gray-900"
                            : "text-gray-500 border-gray-200 hover:border-gray-900 hover:text-gray-900"
                        }`}
                      >
                        X
                      </button>
                      <button
                        onClick={() => toggleVersion(note.id, "whatsapp")}
                        className={`text-xs font-medium px-2.5 py-1 rounded-lg border transition-all ${
                          version === "whatsapp"
                            ? "bg-emerald-700 text-white border-emerald-700"
                            : "text-gray-500 border-gray-200 hover:border-emerald-700 hover:text-emerald-700"
                        }`}
                      >
                        WA
                      </button>
                      <a
                        href={note.sourceUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-gray-400 hover:text-blue-900 flex items-center gap-1 ml-auto"
                      >
                        <svg width="10" height="10" viewBox="0 0 12 12" fill="none">
                          <path d="M7 1h4v4M11 1L5 7" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
                          <path d="M9 7v3a1 1 0 01-1 1H2a1 1 0 01-1-1V4a1 1 0 011-1h3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
                        </svg>
                        Fuente original
                      </a>
                    </div>
                  </div>

                  {/* ── Análisis completo (expandible) ── */}
                  {isExpanded && (
                    <div className="border-t border-gray-100 bg-gray-50 p-5 flex flex-col gap-4">
                      {[
                        { label: "¿A quién afecta?", content: note.analysis.affectedAudience },
                        { label: "Impacto real", content: note.analysis.practicalImpact },
                      ].map(({ label, content }) => (
                        <div key={label}>
                          <span className="text-[10px] font-semibold uppercase tracking-wider text-gray-400">{label}</span>
                          <p className="text-sm text-gray-700 mt-1 leading-relaxed">{content}</p>
                        </div>
                      ))}
                      <div>
                        <span className="text-[10px] font-semibold uppercase tracking-wider text-gray-400">Puntos de acción</span>
                        <ul className="flex flex-col gap-1.5 mt-2">
                          {note.analysis.actionPoints.map((pt, i) => (
                            <li key={i} className="flex items-start gap-2 text-sm text-gray-700 leading-relaxed">
                              <span className="mt-0.5 w-5 h-5 flex-shrink-0 rounded-full bg-blue-900 text-white text-[10px] font-bold flex items-center justify-center">
                                {i + 1}
                              </span>
                              {pt}
                            </li>
                          ))}
                        </ul>
                      </div>
                      <div className="bg-blue-50 border border-blue-100 rounded-xl px-4 py-3">
                        <p className="text-sm text-blue-900 font-medium leading-relaxed">{note.analysis.cta}</p>
                      </div>
                    </div>
                  )}

                  {/* ── Versiones X / WA ── */}
                  {version && (
                    <div className="border-t border-gray-100 p-5 flex flex-col gap-3">
                      <pre className="text-xs text-gray-700 whitespace-pre-wrap bg-gray-50 rounded-xl p-4 leading-relaxed border border-gray-100 font-sans">
                        {version === "x" ? xText : waText}
                      </pre>
                      <div className="flex justify-end">
                        <button
                          onClick={() => copy(version === "x" ? xText : waText, `${note.id}-${version}`)}
                          className={`inline-flex items-center gap-1.5 text-xs font-medium border rounded-lg px-3 py-1.5 transition-colors ${
                            copied[`${note.id}-${version}`]
                              ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                              : "bg-white text-gray-600 border-gray-200 hover:border-blue-900 hover:text-blue-900"
                          }`}
                        >
                          {copied[`${note.id}-${version}`] ? "Copiado ✓" : `Copiar para ${version === "x" ? "X" : "WhatsApp"}`}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
