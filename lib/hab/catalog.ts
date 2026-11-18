import type { Clause } from './types'

// Catálogo inicial. TODAS sin revisar por abogado. Debe coincidir con los códigos de habitaciones_001.sql
// (lo comprueba scripts/dev/hab-check.ts).
export const LEGAL_NOTICE = 'Esta herramienta no presta asesoría jurídica; tú eliges las cláusulas.'
export const CATALOG_NOTICE = 'Catálogo pendiente de revisión por abogado'

type Seed = Omit<Clause, 'id' | 'reviewed_by_lawyer'>
export const CLAUSE_SEEDS: Seed[] = [
  { code: 'duracion', category: 'Duración', title: 'Duración del contrato', community: null,
    body: 'El contrato tiene la duración indicada en las fechas de inicio y fin. Llegado el fin, las partes pueden acordar por escrito una prórroga.' },
  { code: 'renta_pago', category: 'Renta', title: 'Renta y forma de pago', community: null,
    body: 'La persona inquilina abonará la renta mensual pactada por adelantado, dentro de los primeros cinco días de cada mes, mediante transferencia a la cuenta indicada por la parte arrendadora.' },
  { code: 'fianza_general', category: 'Fianza', title: 'Fianza', community: null,
    body: 'A la firma se entrega la fianza pactada, que se devolverá al finalizar el contrato tras comprobar el estado de la habitación y de los elementos del inventario. Consulta el depósito autonómico que corresponda.' },
  { code: 'fianza_andalucia', category: 'Fianza', title: 'Fianza (Andalucía)', community: 'Andalucía',
    body: 'En Andalucía la custodia de la fianza corresponde a la parte propietaria desde el 24 de enero de 2026 (Ley 5/2025). Confirma el procedimiento vigente antes de usar esta cláusula.' },
  { code: 'suministros', category: 'Gastos', title: 'Suministros y gastos', community: null,
    body: 'Los suministros (luz, agua, gas, internet) se reparten entre las habitaciones según la regla indicada en el contrato, salvo que estén incluidos en la renta.' },
  { code: 'uso_zonas', category: 'Uso', title: 'Uso de la habitación y zonas comunes', community: null,
    body: 'La habitación se destina a vivienda de la persona inquilina. Las zonas comunes se usan de forma compartida, respetando las reglas de la casa adjuntas.' },
  { code: 'convivencia', category: 'Convivencia', title: 'Convivencia, ruido y humo', community: null,
    body: 'Se respetará el descanso del resto de personas convivientes. Las normas sobre ruido, humo y animales de compañía son las indicadas en las reglas de la casa.' },
  { code: 'visitas', category: 'Convivencia', title: 'Visitas y pernoctaciones', community: null,
    body: 'Las visitas deben respetar las reglas de la casa. Las pernoctaciones frecuentes de terceras personas se acordarán previamente con la parte arrendadora.' },
  { code: 'inventario', category: 'Estado', title: 'Inventario y estado de la habitación', community: null,
    body: 'Se adjunta el inventario de entrada con fotografías fechadas. Al salir se hará el inventario de salida y se comparará con el de entrada.' },
  { code: 'cesion', category: 'Cesión', title: 'Cesión y subarriendo', community: null,
    body: 'La persona inquilina no puede ceder ni subarrendar la habitación sin consentimiento escrito de la parte arrendadora.' },
  { code: 'reparaciones', category: 'Mantenimiento', title: 'Reparaciones y avisos de incidencias', community: null,
    body: 'La persona inquilina avisará sin demora de cualquier avería o incidencia. Las pequeñas reparaciones por uso corren a cargo de quien las cause.' },
  { code: 'preaviso', category: 'Resolución', title: 'Preaviso y resolución anticipada', community: null,
    body: 'Cualquiera de las partes que desee terminar antes de tiempo lo comunicará por escrito con al menos treinta días de antelación.' },
  { code: 'cond_llaves', category: 'Condiciones y entrega', title: 'Llaves y accesos', community: null,
    body: 'Se entregan las llaves indicadas en el Anexo II; no se permiten copias salvo pacto y se devuelven todas al terminar. Se detalla la entrega en el acta de llaves.' },
  { code: 'cond_limpieza', category: 'Condiciones y entrega', title: 'Limpieza', community: null,
    body: 'La limpieza de zonas comunes, de la habitación y la limpieza final se reparten como indica el Anexo II.' },
  { code: 'cond_suministros', category: 'Condiciones y entrega', title: 'Suministros y servicios', community: null,
    body: 'Luz, agua, gas, internet, calefacción y aire acondicionado se incluyen o reparten como indica el Anexo II, con los límites mensuales que se pacten.' },
  { code: 'cond_equipamiento', category: 'Condiciones y entrega', title: 'Equipamiento y espacios', community: null,
    body: 'La habitación y la vivienda se entregan con el equipamiento y espacios indicados en el Anexo II.' },
  { code: 'cond_normas', category: 'Condiciones y entrega', title: 'Normas de la casa', community: null,
    body: 'Se aplican las normas de la casa marcadas en el Anexo II sobre humo, mascotas, visitas, ruido, descanso y entrada del propietario con preaviso.' },
  { code: 'cond_condiciones', category: 'Condiciones y entrega', title: 'Condiciones de entrada y salida', community: null,
    body: 'Horarios de entrada y salida, empadronamiento, reparaciones, seguros, preaviso, penalización pactada (pendiente de revisión legal) y devolución de fianza, según el Anexo II.' },
]

export const CLAUSE_CATALOG: Clause[] = CLAUSE_SEEDS.map((c, i) => ({ ...c, id: `c${i + 1}`, reviewed_by_lawyer: false }))
