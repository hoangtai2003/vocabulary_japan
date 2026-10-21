import type { Quality } from '@/types/api';
import { DEFAULT_WORD_STATE } from '@/types/word';
import { applyGrade } from '@/utils/srs';
import { readDb, updateDb } from '../db';
import { api, errors, handle, http, HttpResponse, intParam, readJson, requireUser } from './http';
import { dueWords, nextDueAt, userStates, withState } from './shared';

export const reviewsHandlers = [
  http.get(
    api('/reviews/due'),
    handle(({ request }) => {
      const db = readDb();
      const user = requireUser(db);
      const now = new Date();
      const limit = intParam(new URL(request.url), 'limit', 50, 500);
      const due = dueWords(db, user.id, now);
      return HttpResponse.json({
        items: due.slice(0, limit),
        total: due.length,
        next_due_at: nextDueAt(db, user.id, now),
      });
    }),
  ),

  http.post(
    api('/reviews/:wordId'),
    handle(async ({ request, params }) => {
      const body = await readJson(request);
      const quality = body.quality;
      if (typeof quality !== 'number' || !Number.isInteger(quality) || quality < 0 || quality > 5) {
        throw errors.validation({ quality: 'quality phải là số nguyên từ 0 đến 5' });
      }

      const word = updateDb((db) => {
        const user = requireUser(db);
        const target = db.words.find((w) => w.id === params.wordId);
        if (!target) throw errors.notFound('Không tìm thấy từ này');

        // Dùng chung thuật toán với test và với backend sau này (src/utils/srs.ts).
        const now = new Date();
        const states = userStates(db, user.id);
        const before = states[target.id] ?? DEFAULT_WORD_STATE;
        states[target.id] = { ...before, ...applyGrade(before, quality as Quality, now) };
        db.reviews.push({
          user_id: user.id,
          word_id: target.id,
          quality: quality as Quality,
          reviewed_at: now.toISOString(),
          was_new: before.status === 'new',
        });
        return withState(target, states);
      });

      return HttpResponse.json({ word });
    }),
  ),
];
