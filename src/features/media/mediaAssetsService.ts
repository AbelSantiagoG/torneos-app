import { supabase } from '@/lib/supabase'
import { toUserError } from '@/lib/supabaseErrors'
import type { MediaAssetRow } from '@/types/database'
import { uploadImage, type CloudinaryUploadResult, type UploadImageOptions } from '@/features/uploads/uploadService'

export type MediaAssetTipo = UploadImageOptions['type']

const FOLDER_HINT: Record<MediaAssetTipo, string> = {
  torneo_logo: '/torneos/logos',
  equipo_logo: '/equipos/logos',
  jugador_foto: '/jugadores/fotos',
}

export async function listMediaAssets(torneoId: string, tipo: MediaAssetTipo): Promise<MediaAssetRow[]> {
  const { data, error } = await supabase
    .from('media_assets')
    .select('id, torneo_id, tipo, secure_url, public_id, created_at')
    .eq('torneo_id', torneoId)
    .eq('tipo', tipo)
    .order('created_at', { ascending: false })
    .limit(120)

  if (!error && data?.length) return data as MediaAssetRow[]

  const all = await supabase
    .from('media_assets')
    .select('id, torneo_id, tipo, secure_url, public_id, created_at')
    .eq('torneo_id', torneoId)
    .order('created_at', { ascending: false })
    .limit(200)

  if (all.error) throw toUserError(all.error, 'default')
  const hint = FOLDER_HINT[tipo]
  return ((all.data ?? []) as MediaAssetRow[]).filter(
    (a) => a.tipo === tipo || (a.public_id && a.public_id.includes(hint)),
  )
}

export async function insertMediaAsset(input: {
  torneoId: string
  tipo: MediaAssetTipo
  secure_url: string
  public_id: string
}): Promise<void> {
  const { error } = await supabase.from('media_assets').insert({
    torneo_id: input.torneoId,
    tipo: input.tipo,
    secure_url: input.secure_url,
    public_id: input.public_id,
  })
  if (error) {
    console.warn('[media_assets] No se pudo registrar el asset:', error.message)
  }
}

/** Sube a Cloudinary y registra en `media_assets` (no bloquea si el registro falla). */
export async function uploadImageAndRegister(file: File, options: UploadImageOptions): Promise<CloudinaryUploadResult> {
  const r = await uploadImage(file, options)
  await insertMediaAsset({
    torneoId: options.torneoId,
    tipo: options.type,
    secure_url: r.secure_url,
    public_id: r.public_id,
  })
  return r
}
