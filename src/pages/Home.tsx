import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../lib/auth'

type Perfil = { nombre: string; rol: string; activo: boolean; parqueadero_id: string | null }
type Servicio = { id: string; nombre: string; inicio: string; fin: string }

const ROLES: Record<string, string> = {
  administrador: 'Administrador',
  coordinador: 'Coordinador',
  voluntario: 'Voluntario',
}
const fecha = (iso: string) =>
  new Date(iso).toLocaleString('es-CO', {
    weekday: 'long', day: 'numeric', month: 'long', hour: 'numeric', minute: '2-digit', timeZone: 'America/Bogota',
  })

export default function Home() {
  const { session } = useAuth()
  const [perfil, setPerfil] = useState<Perfil | null>(null)
  const [parqueadero, setParqueadero] = useState<string | null>(null)
  const [servicio, setServicio] = useState<Servicio | null>(null)
  const [enCurso, setEnCurso] = useState(false)
  const [error, setError] = useState('')
  const [listo, setListo] = useState(false)

  useEffect(() => {
    const uid = session?.user.id
    if (!uid) return
    ;(async () => {
      const p = await supabase.from('perfiles').select('nombre,rol,activo,parqueadero_id').eq('id', uid).single()
      if (p.error || !p.data) {
        setError('No se pudo cargar tu perfil. Revisa tu conexión a internet.')
        setListo(true)
        return
      }
      const perfilCargado = p.data as Perfil
      setPerfil(perfilCargado)
      if (perfilCargado.activo) {
        if (perfilCargado.parqueadero_id) {
          const q = await supabase.from('parqueaderos').select('nombre').eq('id', perfilCargado.parqueadero_id).single()
          setParqueadero(q.data?.nombre ?? null)
        }
        const s = await supabase.from('servicios').select('id,nombre,inicio,fin').order('inicio', { ascending: true })
        const lista = (s.data ?? []) as Servicio[]
        const ahora = Date.now()
        const actual = lista.find((x) => Date.parse(x.inicio) <= ahora && ahora <= Date.parse(x.fin))
        const proximo = lista.find((x) => Date.parse(x.inicio) > ahora)
        setServicio(actual ?? proximo ?? null)
        setEnCurso(!!actual)
      }
      setListo(true)
    })()
  }, [session])

  return (
    <main className="pantalla">
      <header className="cabecera">
        <p className="sub">Parqueadero Iglesia</p>
        <h1>{perfil?.nombre ? `Hola, ${perfil.nombre}` : 'Hola'}</h1>
      </header>
      <section className="cuerpo">
        {!listo && <p>Cargando tus datos…</p>}
        {error && <p className="error" role="alert">{error}</p>}
        {perfil && !perfil.activo && (
          <p className="aviso">Tu cuenta está pendiente de activación. Avisa al coordinador de logística.</p>
        )}
        {perfil?.activo && (
          <>
            <div className="tarjeta">
              <span className="etiqueta">Tu rol</span>
              <strong>{ROLES[perfil.rol] ?? perfil.rol}</strong>
              <span className="etiqueta">Parqueadero</span>
              <strong>{parqueadero ?? 'Sin asignar (puedes elegirlo al iniciar turno)'}</strong>
              <span className="etiqueta">{enCurso ? 'Servicio en curso' : 'Próximo servicio'}</span>
              <strong>{servicio ? `${servicio.nombre} · ${fecha(servicio.inicio)}` : 'No hay servicios creados'}</strong>
            </div>
            <p className="ok">Conexión con la base de datos: correcta.</p>
          </>
        )}
        <button className="secundario" type="button" onClick={() => supabase.auth.signOut()}>
          Cerrar sesión
        </button>
      </section>
    </main>
  )
}
