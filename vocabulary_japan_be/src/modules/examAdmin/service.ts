import { prisma } from '../../db/prisma.ts';
import {
  SCORE_GROUP_LANGUAGE_READING,
  STANDARD_SECTIONS,
  STATUS_TRANSITIONS,
  validateExam,
  type ExamStatus,
  type ValidationResult,
} from '../../domain/exam.ts';
import { Prisma } from '../../generated/prisma/client.ts';
import { ApiError } from '../../utils/ApiError.ts';
import {
  knownUploadIds,
  loadExamTree,
  mondaiTypeRules,
  toAdminExamJson,
  toExamInfoJson,
  toValidationExam,
  type ExamTree,
} from '../exams/tree.ts';
import type { ExamInfoInput, OrderInput } from './schemas.ts';

const STATUS_LABELS: Record<ExamStatus, string> = {
  draft: 'Nháp',
  pending_review: 'Chờ duyệt',
  published: 'Đã xuất bản',
  hidden: 'Ẩn',
};

const duplicateTitle = () =>
  ApiError.validation({ title: 'Cấp độ này đã có đề cùng tên' }, 'Cấp độ này đã có đề cùng tên');

/** Tên đề không trùng trong cùng cấp (DR-EX-01): unique của DB chặn → lỗi ở trường title. */
export function rethrowDuplicateTitle(error: unknown): never {
  if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') throw duplicateTitle();
  throw error;
}

/** GET /admin/exams (FR-CMS-01): mọi đề, kèm số câu, số câu gắn cờ, số lượt đã làm. */
export async function listAdminExams(filter: { level?: string; status?: string }) {
  const exams = await prisma.exam.findMany({
    where: {
      level: filter.level as ExamTree['level'] | undefined,
      status: filter.status as ExamStatus | undefined,
    },
    orderBy: [{ level: 'asc' }, { createdAt: 'desc' }],
  });
  const ids = exams.map((e) => e.id);
  const [questions, flagged, attempts] = await Promise.all([
    prisma.$queryRaw<{ exam_id: string; n: bigint }[]>`
      SELECT s.exam_id, COUNT(q.id) AS n FROM questions q
      JOIN mondai m ON m.id = q.mondai_id JOIN exam_sections s ON s.id = m.section_id
      WHERE s.exam_id = ANY(${ids}) GROUP BY s.exam_id`,
    prisma.$queryRaw<{ exam_id: string; n: bigint }[]>`
      SELECT s.exam_id, COUNT(q.id) AS n FROM questions q
      JOIN mondai m ON m.id = q.mondai_id JOIN exam_sections s ON s.id = m.section_id
      WHERE s.exam_id = ANY(${ids}) AND q.needs_review GROUP BY s.exam_id`,
    prisma.attempt.groupBy({ by: ['examId'], where: { examId: { in: ids }, status: 'submitted' }, _count: true }),
  ]);
  const count = (rows: { exam_id: string; n: bigint }[]) => new Map(rows.map((r) => [r.exam_id, Number(r.n)]));
  const questionCount = count(questions);
  const flaggedCount = count(flagged);
  const attemptCount = new Map(attempts.map((a) => [a.examId, a._count]));
  return exams.map((exam) => ({
    ...toExamInfoJson(exam),
    question_count: questionCount.get(exam.id) ?? 0,
    flagged_count: flaggedCount.get(exam.id) ?? 0,
    attempt_count: attemptCount.get(exam.id) ?? 0,
  }));
}

async function attemptCount(examId: string) {
  return prisma.attempt.count({ where: { examId, status: 'submitted' } });
}

export async function getAdminExam(id: string) {
  const exam = await loadExamTree(id);
  return toAdminExamJson(exam, await attemptCount(id));
}

/**
 * POST /admin/exams (FR-CMS-02): đề mới ở trạng thái Nháp, tạo sẵn hai phần thi theo thời gian
 * chuẩn của cấp (FR-CMS-04, mục 2.2), cùng nhóm điểm "Kiến thức ngôn ngữ・Đọc hiểu" (DR-EX-02).
 */
export async function createExam(input: ExamInfoInput) {
  try {
    const exam = await prisma.exam.create({
      data: {
        title: input.title,
        level: input.level,
        difficulty: input.difficulty,
        description: input.description,
        instructions: input.instructions,
        source: input.source,
        sections: {
          create: STANDARD_SECTIONS[input.level].map((s, position) => ({
            position,
            title: s.title,
            durationMinutes: s.minutes,
            scoreGroup: SCORE_GROUP_LANGUAGE_READING,
          })),
        },
      },
    });
    return getAdminExam(exam.id);
  } catch (error) {
    rethrowDuplicateTitle(error);
  }
}

const examInfoData = (input: Partial<ExamInfoInput>) => ({
  title: input.title,
  level: input.level,
  difficulty: input.difficulty,
  description: input.description,
  instructions: input.instructions,
  source: input.source,
});

