import { readFileSync } from 'node:fs';
import type { z } from 'zod';
import { prisma } from '../../db/prisma.ts';
import {
  assignNumbers,
  starAnswer,
  validateExam,
  type ExamIssue,
  type IssueLocation,
  type ValidationExam,
} from '../../domain/exam.ts';
import { ApiError } from '../../utils/ApiError.ts';
import { knownUploadIds, loadExamTree, mondaiTypeRules, readAttachments, readExplanation } from '../exams/tree.ts';
import { getAdminExam, rethrowDuplicateTitle } from './service.ts';
import { IMPORT_FORMAT_VERSION, importFileSchema, type ImportFile } from './schemas.ts';
import { linkVocabulary } from './vocab.ts';

/**
 * Nhập đề từ file JSON (FR-IMP, DR-EX-11; định dạng: EXAM_IMPORT_FORMAT.md) và xuất đề ra cùng
 * định dạng (FR-IMP-05). Nhập chỉ để đưa đề mới vào lần đầu: luôn tạo đề mới ở trạng thái Nháp,
 * không ghi đè đề có sẵn (FR-IMP-04), và nhập trọn vẹn trong một transaction (FR-IMP-03).
 */

export interface ImportIssue extends ExamIssue {
  /** Vị trí trong file JSON, ví dụ exam.sections[1].mondai[0].questions[3].options */
  path: string | null;
}

const EMPTY_LOCATION: IssueLocation = { section: null, section_title: null, mondai: null, question: null, field: null };

const formatPath = (path: PropertyKey[]) =>
  path.reduce<string>((out, key) => (typeof key === 'number' ? `${out}[${key}]` : out ? `${out}.${String(key)}` : String(key)), '');

type Raw = Record<string, unknown>;
const asRecord = (v: unknown): Raw | null => (v && typeof v === 'object' && !Array.isArray(v) ? (v as Raw) : null);
const asArray = (v: unknown): unknown[] => (Array.isArray(v) ? v : []);

/** Vị trí (phần, mondai, số câu) của một lỗi zod, đọc từ dữ liệu thô của file (có thể còn sai kiểu). */
function locate(raw: unknown, path: PropertyKey[]): IssueLocation {
  const location = { ...EMPTY_LOCATION };
  if (path[0] !== 'exam' || path[1] !== 'sections' || typeof path[2] !== 'number') {
    location.field = path.length > 1 ? String(path[path.length - 1]) : null;
    return location;
  }
  const sections = asArray(asRecord(asRecord(raw)?.exam)?.sections);
  const section = asRecord(sections[path[2]]);
  location.section = path[2] + 1;
  location.section_title = typeof section?.title === 'string' ? section.title : null;
  if (path[3] === 'mondai' && typeof path[4] === 'number') {
    const mondaiList = asArray(section?.mondai);
    const mondai = asRecord(mondaiList[path[4]]);
    location.mondai = typeof mondai?.number === 'number' ? mondai.number : path[4] + 1;
    if (path[5] === 'questions' && typeof path[6] === 'number') {
      // Đánh số giống DR-EX-05 trên dữ liệu thô: number_override hợp lệ thì dùng, không thì đếm tiếp.
      const numbered = assignNumbers(
        mondaiList.map((m) => ({
          questions: asArray(asRecord(m)?.questions).map((q) => {
            const override = asRecord(q)?.number_override;
            return { number_override: typeof override === 'number' && Number.isInteger(override) ? override : null };
          }),
        })),
      );
      location.question = numbered[path[4]]?.[path[6]]?.number ?? null;
    }
  }
  const tail = path.slice(path.findLastIndex((k) => typeof k === 'number') + 1).map(String);
  location.field = tail.length > 0 ? tail.join('.') : null;
  return location;
}

function zodIssues(raw: unknown, error: z.ZodError): ImportIssue[] {
  return error.issues.map((issue) => ({
    message: issue.message,
    location: locate(raw, issue.path),
    path: formatPath(issue.path) || null,
  }));
}

function toValidationInput(file: ImportFile): ValidationExam {
  return {
    level: file.exam.level,
    sections: file.exam.sections.map((s) => ({
      title: s.title,
      duration_minutes: s.duration_minutes,
      mondai: s.mondai.map((m) => ({
        number: m.number,
        type_id: m.type_id,
        instructions: m.instructions,
        tip: m.tip,
        passages: m.passages.map((p) => ({
          ref: p.key,
          intro: p.intro,
          content: p.content,
          content_furigana: p.content_furigana,
          translation_vi: p.translation_vi,
        })),
        questions: m.questions.map((q) => ({ ...q, passage_ref: q.passage })),
      })),
    })),
  };
}

