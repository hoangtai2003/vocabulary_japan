import { Router } from 'express';
import { requireAdmin } from '../../middleware/requireAdmin.ts';
import { requireAuth } from '../../middleware/requireAuth.ts';
import { examAdminRouter } from '../examAdmin/routes.ts';
import { adminListQuerySchema, wordInputSchema } from './schemas.ts';
import { createWord, deleteWord, listAdminWords, updateWord } from './service.ts';

/** Quản trị (prompt mục 7): mọi route /admin/* đi qua requireAuth rồi requireAdmin. */
export const adminRouter = Router();

adminRouter.use('/admin', requireAuth, requireAdmin);

adminRouter.get('/admin/words', async (req, res) => {
  res.json(await listAdminWords(adminListQuerySchema.parse(req.query)));
});

adminRouter.post('/admin/words', async (req, res) => {
  res.status(201).json(await createWord(wordInputSchema.parse(req.body)));
});

adminRouter.put('/admin/words/:id', async (req, res) => {
  res.json(await updateWord(req.params.id, wordInputSchema.parse(req.body)));
});

adminRouter.delete('/admin/words/:id', async (req, res) => {
  await deleteWord(req.params.id);
  res.status(204).end();
});

// Quản trị đề thi (SRS 2.0): cùng lớp requireAuth + requireAdmin ở trên.
adminRouter.use(examAdminRouter);
