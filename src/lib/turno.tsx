import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { supabase } from './supabase'
import { useAuth } from './auth'

export type Perfil = { nombre: string; rol: string; activo: boolean; parqueadero_id: string | null }
export type Parqueadero = { id: string; nombre: string; tipo: 'carro' | 'moto' }
export type Servicio = { id: string; nombre: string; inicio: string; fin: string }

type Turno = {
  perfil: Perfil | null
  parqueaderos: Parqueadero[]
  servicios: Servicio[]
  parqueaderoId: string | null
  servicioId: string | null
  parqueadero: Parqueadero | null
  servicio: Servicio | null
  cargando: boolean
  error: string
  iniciar: (p: string, s: string) => void
  cerrarTurno: () => void
}
const Ctx = createContext<Turno>(null as unknown as Turno)
export const useTurno = () => useContext(Ctx)

export function TurnoProvider({ children }: { children: ReactNode }) {
  const { session } = useAuth()
  const [perfil, setPerfil] = useState<Perfil | null>(null)
  const [parqueaderos, setParqueaderos] = useState<Parqueadero[]>([])
  const [servicios, setServicios] = useState<Servicio[]>([])
  const [parqueaderoId, setP] = useState<string | null>(null)
  const [servicioId, setS] = useState<string | null>(null)
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    const uid = session?.user.id
    if (!uid) return
    ;(async () => {
      setCargando(true)
      const p = await supabase.from('perfiles').select('nombre,rol,activo,parqueadero_id').eq('id', uid).single()
      if (p.error || !p.data) {
        setError('No se pudo cargar tu perfil. Revisa tu conexión a internet.')
        setCargando(false)
        return
      }
      const per = p.data as Perfil
      setPerfil(per)
      if (per.activo) {
        const [pk, sv] = await Promise.all([
          supabase.from('parqueaderos').select('id,nombre,tipo').eq('activo', true).order('nombre'),
          supabase.from('servicios').select('id,nombre,inicio,fin').order('inicio', { ascending: true }),
        ])
        const lp = (pk.data ?? []) as Parqueadero[]
        const ls = (sv.data ?? []) as Servicio[]
        setParqueaderos(lp)
        setServicios(ls)
        try {
          const g = JSON.parse(localStorage.getItem('turno') || 'null')
          const pid = per.rol === 'voluntario' ? per.parqueadero_id : g?.p
          if (pid && lp.some((x) => x.id === pid) && g?.s && ls.some((x) => x.id === g.s)) {
            setP(pid)
            setS(g.s)
          }
        } catch {
          /* sin turno guardado */
        }
      }
      setCargando(false)
    })()
  }, [session])

  const iniciar = (p: string, s: string) => {
    setP(p)
    setS(s)
    try { localStorage.setItem('turno', JSON.stringify({ p, s })) } catch { /* ignorar */ }
  }
  const cerrarTurno = () => {
    setP(null)
    setS(null)
    try { localStorage.removeItem('turno') } catch { /* ignorar */ }
  }
  const parqueadero = parqueaderos.find((x) => x.id === parqueaderoId) ?? null
  const servicio = servicios.find((x) => x.id === servicioId) ?? null

  return (
    <Ctx.Provider value={{ perfil, parqueaderos, servicios, parqueaderoId, servicioId, parqueadero, servicio, cargando, error, iniciar, cerrarTurno }}>
      {children}
    </Ctx.Provider>
  )
}
