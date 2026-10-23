import type { AdminWordsQuery, WordsQuery } from '@/types/api';
import type { ExamStatus } from '@/types/exam';
import type { JlptLevel } from '@/types/word';

/**
 * Query key tập trung. Key có cấu trúc phân cấp để invalidate theo tiền tố:
 * invalidate ['stats'] làm mới mọi thống kê, ['reviews', 'due'] làm mới mọi giới hạn.
 */
export const queryKeys = {
  auth: {
    me: ['auth', 'me'] as const,
  },
  words: {
    all: ['words'] as const,
    today: ['words', 'today'] as const,
    lists: ['words', 'list'] as const,
    list: (filters: Omit<WordsQuery, 'page'>) => ['words', 'list', filters] as const,
    details: ['words', 'detail'] as const,
    detail: (id: string) => ['words', 'detail', id] as const,
  },
  topics: ['topics'] as const,
  reviews: {
    all: ['reviews'] as const,
    due: ['reviews', 'due'] as const,
    dueWithLimit: (limit: number) => ['reviews', 'due', { limit }] as const,
  },
  stats: {
    all: ['stats'] as const,
    overview: ['stats', 'overview'] as const,
    weekly: (weeks: number) => ['stats', 'weekly', { weeks }] as const,
    calendar: (from: string, to: string) => ['stats', 'calendar', { from, to }] as const,
    exams: ['stats', 'exams'] as const,
  },
  exams: {
    all: ['exams'] as const,
    list: (level: JlptLevel | undefined) => ['exams', 'list', { level }] as const,
    detail: (examId: string) => ['exams', 'detail', examId] as const,
    attempts: (examId: string) => ['exams', 'attempts', examId] as const,
    wrongQuestions: ['exams', 'wrong-questions'] as const,
    practiceTypes: (level: JlptLevel | undefined) => ['exams', 'practice-types', { level }] as const,
  },
  attempts: {
    all: ['attempts'] as const,
    state: (attemptId: string) => ['attempts', 'state', attemptId] as const,
    result: (attemptId: string) => ['attempts', 'result', attemptId] as const,
  },
  admin: {
    words: {
      all: ['admin', 'words'] as const,
      list: (params: AdminWordsQuery) => ['admin', 'words', 'list', params] as const,
    },
    exams: {
      all: ['admin', 'exams'] as const,
      list: (filter: { level?: JlptLevel; status?: ExamStatus }) => ['admin', 'exams', 'list', filter] as const,
      detail: (examId: string) => ['admin', 'exams', 'detail', examId] as const,
      history: (questionId: string) => ['admin', 'exams', 'history', questionId] as const,
    },
    mondaiTypes: ['admin', 'mondai-types'] as const,
  },
};
