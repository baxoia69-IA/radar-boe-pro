"use client";
import { useState, useCallback } from "react";
import Link from "next/link";

// ─── CONFIGURA AQUÍ ──────────────────────────────────────────────
const WA_NUMBER = "34600000000"; // ← reemplaza con tu número sin +
const EMAIL     = "info@lexfiscalia.es"; // ← reemplaza
// ─────────────────────────────────────────────────────────────────

const WA_MSG = encodeURIComponent(
  "Hola Sonia 😊 Creo que puedo estar pagando más impuestos de lo que debería.\n\nTe dejo mis datos:\n1️⃣ Trabajo como:\n2️⃣ Ingresos aproximados:\n3️⃣ Mi duda principal es:\n4️⃣ Mi objetivo es: pagar menos / ordenar mi fiscalidad / revisar mi situación"
);
const WA_HREF = `https://wa.me/${WA_NUMBER}?text=${WA_MSG}`;

const WA_SVG = (size = 20) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
  </svg>
);

export default function LandingPage() {
  const [modal, setModal] = useState(false);

  const openFunnel = useCallback(() => {
    if (typeof window !== "undefined" && sessionStorage.getItem("wa-seen")) {
      window.open(WA_HREF, "_blank", "noopener,noreferrer");
      return;
    }
    setModal(true);
  }, []);

  const handleWA = useCallback(() => {
    if (typeof window !== "undefined") {
      sessionStorage.setItem("wa-seen", "1");
      window.open(WA_HREF, "_blank", "noopener,noreferrer");
    }
    setModal(false);
  }, []);

  const closeModal = useCallback(() => setModal(false), []);

  const scrollToContact = useCallback(() => {
    setModal(false);
    setTimeout(() => {
      document.getElementById("contacto")?.scrollIntoView({ behavior: "smooth" });
    }, 80);
  }, []);

  return (
    <div className="bg-zinc-950 text-zinc-100 min-h-screen" style={{ fontFamily: "'DM Mono', monospace" }}>

      {/* ── WHATSAPP FLOATING ────────────────────────────────────── */}
      <button
        onClick={openFunnel}
        aria-label="Contactar por WhatsApp"
        className="fixed bottom-6 right-4 z-50 w-13 h-13 w-[52px] h-[52px] rounded-full bg-emerald-600 flex items-center justify-center shadow-2xl wa-pulse hover:scale-105 transition-transform text-white"
      >
        {WA_SVG(22)}
      </button>

      {/* ── MODAL / BOTTOM-SHEET ─────────────────────────────────── */}
      {modal && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
          <div
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            onClick={closeModal}
          />
          <div className="modal-sheet relative w-full sm:max-w-sm mx-0 sm:mx-4 bg-zinc-900 border border-zinc-700/60 rounded-t-2xl sm:rounded-2xl p-6 pb-8 sm:pb-6">
            <button
              onClick={closeModal}
              className="absolute top-4 right-4 w-7 h-7 flex items-center justify-center rounded-full text-zinc-600 hover:text-zinc-300 hover:bg-zinc-800 transition-colors"
              aria-label="Cerrar"
            >
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.8">
                <path d="M1 1l12 12M13 1L1 13" />
              </svg>
            </button>

            <p className="text-[10px] text-emerald-500 uppercase tracking-widest mb-3">WhatsApp directo</p>
            <p className="text-base font-bold text-zinc-100 mb-4 leading-snug" style={{ fontFamily: "'Syne', sans-serif" }}>
              Te respondo yo personalmente.
            </p>

            <div className="flex gap-2 mb-5">
              {["Sin bots", "Respuesta clara", "Caso confidencial"].map((t) => (
                <span key={t} className="text-[10px] border border-zinc-700 text-zinc-400 px-2 py-1 rounded-full leading-none">
                  {t}
                </span>
              ))}
            </div>

            <div className="bg-zinc-800/50 border border-zinc-800 rounded-lg p-3.5 mb-5">
              <p className="text-[10px] text-zinc-500 uppercase tracking-wider mb-2">Para ayudarte, cuéntame</p>
              <ul className="space-y-1">
                {["A qué te dedicas", "Ingresos aproximados", "Tu duda principal"].map((item) => (
                  <li key={item} className="flex items-center gap-2 text-xs text-zinc-400">
                    <span className="w-1 h-1 rounded-full bg-zinc-600 flex-shrink-0" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>

            <button
              onClick={handleWA}
              className="flex items-center justify-center gap-2.5 w-full py-3.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-medium transition-colors mb-2.5"
            >
              {WA_SVG(18)}
              Abrir WhatsApp y contar mi caso
            </button>
            <button
              onClick={scrollToContact}
              className="block w-full text-center text-xs text-zinc-600 hover:text-zinc-400 py-2 transition-colors"
            >
              Prefiero escribir por email
            </button>
          </div>
        </div>
      )}

      {/* ── NAV ──────────────────────────────────────────────────── */}
      <nav className="sticky top-0 z-40 bg-zinc-950/95 border-b border-zinc-800/60">
        <div className="max-w-xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="relative w-4 h-4">
              <div className="absolute inset-0 rounded-full border border-red-600/50" />
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-1 h-1 rounded-full bg-red-500 blink" />
              </div>
            </div>
            <span className="text-xs font-bold tracking-widest uppercase text-zinc-100" style={{ fontFamily: "'Syne', sans-serif" }}>
              LexFiscalIA
            </span>
          </div>
          <button
            onClick={openFunnel}
            className="text-xs border border-zinc-700 text-zinc-400 px-3 py-1.5 rounded hover:border-emerald-600/50 hover:text-emerald-400 transition-colors"
          >
            Consulta gratis →
          </button>
        </div>
      </nav>

      {/* ── HERO ─────────────────────────────────────────────────── */}
      <section className="max-w-xl mx-auto px-4 pt-12 pb-10">
        <p className="text-[10px] text-zinc-600 uppercase tracking-[0.2em] mb-5">
          Asesoría Fiscal · Inteligencia Regulatoria
        </p>
        <h1 className="text-[1.9rem] font-extrabold leading-tight text-zinc-100 mb-4" style={{ fontFamily: "'Syne', sans-serif" }}>
          Probablemente estás pagando
          <br />
          <span className="text-red-400">más impuestos de los que debes.</span>
        </h1>
        <p className="text-sm text-zinc-400 leading-relaxed mb-8">
          No por mala suerte. Por falta de asesoramiento real y criterio claro.
          Lo primero que hacemos es revisar tu situación sin rodeos,
          y decirte exactamente dónde hay margen de mejora.
        </p>

        <button
          onClick={openFunnel}
          className="w-full py-3.5 rounded bg-red-600 hover:bg-red-500 text-white text-xs uppercase tracking-widest font-bold transition-colors mb-2.5"
          style={{ fontFamily: "'Syne', sans-serif" }}
        >
          Analizar mi situación →
        </button>
        <Link
          href="/radar"
          className="block w-full text-center py-3 rounded border border-zinc-800 text-zinc-500 text-xs hover:border-zinc-600 hover:text-zinc-300 transition-colors mb-6"
        >
          Ver el Radar BOE en vivo
        </Link>

        <p className="text-[10px] text-zinc-600 text-center">
          Sin compromiso · Respondo personalmente en menos de 24h · Confidencial
        </p>
      </section>

      {/* ── CONFIANZA ────────────────────────────────────────────── */}
      <section className="border-t border-zinc-800/50 max-w-xl mx-auto px-4 py-6">
        <div className="grid grid-cols-2 gap-2">
          {[
            ["✓ Sin cuotas ocultas", "Lo que acordamos es lo que pagas."],
            ["✓ Respondo yo, no un bot", "Sin departamentos. Sin esperas."],
            ["✓ Primera consulta gratis", "Revisamos tu caso antes de comprometerte."],
            ["✓ Confidencialidad total", "Tu información no sale de aquí."],
          ].map(([title, sub]) => (
            <div key={title} className="border border-zinc-800/60 rounded p-3">
              <p className="text-[11px] text-zinc-300 font-medium mb-0.5">{title}</p>
              <p className="text-[10px] text-zinc-600 leading-tight">{sub}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── AUTORIDAD ────────────────────────────────────────────── */}
      <section className="border-t border-zinc-800/50 max-w-xl mx-auto px-4 py-8">
        <p className="text-[10px] text-zinc-700 uppercase tracking-[0.2em] mb-5">Sobre mí</p>
        <div className="flex items-start gap-4 mb-5">
          <div className="w-16 h-16 rounded-full bg-zinc-800 border border-zinc-700/60 flex-shrink-0 overflow-hidden">
            {/* Coloca tu foto en /public/foto.jpg */}
            <img src="/foto.jpg" alt="Sonia, asesora fiscal" className="w-full h-full object-cover" />
          </div>
          <div>
            <p className="text-sm font-bold text-zinc-100 mb-0.5" style={{ fontFamily: "'Syne', sans-serif" }}>
              Sonia {/* ← añade apellido */}
            </p>
            <p className="text-[10px] text-zinc-500 mb-3">
              Asesora fiscal · Especialista en IRPF, autónomos y pequeñas empresas
            </p>
            <p className="text-xs text-zinc-400 leading-relaxed">
              Más de 10 años asesorando a profesionales que no quieren sorpresas
              en la declaración. Trabajo de forma directa: sin intermediarios,
              sin respuestas automáticas, sin perder el tiempo de nadie.
              Si puedo ayudarte, te lo digo. Si no puedo, también.
            </p>
          </div>
        </div>
        <div className="grid grid-cols-3 gap-2">
          {[
            ["+10 años", "Asesoría fiscal"],
            ["BOE diario", "Monitorizado"],
            ["<24h", "Respuesta real"],
          ].map(([n, l], i) => (
            <div key={i} className="border border-zinc-800/60 rounded p-3 text-center">
              <p className="text-sm font-bold text-zinc-200" style={{ fontFamily: "'Syne', sans-serif" }}>{n}</p>
              <p className="text-[10px] text-zinc-600 mt-0.5 leading-tight">{l}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── BENEFICIOS ───────────────────────────────────────────── */}
      <section className="border-t border-zinc-800/50 max-w-xl mx-auto px-4 py-8">
        <p className="text-[10px] text-zinc-700 uppercase tracking-[0.2em] mb-5">Qué obtienes</p>
        <div className="space-y-2.5">
          {[
            {
              n: "01",
              title: "Tu situación fiscal, revisada de verdad",
              body: "Analizo tus ingresos, tus gastos reales y tu estructura para decirte exactamente qué estás dejando de deducir. Sin generalidades.",
            },
            {
              n: "02",
              title: "El BOE filtrado por lo que te afecta",
              body: "Monitorizo el Boletín Oficial cada día y clasifico por impacto real. Solo te aviso si algo cambia lo que te afecta directamente.",
            },
            {
              n: "03",
              title: "Acceso directo a mí, sin burocracia",
              body: "Me escribes, te respondo yo. Sin formularios de soporte, sin colas, sin respuestas automáticas. Un punto de contacto, siempre.",
            },
          ].map((item) => (
            <div key={item.n} className="border border-zinc-800 rounded bg-zinc-900/30 p-4 flex gap-3">
              <span className="text-zinc-700 text-xs flex-shrink-0 pt-px" style={{ fontFamily: "'Syne', sans-serif" }}>{item.n}</span>
              <div>
                <p className="text-xs font-bold text-zinc-200 mb-1.5" style={{ fontFamily: "'Syne', sans-serif" }}>{item.title}</p>
                <p className="text-xs text-zinc-500 leading-relaxed">{item.body}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── CTA RADAR ────────────────────────────────────────────── */}
      <section className="border-t border-zinc-800/50 max-w-xl mx-auto px-4 py-8">
        <div className="border border-red-500/15 rounded bg-red-500/5 p-5">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-1.5 h-1.5 rounded-full bg-red-500 blink" />
            <p className="text-[10px] text-red-500 uppercase tracking-widest">Monitor en vivo</p>
          </div>
          <p className="text-sm font-bold text-zinc-100 mb-1.5" style={{ fontFamily: "'Syne', sans-serif" }}>
            El BOE de hoy, ya clasificado.
          </p>
          <p className="text-xs text-zinc-500 mb-4 leading-relaxed">
            Comprueba qué disposiciones requieren acción inmediata hoy,
            cuáles revisar y cuáles ignorar sin riesgo.
          </p>
          <Link
            href="/radar"
            className="block w-full text-center py-3 rounded border border-red-500/25 text-red-400 text-xs uppercase tracking-widest hover:bg-red-500/8 transition-colors"
          >
            Abrir Radar BOE →
          </Link>
        </div>
      </section>

      {/* ── CONTACTO ─────────────────────────────────────────────── */}
      <section id="contacto" className="border-t border-zinc-800/50 max-w-xl mx-auto px-4 py-8">
        <p className="text-[10px] text-zinc-700 uppercase tracking-[0.2em] mb-2">Hablamos</p>
        <p className="text-lg font-bold text-zinc-100 mb-1.5" style={{ fontFamily: "'Syne', sans-serif" }}>
          ¿Tienes dudas sobre tu fiscalidad?
        </p>
        <p className="text-xs text-zinc-500 mb-6 leading-relaxed">
          Cuéntame tu situación. En menos de 24h te digo
          si puedo ayudarte, cómo y qué pasos dar.
          Sin rodeos, sin venderte lo que no necesitas.
        </p>
        <button
          onClick={openFunnel}
          className="flex items-center justify-center gap-2.5 w-full py-3.5 rounded bg-emerald-700 hover:bg-emerald-600 text-white text-sm font-medium transition-colors mb-2.5"
        >
          {WA_SVG(18)}
          Escribir por WhatsApp
        </button>
        <a
          href={`mailto:${EMAIL}`}
          className="block w-full text-center py-2.5 rounded border border-zinc-800 text-zinc-500 text-xs hover:border-zinc-600 hover:text-zinc-300 transition-colors mb-5"
        >
          Enviar email
        </a>
        <p className="text-[10px] text-zinc-700 text-center leading-relaxed">
          Sin bots · Sin automatizaciones · Respondo yo · Confidencial
        </p>
      </section>

      {/* ── CIERRE ───────────────────────────────────────────────── */}
      <section className="border-t border-zinc-800/50 max-w-xl mx-auto px-4 py-10">
        <p className="text-xs text-zinc-600 leading-relaxed mb-5">
          No esperes a descubrir en la próxima declaración
          lo que podrías haber ahorrado este año.
        </p>
        <button
          onClick={openFunnel}
          className="inline-flex items-center gap-2 text-xs text-red-400 hover:text-red-300 transition-colors border-b border-red-500/20 hover:border-red-400/40 pb-0.5"
          style={{ fontFamily: "'Syne', sans-serif" }}
        >
          Empezar ahora →
        </button>
      </section>

      {/* ── FOOTER ───────────────────────────────────────────────── */}
      <footer className="border-t border-zinc-900 max-w-xl mx-auto px-4 py-5">
        <div className="flex items-center justify-between">
          <span className="text-[10px] text-zinc-800 uppercase tracking-widest" style={{ fontFamily: "'Syne', sans-serif" }}>
            LexFiscalIA
          </span>
          <span className="text-[10px] text-zinc-800">© 2025</span>
        </div>
      </footer>

    </div>
  );
}
