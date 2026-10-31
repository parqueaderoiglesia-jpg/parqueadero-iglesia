import { useState, type FormEvent } from 'react'
import { supabase } from '../lib/supabase'

export default function Login() {
  const [correo, setCorreo] = useState('')
  const [clave, setClave] = useState('')
  const [error, setError] = useState('')
  const [enviando, setEnviando] = useState(false)

  async function ingresar(e: FormEvent) {
    e.preventDefault()
    setError('')
    setEnviando(true)
    const { error } = await supabase.auth.signInWithPassword({ email: correo.trim(), password: clave })
    if (error) setError('Correo o contraseña incorrectos. Revisa los datos e inténtalo de nuevo.')
    setEnviando(false)
  }

  return (
    <main className="pantalla">
      <header className="cabecera">
        <p className="sub">Logística · Parqueaderos</p>
        <h1>Parqueadero Iglesia</h1>
      </header>
      <form className="cuerpo" onSubmit={ingresar}>
        <label>
          Correo
          <input type="email" autoComplete="username" required value={correo} onChange={(e) => setCorreo(e.target.value)} />
        </label>
        <label>
          Contraseña
          <input type="password" autoComplete="current-password" required value={clave} onChange={(e) => setClave(e.target.value)} />
        </label>
        {error && <p className="error" role="alert">{error}</p>}
        <button className="primario" type="submit" disabled={enviando}>
          {enviando ? 'Ingresando…' : 'Ingresar'}
        </button>
        <p className="nota">Si no tienes usuario, pídeselo al coordinador de logística.</p>
      </form>
    </main>
  )
}
