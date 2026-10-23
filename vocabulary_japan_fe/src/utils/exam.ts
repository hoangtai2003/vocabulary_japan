/**
 * Luật nghiệp vụ của module luyện đề (SRS 2.0). Chép nguyên từ backend (src/domain/exam.ts):
 * thời gian chuẩn, đánh số câu (DR-EX-05), kiểm tra đề (DR-EX-06, 07, 10), đáp án câu ★ và điểm
 * ước tính (FR-RES-03 đến 06). Frontend dùng để đánh số lại ngay khi soạn và hiển thị.
 */
import type { JlptLevel } from '@/types/word';
import { numberedBlanks, parseMarkup } from './markup';

export type ExamStatus = 'draft' | 'pending_review' | 'published' | 'hidden';
export type AnswerKind = 'choice' | 'star';
export type SectionKind = 'reading' | 'listening';

export const EXAM_STATUSES: ExamStatus[] = ['draft', 'pending_review', 'published', 'hidden'];

/** Chuyển trạng thái được phép (FR-CMS-13). Một quản trị viên vừa soạn vừa duyệt (mục 7.2, điểm 4). */
export const STATUS_TRANSITIONS: Record<ExamStatus, ExamStatus[]> = {
  draft: ['pending_review'],
  pending_review: ['draft', 'published'],
  published: ['hidden'],
  hidden: ['published', 'draft'],
};

export const SCORE_GROUP_LANGUAGE_READING = 'Kiến thức ngôn ngữ・Đọc hiểu';

/** Thời gian chuẩn từng phần thi theo cấp (mục 2.2); đề mới tạo sẵn hai phần theo bảng này. */
export const STANDARD_SECTIONS: Record<JlptLevel, { title: string; minutes: number }[]> = {
  N5: [
    { title: '言語知識（文字・語彙）', minutes: 20 },
    { title: '言語知識（文法）・読解', minutes: 40 },
  ],
  N4: [
    { title: '言語知識（文字・語彙）', minutes: 25 },
    { title: '言語知識（文法）・読解', minutes: 55 },
  ],
  N3: [
    { title: '言語知識（文字・語彙）', minutes: 30 },
    { title: '言語知識（文法）・読解', minutes: 70 },
  ],
};

export interface GrammarPoint {
  pattern: string;
  explanation: string;
  examples: string[];
}

export interface VocabItem {
  word: string;
  reading: string;
  meaning: string;
  /** Mã từ trong kho từ vựng; null khi kho chưa có từ này. */
  word_id: string | null;
}

/** Lời giải 6 mục (FR-EXP-02, DR-EX-09). Mục trống thì không hiển thị. */
export interface Explanation {
  answer: string;
  full_sentence: string;
  translation_vi: string;
  why_correct: string;
  why_wrong: string;
  grammar: GrammarPoint[];
  vocab: VocabItem[];
}

export const EMPTY_EXPLANATION: Explanation = {
  answer: '',
  full_sentence: '',
  translation_vi: '',
  why_correct: '',
  why_wrong: '',
  grammar: [],
  vocab: [],
};

export function isExplanationEmpty(e: Explanation): boolean {
  return (
    !e.answer.trim() &&
    !e.full_sentence.trim() &&
    !e.translation_vi.trim() &&
    !e.why_correct.trim() &&
    !e.why_wrong.trim() &&
    e.grammar.length === 0 &&
    e.vocab.length === 0
  );
}

// ---------- Câu ★ ----------

/** Đáp án đúng của câu ★: số của mảnh nằm ở ô ★ trong thứ tự đúng (DR-EX-07). */
export function starAnswer(starOrder: number[], starPosition: number | null): number | null {
  if (!starPosition || starPosition < 1 || starPosition > 4) return null;
  return starOrder[starPosition - 1] ?? null;
}

/** Thứ tự đúng dạng "3 → 2 (★) → 4 → 1" (FR-EXP-03). */
export function formatStarOrder(starOrder: number[], starPosition: number | null): string {
  return starOrder.map((n, index) => (index + 1 === starPosition ? `${n} (★)` : String(n))).join(' → ');
}

// ---------- Đánh số câu (DR-EX-05) ----------

