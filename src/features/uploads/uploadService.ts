/**
 * Subida no firmada a Cloudinary (solo cloud_name + upload_preset).
 * Variables: VITE_CLOUDINARY_CLOUD_NAME, VITE_CLOUDINARY_UPLOAD_PRESET
 *
 * Carpetas: torneo-app/{torneoId}/torneos/logos | equipos/logos | jugadores/fotos
 */

import { translateUserError } from '@/lib/errorMessages'

const CLOUD = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME as string | undefined
const PRESET = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET as string | undefined

const MAX_BYTES = 2 * 1024 * 1024

const ALLOWED_MIME = new Set(['image/jpeg', 'image/jpg', 'image/png', 'image/webp'])

function assertCloudConfigured(): void {
  if (!CLOUD?.trim() || !PRESET?.trim()) {
    throw new Error('Configura VITE_CLOUDINARY_CLOUD_NAME y VITE_CLOUDINARY_UPLOAD_PRESET para subir imágenes.')
  }
}

function assertCloudNameForDelivery(): void {
  if (!CLOUD?.trim()) {
    throw new Error('Configura VITE_CLOUDINARY_CLOUD_NAME para generar URLs de imágenes optimizadas.')
  }
}

export type UploadImageType = 'torneo_logo' | 'equipo_logo' | 'jugador_foto'

export type UploadImageOptions = {
  torneoId: string
  type: UploadImageType
}

export type CloudinaryUploadResult = {
  secure_url: string
  public_id: string
  width: number
  height: number
  format: string
  bytes: number
}

const FOLDER_BY_TYPE: Record<UploadImageType, string> = {
  torneo_logo: 'torneos/logos',
  equipo_logo: 'equipos/logos',
  jugador_foto: 'jugadores/fotos',
}

function folderForUpload(torneoId: string, type: UploadImageType): string {
  const tid = torneoId.trim()
  if (!tid) throw new Error('El torneo es obligatorio para organizar la imagen en Cloudinary.')
  const sub = FOLDER_BY_TYPE[type]
  return `torneo-app/${tid}/${sub}`
}

function validateFile(file: File): void {
  if (!file || !(file instanceof File)) {
    throw new Error('Selecciona un archivo de imagen.')
  }
  const mime = (file.type || '').toLowerCase()
  const ext = file.name.split('.').pop()?.toLowerCase() ?? ''
  const extOk = ['jpg', 'jpeg', 'png', 'webp'].includes(ext)
  const mimeOk = ALLOWED_MIME.has(mime) || (mime === '' && extOk)
  if (!mimeOk && !extOk) {
    throw new Error('Formato no permitido. Usa JPG, PNG o WEBP.')
  }
  if (file.size > MAX_BYTES) {
    throw new Error('La imagen supera el tamaño máximo permitido (2 MB).')
  }
}

type CloudinaryRawResponse = {
  secure_url?: string
  public_id?: string
  width?: number
  height?: number
  format?: string
  bytes?: number
  error?: { message?: string }
}

