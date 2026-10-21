import {
  deleteAccountSchema,
  passwordChangeRequestSchema,
  profileUpdateSchema,
  settingsUpdateSchema,
} from '@/schemas/account';
import { zodFieldErrors } from '@/schemas/fieldErrors';
import type { ExportData } from '@/types/api';
import { sha256Hex } from '../crypto';
import { clearSession, readDb, updateDb } from '../db';
import {
  api,
  errors,
  handle,
  http,
  HttpResponse,
  noContent,
  publicUser,
  readJson,
  requireUser,
} from './http';
import { userStates } from './shared';

/**
 * Sai mật khẩu hiện tại trả 400 VALIDATION_ERROR kèm fields, không trả 401, vì 401 ở các
 * endpoint này sẽ bị client hiểu là phiên hết hạn và đăng xuất người dùng.
 */
async function assertPassword(userHash: string, password: string, field: string) {
  if ((await sha256Hex(password)) !== userHash) {
    throw errors.validation({ [field]: 'Mật khẩu không đúng' });
  }
}

export const meHandlers = [
  http.put(
    api('/me/settings'),
    handle(async ({ request }) => {
      const parsed = settingsUpdateSchema.safeParse(await readJson(request));
      if (!parsed.success) throw errors.validation(zodFieldErrors(parsed.error));
      const user = updateDb((db) => {
        const current = requireUser(db);
        current.settings = { ...current.settings, ...parsed.data };
        return current;
      });
      return HttpResponse.json({ user: publicUser(user) });
    }),
  ),

  http.put(
    api('/me/profile'),
    handle(async ({ request }) => {
      const parsed = profileUpdateSchema.safeParse(await readJson(request));
      if (!parsed.success) throw errors.validation(zodFieldErrors(parsed.error));
      const user = updateDb((db) => {
        const current = requireUser(db);
        current.display_name = parsed.data.display_name;
        return current;
      });
      return HttpResponse.json({ user: publicUser(user) });
    }),
  ),

  http.put(
    api('/me/password'),
    handle(async ({ request }) => {
      const parsed = passwordChangeRequestSchema.safeParse(await readJson(request));
      if (!parsed.success) throw errors.validation(zodFieldErrors(parsed.error));
      const user = requireUser();
      await assertPassword(user.password_hash, parsed.data.current_password, 'current_password');
      const newHash = await sha256Hex(parsed.data.new_password);
      updateDb((db) => {
        const current = requireUser(db);
        current.password_hash = newHash;
      });
      return noContent();
    }),
  ),

  http.get(
    api('/me/export'),
    handle(() => {
      const db = readDb();
      const user = requireUser(db);
      const byId = new Map(db.words.map((w) => [w.id, w]));
      const data: ExportData = {
        exported_at: new Date().toISOString(),
        user: publicUser(user),
        words: Object.entries(userStates(db, user.id)).map(([wordId, state]) => ({
          word_id: wordId,
          kanji: byId.get(wordId)?.kanji ?? null,
          kana: byId.get(wordId)?.kana ?? '',
          ...state,
        })),
        reviews: db.reviews
          .filter((r) => r.user_id === user.id)
          .map(({ user_id: _u, ...rest }) => rest),
      };
      return HttpResponse.json(data);
    }),
  ),

  http.delete(
    api('/me'),
    handle(async ({ request }) => {
      const parsed = deleteAccountSchema.safeParse(await readJson(request));
      if (!parsed.success) throw errors.validation(zodFieldErrors(parsed.error));
      const user = requireUser();
      await assertPassword(user.password_hash, parsed.data.password, 'password');
      updateDb((db) => {
        db.users = db.users.filter((u) => u.id !== user.id);
        delete db.states[user.id];
        delete db.daily[user.id];
        db.reviews = db.reviews.filter((r) => r.user_id !== user.id);
        for (const [id, quiz] of Object.entries(db.quizzes)) {
          if (quiz.user_id === user.id) delete db.quizzes[id];
        }
      });
      clearSession();
      return noContent();
    }),
  ),
];
