'use client'
import { useHab } from './HabProvider'
import { Resumen } from './tabs/Resumen'
import { MiHabitacion } from './tabs/MiHabitacion'

export function Home() { return useHab().session.kind === 'tenant' ? <MiHabitacion /> : <Resumen /> }
