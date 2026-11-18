import type { IncidentCategory, TicketCategory } from './types'
import { DEFAULT_TEMPLATES } from './types'

const digits = (n: string) => n.replace(/\D/g, '')

export function waLink(number: string, text: string): string {
  return `https://wa.me/${digits(number)}?text=${encodeURIComponent(text)}`
}

// Mensaje de soporte: solo nº de ticket, categoría y asunto (sin datos personales ni contenido de contratos).
export function supportMessage(ticketNumber: number, category: TicketCategory, subject: string): string {
  return `Hola, tengo el ticket #${ticketNumber} (${category}): ${subject}`
}

export function incidentMessage(templates: Record<string, string> | null | undefined, v: { category: IncidentCategory; name: string; room: string; code: string }): string {
  const tpl = templates?.[v.category]?.trim() || DEFAULT_TEMPLATES[v.category]
  return tpl.replaceAll('{nombre}', v.name).replaceAll('{habitación}', v.room).replaceAll('{código}', v.code).replaceAll('{categoría}', v.category)
}

export function welcomeMessage(tenantName: string, url: string): string {
  return `Hola ${tenantName}, este es tu enlace personal para avisar de averías, quejas o sugerencias de tu habitación: ${url}`
}
