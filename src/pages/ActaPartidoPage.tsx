import { useState } from 'react'
import { Save, Plus, Trash2, AlertCircle, ArrowLeft } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { PageHeader } from '@/components/common/PageHeader'
import { 
  partidos, 
  getEquipoById,
  getCategoriaById,
  getJugadoresByEquipoId,
  arbitros,
} from '@/data/mockData'
import { formatDate } from '@/lib/utils'

interface ActaPartidoPageProps {
  onBack?: () => void
}

export function ActaPartidoPage({ onBack }: ActaPartidoPageProps) {
  const [selectedPartido, setSelectedPartido] = useState(partidos[0].id)
  const [golesLocal, setGolesLocal] = useState<{ jugadorId: string; minuto: number }[]>([
    { jugadorId: 'jug-1', minuto: 15 },
    { jugadorId: 'jug-2', minuto: 28 },
    { jugadorId: 'jug-1', minuto: 42 },
  ])
  const [golesVisitante, setGolesVisitante] = useState<{ jugadorId: string; minuto: number }[]>([
    { jugadorId: 'jug-13', minuto: 35 },
  ])
  const [tarjetasLocal, setTarjetasLocal] = useState<{ jugadorId: string; tipo: 'amarilla' | 'roja'; minuto: number }[]>([
    { jugadorId: 'jug-3', tipo: 'amarilla', minuto: 22 },
  ])
  const [tarjetasVisitante, setTarjetasVisitante] = useState<{ jugadorId: string; tipo: 'amarilla' | 'roja'; minuto: number }[]>([])
  const [arbitro, setArbitro] = useState('arb-1')
  const [notas, setNotas] = useState('')

  const partido = partidos.find(p => p.id === selectedPartido)
  const local = partido ? getEquipoById(partido.equipoLocalId) : null
  const visitante = partido ? getEquipoById(partido.equipoVisitanteId) : null
  const categoria = partido ? getCategoriaById(partido.categoriaId) : null
  const jugadoresLocal = local ? getJugadoresByEquipoId(local.id) : []
  const jugadoresVisitante = visitante ? getJugadoresByEquipoId(visitante.id) : []

  const partidosParaRegistrar = partidos.filter(p => p.estado === 'jugado' || p.estado === 'programado').slice(0, 10)

  const totalGolesLocal = golesLocal.length
  const totalGolesVisitante = golesVisitante.length

  return (
    <div className="space-y-6">
      <PageHeader
        title="Acta de Partido"
        description="Registra el resultado, goles, tarjetas y detalles del partido"
        actions={
          <div className="flex gap-2">
            {onBack && (
              <Button variant="outline" onClick={onBack}>
                <ArrowLeft className="mr-2 h-4 w-4" />
                Volver
              </Button>
            )}
            <Button>
              <Save className="mr-2 h-4 w-4" />
              Guardar Acta
            </Button>
          </div>
        }
      />

      {/* Match Selector */}
      <Card>
        <CardContent className="pt-6">
          <Label className="text-xs text-muted-foreground mb-2 block">Seleccionar Partido</Label>
          <Select value={selectedPartido} onValueChange={setSelectedPartido}>
            <SelectTrigger className="w-full md:w-96">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {partidosParaRegistrar.map(p => {
                const localTeam = getEquipoById(p.equipoLocalId)
                const visitanteTeam = getEquipoById(p.equipoVisitanteId)
                const cat = getCategoriaById(p.categoriaId)
                return (
                  <SelectItem key={p.id} value={p.id}>
                    <span className="flex items-center gap-2">
                      <Badge variant="outline" className="text-[10px]">{cat?.nombre}</Badge>
                      {localTeam?.nombre} vs {visitanteTeam?.nombre} - {formatDate(p.fecha)}
                    </span>
                  </SelectItem>
                )
              })}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {partido && local && visitante && (
        <>
          {/* Match Info */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Información del Partido</CardTitle>
                  <CardDescription>
                    {formatDate(partido.fecha)} - {partido.hora} - {partido.cancha}
                  </CardDescription>
                </div>
                <Badge 
                  variant="outline"
                  style={{ borderColor: categoria?.color, color: categoria?.color }}
                >
                  {categoria?.nombre}
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              {/* Score Display */}
              <div className="flex items-center justify-center gap-8 py-6">
                <div className="text-center">
                  <div 
                    className="flex h-16 w-16 items-center justify-center rounded-lg text-white font-bold text-xl mx-auto mb-2"
                    style={{ backgroundColor: local.color }}
                  >
                    {local.logoPlaceholder}
                  </div>
                  <p className="font-semibold">{local.nombre}</p>
                  <p className="text-xs text-muted-foreground">Local</p>
                </div>

                <div className="flex items-center justify-center gap-4">
                  <div className="text-center">
                    <p className="text-5xl font-bold">{totalGolesLocal}</p>
                  </div>
                  <span className="text-2xl text-muted-foreground">-</span>
                  <div className="text-center">
                    <p className="text-5xl font-bold">{totalGolesVisitante}</p>
                  </div>
                </div>

                <div className="text-center">
                  <div 
                    className="flex h-16 w-16 items-center justify-center rounded-lg text-white font-bold text-xl mx-auto mb-2"
                    style={{ backgroundColor: visitante.color }}
                  >
                    {visitante.logoPlaceholder}
                  </div>
                  <p className="font-semibold">{visitante.nombre}</p>
                  <p className="text-xs text-muted-foreground">Visitante</p>
                </div>
              </div>

              <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground bg-muted/50 rounded-lg py-2">
                <AlertCircle className="h-4 w-4" />
                El marcador se calcula automáticamente con los goles registrados
              </div>
            </CardContent>
          </Card>

          {/* Goals Grid */}
          <div className="grid gap-4 lg:grid-cols-2">
            {/* Local Goals */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base flex items-center gap-2">
                    <div 
                      className="w-4 h-4 rounded-full"
                      style={{ backgroundColor: local.color }}
                    />
                    Goles {local.nombre}
                  </CardTitle>
                  <Button variant="outline" size="sm">
                    <Plus className="h-4 w-4 mr-1" />
                    Agregar Gol
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {golesLocal.map((gol, idx) => {
                    const jugador = jugadoresLocal.find(j => j.id === gol.jugadorId)
                    return (
                      <div key={idx} className="flex items-center gap-2 p-2 rounded bg-muted/50">
                        <span className="text-sm font-medium min-w-[40px]">{gol.minuto}&apos;</span>
                        <Select defaultValue={gol.jugadorId}>
                          <SelectTrigger className="flex-1">
                            <SelectValue>{jugador?.nombre}</SelectValue>
                          </SelectTrigger>
                          <SelectContent>
                            {jugadoresLocal.map(j => (
                              <SelectItem key={j.id} value={j.id}>{j.nombre}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <Button variant="ghost" size="icon">
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    )
                  })}
                  {golesLocal.length === 0 && (
                    <p className="text-sm text-muted-foreground text-center py-4">
                      No hay goles registrados
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Visitante Goals */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base flex items-center gap-2">
                    <div 
                      className="w-4 h-4 rounded-full"
                      style={{ backgroundColor: visitante.color }}
                    />
                    Goles {visitante.nombre}
                  </CardTitle>
                  <Button variant="outline" size="sm">
                    <Plus className="h-4 w-4 mr-1" />
                    Agregar Gol
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {golesVisitante.map((gol, idx) => {
                    const jugador = jugadoresVisitante.find(j => j.id === gol.jugadorId)
                    return (
                      <div key={idx} className="flex items-center gap-2 p-2 rounded bg-muted/50">
                        <span className="text-sm font-medium min-w-[40px]">{gol.minuto}&apos;</span>
                        <Select defaultValue={gol.jugadorId}>
                          <SelectTrigger className="flex-1">
                            <SelectValue>{jugador?.nombre}</SelectValue>
                          </SelectTrigger>
                          <SelectContent>
                            {jugadoresVisitante.map(j => (
                              <SelectItem key={j.id} value={j.id}>{j.nombre}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <Button variant="ghost" size="icon">
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    )
                  })}
                  {golesVisitante.length === 0 && (
                    <p className="text-sm text-muted-foreground text-center py-4">
                      No hay goles registrados
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Cards Grid */}
          <div className="grid gap-4 lg:grid-cols-2">
            {/* Local Cards */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">Tarjetas {local.nombre}</CardTitle>
                  <Button variant="outline" size="sm">
                    <Plus className="h-4 w-4 mr-1" />
                    Agregar Tarjeta
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {tarjetasLocal.map((tarjeta, idx) => {
                    const jugador = jugadoresLocal.find(j => j.id === tarjeta.jugadorId)
                    return (
                      <div key={idx} className="flex items-center gap-2 p-2 rounded bg-muted/50">
                        <span className="text-sm font-medium min-w-[40px]">{tarjeta.minuto}&apos;</span>
                        <Badge variant={tarjeta.tipo === 'amarilla' ? 'outline' : 'destructive'} 
                          className={tarjeta.tipo === 'amarilla' ? 'bg-yellow-100 text-yellow-800 border-yellow-300' : ''}>
                          {tarjeta.tipo === 'amarilla' ? 'Amarilla' : 'Roja'}
                        </Badge>
                        <span className="flex-1 text-sm">{jugador?.nombre}</span>
                        <Button variant="ghost" size="icon">
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    )
                  })}
                  {tarjetasLocal.length === 0 && (
                    <p className="text-sm text-muted-foreground text-center py-4">
                      No hay tarjetas registradas
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Visitante Cards */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">Tarjetas {visitante.nombre}</CardTitle>
                  <Button variant="outline" size="sm">
                    <Plus className="h-4 w-4 mr-1" />
                    Agregar Tarjeta
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {tarjetasVisitante.length === 0 && (
                    <p className="text-sm text-muted-foreground text-center py-4">
                      No hay tarjetas registradas
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Referee and Notes */}
          <div className="grid gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Arbitraje</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Árbitro</Label>
                  <Select value={arbitro} onValueChange={setArbitro}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {arbitros.map(a => (
                        <SelectItem key={a.id} value={a.id}>
                          {a.nombre} - {a.escuelaArbitral}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="p-3 rounded bg-muted/50">
                  <p className="text-xs text-muted-foreground">Escuela Arbitral</p>
                  <p className="text-sm font-medium">
                    {arbitros.find(a => a.id === arbitro)?.escuelaArbitral}
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Notas del Partido</CardTitle>
              </CardHeader>
              <CardContent>
                <Textarea
                  placeholder="Observaciones, incidencias, comentarios..."
                  value={notas}
                  onChange={(e) => setNotas(e.target.value)}
                  className="min-h-[120px]"
                />
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </div>
  )
}
