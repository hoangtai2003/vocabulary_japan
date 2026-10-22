import { Router } from 'express';
import { currentUser, requireAuth } from '../../middleware/requireAuth.ts';
import { startQuizSchema, submitQuizSchema } from './schemas.ts';
import { startQuiz, submitQuiz } from './service.ts';

/** Quiz: POST /quiz/start, POST /quiz/submit. Cần đăng nhập. */
export const quizRouter = Router();

quizRouter.use('/quiz', requireAuth);

quizRouter.post('/quiz/start', async (req, res) => {
  const input = startQuizSchema.parse(req.body);
  res.json(await startQuiz(currentUser(req).user.id, input));
});

quizRouter.post('/quiz/submit', async (req, res) => {
  const input = submitQuizSchema.parse(req.body);
  res.json(await submitQuiz(currentUser(req).user.id, input));
});
