import { NextRequest, NextResponse } from 'next/server'
import { stripe, PLANS } from '@/lib/stripe'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'

export async function POST(req: NextRequest) {
  try {
    const supabase = createRouteHandlerClient({ cookies })
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
    }

    const { planId, billingCycle } = await req.json()

    // Get plan details
    const plan = PLANS[planId.toUpperCase() as keyof typeof PLANS]
    if (!plan) {
      return NextResponse.json({ error: 'Plan no válido' }, { status: 400 })
    }

    const finalPrice = billingCycle === 'yearly' ? Math.round(plan.price * 0.8 * 12) : plan.price

    // Create Stripe Checkout Session
    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'eur',
            product_data: {
              name: `Plan ${plan.name}`,
              description: plan.features.slice(0, 3).join(', '),
            },
            unit_amount: finalPrice * 100, // Stripe uses cents
            recurring: {
              interval: billingCycle === 'yearly' ? 'year' : 'month',
            },
          },
          quantity: 1,
        },
      ],
      metadata: {
        userId: user.id,
        planId: planId,
        billingCycle: billingCycle,
      },
      success_url: `${process.env.NEXT_PUBLIC_APP_URL || 'https://vendoya.es'}/dashboard?checkout=success`,
      cancel_url: `${process.env.NEXT_PUBLIC_APP_URL || 'https://vendoya.es'}/pricing?checkout=cancelled`,
      customer_email: user.email,
    })

    return NextResponse.json({ sessionId: session.id, url: session.url })
  } catch (error) {
    console.error('Checkout error:', error)
    const err = error as Error
    return NextResponse.json(
      { error: err.message || 'Error al crear sesión de pago' },
      { status: 500 }
    )
  }
}
