import { useState } from 'react'
import { Trophy, Target, AlertTriangle } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { PageHeader } from '@/components/common/PageHeader'
import { 
  categorias, 
  getEstadisticasByCategoriaId,
  getEquipoById,
  goleadores,
  tarjetasMock,
} from '@/data/mockData'

export function EstadisticasPage() {
  const [selectedCategoria, setSelectedCategoria] = useState(categorias[1].id)
  const [activeTab, setActiveTab] = useState('posiciones')
  
  const estadisticas = getEstadisticasByCategoriaId(selectedCategoria)
  const categoria = categorias.find(c => c.id === selectedCategoria)
  const lider = estadisticas[0]
  const equipoLider = lider ? getEquipoById(lider.equipoId) : null

  return (
    <div className="space-y-6">
      <PageHeader
        title="Estadísticas"
        description="Tabla de posiciones, goleadores y disciplina del torneo"
      />

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <TabsList>
            <TabsTrigger value="posiciones">Tabla de Posiciones</TabsTrigger>
            <TabsTrigger value="goleadores">Goleadores</TabsTrigger>
            <TabsTrigger value="disciplina">Disciplina</TabsTrigger>
          </TabsList>

          <Select value={selectedCategoria} onValueChange={setSelectedCategoria}>
            <SelectTrigger className="w-full md:w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {categorias.filter(c => c.activa).map(cat => (
                <SelectItem key={cat.id} value={cat.id}>
                  <div className="flex items-center gap-2">
                    <div 
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: cat.color }}
                    />
                    {cat.nombre}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Tabla de Posiciones */}
        <TabsContent value="posiciones" className="space-y-4">
          {/* Leader Podium */}
          {equipoLider && (
            <Card className="bg-gradient-to-r from-primary/10 via-primary/5 to-transparent border-primary/20">
              <CardContent className="py-6">
                <div className="flex items-center gap-6">
                  <div className="flex h-20 w-20 items-center justify-center rounded-xl bg-primary/20">
                    <Trophy className="h-10 w-10 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Líder {categoria?.nombre}</p>
                    <h3 className="text-2xl font-bold flex items-center gap-3">
                      <div 
                        className="w-5 h-5 rounded-full"
                        style={{ backgroundColor: equipoLider.color }}
                      />
                      {equipoLider.nombre}
                    </h3>
                    <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                      <span><strong>{lider.pts}</strong> puntos</span>
                      <span><strong>{lider.pj}</strong> PJ</span>
                      <span><strong>+{lider.dg}</strong> DG</span>
                      <span className="flex items-center gap-1">
                        {lider.forma.map((f, i) => (
                          <span 
                            key={i} 
                            className={`w-5 h-5 rounded text-xs flex items-center justify-center font-medium text-white
                              ${f === 'V' ? 'bg-success' : f === 'E' ? 'bg-warning' : 'bg-destructive'}`}
                          >
                            {f}
                          </span>
                        ))}
                      </span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Standings Table */}
          <Card>
            <CardHeader>
              <CardTitle>Tabla de Posiciones - {categoria?.nombre}</CardTitle>
              <CardDescription>
                Clasificación general de la fase regular
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12 text-center">Pos</TableHead>
                    <TableHead>Equipo</TableHead>
                    <TableHead className="text-center">PJ</TableHead>
                    <TableHead className="text-center">PG</TableHead>
                    <TableHead className="text-center">PE</TableHead>
                    <TableHead className="text-center">PP</TableHead>
                    <TableHead className="text-center">GF</TableHead>
                    <TableHead className="text-center">GC</TableHead>
                    <TableHead className="text-center">DG</TableHead>
                    <TableHead className="text-center">PTS</TableHead>
                    <TableHead className="text-center">Forma</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {estadisticas.map((est, index) => {
                    const equipo = getEquipoById(est.equipoId)
                    const isTop = index < 4
                    const isBottom = index >= estadisticas.length - 2

                    return (
                      <TableRow 
                        key={est.equipoId}
                        className={isTop ? 'bg-success/5' : isBottom ? 'bg-destructive/5' : ''}
                      >
                        <TableCell className="text-center font-bold">
                          <span className={`inline-flex items-center justify-center w-7 h-7 rounded-full text-sm
                            ${index === 0 ? 'bg-yellow-100 text-yellow-800' : 
                              index === 1 ? 'bg-gray-100 text-gray-800' : 
                              index === 2 ? 'bg-amber-100 text-amber-800' : ''}`}>
                            {index + 1}
                          </span>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <div 
                              className="flex h-8 w-8 items-center justify-center rounded text-white text-xs font-bold"
                              style={{ backgroundColor: equipo?.color }}
                            >
                              {equipo?.logoPlaceholder}
                            </div>
                            <span className="font-medium">{equipo?.nombre}</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-center">{est.pj}</TableCell>
                        <TableCell className="text-center text-success font-medium">{est.pg}</TableCell>
                        <TableCell className="text-center">{est.pe}</TableCell>
                        <TableCell className="text-center text-destructive">{est.pp}</TableCell>
                        <TableCell className="text-center">{est.gf}</TableCell>
                        <TableCell className="text-center">{est.gc}</TableCell>
                        <TableCell className="text-center font-medium">
                          <span className={est.dg > 0 ? 'text-success' : est.dg < 0 ? 'text-destructive' : ''}>
                            {est.dg > 0 ? '+' : ''}{est.dg}
                          </span>
                        </TableCell>
                        <TableCell className="text-center">
                          <span className="font-bold text-lg">{est.pts}</span>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center justify-center gap-1">
                            {est.forma.map((f, i) => (
                              <span 
                                key={i} 
                                className={`w-5 h-5 rounded text-xs flex items-center justify-center font-medium text-white
                                  ${f === 'V' ? 'bg-success' : f === 'E' ? 'bg-warning' : 'bg-destructive'}`}
                              >
                                {f}
                              </span>
                            ))}
                          </div>
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>

              <div className="flex items-center gap-6 mt-4 text-xs text-muted-foreground">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded bg-success/20" />
                  <span>Clasificados a playoffs</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded bg-destructive/20" />
                  <span>Zona de descenso</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Goleadores */}
        <TabsContent value="goleadores" className="space-y-4">
          {/* Top Scorer Podium */}
          {goleadores[0] && (
            <Card className="bg-gradient-to-r from-chart-1/10 via-chart-1/5 to-transparent border-chart-1/20">
              <CardContent className="py-6">
                <div className="flex items-center gap-6">
                  <div className="flex h-20 w-20 items-center justify-center rounded-xl bg-chart-1/20">
                    <Target className="h-10 w-10 text-chart-1" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Goleador del Torneo</p>
                    <h3 className="text-2xl font-bold">{goleadores[0].nombre}</h3>
                    <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                      <span className="font-bold text-chart-1 text-lg">{goleadores[0].goles} goles</span>
                      <span>{goleadores[0].equipoNombre}</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <CardTitle>Tabla de Goleadores</CardTitle>
              <CardDescription>
                Máximos anotadores del torneo
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12 text-center">Pos</TableHead>
                    <TableHead>Jugador</TableHead>
                    <TableHead>Equipo</TableHead>
                    <TableHead className="text-center">Goles</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {goleadores.map((goleador, index) => {
                    const equipo = getEquipoById(goleador.equipoId)

                    return (
                      <TableRow key={goleador.jugadorId}>
                        <TableCell className="text-center font-bold">
                          <span className={`inline-flex items-center justify-center w-7 h-7 rounded-full text-sm
                            ${index === 0 ? 'bg-yellow-100 text-yellow-800' : 
                              index === 1 ? 'bg-gray-100 text-gray-800' : 
                              index === 2 ? 'bg-amber-100 text-amber-800' : ''}`}>
                            {index + 1}
                          </span>
                        </TableCell>
                        <TableCell className="font-medium">{goleador.nombre}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <div 
                              className="w-3 h-3 rounded-full"
                              style={{ backgroundColor: equipo?.color }}
                            />
                            {goleador.equipoNombre}
                          </div>
                        </TableCell>
                        <TableCell className="text-center">
                          <span className="font-bold text-lg">{goleador.goles}</span>
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Disciplina */}
        <TabsContent value="disciplina" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-warning" />
                Reporte de Tarjetas
              </CardTitle>
              <CardDescription>
                Jugadores con mayor cantidad de tarjetas
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Jugador</TableHead>
                    <TableHead>Equipo</TableHead>
                    <TableHead className="text-center">Amarillas</TableHead>
                    <TableHead className="text-center">Rojas</TableHead>
                    <TableHead className="text-center">Total</TableHead>
                    <TableHead>Estado</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {tarjetasMock.map((jugador) => {
                    const isSuspended = jugador.rojas > 0 || jugador.amarillas >= 3

                    return (
                      <TableRow key={jugador.jugadorId} className={isSuspended ? 'bg-destructive/5' : ''}>
                        <TableCell className="font-medium">{jugador.nombre}</TableCell>
                        <TableCell>{jugador.equipoNombre}</TableCell>
                        <TableCell className="text-center">
                          <div className="flex items-center justify-center gap-1">
                            {Array.from({ length: jugador.amarillas }).map((_, i) => (
                              <div key={i} className="w-3 h-4 bg-yellow-400 rounded-sm" />
                            ))}
                            {jugador.amarillas === 0 && <span className="text-muted-foreground">-</span>}
                          </div>
                        </TableCell>
                        <TableCell className="text-center">
                          <div className="flex items-center justify-center gap-1">
                            {Array.from({ length: jugador.rojas }).map((_, i) => (
                              <div key={i} className="w-3 h-4 bg-red-500 rounded-sm" />
                            ))}
                            {jugador.rojas === 0 && <span className="text-muted-foreground">-</span>}
                          </div>
                        </TableCell>
                        <TableCell className="text-center font-medium">
                          {jugador.amarillas + jugador.rojas * 2}
                        </TableCell>
                        <TableCell>
                          {isSuspended ? (
                            <Badge variant="destructive">Suspendido</Badge>
                          ) : jugador.amarillas >= 2 ? (
                            <Badge variant="outline" className="text-warning-foreground border-warning">
                              En riesgo
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="text-success border-success">
                              Activo
                            </Badge>
                          )}
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
