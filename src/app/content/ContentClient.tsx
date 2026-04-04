"use client";

import { useState, useCallback } from "react";
import Link from "next/link";
import {
  generateXVersion,
  generateWhatsAppVersion,
  type SourceType,
  type AnalysisResult,
} from "@/lib/contentEngine";

// ─── CONSTANTES ──────────────────────────────────────────────────
const SYNE = { fontFamily: "'Syne', sans-serif" };

const EXAMPLE_URLS: Record<SourceType, string> = {
  AEAT: "https://www.agenciatributaria.es/AEAT.internet/Inicio/Novedades/2024/autónomos-cotizacion-ingresos-reales.shtml",
  BOE: "https://www.boe.es/diario_boe/txt.php?id=BOE-A-2024-iva-prorrata",
};

type CopyState = Record<string, boolean>;

// ─── HELPERS ─────────────────────────────────────────────────────
function copyToClipboard(text: string, key: string, setCopied: React.Dispatch<React.SetStateAction<CopyState>>) {
  navigator.clipboard.writeText(text).then(() => {
    setCopied((prev) => ({ ...prev, [key]: true }));
    setTimeout(() => setCopied((prev) => ({ ...prev, [key]: false })), 1800);
  });
}

function CopyBtn({
  text,
  label = "Copiar",
  copyKey,
  copied,
  setCopied,
  small = false,
}: {
  text: string;
  label?: string;
  copyKey: string;
  copied: CopyState;
  setCopied: React.Dispatch<React.SetStateAction<CopyState>>;
  small?: boolean;
}) {
  const done = copied[copyKey];
  return (
    <button
      onClick={() => copyToClipboard(text, copyKey, setCopied)}
      className={`inline-flex items-center gap-1.5 font-medium transition-colors rounded-lg border ${
        done
          ? "border-emerald-300 bg-emerald-50 text-emerald-700"
          : "border-gray-200 bg-white text-gray-600 hover:border-blue-900 hover:text-blue-900"
      } ${small ? "text-xs px-2.5 py-1" : "text-sm px-3 py-1.5"}`}
    >
      {done ? (
        <>
          <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
            <path d="M3 8l4 4 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          Copiado
        </>
      ) : (
        <>
          <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
            <rect x="5" y="5" width="8" height="8" rx="1.5" stroke="currentColor" strokeWidth="1.5" />
            <path d="M11 5V4a1 1 0 00-1-1H4a1 1 0 00-1 1v6a1 1 0 001 1h1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
          {label}
        </>
      )}
    </button>
  );
}

