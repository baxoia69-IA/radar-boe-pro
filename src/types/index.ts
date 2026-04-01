export type AlertLevel = "CRÍTICA" | "ALTA" | "MEDIA" | "BAJA";
export type Accion = "ACTUAR" | "REVISAR" | "SEGUIR" | "IGNORAR";
export type ChangeLevel =
  | "NUEVO RÉGIMEN"
  | "MODIFICACIÓN MATERIAL"
  | "MODIFICACIÓN PARCIAL"
  | "NUEVA REGULACIÓN"
  | "NUEVA CONVOCATORIA"
  | "DEROGACIÓN"
  | "AMPLIACIÓN DE PLAZO"
  | "NOMBRAMIENTO"
  | "CORRECCIÓN"
  | "SIN CAMBIO";

export type PolicyArea =
  | "Seguridad Pública" | "Función Pública" | "Empleo Público"
  | "Laboral" | "Fiscal" | "Sanidad" | "Vivienda"
  | "Administración Pública" | "Educación" | "Justicia"
  | "Defensa" | "Energía" | "Transporte" | "Autónomos"
  | "Empresas" | "Otros";

export type Audiencia =
  | "Fuerzas de Seguridad" | "Funcionarios" | "Ciudadanos"
  | "Autónomos" | "Empresas" | "Administraciones Públicas"
  | "Personal Sanitario" | "Docentes";

export interface DisposicionRaw {
  id: string; seccion: string; departamento: string;
  epigrafe: string; titulo: string; url_pdf: string;
  url_htm: string; fecha: string;
}

export interface DisposicionClassified extends DisposicionRaw {
  tipo: string; areas: PolicyArea[]; audiencias: Audiencia[];
  tags: string[]; score: number; alertLevel: AlertLevel;
  accion: Accion; changeLevel: ChangeLevel;
  cambioDetectado: boolean; esRuido: boolean;
  porQueImporta: string; keywordsDetectadas: string[];
}

export interface DisposicionViewModel extends DisposicionClassified {
  ministerioCorto: string; tipoLabel: string; scoreColor: string;
}

export interface ResumenItem {
  accion: Accion; texto: string; area: string; disposicionId: string;
}

export interface BoeDaySnapshot {
  fecha: string; fechaLabel: string; numeroBoe: string;
  totalDisposiciones: number; urgentes: number; criticas: number;
  altas: number; impactoFCS: number; impactoFP: number;
  cambiosDetectados: number; scoreGlobal: number;
  ministerioActivo: string;
  topAreas: { nombre: PolicyArea; count: number; pct: number }[];
  resumenEjecutivo: ResumenItem[];
  disposiciones: DisposicionViewModel[];
}
