import { Router } from 'express';
import { currentUser, requireAuth } from '../../middleware/requireAuth.ts';
import { fromExplanationSchema } from '../exams/schemas.ts';
import { addWordFromExplanation } from '../exams/practice.ts';
import { dueQuerySchema, gradeSchema } from './schemas.ts';
import { getDueReviews, gradeWord } from './service.ts';

/**
 * Ôn tập (SRS): GET /reviews/due, POST /reviews/:wordId, và POST /reviews/from-explanation
 * (SRS 2.0, FR-EXP-07: đưa từ trong lời giải đề thi vào lịch ôn). Cần đăng nhập.
 */
export const reviewsRouter = Router();

reviewsRouter.use('/reviews', requireAuth);

reviewsRouter.get('/reviews/due', async (req, res) => {
  const { limit } = dueQuerySchema.parse(req.query);
  res.json(await getDueReviews(currentUser(req).user.id, limit));
});

// Khai báo trước /reviews/:wordId, nếu không "from-explanation" bị hiểu là một wordId.
reviewsRouter.post('/reviews/from-explanation', async (req, res) => {
  const { word_id } = fromExplanationSchema.parse(req.body);
  res.json(await addWordFromExplanation(currentUser(req).user.id, word_id));
});

reviewsRouter.post('/reviews/:wordId', async (req, res) => {
  const { quality } = gradeSchema.parse(req.body);
  res.json(await gradeWord(currentUser(req).user.id, req.params.wordId, quality));
});
