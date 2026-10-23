import { loginSchema, registerRequestSchema } from '@/schemas/auth';
import { zodFieldErrors } from '@/schemas/fieldErrors';
import { DEFAULT_SETTINGS } from '@/types/user';
import { clearSession, readDb, setSessionUserId, updateDb } from '../db';
import { makeId, sha256Hex } from '../crypto';
import type { MockUserRecord } from '../types';
import {
  api,
  errors,
  handle,
  http,
  HttpResponse,
  MockHttpError,
  noContent,
  publicUser,
  readJson,
  requireUser,
} from './http';

export const authHandlers = [
  http.post(
    api('/auth/register'),
    handle(async ({ request }) => {
      const parsed = registerRequestSchema.safeParse(await readJson(request));
      if (!parsed.success) throw errors.validation(zodFieldErrors(parsed.error));
      const { email, password, display_name } = parsed.data;

      if (readDb().users.some((u) => u.email === email)) {
        throw new MockHttpError(409, 'EMAIL_TAKEN', 'Email này đã được đăng ký', {
          email: 'Email này đã được đăng ký',
        });
      }

      const user: MockUserRecord = {
        id: makeId('u'),
        email,
        display_name,
        role: 'user',
        created_at: new Date().toISOString(),
        settings: { ...DEFAULT_SETTINGS },
        password_hash: await sha256Hex(password),
      };
      updateDb((db) => {
        db.users.push(user);
        db.states[user.id] = {};
      });
      setSessionUserId(user.id);
      return HttpResponse.json({ user: publicUser(user) }, { status: 201 });
    }),
  ),

  http.post(
    api('/auth/login'),
    handle(async ({ request }) => {
      const parsed = loginSchema.safeParse(await readJson(request));
      if (!parsed.success) throw errors.validation(zodFieldErrors(parsed.error));

      const user = readDb().users.find((u) => u.email === parsed.data.email);
      const hash = await sha256Hex(parsed.data.password);
      if (!user || user.password_hash !== hash) {
        throw new MockHttpError(401, 'INVALID_CREDENTIALS', 'Email hoặc mật khẩu không đúng');
      }
      setSessionUserId(user.id);
      return HttpResponse.json({ user: publicUser(user) });
    }),
  ),

  http.post(
    api('/auth/logout'),
    handle(() => {
      clearSession();
      return noContent();
    }),
  ),

  http.get(
    api('/auth/me'),
    handle(() => HttpResponse.json({ user: publicUser(requireUser()) })),
  ),
];
