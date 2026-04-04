// ─── TIPOS ───────────────────────────────────────────────────────
export type SourceType = "AEAT" | "BOE";

export interface AnalysisInput {
  sourceType: SourceType;
  url: string;
}

export interface AnalysisResult {
  title: string;
  summary: string;
  affectedAudience: string;
  practicalImpact: string;
  actionPoints: string[];
  sourceUrl: string;
  cta: string;
}

// ─── DETECCIÓN DE TEMA POR URL ────────────────────────────────────
function detectTopic(url: string): string {
  const u = url.toLowerCase();
  if (u.includes("iva")) return "iva";
  if (u.includes("irpf") || u.includes("renta")) return "irpf";
  if (u.includes("autonom")) return "autonomos";
  if (u.includes("declaracion") || u.includes("modelo-100") || u.includes("modelo100")) return "declaracion";
  if (u.includes("modelo")) return "modelo";
  if (u.includes("deduccion") || u.includes("deducción")) return "deduccion";
  if (u.includes("sociedad") || u.includes("impuesto-sobre-sociedades")) return "sociedades";
  if (u.includes("sancion") || u.includes("sanción") || u.includes("infraccion")) return "sancion";
  return "general";
}

// ─── CONTENIDO MOCK POR TEMA Y FUENTE ────────────────────────────
// Para sustituir: reemplaza esta función por una llamada a tu API/IA real.
function getMockContent(topic: string, sourceType: SourceType): Omit<AnalysisResult, "sourceUrl"> {
  const base: Record<string, Omit<AnalysisResult, "sourceUrl">> = {
    iva: {
      title: "Criterio actualizado sobre deducción del IVA en operaciones mixtas",
      summary:
        "La AEAT establece nuevos criterios para calcular la prorrata del IVA cuando una empresa realiza a la vez actividades sujetas y exentas. El cambio afecta al método de cálculo del porcentaje definitivo de deducción aplicable al cierre del ejercicio.",
      affectedAudience:
        "Empresas y autónomos con actividades mixtas: parte sujeta al IVA y parte exenta. Principalmente sectores inmobiliario, financiero y sanitario privado.",
      practicalImpact:
        "El porcentaje provisional aplicado durante el año puede diferir significativamente del definitivo. Esto impacta en la liquidez trimestral y en la regularización del cuarto trimestre. Quien no lo controle puede tener una sorpresa negativa en diciembre.",
      actionPoints: [
        "Revisar si tu actividad incluye operaciones exentas de IVA junto a operaciones sujetas.",
        "Calcular la prorrata provisional y compararla con la del ejercicio anterior.",
        "Ajustar las liquidaciones trimestrales si el porcentaje cambia de forma significativa.",
        "Documentar las operaciones mixtas correctamente para la regularización anual.",
        "Consultar con tu asesor si no tienes claro cómo afecta este criterio a tu caso concreto.",
      ],
      cta: "Si realizas actividades mixtas y no tienes claro cómo calcular tu prorrata, revísalo antes del siguiente trimestre. Un error aquí puede costar caro en diciembre.",
    },
    irpf: {
      title: "Novedades en la deducibilidad de gastos en el IRPF para profesionales",
      summary:
        "La AEAT actualiza su criterio sobre qué gastos son deducibles en el IRPF para trabajadores autónomos y profesionales liberales. El foco está en gastos de suministros del hogar, vehículos y formación.",
      affectedAudience:
        "Autónomos en estimación directa, profesionales liberales, freelancers y cualquier persona física que declare rendimientos de actividades económicas en el IRPF.",
      practicalImpact:
        "Afecta directamente a la base imponible del IRPF. Gastos que antes se deducían total o parcialmente pueden verse limitados. También hay novedades positivas para formación relacionada con la actividad.",
      actionPoints: [
        "Revisar los gastos de suministros del hogar que estás deduciendo y su porcentaje.",
        "Comprobar si el vehículo tiene justificación de uso exclusivo profesional.",
        "Guardar facturas de formación relacionada directamente con tu actividad.",
        "Revisar si tienes gastos de difícil justificación y si superas el límite del 5%.",
        "Hacer una estimación de tu base imponible ajustada con los nuevos criterios antes de fin de año.",
      ],
      cta: "Si no tienes claro qué gastos puedes deducir este año, una revisión previa a la declaración puede ahorrarte dinero real. No esperes a que llegue Renta.",
    },
    autonomos: {
      title: "Cambios en el sistema de cotización de autónomos por ingresos reales",
      summary:
        "El BOE recoge la nueva tabla de tramos de cotización para autónomos basada en rendimientos netos reales. El sistema elimina progresivamente la elección libre de base de cotización y la vincula a los ingresos declarados.",
      affectedAudience:
        "Todos los autónomos dados de alta en el RETA, especialmente quienes cotizaban por una base inferior a sus ingresos reales o quienes tienen rendimientos muy variables.",
      practicalImpact:
        "La cuota mensual puede subir o bajar según el tramo en que quedes. Quienes ganaban poco y cotizaban alto pueden pagar menos. Quienes ganaban mucho y cotizaban mínimo, van a pagar más.",
      actionPoints: [
        "Calcular tu rendimiento neto estimado para el ejercicio actual.",
        "Consultar en qué tramo te corresponde cotizar y cuál es tu cuota mensual resultante.",
        "Comunicar a la Seguridad Social si tus ingresos cambian durante el año.",
        "Revisar si estás acogido a alguna bonificación que pueda verse afectada.",
        "Regularizar al final del año si cotizaste por tramo diferente al de tus ingresos reales.",
      ],
      cta: "Si no has revisado tu base de cotización desde el cambio al sistema de ingresos reales, es probable que estés pagando más o menos de lo que te corresponde. Vale la pena calcularlo.",
    },
    declaracion: {
      title: "Novedades en el modelo de declaración de la Renta 2024",
      summary:
        "La AEAT publica las principales modificaciones del modelo 100 para la campaña de Renta 2024. Incluye nuevas casillas para deducciones medioambientales, cambios en la tributación de rendimientos del capital y actualización de los límites de reducción por aportaciones a planes de pensiones.",
      affectedAudience:
        "Todos los contribuyentes obligados a presentar la declaración del IRPF: trabajadores por cuenta ajena con ingresos superiores al mínimo, autónomos, personas con rendimientos del capital o ganancias patrimoniales.",
      practicalImpact:
        "Hay deducciones nuevas aplicables este año que no existían en la declaración anterior. Si no las conoces, dejarás de recuperar dinero que te corresponde legalmente.",
      actionPoints: [
        "Revisar las nuevas deducciones disponibles para tu situación personal y familiar.",
        "Comprobar si tienes pendiente algún saldo pendiente de compensar de ejercicios anteriores.",
        "Preparar la documentación de aportaciones a planes de pensiones.",
        "Verificar si tienes derecho a deducciones autonómicas que no has aplicado antes.",
        "No presentar el borrador sin revisarlo: la AEAT no incluye automáticamente todas las deducciones.",
      ],
      cta: "El borrador de Hacienda no siempre incluye todo lo que te corresponde. Revisarlo antes de confirmar puede marcar una diferencia real en el resultado.",
    },
    modelo: {
      title: "Modificación técnica en modelos de declaración trimestral",
      summary:
        "La AEAT actualiza el formato y las instrucciones de presentación de modelos trimestrales. Los cambios afectan principalmente a los campos de consignación de operaciones intracomunitarias y al desglose de actividades en el modelo 303.",
      affectedAudience:
        "Autónomos y empresas obligados a presentar declaraciones trimestrales de IVA (modelo 303), retenciones (modelo 111/115) o pagos fraccionados del IRPF (modelo 130/131).",
      practicalImpact:
        "Presentar los modelos sin adaptarse al nuevo formato puede generar errores de validación y requerimientos de corrección. En algunos casos, puede implicar sanciones por presentación incorrecta.",
      actionPoints: [
        "Verificar que tu software de contabilidad o gestoría ha actualizado los formularios.",
        "Revisar las instrucciones actualizadas antes de la próxima presentación trimestral.",
        "Consultar si tienes operaciones intracomunitarias que requieran ajuste en el nuevo formato.",
        "Guardar el justificante de presentación correcta para cada modelo.",
      ],
      cta: "Si presentas los modelos trimestrales tú mismo, asegúrate de que el formulario que usas está actualizado. Un error técnico puede convertirse en un requerimiento innecesario.",
    },
    deduccion: {
      title: "Nuevos criterios sobre deducibilidad de gastos de difícil justificación",
      summary:
        "La AEAT concreta los criterios de aplicación del límite del 5% sobre el rendimiento neto para gastos de difícil justificación en estimación directa simplificada. El cambio afecta a cómo se calcula la base sobre la que se aplica ese porcentaje.",
      affectedAudience:
        "Autónomos en estimación directa simplificada que aplican la deducción de gastos de difícil justificación en su declaración de IRPF.",
      practicalImpact:
        "La base de cálculo del 5% puede ser distinta de lo que algunos estaban aplicando. Esto puede significar una deducción mayor o menor dependiendo de cada caso.",
      actionPoints: [
        "Verificar sobre qué base estás calculando el 5% de gastos de difícil justificación.",
        "Comparar el resultado con el criterio actualizado para detectar posibles diferencias.",
        "Revisar declaraciones de ejercicios anteriores si crees que puede haber un error sistemático.",
        "Documentar los gastos reales aunque no sean de fácil justificación, por si el límite cambia.",
      ],
      cta: "Esta es una deducción que muchos autónomos aplican sin revisar bien la base de cálculo. Vale la pena comprobarlo, especialmente si tienes ingresos significativos.",
    },
    sociedades: {
      title: "Criterio actualizado sobre amortización acelerada en el Impuesto sobre Sociedades",
      summary:
        "La Dirección General de Tributos aclara los criterios de aplicación de la amortización acelerada para inversiones en activos nuevos. El criterio afecta al momento y al porcentaje máximo aplicable en los primeros años de uso del activo.",
      affectedAudience:
        "Sociedades limitadas, anónimas y otras personas jurídicas que hayan realizado inversiones en maquinaria, equipos informáticos o instalaciones en los últimos ejercicios.",
      practicalImpact:
        "Una aplicación correcta puede reducir la base imponible del Impuesto sobre Sociedades de forma significativa en los primeros años. Aplicarla incorrectamente puede generar ajustes en inspección.",
      actionPoints: [
        "Revisar las inversiones en activos realizadas en los últimos 3 ejercicios.",
        "Comprobar si se está aplicando correctamente la amortización acelerada admitida.",
        "Consultar con el asesor si hay activos que podrían beneficiarse del criterio actualizado.",
        "Ajustar el plan de amortización si procede, antes del cierre del ejercicio.",
      ],
      cta: "Si tu empresa ha realizado inversiones relevantes y no has revisado el plan de amortización con el criterio actual, puedes estar dejando ahorro fiscal sobre la mesa.",
    },
    sancion: {
      title: "Actualización del régimen sancionador por presentación fuera de plazo",
      summary:
        "La AEAT publica instrucciones actualizadas sobre la aplicación del régimen de recargos por presentación extemporánea de declaraciones y autoliquidaciones. Se clarifica el cálculo del recargo según el tiempo de retraso y las condiciones para su reducción.",
      affectedAudience:
        "Cualquier contribuyente o empresa que haya presentado o pueda presentar declaraciones fuera de plazo, incluyendo autónomos con declaraciones trimestrales y particulares con la declaración de Renta.",
      practicalImpact:
        "El importe del recargo varía según el tiempo de retraso: 1% por mes hasta los 12 meses, y el 15% más intereses a partir del año. Conocer los plazos exactos puede reducir el coste de una presentación tardía.",
      actionPoints: [
        "Revisar si tienes obligaciones fiscales pendientes de presentar fuera de plazo.",
        "Calcular el recargo estimado antes de presentar para evitar sorpresas.",
        "Solicitar el aplazamiento o fraccionamiento si no puedes hacer frente al importe total.",
        "Guardar el justificante de presentación con sello de fecha para cualquier reclamación futura.",
      ],
      cta: "Si tienes alguna declaración pendiente de regularizar, presentarla voluntariamente antes de que Hacienda la requiera reduce el recargo considerablemente. No esperes.",
    },
    general: {
      title:
        sourceType === "BOE"
          ? "Nueva disposición oficial publicada en el BOE con impacto fiscal"
          : "Nueva nota informativa de la AEAT con criterio relevante para contribuyentes",
      summary:
        sourceType === "BOE"
          ? "El Boletín Oficial del Estado publica una nueva disposición normativa que modifica aspectos del régimen fiscal vigente. El cambio introduce nuevas obligaciones formales o modifica el tratamiento de determinadas operaciones."
          : "La Agencia Tributaria publica nueva información relevante sobre la interpretación o aplicación de la normativa fiscal. El criterio afecta a contribuyentes con determinadas situaciones o tipos de renta.",
      affectedAudience:
        "Autónomos, empresas y particulares con obligaciones tributarias activas en España. El nivel de impacto varía según el tipo de actividad y la situación fiscal individual.",
      practicalImpact:
        "El cambio puede afectar a las declaraciones del ejercicio en curso y a la planificación fiscal del siguiente. Dependiendo del perfil del contribuyente, el impacto puede ser positivo (nuevas deducciones o reducciones) o negativo (nuevas obligaciones o limitaciones).",
      actionPoints: [
        "Leer el texto completo de la fuente oficial para identificar si aplica a tu situación.",
        "Consultar con tu asesor fiscal si el cambio afecta a alguna de tus declaraciones en curso.",
        "Revisar si hay plazos concretos asociados a la nueva disposición.",
        "Guardar el enlace a la fuente oficial para tener el respaldo documental.",
      ],
      cta: "Cuando algo cambia en la normativa fiscal, lo más costoso suele ser enterarse tarde. Si tienes dudas sobre cómo afecta a tu caso, consulta antes de que llegue el próximo plazo.",
    },
  };

  return base[topic] ?? base["general"];
}