export interface NumberedQuestion {
  number_override: number | null;
}

/**
 * Số câu đánh liên tục trong mỗi phần thi, bắt đầu từ 1, theo thứ tự mondai rồi thứ tự câu. Câu có
 * number_override dùng số đó, và các câu sau đánh tiếp từ số ấy.
 */
export function assignNumbers<Q extends NumberedQuestion>(mondai: { questions: Q[] }[]): (Q & { number: number })[][] {
  let next = 1;
  return mondai.map((m) =>
    m.questions.map((q) => {
      const number = q.number_override ?? next;
      next = number + 1;
      return { ...q, number };
    }),
  );
}

// ---------- Điểm ước tính (FR-RES-03 đến 06) ----------

const SCORE_RULES: Partial<Record<JlptLevel, { passTotal: number }>> = {
  N5: { passTotal: 80 },
  N4: { passTotal: 90 },
};
export const SCORE_MAX = 120;
export const SECTIONAL_MIN = 38;
export const LISTENING_MIN = 19;
export const LISTENING_MAX = 60;

export interface ScoreSummary {
  group: string;
  estimated_score: number;
  max_score: number;
  sectional_min: number;
  meets_sectional_min: boolean;
  pass_total: number;
  /** Điểm Nghe tối thiểu để đỗ; null khi không thể đỗ với điểm hiện tại. */
  listening_needed: number | null;
}

/** Điểm ước tính = làm tròn(đúng ÷ tổng × 120), mọi câu cùng trọng số. */
export function estimateScore(correct: number, total: number): number {
  return total > 0 ? Math.round((correct / total) * SCORE_MAX) : 0;
}

/** Chỉ có với N4, N5 (cấp có nhóm "Kiến thức ngôn ngữ・Đọc hiểu" trên thang 0–120). */
export function scoreSummary(level: JlptLevel, correct: number, total: number): ScoreSummary | null {
  const rule = SCORE_RULES[level];
  if (!rule) return null;
  const estimated = estimateScore(correct, total);
  const meets = estimated >= SECTIONAL_MIN;
  const needed = Math.max(LISTENING_MIN, rule.passTotal - estimated);
  return {
    group: SCORE_GROUP_LANGUAGE_READING,
    estimated_score: estimated,
    max_score: SCORE_MAX,
    sectional_min: SECTIONAL_MIN,
    meets_sectional_min: meets,
    pass_total: rule.passTotal,
    listening_needed: meets && needed <= LISTENING_MAX ? needed : null,
  };
}

// ---------- Kiểm tra đề (DR-EX-10) ----------

export interface IssueLocation {
  /** Thứ tự phần thi, bắt đầu từ 1 */
  section: number | null;
  section_title: string | null;
  /** Số hiệu mondai (問題N) */
  mondai: number | null;
  /** Số câu */
  question: number | null;
  field: string | null;
}

export interface ExamIssue {
  message: string;
  location: IssueLocation;
}

export interface ValidationResult {
  errors: ExamIssue[];
  warnings: ExamIssue[];
}

export interface ValidationQuestion {
  number_override: number | null;
  passage_ref: string | null;
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
}

export interface ValidationPassage {
  ref: string;
  intro: string;
  content: string;
  content_furigana: string;
  translation_vi: string;
}

export interface ValidationMondai {
  number: number;
  type_id: string | null;
  instructions: string;
  tip: string;
  passages: ValidationPassage[];
  questions: ValidationQuestion[];
}

export interface ValidationExam {
  level: JlptLevel;
  sections: { title: string; duration_minutes: number | null; mondai: ValidationMondai[] }[];
}

export interface MondaiTypeRule {
  level: JlptLevel;
  answer_kind: AnswerKind;
  has_passage: boolean;
}

/** Tỷ lệ tối đa đáp án đúng rơi vào cùng một vị trí trong một phần (cảnh báo, DR-EX-10). */
export const SAME_POSITION_LIMIT = 0.4;

const isPermutationOf1To4 = (order: number[]) =>
  order.length === 4 && [1, 2, 3, 4].every((n) => order.filter((x) => x === n).length === 1);

