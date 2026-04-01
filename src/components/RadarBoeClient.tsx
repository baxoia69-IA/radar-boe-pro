"use client";
import { useState, useEffect } from "react";
import { BoeDaySnapshot, DisposicionViewModel, AlertLevel, Accion } from "@/types";

const ALERT_CFG: Record<AlertLevel, { bg: string; border: string; text: string; dot: string }> = {
  CRÍTICA: { bg: "bg-red-500/10", border: "border-red-500/30", text: "text-red-400", dot: "bg-red-400" },
  ALTA: { bg: "bg-amber-500/10", border: "border-amber-500/30", text: "text-amber-400", dot: "bg-amber-400" },
  MEDIA: { bg: "bg-blue-500/10", border: "border-blue-500/30", text: "text-blue-400", dot: "bg-blue-400" },
  BAJA: { bg: "bg-zinc-900/30", border: "border-zinc-800", text: "text-zinc-600", dot: "bg-zinc-700" },
};
const ACCION_CFG: Record<Accion, { bg: string; text: string }> = {
  ACTUAR: { bg: "bg-red-500", text: "text-white" },
  REVISAR: { bg: "bg-amber-500", text: "text-black" },
  SEGUIR: { bg: "bg-blue-600", text: "text-white" },
  IGNORAR: { bg: "bg-zinc-800", text: "text-zinc-500" },
};

