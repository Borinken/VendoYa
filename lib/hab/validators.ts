// Validadores de identificación fiscal española (letra / dígito de control).
const DNI_LETTERS = 'TRWAGMYFPDXBNJZSQVHLCKE'
const clean = (s: string) => s.toUpperCase().replace(/[\s.-]/g, '')

export function isValidDni(v: string): boolean {
  const s = clean(v)
  if (!/^\d{8}[A-Z]$/.test(s)) return false
  return DNI_LETTERS[Number(s.slice(0, 8)) % 23] === s[8]
}

export function isValidNie(v: string): boolean {
  const s = clean(v)
  if (!/^[XYZ]\d{7}[A-Z]$/.test(s)) return false
  const n = Number('XYZ'.indexOf(s[0]) + s.slice(1, 8))
  return DNI_LETTERS[n % 23] === s[8]
}

export function isValidCif(v: string): boolean {
  const s = clean(v)
  if (!/^[ABCDEFGHJNPQRSUVW]\d{7}[0-9A-J]$/.test(s)) return false
  const d = s.slice(1, 8).split('').map(Number)
  const even = d[1] + d[3] + d[5]
  const odd = [d[0], d[2], d[4], d[6]].reduce((a, x) => a + Math.floor((x * 2) / 10) + ((x * 2) % 10), 0)
  const ctrl = (10 - ((even + odd) % 10)) % 10
  const last = s[8]
  const needsLetter = 'PQRSNW'.includes(s[0])
  const needsDigit = 'ABEH'.includes(s[0])
  const letter = 'JABCDEFGHI'[ctrl]
  if (needsLetter) return last === letter
  if (needsDigit) return last === String(ctrl)
  return last === letter || last === String(ctrl)
}

export const isValidTaxId = (v: string) => isValidDni(v) || isValidNie(v)
export const isValidTaxIdOrCif = (v: string) => isValidDni(v) || isValidNie(v) || isValidCif(v)
