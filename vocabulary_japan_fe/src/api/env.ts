export type ApiMode = 'mock' | 'real';

/** Chế độ API, mặc định mock. Chỉ đổi bằng biến môi trường VITE_API_MODE. */
export const API_MODE: ApiMode = import.meta.env.VITE_API_MODE === 'real' ? 'real' : 'mock';

export const isMockMode = API_MODE === 'mock';

/** URL gốc backend, rỗng = gọi cùng domain. Bỏ dấu / cuối. */
export const API_URL = (import.meta.env.VITE_API_URL ?? '').replace(/\/+$/, '');

/** Mọi endpoint có tiền tố /api. */
export const API_PREFIX = '/api';
