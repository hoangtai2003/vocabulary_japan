import type {
  AnswerKind,
  ExamIssue,
  ExamStatus,
  Explanation,
  ScoreSummary,
  SectionKind,
  VocabItem,
} from '@/utils/exam';
import type { JlptLevel, WordWithState } from './word';

/** Module luyện đề JLPT (SRS 2.0). Hình dạng JSON theo API_CONTRACT.md, phụ lục J. */

export type {
  AnswerKind,
  ExamIssue,
  ExamStatus,
  Explanation,
  GrammarPoint,
  IssueLocation,
  ScoreSummary,
  SectionKind,
  ValidationResult,
  VocabItem,
} from '@/utils/exam';

export type AttemptMode = 'exam' | 'section' | 'practice' | 'wrong_review' | 'by_type';
export type AttemptStatus = 'in_progress' | 'submitted' | 'abandoned';
export type ScopeType = 'exam' | 'section' | 'mondai' | 'wrong' | 'by_type';

export interface Attachment {
  kind: 'image' | 'audio';
  upload_id: string;
  caption: string;
}

export interface ExamRef {
  id: string;
  title: string;
  level: JlptLevel;
}

// ---------- Người học ----------

export interface ExamListItem {
  id: string;
  title: string;
  level: JlptLevel;
  difficulty: string | null;
  description: string;
  question_count: number;
  total_minutes: number;
  best: {
    attempt_id: string;
    correct: number;
    total: number;
    estimated_score: number | null;
    submitted_at: string;
  } | null;
  in_progress_attempt_id: string | null;
}

export interface ExamDetailMondai {
  id: string;
  number: number;
  type_id: string | null;
  type_label_ja: string | null;
  type_name_vi: string | null;
  question_count: number;
}

export interface ExamDetailSection {
  id: string;
  title: string;
  kind: SectionKind;
  duration_minutes: number | null;
  question_count: number;
  mondai: ExamDetailMondai[];
}

export interface ExamDetail {
  id: string;
  title: string;
  level: JlptLevel;
  difficulty: string | null;
  description: string;
  instructions: string;
  question_count: number;
  total_minutes: number;
  sections: ExamDetailSection[];
  in_progress: {
    attempt_id: string;
    mode: AttemptMode;
    scope_type: ScopeType;
    scope_id: string | null;
    started_at: string;
  } | null;
}

export interface AttemptSummary {
  id: string;
  mode: AttemptMode;
  status: 'in_progress' | 'submitted';
  scope_type: ScopeType;
  scope_id: string | null;
  scope_label: string;
  started_at: string;
  submitted_at: string | null;
  correct: number | null;
  total: number;
  estimated_score: number | null;
  regraded: boolean;
}

export type StartAttemptScope =
  | { type: 'exam' }
  | { type: 'section'; id: string }
  | { type: 'mondai'; id: string };

export interface StartAttemptRequest {
  mode: 'exam' | 'section' | 'practice';
  scope: StartAttemptScope;
  discard_in_progress?: boolean;
}

export interface AttemptIdResponse {
  attempt_id: string;
}

export interface LearnerQuestion {
  id: string;
  number: number;
  kind: AnswerKind;
  prompt: string;
  options: string[];
  star_prefix: string;
  star_suffix: string;
  star_position: number | null;
  passage_id: string | null;
  attachments: Attachment[];
}

export interface LearnerPassage {
  id: string;
  label: string;
  intro: string;
  content: string;
  attachments: Attachment[];
  /** null ở chế độ có bấm giờ (thuộc lời giải) */
  content_furigana: string | null;
  translation_vi: string | null;
}

export interface AttemptMondai {
  id: string;
  number: number;
  type_id: string | null;
  type_label_ja: string | null;
  type_name_vi: string | null;
  instructions: string;
  /** Chỉ ở chế độ không giới hạn giờ */
  tip: string | null;
  passages: LearnerPassage[];
  questions: LearnerQuestion[];
}

