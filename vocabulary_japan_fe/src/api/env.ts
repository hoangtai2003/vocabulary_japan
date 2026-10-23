/** URL gốc backend, rỗng = gọi cùng domain. Bỏ dấu / cuối. */
export const API_URL = (import.meta.env.VITE_API_URL ?? '').replace(/\/+$/, '');

/** Mọi endpoint có tiền tố /api. */
export const API_PREFIX = '/api';
