export const limpiarPlaca = (s: string) => s.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 7)

export function limpiarCelular(s: string) {
  let d = s.replace(/\D/g, '')
  if (d.length === 12 && d.startsWith('57')) d = d.slice(2)
  return d
}
export const celularValido = (d: string) => /^3\d{9}$/.test(d)
export const verCelular = (d: string) => (d.length === 10 ? `${d.slice(0, 3)} ${d.slice(3, 6)} ${d.slice(6)}` : d)

const ZONA = 'America/Bogota'
export const hora = (iso: string) =>
  new Date(iso).toLocaleTimeString('es-CO', { hour: 'numeric', minute: '2-digit', timeZone: ZONA })
export const fechaLarga = (iso: string) =>
  new Date(iso).toLocaleString('es-CO', {
    weekday: 'long', day: 'numeric', month: 'long', hour: 'numeric', minute: '2-digit', timeZone: ZONA,
  })

type S = { id: string; inicio: string; fin: string }
export function servicioSugerido<T extends S>(lista: T[]): T | null {
  const ahora = Date.now()
  return (
    lista.find((x) => Date.parse(x.inicio) <= ahora && ahora <= Date.parse(x.fin)) ??
    lista.find((x) => Date.parse(x.inicio) > ahora) ??
    lista[lista.length - 1] ??
    null
  )
}