export interface AttemptSection {
  id: string;
  exam_id: string;
  exam_title: string;
  title: string;
  position: number;
  duration_minutes: number | null;
  started_at: string | null;
  deadline_at: string | null;
  submitted_at: string | null;
  question_count: number;
  /** null khi phần chưa bắt đầu hoặc đã nộp (chế độ có bấm giờ) */
  mondai: AttemptMondai[] | null;
}

export interface SavedAnswer {
  question_id: string;
  choice: number | null;
  flagged: boolean;
  time_spent_ms: number;
}

export interface LearnerVocabItem extends VocabItem {
  in_reviews: boolean;
}

export interface LearnerExplanation extends Omit<Explanation, 'vocab'> {
  vocab: LearnerVocabItem[];
}

export interface Solution {
  correct_option: number | null;
  star_order: number[];
  explanation: LearnerExplanation;
  learner_note: string;
}

export interface Feedback extends Solution {
  question_id: string;
  is_correct: boolean;
}

export interface AttemptState {
  id: string;
  mode: AttemptMode;
  timed: boolean;
  status: AttemptStatus;
  scope_type: ScopeType;
  scope_id: string | null;
  scope_label: string;
  level: JlptLevel;
  exam: ExamRef | null;
  started_at: string;
  submitted_at: string | null;
  server_now: string;
  current_question_id: string | null;
  sections: AttemptSection[];
  answers: SavedAnswer[];
  feedback: Feedback[];
}

export interface SaveAnswerRequest {
  choice?: number | null;
  flagged?: boolean;
  time_spent_ms?: number;
  changed_at?: string;
}

export interface SaveAnswerResponse {
  answer: SavedAnswer;
  feedback: Feedback | null;
}

export interface SubmitSectionResponse {
  attempt_status: 'in_progress' | 'submitted';
  next_section_id: string | null;
}

export interface ResultPassage {
  id: string;
  label: string;
  intro: string;
  content: string;
  content_furigana: string;
  translation_vi: string;
  attachments: Attachment[];
}

export interface ResultQuestion extends LearnerQuestion, Solution {
  chosen: number | null;
  is_correct: boolean;
  flagged: boolean;
  time_spent_ms: number;
}

export interface ResultMondai {
  id: string;
  number: number;
  type_id: string | null;
  type_label_ja: string | null;
  type_name_vi: string | null;
  instructions: string;
  tip: string;
  correct: number;
  total: number;
  passages: ResultPassage[];
  questions: ResultQuestion[];
}

export interface ResultSection {
  id: string;
  exam_id: string;
  exam_title: string;
  title: string;
  duration_minutes: number | null;
  time_used_seconds: number | null;
  correct: number;
  total: number;
  mondai: ResultMondai[];
}

export interface AttemptResult {
  id: string;
  mode: AttemptMode;
  timed: boolean;
  scope_type: ScopeType;
  scope_id: string | null;
  level: JlptLevel;
  exam: ExamRef | null;
  started_at: string;
  submitted_at: string;
  regraded_at: string | null;
  correct: number;
  total: number;
  score: ScoreSummary | null;
  sections: ResultSection[];
}

/** Dạng mondai có câu trong đề đã xuất bản (chọn khi luyện theo dạng, FR-EXAM-08). */
export interface PracticeType {
  id: string;
  level: JlptLevel;
  section_title: string;
  label_ja: string;
  name_vi: string;
  has_passage: boolean;
  question_count: number;
}

export interface WrongQuestionItem {
  question_id: string;
  exam_id: string;
  exam_title: string;
  level: JlptLevel;
  section_title: string;
  mondai_number: number;
  type_id: string | null;
  type_name_vi: string | null;
  number: number | null;
  prompt_preview: string;
  correct_streak: number;
  last_wrong_at: string;
}

export interface WrongQuestionsResponse {
  total: number;
  items: WrongQuestionItem[];
}

export interface ByTypeRequest {
  level: JlptLevel;
  mondai_type: string;
  count: number;
}

