import { buildSeed, DB_VERSION } from './seed';
import type { MockDb } from './types';

/** Mọi khóa localStorage của app có tiền tố jpvocab:. */
export const STORAGE_PREFIX = 'jpvocab:';
const DB_KEY = `${STORAGE_PREFIX}mock-db`;
const SESSION_KEY = `${STORAGE_PREFIX}mock-session`;

/**
 * Đọc toàn bộ dữ liệu mock từ localStorage. Chưa có, hỏng hoặc khác phiên bản thì tạo lại
 * từ dữ liệu gốc. Đọc mỗi lần gọi (không cache) để nhiều tab và test luôn thấy dữ liệu mới.
 */
export function readDb(now: Date = new Date()): MockDb {
  const raw = localStorage.getItem(DB_KEY);
  if (raw) {
    try {
      const parsed = JSON.parse(raw) as MockDb;
      if (parsed.version === DB_VERSION) return parsed;
    } catch {
      // Dữ liệu hỏng: tạo lại bên dưới.
    }
  }
  const seeded = buildSeed(now);
  writeDb(seeded);
  return seeded;
}

export function writeDb(db: MockDb): void {
  localStorage.setItem(DB_KEY, JSON.stringify(db));
}

/** Đọc, sửa và ghi lại trong một bước. */
export function updateDb<T>(mutate: (db: MockDb) => T): T {
  const db = readDb();
  const result = mutate(db);
  writeDb(db);
  return result;
}

// ---------- Phiên đăng nhập giả ----------

export function getSessionUserId(): string | null {
  return localStorage.getItem(SESSION_KEY);
}

export function setSessionUserId(userId: string): void {
  localStorage.setItem(SESSION_KEY, userId);
}

export function clearSession(): void {
  localStorage.removeItem(SESSION_KEY);
}
