/**
 * Cú pháp đánh dấu trong nội dung đề (SRS 2.0, DR-EX-08). Frontend chép nguyên file này
 * (src/utils/markup.ts) để hiển thị; backend dùng để kiểm tra trước khi xuất bản và khi nhập đề.
 *
 * - furigana:                 {漢字|かんじ}
 * - phần được hỏi (gạch chân): 【…】 (bên trong được có furigana)
 * - chữ đậm (lời giải):        **…**
 * - chỗ trống:                 （　） hoặc （ ）
 * - chỗ trống đánh số:          [[18]]  → trỏ tới câu số 18 của cùng phần thi
 * - bảng:                      bảng Markdown (dòng bắt đầu bằng |, dòng thứ hai |---|)
 * - hình ảnh:                  một dòng riêng ![mô tả](upload:<mã tệp>)
 * - xuống dòng giữ nguyên; dòng trống ngăn cách đoạn.
 */

export type Inline =
  | { type: 'text'; text: string }
  | { type: 'ruby'; base: string; reading: string }
  | { type: 'underline'; children: Inline[] }
  | { type: 'bold'; children: Inline[] }
  | { type: 'blank' }
  | { type: 'numbered_blank'; n: number }
  | { type: 'break' };

export type Block =
  | { type: 'paragraph'; children: Inline[] }
  | { type: 'table'; header: Inline[][] | null; rows: Inline[][][] }
  | { type: 'image'; uploadId: string; alt: string };

export interface MarkupIssue {
  message: string;
  /** Đoạn văn bản quanh chỗ sai, để người soạn tìm ra. */
  snippet: string;
}

export interface ParsedMarkup {
  blocks: Block[];
  issues: MarkupIssue[];
}

const IMAGE_LINE = /^!\[([^\]]*)\]\(upload:([A-Za-z0-9_-]+)\)$/;
const LOOSE_IMAGE = /!\[[^\]]*\]\([^)]*\)/;
const TABLE_SEPARATOR = /^\|?\s*:?-{3,}:?\s*(\|\s*:?-{3,}:?\s*)*\|?$/;
const NUMBERED_BLANK = /^\[\[(\d{1,3})\]\]/;
const BLANK = /^（[ 　]?）/;

const snippetAt = (source: string, index: number) =>
  source.slice(Math.max(0, index - 8), index + 12).replace(/\n/g, ' ');

type Frame = { kind: 'root' | 'underline' | 'bold'; children: Inline[]; start: number };

