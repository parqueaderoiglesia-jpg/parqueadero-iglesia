import { Link } from 'react-router-dom'

export default function Cabecera({ titulo, sub, atras }: { titulo: string; sub?: string; atras?: string }) {
  return (
    <header className="cabecera">
      {atras && <Link to={atras} className="volver">← Volver</Link>}
      {sub && <p className="sub">{sub}</p>}
      <h1>{titulo}</h1>
    </header>
  )
}
