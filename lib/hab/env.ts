// Modo demo: solo con NEXT_PUBLIC_HAB_DEMO=1 y NUNCA en producción.
export const DEMO_ROLES = ['owner', 'agency', 'subtenant', 'tenant', 'admin'] as const
export type DemoRole = (typeof DEMO_ROLES)[number]
export const DEMO_COOKIE = 'hab_demo_role'
export const DEMO_NAME_COOKIE = 'hab_demo_name'

export function demoRequested(): boolean {
  return process.env.NEXT_PUBLIC_HAB_DEMO === '1'
}

// Lanza un error claro si alguien activa el demo en producción.
export function assertDemoAllowed(): void {
  if (demoRequested() && process.env.NODE_ENV === 'production') {
    throw new Error('NEXT_PUBLIC_HAB_DEMO=1 no está permitido con NODE_ENV=production: el modo demo no se puede usar en producción. Quita la variable.')
  }
}

// true solo si el demo está activo y permitido; en producción siempre false (se ignora).
export function isDemo(): boolean {
  return demoRequested() && process.env.NODE_ENV !== 'production'
}
