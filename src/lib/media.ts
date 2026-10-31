import { supabase } from './supabase'

export type Preparado = {
  id: string; blob: Blob; tipo: 'foto' | 'video'; ext: string; contentType: string; bytes: number; preview: string
}

const MAX_VIDEO = 50 * 1024 * 1024
const VIDEOS = ['video/mp4', 'video/quicktime', 'video/webm']

async function comprimir(file: File): Promise<Blob> {
  const bmp = await createImageBitmap(file, { imageOrientation: 'from-image' } as ImageBitmapOptions)
  const escala = Math.min(1, 1600 / Math.max(bmp.width, bmp.height))
  const w = Math.round(bmp.width * escala)
  const h = Math.round(bmp.height * escala)
  const c = document.createElement('canvas')
  c.width = w
  c.height = h
  c.getContext('2d')!.drawImage(bmp, 0, 0, w, h)
  bmp.close?.()
  return new Promise((ok, mal) => c.toBlob((b) => (b ? ok(b) : mal(new Error('sin imagen'))), 'image/jpeg', 0.8))
}

export async function preparar(file: File): Promise<Preparado> {
  const id = crypto.randomUUID()
  if (file.type.startsWith('image/')) {
    let blob: Blob
    try { blob = await comprimir(file) } catch { throw new Error('No se pudo procesar la foto. Inténtalo de nuevo.') }
    return { id, blob, tipo: 'foto', ext: 'jpg', contentType: 'image/jpeg', bytes: blob.size, preview: URL.createObjectURL(blob) }
  }
  if (file.type.startsWith('video/')) {
    if (!VIDEOS.includes(file.type)) throw new Error('Formato de video no admitido. Usa MP4, MOV o WebM.')
    if (file.size > MAX_VIDEO) throw new Error('El video pesa más de 50 MB. Graba uno más corto (unos 10 a 15 segundos).')
    const ext = file.type.includes('quicktime') ? 'mov' : file.type.includes('webm') ? 'webm' : 'mp4'
    return { id, blob: file, tipo: 'video', ext, contentType: file.type, bytes: file.size, preview: URL.createObjectURL(file) }
  }
  throw new Error('Solo se aceptan fotos y videos.')
}

// Sube el archivo al almacenamiento privado y lo anota en la tabla adjuntos. Reintenta hasta 3 veces.
export async function subir(registroId: string, p: Preparado): Promise<boolean> {
  const ruta = `${registroId}/${p.id}.${p.ext}`
  for (let i = 0; i < 3; i++) {
    const up = await supabase.storage.from('adjuntos').upload(ruta, p.blob, { contentType: p.contentType, upsert: false })
    if (!up.error || /already exists|duplicate/i.test(up.error.message)) {
      const ins = await supabase.from('adjuntos').insert({ registro_id: registroId, ruta, tipo: p.tipo, tamano_bytes: p.bytes })
      if (!ins.error || ins.error.code === '23505') return true
    }
    await new Promise((r) => setTimeout(r, 800 * (i + 1)))
  }
  return false
}