export default function RadarBoeClient({ snapshot }: { snapshot: BoeDaySnapshot }) {
  const [activeTab, setActiveTab] = useState<"radar"|"feed"|"cambios">("radar");
  const [expandedId, setExpandedId] = useState<string|null>(null);
  const [filterAlert, setFilterAlert] = useState("ALL");
  const [loaded, setLoaded] = useState(false);
  useEffect(() => { const t = setTimeout(() => setLoaded(true), 80); return () => clearTimeout(t); }, []);

  const feedDisp = snapshot.disposiciones.filter(d => filterAlert === "ALL" ? true : d.alertLevel === filterAlert);
  const cambiosDisp = snapshot.disposiciones.filter(d => d.cambioDetectado);
  const isEmpty = snapshot.totalDisposiciones === 0;

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100" style={{ fontFamily: "'DM Mono', monospace" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Mono:wght@300;400;500&family=Syne:wght@600;700;800&display=swap');
        .syne { font-family: 'Syne', sans-serif; }
        .fade-in { opacity:0; transform:translateY(12px); transition: opacity .45s ease, transform .45s ease; }
        .fade-in.show { opacity:1; transform:translateY(0); }
        .pulse { animation: blink 2s ease-in-out infinite; }
        @keyframes blink { 0%,100%{opacity:1} 50%{opacity:.3} }
        .bar { width:0; transition: width 1.1s cubic-bezier(.4,0,.2,1); }
        .bar.show { width: var(--w); }
        .ring { stroke-dasharray:163; stroke-dashoffset:163; transition: stroke-dashoffset 1.3s cubic-bezier(.4,0,.2,1); }
        .ring.show { stroke-dashoffset: var(--off); }
      `}</style>
      <header className="sticky top-0 z-50 bg-zinc-950/95 border-b border-zinc-800/60">
        <div className="max-w-xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="relative w-5 h-5">
              <div className="absolute inset-0 rounded-full border border-red-600/60" />
              <div className="absolute inset-1 rounded-full border border-red-600/30" />
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-1 h-1 rounded-full bg-red-500 pulse" />
              </div>
            </div>
            <span className="syne text-xs font-bold tracking-widest text-zinc-100 uppercase">Radar BOE</span>
            <span className="text-xs border border-zinc-700 text-zinc-600 px-1.5 py-px rounded syne font-bold">PRO</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-zinc-600">{snapshot.fechaLabel}</span>
            <div className={`w-1.5 h-1.5 rounded-full ${isEmpty ? "bg-zinc-700" : "bg-emerald-400"}`} />
          </div>
        </div>
        <nav className="max-w-xl mx-auto px-4 flex gap-5 border-t border-zinc-900">
          {(["radar","feed","cambios"] as const).map(tab => (
            <button key={tab} onClick={() => setActiveTab(tab)}
              className={`py-2.5 text-xs uppercase tracking-widest relative transition-colors ${activeTab===tab?"text-zinc-100":"text-zinc-600"}`}>
              {tab==="radar"?"Radar":tab==="feed"?"Feed":"Cambios"}
              {tab==="cambios"&&cambiosDisp.length>0&&<span className="ml-1 text-xs text-amber-400">{cambiosDisp.length}</span>}
              {activeTab===tab&&<span className="absolute bottom-0 left-0 right-0 h-px bg-red-500" />}
            </button>
          ))}
        </nav>
      </header>
      <main className="max-w-xl mx-auto px-4 pb-16">
        {isEmpty&&<div className="mt-16 text-center text-zinc-700 text-xs uppercase tracking-widest">Sin BOE disponible hoy</div>}
        {!isEmpty&&activeTab==="radar"&&(
          <section>
            <div className={`fade-in ${loaded?"show":""} mt-4 grid grid-cols-4 gap-1.5`}>
              {[{label:"Total",val:snapshot.totalDisposiciones,color:"text-zinc-100"},{label:"Críticas",val:snapshot.criticas,color:"text-red-400"},{label:"Cambios",val:snapshot.cambiosDetectados,color:"text-amber-400"},{label:"FCS+FP",val:snapshot.impactoFCS+snapshot.impactoFP,color:"text-blue-400"}].map((item,i)=>(
                <div key={i} className="border border-zinc-800 rounded bg-zinc-900/40 p-2.5">
                  <div className={`text-xl syne font-bold ${item.color}`}>{item.val}</div>
                  <div className="text-zinc-700 text-xs mt-0.5">{item.label}</div>
                </div>
              ))}
            </div>
            <div className={`fade-in ${loaded?"show":""} mt-2 grid grid-cols-2 gap-2`} style={{transitionDelay:"60ms"}}>
              <div className="border border-zinc-800 rounded bg-zinc-900/40 p-3.5 flex items-center gap-3">
                <svg width="52" height="52" viewBox="0 0 52 52">
                  <circle cx="26" cy="26" r="22" fill="none" stroke="#27272a" strokeWidth="2.5"/>
                  <circle cx="26" cy="26" r="22" fill="none" stroke="#f87171" strokeWidth="2.5" strokeLinecap="round" transform="rotate(-90 26 26)"
                    className={`ring ${loaded?"show":""}`} style={{"--off":`${163*(1-snapshot.scoreGlobal/100)}`} as React.CSSProperties}/>
                  <text x="26" y="31" textAnchor="middle" fill="#f4f4f5" style={{fontFamily:"Syne,sans-serif",fontWeight:700,fontSize:13}}>{snapshot.scoreGlobal}</text>
                </svg>
                <div>
                  <div className="text-zinc-600 text-xs uppercase tracking-widest">Score</div>
                  <div className="text-zinc-300 text-sm syne mt-0.5">{snapshot.scoreGlobal>=70?"Alto":snapshot.scoreGlobal>=45?"Medio":"Bajo"}</div>
                  <div className="text-zinc-700 text-xs mt-1">{snapshot.ministerioActivo} activo</div>
                </div>
              </div>
              <div className="border border-zinc-800 rounded bg-zinc-900/40 p-3.5">
                <div className="text-zinc-600 text-xs uppercase tracking-widest mb-2">Áreas</div>
                {snapshot.topAreas.slice(0,3).map((area,i)=>(
                  <div key={i} className="mb-1.5">
                    <div className="flex justify-between text-xs mb-0.5">
                      <span className="text-zinc-500 truncate">{area.nombre}</span>
                      <span className="text-zinc-700 ml-1">{area.pct}%</span>
                    </div>
                    <div className="h-px bg-zinc-800 overflow-hidden">
                      <div className={`h-full bg-zinc-500 bar ${loaded?"show":""}`} style={{"--w":`${area.pct}%`,transitionDelay:`${i*120+250}ms`} as React.CSSProperties}/>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className={`fade-in ${loaded?"show":""} mt-2 grid grid-cols-2 gap-2`} style={{transitionDelay:"120ms"}}>
              <div className="border border-red-500/20 rounded bg-red-500/5 p-3 flex items-center gap-2.5">
                <div className="w-7 h-7 border border-red-500/30 rounded flex items-center justify-center text-red-500 text-xs">⬡</div>
                <div>
                  <div className="text-xs text-red-500 uppercase tracking-widest">FCS</div>
                  <div className="syne font-bold text-red-300 text-lg leading-none mt-0.5">{snapshot.impactoFCS}<span className="text-xs text-red-600 ml-1">imp.</span></div>
                </div>
              </div>
              <div className="border border-blue-500/20 rounded bg-blue-500/5 p-3 flex items-center gap-2.5">
                <div className="w-7 h-7 border border-blue-500/30 rounded flex items-center justify-center text-blue-500 text-xs">◈</div>
                <div>
                  <div className="text-xs text-blue-500 uppercase tracking-widest">F. Pública</div>
                  <div className="syne font-bold text-blue-300 text-lg leading-none mt-0.5">{snapshot.impactoFP}<span className="text-xs text-blue-600 ml-1">imp.</span></div>
                </div>
              </div>
            </div>
            {snapshot.resumenEjecutivo.length>0&&(
              <div className={`fade-in ${loaded?"show":""} mt-2`} style={{transitionDelay:"180ms"}}>
                <div className="text-xs text-zinc-700 uppercase tracking-widest mb-1.5">Resumen ejecutivo</div>
                <div className="border border-zinc-800 rounded bg-zinc-900/30 divide-y divide-zinc-800/50">
                  {snapshot.resumenEjecutivo.map((item,i)=>(
                    <div key={i} className="p-3 flex items-start gap-2.5">
                      <span className={`text-xs px-1.5 py-0.5 rounded flex-shrink-0 mt-px ${ACCION_CFG[item.accion].bg} ${ACCION_CFG[item.accion].text}`}>{item.accion}</span>
                      <span className="text-xs text-zinc-400 leading-relaxed">{item.texto}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </section>
        )}
        {!isEmpty&&activeTab==="feed"&&(
          <section className="mt-4">
            <div className="flex gap-1.5 mb-3 overflow-x-auto pb-1">
              {["ALL","CRÍTICA","ALTA","MEDIA","BAJA"].map(f=>(
                <button key={f} onClick={()=>setFilterAlert(f)}
                  className={`px-2.5 py-1.5 rounded text-xs uppercase tracking-widest flex-shrink-0 border transition-colors ${filterAlert===f?"border-zinc-500 bg-zinc-800 text-zinc-100":"border-zinc-800 text-zinc-600"}`}>
                  {f==="ALL"?"Todas":f}
                </button>
              ))}
            </div>
            <div className="space-y-2">
              {feedDisp.map(d=>{
                const cfg=ALERT_CFG[d.alertLevel];
                const expanded=expandedId===d.id;
                return(
                  <div key={d.id} onClick={()=>setExpandedId(expanded?null:d.id)}
                    className={`border rounded p-3.5 cursor-pointer ${cfg.border} ${cfg.bg}`}>
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-1.5 mb-1.5">
                          <span className={`text-xs px-1.5 py-0.5 rounded ${ACCION_CFG[d.accion].bg} ${ACCION_CFG[d.accion].text}`}>{d.accion}</span>
                          <span className="text-xs text-zinc-700 border border-zinc-800 px-1.5 py-0.5 rounded">{d.tipo}</span>
                          {d.cambioDetectado&&<span className="text-xs text-amber-500 border border-amber-500/20 px-1.5 py-0.5 rounded bg-amber-500/5">↳ {d.changeLevel}</span>}
                        </div>
                        <p className="text-sm text-zinc-300 leading-snug">{d.titulo}</p>
                      </div>
                      <div className="flex-shrink-0 text-right">
                        <div className={`text-lg syne font-bold ${cfg.text}`}>{d.score}</div>
                        <div className="flex items-center justify-end gap-1 mt-0.5">
                          <div className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`}/>
                          <span className={`text-xs ${cfg.text}`}>{d.alertLevel}</span>
                        </div>
                      </div>
                    </div>
                    {d.tags.length>0&&<div className="flex flex-wrap gap-1.5 mt-2">{d.tags.map(t=><span key={t} className="text-xs text-zinc-700">#{t}</span>)}</div>}
                    {expanded&&(
                      <div className="mt-3 pt-3 border-t border-zinc-800/40">
                        <p className="text-xs text-zinc-400 leading-relaxed mb-3">{d.porQueImporta}</p>
                        <div className="flex flex-wrap gap-1.5 mb-2">{d.areas.map(a=><span key={a} className="text-xs border border-zinc-800 text-zinc-500 px-1.5 py-0.5 rounded">{a}</span>)}</div>
                        <div className="flex items-center justify-between mt-2">
                          <span className="text-xs text-zinc-700">{d.ministerioCorto}</span>
                          <a href={d.url_htm} target="_blank" rel="noopener noreferrer" onClick={e=>e.stopPropagation()} className="text-xs text-zinc-600 border border-zinc-800 px-2 py-0.5 rounded">Ver BOE ↗</a>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </section>
        )}
        {!isEmpty&&activeTab==="cambios"&&(
          <section className="mt-4">
            <div className="text-xs text-zinc-700 uppercase tracking-widest mb-3">{cambiosDisp.length} cambios detectados</div>
            <div className="space-y-2">
              {cambiosDisp.map(d=>{
                const cfg=ALERT_CFG[d.alertLevel];
                return(
                  <div key={d.id} className={`border rounded p-3.5 ${cfg.border} ${cfg.bg}`}>
                    <div className="flex gap-2.5">
                      <div className={`w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0 ${cfg.dot}`}/>
                      <div className="flex-1">
                        <div className="flex flex-wrap items-center gap-1.5 mb-1">
                          <span className={`text-xs border ${cfg.border} ${cfg.text} px-1.5 py-0.5 rounded`}>{d.changeLevel}</span>
                          <span className="text-xs text-zinc-700">{d.tipo} · {d.ministerioCorto}</span>
                        </div>
                        <p className="text-sm text-zinc-300 leading-snug mb-2">{d.titulo}</p>
                        <div className="border-l border-zinc-700 pl-2.5">
                          <p className="text-xs text-zinc-500 leading-relaxed">{d.porQueImporta}</p>
                        </div>
                        <div className="flex items-center gap-2.5 mt-2">
                          <span className={`text-xs px-1.5 py-0.5 rounded ${ACCION_CFG[d.accion].bg} ${ACCION_CFG[d.accion].text}`}>{d.accion}</span>
                          <span className={`text-xs ${cfg.text}`}>{d.score} pts</span>
                          <a href={d.url_htm} target="_blank" rel="noopener noreferrer" className="text-xs text-zinc-700 ml-auto">Ver ↗</a>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        )}
      </main>
    </div>
  );
}
