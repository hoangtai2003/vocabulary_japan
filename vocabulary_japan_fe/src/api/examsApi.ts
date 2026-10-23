import type {
  AttemptIdResponse,
  AttemptResult,
  AttemptState,
  AttemptSummary,
  ByTypeRequest,
  ExamDetail,
  ExamListItem,
  ExamStats,
  FromExplanationResponse,
  PracticeType,
  SaveAnswerRequest,
  SaveAnswerResponse,
  StartAttemptRequest,
  SubmitSectionResponse,
  WrongQuestionsResponse,
} from '@/types/exam';
import type { JlptLevel } from '@/types/word';
import { apiClient } from './client';
import { API_PREFIX, API_URL } from './env';

const id = encodeURIComponent;

/** Luyện đề cho người học (SRS 2.0, API_CONTRACT.md mục "Luyện đề JLPT"). */
export const examsApi = {
  list: (level: JlptLevel | undefined, signal?: AbortSignal) =>
    apiClient.get<ExamListItem[]>('/exams', { level }, signal),

  detail: (examId: string, signal?: AbortSignal) =>
    apiClient.get<ExamDetail>(`/exams/${id(examId)}`, undefined, signal),

  attempts: (examId: string, signal?: AbortSignal) =>
    apiClient.get<AttemptSummary[]>(`/exams/${id(examId)}/attempts`, undefined, signal),

  startAttempt: (examId: string, body: StartAttemptRequest) =>
    apiClient.post<AttemptIdResponse>(`/exams/${id(examId)}/attempts`, body),

  attempt: (attemptId: string, signal?: AbortSignal) =>
    apiClient.get<AttemptState>(`/attempts/${id(attemptId)}`, undefined, signal),

  savePosition: (attemptId: string, questionId: string) =>
    apiClient.put<void>(`/attempts/${id(attemptId)}/position`, { question_id: questionId }),

  startSection: (attemptId: string, sectionId: string) =>
    apiClient.post<AttemptState>(`/attempts/${id(attemptId)}/sections/${id(sectionId)}/start`),

  saveAnswer: (attemptId: string, questionId: string, body: SaveAnswerRequest) =>
    apiClient.put<SaveAnswerResponse>(`/attempts/${id(attemptId)}/answers/${id(questionId)}`, body),

  submitSection: (attemptId: string, sectionId: string) =>
    apiClient.post<SubmitSectionResponse>(`/attempts/${id(attemptId)}/sections/${id(sectionId)}/submit`),

  finish: (attemptId: string) =>
    apiClient.post<{ attempt_status: 'submitted' }>(`/attempts/${id(attemptId)}/finish`),

  result: (attemptId: string, signal?: AbortSignal) =>
    apiClient.get<AttemptResult>(`/attempts/${id(attemptId)}/result`, undefined, signal),

  practiceTypes: (level: JlptLevel | undefined, signal?: AbortSignal) =>
    apiClient.get<PracticeType[]>('/practice/mondai-types', { level }, signal),

  wrongQuestions: (signal?: AbortSignal) =>
    apiClient.get<WrongQuestionsResponse>('/practice/wrong-questions', undefined, signal),

  startWrongReview: (body: { level?: JlptLevel; limit?: number } = {}) =>
    apiClient.post<AttemptIdResponse>('/practice/wrong-questions', body),

  startByType: (body: ByTypeRequest) => apiClient.post<AttemptIdResponse>('/practice/by-type', body),

  stats: (signal?: AbortSignal) => apiClient.get<ExamStats>('/stats/exams', undefined, signal),

  addWordToReviews: (wordId: string) =>
    apiClient.post<FromExplanationResponse>('/reviews/from-explanation', { word_id: wordId }),
};

/** Địa chỉ ảnh của bài đọc (DR-EX-08: ![mô tả](upload:<id>)); cookie phiên đi kèm vì cùng domain. */
export const uploadUrl = (uploadId: string) => `${API_URL}${API_PREFIX}/uploads/${id(uploadId)}`;
