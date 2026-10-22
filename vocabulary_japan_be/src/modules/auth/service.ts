import { prisma } from '../../db/prisma.ts';
import { Prisma } from '../../generated/prisma/client.ts';
import { ApiError } from '../../utils/ApiError.ts';
import { hashPassword, verifyPassword } from '../../utils/password.ts';
import type { LoginInput, RegisterInput } from './schemas.ts';

const emailTaken = () =>
  new ApiError(409, 'EMAIL_TAKEN', 'Email này đã được đăng ký', { email: 'Email này đã được đăng ký' });

/** Đăng ký tài khoản mới (role user, cài đặt mặc định). Email đã có → 409 EMAIL_TAKEN. */
export async function registerUser(input: RegisterInput) {
  if (await prisma.user.findUnique({ where: { email: input.email }, select: { id: true } })) {
    throw emailTaken();
  }
  const passwordHash = await hashPassword(input.password);
  try {
    return await prisma.user.create({
      data: { email: input.email, passwordHash, displayName: input.display_name },
    });
  } catch (error) {
    // Hai request đăng ký cùng email chạy song song: ràng buộc unique của DB chặn request thứ hai.
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') throw emailTaken();
    throw error;
  }
}

/**
 * Bản băm giả để so khi email không tồn tại: vẫn tốn đúng một lần argon2, nên thời gian phản hồi
 * không cho biết email có được đăng ký hay không (prompt mục 6.2).
 */
let dummyHash: Promise<string> | null = null;
const getDummyHash = () => (dummyHash ??= hashPassword('mat-khau-gia-khong-dung-den'));

/** Đăng nhập. Sai email hay sai mật khẩu đều trả cùng một lỗi INVALID_CREDENTIALS. */
export async function authenticate(input: LoginInput) {
  const user = await prisma.user.findUnique({ where: { email: input.email } });
  const ok = await verifyPassword(user?.passwordHash ?? (await getDummyHash()), input.password);
  if (!user || !ok) throw new ApiError(401, 'INVALID_CREDENTIALS', 'Email hoặc mật khẩu không đúng');
  return user;
}
