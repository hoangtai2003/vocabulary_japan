import { randomBytes } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { env } from '../../config/env.ts';
import { prisma } from '../../db/prisma.ts';
import { ApiError } from '../../utils/ApiError.ts';

/**
 * Ảnh của bài đọc (FR-CMS-09). Tệp lưu trên đĩa ở UPLOAD_DIR (production: volume riêng, nằm trong
 * bản sao lưu, NFR-EX-10); bảng uploads giữ loại và kích thước. Nội dung tham chiếu ảnh bằng
 * ![mô tả](upload:<id>) (DR-EX-08). Không nhận SVG (có thể chứa script).
 */
export const UPLOAD_MAX_BYTES = 2 * 1024 * 1024;
export const UPLOAD_TYPES = ['image/png', 'image/jpeg', 'image/webp', 'image/gif'] as const;

/** Kiểm tra chữ ký đầu tệp, không tin Content-Type do trình duyệt gửi. */
function sniff(data: Buffer): (typeof UPLOAD_TYPES)[number] | null {
  if (data.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return 'image/png';
  if (data[0] === 0xff && data[1] === 0xd8 && data[2] === 0xff) return 'image/jpeg';
  if (data.subarray(0, 4).toString('ascii') === 'RIFF' && data.subarray(8, 12).toString('ascii') === 'WEBP') return 'image/webp';
  if (data.subarray(0, 4).toString('ascii') === 'GIF8') return 'image/gif';
  return null;
}

const uploadPath = (id: string) => path.join(path.resolve(env.UPLOAD_DIR), id);

export async function saveUpload(body: unknown) {
  if (!Buffer.isBuffer(body) || body.length === 0) {
    throw ApiError.validation({ file: 'Chọn ảnh PNG, JPEG, WebP hoặc GIF (tối đa 2 MB)' });
  }
  const contentType = sniff(body);
  if (!contentType) throw ApiError.validation({ file: 'Chỉ nhận ảnh PNG, JPEG, WebP hoặc GIF' });
  const id = randomBytes(12).toString('hex');
  await mkdir(path.resolve(env.UPLOAD_DIR), { recursive: true });
  await writeFile(uploadPath(id), body, { flag: 'wx' });
  await prisma.upload.create({ data: { id, contentType, size: body.length } });
  return { id, content_type: contentType, size: body.length, markup: `![](upload:${id})` };
}

export async function readUpload(id: string) {
  const upload = /^[a-f0-9]{24}$/.test(id) ? await prisma.upload.findUnique({ where: { id } }) : null;
  if (!upload) throw ApiError.notFound('Không tìm thấy tệp');
  try {
    return { contentType: upload.contentType, data: await readFile(uploadPath(id)) };
  } catch {
    throw ApiError.notFound('Không tìm thấy tệp');
  }
}
