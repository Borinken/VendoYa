import { redirect } from 'next/navigation'

// La landing es HTML estático en public/habitaciones/ (prototipo de preventa, noindex).
export default function Habitaciones() {
  redirect('/habitaciones/index.html')
}