/** PUT /admin/exams/:id: sửa thông tin đề. Đổi cấp độ khi đề đã có lượt làm thì không cho. */
export async function updateExamInfo(id: string, input: Partial<ExamInfoInput>) {
  const exam = await prisma.exam.findUnique({ where: { id } });
  if (!exam) throw ApiError.notFound('Không tìm thấy đề');
  if (input.level && input.level !== exam.level && (await prisma.attempt.count({ where: { examId: id } })) > 0) {
    throw ApiError.validation({ level: 'Đề đã có lượt làm, không đổi được cấp độ' });
  }
  try {
    await prisma.exam.update({ where: { id }, data: examInfoData(input) });
  } catch (error) {
    rethrowDuplicateTitle(error);
  }
  return getAdminExam(id);
}

/** DELETE /admin/exams/:id (FR-CMS-17): đề đã có lượt làm thì chỉ ẩn được. */
export async function deleteExam(id: string) {
  const exam = await prisma.exam.findUnique({ where: { id }, select: { id: true } });
  if (!exam) throw ApiError.notFound('Không tìm thấy đề');
  if ((await prisma.attempt.count({ where: { examId: id } })) > 0) {
    throw ApiError.conflict('EXAM_HAS_ATTEMPTS', 'Đề đã có người làm nên không xóa được. Hãy ẩn đề thay vì xóa.');
  }
  try {
    await prisma.exam.delete({ where: { id } });
  } catch (error) {
    // Có người vừa bắt đầu làm đề trong lúc xóa: khóa ngoại Restrict của attempts chặn lại.
    if (error instanceof Prisma.PrismaClientKnownRequestError && (error.code === 'P2003' || error.code === 'P2014')) {
      throw ApiError.conflict('EXAM_HAS_ATTEMPTS', 'Đề đã có người làm nên không xóa được. Hãy ẩn đề thay vì xóa.');
    }
    throw error;
  }
}

/** Kiểm tra toàn đề theo DR-EX-10 (FR-CMS-14). */
export async function validateExamById(id: string): Promise<ValidationResult> {
  const exam = await loadExamTree(id);
  return validateExam(toValidationExam(exam), await mondaiTypeRules(), await knownUploadIds());
}

/**
 * PUT /admin/exams/:id/status (FR-CMS-13, 14). Chỉ chuyển theo STATUS_TRANSITIONS; xuất bản thì
 * kiểm tra trước, còn lỗi → 422 EXAM_INVALID kèm danh sách lỗi và cảnh báo.
 */
export async function changeStatus(id: string, status: ExamStatus) {
  const exam = await prisma.exam.findUnique({ where: { id } });
  if (!exam) throw ApiError.notFound('Không tìm thấy đề');
  if (exam.status === status) return getAdminExam(id);
  if (!STATUS_TRANSITIONS[exam.status].includes(status)) {
    throw ApiError.validation(
      { status: `Không chuyển được từ ${STATUS_LABELS[exam.status]} sang ${STATUS_LABELS[status]}` },
      'Không chuyển được trạng thái này',
    );
  }
  if (status === 'published') {
    const result = await validateExamById(id);
    if (result.errors.length > 0) {
      throw new ApiError(
        422,
        'EXAM_INVALID',
        `Đề còn ${result.errors.length} lỗi, sửa xong mới xuất bản được`,
        undefined,
        { ...result },
      );
    }
  }
  await prisma.exam.update({
    where: { id },
    data: { status, ...(status === 'published' && !exam.publishedAt ? { publishedAt: new Date() } : {}) },
  });
  return getAdminExam(id);
}

/** Tên chưa dùng trong cấp: "<tên> (bản sao)", "<tên> (bản sao 2)"… */
async function freeCopyTitle(level: ExamTree['level'], title: string) {
  for (let n = 1; ; n++) {
    const candidate = `${title} (bản sao${n > 1 ? ` ${n}` : ''})`.slice(0, 120);
    if (!(await prisma.exam.findUnique({ where: { level_title: { level, title: candidate } } }))) return candidate;
  }
}

/** POST /admin/exams/:id/duplicate (FR-CMS-05): chép trọn cây sang đề mới ở trạng thái Nháp. */
export async function duplicateExam(id: string) {
  const source = await loadExamTree(id);
  const title = await freeCopyTitle(source.level, source.title);
  const created = await prisma.$transaction(async (tx) => {
    const exam = await tx.exam.create({
      data: {
        title,
        level: source.level,
        difficulty: source.difficulty,
        description: source.description,
        instructions: source.instructions,
        source: source.source,
      },
    });
    await copySections(tx, exam.id, source);
    return exam;
  });
  return getAdminExam(created.id);
}

