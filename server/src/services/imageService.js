import fs from 'fs/promises';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';
import { v2 as cloudinary } from 'cloudinary';
import { env } from '../config/env.js';

const uploadsRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../uploads');

export function cloudinaryConfigured() {
  return Boolean(env.cloudinary.cloudName && env.cloudinary.apiKey && env.cloudinary.apiSecret);
}

function extFromMime(mime) {
  if (mime === 'image/png') return '.png';
  if (mime === 'image/webp') return '.webp';
  if (mime === 'image/svg+xml') return '.svg';
  return '.jpg';
}

export async function storeImage(file) {
  if (!file?.buffer) throw new Error('No file');
  if (cloudinaryConfigured()) {
    cloudinary.config({
      cloud_name: env.cloudinary.cloudName,
      api_key: env.cloudinary.apiKey,
      api_secret: env.cloudinary.apiSecret,
    });
    const result = await new Promise((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        { folder: 'farm-city', resource_type: 'image' },
        (error, uploaded) => (error ? reject(error) : resolve(uploaded)),
      );
      stream.end(file.buffer);
    });
    return { url: result.secure_url, publicId: result.public_id };
  }
  await fs.mkdir(uploadsRoot, { recursive: true });
  const filename = `${Date.now()}-${crypto.randomBytes(6).toString('hex')}${extFromMime(file.mimetype)}`;
  await fs.writeFile(path.join(uploadsRoot, filename), file.buffer);
  return { url: `/uploads/${filename}`, publicId: `local:${filename}` };
}

export async function removeImage(publicId) {
  if (!publicId) return;
  if (publicId.startsWith('local:')) {
    const filename = publicId.slice('local:'.length);
    await fs.rm(path.join(uploadsRoot, filename), { force: true });
    return;
  }
  if (cloudinaryConfigured()) {
    cloudinary.config({
      cloud_name: env.cloudinary.cloudName,
      api_key: env.cloudinary.apiKey,
      api_secret: env.cloudinary.apiSecret,
    });
    await cloudinary.uploader.destroy(publicId).catch(() => {});
  }
}
