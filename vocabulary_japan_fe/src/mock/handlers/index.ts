import { adminHandlers } from './admin';
import { authHandlers } from './auth';
import { meHandlers } from './me';
import { quizHandlers } from './quiz';
import { reviewsHandlers } from './reviews';
import { statsHandlers } from './stats';
import { wordsHandlers } from './words';

// GET /words/today phải đứng trước GET /words/:id (thứ tự trong words.ts đã bảo đảm).
export const handlers = [
  ...authHandlers,
  ...wordsHandlers,
  ...reviewsHandlers,
  ...quizHandlers,
  ...statsHandlers,
  ...meHandlers,
  ...adminHandlers,
];
