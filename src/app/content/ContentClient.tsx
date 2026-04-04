"use client";

import { useState, useCallback } from "react";
import Link from "next/link";
import type { UrlAnalysis } from "@/app/api/analyze-url/route";

// ─── CONSTANTES ──────────────────────────────────────────────────
const SYNE = { fontFamily: "'Syne', sans-serif" };

const EXAMPLE_URLS = [
  "https://www.boe.es/diario_boe/txt.php?id=BOE-A-2023-24823",
  "https://sede.agenciatributaria.gob.es/Sede/todas-noticias.html",
];

type CopyState = Record<string, boolean>;

// ─── HELPERS ─────────────────────────────────────────────────────
function useCopy(): [CopyState, (text: string, key: string) => void] {
  const [copied, setCopied] = useState<CopyState>({});
  const copy = useCallback((text: string, key: string) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied((p) => ({ ...p, [key]: true }));
      setTimeout(() => setCopied((p) => ({ ...p, [key]: false })), 1800);
    });
  }, []);
  return [copied, copy];
}

function CopyBtn({
  text, label = "Copiar", copyKey, copied, onCopy, small = false,
}: {
  text: string; label?: string; copyKey: string;
  copied: CopyState; onCopy: (text: string, key: string) => void; small?: boolean;
}) {
  const done = copied[copyKey];
  return (
    <button
      onClick={() => onCopy(text, copyKey)}
      className={`inline-flex items-center gap-1.5 font-medium transition-colors rounded-lg border ${
        done
          ? "border-emerald-300 bg-emerald-50 text-emerald-700"
          : "border-gray-200 bg-white text-gray-600 hover:border-blue-900 hover:text-blue-900"
      } ${small ? "text-xs px-2.5 py-1" : "text-sm px-3 py-1.5"}`}
    >
      {done ? "Copiado ✓" : label}
    </button>
  );
}

// ─── GENERADORES DE VERSIONES ────────────────────────────────────
function toXVersion(r: UrlAnalysis): string {
  return `⚠️ ${r.title}

${r.whatHappened.split(/[.!?]/)[0].trim()}.

${r.risk.split(/[.!?]/)[0].trim()}.

Qué hacer:
${r.whatToDo.slice(0, 3).map((p) => `→ ${p}`).join("\n")}

${r.recommendation}

🔗 ${r.sourceUrl}

#Fiscal #Hacienda #Autónomos #IRPF #IVA`;
}

function toWAVersion(r: UrlAnalysis): string {
  return `Hola,

Te mando esto porque puede afectarte.

📌 *${r.title}*

*Qué ha pasado:*
${r.whatHappened}

*¿A quién afecta?*
${r.whoAffected}

*Qué tienes que hacer:*
${r.whatToDo.map((p, i) => `${i + 1}. ${p}`).join("\n")}

*⚠️ Riesgo si no actúas:*
${r.risk}

*✅ Recomendación:*
${r.recommendation}

Fuente oficial: ${r.sourceUrl}`;
}

// ─── BLOQUE DE RESULTADO ─────────────────────────────────────────
function Block({
  label, children, copyText, copyKey, copied, onCopy,
}: {
  label: string; children: React.ReactNode; copyText: string;
  copyKey: string; copied: CopyState; onCopy: (t: string, k: string) => void;
}) {
  return (
    <div className="bg-white border border-gray-100 rounded-2xl p-5 flex flex-col gap-3">
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-semibold uppercase tracking-widest text-gray-400">{label}</span>
        <CopyBtn text={copyText} copyKey={copyKey} copied={copied} onCopy={onCopy} small />
      </div>
      {children}
    </div>
  );
}

