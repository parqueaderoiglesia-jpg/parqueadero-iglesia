import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useTurno } from '../lib/turno'
import { fechaLarga, servicioSugerido } from '../lib/util'
import Cabecera from '../components/Cabecera'

export default function Home() {
  const nav = useNavigate()
  const t = useTurno()
  const [pId, setPId] = useState<string | null>(null)
  const [sId, setSId] = useState<string | null>(null)
  const esVoluntario = t.perfil?.rol === 'voluntario'

  useEffect(() => {
    if (t.cargando || !t.perfil?.activo) return
    setPId(esVoluntario ? t.perfil.parqueadero_id : t.parqueaderoId)
    setSId(t.servicioId ?? servicioSugerido(t.servicios)?.id ?? null)
  }, [t.cargando, t.perfil, t.parqueaderoId, t.servicioId, t.servicios, esVoluntario])

  const fijo = t.parqueaderos.find((x) => x.id === t.perfil?.parqueadero_id)
  return (
    <main className="pantalla">
      <Cabecera sub="Parqueadero Iglesia" titulo={t.perfil?.nombre ? `Hola, ${t.perfil.nombre}` : 'Hola'} />
      <section className="cuerpo">
        {t.cargando && <p>Cargando tus datos…</p>}
        {t.error && <p className="error" role="alert">{t.error}</p>}
        {t.perfil && !t.perfil.activo && (
          <p className="aviso">Tu cuenta está pendiente de activación. Avisa al coordinador de logística.</p>
        )}
        {t.perfil?.activo && (
          <>
            <label>
              Servicio
              <select value={sId ?? ''} onChange={(e) => setSId(e.target.value)}>
                {t.servicios.length === 0 && <option value="">No hay servicios creados</option>}
                {t.servicios.map((s) => (
                  <option key={s.id} value={s.id}>{s.nombre} · {fechaLarga(s.inicio)}</option>
                ))}
              </select>
            </label>
            <div className="grupo">
              <span className="titulo-grupo">Parqueadero</span>
              {esVoluntario ? (
                fijo ? <div className="opcion activa"><b>{fijo.nombre}</b><span>Asignado a ti</span></div>
                     : <p className="aviso">No tienes un parqueadero asignado. Avisa al coordinador.</p>
              ) : (
                t.parqueaderos.map((p) => (
                  <button key={p.id} type="button" className={`opcion ${pId === p.id ? 'activa' : ''}`} aria-pressed={pId === p.id} onClick={() => setPId(p.id)}>
                    <b>{p.nombre}</b><span>{p.tipo === 'moto' ? 'Motos' : 'Carros'}</span>
                  </button>
                ))
              )}
            </div>
            <button className="primario" type="button" disabled={!pId || !sId} onClick={() => { t.iniciar(pId!, sId!); nav('/lista') }}>
              {t.parqueaderoId ? 'Continuar turno' : 'Iniciar turno'}
            </button>
          </>
        )}
        <button className="secundario" type="button" onClick={() => { t.cerrarTurno(); supabase.auth.signOut() }}>
          Cerrar sesión
        </button>
      </section>
    </main>
  )
}