/** Chép các phần thi của một cây đề vào đề `examId` (dùng cho nhân bản). */
async function copySections(tx: Prisma.TransactionClient, examId: string, source: ExamTree) {
  for (const section of source.sections) {
    const newSection = await tx.examSection.create({
      data: {
        examId,
        position: section.position,
        title: section.title,
        kind: section.kind,
        durationMinutes: section.durationMinutes,
        scoreGroup: section.scoreGroup,
      },
    });
    for (const mondai of section.mondai) {
      const newMondai = await tx.mondai.create({
        data: {
          sectionId: newSection.id,
          position: mondai.position,
          number: mondai.number,
          typeId: mondai.typeId,
          instructions: mondai.instructions,
          tip: mondai.tip,
        },
      });
      const passageIds = new Map<string, string>();
      for (const passage of mondai.passages) {
        const created = await tx.passage.create({
          data: {
            mondaiId: newMondai.id,
            position: passage.position,
            label: passage.label,
            intro: passage.intro,
            content: passage.content,
            contentFurigana: passage.contentFurigana,
            translationVi: passage.translationVi,
            attachments: passage.attachments as Prisma.InputJsonValue,
          },
        });
        passageIds.set(passage.id, created.id);
      }
      await tx.question.createMany({
        data: mondai.questions.map((q) => ({
          mondaiId: newMondai.id,
          passageId: q.passageId ? (passageIds.get(q.passageId) ?? null) : null,
          position: q.position,
          numberOverride: q.numberOverride,
          kind: q.kind,
          prompt: q.prompt,
          options: q.options,
          correctOption: q.correctOption,
          starPrefix: q.starPrefix,
          starSuffix: q.starSuffix,
          starPosition: q.starPosition,
          starOrder: q.starOrder,
          explanation: q.explanation as Prisma.InputJsonValue,
          learnerNote: q.learnerNote,
          needsReview: q.needsReview,
          internalNote: q.internalNote,
          attachments: q.attachments as Prisma.InputJsonValue,
        })),
      });
    }
  }
}

/**
 * PUT /admin/exams/:id/order (FR-CMS-03): ghi lại thứ tự sau khi kéo thả. Nhận cả cây id; mỗi id
 * phải thuộc đúng đề này và xuất hiện đúng một lần (không thêm, không bớt). Mondai được chuyển
 * sang phần thi khác, câu hỏi và bài đọc sang mondai khác trong cùng đề. Câu chuyển mondai thì
 * bỏ gắn bài đọc nếu bài đọc không đi cùng.
 */
export async function reorderExam(id: string, order: OrderInput) {
  const exam = await loadExamTree(id);
  const own = {
    sections: new Set(exam.sections.map((s) => s.id)),
    mondai: new Set(exam.sections.flatMap((s) => s.mondai.map((m) => m.id))),
    passages: new Set(exam.sections.flatMap((s) => s.mondai.flatMap((m) => m.passages.map((p) => p.id)))),
    questions: new Set(exam.sections.flatMap((s) => s.mondai.flatMap((m) => m.questions.map((q) => q.id)))),
  };
  const seen = {
    sections: order.sections.map((s) => s.id),
    mondai: order.sections.flatMap((s) => s.mondai.map((m) => m.id)),
    passages: order.sections.flatMap((s) => s.mondai.flatMap((m) => m.passages)),
    questions: order.sections.flatMap((s) => s.mondai.flatMap((m) => m.questions)),
  };
  for (const key of ['sections', 'mondai', 'passages', 'questions'] as const) {
    const list = seen[key];
    if (list.length !== own[key].size || new Set(list).size !== list.length || list.some((x) => !own[key].has(x))) {
      throw ApiError.validation({ sections: 'Thứ tự không khớp nội dung hiện tại của đề. Tải lại trang rồi thử lại.' });
    }
  }

  const passageOwner = new Map<string, string>();
  for (const s of order.sections) for (const m of s.mondai) for (const p of m.passages) passageOwner.set(p, m.id);
  const questionPassage = new Map(
    exam.sections.flatMap((s) => s.mondai.flatMap((m) => m.questions.map((q) => [q.id, q.passageId] as const))),
  );

  await prisma.$transaction(async (tx) => {
    for (const [sIndex, s] of order.sections.entries()) {
      await tx.examSection.update({ where: { id: s.id }, data: { position: sIndex } });
      for (const [mIndex, m] of s.mondai.entries()) {
        await tx.mondai.update({ where: { id: m.id }, data: { position: mIndex, sectionId: s.id } });
        for (const [pIndex, p] of m.passages.entries()) {
          await tx.passage.update({ where: { id: p }, data: { position: pIndex, mondaiId: m.id } });
        }
        for (const [qIndex, q] of m.questions.entries()) {
          const passageId = questionPassage.get(q) ?? null;
          const keepPassage = passageId !== null && passageOwner.get(passageId) === m.id;
          await tx.question.update({
            where: { id: q },
            data: { position: qIndex, mondaiId: m.id, ...(keepPassage ? {} : { passageId: null }) },
          });
        }
      }
    }
    await tx.exam.update({ where: { id }, data: { updatedAt: new Date() } });
  });
  return getAdminExam(id);
}