// ─── FUNCIÓN PRINCIPAL ────────────────────────────────────────────
// Para sustituir por IA real: reemplaza el cuerpo de esta función.
// La interfaz de entrada/salida no necesita cambiar.
export async function analyzeOfficialSource(
  input: AnalysisInput
): Promise<AnalysisResult> {
  // Simula latencia de procesamiento
  await new Promise((r) => setTimeout(r, 900));

  const topic = detectTopic(input.url);
  const content = getMockContent(topic, input.sourceType);

  return {
    ...content,
    sourceUrl: input.url,
  };
}

// ─── GENERADORES DE VERSIONES ─────────────────────────────────────
// Para sustituir: reemplaza el cuerpo de cada función por la llamada a tu IA.

export function generateXVersion(note: AnalysisResult): string {
  const points = note.actionPoints.slice(0, 3);
  return `${note.title}

${note.summary.split(".")[0]}.

Qué revisar ahora:
${points.map((p) => `→ ${p}`).join("\n")}

${note.cta}

Fuente oficial: ${note.sourceUrl}

#Fiscal #Impuestos #AEAT #Autónomos`;
}

export function generateWhatsAppVersion(note: AnalysisResult): string {
  const points = note.actionPoints.slice(0, 4);
  return `Hola 👋

*${note.title}*

${note.summary}

*¿A quién afecta?*
${note.affectedAudience}

*Qué deberías revisar:*
${points.map((p) => `• ${p}`).join("\n")}

${note.cta}

Fuente oficial: ${note.sourceUrl}`;
}
