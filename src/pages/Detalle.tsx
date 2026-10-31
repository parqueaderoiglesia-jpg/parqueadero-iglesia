import { useCallback, useEffect, useState } from 'react'
import { useLocation, useParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { fechaLarga, hora, verCelular } from '../lib/util'
import Cabecera from '../components/Cabecera'
import Adjuntar from '../components/Adjuntar'
import { subir, type Preparado } from '../lib/media'

type Reg = {
  id: string; hora_entrada: string; hora_salida: string | null; deja_llaves: boolean
  ubicacion_llaves: string | null
  v: { placa: string; propietario: string | null; celular: string | null }
}
type Obs = { id: string; tipo: 'entrada' | 'salida' | 'nota'; texto: string; autor_nombre: string; created_at: string }

const TIPOS = { entrada: 'Entrada', salida: 'Salida', nota: 'Nota' }
const COLOR = { entrada: 'verde', salida: 'gris', nota: 'ambar' }
const cuando = (iso: string) =>
  new Date(iso).toLocaleString('es-CO', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit', timeZone: 'America/Bogota' })

export default function Detalle() {
  const { id } = useParams()
  const fallos = (useLocation().state as { fallos?: number } | null)?.fallos
  const [galeria, setGaleria] = useState<{ id: string; tipo: string; url: string }[]>([])
  const [subiendo, setSubiendo] = useState('')
  const [r, setR] = useState<Reg | null>(null)
  const [historial, setHistorial] = useState<Obs[]>([])
  const [saliendo, setSaliendo] = useState(false)
  const [textoSalida, setTextoSalida] = useState('')
  const [nota, setNota] = useState('')
  const [ocupado, setOcupado] = useState(false)
  const [error, setError] = useState('')
  const [aviso, setAviso] = useState('')
  const [cargando, setCargando] = useState(true)

  const cargar = useCallback(async () => {
    const [q, h] = await Promise.all([
      supabase
        .from('registros')
        .select('id,hora_entrada,hora_salida,deja_llaves,ubicacion_llaves,vehiculos(placa,propietario,celular)')
        .eq('id', id!)
        .single(),
      supabase
        .from('observaciones')
        .select('id,tipo,texto,autor_nombre,created_at')
        .eq('registro_id', id!)
        .order('created_at', { ascending: true }),
    ])
    setCargando(false)
    if (q.error || !q.data) { setError('No se encontró este registro o no tienes acceso a él.'); return }
    const d = q.data as any
    setR({ ...d, v: Array.isArray(d.vehiculos) ? d.vehiculos[0] : d.vehiculos })
    setHistorial((h.data ?? []) as Obs[])
    const a = await supabase.from('adjuntos').select('id,ruta,tipo').eq('registro_id', id!).order('created_at', { ascending: true })
    const lista = (a.data ?? []) as { id: string; ruta: string; tipo: string }[]
    if (lista.length) {
      const f = await supabase.storage.from('adjuntos').createSignedUrls(lista.map((x) => x.ruta), 3600)
      setGaleria(lista.map((x, i) => ({ id: x.id, tipo: x.tipo, url: f.data?.[i]?.signedUrl ?? '' })).filter((x) => x.url))
    } else setGaleria([])
  }, [id])

  useEffect(() => { cargar() }, [cargar])

  async function ejecutar(accion: () => PromiseLike<{ error: { code?: string } | null }>, ok: string, alExito?: () => void) {
    setError(''); setAviso(''); setOcupado(true)
    const res = await accion()
    setOcupado(false)
    if (res.error) {
      setError(res.error.code === '23505'
        ? 'Este vehículo ya tiene otro registro abierto en este servicio, por eso no se puede deshacer la salida.'
        : 'No se pudo guardar el cambio. Revisa tu conexión e inténtalo de nuevo.')
      return
    }
    setAviso(ok)
    alExito?.()
    cargar()
  }

  const confirmarSalida = () =>
    ejecutar(() => supabase.rpc('marcar_salida', { p_registro_id: id, p_observacion: textoSalida.trim() || null }), 'Salida registrada.', () => { setSaliendo(false); setTextoSalida('') })
  const deshacer = () => ejecutar(() => supabase.rpc('deshacer_salida', { p_registro_id: id }), 'Salida deshecha.')
  const agregarNota = () =>
    ejecutar(() => supabase.from('observaciones').insert({ registro_id: id, tipo: 'nota', texto: nota.trim() }), 'Observación agregada al historial.', () => setNota(''))

  async function agregarArchivos(n: Preparado[]) {
    setError(''); setAviso(''); setOcupado(true)
    let malos = 0
    for (let i = 0; i < n.length; i++) {
      setSubiendo(`Subiendo archivo ${i + 1} de ${n.length}…`)
      if (!(await subir(id!, n[i]))) malos++
    }
    setSubiendo(''); setOcupado(false)
    if (malos) setError(`No se pudieron subir ${malos} archivo(s). Revisa tu conexión e inténtalo de nuevo.`)
    else setAviso('Archivos agregados.')
    cargar()
  }

  if (cargando) return <p className="centro">Cargando…</p>
  return (
    <main className="pantalla">
      <Cabecera titulo={r?.v?.placa ?? 'Registro'} sub="Detalle del vehículo" atras="/lista" />
      <section className="cuerpo">
        {error && <p className="error" role="alert">{error}</p>}
        {aviso && <p className="ok">{aviso}</p>}
        {fallos ? <p className="aviso">No se pudieron subir {fallos} archivo(s) al registrar. Agrégalos de nuevo desde aquí.</p> : null}
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
            {r.deja_llaves && (
              <div className="aviso"><b>Deja llaves</b><br />{r.ubicacion_llaves ?? 'Sin ubicación indicada'}</div>
            )}
            <div className="dos">
              {r.v?.celular && <a className="secundario enlace" href={`tel:${r.v.celular}`}>Llamar</a>}
              {r.hora_salida
                ? <button className="secundario" type="button" disabled={ocupado} onClick={deshacer}>Deshacer salida</button>
                : <button className="secundario" type="button" disabled={ocupado || saliendo} onClick={() => setSaliendo(true)}>Marcar salida</button>}
            </div>
            {saliendo && (
              <div className="panel">
                <label>
                  Observación de salida (opcional)
                  <textarea value={textoSalida} maxLength={1000} placeholder="Ej.: sale sin novedad" onChange={(e) => setTextoSalida(e.target.value)} />
                </label>
                <button className="primario" type="button" disabled={ocupado} onClick={confirmarSalida}>Confirmar salida</button>
                <button className="secundario" type="button" disabled={ocupado} onClick={() => setSaliendo(false)}>Cancelar</button>
              </div>
            )}
            <h2 className="sec">Fotos y videos</h2>
            {galeria.length > 0 ? (
              <div className="miniaturas grande">
                {galeria.map((g) => g.tipo === 'foto' ? (
                  <a key={g.id} className="mini" href={g.url} target="_blank" rel="noreferrer"><img src={g.url} alt="Foto del vehículo" loading="lazy" /></a>
                ) : (
                  <div key={g.id} className="mini"><video src={g.url} controls playsInline preload="metadata" /></div>
                ))}
              </div>
            ) : <p className="nota">Este registro todavía no tiene fotos ni videos.</p>}
            <Adjuntar deshabilitado={ocupado} onListos={agregarArchivos} />
            {subiendo && <p className="nota">{subiendo}</p>}
            <h2 className="sec">Historial de observaciones</h2>
            <ol className="historial">
              {historial.map((o) => (
                <li key={o.id}>
                  <div className="enc">
                    <span className={`badge ${COLOR[o.tipo]}`}>{TIPOS[o.tipo]}</span>
                    <span className="detalle">{cuando(o.created_at)}{o.autor_nombre ? ` · ${o.autor_nombre}` : ''}</span>
                  </div>
                  <p>{o.texto}</p>
                </li>
              ))}
              {historial.length === 0 && <p className="nota">Todavía no hay observaciones en este registro.</p>}
            </ol>
            <div className="panel">
              <label>
                Agregar observación
                <textarea value={nota} maxLength={1000} placeholder="Ej.: se avisó al propietario" onChange={(e) => setNota(e.target.value)} />
              </label>
              <button className="secundario" type="button" disabled={ocupado || !nota.trim()} onClick={agregarNota}>Agregar al historial</button>
            </div>
          </>
        )}
      </section>
    </main>
  )
}
