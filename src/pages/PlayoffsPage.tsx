import { useEffect, useState } from 'react'
import { Trophy, Shuffle } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
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

export function PlayoffsPage() {
  const [selectedCategoria, setSelectedCategoria] = useState('')

  const { data: torneo, isLoading: torneoLoading } = useTorneoActivo()
  const torneoId = torneo?.id
  const { data: categorias = [], isLoading: catLoading } = useCategorias(torneoId)

  useEffect(() => {
    const activas = categorias.filter((c) => c.activa)
    if (activas.length && !selectedCategoria) setSelectedCategoria(activas[0]!.id)
  }, [categorias, selectedCategoria])

  const categoria = categorias.find((c) => c.id === selectedCategoria)

  if (torneoLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-64 w-full" />
      </div>
    )
  }

  if (!torneoId) {
    return (
      <div className="space-y-6">
        <PageHeader title="Playoffs" description="Fase eliminatoria" />
        <EmptyState icon={Trophy} title="Sin torneo activo" description="Activa un torneo para gestionar playoffs." />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Playoffs"
        description="Fase eliminatoria del torneo"
        actions={
          <Button disabled>
            <Shuffle className="mr-2 h-4 w-4" />
            Generar Playoffs
          </Button>
        }
      />

      <Card>
        <CardContent className="pt-6">
          {catLoading ? (
            <Skeleton className="h-10 w-64" />
          ) : (
            <Select value={selectedCategoria} onValueChange={setSelectedCategoria}>
              <SelectTrigger className="w-full md:w-64">
                <SelectValue placeholder="Categoría" />
              </SelectTrigger>
              <SelectContent>
                {categorias
                  .filter((c) => c.activa)
                  .map((cat) => (
                    <SelectItem key={cat.id} value={cat.id}>
                      <div className="flex items-center gap-2">
                        <div className="h-3 w-3 rounded-full" style={{ backgroundColor: cat.color }} />
                        {cat.nombre}
                      </div>
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardContent className="py-12">
          <EmptyState
            icon={Trophy}
            title="Playoffs no disponibles"
            description="Los playoffs se generarán cuando exista tabla de posiciones suficiente. El bracket no se muestra con datos de prueba."
            action={
              <Button disabled>
                <Shuffle className="mr-2 h-4 w-4" />
                Generar Playoffs
              </Button>
            }
          />
          {categoria && (
            <p className="mt-4 text-center text-sm text-muted-foreground">Categoría seleccionada: {categoria.nombre}</p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
