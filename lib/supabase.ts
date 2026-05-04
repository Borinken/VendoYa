import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Types
export interface Property {
  id: string
  title: string
  description: string
  property_type: 'apartment' | 'house' | 'commercial' | 'land'
  operation_type: 'sale' | 'rent'
  price: number
  surface: number
  rooms: number
  bathrooms: number
  address: string
  city: string
  postal_code: string
  latitude?: number
  longitude?: number
  images: string[]
  features: string[]
  status: 'available' | 'reserved' | 'sold' | 'rented'
  created_at: string
  updated_at: string
}

export interface Contact {
  id: string
  type: 'lead' | 'owner' | 'buyer' | 'tenant'
  first_name: string
  last_name: string
  email: string
  phone: string
  notes?: string
  lead_source?: string
  created_at: string
  updated_at: string
}
