import multer from 'multer';
import { ApiError } from '../utils/ApiError.js';

const allowed = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/svg+xml']);

export const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024, files: 8 },
  fileFilter(req, file, cb) {
    if (!allowed.has(file.mimetype)) {
      cb(new ApiError(400, 'Only JPEG, PNG, WebP, and SVG images are allowed.'));
      return;
    }
    cb(null, true);
  },
});