export async function uploadImage(file: File, options: UploadImageOptions): Promise<CloudinaryUploadResult> {
  assertCloudConfigured()
  validateFile(file)

  const folder = folderForUpload(options.torneoId, options.type)

  const body = new FormData()
  body.append('file', file)
  body.append('upload_preset', PRESET!)
  body.append('folder', folder)

  const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD}/image/upload`, {
    method: 'POST',
    body,
  })

  const json = (await res.json()) as CloudinaryRawResponse

  if (!res.ok) {
    throw new Error(translateUserError(json.error ?? { message: 'upload failed' }, 'cloudinary'))
  }
  if (!json.secure_url || !json.public_id) {
    throw new Error(translateUserError(new Error('invalid response'), 'cloudinary'))
  }

  return {
    secure_url: json.secure_url,
    public_id: json.public_id,
    width: Number(json.width) || 0,
    height: Number(json.height) || 0,
    format: String(json.format ?? ''),
    bytes: Number(json.bytes) || file.size,
  }
}

export type OptimizedImageOptions = {
  width?: number
  height?: number
  /** Recorte / ajuste. Por defecto `fill` si hay width o height. */
  crop?: 'fill' | 'fit' | 'limit' | 'scale'
  quality?: 'auto' | number
  format?: 'auto' | 'webp' | 'jpg' | 'png'
}

function buildTransformationSegment(opts: OptimizedImageOptions): string {
  const parts: string[] = []
  if (opts.width) parts.push(`w_${Math.round(opts.width)}`)
  if (opts.height) parts.push(`h_${Math.round(opts.height)}`)
  if (opts.width || opts.height) {
    parts.push(`c_${opts.crop ?? 'fill'}`)
  }
  parts.push(`q_${opts.quality ?? 'auto'}`)
  parts.push(`f_${opts.format ?? 'auto'}`)
  return parts.join(',')
}

/**
 * URL de entrega con transformaciones (f_auto, q_auto, etc.).
 * No sustituye el `secure_url` guardado en Supabase: usar solo para mostrar en UI.
 */
export function getOptimizedImageUrl(publicId: string, options: OptimizedImageOptions = {}): string {
  assertCloudNameForDelivery()
  const id = publicId.trim()
  if (!id) throw new Error('public_id vacío')

  const t = buildTransformationSegment(options)
  return `https://res.cloudinary.com/${CLOUD}/image/upload/${t}/${id}`
}

/** Si hay `public_id` de Cloudinary, devuelve URL optimizada; si no, el `secure_url` u otra URL almacenada. */
export function resolveDisplayImageUrl(
  publicId: string | null | undefined,
  fallbackUrl: string | null | undefined,
  options: OptimizedImageOptions,
): string {
  const pid = publicId?.trim()
  if (pid && CLOUD?.trim()) {
    try {
      return getOptimizedImageUrl(pid, options)
    } catch {
      /* seguir al fallback */
    }
  }
  return (fallbackUrl?.trim() ?? '') || ''
}

/** Presets alineados con los casos de uso de la app. */
export const displayImagePresets = {
  torneoLogo: (): OptimizedImageOptions => ({ width: 400, height: 400, crop: 'fit', quality: 'auto', format: 'auto' }),
  equipoLogo: (): OptimizedImageOptions => ({ width: 300, height: 300, crop: 'fit', quality: 'auto', format: 'auto' }),
  /** Listados, fixture, tarjetas pequeñas */
  equipoLogoThumb: (): OptimizedImageOptions => ({ width: 96, height: 96, crop: 'fill', quality: 'auto', format: 'auto' }),
  jugadorFoto: (): OptimizedImageOptions => ({ width: 300, height: 300, crop: 'fill', quality: 'auto', format: 'auto' }),
  /** Área tipo carnet en pantalla */
  jugadorFotoCarnet: (): OptimizedImageOptions => ({ width: 200, height: 240, crop: 'fill', quality: 'auto', format: 'auto' }),
} as const

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader()
    r.onloadend = () => resolve(String(r.result ?? ''))
    r.onerror = () => reject(new Error('No se pudo leer la imagen.'))
    r.readAsDataURL(blob)
  })
}

/** Descarga una imagen por URL y la convierte a data URL (útil para PDF / html2canvas). */
export async function fetchImageAsDataUrl(url: string): Promise<string | null> {
  try {
    const res = await fetch(url, { mode: 'cors' })
    if (!res.ok) return null
    const blob = await res.blob()
    return await blobToDataUrl(blob)
  } catch {
    return null
  }
}

/**
 * Sustituye temporalmente `src` de las imágenes del contenedor por data URLs
 * para que html2canvas / PDF incluyan fotos remotas.
 */
export async function inlineRemoteImagesForCapture(root: HTMLElement): Promise<void> {
  const imgs = [...root.querySelectorAll('img[src]')] as HTMLImageElement[]
  for (const img of imgs) {
    const src = img.getAttribute('src')
    if (!src || src.startsWith('data:') || src.startsWith('blob:')) continue
    const data = await fetchImageAsDataUrl(src)
    if (data) img.setAttribute('src', data)
  }
}
