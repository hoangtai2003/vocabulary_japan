import { describe, expect, it } from 'vitest';
import { loginPathWithNext, safeNext } from './safeNext';

describe('safeNext', () => {
  it.each(['/tu-vung?level=N5', '/'])('chấp nhận %s', (v) => expect(safeNext(v)).toBe(v));
  it.each(['//evil.com', '/\\evil.com', 'https://evil.com', 'tu-vung', '', null])(
    'từ chối %s',
    (v) => expect(safeNext(v)).toBe('/'),
  );
  it('tạo đường dẫn đăng nhập', () => {
    expect(loginPathWithNext('/tu-vung', '?q=a')).toBe('/dang-nhap?next=%2Ftu-vung%3Fq%3Da');
    expect(loginPathWithNext('/')).toBe('/dang-nhap');
  });
});
