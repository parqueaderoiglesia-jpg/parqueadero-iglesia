import { useCallback, useEffect, useState } from 'react'
import { Link, Navigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useTurno } from '../lib/turno'
import { hora, verCelular } from '../lib/util'
import Cabecera from '../components/Cabecera'

type Fila = {
  id: string; hora_entrada: string; hora_salida: string | null; deja_llaves: boolean; ubicacion_llaves: string | null
  v: { placa: string; propietario: string | null; celular: string | null }
}
type Filtro = 'todos' | 'dentro' | 'llaves'

export default function Lista() {
  const { parqueadero, parqueaderoId, servicio, servicioId, cargando } = useTurno()
  const [filas, setFilas] = useState<Fila[]>([])
  const [error, setError] = useState('')
  const [q, setQ] = useState('')
  const [filtro, setFiltro] = useState<Filtro>('todos')

  const cargar = useCallback(async () => {
    if (!parqueaderoId || !servicioId) return
    const r = await supabase
      .from('registros')
      .select('id,hora_entrada,hora_salida,deja_llaves,ubicacion_llaves,vehiculos(placa,propietario,celular)')
      .eq('parqueadero_id', parqueaderoId)
      .eq('servicio_id', servicioId)
      .order('hora_entrada', { ascending: false })
    if (r.error) { setError('No se pudo actualizar la lista. Revisa tu conexión.'); return }
    setError('')
    setFilas(((r.data ?? []) as any[]).map((f) => ({ ...f, v: Array.isArray(f.vehiculos) ? f.vehiculos[0] : f.vehiculos })))
  }, [parqueaderoId, servicioId])

  useEffect(() => {
    cargar()
    const i = setInterval(cargar, 20000)
    return () => clearInterval(i)
  }, [cargar])

  if (cargando) return <p className="centro">Cargando…</p>
  if (!parqueaderoId || !servicioId) return <Navigate to="/" replace />

  const dentro = filas.filter((f) => !f.hora_salida)
  const texto = q.trim().toLowerCase()
  const visibles = filas.filter((f) => {
    if (filtro === 'dentro' && f.hora_salida) return false
    if (filtro === 'llaves' && !(f.deja_llaves && !f.hora_salida)) return false
    return !texto || f.v?.placa.toLowerCase().includes(texto) || (f.v?.propietario ?? '').toLowerCase().includes(texto)
  })

  return (
    <main className="pantalla">
      <Cabecera sub={`${parqueadero?.nombre ?? ''} · ${servicio?.nombre ?? ''}`} titulo="Vehículos" atras="/" />
      <section className="cuerpo">
        <div className="stats">
          <div className="stat"><b>{filas.length}</b><span>registrados</span></div>
          <div className="stat"><b>{dentro.length}</b><span>siguen dentro</span></div>
        </div>
        <label>
          Buscar
          <input placeholder="Placa o nombre" value={q} onChange={(e) => setQ(e.target.value)} />
        </label>
        <div className="chips">
          {(['todos', 'dentro', 'llaves'] as Filtro[]).map((f) => (
            <button key={f} type="button" className="chip" aria-pressed={filtro === f} onClick={() => setFiltro(f)}>
              {f === 'todos' ? 'Todos' : f === 'dentro' ? 'Dentro' : 'Con llaves'}
            </button>
          ))}
        </div>
        {error && <p className="error" role="alert">{error}</p>}
        <div className="lista">
          {visibles.map((f) => (
            <Link key={f.id} to={`/vehiculo/${f.id}`} className="fila">
              <div>
                <div className="placa">{f.v?.placa}</div>
                <div className="detalle">{f.v?.propietario ?? 'Sin nombre'} · entró {hora(f.hora_entrada)}</div>
                {f.v?.celular && <div className="detalle">{verCelular(f.v.celular)}</div>}
              </div>
              <div className="etiquetas">
                {f.hora_salida ? <span className="badge gris">Salió {hora(f.hora_salida)}</span> : <span className="badge verde">Dentro</span>}
                {f.deja_llaves && <span className="badge ambar">Llaves{f.ubicacion_llaves ? ` · ${f.ubicacion_llaves}` : ''}</span>}
              </div>
            </Link>
          ))}
          {visibles.length === 0 && <p className="nota">{filas.length === 0 ? 'Aún no hay vehículos registrados en este turno.' : 'Ningún vehículo coincide con la búsqueda.'}</p>}
        </div>
        <Link to="/registrar" className="primario enlace">Registrar vehículo</Link>
      </section>
    </main>
  )
}
