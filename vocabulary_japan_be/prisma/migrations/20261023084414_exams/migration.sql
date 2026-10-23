-- CreateEnum
CREATE TYPE "ExamStatus" AS ENUM ('draft', 'pending_review', 'published', 'hidden');

-- CreateEnum
CREATE TYPE "SectionKind" AS ENUM ('reading', 'listening');

-- CreateEnum
CREATE TYPE "AnswerKind" AS ENUM ('choice', 'star');

-- CreateEnum
CREATE TYPE "AttemptMode" AS ENUM ('exam', 'section', 'practice', 'wrong_review', 'by_type');

-- CreateEnum
CREATE TYPE "AttemptStatus" AS ENUM ('in_progress', 'submitted', 'abandoned');

-- CreateTable
CREATE TABLE "mondai_types" (
    "id" TEXT NOT NULL,
    "level" "JlptLevel" NOT NULL,
    "section_title" TEXT NOT NULL,
    "label_ja" TEXT NOT NULL,
    "name_vi" TEXT NOT NULL,
    "answer_kind" "AnswerKind" NOT NULL,
    "has_passage" BOOLEAN NOT NULL DEFAULT false,
    "default_instructions" TEXT NOT NULL DEFAULT '',
    "sort_order" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "mondai_types_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "exams" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "level" "JlptLevel" NOT NULL,
    "difficulty" TEXT,
    "description" TEXT NOT NULL DEFAULT '',
    "instructions" TEXT NOT NULL DEFAULT '',
    "source" TEXT NOT NULL,
    "status" "ExamStatus" NOT NULL DEFAULT 'draft',
    "published_at" TIMESTAMPTZ(3),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "exams_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "exam_sections" (
    "id" TEXT NOT NULL,
    "exam_id" TEXT NOT NULL,
    "position" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "kind" "SectionKind" NOT NULL DEFAULT 'reading',
    "duration_minutes" INTEGER,
    "score_group" TEXT NOT NULL DEFAULT '',

    CONSTRAINT "exam_sections_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "mondai" (
    "id" TEXT NOT NULL,
    "section_id" TEXT NOT NULL,
    "position" INTEGER NOT NULL,
    "number" INTEGER NOT NULL,
    "type_id" TEXT,
    "instructions" TEXT NOT NULL DEFAULT '',
    "tip" TEXT NOT NULL DEFAULT '',

    CONSTRAINT "mondai_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "passages" (
    "id" TEXT NOT NULL,
    "mondai_id" TEXT NOT NULL,
    "position" INTEGER NOT NULL,
    "label" TEXT NOT NULL DEFAULT '',
    "intro" TEXT NOT NULL DEFAULT '',
    "content" TEXT NOT NULL DEFAULT '',
    "content_furigana" TEXT NOT NULL DEFAULT '',
    "translation_vi" TEXT NOT NULL DEFAULT '',
    "attachments" JSONB NOT NULL DEFAULT '[]',

    CONSTRAINT "passages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "questions" (
    "id" TEXT NOT NULL,
    "mondai_id" TEXT NOT NULL,
    "passage_id" TEXT,
    "position" INTEGER NOT NULL,
    "number_override" INTEGER,
    "kind" "AnswerKind" NOT NULL,
    "prompt" TEXT NOT NULL DEFAULT '',
    "options" TEXT[],
    "correct_option" INTEGER,
    "star_prefix" TEXT NOT NULL DEFAULT '',
    "star_suffix" TEXT NOT NULL DEFAULT '',
    "star_position" INTEGER,
    "star_order" INTEGER[] DEFAULT ARRAY[]::INTEGER[],
    "explanation" JSONB NOT NULL DEFAULT '{}',
    "learner_note" TEXT NOT NULL DEFAULT '',
    "needs_review" BOOLEAN NOT NULL DEFAULT false,
    "internal_note" TEXT NOT NULL DEFAULT '',
    "attachments" JSONB NOT NULL DEFAULT '[]',
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "questions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "question_edits" (
    "id" TEXT NOT NULL,
    "question_id" TEXT NOT NULL,
    "user_id" TEXT,
    "fields" TEXT[],
    "edited_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "question_edits_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "uploads" (
    "id" TEXT NOT NULL,
    "content_type" TEXT NOT NULL,
    "size" INTEGER NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "uploads_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "attempts" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "exam_id" TEXT,
    "mode" "AttemptMode" NOT NULL,
    "scope_type" TEXT NOT NULL,
    "scope_id" TEXT,
    "level" "JlptLevel" NOT NULL,
    "mondai_type_id" TEXT,
    "status" "AttemptStatus" NOT NULL DEFAULT 'in_progress',
    "question_ids" TEXT[],
    "current_question_id" TEXT,
    "started_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "submitted_at" TIMESTAMPTZ(3),
    "correct_count" INTEGER,
    "total_count" INTEGER NOT NULL,
    "regraded_at" TIMESTAMPTZ(3),

    CONSTRAINT "attempts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "attempt_sections" (
    "attempt_id" TEXT NOT NULL,
    "section_id" TEXT NOT NULL,
    "position" INTEGER NOT NULL,
    "started_at" TIMESTAMPTZ(3),
    "deadline_at" TIMESTAMPTZ(3),
    "submitted_at" TIMESTAMPTZ(3),

    CONSTRAINT "attempt_sections_pkey" PRIMARY KEY ("attempt_id","section_id")
);

-- CreateTable
CREATE TABLE "attempt_answers" (
    "attempt_id" TEXT NOT NULL,
    "question_id" TEXT NOT NULL,
    "choice" INTEGER,
    "flagged" BOOLEAN NOT NULL DEFAULT false,
    "time_spent_ms" INTEGER NOT NULL DEFAULT 0,
    "is_correct" BOOLEAN,
    "client_changed_at" TIMESTAMPTZ(3),
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "attempt_answers_pkey" PRIMARY KEY ("attempt_id","question_id")
);

-- CreateTable
CREATE TABLE "wrong_questions" (
    "user_id" TEXT NOT NULL,
    "question_id" TEXT NOT NULL,
    "correct_streak" INTEGER NOT NULL DEFAULT 0,
    "last_wrong_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "wrong_questions_pkey" PRIMARY KEY ("user_id","question_id")
);

-- CreateIndex
CREATE INDEX "exams_status_level_idx" ON "exams"("status", "level");

-- CreateIndex
CREATE UNIQUE INDEX "exams_level_title_key" ON "exams"("level", "title");

-- CreateIndex
CREATE INDEX "exam_sections_exam_id_position_idx" ON "exam_sections"("exam_id", "position");

-- CreateIndex
CREATE INDEX "mondai_section_id_position_idx" ON "mondai"("section_id", "position");

-- CreateIndex
CREATE INDEX "mondai_type_id_idx" ON "mondai"("type_id");

-- CreateIndex
CREATE INDEX "passages_mondai_id_position_idx" ON "passages"("mondai_id", "position");

-- CreateIndex
CREATE INDEX "questions_mondai_id_position_idx" ON "questions"("mondai_id", "position");

-- CreateIndex
CREATE INDEX "questions_passage_id_idx" ON "questions"("passage_id");

-- CreateIndex
CREATE INDEX "question_edits_question_id_edited_at_idx" ON "question_edits"("question_id", "edited_at");

-- CreateIndex
CREATE INDEX "attempts_user_id_exam_id_status_idx" ON "attempts"("user_id", "exam_id", "status");

-- CreateIndex
CREATE INDEX "attempts_exam_id_idx" ON "attempts"("exam_id");

-- CreateIndex
CREATE INDEX "attempt_sections_section_id_idx" ON "attempt_sections"("section_id");

-- CreateIndex
CREATE INDEX "attempt_answers_question_id_idx" ON "attempt_answers"("question_id");

-- CreateIndex
CREATE INDEX "wrong_questions_question_id_idx" ON "wrong_questions"("question_id");

-- AddForeignKey
ALTER TABLE "exam_sections" ADD CONSTRAINT "exam_sections_exam_id_fkey" FOREIGN KEY ("exam_id") REFERENCES "exams"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mondai" ADD CONSTRAINT "mondai_section_id_fkey" FOREIGN KEY ("section_id") REFERENCES "exam_sections"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mondai" ADD CONSTRAINT "mondai_type_id_fkey" FOREIGN KEY ("type_id") REFERENCES "mondai_types"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "passages" ADD CONSTRAINT "passages_mondai_id_fkey" FOREIGN KEY ("mondai_id") REFERENCES "mondai"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "questions" ADD CONSTRAINT "questions_mondai_id_fkey" FOREIGN KEY ("mondai_id") REFERENCES "mondai"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "questions" ADD CONSTRAINT "questions_passage_id_fkey" FOREIGN KEY ("passage_id") REFERENCES "passages"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "question_edits" ADD CONSTRAINT "question_edits_question_id_fkey" FOREIGN KEY ("question_id") REFERENCES "questions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "question_edits" ADD CONSTRAINT "question_edits_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attempts" ADD CONSTRAINT "attempts_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attempts" ADD CONSTRAINT "attempts_exam_id_fkey" FOREIGN KEY ("exam_id") REFERENCES "exams"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attempts" ADD CONSTRAINT "attempts_mondai_type_id_fkey" FOREIGN KEY ("mondai_type_id") REFERENCES "mondai_types"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attempt_sections" ADD CONSTRAINT "attempt_sections_attempt_id_fkey" FOREIGN KEY ("attempt_id") REFERENCES "attempts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attempt_sections" ADD CONSTRAINT "attempt_sections_section_id_fkey" FOREIGN KEY ("section_id") REFERENCES "exam_sections"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attempt_answers" ADD CONSTRAINT "attempt_answers_attempt_id_fkey" FOREIGN KEY ("attempt_id") REFERENCES "attempts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attempt_answers" ADD CONSTRAINT "attempt_answers_question_id_fkey" FOREIGN KEY ("question_id") REFERENCES "questions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "wrong_questions" ADD CONSTRAINT "wrong_questions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "wrong_questions" ADD CONSTRAINT "wrong_questions_question_id_fkey" FOREIGN KEY ("question_id") REFERENCES "questions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
