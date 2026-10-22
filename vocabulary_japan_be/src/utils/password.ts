import argon2 from 'argon2';

/** Giới hạn độ dài mật khẩu (prompt mục 6.2): tối thiểu 6 (khớp frontend), tối đa 128. */
export const PASSWORD_MIN = 6;
export const PASSWORD_MAX = 128;

/** Băm mật khẩu bằng argon2id (tham số mặc định của thư viện: m=64 MiB, t=3, p=4). */
export function hashPassword(password: string): Promise<string> {
  return argon2.hash(password, { type: argon2.argon2id });
}

/** So mật khẩu với bản băm; bản băm hỏng hoặc sai định dạng coi như không khớp. */
export async function verifyPassword(hash: string, password: string): Promise<boolean> {
  try {
    return await argon2.verify(hash, password);
  } catch {
    return false;
  }
}

/** Email chuẩn hóa: bỏ khoảng trắng hai đầu, chữ thường (prompt mục 6.2). */
export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}