// ─── COMPONENTE PRINCIPAL ─────────────────────────────────────────
export default function ContentClient() {
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<UrlAnalysis | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [activeVersion, setActiveVersion] = useState<"x" | "whatsapp" | null>(null);
  const [copied, onCopy] = useCopy();

  const analyze = useCallback(async () => {
    const trimmed = url.trim();
    if (!trimmed) { setError("Introduce una URL antes de analizar."); return; }
    setError(null);
    setResult(null);
    setActiveVersion(null);
    setLoading(true);
    try {
      const res = await fetch("/api/analyze-url", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: trimmed }),
      });
      const data = await res.json() as UrlAnalysis & { error?: string };
      if (!res.ok) throw new Error(data.error ?? `HTTP ${res.status}`);
      setResult(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error desconocido");
    } finally {
      setLoading(false);
    }
  }, [url]);

  const clear = useCallback(() => {
    setUrl(""); setResult(null); setActiveVersion(null); setError(null);
  }, []);

  const xText  = result ? toXVersion(result) : "";
  const waText = result ? toWAVersion(result) : "";

  return (
    <div className="min-h-screen bg-gray-50">

      {/* ── Nav ── */}
      <nav className="sticky top-0 z-50 bg-white/95 backdrop-blur border-b border-gray-100">
        <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between gap-4">
          <Link href="/" className="flex items-center gap-2 text-blue-900 font-semibold text-sm hover:opacity-80 transition-opacity">
            <svg width="18" height="18" viewBox="0 0 20 20" fill="none">
              <path d="M12 5l-5 5 5 5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            LexFiscalIA
          </Link>
          <h1 className="text-sm font-semibold text-gray-900" style={SYNE}>Analizar fuente oficial</h1>
          <div className="flex gap-2">
            <Link href="/radar-auto" className="text-xs font-medium text-gray-500 hover:text-blue-900 border border-gray-200 rounded-lg px-3 py-1.5 transition-colors">
              Radar automático
            </Link>
            <Link href="/radar" className="text-xs font-medium text-gray-500 hover:text-blue-900 border border-gray-200 rounded-lg px-3 py-1.5 transition-colors">
              Radar BOE
            </Link>
          </div>
        </div>
      </nav>

      <div className="max-w-5xl mx-auto px-4 py-8 flex flex-col lg:flex-row gap-8">

        {/* ── Columna principal ── */}
        <div className="flex-1 min-w-0 flex flex-col gap-6">

          {/* ── Formulario ── */}
          <div className="bg-white border border-gray-100 rounded-2xl p-6 flex flex-col gap-5">
            <div>
              <h2 className="text-xl font-bold text-gray-900" style={SYNE}>
                ¿Qué dice Hacienda?
              </h2>
              <p className="text-sm text-gray-500 mt-1">
                Pega cualquier URL del BOE o de la Agencia Tributaria. La IA lee el documento y te lo explica en lenguaje claro.
              </p>
            </div>

            {/* URL input */}
            <div className="flex flex-col gap-2">
              <div className="flex gap-2">
                <input
                  type="url"
                  value={url}
                  onChange={(e) => { setUrl(e.target.value); setError(null); }}
                  onKeyDown={(e) => e.key === "Enter" && analyze()}
                  placeholder="https://www.boe.es/... o https://sede.agenciatributaria.gob.es/..."
                  className="flex-1 text-sm border border-gray-200 rounded-xl px-4 py-3 focus:outline-none focus:border-blue-900 focus:ring-1 focus:ring-blue-900/20 placeholder:text-gray-300 bg-white"
                />
                <button
                  onClick={() => setUrl(EXAMPLE_URLS[Math.floor(Math.random() * EXAMPLE_URLS.length)])}
                  className="text-xs font-medium text-gray-500 hover:text-blue-900 border border-gray-200 hover:border-blue-900 rounded-xl px-3 py-2.5 transition-colors whitespace-nowrap"
                >
                  Ejemplo
                </button>
              </div>
              {error && (
                <p className="text-xs text-red-600 flex items-start gap-1.5">
                  <svg className="flex-shrink-0 mt-0.5" width="12" height="12" viewBox="0 0 16 16" fill="none">
                    <circle cx="8" cy="8" r="7" stroke="currentColor" strokeWidth="1.5" />
                    <path d="M8 5v4M8 11v.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                  </svg>
                  {error}
                </p>
              )}
            </div>

            {/* Botones */}
            <div className="flex gap-3">
              <button
                onClick={analyze}
                disabled={loading}
                className="flex-1 bg-blue-900 hover:bg-blue-800 disabled:opacity-60 text-white font-semibold text-sm rounded-xl py-3 transition-colors flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <svg className="animate-spin" width="16" height="16" viewBox="0 0 24 24" fill="none">
                      <circle cx="12" cy="12" r="10" stroke="white" strokeWidth="3" strokeOpacity="0.2" />
                      <path d="M12 2a10 10 0 0110 10" stroke="white" strokeWidth="3" strokeLinecap="round" />
                    </svg>
                    Analizando el documento…
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
                <button onClick={clear} className="text-sm font-medium text-gray-400 hover:text-gray-700 border border-gray-200 rounded-xl px-4 py-3 transition-colors">
                  Limpiar
                </button>
              )}
            </div>
          </div>

          {/* ── Loader skeleton ── */}
          {loading && (
            <div className="flex flex-col gap-4 animate-pulse">
              {[80, 60, 100, 80].map((w, i) => (
                <div key={i} className="bg-white border border-gray-100 rounded-2xl p-5 flex flex-col gap-3">
                  <div className="h-3 bg-gray-100 rounded-full w-24" />
                  <div className={`h-4 bg-gray-100 rounded-full w-${w < 100 ? "[" + w + "%]" : "full"}`} />
                  <div className="h-4 bg-gray-100 rounded-full w-3/4" />
                </div>
              ))}
            </div>
          )}

          {/* ── Resultados ── */}
          {result && !loading && (
            <div className="flex flex-col gap-4">
              {/* Cabecera */}
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-gray-700" style={SYNE}>
                    Explicación para el contribuyente
                  </span>
                  <span className="inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block" />
                    GPT-4o
                  </span>
                </div>
                <CopyBtn
                  text={toWAVersion(result)}
                  label="Copiar resumen"
                  copyKey="full"
                  copied={copied}
                  onCopy={onCopy}
                />
              </div>

              {/* Titular */}
              <div className="bg-blue-900 rounded-2xl p-5">
                <p className="text-white font-bold text-base leading-snug" style={SYNE}>
                  {result.title}
                </p>
                <a href={result.sourceUrl} target="_blank" rel="noopener noreferrer"
                  className="mt-2 inline-flex items-center gap-1 text-blue-200 hover:text-white text-xs transition-colors">
                  <svg width="10" height="10" viewBox="0 0 12 12" fill="none">
                    <path d="M7 1h4v4M11 1L5 7" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
                    <path d="M9 7v3a1 1 0 01-1 1H2a1 1 0 01-1-1V4a1 1 0 011-1h3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
                  </svg>
                  Ver fuente oficial
                </a>
              </div>

              {/* Qué ha pasado */}
              <Block label="Qué ha pasado" copyText={result.whatHappened} copyKey="what" copied={copied} onCopy={onCopy}>
                <p className="text-sm text-gray-700 leading-relaxed">{result.whatHappened}</p>
              </Block>

              {/* A quién afecta */}
              <Block label="A quién afecta" copyText={result.whoAffected} copyKey="who" copied={copied} onCopy={onCopy}>
                <p className="text-sm text-gray-700 leading-relaxed">{result.whoAffected}</p>
              </Block>

              {/* Qué tienes que hacer */}
              <Block label="Qué tienes que hacer" copyText={result.whatToDo.join("\n")} copyKey="todo" copied={copied} onCopy={onCopy}>
                <ul className="flex flex-col gap-2">
                  {result.whatToDo.map((step, i) => (
                    <li key={i} className="flex items-start gap-3 text-sm text-gray-700 leading-relaxed">
                      <span className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-900 text-white text-xs font-bold flex items-center justify-center mt-0.5">
                        {i + 1}
                      </span>
                      {step}
                    </li>
                  ))}
                </ul>
              </Block>

              {/* Riesgo si no actúas */}
              <Block label="Riesgo si no actúas" copyText={result.risk} copyKey="risk" copied={copied} onCopy={onCopy}>
                <div className="flex items-start gap-2.5">
                  <svg className="flex-shrink-0 mt-0.5" width="16" height="16" viewBox="0 0 16 16" fill="none">
                    <path d="M8 2L1.5 13.5h13L8 2z" stroke="#b91c1c" strokeWidth="1.4" strokeLinejoin="round" />
                    <path d="M8 6.5v3M8 11v.5" stroke="#b91c1c" strokeWidth="1.4" strokeLinecap="round" />
                  </svg>
                  <p className="text-sm text-red-800 leading-relaxed">{result.risk}</p>
                </div>
              </Block>

              {/* Recomendación */}
              <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-5 flex items-start gap-3">
                <svg className="flex-shrink-0 mt-0.5" width="18" height="18" viewBox="0 0 20 20" fill="none">
                  <circle cx="10" cy="10" r="8.5" stroke="#059669" strokeWidth="1.5" />
                  <path d="M6.5 10l2.5 2.5 4.5-4.5" stroke="#059669" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                <div className="flex-1">
                  <p className="text-xs font-semibold uppercase tracking-widest text-emerald-700 mb-1">Recomendación</p>
                  <p className="text-sm text-emerald-900 font-medium leading-relaxed">{result.recommendation}</p>
                </div>
                <CopyBtn text={result.recommendation} copyKey="rec" copied={copied} onCopy={onCopy} small />
              </div>

              {/* Versiones para difusión */}
              <div className="bg-white border border-gray-100 rounded-2xl p-5 flex flex-col gap-4">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <span className="text-sm font-semibold text-gray-700" style={SYNE}>Compartir</span>
                  <div className="flex gap-2">
                    {(["x", "whatsapp"] as const).map((v) => (
                      <button
                        key={v}
                        onClick={() => setActiveVersion(activeVersion === v ? null : v)}
                        className={`text-xs font-semibold border rounded-lg px-3 py-1.5 transition-all ${
                          activeVersion === v
                            ? v === "x" ? "bg-gray-900 text-white border-gray-900" : "bg-emerald-700 text-white border-emerald-700"
                            : v === "x"
                            ? "bg-white text-gray-600 border-gray-200 hover:border-gray-900 hover:text-gray-900"
                            : "bg-white text-gray-600 border-gray-200 hover:border-emerald-700 hover:text-emerald-700"
                        }`}
                      >
                        {v === "x" ? "X / Twitter" : "WhatsApp"}
                      </button>
                    ))}
                  </div>
                </div>
                {activeVersion && (
                  <div className="flex flex-col gap-3">
                    <pre className="text-xs text-gray-700 whitespace-pre-wrap bg-gray-50 rounded-xl p-4 leading-relaxed border border-gray-100 font-sans">
                      {activeVersion === "x" ? xText : waText}
                    </pre>
                    <div className="flex justify-end">
                      <CopyBtn
                        text={activeVersion === "x" ? xText : waText}
                        label={`Copiar para ${activeVersion === "x" ? "X" : "WhatsApp"}`}
                        copyKey={`ver-${activeVersion}`}
                        copied={copied}
                        onCopy={onCopy}
                        small
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ── Estado vacío ── */}
          {!result && !loading && (
            <div className="flex flex-col items-center justify-center py-20 gap-3 text-center">
              <div className="w-16 h-16 rounded-2xl bg-blue-50 flex items-center justify-center mb-2">
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
                  <circle cx="11" cy="11" r="7" stroke="#1e3a5f" strokeWidth="1.6" />
                  <path d="M20 20l-3.5-3.5" stroke="#1e3a5f" strokeWidth="1.6" strokeLinecap="round" />
                  <path d="M11 8v3M11 13v.5" stroke="#1e3a5f" strokeWidth="1.6" strokeLinecap="round" />
                </svg>
              </div>
              <p className="text-sm font-semibold text-gray-800">Pega una URL y pulsa analizar</p>
              <p className="text-xs text-gray-400 max-w-xs leading-relaxed">
                Funciona con cualquier página del BOE o de la Agencia Tributaria. La IA lee el documento original y te lo explica en menos de 30 segundos.
              </p>
            </div>
          )}
        </div>

        {/* ── Sidebar ── */}
        <aside className="w-full lg:w-64 flex-shrink-0 flex flex-col gap-5">
          {/* Instrucciones */}
          <div className="bg-white border border-gray-100 rounded-2xl p-5">
            <h3 className="text-sm font-bold text-gray-900 mb-4" style={SYNE}>Cómo funciona</h3>
            <ol className="flex flex-col gap-4">
              {[
                { n: 1, t: "Busca la novedad", d: "Encuentra la URL en el BOE o en la AEAT." },
                { n: 2, t: "Pega la URL", d: "Copia y pega el enlace completo en el campo de arriba." },
                { n: 3, t: "Analiza", d: "La IA lee el documento y lo traduce a lenguaje claro." },
                { n: 4, t: "Comparte", d: "Usa las versiones de X o WhatsApp para distribuirlo." },
              ].map(({ n, t, d }) => (
                <li key={n} className="flex items-start gap-3">
                  <span className="w-6 h-6 flex-shrink-0 rounded-full bg-blue-900 text-white text-xs font-bold flex items-center justify-center mt-0.5">{n}</span>
                  <div>
                    <p className="text-xs font-semibold text-gray-800">{t}</p>
                    <p className="text-xs text-gray-400 leading-relaxed mt-0.5">{d}</p>
                  </div>
                </li>
              ))}
            </ol>
          </div>

          {/* Fuentes */}
          <div className="bg-white border border-gray-100 rounded-2xl p-5">
            <h3 className="text-sm font-bold text-gray-900 mb-3" style={SYNE}>Fuentes compatibles</h3>
            <ul className="flex flex-col gap-2">
              {[
                { label: "BOE — Boletín Oficial", href: "https://www.boe.es" },
                { label: "AEAT — Agencia Tributaria", href: "https://www.agenciatributaria.es" },
                { label: "Sede electrónica AEAT", href: "https://sede.agenciatributaria.gob.es" },
                { label: "DGT — Consultas vinculantes", href: "https://petete.tributos.hacienda.gob.es" },
              ].map(({ label, href }) => (
                <li key={href}>
                  <a href={href} target="_blank" rel="noopener noreferrer"
                    className="text-xs text-blue-900 hover:underline flex items-center gap-1.5">
                    <svg width="10" height="10" viewBox="0 0 14 14" fill="none">
                      <path d="M2 7h10M7 2l5 5-5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                    {label}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Radar link */}
          <Link href="/radar-auto" className="bg-blue-900 rounded-2xl p-5 block group">
            <p className="text-xs font-semibold text-blue-300 uppercase tracking-wider mb-1">También disponible</p>
            <p className="text-sm font-bold text-white" style={SYNE}>Radar automático</p>
            <p className="text-xs text-blue-200 mt-1 leading-relaxed">
              El sistema monitoriza el BOE y la AEAT cada 6 horas y analiza las novedades fiscales por ti.
            </p>
          </Link>
        </aside>
      </div>
    </div>
  );
}
