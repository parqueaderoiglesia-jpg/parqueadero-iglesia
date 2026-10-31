import { useEffect, useState, type FormEvent } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useTurno } from '../lib/turno'
import { celularValido, limpiarCelular, limpiarPlaca } from '../lib/util'
import Cabecera from '../components/Cabecera'

function mensaje(codigo?: string) {
  if (codigo === '23505') return 'Este vehículo ya está registrado en este servicio y todavía no ha salido.'
  if (codigo === '42501') return 'No tienes permiso para registrar en este parqueadero.'
  if (codigo === '23514') return 'Hay un dato con formato inválido. Revisa la placa y el celular.'
  return 'No se pudo registrar. Revisa tu conexión e inténtalo de nuevo.'
}

export default function Registro() {
  const nav = useNavigate()
  const { parqueadero, parqueaderoId, servicio, servicioId, cargando } = useTurno()
  const [placa, setPlaca] = useState('')
  const [nombre, setNombre] = useState('')
  const [celular, setCelular] = useState('')
  const [llaves, setLlaves] = useState(false)
  const [ubic, setUbic] = useState('')
  const [obs, setObs] = useState('')
  const [conocido, setConocido] = useState(false)
  const [error, setError] = useState('')
  const [enviando, setEnviando] = useState(false)

  useEffect(() => {
    if (placa.length < 5) { setConocido(false); return }
    let vivo = true
    supabase.rpc('buscar_vehiculo', { p_placa: placa }).then(({ data }) => {
      if (!vivo) return
      const v = Array.isArray(data) ? data[0] : null
      setConocido(!!v)
      if (v) {
        setNombre((n) => n || v.propietario || '')
        setCelular((c) => c || v.celular || '')
      }
    })
    return () => { vivo = false }
  }, [placa])

  if (cargando) return <p className="centro">Cargando…</p>
  if (!parqueaderoId || !servicioId) return <Navigate to="/" replace />

  async function guardar(e: FormEvent) {
    e.preventDefault()
    setError('')
    const cel = limpiarCelular(celular)
    if (!/^[A-Z0-9]{5,7}$/.test(placa)) return setError('La placa debe tener entre 5 y 7 letras o números.')
    if (!nombre.trim()) return setError('Escribe el nombre del propietario.')
    if (!celularValido(cel)) return setError('El celular debe tener 10 dígitos y empezar por 3.')
    if (llaves && !ubic.trim()) return setError('Indica dónde quedan las llaves.')
    setEnviando(true)
    const r = await supabase.rpc('registrar_entrada', {
      p_placa: placa,
      p_tipo: parqueadero?.tipo ?? 'carro',
      p_propietario: nombre.trim(),
      p_celular: cel,
      p_deja_llaves: llaves,
      p_ubicacion_llaves: llaves ? ubic.trim() : null,
      p_observaciones: obs.trim() || null,
      p_servicio_id: servicioId,
      p_parqueadero_id: parqueaderoId,
    })
    setEnviando(false)
    if (r.error) return setError(mensaje(r.error.code))
    nav('/lista')
  }

  return (
    <main className="pantalla">
      <Cabecera sub={`${parqueadero?.nombre ?? ''} · ${servicio?.nombre ?? ''}`} titulo="Nuevo registro" atras="/lista" />
      <form className="cuerpo" onSubmit={guardar}>
        <label>
          Placa
          <input className="placa-input" value={placa} autoCapitalize="characters" autoComplete="off" onChange={(e) => setPlaca(limpiarPlaca(e.target.value))} />
        </label>
        {conocido && <p className="ok caja-ok">Vehículo conocido: datos completados automáticamente.</p>}
        <label>
          Nombre del propietario
          <input value={nombre} maxLength={100} onChange={(e) => setNombre(e.target.value)} />
        </label>
        <label>
          Celular
          <input type="tel" inputMode="numeric" value={celular} placeholder="310 555 0142" onChange={(e) => setCelular(e.target.value)} />
        </label>
        <div className="grupo">
          <span className="titulo-grupo">¿Deja llaves?</span>
          <div className="dos">
            <button type="button" className="chip grande" aria-pressed={llaves} onClick={() => setLlaves(true)}>Sí, deja llaves</button>
            <button type="button" className="chip grande" aria-pressed={!llaves} onClick={() => setLlaves(false)}>No deja</button>
          </div>
        </div>
        {llaves && (
          <label>
            ¿Dónde quedan las llaves?
            <input value={ubic} maxLength={100} placeholder="Ej.: gancho 14" onChange={(e) => setUbic(e.target.value)} />
          </label>
        )}
        <label>
          Observaciones de entrada (opcional)
          <textarea value={obs} maxLength={1000} placeholder="Rayones, objetos a la vista…" onChange={(e) => setObs(e.target.value)} />
        </label>
        <p className="nota">Las fotos y el video se agregan en la siguiente etapa.</p>
        {error && <p className="error" role="alert">{error}</p>}
        <button className="primario" type="submit" disabled={enviando}>{enviando ? 'Registrando…' : 'Registrar entrada'}</button>
      </form>
    </main>
  )
}
