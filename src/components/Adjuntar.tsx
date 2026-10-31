import { useRef, useState, type ChangeEvent } from 'react'
import { preparar, type Preparado } from '../lib/media'

export default function Adjuntar({ onListos, deshabilitado }: { onListos: (p: Preparado[]) => void; deshabilitado?: boolean }) {
  const foto = useRef<HTMLInputElement>(null)
  const video = useRef<HTMLInputElement>(null)
  const galeria = useRef<HTMLInputElement>(null)
  const [error, setError] = useState('')
  const [procesando, setProcesando] = useState(false)

  async function elegidos(e: ChangeEvent<HTMLInputElement>) {
    const archivos = Array.from(e.target.files ?? [])
    e.target.value = ''
    if (!archivos.length) return
    setError('')
    setProcesando(true)
    const listos: Preparado[] = []
    for (const f of archivos) {
      try { listos.push(await preparar(f)) } catch (err) { setError((err as Error).message) }
    }
    setProcesando(false)
    if (listos.length) onListos(listos)
  }
  const off = deshabilitado || procesando

  return (
    <div className="grupo">
      <div className="dos">
        <button type="button" className="secundario" disabled={off} onClick={() => foto.current?.click()}>Tomar foto</button>
        <button type="button" className="secundario" disabled={off} onClick={() => video.current?.click()}>Grabar video</button>
      </div>
      <button type="button" className="enlace-texto" disabled={off} onClick={() => galeria.current?.click()}>Elegir de la galería</button>
      <input ref={foto} type="file" accept="image/*" capture="environment" hidden onChange={elegidos} />
      <input ref={video} type="file" accept="video/*" capture="environment" hidden onChange={elegidos} />
      <input ref={galeria} type="file" accept="image/*,video/*" multiple hidden onChange={elegidos} />
      {procesando && <p className="nota">Preparando archivo…</p>}
      {error && <p className="error" role="alert">{error}</p>}
    </div>
  )
}
