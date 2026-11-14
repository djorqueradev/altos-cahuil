// Se vuelve a montar en cada navegación: fundido suave entre páginas.
export default function Template({ children }: { children: React.ReactNode }) {
  return <div className="fx-page">{children}</div>
}
