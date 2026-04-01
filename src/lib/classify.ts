import { DisposicionRaw, DisposicionClassified, PolicyArea, Audiencia, AlertLevel, Accion, ChangeLevel } from "@/types";

function normalize(text: string): string {
  return text.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9\s]/g, " ");
}
function contains(text: string, keywords: string[]): boolean {
  const n = normalize(text);
  return keywords.some((kw) => n.includes(normalize(kw)));
}
const TIPO_PATTERNS: [string, RegExp][] = [
  ["RDL", /real decreto.?ley|rdl/i], ["LO", /ley organica/i],
  ["Ley", /^ley\s/i], ["RD", /real decreto(?!.?ley)/i],
  ["Orden", /orden\s+(ministerial|del\s+ministerio)/i],
  ["Resolución", /resoluci[oó]n/i], ["Corrección", /correcci[oó]n\s+de\s+errores?/i],
  ["Anuncio", /anuncio\s+de/i],
];
function extractTipo(titulo: string, epigrafe: string): string {
  const text = `${epigrafe} ${titulo}`;
  for (const [tipo, pattern] of TIPO_PATTERNS) { if (pattern.test(text)) return tipo; }
  return "Disposición";
}
const RUIDO_KEYWORDS = ["cese", "nombramiento", "nombra", "se nombra", "se cesa", "corrección de errores", "fe de erratas", "anuncio de licitación", "anuncio de notificación"];
function detectaRuido(titulo: string, epigrafe: string, tipo: string): boolean {
  if (["Corrección", "Anuncio"].includes(tipo)) return true;
  return contains(`${titulo} ${epigrafe}`, RUIDO_KEYWORDS);
}
const AREA_RULES: { area: PolicyArea; keywords: string[] }[] = [
  { area: "Seguridad Pública", keywords: ["policia", "guardia civil", "fuerzas y cuerpos de seguridad", "seguridad ciudadana", "seguridad publica"] },
  { area: "Función Pública", keywords: ["funcion publica", "funcionario", "cuerpo superior", "segunda actividad", "situaciones administrativas"] },
  { area: "Empleo Público", keywords: ["empleo publico", "oposicion", "concurso de meritos", "oferta de empleo", "proceso selectivo"] },
  { area: "Laboral", keywords: ["convenio colectivo", "salario minimo", "jornada laboral", "seguridad social", "retribuciones"] },
  { area: "Fiscal", keywords: ["impuesto", "irpf", "iva", "hacienda", "tributar"] },
  { area: "Sanidad", keywords: ["sanidad", "sanitario", "salud", "farmaco", "medicamento"] },
  { area: "Vivienda", keywords: ["vivienda", "alquiler", "arrendamiento", "hipoteca"] },
  { area: "Educación", keywords: ["educacion", "docente", "profesorado", "universidad", "formacion profesional"] },
  { area: "Justicia", keywords: ["justicia", "judicial", "tribunal", "juzgado", "penal"] },
  { area: "Administración Pública", keywords: ["procedimiento administrativo", "administracion publica", "silencio administrativo"] },
  { area: "Defensa", keywords: ["defensa", "fuerzas armadas", "ejercito", "militar"] },
  { area: "Autónomos", keywords: ["autonomo", "trabajador por cuenta propia", "reta"] },
  { area: "Empresas", keywords: ["empresa", "sociedad mercantil", "competencia"] },
];
function classifyAreas(titulo: string, epigrafe: string, departamento: string): PolicyArea[] {
  const text = `${titulo} ${epigrafe} ${departamento}`;
  const areas = AREA_RULES.filter(r => contains(text, r.keywords)).map(r => r.area);
  return areas.length > 0 ? areas : ["Otros"];
}
const AUDIENCIA_RULES: { audiencia: Audiencia; keywords: string[] }[] = [
  { audiencia: "Fuerzas de Seguridad", keywords: ["policia", "guardia civil", "fuerzas y cuerpos de seguridad"] },
  { audiencia: "Funcionarios", keywords: ["funcionario", "funcion publica", "oposicion", "proceso selectivo"] },
  { audiencia: "Autónomos", keywords: ["autonomo", "trabajador por cuenta propia"] },
  { audiencia: "Empresas", keywords: ["empresa", "sociedad", "empleador"] },
  { audiencia: "Ciudadanos", keywords: ["ciudadano", "persona fisica", "prestacion", "beca"] },
  { audiencia: "Administraciones Públicas", keywords: ["administracion publica", "ayuntamiento", "comunidad autonoma"] },
];
function classifyAudiencias(titulo: string, epigrafe: string): Audiencia[] {
  const text = `${titulo} ${epigrafe}`;
  const audiencias = AUDIENCIA_RULES.filter(r => contains(text, r.keywords)).map(r => r.audiencia);
  return audiencias.length > 0 ? audiencias : ["Ciudadanos"];
}
const TAG_RULES: { tag: string; keywords: string[] }[] = [
  { tag: "POLICÍA", keywords: ["policia nacional"] },
  { tag: "GUARDIA CIVIL", keywords: ["guardia civil"] },
  { tag: "FCS", keywords: ["fuerzas y cuerpos de seguridad"] },
  { tag: "OPOSICIÓN", keywords: ["oposicion", "proceso selectivo"] },
  { tag: "EMPLEO PÚBLICO", keywords: ["empleo publico", "oferta de empleo"] },
  { tag: "RETRIBUCIONES", keywords: ["retribuciones", "complemento", "plus de"] },
  { tag: "SEGUNDA ACTIVIDAD", keywords: ["segunda actividad"] },
  { tag: "AYUDAS", keywords: ["ayuda", "subvencion", "beca"] },
];
function extractTags(titulo: string, epigrafe: string): string[] {
  const text = `${titulo} ${epigrafe}`;
  return TAG_RULES.filter(r => contains(text, r.keywords)).map(r => r.tag);
}
const CHANGE_PATTERNS: { level: ChangeLevel; patterns: RegExp[] }[] = [
  { level: "DEROGACIÓN", patterns: [/deroga|queda\s+derogad/i] },
  { level: "NUEVO RÉGIMEN", patterns: [/nuevo\s+r[eé]gimen|se\s+crea\s+el/i] },
  { level: "MODIFICACIÓN MATERIAL", patterns: [/queda\s+redactado\s+como\s+sigue|se\s+modifica\s+el\s+art[íi]culo/i] },
  { level: "MODIFICACIÓN PARCIAL", patterns: [/a[ñn]ade\s+un\s+nuevo\s+apartado|se\s+incorpora/i] },
  { level: "AMPLIACIÓN DE PLAZO", patterns: [/ampl[íi]a\s+el\s+plazo|pr[oó]rroga/i] },
  { level: "NUEVA CONVOCATORIA", patterns: [/convocatoria\s+(de\s+)?(proceso|plazas|oposici[oó]n)/i] },
  { level: "NUEVA REGULACIÓN", patterns: [/se\s+regula|aprueba\s+el\s+reglamento/i] },
  { level: "NOMBRAMIENTO", patterns: [/nombra|designa|cesa|ascenso\s+de/i] },
  { level: "CORRECCIÓN", patterns: [/correcci[oó]n\s+de\s+errores/i] },
];
function detectChangeLevel(titulo: string, epigrafe: string): ChangeLevel {
  const text = `${titulo} ${epigrafe}`;
  for (const rule of CHANGE_PATTERNS) { if (rule.patterns.some(p => p.test(text))) return rule.level; }
  return "SIN CAMBIO";
}
function computeScore(tipo: string, seccion: string, changeLevel: ChangeLevel, areas: PolicyArea[], audiencias: Audiencia[], tags: string[], esRuido: boolean): number {
  if (esRuido) return 10;
  const tipoScore: Record<string, number> = { LO: 35, RDL: 33, Ley: 28, RD: 20, Orden: 14, Resolución: 10, Corrección: 2, Anuncio: 2, Disposición: 8 };
  const changeScore: Record<string, number> = { "DEROGACIÓN": 25, "NUEVO RÉGIMEN": 25, "MODIFICACIÓN MATERIAL": 20, "NUEVA REGULACIÓN": 15, "MODIFICACIÓN PARCIAL": 12, "AMPLIACIÓN DE PLAZO": 8, "NUEVA CONVOCATORIA": 10, "NOMBRAMIENTO": 0, "CORRECCIÓN": 0, "SIN CAMBIO": 0 };
  const seccionScore: Record<string, number> = { I: 15, II: 10, III: 8, IV: 5, V: 3 };
  let score = (tipoScore[tipo] || 8) + (changeScore[changeLevel] || 0) + (seccionScore[seccion] || 3);
  if (areas.includes("Seguridad Pública") || tags.includes("FCS")) score += 12;
  if (areas.includes("Función Pública") || areas.includes("Empleo Público")) score += 10;
  if (audiencias.length >= 3) score += 8;
  return Math.min(100, Math.max(0, Math.round(score)));
}
function deriveAlertLevel(score: number, tipo: string, changeLevel: ChangeLevel): AlertLevel {
  if (tipo === "LO" || tipo === "RDL") return "CRÍTICA";
  if (changeLevel === "DEROGACIÓN" || changeLevel === "NUEVO RÉGIMEN") return "CRÍTICA";
  if (score >= 75) return "CRÍTICA";
  if (score >= 55) return "ALTA";
  if (score >= 35) return "MEDIA";
  return "BAJA";
}
function deriveAccion(alertLevel: AlertLevel, esRuido: boolean): Accion {
  if (esRuido) return "IGNORAR";
  const map: Record<AlertLevel, Accion> = { CRÍTICA: "ACTUAR", ALTA: "REVISAR", MEDIA: "SEGUIR", BAJA: "IGNORAR" };
  return map[alertLevel];
}
function generatePorQueImporta(tipo: string, changeLevel: ChangeLevel, areas: PolicyArea[], tags: string[]): string {
  const parts: string[] = [];
  if (!["SIN CAMBIO", "NOMBRAMIENTO", "CORRECCIÓN"].includes(changeLevel)) parts.push(`${changeLevel} detectado.`);
  if (tags.includes("RETRIBUCIONES")) parts.push("Impacto directo en retribuciones.");
  if (tags.includes("OPOSICIÓN")) parts.push("Revisar plazos de solicitud.");
  if (tipo === "LO" || tipo === "RDL") parts.push("Norma de máximo rango con entrada en vigor inmediata.");
  if (areas.includes("Seguridad Pública")) parts.push("Impacto operativo para FCS.");
  return parts.length > 0 ? parts.join(" ") : "Disposición de seguimiento recomendado.";
}
function extractMinisterioCorto(departamento: string): string {
  const map: [string, string][] = [["interior", "Interior"], ["hacienda", "Hacienda"], ["justicia", "Justicia"], ["defensa", "Defensa"], ["educacion", "Educación"], ["sanidad", "Sanidad"], ["trabajo", "Trabajo"], ["presidencia", "Presidencia"]];
  const n = normalize(departamento);
  for (const [key, val] of map) { if (n.includes(key)) return val; }
  return departamento.split(" ").slice(0, 2).join(" ") || "Otro";
}
export function classifyDisposicion(raw: DisposicionRaw): DisposicionClassified {
  const tipo = extractTipo(raw.titulo, raw.epigrafe);
  const areas = classifyAreas(raw.titulo, raw.epigrafe, raw.departamento);
  const audiencias = classifyAudiencias(raw.titulo, raw.epigrafe);
  const tags = extractTags(raw.titulo, raw.epigrafe);
  const changeLevel = detectChangeLevel(raw.titulo, raw.epigrafe);
  const cambioDetectado = !["NOMBRAMIENTO", "CORRECCIÓN", "SIN CAMBIO"].includes(changeLevel);
  const esRuido = detectaRuido(raw.titulo, raw.epigrafe, tipo);
  const score = computeScore(tipo, raw.seccion, changeLevel, areas, audiencias, tags, esRuido);
  const alertLevel = deriveAlertLevel(score, tipo, changeLevel);
  const accion = deriveAccion(alertLevel, esRuido);
  const porQueImporta = generatePorQueImporta(tipo, changeLevel, areas, tags);
  return { ...raw, tipo, areas, audiencias, tags, score, alertLevel, accion, changeLevel, cambioDetectado, esRuido, porQueImporta, keywordsDetectadas: [] };
}
export function classifyAll(disposiciones: DisposicionRaw[]): DisposicionClassified[] {
  return disposiciones.map(classifyDisposicion);
}