export interface ExamStats {
  attempts: {
    attempt_id: string;
    exam_id: string | null;
    exam_title: string;
    level: JlptLevel;
    submitted_at: string;
    correct: number;
    total: number;
    estimated_score: number | null;
  }[];
  by_type: {
    type_id: string;
    level: JlptLevel | null;
    label_ja: string;
    name_vi: string;
    answered: number;
    correct: number;
    accuracy: number;
    avg_time_ms: number | null;
    standard_time_ms: number | null;
  }[];
}

export interface FromExplanationResponse {
  word: WordWithState;
  already_in_reviews: boolean;
}

// ---------- Quản trị ----------

export interface ExamInfo {
  id: string;
  title: string;
  level: JlptLevel;
  difficulty: string | null;
  description: string;
  instructions: string;
  source: string;
  status: ExamStatus;
  published_at: string | null;
  created_at: string;
  updated_at: string;
}

export type ExamInfoInput = Pick<ExamInfo, 'title' | 'level' | 'difficulty' | 'description' | 'instructions' | 'source'>;

export interface AdminExamListItem extends ExamInfo {
  question_count: number;
  flagged_count: number;
  attempt_count: number;
}

export interface AdminPassage {
  id: string;
  position: number;
  label: string;
  intro: string;
  content: string;
  content_furigana: string;
  translation_vi: string;
  attachments: Attachment[];
}

export interface AdminQuestion {
  id: string;
  position: number;
  number: number;
  number_override: number | null;
  passage_id: string | null;
  kind: AnswerKind;
  prompt: string;
  options: string[];
  correct_option: number | null;
  star_prefix: string;
  star_suffix: string;
  star_position: number | null;
  star_order: number[];
  explanation: Explanation;
  learner_note: string;
  needs_review: boolean;
  internal_note: string;
  attachments: Attachment[];
  updated_at: string;
}

export interface AdminMondai {
  id: string;
  position: number;
  number: number;
  type_id: string | null;
  instructions: string;
  tip: string;
  passages: AdminPassage[];
  questions: AdminQuestion[];
}

export interface AdminSection {
  id: string;
  position: number;
  title: string;
  kind: SectionKind;
  duration_minutes: number | null;
  score_group: string;
  mondai: AdminMondai[];
}

export interface AdminExam extends ExamInfo {
  attempt_count: number;
  sections: AdminSection[];
}

export type SectionInput = Partial<Pick<AdminSection, 'title' | 'kind' | 'duration_minutes' | 'score_group'>>;
export type MondaiInput = Partial<Pick<AdminMondai, 'number' | 'type_id' | 'instructions' | 'tip'>>;
export type PassageInput = Partial<Omit<AdminPassage, 'id' | 'position'>>;
export type QuestionInput = Partial<Omit<AdminQuestion, 'id' | 'position' | 'number' | 'updated_at'>> & {
  confirm_regrade?: boolean;
};

export interface ExamOrder {
  sections: { id: string; mondai: { id: string; passages: string[]; questions: string[] }[] }[];
}

export interface MondaiType {
  id: string;
  level: JlptLevel;
  section_title: string;
  label_ja: string;
  name_vi: string;
  answer_kind: AnswerKind;
  has_passage: boolean;
  default_instructions: string;
  sort_order: number;
}

export interface ImportIssue extends ExamIssue {
  path?: string | null;
}

export interface ImportDryRun {
  valid: boolean;
  summary: { sections: number; mondai: number; passages: number; questions: number } | null;
  errors: ImportIssue[];
  warnings: ImportIssue[];
  preview: AdminExam | null;
}

export interface ImportResult {
  exam: AdminExam;
  warnings: ImportIssue[];
}

export interface QuestionEdit {
  id: string;
  edited_at: string;
  editor: { display_name: string; email: string } | null;
  fields: string[];
}

export interface UploadResult {
  id: string;
  content_type: string;
  size: number;
  markup: string;
}
