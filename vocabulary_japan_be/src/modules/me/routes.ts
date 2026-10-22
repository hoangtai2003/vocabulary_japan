import { Router } from 'express';
import { currentUser, requireAuth } from '../../middleware/requireAuth.ts';
import { toUserJson } from '../../serializers/user.ts';
import { clearSessionCookie } from '../auth/sessions.ts';
import { deleteAccountSchema, passwordChangeSchema, profileSchema, settingsSchema } from './schemas.ts';
import { changePassword, deleteAccount, updateProfile, updateSettings } from './service.ts';

/** Tài khoản: PUT /me/settings, /me/profile, /me/password, DELETE /me. Cần đăng nhập. */
export const meRouter = Router();

meRouter.use('/me', requireAuth);

meRouter.put('/me/settings', async (req, res) => {
  const input = settingsSchema.parse(req.body);
  res.json({ user: toUserJson(await updateSettings(currentUser(req).user.id, input)) });
});

meRouter.put('/me/profile', async (req, res) => {
  const { display_name } = profileSchema.parse(req.body);
  res.json({ user: toUserJson(await updateProfile(currentUser(req).user.id, display_name)) });
});

meRouter.put('/me/password', async (req, res) => {
  const { current_password, new_password } = passwordChangeSchema.parse(req.body);
  const { user, sessionId } = currentUser(req);
  await changePassword(user, sessionId, current_password, new_password);
  res.status(204).end();
});

meRouter.delete('/me', async (req, res) => {
  const { password } = deleteAccountSchema.parse(req.body);
  await deleteAccount(currentUser(req).user, password);
  clearSessionCookie(res);
  res.status(204).end();
});
