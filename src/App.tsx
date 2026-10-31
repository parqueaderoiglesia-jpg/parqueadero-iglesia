import { HashRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AuthProvider, useAuth } from './lib/auth'
import { TurnoProvider } from './lib/turno'
import Login from './pages/Login'
import Home from './pages/Home'
import Lista from './pages/Lista'
import Registro from './pages/Registro'
import Detalle from './pages/Detalle'

function Rutas() {
  const { session, loading } = useAuth()
  if (loading) return <p className="centro">Cargando…</p>
  if (!session) return <Login />
  return (
    <TurnoProvider>
      <HashRouter>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/lista" element={<Lista />} />
          <Route path="/registrar" element={<Registro />} />
          <Route path="/vehiculo/:id" element={<Detalle />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </HashRouter>
    </TurnoProvider>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <Rutas />
    </AuthProvider>
  )
}
