import { createClient } from '@supabase/supabase-js'

// Estas dos claves son PÚBLICAS por diseño (la seguridad real la dan las reglas RLS de la base de datos).
// Nunca pongas aquí la clave "service_role" ni contraseñas.
const SUPABASE_URL = 'https://gsphzlhiyvuwdpxejrlb.supabase.co'
const SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_ragPcYERZdYRI-2Nh41_Pg_Hfisi68t'

export const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY)
