import { noteSchema } from '@/schemas/account';
import { zodFieldErrors } from '@/schemas/fieldErrors';
import {
  DEFAULT_WORD_STATE,
  JLPT_LEVELS,
  WORD_STATUSES,
  type JlptLevel,
  type WordStatus,
} from '@/types/word';
import { toDateKey } from '@/utils/dates';
import { wordMatchesQuery } from '@/utils/normalize';
import { compareByTopicThenId } from '@/utils/today';
import { readDb, updateDb } from '../db';
import {
  api,
  errors,
  handle,
  http,
  HttpResponse,
  intParam,
  paginate,
  readJson,
  requireUser,
} from './http';
import { allWordsWithState, learnedOn, todayWordIds, userStates, withState } from './shared';

const LEVEL_ORDER: Record<JlptLevel, number> = { N5: 0, N4: 1, N3: 2 };

function updateWordState(wordId: string, patch: { is_favorite?: boolean; note?: string }) {
  return updateDb((db) => {
    const user = requireUser(db);
    const word = db.words.find((w) => w.id === wordId);
    if (!word) throw errors.notFound('Không tìm thấy từ này');
    const states = userStates(db, user.id);
    states[word.id] = { ...(states[word.id] ?? DEFAULT_WORD_STATE), ...patch };
    return withState(word, states);
  });
}

export const wordsHandlers = [
  http.get(
    api('/words/today'),
    handle(() => {
      const now = new Date();
      const result = updateDb((db) => {
        const user = requireUser(db);
        const ids = todayWordIds(db, user, now);
        const states = userStates(db, user.id);
        const byId = new Map(db.words.map((w) => [w.id, w]));
        return {
          date: toDateKey(now),
          goal: user.settings.daily_goal,
          new_words: ids.flatMap((id) => {
            const word = byId.get(id);
            return word ? [withState(word, states)] : [];
          }),
          learned_today: new Set(learnedOn(db, user.id, toDateKey(now))).size,
        };
      });
      return HttpResponse.json(result);
    }),
  ),

  http.get(
    api('/words'),
    handle(({ request }) => {
      const db = readDb();
      const user = requireUser(db);
      const url = new URL(request.url);
      const level = url.searchParams.get('level');
      const topic = url.searchParams.get('topic');
      const q = url.searchParams.get('q') ?? '';
      const favorite = url.searchParams.get('favorite');
      const status = url.searchParams.get('status');

      if (level && !(JLPT_LEVELS as readonly string[]).includes(level)) {
        throw errors.validation({ level: 'Cấp độ không hợp lệ' });
      }
      if (status && !(WORD_STATUSES as readonly string[]).includes(status)) {
        throw errors.validation({ status: 'Trạng thái không hợp lệ' });
      }

      const items = allWordsWithState(db, user.id)
        .filter((w) => !level || w.level === (level as JlptLevel))
        .filter((w) => !topic || w.topic_id === topic)
        .filter((w) => !status || w.status === (status as WordStatus))
        .filter((w) => !(favorite === 'true' || favorite === '1') || w.is_favorite)
        .filter((w) => wordMatchesQuery(w, q))
        .sort((a, b) => LEVEL_ORDER[a.level] - LEVEL_ORDER[b.level] || compareByTopicThenId(a, b));

      return HttpResponse.json(
        paginate(items, intParam(url, 'page', 1), intParam(url, 'page_size', 20, 100)),
      );
    }),
  ),

  http.get(
    api('/words/:id'),
    handle(({ params }) => {
      const db = readDb();
      const user = requireUser(db);
      const word = db.words.find((w) => w.id === params.id);
      if (!word) throw errors.notFound('Không tìm thấy từ này');
      return HttpResponse.json(withState(word, userStates(db, user.id)));
    }),
  ),

  http.get(
    api('/topics'),
    handle(() => {
      const db = readDb();
      requireUser(db);
      return HttpResponse.json(db.topics);
    }),
  ),

  http.put(
    api('/words/:id/favorite'),
    handle(async ({ request, params }) => {
      const body = await readJson(request);
      if (typeof body.is_favorite !== 'boolean') {
        throw errors.validation({ is_favorite: 'Giá trị phải là true hoặc false' });
      }
      return HttpResponse.json(
        updateWordState(String(params.id), { is_favorite: body.is_favorite }),
      );
    }),
  ),

  http.put(
    api('/words/:id/note'),
    handle(async ({ request, params }) => {
      const parsed = noteSchema.safeParse(await readJson(request));
      if (!parsed.success) throw errors.validation(zodFieldErrors(parsed.error));
      return HttpResponse.json(updateWordState(String(params.id), { note: parsed.data.note }));
    }),
  ),
];
