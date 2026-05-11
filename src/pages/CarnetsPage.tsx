import { useState } from 'react'
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
import { 
  categorias, 
  getEquiposByCategoriaId,
  getJugadoresByEquipoId,
  configuracionTorneo,
} from '@/data/mockData'

export function CarnetsPage() {
  const [selectedCategoria, setSelectedCategoria] = useState(categorias[1].id)
  const [selectedEquipo, setSelectedEquipo] = useState('')
  
  const equiposCategoria = getEquiposByCategoriaId(selectedCategoria)
  const jugadores = selectedEquipo ? getJugadoresByEquipoId(selectedEquipo) : []
  const equipo = equiposCategoria.find(e => e.id === selectedEquipo)
  const categoria = categorias.find(c => c.id === selectedCategoria)

  return (
    <div className="space-y-6">
      <PageHeader
        title="Carnets de Jugadores"
        description="Genera e imprime carnets de identificación para los jugadores"
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

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col gap-4 md:flex-row md:items-end">
            <div className="flex-1">
              <Label className="text-xs text-muted-foreground mb-2 block">Categoría</Label>
              <Select 
                value={selectedCategoria} 
                onValueChange={(value) => {
                  setSelectedCategoria(value)
                  setSelectedEquipo('')
                }}
              >
                <SelectTrigger>
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
                        {cat.nombre} ({cat.rangoEdad})
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex-1">
              <Label className="text-xs text-muted-foreground mb-2 block">Equipo</Label>
              <Select value={selectedEquipo} onValueChange={setSelectedEquipo}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecciona un equipo" />
                </SelectTrigger>
                <SelectContent>
                  {equiposCategoria.map(eq => (
                    <SelectItem key={eq.id} value={eq.id}>
                      <div className="flex items-center gap-2">
                        <div 
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: eq.color }}
                        />
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

      {/* Carnets Preview */}
      {!selectedEquipo ? (
        <Card>
          <CardContent className="py-12">
            <div className="flex flex-col items-center justify-center text-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted mb-4">
                <User className="h-8 w-8 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-semibold mb-2">Selecciona un equipo</h3>
              <p className="text-sm text-muted-foreground max-w-sm">
                Elige una categoría y un equipo para ver la vista previa de los carnets de sus jugadores.
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <div 
                  className="w-4 h-4 rounded-full"
                  style={{ backgroundColor: equipo?.color }}
                />
                {equipo?.nombre}
              </CardTitle>
              <CardDescription>
                {jugadores.length} carnets para generar
              </CardDescription>
            </CardHeader>
          </Card>

          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {jugadores.map((jugador) => (
              <Card key={jugador.id} className="overflow-hidden">
                <div 
                  className="h-2"
                  style={{ backgroundColor: equipo?.color }}
                />
                <CardContent className="p-4">
                  <div className="flex flex-col items-center text-center">
                    {/* Tournament Logo */}
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary text-primary-foreground mb-3">
                      <Award className="h-6 w-6" />
                    </div>
                    
                    {/* Tournament Name */}
                    <p className="text-xs font-medium text-muted-foreground mb-1">
                      {configuracionTorneo.nombreTorneo}
                    </p>
                    
                    {/* Team Logo */}
                    <div 
                      className="flex h-10 w-10 items-center justify-center rounded-lg text-white font-bold text-sm mb-3"
                      style={{ backgroundColor: equipo?.color }}
                    >
                      {equipo?.logoPlaceholder}
                    </div>

                    {/* Player Photo Placeholder */}
                    <div className="w-20 h-24 bg-muted rounded-lg flex items-center justify-center mb-3">
                      <User className="h-10 w-10 text-muted-foreground" />
                    </div>

                    {/* Player Info */}
                    <h3 className="font-semibold text-base">{jugador.nombre}</h3>
                    <p className="text-sm text-muted-foreground mb-2">{equipo?.nombre}</p>
                    
                    <div className="w-full border-t pt-3 mt-2 space-y-1">
                      <div className="flex justify-between text-xs">
                        <span className="text-muted-foreground">Documento:</span>
                        <span className="font-medium">{jugador.documento}</span>
                      </div>
                      <div className="flex justify-between text-xs">
                        <span className="text-muted-foreground">Categoría:</span>
                        <span 
                          className="font-medium"
                          style={{ color: categoria?.color }}
                        >
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
                <div 
                  className="h-1"
                  style={{ backgroundColor: equipo?.color }}
                />
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