/** Cây đề dạng GET /admin/exams/:id dựng từ file (id giả), để xem trước trước khi nhập (FR-IMP-02). */
function toPreview(file: ImportFile) {
  const now = new Date().toISOString();
  return {
    id: 'preview',
    title: file.exam.title,
    level: file.exam.level,
    difficulty: file.exam.difficulty,
    description: file.exam.description,
    instructions: file.exam.instructions,
    source: file.exam.source,
    status: 'draft' as const,
    published_at: null,
    created_at: now,
    updated_at: now,
    attempt_count: 0,
    sections: file.exam.sections.map((s, si) => {
      const numbered = assignNumbers(s.mondai);
      return {
        id: `preview-s${si + 1}`,
        position: si,
        title: s.title,
        kind: s.kind,
        duration_minutes: s.duration_minutes,
        score_group: s.score_group,
        mondai: s.mondai.map((m, mi) => {
          const mondaiId = `preview-s${si + 1}-m${mi + 1}`;
          const passageId = (key: string) => `${mondaiId}-p-${key}`;
          return {
            id: mondaiId,
            position: mi,
            number: m.number,
            type_id: m.type_id,
            instructions: m.instructions,
            tip: m.tip,
            passages: m.passages.map((p, pi) => ({
              id: passageId(p.key),
              position: pi,
              label: p.label,
              intro: p.intro,
              content: p.content,
              content_furigana: p.content_furigana,
              translation_vi: p.translation_vi,
              attachments: p.attachments,
            })),
            questions: m.questions.map((q, qi) => ({
              id: `${mondaiId}-q${qi + 1}`,
              position: qi,
              number: numbered[mi]![qi]!.number,
              number_override: q.number_override,
              passage_id: q.passage ? passageId(q.passage) : null,
              kind: q.kind,
              prompt: q.prompt,
              options: q.options,
              correct_option: q.kind === 'star' ? starAnswer(q.star_order, q.star_position) : q.correct_option,
              star_prefix: q.star_prefix,
              star_suffix: q.star_suffix,
              star_position: q.star_position,
              star_order: q.star_order,
              explanation: q.explanation,
              learner_note: q.learner_note,
              needs_review: q.needs_review,
              internal_note: q.internal_note,
              attachments: q.attachments,
              updated_at: now,
            })),
          };
        }),
      };
    }),
  };
}

const summarize = (file: ImportFile) => ({
  sections: file.exam.sections.length,
  mondai: file.exam.sections.reduce((n, s) => n + s.mondai.length, 0),
  passages: file.exam.sections.reduce((n, s) => n + s.mondai.reduce((k, m) => k + m.passages.length, 0), 0),
  questions: file.exam.sections.reduce((n, s) => n + s.mondai.reduce((k, m) => k + m.questions.length, 0), 0),
});

/** Đọc và kiểm tra file nhập: lỗi JSON, lỗi schema, rồi luật DR-EX-10 và trùng tên đề. */
async function checkImport(content: string) {
  let raw: unknown;
  try {
    raw = JSON.parse(content);
  } catch (error) {
    const detail = error instanceof SyntaxError ? `: ${error.message}` : '';
    return {
      file: null,
      errors: [{ message: `File không phải JSON hợp lệ${detail}`, location: EMPTY_LOCATION, path: null }] as ImportIssue[],
      warnings: [] as ImportIssue[],
    };
  }
  const parsed = importFileSchema.safeParse(raw);
  if (!parsed.success) return { file: null, errors: zodIssues(raw, parsed.error), warnings: [] as ImportIssue[] };

  const file = parsed.data;
  const errors: ImportIssue[] = [];
  file.exam.sections.forEach((s, si) =>
    s.mondai.forEach((m, mi) => {
      const keys = m.passages.map((p) => p.key);
      if (new Set(keys).size !== keys.length) {
        errors.push({
          message: 'Hai bài đọc trong cùng mondai trùng key',
          location: { section: si + 1, section_title: s.title, mondai: m.number, question: null, field: 'passages.key' },
          path: `exam.sections[${si}].mondai[${mi}].passages`,
        });
      }
    }),
  );
  const result = validateExam(toValidationInput(file), await mondaiTypeRules(), await knownUploadIds());
  errors.push(...result.errors.map((e) => ({ ...e, path: null })));
  const existing = await prisma.exam.findUnique({ where: { level_title: { level: file.exam.level, title: file.exam.title } } });
  if (existing) {
    errors.push({
      message: `Cấp ${file.exam.level} đã có đề tên "${file.exam.title}". Đổi tên đề trong file (nhập luôn tạo đề mới).`,
      location: { ...EMPTY_LOCATION, field: 'title' },
      path: 'exam.title',
    });
  }
  return { file, errors, warnings: result.warnings.map((w) => ({ ...w, path: null })) };
}

/**
 * POST /admin/exams/import { content, dry_run }.
 * - dry_run: luôn 200 { valid, summary, errors, warnings, preview } để trang nhập hiển thị (FR-IMP-02).
 * - nhập thật: còn lỗi → 422 EXAM_INVALID kèm lỗi; hợp lệ → 201 { exam, warnings }.
 */
export async function importExam(content: string, dryRun: boolean) {
  const { file, errors, warnings } = await checkImport(content);
  if (file) await linkVocabulary(file.exam.sections.flatMap((s) => s.mondai.flatMap((m) => m.questions.map((q) => q.explanation))));

  if (dryRun) {
    return {
      status: 200,
      body: {
        valid: errors.length === 0,
        summary: file ? summarize(file) : null,
        errors,
        warnings,
        preview: file ? toPreview(file) : null,
      },
    };
  }
  if (!file || errors.length > 0) {
    throw new ApiError(422, 'EXAM_INVALID', `File còn ${errors.length} lỗi, sửa xong mới nhập được`, undefined, {
      errors,
      warnings,
    });
  }

  const examId = await createFromFile(file);
  return { status: 201, body: { exam: await getAdminExam(examId), warnings } };
}

