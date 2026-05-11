import { useEffect, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Printer, Download, Award, User } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { PageHeader } from '@/components/common/PageHeader'
import { EmptyState } from '@/components/common/EmptyState'
import { Skeleton } from '@/components/ui/skeleton'
import { useTorneoActivo } from '@/features/torneos/useTorneoActivo'
import { useCategorias } from '@/features/categorias/useCategorias'
import { getEquiposByCategoria } from '@/features/equipos/equiposService'
import { getJugadoresByEquipo } from '@/features/jugadores/jugadoresService'

export function CarnetsPage() {
  const [selectedCategoria, setSelectedCategoria] = useState('')
  const [selectedEquipo, setSelectedEquipo] = useState('')

  const { data: torneo, isLoading: torneoLoading } = useTorneoActivo()
  const torneoId = torneo?.id

  const { data: categorias = [], isLoading: catLoading } = useCategorias(torneoId)

  const equiposQuery = useQuery({
    queryKey: ['carnets-equipos', selectedCategoria],
    enabled: Boolean(selectedCategoria),
    queryFn: () => getEquiposByCategoria(selectedCategoria),
  })

  const jugadoresQuery = useQuery({
    queryKey: ['carnets-jugadores', selectedEquipo, selectedCategoria],
    enabled: Boolean(selectedEquipo && selectedCategoria),
    queryFn: () => getJugadoresByEquipo(selectedEquipo, selectedCategoria),
  })

  useEffect(() => {
    if (categorias.length && !selectedCategoria) setSelectedCategoria(categorias[0]!.id)
  }, [categorias, selectedCategoria])

  const equiposCategoria = equiposQuery.data ?? []
  const jugadores = jugadoresQuery.data ?? []
  const equipo = equiposCategoria.find((e) => e.id === selectedEquipo)
  const categoria = categorias.find((c) => c.id === selectedCategoria)

  if (torneoLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-48 w-full" />
      </div>
    )
  }

  if (!torneoId) {
    return (
      <div className="space-y-6">
        <PageHeader title="Carnets de Jugadores" description="Vista previa de carnets" />
        <EmptyState icon={Award} title="Sin torneo activo" description="Activa un torneo para generar carnets." />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Carnets de Jugadores"
        description="Vista previa con datos reales de jugadores y equipos"
        actions={
          <div className="flex gap-2">
            <Button variant="outline" disabled={!selectedEquipo}>
              <Download className="mr-2 h-4 w-4" />
              Exportar PDF
            </Button>
            <Button disabled={!selectedEquipo}>
              <Printer className="mr-2 h-4 w-4" />
              Imprimir
            </Button>
          </div>
        }
      />

      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col gap-4 md:flex-row md:items-end">
            <div className="flex-1">
              <Label className="mb-2 block text-xs text-muted-foreground">Categoría</Label>
              {catLoading ? (
                <Skeleton className="h-10 w-full" />
              ) : categorias.length === 0 ? (
                <p className="text-sm text-muted-foreground">No hay categorías.</p>
              ) : (
                <Select
                  value={selectedCategoria}
                  onValueChange={(v) => {
                    setSelectedCategoria(v)
                    setSelectedEquipo('')
                  }}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {categorias.map((cat) => (
                      <SelectItem key={cat.id} value={cat.id}>
                        <div className="flex items-center gap-2">
                          <div className="h-3 w-3 rounded-full" style={{ backgroundColor: cat.color }} />
                          {cat.nombre} {cat.rangoEdad ? `(${cat.rangoEdad})` : ''}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
            <div className="flex-1">
              <Label className="mb-2 block text-xs text-muted-foreground">Equipo</Label>
              <Select value={selectedEquipo} onValueChange={setSelectedEquipo} disabled={!selectedCategoria}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecciona un equipo" />
                </SelectTrigger>
                <SelectContent>
                  {equiposCategoria.map((eq) => (
                    <SelectItem key={eq.id} value={eq.id}>
                      <div className="flex items-center gap-2">
                        <div className="h-3 w-3 rounded-full" style={{ backgroundColor: eq.color }} />
                        {eq.nombre}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {!selectedEquipo ? (
        <Card>
          <CardContent className="py-12">
            <EmptyState
              icon={User}
              title="Selecciona un equipo"
              description="Elige una categoría y un equipo para ver la vista previa de los carnets."
            />
          </CardContent>
        </Card>
      ) : jugadoresQuery.isLoading ? (
        <Skeleton className="h-64 w-full" />
      ) : jugadores.length === 0 ? (
        <Card>
          <CardContent className="py-12">
            <EmptyState
              icon={User}
              title="Sin jugadores activos"
              description="Este equipo no tiene jugadores con membresía activa en jugador_equipos."
            />
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <div className="h-4 w-4 rounded-full" style={{ backgroundColor: equipo?.color }} />
                {equipo?.nombre}
              </CardTitle>
              <CardDescription>{jugadores.length} carnets</CardDescription>
            </CardHeader>
          </Card>

          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {jugadores.map((jugador) => (
              <Card key={jugador.id} className="overflow-hidden">
                <div className="h-2" style={{ backgroundColor: equipo?.color }} />
                <CardContent className="p-4">
                  <div className="flex flex-col items-center text-center">
                    {torneo?.logo_url ? (
                      <img
                        src={torneo.logo_url}
                        alt=""
                        className="mb-3 h-12 w-12 rounded-full object-cover"
                      />
                    ) : (
                      <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-primary text-primary-foreground">
                        <Award className="h-6 w-6" />
                      </div>
                    )}

                    <p className="mb-1 text-xs font-medium text-muted-foreground">{torneo?.nombre}</p>

                    <div
                      className="mb-3 flex h-10 w-10 items-center justify-center rounded-lg text-sm font-bold text-white"
                      style={{ backgroundColor: equipo?.color }}
                    >
                      {equipo?.logoPlaceholder}
                    </div>

                    <div className="mb-3 flex h-24 w-20 items-center justify-center rounded-lg bg-muted">
                      <User className="h-10 w-10 text-muted-foreground" />
                    </div>

                    <h3 className="text-base font-semibold">{jugador.nombre}</h3>
                    <p className="mb-2 text-sm text-muted-foreground">{equipo?.nombre}</p>

                    <div className="mt-2 w-full space-y-1 border-t pt-3">
                      <div className="flex justify-between text-xs">
                        <span className="text-muted-foreground">Documento:</span>
                        <span className="font-medium">{jugador.documento}</span>
                      </div>
                      <div className="flex justify-between text-xs">
                        <span className="text-muted-foreground">Categoría:</span>
                        <span className="font-medium" style={{ color: categoria?.color }}>
                          {categoria?.nombre}
                        </span>
                      </div>
                      <div className="flex justify-between text-xs">
                        <span className="text-muted-foreground">Año Nac.:</span>
                        <span className="font-medium">{jugador.anioNacimiento}</span>
                      </div>
                    </div>
                  </div>
                </CardContent>
                <div className="h-1" style={{ backgroundColor: equipo?.color }} />
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