/** Phân tích một đoạn (không chứa bảng hay hình). Xuống dòng thành { type: 'break' }. */
export function parseInline(source: string, issues: MarkupIssue[] = []): Inline[] {
  const stack: Frame[] = [{ kind: 'root', children: [], start: 0 }];
  let text = '';
  const top = () => stack[stack.length - 1]!;
  const flush = () => {
    if (text) top().children.push({ type: 'text', text });
    text = '';
  };

  let i = 0;
  while (i < source.length) {
    const ch = source[i]!;
    const rest = source.slice(i);

    if (ch === '{') {
      const end = source.indexOf('}', i + 1);
      const inner = end === -1 ? '' : source.slice(i + 1, end);
      const parts = inner.split('|');
      if (end === -1 || inner.includes('\n') || inner.includes('{') || parts.length !== 2 || !parts[0] || !parts[1]) {
        issues.push({ message: 'Furigana phải có dạng {漢字|かんじ}', snippet: snippetAt(source, i) });
        text += ch;
        i += 1;
        continue;
      }
      flush();
      top().children.push({ type: 'ruby', base: parts[0], reading: parts[1] });
      i = end + 1;
      continue;
    }
    if (ch === '}') {
      issues.push({ message: 'Thừa dấu } (furigana phải có dạng {漢字|かんじ})', snippet: snippetAt(source, i) });
      text += ch;
      i += 1;
      continue;
    }
    if (ch === '【') {
      if (stack.some((f) => f.kind === 'underline')) {
        issues.push({ message: 'Không lồng 【】 trong 【】', snippet: snippetAt(source, i) });
        text += ch;
        i += 1;
        continue;
      }
      flush();
      stack.push({ kind: 'underline', children: [], start: i });
      i += 1;
      continue;
    }
    if (ch === '】') {
      if (top().kind !== 'underline') {
        issues.push({ message: 'Dấu 】 không có 【 mở tương ứng', snippet: snippetAt(source, i) });
        text += ch;
        i += 1;
        continue;
      }
      flush();
      const frame = stack.pop()!;
      top().children.push({ type: 'underline', children: frame.children });
      i += 1;
      continue;
    }
    if (rest.startsWith('**')) {
      flush();
      if (top().kind === 'bold') {
        const frame = stack.pop()!;
        top().children.push({ type: 'bold', children: frame.children });
      } else {
        stack.push({ kind: 'bold', children: [], start: i });
      }
      i += 2;
      continue;
    }
    if (rest.startsWith('[[')) {
      const match = NUMBERED_BLANK.exec(rest);
      if (!match) {
        issues.push({ message: 'Chỗ trống đánh số phải có dạng [[18]]', snippet: snippetAt(source, i) });
        text += ch;
        i += 1;
        continue;
      }
      flush();
      top().children.push({ type: 'numbered_blank', n: Number(match[1]) });
      i += match[0].length;
      continue;
    }
    if (ch === '（') {
      const match = BLANK.exec(rest);
      if (match) {
        flush();
        top().children.push({ type: 'blank' });
        i += match[0].length;
        continue;
      }
    }
    if (ch === '\n') {
      flush();
      top().children.push({ type: 'break' });
      i += 1;
      continue;
    }
    text += ch;
    i += 1;
  }
  flush();

  // Còn khung chưa đóng: báo lỗi và trả nội dung về khung cha để vẫn hiển thị được.
  while (stack.length > 1) {
    const frame = stack.pop()!;
    issues.push({
      message: frame.kind === 'underline' ? 'Thiếu dấu 】 đóng phần được hỏi' : 'Thiếu dấu ** đóng chữ đậm',
      snippet: snippetAt(source, frame.start),
    });
    top().children.push({ type: 'text', text: frame.kind === 'underline' ? '【' : '**' }, ...frame.children);
  }
  return stack[0]!.children;
}

/** Tách ô của một dòng bảng; dấu | bên trong furigana {漢字|かんじ} không phải ranh giới ô. */
function splitRow(line: string): string[] {
  let body = line.trim();
  if (body.startsWith('|')) body = body.slice(1);
  if (body.endsWith('|')) body = body.slice(0, -1);
  const cells: string[] = [];
  let cell = '';
  let inRuby = false;
  for (const ch of body) {
    if (ch === '{') inRuby = true;
    if (ch === '}') inRuby = false;
    if (ch === '|' && !inRuby) {
      cells.push(cell.trim());
      cell = '';
      continue;
    }
    cell += ch;
  }
  cells.push(cell.trim());
  return cells;
}

function parseTable(lines: string[], issues: MarkupIssue[]): Block {
  const hasHeader = lines.length >= 2 && TABLE_SEPARATOR.test(lines[1]!.trim());
  const rawRows = hasHeader ? [lines[0]!, ...lines.slice(2)] : lines;
  const cells = rawRows.map(splitRow);
  const width = cells[0]?.length ?? 0;
  cells.forEach((row, index) => {
    if (row.length !== width) {
      issues.push({
        message: `Bảng: dòng ${index + 1} có ${row.length} cột, dòng đầu có ${width} cột`,
        snippet: rawRows[index]!.slice(0, 20),
      });
    }
  });
  const parsed = cells.map((row) => row.map((cell) => parseInline(cell, issues)));
  return hasHeader
    ? { type: 'table', header: parsed[0]!, rows: parsed.slice(1) }
    : { type: 'table', header: null, rows: parsed };
}

