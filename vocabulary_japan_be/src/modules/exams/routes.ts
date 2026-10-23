import { Router } from 'express';
import { currentUser, requireAuth } from '../../middleware/requireAuth.ts';
import { readUpload } from '../examAdmin/uploads.ts';
import {
  finishAttempt,
  getAttemptState,
  saveAnswer,
  savePosition,
  startExamAttempt,
  startSection,
  submitSection,
} from './attempts.ts';
import { getExamStats, listPracticeTypes, listWrongQuestions, startByType, startWrongReview } from './practice.ts';
import { getAttemptResult, listExamAttempts } from './results.ts';
import {
  answerSchema,
  byTypeSchema,
  examListQuerySchema,
  positionSchema,
  startAttemptSchema,
  wrongReviewSchema,
} from './schemas.ts';
import { getPublishedExam, listPublishedExams } from './service.ts';

/**
 * Luyện đề cho người học (SRS 2.0, mục 3.11 đến 3.14, 5.2). Cần đăng nhập; mọi lượt làm chỉ chủ
 * lượt xem được (của người khác → 404).
 */
export const examsRouter = Router();

examsRouter.use(['/exams', '/attempts', '/practice', '/stats/exams', '/uploads'], requireAuth);

const userId = (req: Express.Request) => currentUser(req).user.id;

examsRouter.get('/exams', async (req, res) => {
  const { level } = examListQuerySchema.parse(req.query);
  res.json(await listPublishedExams(userId(req), level));
});

examsRouter.get('/exams/:id', async (req, res) => {
  res.json(await getPublishedExam(userId(req), req.params.id));
});

examsRouter.get('/exams/:id/attempts', async (req, res) => {
  res.json(await listExamAttempts(userId(req), req.params.id));
});

examsRouter.post('/exams/:id/attempts', async (req, res) => {
  res.status(201).json(await startExamAttempt(userId(req), req.params.id, startAttemptSchema.parse(req.body)));
});

examsRouter.get('/attempts/:id', async (req, res) => {
  res.json(await getAttemptState(userId(req), req.params.id));
});

examsRouter.put('/attempts/:id/position', async (req, res) => {
  await savePosition(userId(req), req.params.id, positionSchema.parse(req.body).question_id);
  res.status(204).end();
});

examsRouter.post('/attempts/:id/sections/:sectionId/start', async (req, res) => {
  res.json(await startSection(userId(req), req.params.id, req.params.sectionId));
});

examsRouter.put('/attempts/:id/answers/:questionId', async (req, res) => {
  res.json(await saveAnswer(userId(req), req.params.id, req.params.questionId, answerSchema.parse(req.body)));
});

examsRouter.post('/attempts/:id/sections/:sectionId/submit', async (req, res) => {
  res.json(await submitSection(userId(req), req.params.id, req.params.sectionId));
});

examsRouter.post('/attempts/:id/finish', async (req, res) => {
  res.json(await finishAttempt(userId(req), req.params.id));
});

examsRouter.get('/attempts/:id/result', async (req, res) => {
  res.json(await getAttemptResult(userId(req), req.params.id));
});

examsRouter.get('/practice/mondai-types', async (req, res) => {
  const { level } = examListQuerySchema.parse(req.query);
  res.json(await listPracticeTypes(level));
});

examsRouter.get('/practice/wrong-questions', async (req, res) => {
  res.json(await listWrongQuestions(userId(req)));
});

examsRouter.post('/practice/wrong-questions', async (req, res) => {
  res.status(201).json(await startWrongReview(userId(req), wrongReviewSchema.parse(req.body ?? {})));
});

examsRouter.post('/practice/by-type', async (req, res) => {
  res.status(201).json(await startByType(userId(req), byTypeSchema.parse(req.body)));
});

examsRouter.get('/stats/exams', async (req, res) => {
  res.json(await getExamStats(userId(req)));
});

/** Ảnh của bài đọc (DR-EX-08): cần đăng nhập, trình duyệt được cache riêng 1 ngày. */
examsRouter.get('/uploads/:id', async (req, res) => {
  const file = await readUpload(req.params.id);
  res.set('Cache-Control', 'private, max-age=86400').type(file.contentType).send(file.data);
});
