import { formatDate } from '@/lib/utils'
import { displayImagePresets, resolveDisplayImageUrl } from '@/features/uploads/uploadService'

const DEF_LABEL: Record<string, string> = {
  tiempo_reglamentario: 'Tiempo reglamentario',
  tiempo_extra: 'Tiempo extra',
  penales: 'Penales',
  walkover: 'Walkover / W',
  suspendido: 'Suspendido',
}

export type ActaPrintJugador = { nombre: string; rol: 'titular' | 'ingreso_cambio' }
export type ActaPrintGol = { jugador: string; minuto: string; tipo: string }
export type ActaPrintTarjeta = { jugador: string; tipo: string; minuto: string; motivo?: string }
export type ActaPrintCambio = { sale: string; entra: string; minuto: string }

export type ActaPrintDocumentProps = {
  torneoNombre: string
  categoriaNombre: string
  faseNombre?: string | null
  jornada?: number | null
  fecha?: string | null
  hora?: string | null
  cancha?: string | null
  localNombre: string
  visitNombre: string
  localLogoUrl?: string | null
  localLogoPublicId?: string | null
  visitLogoUrl?: string | null
  visitLogoPublicId?: string | null
  localColor: string
  visitColor: string
  golesLocal: number
  golesVisitante: number
  penalesLocal?: number | null
  penalesVisitante?: number | null
  definicion: string
  arbitroNombre?: string | null
  escuelaArbitral?: string | null
  observaciones?: string | null
  titularesLocal: ActaPrintJugador[]
  titularesVisitante: ActaPrintJugador[]
  cambios: ActaPrintCambio[]
  goles: ActaPrintGol[]
  tarjetas: ActaPrintTarjeta[]
}

function TeamLogo({
  nombre,
  color,
  logoUrl,
  logoPublicId,
}: {
  nombre: string
  color: string
  logoUrl?: string | null
  logoPublicId?: string | null
}) {
  const src = resolveDisplayImageUrl(logoPublicId, logoUrl, displayImagePresets.equipoLogo())
  if (src) {
    return <img src={src} alt="" className="mx-auto h-20 w-20 rounded-lg border object-cover" crossOrigin="anonymous" />
  }
  const ph = (nombre || '?').slice(0, 2).toUpperCase()
  return (
    <div
      className="mx-auto flex h-20 w-20 items-center justify-center rounded-lg text-xl font-bold text-white"
      style={{ backgroundColor: color }}
    >
      {ph}
    </div>
  )
}

function ListaJugadores({ titulo, items }: { titulo: string; items: ActaPrintJugador[] }) {
  const titulares = items.filter((j) => j.rol === 'titular')
  const ingresos = items.filter((j) => j.rol === 'ingreso_cambio')
  return (
    <div>
      <h4 className="mb-2 border-b pb-1 text-sm font-semibold">{titulo}</h4>
      <p className="text-xs font-medium text-gray-600">Titulares</p>
      <ul className="mb-2 list-inside list-disc text-sm">
        {titulares.length ? titulares.map((j, i) => <li key={i}>{j.nombre}</li>) : <li className="text-gray-500">—</li>}
      </ul>
      {ingresos.length > 0 && (
        <>
          <p className="text-xs font-medium text-gray-600">Ingresos por cambio</p>
          <ul className="list-inside list-disc text-sm">
            {ingresos.map((j, i) => (
              <li key={i}>{j.nombre}</li>
            ))}
          </ul>
        </>
      )}
    </div>
  )
}

