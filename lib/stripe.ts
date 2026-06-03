import Stripe from 'stripe'

// Lazy-initialized: solo se crea cuando se usa, no en build time.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const stripe: Stripe = new Proxy({} as any, {
  get(_target, prop) {
    if (!process.env.STRIPE_SECRET_KEY) {
      throw new Error('STRIPE_SECRET_KEY is not defined')
    }
    const instance = new Stripe(process.env.STRIPE_SECRET_KEY, {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      apiVersion: '2024-11-20.acacia' as any,
      typescript: true,
    })
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (instance as any)[prop]
  },
})

export const PLANS = {
  BASICO: {
    name: 'Básico',
    price: 49,
    priceId: process.env.STRIPE_PRICE_BASICO || '',
    features: [
      '500 propiedades',
      '1.000 contactos',
      '3 usuarios',
      'Análisis de inversión con IA',
      'Email automático básico (100/mes)',
      'CRM completo',
      'App móvil',
      'Soporte email',
    ],
    limits: {
      properties: 500,
      contacts: 1000,
      users: 3,
      emails: 100,
    },
  },
  PROFESIONAL: {
    name: 'Profesional',
    price: 99,
    priceId: process.env.STRIPE_PRICE_PROFESIONAL || '',
    popular: true,
    features: [
      'Propiedades ilimitadas',
      '10.000 contactos',
      '10 usuarios',
      'Email automático avanzado (1.000/mes)',
      'Automatizaciones con IA',
      'Informes personalizados',
      'Integraciones (Idealista, Fotocasa)',
      'Campos personalizados',
      'WhatsApp Business',
      'Soporte prioritario',
    ],
    limits: {
      properties: -1, // unlimited
      contacts: 10000,
      users: 10,
      emails: 1000,
    },
  },
  EMPRESAS: {
    name: 'Empresas',
    price: 199,
    priceId: process.env.STRIPE_PRICE_EMPRESAS || '',
    features: [
      'Usuarios ilimitados',
      'Contactos ilimitados',
      'Email ilimitado',
      'API completa',
      'White-label (tu marca)',
      'Multi-oficina',
      'Roles y permisos avanzados',
      'SSO (Single Sign-On)',
      'Onboarding dedicado',
      'Account manager',
      'Soporte 24/7',
      'SLA garantizado',
    ],
    limits: {
      properties: -1,
      contacts: -1,
      users: -1,
      emails: -1,
    },
  },
}
