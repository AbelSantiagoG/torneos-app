/**
 * Subida no firmada a Cloudinary (solo cloud_name + upload_preset en el cliente).
 * Variables: VITE_CLOUDINARY_CLOUD_NAME, VITE_CLOUDINARY_UPLOAD_PRESET
 */

import { translateUserError } from '@/lib/errorMessages'

const CLOUD = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME as string | undefined
const PRESET = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET as string | undefined

export type CloudinaryUploadResult = {
  secure_url: string
  public_id: string
}

export async function uploadImage(file: File, folder: string): Promise<CloudinaryUploadResult> {
  if (!CLOUD || !PRESET) {
    throw new Error('Configura VITE_CLOUDINARY_CLOUD_NAME y VITE_CLOUDINARY_UPLOAD_PRESET para subir imágenes.')
  }

  const body = new FormData()
  body.append('file', file)
  body.append('upload_preset', PRESET)
  body.append('folder', folder)

  const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD}/image/upload`, {
    method: 'POST',
    body,
  })

  const json = (await res.json()) as { secure_url?: string; public_id?: string; error?: { message?: string } }

  if (!res.ok) {
    throw new Error(translateUserError(json.error ?? { message: 'upload failed' }, 'cloudinary'))
  }
  if (!json.secure_url || !json.public_id) {
    throw new Error(translateUserError(new Error('invalid response'), 'cloudinary'))
  }

  return { secure_url: json.secure_url, public_id: json.public_id }
}