/**
 * Kiểm tra toàn đề. Lỗi chặn xuất bản/nhập; cảnh báo chỉ để người soạn xem lại.
 * `knownUploads`: mã tệp đã tải lên (null = không kiểm tra).
 */
export function validateExam(
  exam: ValidationExam,
  types: Map<string, MondaiTypeRule>,
  knownUploads: Set<string> | null = null,
): ValidationResult {
  const errors: ExamIssue[] = [];
  const warnings: ExamIssue[] = [];

  exam.sections.forEach((section, sectionIndex) => {
    const at = (mondai: number | null, question: number | null, field: string | null): IssueLocation => ({
      section: sectionIndex + 1,
      section_title: section.title,
      mondai,
      question,
      field,
    });
    const numbered = assignNumbers(section.mondai);
    const questionCount = numbered.reduce((sum, list) => sum + list.length, 0);

    if (!section.duration_minutes || section.duration_minutes <= 0) {
      errors.push({ message: 'Phần thi chưa có thời gian làm bài', location: at(null, null, 'duration_minutes') });
    }
    if (questionCount === 0) {
      errors.push({ message: 'Phần thi chưa có câu hỏi nào', location: at(null, null, null) });
    }

    const numbersInSection = new Set<number>();
    const correctPositions: number[] = [];

    section.mondai.forEach((mondai, mondaiIndex) => {
      const markup = (source: string, location: IssueLocation) => {
        for (const issue of parseMarkup(source).issues) {
          errors.push({ message: `${issue.message} (gần “${issue.snippet}”)`, location });
        }
        if (knownUploads) {
          for (const block of parseMarkup(source).blocks) {
            if (block.type === 'image' && !knownUploads.has(block.uploadId)) {
              errors.push({ message: `Hình ảnh upload:${block.uploadId} không tồn tại`, location });
            }
          }
        }
      };

      const type = mondai.type_id ? types.get(mondai.type_id) : undefined;
      if (!mondai.type_id) {
        errors.push({ message: 'Mondai chưa chọn dạng', location: at(mondai.number, null, 'type_id') });
      } else if (!type) {
        errors.push({ message: `Dạng mondai "${mondai.type_id}" không có trong danh sách`, location: at(mondai.number, null, 'type_id') });
      } else if (type.level !== exam.level) {
        errors.push({ message: `Dạng mondai "${mondai.type_id}" thuộc cấp ${type.level}, đề là ${exam.level}`, location: at(mondai.number, null, 'type_id') });
      }
      markup(mondai.instructions, at(mondai.number, null, 'instructions'));
      markup(mondai.tip, at(mondai.number, null, 'tip'));

      const passageRefs = new Set(mondai.passages.map((p) => p.ref));
      for (const passage of mondai.passages) {
        markup(passage.intro, at(mondai.number, null, 'passage.intro'));
        markup(passage.content, at(mondai.number, null, 'passage.content'));
        markup(passage.content_furigana, at(mondai.number, null, 'passage.content_furigana'));
        markup(passage.translation_vi, at(mondai.number, null, 'passage.translation_vi'));
        if (!passage.content.trim()) {
          errors.push({ message: 'Bài đọc chưa có nội dung', location: at(mondai.number, null, 'passage.content') });
        }
        if (!passage.translation_vi.trim()) {
          warnings.push({ message: 'Bài đọc thiếu bản dịch tiếng Việt', location: at(mondai.number, null, 'passage.translation_vi') });
        }
      }

      numbered[mondaiIndex]!.forEach((question) => {
        const loc = (field: string | null) => at(mondai.number, question.number, field);
        if (numbersInSection.has(question.number)) {
          errors.push({ message: `Số câu ${question.number} bị trùng trong phần thi`, location: loc('number') });
        }
        numbersInSection.add(question.number);

        if (type && question.kind !== type.answer_kind) {
          errors.push({
            message: question.kind === 'star' ? 'Dạng mondai này không dùng câu ★' : 'Dạng mondai này chỉ dùng câu ★',
            location: loc('kind'),
          });
        }
        if (question.passage_ref && !passageRefs.has(question.passage_ref)) {
          errors.push({ message: 'Câu hỏi gắn với bài đọc không có trong mondai', location: loc('passage') });
        }
        if (type?.has_passage && !question.passage_ref) {
          warnings.push({ message: 'Dạng mondai này có bài đọc nhưng câu chưa gắn bài đọc nào', location: loc('passage') });
        }

        const trimmed = question.options.map((o) => o.trim());
        if (question.kind === 'choice') {
          // DR-EX-06
          if (question.options.length !== 4 || trimmed.some((o) => !o)) {
            errors.push({ message: 'Câu chọn 1 trong 4 phải có đủ 4 lựa chọn', location: loc('options') });
          } else if (new Set(trimmed).size !== 4) {
            errors.push({ message: 'Các lựa chọn bị trùng nhau', location: loc('options') });
          }
          if (!question.correct_option || question.correct_option < 1 || question.correct_option > 4) {
            errors.push({ message: 'Chưa chọn đáp án đúng', location: loc('correct_option') });
          } else {
            correctPositions.push(question.correct_option);
          }
        } else {
          // DR-EX-07
          if (question.options.length !== 4 || trimmed.some((o) => !o)) {
            errors.push({ message: 'Câu ★ phải có đủ 4 mảnh', location: loc('options') });
          } else if (new Set(trimmed).size !== 4) {
            errors.push({ message: 'Các mảnh của câu ★ bị trùng nhau', location: loc('options') });
          }
          if (!question.star_position || question.star_position < 1 || question.star_position > 4) {
            errors.push({ message: 'Vị trí ô ★ phải từ 1 đến 4', location: loc('star_position') });
          }
          if (!isPermutationOf1To4(question.star_order)) {
            errors.push({ message: 'Thứ tự đúng phải chứa đủ 4 mảnh, mỗi mảnh một lần', location: loc('star_order') });
          }
          const answer = starAnswer(question.star_order, question.star_position);
          if (answer) correctPositions.push(answer);
          markup(question.star_prefix, loc('star_prefix'));
          markup(question.star_suffix, loc('star_suffix'));
        }

        markup(question.prompt, loc('prompt'));
        question.options.forEach((option, index) => markup(option, loc(`options.${index + 1}`)));
        markup(question.learner_note, loc('learner_note'));
        const e = question.explanation;
        for (const field of ['answer', 'full_sentence', 'translation_vi', 'why_correct', 'why_wrong'] as const) {
          markup(e[field], loc(`explanation.${field}`));
        }
        e.grammar.forEach((g, index) => {
          markup(g.pattern, loc(`explanation.grammar.${index + 1}`));
          markup(g.explanation, loc(`explanation.grammar.${index + 1}`));
          g.examples.forEach((example) => markup(example, loc(`explanation.grammar.${index + 1}`)));
        });

        if (isExplanationEmpty(e)) {
          warnings.push({ message: 'Câu chưa có lời giải', location: loc('explanation') });
        }
        if (question.needs_review) {
          warnings.push({ message: 'Câu đang gắn cờ cần xem lại', location: loc('needs_review') });
        }
      });
    });

    // Chỗ trống đánh số phải trỏ tới một câu của cùng phần thi (kiểm tra sau khi đã đánh số cả phần).
    const allNumbers = new Set(numbered.flat().map((q) => q.number));
    section.mondai.forEach((mondai) => {
      for (const passage of mondai.passages) {
        for (const n of numberedBlanks(passage.content)) {
          if (!allNumbers.has(n)) {
            errors.push({
              message: `Chỗ trống [[${n}]] không khớp câu nào của phần thi`,
              location: at(mondai.number, null, 'passage.content'),
            });
          }
        }
      }
    });

    if (correctPositions.length >= 4) {
      for (const position of [1, 2, 3, 4]) {
        const count = correctPositions.filter((p) => p === position).length;
        if (count / correctPositions.length > SAME_POSITION_LIMIT) {
          warnings.push({
            message: `${count}/${correctPositions.length} đáp án đúng của phần thi là lựa chọn ${position} (hơn ${SAME_POSITION_LIMIT * 100}%)`,
            location: at(null, null, 'correct_option'),
          });
        }
      }
    }
  });

  return { errors, warnings };
}
