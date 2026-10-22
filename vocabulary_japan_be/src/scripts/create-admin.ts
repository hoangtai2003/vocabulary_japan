/**
 * Tạo (hoặc nâng quyền) tài khoản admin, dùng cho production (prompt mục 8):
 *   npm run create-admin -- --email admin@ten-mien.vn --password 'mat-khau-manh' [--name 'Tên']
 * Email đã có: đổi thành admin và đặt lại mật khẩu theo tham số.
 */
import { parseArgs } from 'node:util';
import { z } from 'zod';
import { prisma } from '../db/prisma.ts';
import { hashPassword, normalizeEmail, PASSWORD_MAX, PASSWORD_MIN } from '../utils/password.ts';

const argsSchema = z.object({
  email: z.email('Email không hợp lệ'),
  password: z
    .string({ error: 'Thiếu --password' })
    .min(PASSWORD_MIN, `Mật khẩu cần ít nhất ${PASSWORD_MIN} ký tự`)
    .max(PASSWORD_MAX, `Mật khẩu tối đa ${PASSWORD_MAX} ký tự`),
  name: z.string().trim().min(2).max(40).default('Quản trị viên'),
});

async function main() {
  const { values } = parseArgs({
    options: { email: { type: 'string' }, password: { type: 'string' }, name: { type: 'string' } },
  });
  const parsed = argsSchema.safeParse({ ...values, email: values.email ? normalizeEmail(values.email) : undefined });
  if (!parsed.success) {
    for (const issue of parsed.error.issues) console.error(`  - ${issue.path.join('.') || 'tham số'}: ${issue.message}`);
    console.error("Cách dùng: npm run create-admin -- --email a@b.vn --password 'mat-khau' [--name 'Tên']");
    process.exitCode = 1;
    return;
  }
  const { email, password, name } = parsed.data;
  const passwordHash = await hashPassword(password);
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    await prisma.$transaction([
      prisma.user.update({ where: { id: existing.id }, data: { role: 'admin', passwordHash } }),
      // Đặt lại mật khẩu thì đăng xuất mọi phiên cũ.
      prisma.session.deleteMany({ where: { userId: existing.id } }),
    ]);
    console.log(`Đã nâng ${email} thành admin và đặt lại mật khẩu.`);
  } else {
    await prisma.user.create({ data: { email, passwordHash, displayName: name, role: 'admin' } });
    console.log(`Đã tạo admin ${email}.`);
  }
}

main()
  .catch((error: unknown) => {
    console.error('Tạo admin thất bại:', error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
