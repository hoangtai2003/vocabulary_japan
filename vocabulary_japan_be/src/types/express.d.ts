import type { User } from '../generated/prisma/client.ts';

declare global {
  namespace Express {
    interface Request {
      /** Người dùng đang đăng nhập, gắn bởi requireAuth. */
      user?: User;
      /** SHA-256 của token phiên hiện tại (id bản ghi sessions), gắn bởi requireAuth. */
      sessionId?: string;
    }
  }
}

export {};
