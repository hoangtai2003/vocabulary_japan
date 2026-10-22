import { Router } from 'express';
import { currentUser, requireAuth } from '../../middleware/requireAuth.ts';
import { dueQuerySchema, gradeSchema } from './schemas.ts';
import { getDueReviews, gradeWord } from './service.ts';

/** Ôn tập (SRS): GET /reviews/due, POST /reviews/:wordId. Cần đăng nhập. */
export const reviewsRouter = Router();

reviewsRouter.use('/reviews', requireAuth);

reviewsRouter.get('/reviews/due', async (req, res) => {
  const { limit } = dueQuerySchema.parse(req.query);
  res.json(await getDueReviews(currentUser(req).user.id, limit));
});

reviewsRouter.post('/reviews/:wordId', async (req, res) => {
  const { quality } = gradeSchema.parse(req.body);
  res.json(await gradeWord(currentUser(req).user.id, req.params.wordId, quality));
});
