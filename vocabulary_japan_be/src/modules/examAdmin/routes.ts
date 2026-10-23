import express, { Router } from 'express';
import type { ExamStatus } from '../../domain/exam.ts';
import { currentUser } from '../../middleware/requireAuth.ts';
import { ApiError } from '../../utils/ApiError.ts';
import * as content from './content.ts';
import { exportExam, importExam, importTemplate } from './importExport.ts';
import { createMondaiType, listMondaiTypes, updateMondaiType } from './mondaiTypes.ts';
import {
  adminExamListQuerySchema,
  examInfoSchema,
  examInfoUpdateSchema,
  importBodySchema,
  IMPORT_MAX_BYTES,
  mondaiCreateSchema,
  mondaiTypeCreateSchema,
  mondaiTypeUpdateSchema,
  mondaiUpdateSchema,
  orderSchema,
  passageCreateSchema,
  passageUpdateSchema,
  questionCreateSchema,
  questionUpdateSchema,
  sectionCreateSchema,
  sectionUpdateSchema,
  statusSchema,
} from './schemas.ts';
import {
  changeStatus,
  createExam,
  deleteExam,
  duplicateExam,
  getAdminExam,
  listAdminExams,
  reorderExam,
  updateExamInfo,
  validateExamById,
} from './service.ts';
import { saveUpload, UPLOAD_MAX_BYTES, UPLOAD_TYPES } from './uploads.ts';

/**
 * Quản trị đề thi (SRS 2.0, mục 3.15, 3.16, 5.2). Gắn bên trong adminRouter, nên mọi route đã qua
 * requireAuth + requireAdmin.
 */
export const examAdminRouter = Router();

// ---------- Đề ----------

examAdminRouter.get('/admin/exams', async (req, res) => {
  res.json(await listAdminExams(adminExamListQuerySchema.parse(req.query)));
});

examAdminRouter.post('/admin/exams', async (req, res) => {
  res.status(201).json(await createExam(examInfoSchema.parse(req.body)));
});

examAdminRouter.post('/admin/exams/import', async (req, res) => {
  const body = importBodySchema.parse(req.body);
  if (Buffer.byteLength(body.content, 'utf8') > IMPORT_MAX_BYTES) {
    throw ApiError.validation({ content: 'File tối đa 5 MB' }, 'File quá lớn');
  }
  const result = await importExam(body.content, body.dry_run);
  res.status(result.status).json(result.body);
});

examAdminRouter.get('/admin/exams/import-template', (_req, res) => {
  res.type('application/json').attachment('de-mau-n4-de-luyen-11.json').send(importTemplate());
});

examAdminRouter.get('/admin/exams/:id', async (req, res) => {
  res.json(await getAdminExam(req.params.id));
});

examAdminRouter.put('/admin/exams/:id', async (req, res) => {
  res.json(await updateExamInfo(req.params.id, examInfoUpdateSchema.parse(req.body)));
});

examAdminRouter.delete('/admin/exams/:id', async (req, res) => {
  await deleteExam(req.params.id);
  res.status(204).end();
});

examAdminRouter.post('/admin/exams/:id/duplicate', async (req, res) => {
  res.status(201).json(await duplicateExam(req.params.id));
});

examAdminRouter.post('/admin/exams/:id/validate', async (req, res) => {
  res.json(await validateExamById(req.params.id));
});

examAdminRouter.put('/admin/exams/:id/status', async (req, res) => {
  const { status } = statusSchema.parse(req.body);
  res.json(await changeStatus(req.params.id, status as ExamStatus));
});

examAdminRouter.put('/admin/exams/:id/order', async (req, res) => {
  res.json(await reorderExam(req.params.id, orderSchema.parse(req.body)));
});

examAdminRouter.get('/admin/exams/:id/export', async (req, res) => {
  const { filename, file } = await exportExam(req.params.id);
  res.attachment(filename).json(file);
});

// ---------- Từng tầng của đề ----------

examAdminRouter.post('/admin/sections', async (req, res) => {
  res.status(201).json(await content.createSection(sectionCreateSchema.parse(req.body)));
});
examAdminRouter.put('/admin/sections/:id', async (req, res) => {
  res.json(await content.updateSection(req.params.id, sectionUpdateSchema.parse(req.body)));
});
examAdminRouter.delete('/admin/sections/:id', async (req, res) => {
  res.json(await content.deleteSection(req.params.id));
});

examAdminRouter.post('/admin/mondai', async (req, res) => {
  res.status(201).json(await content.createMondai(mondaiCreateSchema.parse(req.body)));
});
examAdminRouter.put('/admin/mondai/:id', async (req, res) => {
  res.json(await content.updateMondai(req.params.id, mondaiUpdateSchema.parse(req.body)));
});
examAdminRouter.delete('/admin/mondai/:id', async (req, res) => {
  res.json(await content.deleteMondai(req.params.id));
});

examAdminRouter.post('/admin/passages', async (req, res) => {
  res.status(201).json(await content.createPassage(passageCreateSchema.parse(req.body)));
});
examAdminRouter.put('/admin/passages/:id', async (req, res) => {
  res.json(await content.updatePassage(req.params.id, passageUpdateSchema.parse(req.body)));
});
examAdminRouter.delete('/admin/passages/:id', async (req, res) => {
  res.json(await content.deletePassage(req.params.id));
});

examAdminRouter.post('/admin/questions', async (req, res) => {
  res.status(201).json(await content.createQuestion(questionCreateSchema.parse(req.body)));
});
examAdminRouter.put('/admin/questions/:id', async (req, res) => {
  const input = questionUpdateSchema.parse(req.body);
  res.json(await content.updateQuestion(req.params.id, input, currentUser(req).user.id));
});
examAdminRouter.delete('/admin/questions/:id', async (req, res) => {
  res.json(await content.deleteQuestion(req.params.id));
});
examAdminRouter.get('/admin/questions/:id/history', async (req, res) => {
  res.json(await content.questionHistory(req.params.id));
});

// ---------- Ảnh, dạng mondai ----------

examAdminRouter.post(
  '/admin/uploads',
  express.raw({ type: [...UPLOAD_TYPES], limit: UPLOAD_MAX_BYTES }),
  async (req, res) => {
    res.status(201).json(await saveUpload(req.body));
  },
);

examAdminRouter.get('/admin/mondai-types', async (_req, res) => {
  res.json(await listMondaiTypes());
});
examAdminRouter.post('/admin/mondai-types', async (req, res) => {
  res.status(201).json(await createMondaiType(mondaiTypeCreateSchema.parse(req.body)));
});
examAdminRouter.put('/admin/mondai-types/:id', async (req, res) => {
  res.json(await updateMondaiType(req.params.id, mondaiTypeUpdateSchema.parse(req.body)));
});
