import { Router } from 'express';

/** GET /api/health — kiểm tra server còn sống khi deploy (Nginx, systemd, giám sát). */
export const healthRouter = Router();

healthRouter.get('/health', (_req, res) => {
  res.json({ ok: true });
});
