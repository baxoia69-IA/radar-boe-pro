import Link from "next/link";

// ─── CONFIGURA AQUÍ ──────────────────────────────────────────────
const WA = "34600000000"; // ← reemplaza con tu número sin +
const MSG = encodeURIComponent(
  "Hola, quiero más información sobre LexFiscalIA y el Radar BOE."
);
// ─────────────────────────────────────────────────────────────────

const WA_SVG = (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
  </svg>
);

export default function LandingPage() {
  return (
    <div
      className="bg-zinc-950 text-zinc-100 min-h-screen"
      style={{ fontFamily: "'DM Mono', monospace" }}
    >
      {/* ── WHATSAPP FLOTANTE ─────────────────────────────────── */}
      <a
        href={`https://wa.me/${WA}?text=${MSG}`}
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Contactar por WhatsApp"
        className="fixed bottom-5 right-4 z-50 w-12 h-12 rounded-full bg-emerald-600 flex items-center justify-center shadow-xl wa-pulse hover:scale-105 transition-transform text-white"
      >
        {WA_SVG}
      </a>

      {/* ── NAV ──────────────────────────────────────────────── */}
      <nav className="sticky top-0 z-40 bg-zinc-950/95 border-b border-zinc-800/60">
        <div className="max-w-xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="relative w-4 h-4">
              <div className="absolute inset-0 rounded-full border border-red-600/50" />
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-1 h-1 rounded-full bg-red-500 blink" />
              </div>
            </div>
            <span
              className="text-xs font-bold tracking-widest uppercase text-zinc-100"
              style={{ fontFamily: "'Syne', sans-serif" }}
            >
              LexFiscalIA
            </span>
          </div>
          <Link
            href="/radar"
            className="text-xs border border-zinc-700 text-zinc-400 px-3 py-1.5 rounded hover:border-zinc-500 hover:text-zinc-200 transition-colors"
          >
            Abrir Radar →
          </Link>
        </div>
      </nav>

      {/* ── HERO ─────────────────────────────────────────────── */}
      <section className="max-w-xl mx-auto px-4 pt-12 pb-10">
        <p className="text-[10px] text-zinc-600 uppercase tracking-[0.2em] mb-5">
          Asesoría Fiscal · Inteligencia Regulatoria
        </p>
        <h1
          className="text-[1.85rem] font-extrabold leading-tight text-zinc-100 mb-4"
          style={{ fontFamily: "'Syne', sans-serif" }}
        >
          El BOE cambia cada día.
          <br />
          <span className="text-red-400">Tú decides en segundos.</span>
        </h1>
        <p className="text-sm text-zinc-400 leading-relaxed mb-8 max-w-sm">
          Motor de inteligencia regulatoria para asesores fiscales, abogados y
          compliance officers. Sin ruido. Sin alertas genéricas. Solo lo que
          exige acción real.
        </p>
        <div className="flex flex-col sm:flex-row gap-2.5 mb-10">
          <Link
            href="/radar"
            className="flex-1 text-center py-3 rounded bg-red-600 hover:bg-red-500 text-white text-xs uppercase tracking-widest font-bold transition-colors"
            style={{ fontFamily: "'Syne', sans-serif" }}
          >
            Ver Radar en vivo →
          </Link>
          <a
            href={`https://wa.me/${WA}?text=${MSG}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex-1 text-center py-3 rounded border border-zinc-700 text-zinc-400 text-xs hover:border-zinc-500 hover:text-zinc-200 transition-colors"
          >
            Consulta sin compromiso
          </a>
        </div>

        {/* microcopy de confianza */}
        <div className="flex flex-wrap gap-x-5 gap-y-2 text-[10px] text-zinc-600 border-t border-zinc-800/50 pt-6">
          <span>✓ Sin cuotas ocultas</span>
          <span>✓ Respondo yo, no un bot</span>
          <span>✓ Primera consulta gratis</span>
          <span>✓ Confidencialidad total</span>
        </div>
      </section>

      {/* ── PROPUESTA DE VALOR ───────────────────────────────── */}
      <section className="border-t border-zinc-800/50 max-w-xl mx-auto px-4 py-8">
        <p className="text-[10px] text-zinc-700 uppercase tracking-[0.2em] mb-5">
          Qué resuelvo
        </p>
        <div className="space-y-2.5">
          {[
            {
              label: "01",
              title: "Monitorización automática del BOE",
              body: "Cada disposición analizada y clasificada por nivel de alerta: crítica, alta, media o baja. Sin resúmenes de terceros, sin retrasos.",
            },
            {
              label: "02",
              title: "Alertas accionables, no notificaciones",
              body: "Cada alerta lleva una acción concreta: ACTUAR, REVISAR, SEGUIR o IGNORAR. El tiempo que antes perdías leyendo, lo dedicas a decidir.",
            },
            {
              label: "03",
              title: "Asesoría fiscal personalizada",
              body: "Más de 10 años en normativa tributaria. Si algo te afecta directamente, te lo explico sin tecnicismos innecesarios.",
            },
          ].map((item) => (
            <div
              key={item.label}
              className="border border-zinc-800 rounded bg-zinc-900/30 p-4 flex gap-3"
            >
              <span
                className="text-zinc-700 text-xs flex-shrink-0 pt-px"
                style={{ fontFamily: "'Syne', sans-serif" }}
              >
                {item.label}
              </span>
              <div>
                <p
                  className="text-xs font-bold text-zinc-200 mb-1.5"
                  style={{ fontFamily: "'Syne', sans-serif" }}
                >
                  {item.title}
                </p>
                <p className="text-xs text-zinc-500 leading-relaxed">
                  {item.body}
                </p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── SOBRE MÍ ─────────────────────────────────────────── */}
      <section className="border-t border-zinc-800/50 max-w-xl mx-auto px-4 py-8">
        <p className="text-[10px] text-zinc-700 uppercase tracking-[0.2em] mb-5">
          Sobre mí
        </p>
        <div className="flex items-start gap-4 mb-5">
          <div className="w-14 h-14 rounded-full bg-zinc-800 border border-zinc-700/60 flex-shrink-0 overflow-hidden">
            {/* Coloca tu foto en /public/foto.jpg */}
            <img
              src="/foto.jpg"
              alt="Foto del asesor"
              className="w-full h-full object-cover"
            />
          </div>
          <div>
            <p
              className="text-sm font-bold text-zinc-100 mb-0.5"
              style={{ fontFamily: "'Syne', sans-serif" }}
            >
              [Tu nombre] {/* ← actualiza */}
            </p>
            <p className="text-[10px] text-zinc-600 mb-3">
              Asesor fiscal · Especialista en cumplimiento normativo
            </p>
            <p className="text-xs text-zinc-400 leading-relaxed">
              He construido RADAR BOE PRO porque ningún resumen llegaba a tiempo
              y ninguna herramienta clasificaba lo que realmente importa.
              Lectura directa del BOE. Algoritmo propio. Sin intermediarios.
            </p>
          </div>
        </div>
        <div className="grid grid-cols-3 gap-2">
          {[
            ["BOE", "Analizado cada día"],
            ["+10 años", "Experiencia fiscal"],
            ["<24h", "Tiempo de respuesta"],
          ].map(([n, l], i) => (
            <div
              key={i}
              className="border border-zinc-800/60 rounded p-3 text-center"
            >
              <p
                className="text-sm font-bold text-zinc-200"
                style={{ fontFamily: "'Syne', sans-serif" }}
              >
                {n}
              </p>
              <p className="text-[10px] text-zinc-600 mt-0.5 leading-tight">
                {l}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* ── CTA → /radar ─────────────────────────────────────── */}
      <section className="border-t border-zinc-800/50 max-w-xl mx-auto px-4 py-8">
        <div className="border border-red-500/20 rounded bg-red-500/5 p-5">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-1.5 h-1.5 rounded-full bg-red-500 blink" />
            <p className="text-[10px] text-red-500 uppercase tracking-widest">
              Monitor en vivo
            </p>
          </div>
          <p
            className="text-sm font-bold text-zinc-100 mb-1.5"
            style={{ fontFamily: "'Syne', sans-serif" }}
          >
            El BOE de hoy, ya clasificado.
          </p>
          <p className="text-xs text-zinc-500 mb-4 leading-relaxed">
            Accede al radar y comprueba en tiempo real qué disposiciones
            requieren acción inmediata, cuáles revisar y cuáles ignorar.
          </p>
          <Link
            href="/radar"
            className="block w-full text-center py-3 rounded border border-red-500/30 text-red-400 text-xs uppercase tracking-widest hover:bg-red-500/10 transition-colors"
          >
            Abrir Radar BOE →
          </Link>
        </div>
      </section>

      {/* ── CONTACTO ─────────────────────────────────────────── */}
      <section className="border-t border-zinc-800/50 max-w-xl mx-auto px-4 py-8">
        <p className="text-[10px] text-zinc-700 uppercase tracking-[0.2em] mb-2">
          Contacto
        </p>
        <p
          className="text-lg font-bold text-zinc-100 mb-1"
          style={{ fontFamily: "'Syne', sans-serif" }}
        >
          Cuéntame tu situación.
        </p>
        <p className="text-xs text-zinc-500 mb-6 leading-relaxed">
          Primera consulta sin compromiso. Sin formularios. Sin esperas.
          Te respondo personalmente en menos de 24h.
        </p>
        <a
          href={`https://wa.me/${WA}?text=${MSG}`}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-center gap-2.5 w-full py-3.5 rounded bg-emerald-700 hover:bg-emerald-600 text-white text-sm font-medium transition-colors mb-2.5"
        >
          {WA_SVG}
          Escribir por WhatsApp
        </a>
        <a
          href="mailto:info@lexfiscalia.es"
          className="block w-full text-center py-2.5 rounded border border-zinc-800 text-zinc-500 text-xs hover:border-zinc-600 hover:text-zinc-300 transition-colors mb-4"
        >
          Enviar email
        </a>
        <p className="text-[10px] text-zinc-700 text-center">
          Sin bots · Sin automatizaciones · Respondo yo
        </p>
      </section>

      {/* ── FOOTER ───────────────────────────────────────────── */}
      <footer className="border-t border-zinc-900 max-w-xl mx-auto px-4 py-5">
        <div className="flex items-center justify-between">
          <span
            className="text-[10px] text-zinc-800 uppercase tracking-widest"
            style={{ fontFamily: "'Syne', sans-serif" }}
          >
            LexFiscalIA
          </span>
          <span className="text-[10px] text-zinc-800">© 2025</span>
        </div>
      </footer>
    </div>
  );
}
