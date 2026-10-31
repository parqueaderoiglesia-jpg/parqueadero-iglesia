import { useCallback, useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { fechaLarga, hora, verCelular } from '../lib/util'
import Cabecera from '../components/Cabecera'

type Reg = {
  id: string; hora_entrada: string; hora_salida: string | null; deja_llaves: boolean
  ubicacion_llaves: string | null; observaciones: string | null
  v: { placa: string; propietario: string | null; celular: string | null }
}

export default function Detalle() {
  const { id } = useParams()
  const [r, setR] = useState<Reg | null>(null)
  const [obs, setObs] = useState('')
  const [error, setError] = useState('')
  const [aviso, setAviso] = useState('')
  const [cargando, setCargando] = useState(true)

  const cargar = useCallback(async () => {
    const q = await supabase
      .from('registros')
      .select('id,hora_entrada,hora_salida,deja_llaves,ubicacion_llaves,observaciones,vehiculos(placa,propietario,celular)')
      .eq('id', id!)
      .single()
    setCargando(false)
    if (q.error || !q.data) { setError('No se encontró este registro o no tienes acceso a él.'); return }
    const d = q.data as any
    setR({ ...d, v: Array.isArray(d.vehiculos) ? d.vehiculos[0] : d.vehiculos })
    setObs(d.observaciones ?? '')
  }, [id])

  useEffect(() => { cargar() }, [cargar])

  async function cambiar(cambios: Record<string, unknown>, ok: string) {
    setError(''); setAviso('')
    const u = await supabase.from('registros').update(cambios).eq('id', id!)
    if (u.error) { setError('No se pudo guardar el cambio. Inténtalo de nuevo.'); return }
    setAviso(ok)
    cargar()
  }
  const salida = () => cambiar({ hora_salida: new Date(Math.max(Date.now(), Date.parse(r!.hora_entrada))).toISOString() }, 'Salida registrada.')

  if (cargando) return <p className="centro">Cargando…</p>
  return (
    <main className="pantalla">
      <Cabecera titulo={r?.v?.placa ?? 'Registro'} sub="Detalle del vehículo" atras="/lista" />
      <section className="cuerpo">
        {error && <p className="error" role="alert">{error}</p>}
        {aviso && <p className="ok">{aviso}</p>}
        {r && (
          <>
            <div className="tarjeta">
              <span className="etiqueta">Propietario</span>
              <strong>{r.v?.propietario ?? 'Sin nombre'}</strong>
              <span className="etiqueta">Celular</span>
              <strong>{r.v?.celular ? verCelular(r.v.celular) : 'Sin celular'}</strong>
              <span className="etiqueta">Entrada</span>
              <strong>{fechaLarga(r.hora_entrada)}</strong>
              <span className="etiqueta">Estado</span>
              <strong>{r.hora_salida ? `Salió a las ${hora(r.hora_salida)}` : 'Dentro del parqueadero'}</strong>
            </div>
            <div className="dos">
              {r.v?.celular && <a className="secundario enlace" href={`tel:${r.v.celular}`}>Llamar</a>}
              {r.hora_salida
                ? <button className="secundario" type="button" onClick={() => cambiar({ hora_salida: null }, 'Salida deshecha.')}>Deshacer salida</button>
                : <button className="secundario" type="button" onClick={salida}>Marcar salida</button>}
            </div>
            {r.deja_llaves && (
              <div className="aviso"><b>Deja llaves</b><br />{r.ubicacion_llaves ?? 'Sin ubicación indicada'}</div>
            )}
            <label>
              Observaciones
              <textarea value={obs} maxLength={1000} onChange={(e) => setObs(e.target.value)} />
            </label>
            <button className="secundario" type="button" disabled={obs === (r.observaciones ?? '')} onClick={() => cambiar({ observaciones: obs.trim() || null }, 'Observaciones guardadas.')}>
              Guardar observaciones
            </button>
          </>
        )}
      </section>
    </main>
  )
}