function ResultBlock({
  label,
  content,
  copyKey,
  copied,
  setCopied,
  isList = false,
}: {
  label: string;
  content: string | string[];
  copyKey: string;
  copied: CopyState;
  setCopied: React.Dispatch<React.SetStateAction<CopyState>>;
  isList?: boolean;
}) {
  const textToCopy = Array.isArray(content) ? content.join("\n") : content;
  return (
    <div className="bg-white border border-gray-100 rounded-2xl p-5 flex flex-col gap-3">
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-semibold uppercase tracking-widest text-gray-400">{label}</span>
        <CopyBtn text={textToCopy} copyKey={copyKey} copied={copied} setCopied={setCopied} small />
      </div>
      {isList && Array.isArray(content) ? (
        <ul className="flex flex-col gap-1.5">
          {content.map((item, i) => (
            <li key={i} className="flex items-start gap-2 text-sm text-gray-700 leading-relaxed">
              <span className="mt-1 w-5 h-5 flex-shrink-0 rounded-full bg-blue-900 text-white text-xs flex items-center justify-center font-semibold">
                {i + 1}
              </span>
              {item}
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-gray-700 leading-relaxed">{Array.isArray(content) ? content.join(" ") : content}</p>
      )}
    </div>
  );
}

// ─── COMPONENTE PRINCIPAL ─────────────────────────────────────────
export default function ContentClient() {
  const [sourceType, setSourceType] = useState<SourceType>("AEAT");
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState<CopyState>({});
  const [activeVersion, setActiveVersion] = useState<"x" | "whatsapp" | null>(null);

  const handleAnalyze = useCallback(async () => {
    const trimmed = url.trim();
    if (!trimmed) {
      setError("Introduce una URL antes de analizar.");
      return;
    }
    setError(null);
    setResult(null);
    setActiveVersion(null);
    setLoading(true);
    try {
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: trimmed, sourceType }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({})) as { error?: string };
        throw new Error(err.error ?? `HTTP ${res.status}`);
      }
      const data = await res.json() as AnalysisResult;
      setResult(data);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Error desconocido";
      setError(msg || "Error al procesar la fuente. Comprueba la URL e inténtalo de nuevo.");
    } finally {
      setLoading(false);
    }
  }, [sourceType, url]);

  const handleExample = useCallback(() => {
    setUrl(EXAMPLE_URLS[sourceType]);
    setResult(null);
    setActiveVersion(null);
    setError(null);
  }, [sourceType]);

  const handleClear = useCallback(() => {
    setUrl("");
    setResult(null);
    setActiveVersion(null);
    setError(null);
  }, []);

  const fullNote = result
    ? `${result.title}\n\n${result.summary}\n\n¿A quién afecta?\n${result.affectedAudience}\n\nImpacto práctico\n${result.practicalImpact}\n\nQué revisar ahora:\n${result.actionPoints.map((p, i) => `${i + 1}. ${p}`).join("\n")}\n\n${result.cta}\n\nFuente oficial: ${result.sourceUrl}`
    : "";

  const xVersion = result ? generateXVersion(result) : "";
  const waVersion = result ? generateWhatsAppVersion(result) : "";

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
          <h1 className="text-sm font-semibold text-gray-900" style={SYNE}>
            Centro de contenido
          </h1>
          <Link
            href="/radar"
            className="text-xs font-medium text-gray-500 hover:text-blue-900 transition-colors border border-gray-200 rounded-lg px-3 py-1.5"
          >
            Radar BOE
          </Link>
        </div>
      </nav>

      <div className="max-w-6xl mx-auto px-4 py-8 flex flex-col lg:flex-row gap-8">
        {/* ── Columna principal ── */}
        <div className="flex-1 min-w-0 flex flex-col gap-6">

          {/* ── Formulario ── */}
          <div className="bg-white border border-gray-100 rounded-2xl p-6 flex flex-col gap-5">
            <div>
              <h2 className="text-lg font-bold text-gray-900 mb-0.5" style={SYNE}>
                Analizar fuente oficial
              </h2>
              <p className="text-sm text-gray-500">
                Introduce la URL de un documento del BOE o una nota de la AEAT para generar contenido editorial.
              </p>
            </div>

            {/* Source selector */}
            <div className="flex gap-2">
              {(["AEAT", "BOE"] as SourceType[]).map((s) => (
                <button
                  key={s}
                  onClick={() => { setSourceType(s); setResult(null); setActiveVersion(null); setError(null); }}
                  className={`flex-1 py-2.5 rounded-xl text-sm font-semibold border transition-all ${
                    sourceType === s
                      ? "bg-blue-900 text-white border-blue-900 shadow-sm"
                      : "bg-white text-gray-600 border-gray-200 hover:border-blue-900 hover:text-blue-900"
                  }`}
                >
                  {s === "AEAT" ? "AEAT — Agencia Tributaria" : "BOE — Boletín Oficial"}
                </button>
              ))}
            </div>

            {/* URL input */}
            <div className="flex flex-col gap-2">
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                URL de la fuente
              </label>
              <div className="flex gap-2">
                <input
                  type="url"
                  value={url}
                  onChange={(e) => { setUrl(e.target.value); setError(null); }}
                  onKeyDown={(e) => e.key === "Enter" && handleAnalyze()}
                  placeholder={sourceType === "AEAT" ? "https://www.agenciatributaria.es/..." : "https://www.boe.es/diario_boe/..."}
                  className="flex-1 text-sm border border-gray-200 rounded-xl px-4 py-2.5 focus:outline-none focus:border-blue-900 focus:ring-1 focus:ring-blue-900/20 placeholder:text-gray-300 bg-white"
                />
                <button
                  onClick={handleExample}
                  className="text-xs font-medium text-gray-500 hover:text-blue-900 border border-gray-200 hover:border-blue-900 rounded-xl px-3 py-2.5 transition-colors whitespace-nowrap"
                >
                  Cargar ejemplo
                </button>
              </div>
              {error && (
                <p className="text-xs text-red-600 flex items-center gap-1">
                  <svg width="12" height="12" viewBox="0 0 16 16" fill="none">
                    <circle cx="8" cy="8" r="7" stroke="currentColor" strokeWidth="1.5" />
                    <path d="M8 5v4M8 11v.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                  </svg>
                  {error}
                </p>
              )}
            </div>

            {/* Actions */}
            <div className="flex gap-3">
              <button
                onClick={handleAnalyze}
                disabled={loading}
                className="flex-1 bg-blue-900 hover:bg-blue-800 disabled:opacity-60 text-white font-semibold text-sm rounded-xl py-3 transition-colors flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <svg className="animate-spin" width="16" height="16" viewBox="0 0 24 24" fill="none">
                      <circle cx="12" cy="12" r="10" stroke="white" strokeWidth="3" strokeOpacity="0.2" />
                      <path d="M12 2a10 10 0 0110 10" stroke="white" strokeWidth="3" strokeLinecap="round" />
                    </svg>
                    Analizando…
                  </>
                ) : (
                  <>
                    <svg width="16" height="16" viewBox="0 0 20 20" fill="none">
                      <circle cx="8.5" cy="8.5" r="5.5" stroke="currentColor" strokeWidth="1.8" />
                      <path d="M13 13l4 4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                    </svg>
                    Analizar fuente
                  </>
                )}
              </button>
              {result && (
                <button
                  onClick={handleClear}
                  className="text-sm font-medium text-gray-400 hover:text-gray-700 border border-gray-200 rounded-xl px-4 py-3 transition-colors"
                >
                  Limpiar
                </button>
              )}
            </div>
          </div>

          {/* ── Resultados ── */}
          {result && (
            <div className="flex flex-col gap-4">
              {/* Cabecera de resultados */}
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-semibold text-gray-700" style={SYNE}>
                    Nota editorial generada
                  </h3>
                  {result.generationMode === "ai" ? (
                    <span className="inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block" />
                      IA real
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full bg-gray-100 text-gray-400 border border-gray-200">
                      <span className="w-1.5 h-1.5 rounded-full bg-gray-300 inline-block" />
                      Modo respaldo
                    </span>
                  )}
                </div>
                <CopyBtn text={fullNote} label="Copiar nota completa" copyKey="full" copied={copied} setCopied={setCopied} />
              </div>

              {/* Bloques editoriales */}
              <ResultBlock
                label="Titular"
                content={result.title}
                copyKey="title"
                copied={copied}
                setCopied={setCopied}
              />
              <ResultBlock
                label="Resumen"
                content={result.summary}
                copyKey="summary"
                copied={copied}
                setCopied={setCopied}
              />
              <ResultBlock
                label="¿A quién afecta?"
                content={result.affectedAudience}
                copyKey="audience"
                copied={copied}
                setCopied={setCopied}
              />
              <ResultBlock
                label="Impacto práctico"
                content={result.practicalImpact}
                copyKey="impact"
                copied={copied}
                setCopied={setCopied}
              />
              <ResultBlock
                label="Puntos de acción"
                content={result.actionPoints}
                copyKey="actions"
                copied={copied}
                setCopied={setCopied}
                isList
              />
              <ResultBlock
                label="CTA"
                content={result.cta}
                copyKey="cta"
                copied={copied}
                setCopied={setCopied}
              />
              <div className="bg-white border border-gray-100 rounded-2xl p-5 flex flex-col gap-2">
                <span className="text-xs font-semibold uppercase tracking-widest text-gray-400">Fuente oficial</span>
                <a
                  href={result.sourceUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-blue-900 hover:underline break-all"
                >
                  {result.sourceUrl}
                </a>
              </div>

              {/* Barra de versiones */}
              <div className="bg-white border border-gray-100 rounded-2xl p-5 flex flex-col gap-4">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <span className="text-sm font-semibold text-gray-700" style={SYNE}>
                    Versiones para difusión
                  </span>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setActiveVersion(activeVersion === "x" ? null : "x")}
                      className={`text-xs font-semibold border rounded-lg px-3 py-1.5 transition-all ${
                        activeVersion === "x"
                          ? "bg-gray-900 text-white border-gray-900"
                          : "bg-white text-gray-600 border-gray-200 hover:border-gray-900 hover:text-gray-900"
                      }`}
                    >
                      X / Twitter
                    </button>
                    <button
                      onClick={() => setActiveVersion(activeVersion === "whatsapp" ? null : "whatsapp")}
                      className={`text-xs font-semibold border rounded-lg px-3 py-1.5 transition-all ${
                        activeVersion === "whatsapp"
                          ? "bg-emerald-700 text-white border-emerald-700"
                          : "bg-white text-gray-600 border-gray-200 hover:border-emerald-700 hover:text-emerald-700"
                      }`}
                    >
                      WhatsApp
                    </button>
                  </div>
                </div>

                {activeVersion === "x" && (
                  <div className="flex flex-col gap-3">
                    <pre className="text-xs text-gray-700 whitespace-pre-wrap bg-gray-50 rounded-xl p-4 leading-relaxed border border-gray-100 font-sans">
                      {xVersion}
                    </pre>
                    <div className="flex justify-end">
                      <CopyBtn text={xVersion} label="Copiar para X" copyKey="xversion" copied={copied} setCopied={setCopied} small />
                    </div>
                  </div>
                )}

                {activeVersion === "whatsapp" && (
                  <div className="flex flex-col gap-3">
                    <pre className="text-xs text-gray-700 whitespace-pre-wrap bg-gray-50 rounded-xl p-4 leading-relaxed border border-gray-100 font-sans">
                      {waVersion}
                    </pre>
                    <div className="flex justify-end">
                      <CopyBtn text={waVersion} label="Copiar para WhatsApp" copyKey="waversion" copied={copied} setCopied={setCopied} small />
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ── Estado vacío ── */}
          {!result && !loading && (
            <div className="flex flex-col items-center justify-center py-16 gap-3 text-center">
              <div className="w-14 h-14 rounded-2xl bg-blue-50 flex items-center justify-center mb-1">
                <svg width="26" height="26" viewBox="0 0 24 24" fill="none">
                  <path d="M9 12h6M9 16h6M7 4H5a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2V6a2 2 0 00-2-2h-2" stroke="#1e3a5f" strokeWidth="1.6" strokeLinecap="round" />
                  <rect x="7" y="2" width="10" height="4" rx="1" stroke="#1e3a5f" strokeWidth="1.6" />
                </svg>
              </div>
              <p className="text-sm font-semibold text-gray-700">Introduce una URL para comenzar</p>
              <p className="text-xs text-gray-400 max-w-xs">
                Pega el enlace de cualquier documento del BOE o nota de la AEAT y genera la nota editorial completa en segundos.
              </p>
            </div>
          )}
        </div>

        {/* ── Sidebar ── */}
        <aside className="w-full lg:w-72 flex-shrink-0 flex flex-col gap-5">
          {/* Flujo ideal */}
          <div className="bg-white border border-gray-100 rounded-2xl p-5">
            <h3 className="text-sm font-bold text-gray-900 mb-4" style={SYNE}>
              Flujo ideal
            </h3>
            <ol className="flex flex-col gap-4">
              {[
                { n: 1, title: "Detecta la novedad", desc: "Encuentra la URL del BOE o la nota de la AEAT." },
                { n: 2, title: "Analiza la fuente", desc: "Pega la URL aquí y genera la nota editorial completa." },
                { n: 3, title: "Revisa y adapta", desc: "Ajusta el contenido a tu voz y al perfil de tu audiencia." },
                { n: 4, title: "Distribuye", desc: "Usa las versiones de X o WhatsApp para publicar directamente." },
              ].map(({ n, title, desc }) => (
                <li key={n} className="flex items-start gap-3">
                  <span className="w-6 h-6 flex-shrink-0 rounded-full bg-blue-900 text-white text-xs font-bold flex items-center justify-center mt-0.5">
                    {n}
                  </span>
                  <div>
                    <p className="text-xs font-semibold text-gray-800">{title}</p>
                    <p className="text-xs text-gray-400 leading-relaxed mt-0.5">{desc}</p>
                  </div>
                </li>
              ))}
            </ol>
          </div>

          {/* Próximamente */}
          <div className="bg-blue-900 rounded-2xl p-5">
            <h3 className="text-sm font-bold text-white mb-3" style={SYNE}>
              Próximamente
            </h3>
            <ul className="flex flex-col gap-2.5">
              {[
                "IA real — análisis del documento completo",
                "Scraping automático — sin copiar la URL",
                "Publicación directa a LinkedIn y newsletter",
                "Historial de notas generadas",
              ].map((item) => (
                <li key={item} className="flex items-start gap-2 text-xs text-blue-100 leading-relaxed">
                  <svg className="flex-shrink-0 mt-0.5" width="12" height="12" viewBox="0 0 16 16" fill="none">
                    <circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth="1.5" strokeOpacity="0.6" />
                    <path d="M6 8.5l2 2 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" strokeOpacity="0.8" />
                  </svg>
                  {item}
                </li>
              ))}
            </ul>
          </div>

          {/* Fuentes recomendadas */}
          <div className="bg-white border border-gray-100 rounded-2xl p-5">
            <h3 className="text-sm font-bold text-gray-900 mb-3" style={SYNE}>
              Fuentes recomendadas
            </h3>
            <ul className="flex flex-col gap-2">
              {[
                { label: "BOE — Novedades fiscales", href: "https://www.boe.es" },
                { label: "AEAT — Novedades normativas", href: "https://www.agenciatributaria.es" },
                { label: "DGT — Consultas vinculantes", href: "https://petete.tributos.hacienda.gob.es" },
              ].map(({ label, href }) => (
                <li key={href}>
                  <a
                    href={href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-blue-900 hover:underline flex items-center gap-1.5"
                  >
                    <svg width="10" height="10" viewBox="0 0 14 14" fill="none">
                      <path d="M2 7h10M7 2l5 5-5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                    {label}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </aside>
      </div>
    </div>
  );
}
