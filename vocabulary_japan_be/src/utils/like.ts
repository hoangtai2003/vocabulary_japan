/**
 * Escape ký tự đại diện của LIKE/ILIKE trong PostgreSQL (ký tự escape mặc định là \).
 * Prisma không tự escape trong `contains`, nên "%" hay "_" sẽ khớp mọi từ nếu không escape.
 */
export const escapeLike = (value: string) => value.replace(/[\\%_]/g, '\\$&');