export function ActaPrintDocument(props: ActaPrintDocumentProps) {
  const {
    torneoNombre,
    categoriaNombre,
    faseNombre,
    jornada,
    fecha,
    hora,
    cancha,
    localNombre,
    visitNombre,
    localLogoUrl,
    localLogoPublicId,
    visitLogoUrl,
    visitLogoPublicId,
    localColor,
    visitColor,
    golesLocal,
    golesVisitante,
    penalesLocal,
    penalesVisitante,
    definicion,
    arbitroNombre,
    escuelaArbitral,
    observaciones,
    titularesLocal,
    titularesVisitante,
    cambios,
    goles,
    tarjetas,
  } = props

  const generado = new Date().toLocaleString('es-CO', { dateStyle: 'medium', timeStyle: 'short' })

  return (
    <div
      className="acta-print-root bg-white p-8 text-gray-900"
      style={{ width: 794, fontFamily: 'system-ui, sans-serif' }}
    >
      <header className="mb-6 border-b-2 border-gray-800 pb-4 text-center">
        <h1 className="text-2xl font-bold uppercase tracking-wide">{torneoNombre}</h1>
        <p className="mt-1 text-sm font-medium">{categoriaNombre}</p>
        {faseNombre && <p className="text-sm text-gray-600">Fase: {faseNombre}</p>}
        <p className="mt-2 text-xs text-gray-600">
          Jornada {jornada ?? '—'} · {fecha ? formatDate(fecha) : '—'} · {hora || '—'} · {cancha || '—'}
        </p>
      </header>

      <div className="mb-8 grid grid-cols-[1fr_auto_1fr] items-center gap-4">
        <div className="text-center">
          <TeamLogo nombre={localNombre} color={localColor} logoUrl={localLogoUrl} logoPublicId={localLogoPublicId} />
          <p className="mt-3 text-base font-bold">{localNombre}</p>
          <p className="text-xs text-gray-500">Local</p>
        </div>
        <div className="text-center px-4">
          <p className="text-4xl font-bold tabular-nums">
            {golesLocal} <span className="text-gray-400">-</span> {golesVisitante}
          </p>
          {definicion === 'penales' && penalesLocal != null && penalesVisitante != null && (
            <p className="mt-1 text-sm text-gray-600">
              Penales ({penalesLocal}) - ({penalesVisitante})
            </p>
          )}
          {definicion === 'walkover' && (
            <p className="mt-1 text-sm text-gray-600">
              Ganador por W. Resultado administrativo: 3 - 0
            </p>
          )}
          <p className="mt-2 text-xs font-medium uppercase text-gray-600">
            {DEF_LABEL[definicion] ?? definicion}
          </p>
        </div>
        <div className="text-center">
          <TeamLogo nombre={visitNombre} color={visitColor} logoUrl={visitLogoUrl} logoPublicId={visitLogoPublicId} />
          <p className="mt-3 text-base font-bold">{visitNombre}</p>
          <p className="text-xs text-gray-500">Visitante</p>
        </div>
      </div>

      <div className="mb-6 grid grid-cols-2 gap-6">
        <ListaJugadores titulo={localNombre} items={titularesLocal} />
        <ListaJugadores titulo={visitNombre} items={titularesVisitante} />
      </div>

      {cambios.length > 0 && (
        <section className="mb-6">
          <h3 className="mb-2 border-b pb-1 text-sm font-semibold">Sustituciones</h3>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-xs text-gray-600">
                <th className="py-1">Sale</th>
                <th>Entra</th>
                <th>Min</th>
              </tr>
            </thead>
            <tbody>
              {cambios.map((c, i) => (
                <tr key={i} className="border-b border-gray-100">
                  <td className="py-1">{c.sale}</td>
                  <td>{c.entra}</td>
                  <td>{c.minuto || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}

      {goles.length > 0 && (
        <section className="mb-6">
          <h3 className="mb-2 border-b pb-1 text-sm font-semibold">Goles</h3>
          <ul className="space-y-1 text-sm">
            {goles.map((g, i) => (
              <li key={i}>
                {g.jugador} — min {g.minuto || '—'} ({g.tipo})
              </li>
            ))}
          </ul>
        </section>
      )}

      {tarjetas.length > 0 && (
        <section className="mb-6">
          <h3 className="mb-2 border-b pb-1 text-sm font-semibold">Tarjetas</h3>
          <ul className="space-y-1 text-sm">
            {tarjetas.map((t, i) => (
              <li key={i}>
                {t.jugador} — {t.tipo} min {t.minuto || '—'}
                {t.motivo ? ` (${t.motivo})` : ''}
              </li>
            ))}
          </ul>
        </section>
      )}

      <footer className="mt-8 border-t pt-4 text-sm">
        <p>
          <span className="font-medium">Árbitro:</span> {arbitroNombre || '—'}
        </p>
        <p>
          <span className="font-medium">Escuela arbitral:</span> {escuelaArbitral || '—'}
        </p>
        {observaciones && (
          <p className="mt-2">
            <span className="font-medium">Observaciones:</span> {observaciones}
          </p>
        )}
        <p className="mt-4 text-xs text-gray-500">Documento generado el {generado}</p>
      </footer>
    </div>
  )
}
