import { Router } from 'express';
import { currentUser, requireAuth } from '../../middleware/requireAuth.ts';
import { calendarQuerySchema, weeklyQuerySchema } from './schemas.ts';
import { getCalendar, getOverview, getWeekly } from './service.ts';

/** Thống kê: GET /stats/overview, /stats/weekly, /stats/calendar. Cần đăng nhập. */
export const statsRouter = Router();

statsRouter.use('/stats', requireAuth);

statsRouter.get('/stats/overview', async (req, res) => {
  res.json(await getOverview(currentUser(req).user));
});

statsRouter.get('/stats/weekly', async (req, res) => {
  const { weeks } = weeklyQuerySchema.parse(req.query);
  res.json(await getWeekly(currentUser(req).user.id, weeks));
});

statsRouter.get('/stats/calendar', async (req, res) => {
  const { from, to } = calendarQuerySchema.parse(req.query);
  res.json(await getCalendar(currentUser(req).user.id, from, to));
});
