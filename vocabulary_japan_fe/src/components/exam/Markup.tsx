import { Fragment, type ReactNode } from 'react';
import { uploadUrl } from '@/api/examsApi';
import { cn } from '@/utils/cn';
import { parseMarkup, type Block, type Inline } from '@/utils/markup';

export interface MarkupProps {
  /** Nội dung theo cú pháp DR-EX-08 */
  source: string;
  /** Số câu đang làm: chỗ trống [[n]] trùng số được tô nổi bật (FR-RUN-10). */
  activeBlank?: number | null;
  /** inline: chỉ đoạn đầu, không bọc <p> (lựa chọn, câu hỏi ngắn). */
  inline?: boolean;
  lang?: 'ja' | 'vi';
  className?: string;
}

function renderInlines(nodes: Inline[], activeBlank: number | null | undefined): ReactNode[] {
  return nodes.map((node, index) => {
    switch (node.type) {
      case 'text':
        return <Fragment key={index}>{node.text}</Fragment>;
      case 'ruby':
        return (
          <ruby key={index}>
            {node.base}
            <rp>(</rp>
            <rt>{node.reading}</rt>
            <rp>)</rp>
          </ruby>
        );
      case 'underline':
        // Phần được hỏi: gạch chân như đề in (FR-RUN-11).
        return (
          <u key={index} className="decoration-ink decoration-1 underline-offset-[6px]">
            {renderInlines(node.children, activeBlank)}
          </u>
        );
      case 'bold':
        return <strong key={index}>{renderInlines(node.children, activeBlank)}</strong>;
      case 'blank':
        return (
          <span key={index} className="whitespace-nowrap">
            （<span role="img" aria-label="chỗ trống" className="inline-block w-10" />）
          </span>
        );
      case 'numbered_blank': {
        const active = node.n === activeBlank;
        return (
          <span
            key={index}
            role="img"
            aria-label={`chỗ trống số ${node.n}${active ? ', câu đang làm' : ''}`}
            data-active={active || undefined}
            className={cn(
              'mx-1 inline-flex min-w-10 items-center justify-center border px-1.5 align-baseline font-sans text-sm leading-6 tabular-nums',
              active ? 'border-son bg-son-wash font-semibold text-son-ink' : 'border-ink',
            )}
          >
            {node.n}
          </span>
        );
      }
      case 'break':
        return <br key={index} />;
    }
  });
}

function renderBlock(block: Block, index: number, activeBlank: number | null | undefined) {
  if (block.type === 'paragraph') {
    return <p key={index}>{renderInlines(block.children, activeBlank)}</p>;
  }
  if (block.type === 'image') {
    return (
      <img
        key={index}
        src={uploadUrl(block.uploadId)}
        alt={block.alt}
        loading="lazy"
        className="max-w-full rounded-[4px] border border-rule"
      />
    );
  }
  return (
    <div key={index} className="overflow-x-auto">
      {/* Ô không ngắt dòng; bảng rộng hơn màn hình điện thoại thì cuộn ngang trong khung. */}
      <table className="w-max min-w-full border-collapse text-[0.95em]">
        {block.header && (
          <thead>
            <tr>
              {block.header.map((cell, c) => (
                <th key={c} scope="col" className="whitespace-nowrap border border-rule-strong bg-paper px-2 py-1 text-left font-semibold">
                  {renderInlines(cell, activeBlank)}
                </th>
              ))}
            </tr>
          </thead>
        )}
        <tbody>
          {block.rows.map((row, r) => (
            <tr key={r}>
              {row.map((cell, c) => (
                <td key={c} className="whitespace-nowrap border border-rule-strong px-2 py-1 align-top">
                  {renderInlines(cell, activeBlank)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/**
 * Hiển thị nội dung đề: furigana nhỏ phía trên chữ, phần được hỏi gạch chân, chỗ trống, bảng,
 * ảnh. Chữ Nhật dùng lớp .exam-text (cỡ ≥ 16px, giãn dòng đủ cho furigana, NFR-EX-06).
 */
export function Markup({ source, activeBlank, inline = false, lang = 'ja', className }: MarkupProps) {
  const { blocks } = parseMarkup(source);
  const first = blocks[0];
  if (inline && blocks.length <= 1 && (!first || first.type === 'paragraph')) {
    return (
      <span lang={lang} className={cn(lang === 'ja' && 'exam-text', className)}>
        {first ? renderInlines(first.children, activeBlank) : null}
      </span>
    );
  }
  return (
    <div lang={lang} className={cn('flex flex-col gap-3', lang === 'ja' && 'exam-text', className)}>
      {blocks.map((block, index) => renderBlock(block, index, activeBlank))}
    </div>
  );
}
