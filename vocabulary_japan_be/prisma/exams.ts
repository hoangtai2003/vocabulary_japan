import { readFileSync } from 'node:fs';
import type { PrismaClient } from '../src/generated/prisma/client.ts';

/**
 * Dữ liệu tham chiếu của module luyện đề (SRS 2.0, mục 2.2): dạng mondai cấp N4. Dùng cho seed và
 * test. Chỉ thêm dạng còn thiếu (skipDuplicates), không ghi đè chỉnh sửa của quản trị viên.
 * Dạng N5 được nhập khi có đề N5 đầu tiên (mục 7.2, điểm 5).
 */
const ANSWER_CHOICE = '1・2・3・4から いちばん いい ものを 一つ えらんで ください。';

export const N4_MONDAI_TYPES = [
  { id: 'n4_kanji_yomi', section_title: '文字・語彙', label_ja: '漢字読み', name_vi: 'Đọc kanji', answer_kind: 'choice', has_passage: false, default_instructions: `＿＿＿の ことばは ひらがなで どう 書きますか。${ANSWER_CHOICE}` },
  { id: 'n4_hyouki', section_title: '文字・語彙', label_ja: '表記', name_vi: 'Viết kanji', answer_kind: 'choice', has_passage: false, default_instructions: `＿＿＿の ことばは どう 書きますか。${ANSWER_CHOICE}` },
  { id: 'n4_bunmyaku', section_title: '文字・語彙', label_ja: '文脈規定', name_vi: 'Chọn từ theo ngữ cảnh', answer_kind: 'choice', has_passage: false, default_instructions: `（　）に 何を 入れますか。${ANSWER_CHOICE}` },
  { id: 'n4_iikae', section_title: '文字・語彙', label_ja: '言い換え類義', name_vi: 'Câu đồng nghĩa', answer_kind: 'choice', has_passage: false, default_instructions: `＿＿＿の 文と だいたい 同じ いみの 文が あります。${ANSWER_CHOICE}` },
  { id: 'n4_youhou', section_title: '文字・語彙', label_ja: '用法', name_vi: 'Cách dùng từ', answer_kind: 'choice', has_passage: false, default_instructions: 'つぎの ことばの つかいかたで いちばん いい ものを 1・2・3・4から 一つ えらんで ください。' },
  { id: 'n4_bun_bunpou1', section_title: '文法・読解', label_ja: '文の文法1', name_vi: 'Ngữ pháp câu', answer_kind: 'choice', has_passage: false, default_instructions: `（　）に 何を 入れますか。${ANSWER_CHOICE}` },
  { id: 'n4_bun_bunpou2', section_title: '文法・読解', label_ja: '文の文法2', name_vi: 'Sắp xếp câu', answer_kind: 'star', has_passage: false, default_instructions: `＿★＿に 入る ものは どれですか。${ANSWER_CHOICE}` },
  { id: 'n4_bunshou_bunpou', section_title: '文法・読解', label_ja: '文章の文法', name_vi: 'Ngữ pháp đoạn văn', answer_kind: 'choice', has_passage: true, default_instructions: `文章の いみを 考えて、${ANSWER_CHOICE}` },
  { id: 'n4_naiyou_tanbun', section_title: '文法・読解', label_ja: '内容理解・短文', name_vi: 'Đọc hiểu đoạn ngắn', answer_kind: 'choice', has_passage: true, default_instructions: `つぎの 文章を 読んで、質問に 答えて ください。答えは、${ANSWER_CHOICE}` },
  { id: 'n4_naiyou_chuubun', section_title: '文法・読解', label_ja: '内容理解・中文', name_vi: 'Đọc hiểu đoạn vừa', answer_kind: 'choice', has_passage: true, default_instructions: `つぎの 文章を 読んで、質問に 答えて ください。答えは、${ANSWER_CHOICE}` },
  { id: 'n4_jouhou_kensaku', section_title: '文法・読解', label_ja: '情報検索', name_vi: 'Tìm thông tin', answer_kind: 'choice', has_passage: true, default_instructions: `下の 案内を 見て、質問に 答えて ください。答えは、${ANSWER_CHOICE}` },
] as const;

export async function seedMondaiTypes(prisma: PrismaClient) {
  const { count } = await prisma.mondaiType.createMany({
    data: N4_MONDAI_TYPES.map((t, index) => ({
      id: t.id,
      level: 'N4',
      sectionTitle: t.section_title,
      labelJa: t.label_ja,
      nameVi: t.name_vi,
      answerKind: t.answer_kind,
      hasPassage: t.has_passage,
      defaultInstructions: t.default_instructions,
      sortOrder: index + 1,
    })),
    skipDuplicates: true,
  });
  return count;
}

/** Đề mẫu số 11 ở định dạng nhập đề chuẩn (cũng là file mẫu của trang nhập đề, FR-IMP-06). */
export const SAMPLE_EXAM_FILE = new URL('./seed-data/exams/n4-de-luyen-11.json', import.meta.url);
export const loadSampleExam = () => readFileSync(SAMPLE_EXAM_FILE, 'utf8');
