import { useState } from 'react'
import { Calendar, Clock, MapPin, AlertTriangle, Shuffle, Edit, CheckCircle } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
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
  partidos, 
  getEquipoById,
  getCategoriaById,
} from '@/data/mockData'
import { formatDate } from '@/lib/utils'

interface PartidosPageProps {
  onOpenActa?: () => void
}

export function PartidosPage({ onOpenActa }: PartidosPageProps) {
  const [selectedCategoria, setSelectedCategoria] = useState(categorias[1].id)
  const [activeTab, setActiveTab] = useState('categoria')
  
  const partidosCategoria = partidos.filter(p => p.categoriaId === selectedCategoria)
  const jornadas = [...new Set(partidosCategoria.map(p => p.jornada))].sort()

  // Group matches by date for the "Por fecha" view
  const partidosPorFecha = partidos.reduce((acc, partido) => {
    if (!acc[partido.fecha]) {
      acc[partido.fecha] = []
    }
    acc[partido.fecha].push(partido)
    return acc
  }, {} as Record<string, typeof partidos>)

  const fechasOrdenadas = Object.keys(partidosPorFecha).sort()

  // Find conflicts (same time, same field)
  const findConflicts = (fecha: string) => {
    const partidosFecha = partidosPorFecha[fecha] || []
    const conflicts: string[] = []
    
    partidosFecha.forEach((p1, i) => {
      partidosFecha.slice(i + 1).forEach(p2 => {
        if (p1.hora === p2.hora && p1.cancha === p2.cancha) {
          conflicts.push(p1.id, p2.id)
        }
      })
    })
    
    return conflicts
  }

  const pendingMatches = partidos.filter(p => p.estado === 'pendiente')

  return (
    <div className="space-y-6">
      <PageHeader
        title="Partidos / Fixture"
        description="Gestiona la programación de partidos, jornadas y resultados"
      />

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3 lg:w-auto lg:inline-flex">
          <TabsTrigger value="categoria">Por Categoría</TabsTrigger>
          <TabsTrigger value="fecha">Por Fecha</TabsTrigger>
          <TabsTrigger value="sorteo">Sorteo de Horarios</TabsTrigger>
        </TabsList>

        {/* Por Categoría */}
        <TabsContent value="categoria" className="space-y-4">
          <Card>
            <CardContent className="pt-6">
              <Select value={selectedCategoria} onValueChange={setSelectedCategoria}>
                <SelectTrigger className="w-full md:w-64">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {categorias.map(cat => (
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
            </CardContent>
          </Card>

          {jornadas.map(jornada => {
            const partidosJornada = partidosCategoria.filter(p => p.jornada === jornada)
            
            return (
              <Card key={jornada}>
                <CardHeader>
                  <CardTitle className="text-lg">Jornada {jornada}</CardTitle>
                  <CardDescription>
                    {partidosJornada.length} partidos programados
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {partidosJornada.map((partido) => {
                      const local = getEquipoById(partido.equipoLocalId)
                      const visitante = getEquipoById(partido.equipoVisitanteId)

                      return (
                        <Card key={partido.id} className="overflow-hidden">
                          <div className="p-4">
                            <div className="flex items-center justify-between mb-3">
                              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                <Calendar className="h-3 w-3" />
                                {formatDate(partido.fecha)}
                              </div>
                              <Badge variant={
                                partido.estado === 'jugado' ? 'default' : 
                                partido.estado === 'programado' ? 'secondary' : 'outline'
                              }>
                                {partido.estado === 'jugado' ? 'Jugado' : 
                                 partido.estado === 'programado' ? 'Programado' : 'Pendiente'}
                              </Badge>
                            </div>

                            <div className="flex items-center justify-between mb-3">
                              <div className="flex items-center gap-2 flex-1">
                                <div 
                                  className="flex h-8 w-8 items-center justify-center rounded text-white text-xs font-bold"
                                  style={{ backgroundColor: local?.color }}
                                >
                                  {local?.logoPlaceholder}
                                </div>
                                <span className="text-sm font-medium truncate">{local?.nombre}</span>
                              </div>

                              {partido.estado === 'jugado' ? (
                                <div className="flex items-center justify-center min-w-[50px] px-2 py-1 rounded bg-secondary text-secondary-foreground mx-2">
                                  <span className="font-bold">{partido.golesLocal}</span>
                                  <span className="mx-1">-</span>
                                  <span className="font-bold">{partido.golesVisitante}</span>
                                </div>
                              ) : (
                                <span className="text-muted-foreground mx-2">vs</span>
                              )}

                              <div className="flex items-center gap-2 flex-1 justify-end">
                                <span className="text-sm font-medium truncate">{visitante?.nombre}</span>
                                <div 
                                  className="flex h-8 w-8 items-center justify-center rounded text-white text-xs font-bold"
                                  style={{ backgroundColor: visitante?.color }}
                                >
                                  {visitante?.logoPlaceholder}
                                </div>
                              </div>
                            </div>

                            <div className="flex items-center justify-between text-xs text-muted-foreground border-t pt-3">
                              <div className="flex items-center gap-3">
                                <span className="flex items-center gap-1">
                                  <Clock className="h-3 w-3" />
                                  {partido.hora}
                                </span>
                                <span className="flex items-center gap-1">
                                  <MapPin className="h-3 w-3" />
                                  {partido.cancha}
                                </span>
                              </div>
                              {partido.estado === 'jugado' ? (
                                <Button variant="ghost" size="sm" onClick={onOpenActa}>
                                  <Edit className="h-3 w-3 mr-1" />
                                  Ver acta
                                </Button>
                              ) : partido.estado === 'programado' ? (
                                <Button variant="outline" size="sm" onClick={onOpenActa}>
                                  <CheckCircle className="h-3 w-3 mr-1" />
                                  Registrar
                                </Button>
                              ) : (
                                <Button variant="outline" size="sm">
                                  Programar
                                </Button>
                              )}
                            </div>
                          </div>
                        </Card>
                      )
                    })}
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </TabsContent>

        {/* Por Fecha */}
        <TabsContent value="fecha" className="space-y-4">
          {fechasOrdenadas.map(fecha => {
            const partidosFecha = partidosPorFecha[fecha]
            const conflicts = findConflicts(fecha)
            const hasConflicts = conflicts.length > 0

            return (
              <Card key={fecha}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-lg flex items-center gap-2">
                        {formatDate(fecha)}
                        {hasConflicts && (
                          <Badge variant="destructive" className="flex items-center gap-1">
                            <AlertTriangle className="h-3 w-3" />
                            Conflicto
                          </Badge>
                        )}
                      </CardTitle>
                      <CardDescription>
                        {partidosFecha.length} partidos programados
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Hora</TableHead>
                        <TableHead>Categoría</TableHead>
                        <TableHead>Local</TableHead>
                        <TableHead className="text-center">Resultado</TableHead>
                        <TableHead>Visitante</TableHead>
                        <TableHead>Cancha</TableHead>
                        <TableHead>Estado</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {partidosFecha.sort((a, b) => a.hora.localeCompare(b.hora)).map((partido) => {
                        const local = getEquipoById(partido.equipoLocalId)
                        const visitante = getEquipoById(partido.equipoVisitanteId)
                        const categoria = getCategoriaById(partido.categoriaId)
                        const isConflict = conflicts.includes(partido.id)

                        return (
                          <TableRow 
                            key={partido.id}
                            className={isConflict ? 'bg-destructive/5' : ''}
                          >
                            <TableCell className="font-medium">
                              <div className="flex items-center gap-2">
                                {isConflict && <AlertTriangle className="h-4 w-4 text-destructive" />}
                                {partido.hora}
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge 
                                variant="outline"
                                style={{ borderColor: categoria?.color, color: categoria?.color }}
                              >
                                {categoria?.nombre}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <div 
                                  className="w-3 h-3 rounded-full"
                                  style={{ backgroundColor: local?.color }}
                                />
                                {local?.nombre}
                              </div>
                            </TableCell>
                            <TableCell className="text-center">
                              {partido.estado === 'jugado' ? (
                                <span className="font-bold">
                                  {partido.golesLocal} - {partido.golesVisitante}
                                </span>
                              ) : (
                                <span className="text-muted-foreground">vs</span>
                              )}
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <div 
                                  className="w-3 h-3 rounded-full"
                                  style={{ backgroundColor: visitante?.color }}
                                />
                                {visitante?.nombre}
                              </div>
                            </TableCell>
                            <TableCell className={isConflict ? 'text-destructive font-medium' : ''}>
                              {partido.cancha}
                            </TableCell>
                            <TableCell>
                              <Badge variant={
                                partido.estado === 'jugado' ? 'default' : 
                                partido.estado === 'programado' ? 'secondary' : 'outline'
                              }>
                                {partido.estado === 'jugado' ? 'Jugado' : 
                                 partido.estado === 'programado' ? 'Programado' : 'Pendiente'}
                              </Badge>
                            </TableCell>
                          </TableRow>
                        )
                      })}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            )
          })}
        </TabsContent>

        {/* Sorteo de Horarios */}
        <TabsContent value="sorteo" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Sorteo de Horarios</CardTitle>
              <CardDescription>
                Asigna horarios y canchas a los partidos pendientes de manera aleatoria o manual
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between mb-6">
                <div>
                  <p className="text-2xl font-bold">{pendingMatches.length}</p>
                  <p className="text-sm text-muted-foreground">Partidos pendientes de programar</p>
                </div>
                <Button disabled={pendingMatches.length === 0}>
                  <Shuffle className="mr-2 h-4 w-4" />
                  Asignar Horarios Automáticamente
                </Button>
              </div>

              {pendingMatches.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Categoría</TableHead>
                      <TableHead>Jornada</TableHead>
                      <TableHead>Partido</TableHead>
                      <TableHead>Fecha Sugerida</TableHead>
                      <TableHead>Hora</TableHead>
                      <TableHead>Cancha</TableHead>
                      <TableHead className="text-right">Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {pendingMatches.map((partido) => {
                      const local = getEquipoById(partido.equipoLocalId)
                      const visitante = getEquipoById(partido.equipoVisitanteId)
                      const categoria = getCategoriaById(partido.categoriaId)

                      return (
                        <TableRow key={partido.id}>
                          <TableCell>
                            <Badge 
                              variant="outline"
                              style={{ borderColor: categoria?.color, color: categoria?.color }}
                            >
                              {categoria?.nombre}
                            </Badge>
                          </TableCell>
                          <TableCell>Jornada {partido.jornada}</TableCell>
                          <TableCell>
                            {local?.nombre} vs {visitante?.nombre}
                          </TableCell>
                          <TableCell>{formatDate(partido.fecha)}</TableCell>
                          <TableCell className="text-muted-foreground">Sin asignar</TableCell>
                          <TableCell className="text-muted-foreground">Sin asignar</TableCell>
                          <TableCell className="text-right">
                            <Button variant="outline" size="sm">
                              Programar
                            </Button>
                          </TableCell>
                        </TableRow>
                      )
                    })}
                  </TableBody>
                </Table>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <CheckCircle className="h-12 w-12 mx-auto mb-4 text-success" />
                  <p className="font-medium">Todos los partidos están programados</p>
                  <p className="text-sm">No hay partidos pendientes de asignar horario</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
