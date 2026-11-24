import * as tus from 'tus-js-client';
import { supabase, SUPABASE_URL, SUPABASE_ANON_KEY } from '../lib/supabase.js';

export const IMG_MAX = 25 * 1024 * 1024; // must match the bucket limit in supabase/schema.sql
const IMG_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const VID_TYPES = ['video/mp4', 'video/webm'];
const mb = n => (n / 1048576).toFixed(1) + ' MB';

export function validateFile(file, kind) {
  if (kind === 'video') {
    if (!VID_TYPES.includes(file.type)) throw new Error(`"${file.name}" is not an MP4 or WebM video. For other formats, upload to YouTube/Vimeo and paste the link.`);
  } else {
    if (!IMG_TYPES.includes(file.type)) throw new Error(`"${file.name}" is not a JPG, PNG or WebP image.`);
    if (file.size > IMG_MAX) throw new Error(`"${file.name}" is ${mb(file.size)}. Images must be under ${mb(IMG_MAX)}.`);
  }
}

// Shrinks very large photos before upload (max 2400px). PNGs are kept as PNG to keep transparency.
export async function optimizeImage(file, max = 2400) {
  if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type) || !window.createImageBitmap) return file;
  try {
    const bmp = await createImageBitmap(file);
    const big = Math.max(bmp.width, bmp.height);
    if (big <= max && file.size < 3 * 1048576) return file;
    const sc = Math.min(1, max / big);
    const c = document.createElement('canvas');
    c.width = Math.round(bmp.width * sc); c.height = Math.round(bmp.height * sc);
    c.getContext('2d').drawImage(bmp, 0, 0, c.width, c.height);
    const type = file.type === 'image/png' ? 'image/png' : 'image/webp';
    const blob = await new Promise(r => c.toBlob(r, type, 0.9));
    if (!blob || blob.size >= file.size) return file;
    const ext = type === 'image/png' ? 'png' : 'webp';
    return new File([blob], file.name.replace(/\.[^.]+$/, '') + '.' + ext, { type });
  } catch (e) { return file; }
}

// Resumable (TUS) upload to Supabase Storage. Retries automatically on network drops.
export async function uploadFile(bucket, file, { kind = 'image', keep = false, onProgress } = {}) {
  validateFile(file, kind);
  if (kind === 'image' && !keep) file = await optimizeImage(file);
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error('Your session has expired. Please sign in again.');
  const ext = (file.name.split('.').pop() || 'bin').toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 5) || 'bin';
  const path = `${crypto.randomUUID()}.${ext}`;
  await new Promise((resolve, reject) => {
    const up = new tus.Upload(file, {
      endpoint: `${SUPABASE_URL}/storage/v1/upload/resumable`,
      retryDelays: [0, 3000, 5000, 10000, 20000],
      headers: { authorization: `Bearer ${session.access_token}`, apikey: SUPABASE_ANON_KEY, 'x-upsert': 'false' },
      uploadDataDuringCreation: true,
      removeFingerprintOnSuccess: true,
      metadata: { bucketName: bucket, objectName: path, contentType: file.type, cacheControl: '3600' },
      chunkSize: 6 * 1024 * 1024,
      onError: err => reject(new Error('Upload failed: ' + (err && err.message ? err.message : err))),
      onProgress: (sent, total) => onProgress && onProgress(Math.round((sent / total) * 100), file.name),
      onSuccess: () => resolve()
    });
    up.start();
  });
  return path;
}

export async function removeFiles(list) {
  const by = {};
  list.filter(([, p]) => p).forEach(([b, p]) => (by[b] = by[b] || []).push(p));
  for (const b of Object.keys(by)) {
    const { error } = await supabase.storage.from(b).remove(by[b]);
    if (error) console.warn('Could not delete files from', b, error.message);
  }
}
