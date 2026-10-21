import type {
  QuizResult,
  QuizStartRequest,
  QuizStartResponse,
  QuizSubmitRequest,
} from '@/types/api';
import { apiClient } from './client';

export const quizApi = {
  start: (body: QuizStartRequest) => apiClient.post<QuizStartResponse>('/quiz/start', body),
  submit: (body: QuizSubmitRequest) => apiClient.post<QuizResult>('/quiz/submit', body),
};
