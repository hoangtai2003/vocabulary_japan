import type {
  AdminExam,
  AdminExamListItem,
  AdminMondai,
  AdminPassage,
  AdminQuestion,
  AdminSection,
  ExamInfoInput,
  ExamOrder,
  ExamStatus,
  ImportDryRun,
  ImportResult,
  MondaiInput,
  MondaiType,
  PassageInput,
  QuestionEdit,
  QuestionInput,
  SectionInput,
  UploadResult,
  ValidationResult,
} from '@/types/exam';
import type { JlptLevel } from '@/types/word';
import { apiClient } from './client';

const id = encodeURIComponent;

/** Quản trị đề thi (SRS 2.0, mục 3.15, 3.16). Thêm/xóa trả trọn cây đề; sửa trả phần vừa sửa. */
export const examAdminApi = {
  list: (filter: { level?: JlptLevel; status?: ExamStatus }, signal?: AbortSignal) =>
    apiClient.get<AdminExamListItem[]>('/admin/exams', filter, signal),
  get: (examId: string, signal?: AbortSignal) =>
    apiClient.get<AdminExam>(`/admin/exams/${id(examId)}`, undefined, signal),
  create: (body: ExamInfoInput) => apiClient.post<AdminExam>('/admin/exams', body),
  updateInfo: (examId: string, body: Partial<ExamInfoInput>) =>
    apiClient.put<AdminExam>(`/admin/exams/${id(examId)}`, body),
  remove: (examId: string) => apiClient.delete<void>(`/admin/exams/${id(examId)}`),
  duplicate: (examId: string) => apiClient.post<AdminExam>(`/admin/exams/${id(examId)}/duplicate`),
  validate: (examId: string) => apiClient.post<ValidationResult>(`/admin/exams/${id(examId)}/validate`),
  setStatus: (examId: string, status: ExamStatus) =>
    apiClient.put<AdminExam>(`/admin/exams/${id(examId)}/status`, { status }),
  reorder: (examId: string, order: ExamOrder) =>
    apiClient.put<AdminExam>(`/admin/exams/${id(examId)}/order`, order),
  exportFile: (examId: string) => apiClient.download(`/admin/exams/${id(examId)}/export`, 'de-thi.json'),
  importTemplate: () => apiClient.download('/admin/exams/import-template', 'de-mau-n4-de-luyen-11.json'),
  importDryRun: (content: string) =>
    apiClient.post<ImportDryRun>('/admin/exams/import', { content, dry_run: true }),
  importExam: (content: string) =>
    apiClient.post<ImportResult>('/admin/exams/import', { content, dry_run: false }),

  createSection: (examId: string, body: SectionInput & { title: string }) =>
    apiClient.post<AdminExam>('/admin/sections', { exam_id: examId, ...body }),
  updateSection: (sectionId: string, body: SectionInput) =>
    apiClient.put<Omit<AdminSection, 'mondai'>>(`/admin/sections/${id(sectionId)}`, body),
  deleteSection: (sectionId: string) => apiClient.delete<AdminExam>(`/admin/sections/${id(sectionId)}`),

  createMondai: (sectionId: string, body: MondaiInput) =>
    apiClient.post<AdminExam>('/admin/mondai', { section_id: sectionId, ...body }),
  updateMondai: (mondaiId: string, body: MondaiInput) =>
    apiClient.put<Omit<AdminMondai, 'passages' | 'questions'>>(`/admin/mondai/${id(mondaiId)}`, body),
  deleteMondai: (mondaiId: string) => apiClient.delete<AdminExam>(`/admin/mondai/${id(mondaiId)}`),

  createPassage: (mondaiId: string, body: PassageInput = {}) =>
    apiClient.post<AdminExam>('/admin/passages', { mondai_id: mondaiId, ...body }),
  updatePassage: (passageId: string, body: PassageInput) =>
    apiClient.put<AdminPassage>(`/admin/passages/${id(passageId)}`, body),
  deletePassage: (passageId: string) => apiClient.delete<AdminExam>(`/admin/passages/${id(passageId)}`),

  createQuestion: (mondaiId: string, body: QuestionInput = {}) =>
    apiClient.post<AdminExam>('/admin/questions', { mondai_id: mondaiId, ...body }),
  updateQuestion: (questionId: string, body: QuestionInput) =>
    apiClient.put<AdminQuestion>(`/admin/questions/${id(questionId)}`, body),
  deleteQuestion: (questionId: string) => apiClient.delete<AdminExam>(`/admin/questions/${id(questionId)}`),
  questionHistory: (questionId: string, signal?: AbortSignal) =>
    apiClient.get<QuestionEdit[]>(`/admin/questions/${id(questionId)}/history`, undefined, signal),

  upload: (file: File) => apiClient.upload<UploadResult>('/admin/uploads', file),

  mondaiTypes: (signal?: AbortSignal) => apiClient.get<MondaiType[]>('/admin/mondai-types', undefined, signal),
  createMondaiType: (body: MondaiType) => apiClient.post<MondaiType>('/admin/mondai-types', body),
  updateMondaiType: (typeId: string, body: Partial<Omit<MondaiType, 'id'>>) =>
    apiClient.put<MondaiType>(`/admin/mondai-types/${id(typeId)}`, body),
};
