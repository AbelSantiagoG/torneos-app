/**
 * Mensajes de error amigables para el usuario.
 * No exponer textos técnicos de Postgres, RPC ni restricciones.
 */

export type UserErrorContext =
  | 'equipo'
  | 'jugador'
  | 'fixture'
  | 'programacion'
  | 'categoria'
  | 'torneo'
  | 'finanzas'
  | 'cloudinary'
  | 'excel'
  | 'rpc'
  | 'default'

type PgLike = {
  code?: string
  message?: string
  details?: string
  hint?: string
}

function asPg(error: unknown): PgLike {
  if (error && typeof error === 'object') return error as PgLike
  return {}
}

function combinedText(e: PgLike): string {
  return `${e.message ?? ''} ${e.details ?? ''} ${e.hint ?? ''}`.toLowerCase()
}

/** Traduce errores de Supabase/Postgres/Cloudinary/RPC a texto legible. */
export function translateUserError(error: unknown, context: UserErrorContext = 'default'): string {
  const rawMsg = String((error as Error)?.message ?? '').trim()
  if (rawMsg.includes('Este partido ya existe en otra jornada')) {
    return 'Este partido ya existe en otra jornada. Solo puede repetirse si el torneo es de ida y vuelta.'
  }
  if (rawMsg.includes('Ya existe un partido programado en esa cancha durante ese horario')) {
    return 'Ya existe un partido programado en esa cancha durante ese horario.'
  }
  const rawMsgLower = rawMsg.toLowerCase()
  if (
    rawMsgLower.includes('failed to fetch') ||
    rawMsgLower.includes('networkerror') ||
    rawMsgLower.includes('network request failed') ||
    rawMsgLower.includes('load failed')
  ) {
    return 'No se pudo conectar con Supabase. Revisa la URL del proyecto (VITE_SUPABASE_URL) y tu conexión.'
  }
  if (rawMsgLower.includes('cors')) {
    return 'No se pudo conectar con Supabase. Revisa la URL del proyecto (debe ser solo https://….supabase.co, sin /rest/v1).'
  }

  const e = asPg(error)
  const code = String(e.code ?? '')
  const text = combinedText(e)

  if (context === 'cloudinary' || text.includes('cloudinary')) {
    return 'No se pudo subir la imagen. Revisa tu conexión y la configuración de Cloudinary.'
  }

  if (context === 'excel' || text.includes('xlsx') || text.includes('csv')) {
    return 'No se pudo leer el archivo. Verifica el formato (.xlsx o .csv) y las columnas requeridas.'
  }

  if (code === '23505' || text.includes('duplicate key') || text.includes('unique constraint')) {
    if (context === 'jugador' || text.includes('documento') || text.includes('jugadores')) {
      return 'Ya existe un jugador con ese documento en este torneo.'
    }
    if (context === 'equipo' || text.includes('equipo') || text.includes('equipos')) {
      return 'Ya existe un equipo con ese nombre en esta categoría.'
    }
    return 'Ya existe un registro duplicado. Revisa los datos e intenta de nuevo.'
  }

  if (code === '23502' || text.includes('not-null constraint') || text.includes('null value in column')) {
    return 'Falta completar un campo obligatorio.'
  }

  if (text.includes('time zone displacement out of range')) {
    return 'La fecha del jugador no tiene un formato válido.'
  }

  if (text.includes('invalid input')) {
    return 'Hay un dato con formato inválido. Revisa la información e intenta de nuevo.'
  }

  if (text.includes('invalid input value for enum')) {
    return 'El valor seleccionado no es válido para este campo.'
  }

  if (code === '23514' || text.includes('check constraint')) {
    if (text.includes('edad') || text.includes('age')) {
      return 'La edad del jugador no corresponde a la categoría.'
    }
    return 'Los datos no cumplen una regla de validación. Revisa edades, montos o valores permitidos.'
  }

  if (code === '23503' || text.includes('foreign key')) {
    return 'No se puede realizar la acción porque hay datos relacionados que lo impiden.'
  }

  if (context === 'programacion' || (text.includes('cancha') && (text.includes('horario') || text.includes('hora')))) {
    if (text.includes('does not exist') && text.includes('column')) {
      const col = text.match(/column\s+[\w.]+\.(\w+)\s+does not exist/i)?.[1]
      return col
        ? `No se pudo guardar el acta: el campo «${col}» no existe en la base de datos. Recarga la página o contacta al administrador.`
        : 'No se pudo guardar el acta: hay un campo incompatible con la base de datos. Recarga la página.'
    }
    if (text.includes('overlap') || text.includes('exclusion') || text.includes('exclusión')) {
      return 'Ya hay un partido programado en esa cancha a la misma hora. Elige otro horario o cancha.'
    }
    if (text.includes('cruce') || text.includes('conflict')) {
      return 'Hay un cruce de horario con otro partido. Ajusta fecha, hora o cancha.'
    }
  }

  if (context === 'rpc' || context === 'fixture') {
    const raw = String(e.message ?? error ?? '').trim()
    if (raw && !text.includes('violates') && !text.includes('null value') && !text.includes('constraint')) {
      return raw.length > 200 ? `${raw.slice(0, 197)}…` : raw
    }
  }

  if (context === 'finanzas') {
    return 'No se pudo completar la operación financiera. Revisa montos y datos e intenta de nuevo.'
  }

  if (text.includes('violates') || text.includes('constraint') || text.includes('null value')) {
    return 'No se pudo guardar la información. Intenta nuevamente.'
  }

  const fallback = String(e.message ?? error ?? '').trim()
  if (
    fallback &&
    !fallback.toLowerCase().includes('violates') &&
    !fallback.toLowerCase().includes('null value in column') &&
    !fallback.toLowerCase().includes('unique constraint') &&
    !fallback.toLowerCase().includes('not-null constraint')
  ) {
    return fallback.length > 180 ? `${fallback.slice(0, 177)}…` : fallback
  }

  return 'No se pudo guardar la información. Intenta nuevamente.'
}

export function toFriendlyError(error: unknown, context?: UserErrorContext): Error {
  return new Error(translateUserError(error, context))
}
