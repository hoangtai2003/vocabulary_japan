import { Router } from 'express';
import { currentUser, requireAuth } from '../../middleware/requireAuth.ts';
import { favoriteSchema, listWordsQuerySchema, noteSchema } from './schemas.ts';
import { getToday, getWord, listTopics, listWords, setFavorite, setNote } from './service.ts';

/** Từ vựng và chủ đề. Mọi route cần đăng nhập. Route chỉ validate rồi gọi service. */
export const wordsRouter = Router();

wordsRouter.use(['/words', '/topics'], requireAuth);

// /words/today phải đứng trước /words/:id.
wordsRouter.get('/words/today', async (req, res) => {
  res.json(await getToday(currentUser(req).user));
});

wordsRouter.get('/words', async (req, res) => {
  const query = listWordsQuerySchema.parse(req.query);
  res.json(await listWords(currentUser(req).user.id, query));
});

wordsRouter.get('/words/:id', async (req, res) => {
  res.json(await getWord(currentUser(req).user.id, req.params.id));
});

wordsRouter.put('/words/:id/favorite', async (req, res) => {
  const { is_favorite } = favoriteSchema.parse(req.body);
  res.json(await setFavorite(currentUser(req).user.id, req.params.id, is_favorite));
});

wordsRouter.put('/words/:id/note', async (req, res) => {
  const { note } = noteSchema.parse(req.body);
  res.json(await setNote(currentUser(req).user.id, req.params.id, note));
});

wordsRouter.get('/topics', async (_req, res) => {
  res.json(await listTopics());
});
