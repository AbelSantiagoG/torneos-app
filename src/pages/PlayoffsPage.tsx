import { useState } from 'react'
import { Trophy, Shuffle, CheckCircle, Edit } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
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
  playoffBrackets,
  getEquipoById,
} from '@/data/mockData'

export function PlayoffsPage() {
  const [selectedCategoria, setSelectedCategoria] = useState(categorias[1].id)
  
  const bracket = playoffBrackets.find(b => b.categoriaId === selectedCategoria)
  const categoria = categorias.find(c => c.id === selectedCategoria)

  const renderMatchCard = (
    equipo1Id: string | undefined, 
    equipo2Id: string | undefined,
    golesEquipo1?: number,
    golesEquipo2?: number,
    ganadorId?: string,
    title?: string
  ) => {
    const equipo1 = equipo1Id ? getEquipoById(equipo1Id) : null
    const equipo2 = equipo2Id ? getEquipoById(equipo2Id) : null
    const isPlayed = golesEquipo1 !== undefined && golesEquipo2 !== undefined

    return (
      <Card className={`overflow-hidden ${ganadorId ? 'border-success' : ''}`}>
        {title && (
          <div className="bg-muted px-3 py-1.5 text-xs font-medium text-muted-foreground">
            {title}
          </div>
        )}
        <CardContent className="p-3 space-y-2">
          {/* Team 1 */}
          <div className={`flex items-center justify-between p-2 rounded ${
            ganadorId === equipo1Id ? 'bg-success/10' : 'bg-muted/50'
          }`}>
            <div className="flex items-center gap-2">
              {equipo1 ? (
                <>
                  <div 
                    className="flex h-8 w-8 items-center justify-center rounded text-white text-xs font-bold"
                    style={{ backgroundColor: equipo1.color }}
                  >
                    {equipo1.logoPlaceholder}
                  </div>
                  <span className={`text-sm font-medium ${ganadorId === equipo1Id ? 'text-success' : ''}`}>
                    {equipo1.nombre}
                  </span>
                </>
              ) : (
                <>
                  <div className="flex h-8 w-8 items-center justify-center rounded bg-muted text-muted-foreground text-xs">
                    ?
                  </div>
                  <span className="text-sm text-muted-foreground">Por definir</span>
                </>
              )}
            </div>
            {isPlayed && (
              <span className={`font-bold text-lg ${ganadorId === equipo1Id ? 'text-success' : ''}`}>
                {golesEquipo1}
              </span>
            )}
          </div>

          {/* Team 2 */}
          <div className={`flex items-center justify-between p-2 rounded ${
            ganadorId === equipo2Id ? 'bg-success/10' : 'bg-muted/50'
          }`}>
            <div className="flex items-center gap-2">
              {equipo2 ? (
                <>
                  <div 
                    className="flex h-8 w-8 items-center justify-center rounded text-white text-xs font-bold"
                    style={{ backgroundColor: equipo2.color }}
                  >
                    {equipo2.logoPlaceholder}
                  </div>
                  <span className={`text-sm font-medium ${ganadorId === equipo2Id ? 'text-success' : ''}`}>
                    {equipo2.nombre}
                  </span>
                </>
              ) : (
                <>
                  <div className="flex h-8 w-8 items-center justify-center rounded bg-muted text-muted-foreground text-xs">
                    ?
                  </div>
                  <span className="text-sm text-muted-foreground">Por definir</span>
                </>
              )}
            </div>
            {isPlayed && (
              <span className={`font-bold text-lg ${ganadorId === equipo2Id ? 'text-success' : ''}`}>
                {golesEquipo2}
              </span>
            )}
          </div>

          {/* Action button */}
          <div className="pt-2">
            {isPlayed ? (
              <Button variant="ghost" size="sm" className="w-full">
                <Edit className="h-3 w-3 mr-1" />
                Editar resultado
              </Button>
            ) : equipo1 && equipo2 ? (
              <Button variant="outline" size="sm" className="w-full">
                <CheckCircle className="h-3 w-3 mr-1" />
                Registrar resultado
              </Button>
            ) : (
              <Button variant="ghost" size="sm" className="w-full" disabled>
                Pendiente
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Playoffs"
        description="Fase eliminatoria del torneo"
        actions={
          <Button>
            <Shuffle className="mr-2 h-4 w-4" />
            Generar Playoffs
          </Button>
        }
      />

      {/* Category Selector */}
      <Card>
        <CardContent className="pt-6">
          <Select value={selectedCategoria} onValueChange={setSelectedCategoria}>
            <SelectTrigger className="w-full md:w-64">
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
        </CardContent>
      </Card>

      {bracket ? (
        <>
          {/* Champion Display */}
          {bracket.final.campeonId && (
            <Card className="bg-gradient-to-r from-yellow-50 via-yellow-100/50 to-yellow-50 border-yellow-200">
              <CardContent className="py-8">
                <div className="flex flex-col items-center text-center">
                  <div className="flex h-20 w-20 items-center justify-center rounded-full bg-yellow-100 mb-4">
                    <Trophy className="h-10 w-10 text-yellow-600" />
                  </div>
                  <p className="text-sm text-muted-foreground mb-2">
                    Campeón {categoria?.nombre}
                  </p>
                  <div className="flex items-center gap-3">
                    <div 
                      className="flex h-12 w-12 items-center justify-center rounded-lg text-white font-bold"
                      style={{ backgroundColor: getEquipoById(bracket.final.campeonId)?.color }}
                    >
                      {getEquipoById(bracket.final.campeonId)?.logoPlaceholder}
                    </div>
                    <h2 className="text-2xl font-bold">
                      {getEquipoById(bracket.final.campeonId)?.nombre}
                    </h2>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Bracket Visual */}
          <div className="grid gap-8 lg:grid-cols-3">
            {/* Semifinals */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <Badge variant="outline">Semifinales</Badge>
              </h3>
              {renderMatchCard(
                bracket.semifinal1.equipo1Id,
                bracket.semifinal1.equipo2Id,
                bracket.semifinal1.golesEquipo1,
                bracket.semifinal1.golesEquipo2,
                bracket.semifinal1.ganadorId,
                'Semifinal 1'
              )}
              {renderMatchCard(
                bracket.semifinal2.equipo1Id,
                bracket.semifinal2.equipo2Id,
                bracket.semifinal2.golesEquipo1,
                bracket.semifinal2.golesEquipo2,
                bracket.semifinal2.ganadorId,
                'Semifinal 2'
              )}
            </div>

            {/* Final */}
            <div className="space-y-4 lg:pt-[60px]">
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <Badge>Final</Badge>
              </h3>
              {renderMatchCard(
                bracket.final.equipo1Id,
                bracket.final.equipo2Id,
                bracket.final.golesEquipo1,
                bracket.final.golesEquipo2,
                bracket.final.campeonId,
                'Gran Final'
              )}
            </div>

            {/* Champion */}
            <div className="space-y-4 lg:pt-[60px]">
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <Badge className="bg-yellow-500">Campeón</Badge>
              </h3>
              <Card className={`${bracket.final.campeonId ? 'border-yellow-400 bg-yellow-50/50' : ''}`}>
                <CardContent className="p-6">
                  {bracket.final.campeonId ? (
                    <div className="flex flex-col items-center text-center">
                      <Trophy className="h-12 w-12 text-yellow-500 mb-4" />
                      <div 
                        className="flex h-16 w-16 items-center justify-center rounded-lg text-white font-bold text-xl mb-3"
                        style={{ backgroundColor: getEquipoById(bracket.final.campeonId)?.color }}
                      >
                        {getEquipoById(bracket.final.campeonId)?.logoPlaceholder}
                      </div>
                      <p className="font-bold text-lg">
                        {getEquipoById(bracket.final.campeonId)?.nombre}
                      </p>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center text-center py-4">
                      <div className="flex h-16 w-16 items-center justify-center rounded-lg bg-muted mb-3">
                        <Trophy className="h-8 w-8 text-muted-foreground" />
                      </div>
                      <p className="text-muted-foreground">Por definir</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </>
      ) : (
        <Card>
          <CardContent className="py-12">
            <div className="flex flex-col items-center text-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted mb-4">
                <Trophy className="h-8 w-8 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-semibold mb-2">Playoffs no generados</h3>
              <p className="text-sm text-muted-foreground max-w-sm mb-4">
                Los playoffs para {categoria?.nombre} aún no han sido generados. 
                Asegúrate de que la fase regular haya terminado antes de crear el bracket.
              </p>
              <Button>
                <Shuffle className="mr-2 h-4 w-4" />
                Generar Playoffs
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