async function createFromFile(file: ImportFile): Promise<string> {
  try {
    return await prisma.$transaction(
      async (tx) => {
        const exam = await tx.exam.create({
          data: {
            title: file.exam.title,
            level: file.exam.level,
            difficulty: file.exam.difficulty,
            description: file.exam.description,
            instructions: file.exam.instructions,
            source: file.exam.source,
          },
        });
        for (const [si, s] of file.exam.sections.entries()) {
          const section = await tx.examSection.create({
            data: {
              examId: exam.id,
              position: si,
              title: s.title,
              kind: s.kind,
              durationMinutes: s.duration_minutes,
              scoreGroup: s.score_group,
            },
          });
          for (const [mi, m] of s.mondai.entries()) {
            const mondai = await tx.mondai.create({
              data: {
                sectionId: section.id,
                position: mi,
                number: m.number,
                typeId: m.type_id,
                instructions: m.instructions,
                tip: m.tip,
              },
            });
            const passageIds = new Map<string, string>();
            for (const [pi, p] of m.passages.entries()) {
              const passage = await tx.passage.create({
                data: {
                  mondaiId: mondai.id,
                  position: pi,
                  label: p.label,
                  intro: p.intro,
                  content: p.content,
                  contentFurigana: p.content_furigana,
                  translationVi: p.translation_vi,
                  attachments: p.attachments,
                },
              });
              passageIds.set(p.key, passage.id);
            }
            await tx.question.createMany({
              data: m.questions.map((q, qi) => ({
                mondaiId: mondai.id,
                passageId: q.passage ? (passageIds.get(q.passage) ?? null) : null,
                position: qi,
                numberOverride: q.number_override,
                kind: q.kind,
                prompt: q.prompt,
                options: q.options,
                correctOption: q.kind === 'star' ? starAnswer(q.star_order, q.star_position) : q.correct_option,
                starPrefix: q.star_prefix,
                starSuffix: q.star_suffix,
                starPosition: q.star_position,
                starOrder: q.star_order,
                explanation: q.explanation,
                learnerNote: q.learner_note,
                needsReview: q.needs_review,
                internalNote: q.internal_note,
                attachments: q.attachments,
              })),
            });
          }
        }
        return exam.id;
      },
      { timeout: 30_000 },
    );
  } catch (error) {
    rethrowDuplicateTitle(error);
  }
}

/** GET /admin/exams/:id/export: cây đề → file nhập chuẩn (không kèm id, trạng thái, lượt làm). */
export async function exportExam(id: string): Promise<{ filename: string; file: ImportFile }> {
  const exam = await loadExamTree(id);
  const file: ImportFile = {
    format_version: IMPORT_FORMAT_VERSION,
    exam: {
      title: exam.title,
      level: exam.level,
      difficulty: exam.difficulty,
      description: exam.description,
      instructions: exam.instructions,
      source: exam.source,
      sections: exam.sections.map((s) => ({
        title: s.title,
        kind: s.kind,
        duration_minutes: s.durationMinutes,
        score_group: s.scoreGroup,
        mondai: s.mondai.map((m) => {
          const keyOf = new Map(m.passages.map((p, index) => [p.id, `p${index + 1}`]));
          return {
            number: m.number,
            type_id: m.typeId,
            instructions: m.instructions,
            tip: m.tip,
            passages: m.passages.map((p) => ({
              key: keyOf.get(p.id)!,
              label: p.label,
              intro: p.intro,
              content: p.content,
              content_furigana: p.contentFurigana,
              translation_vi: p.translationVi,
              attachments: readAttachments(p.attachments),
            })),
            questions: m.questions.map((q) => ({
              passage: q.passageId ? (keyOf.get(q.passageId) ?? null) : null,
              kind: q.kind,
              number_override: q.numberOverride,
              prompt: q.prompt,
              options: q.options,
              correct_option: q.kind === 'star' ? null : q.correctOption,
              star_prefix: q.starPrefix,
              star_suffix: q.starSuffix,
              star_position: q.starPosition,
              star_order: q.starOrder,
              explanation: readExplanation(q.explanation),
              learner_note: q.learnerNote,
              needs_review: q.needsReview,
              internal_note: q.internalNote,
              attachments: readAttachments(q.attachments),
            })),
          };
        }),
      })),
    },
  };
  const slug = exam.title
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/đ/gi, 'd')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
  return { filename: `de-${exam.level.toLowerCase()}-${slug || exam.id}.json`, file };
}

/** File mẫu cho trang nhập đề (FR-IMP-06): đề mẫu số 11 ở định dạng chuẩn. */
export function importTemplate(): string {
  return readFileSync(new URL('../../../prisma/seed-data/exams/n4-de-luyen-11.json', import.meta.url), 'utf8');
}
