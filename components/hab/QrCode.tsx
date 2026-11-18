'use client'
import { useEffect, useState } from 'react'

// QR generado en local (paquete qrcode); nunca usa servicios externos.
export function QrCode({ text, size = 200 }: { text: string; size?: number }) {
  const [svg, setSvg] = useState('')
  useEffect(() => { let on = true; import('qrcode').then(q => q.toString(text, { type: 'svg', margin: 1, width: size })).then(s => on && setSvg(s)); return () => { on = false } }, [text, size])
  return <div role="img" aria-label="Código QR del enlace" style={{ background: '#fff', padding: 8, borderRadius: 10, width: size + 16, height: size + 16 }} dangerouslySetInnerHTML={{ __html: svg }} />
}
