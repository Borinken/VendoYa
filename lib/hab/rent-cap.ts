// Tope de renta: la suma de rentas de las habitaciones no puede superar la renta del piso entero
// (RDL 29/2026, convalidación SIN verificar). Solo AVISO, nunca bloqueo, hasta que lo confirme el abogado.
export interface RentCapResult {
  capCents: number | null // null = sin tope definido
  totalCents: number
  overCents: number
  exceeded: boolean
  usedPct: number | null
}

export function rentCap(opts: {
  wholeFlatRentCents: number | null
  sublet?: { max_total_rent_cents: number | null }[] // concesiones sublet vigentes
  roomRentsCents: number[]
  extraRentCents?: number // habitación nueva que aún no está guardada
}): RentCapResult {
  const caps = [opts.wholeFlatRentCents, ...(opts.sublet ?? []).map(s => s.max_total_rent_cents)]
    .filter((c): c is number => typeof c === 'number' && c > 0)
  const capCents = caps.length ? Math.min(...caps) : null
  const totalCents = opts.roomRentsCents.reduce((a, b) => a + b, 0) + (opts.extraRentCents ?? 0)
  const overCents = capCents === null ? 0 : Math.max(0, totalCents - capCents)
  return {
    capCents, totalCents, overCents,
    exceeded: overCents > 0,
    usedPct: capCents === null ? null : Math.round((totalCents / capCents) * 100),
  }
}