/** Phân tích toàn bộ nội dung thành các khối, kèm danh sách lỗi cú pháp (rỗng là hợp lệ). */
export function parseMarkup(source: string): ParsedMarkup {
  const issues: MarkupIssue[] = [];
  const blocks: Block[] = [];
  const lines = source.replace(/\r\n?/g, '\n').split('\n');
  let paragraph: string[] = [];
  let table: string[] = [];

  const flushParagraph = () => {
    if (paragraph.length > 0) blocks.push({ type: 'paragraph', children: parseInline(paragraph.join('\n'), issues) });
    paragraph = [];
  };
  const flushTable = () => {
    if (table.length > 0) blocks.push(parseTable(table, issues));
    table = [];
  };

  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.startsWith('|')) {
      flushParagraph();
      table.push(trimmed);
      continue;
    }
    flushTable();
    if (trimmed === '') {
      flushParagraph();
      continue;
    }
    const image = IMAGE_LINE.exec(trimmed);
    if (image) {
      flushParagraph();
      blocks.push({ type: 'image', alt: image[1]!, uploadId: image[2]! });
      continue;
    }
    if (LOOSE_IMAGE.test(trimmed)) {
      issues.push({
        message: 'Hình ảnh phải nằm trên một dòng riêng, dạng ![mô tả](upload:<mã tệp>)',
        snippet: trimmed.slice(0, 20),
      });
    }
    paragraph.push(line);
  }
  flushParagraph();
  flushTable();
  return { blocks, issues };
}

function walkInlines(inlines: Inline[], visit: (node: Inline) => void) {
  for (const node of inlines) {
    visit(node);
    if (node.type === 'underline' || node.type === 'bold') walkInlines(node.children, visit);
  }
}

function walkBlocks(blocks: Block[], visit: (node: Inline) => void) {
  for (const block of blocks) {
    if (block.type === 'paragraph') walkInlines(block.children, visit);
    if (block.type === 'table') {
      for (const row of [...(block.header ? [block.header] : []), ...block.rows]) {
        for (const cell of row) walkInlines(cell, visit);
      }
    }
  }
}

/** Số của mọi chỗ trống đánh số [[n]] trong nội dung. */
export function numberedBlanks(source: string): number[] {
  const numbers: number[] = [];
  walkBlocks(parseMarkup(source).blocks, (node) => {
    if (node.type === 'numbered_blank') numbers.push(node.n);
  });
  return numbers;
}

/** Mã tệp của mọi hình ảnh trong nội dung. */
export function uploadIds(source: string): string[] {
  return parseMarkup(source)
    .blocks.filter((block): block is Extract<Block, { type: 'image' }> => block.type === 'image')
    .map((block) => block.uploadId);
}

/** Văn bản thuần (bỏ đánh dấu, furigana chỉ giữ chữ gốc), dùng cho tóm tắt và so trùng. */
export function plainText(source: string): string {
  const out: string[] = [];
  const write = (inlines: Inline[]) =>
    walkInlines(inlines, (node) => {
      if (node.type === 'text') out.push(node.text);
      else if (node.type === 'ruby') out.push(node.base);
      else if (node.type === 'blank') out.push('（　）');
      else if (node.type === 'numbered_blank') out.push(`（${node.n}）`);
      else if (node.type === 'break') out.push('\n');
    });
  for (const block of parseMarkup(source).blocks) {
    if (block.type === 'paragraph') write(block.children);
    if (block.type === 'table') {
      for (const row of [...(block.header ? [block.header] : []), ...block.rows]) {
        row.forEach((cell, index) => {
          if (index > 0) out.push(' | ');
          write(cell);
        });
        out.push('\n');
      }
    }
    out.push('\n');
  }
  return out.join('').trim();
}
