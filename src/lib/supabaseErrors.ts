/**
 * Errores de Supabase / PostgREST → mensajes para el usuario.
 * La lógica principal vive en errorMessages.ts.
 */

import { translateUserError, type UserErrorContext } from '@/lib/errorMessages'

export type SupabaseErrorContext = 'equipo' | 'jugador' | 'fixture' | 'programacion' | 'categoria' | 'default'

function mapContext(c?: SupabaseErrorContext): UserErrorContext {
  return (c ?? 'default') as UserErrorContext
}

export function getSupabaseUserMessage(error: unknown, context: SupabaseErrorContext = 'default'): string {
  return translateUserError(error, mapContext(context))
}

export function toUserError(error: unknown, context?: SupabaseErrorContext): Error {
  return new Error(getSupabaseUserMessage(error, context))
}

export function assertNoSupabaseError<T>(
  result: { data: T; error: { message: string; code?: string; details?: string } | null },
  context?: SupabaseErrorContext,
): T {
  if (result.error) throw toUserError(result.error, context)
  return result.data
}
