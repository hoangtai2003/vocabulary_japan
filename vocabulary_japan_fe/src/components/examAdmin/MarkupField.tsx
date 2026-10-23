import { ImagePlus } from 'lucide-react';
import { useId, useRef, useState } from 'react';
import { examAdminApi } from '@/api/examAdminApi';
import { isApiError } from '@/api/client';
import { Markup } from '@/components/exam/Markup';
import { Spinner } from '@/components/ui/Spinner';
import { toast } from '@/stores/toastStore';
import { cn } from '@/utils/cn';
import { parseMarkup } from '@/utils/markup';

export type ToolbarItem = 'furigana' | 'underline' | 'bold' | 'blank' | 'numbered' | 'image';

const ALL_TOOLS: ToolbarItem[] = ['furigana', 'underline', 'bold', 'blank', 'numbered'];

const TOOL_LABELS: Record<Exclude<ToolbarItem, 'image'>, { label: string; title: string }> = {
  furigana: { label: '漢|かな', title: 'Furigana: bôi đen chữ Hán rồi bấm, gõ cách đọc sau dấu |' },
  underline: { label: '【下線】', title: 'Phần được hỏi (gạch chân)' },
  bold: { label: 'Đậm', title: 'Chữ đậm' },
  blank: { label: '（　）', title: 'Chỗ trống' },
  numbered: { label: '[[18]]', title: 'Chỗ trống đánh số, trỏ tới câu cùng số trong phần thi' },
};

export interface MarkupFieldProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  hint?: string;
  rows?: number;
  lang?: 'ja' | 'vi';
  tools?: ToolbarItem[];
  /** Ô một dòng ngắn (lựa chọn, phần đầu/cuối câu ★). */
  compact?: boolean;
}

/**
 * Ô soạn nội dung đề theo cú pháp DR-EX-08, có thanh công cụ chèn đánh dấu (FR-CMS-06), nút xem
 * trước và danh sách lỗi cú pháp tính ngay trên trình duyệt (cùng bộ phân tích với server).
 */
export function MarkupField({
  label,
  value,
  onChange,
  hint,
  rows = 3,
  lang = 'ja',
  tools = ALL_TOOLS,
  compact = false,
}: MarkupFieldProps) {
  const id = useId();
  const ref = useRef<HTMLTextAreaElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState(false);
  const [uploading, setUploading] = useState(false);
  const issues = value ? parseMarkup(value).issues : [];

  /** Bọc vùng đang chọn bằng before/after; con trỏ đặt ở `cursor` (tính từ đầu đoạn chèn). */
  const wrap = (before: string, after = '', placeholder = '', cursorInSelection?: number) => {
    const el = ref.current;
    const start = el?.selectionStart ?? value.length;
    const end = el?.selectionEnd ?? value.length;
    const selected = value.slice(start, end) || placeholder;
    const next = value.slice(0, start) + before + selected + after + value.slice(end);
    onChange(next);
    const caret = start + before.length + (cursorInSelection ?? selected.length);
    requestAnimationFrame(() => {
      el?.focus();
      el?.setSelectionRange(caret, caret);
    });
  };

  const apply = (tool: Exclude<ToolbarItem, 'image'>) => {
    switch (tool) {
      case 'furigana': {
        const el = ref.current;
        const hasSelection = el && el.selectionEnd > el.selectionStart;
        // Có chọn chữ: {chữ|▮}; không chọn: {漢字|かな} và chọn sẵn phần chữ Hán.
        if (hasSelection) wrap('{', '|}', '', (el.selectionEnd - el.selectionStart) + 1);
        else wrap('{', '|かな}', '漢字');
        break;
      }
      case 'underline':
        wrap('【', '】');
        break;
      case 'bold':
        wrap('**', '**');
        break;
      case 'blank':
        wrap('（　）', '', '', 0);
        break;
      case 'numbered':
        wrap('[[', ']]', '', 0);
        break;
    }
  };

  const upload = async (file: File) => {
    setUploading(true);
    try {
      const result = await examAdminApi.upload(file);
      wrap(`\n${result.markup.replace('![]', `![${file.name.replace(/\.[^.]+$/, '')}]`)}\n`, '', '', 0);
    } catch (error) {
      toast.error(isApiError(error) ? (Object.values(error.fields ?? {})[0] ?? error.message) : 'Chưa tải được ảnh');
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  const describedBy = [hint ? `${id}-hint` : null, issues.length > 0 ? `${id}-issues` : null].filter(Boolean).join(' ') || undefined;

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <label htmlFor={id} className="text-sm font-medium">
          {label}
        </label>
        <div className="flex flex-wrap items-center gap-1" role="toolbar" aria-label={`Chèn đánh dấu vào ${label}`}>
          {tools
            .filter((t): t is Exclude<ToolbarItem, 'image'> => t !== 'image')
            .map((tool) => (
              <button
                key={tool}
                type="button"
                title={TOOL_LABELS[tool].title}
                aria-label={TOOL_LABELS[tool].title}
                onClick={() => apply(tool)}
                className="h-7 rounded-[4px] border border-rule-strong bg-surface px-1.5 font-jp text-xs hover:border-ink"
              >
                {TOOL_LABELS[tool].label}
              </button>
            ))}
          {tools.includes('image') && (
            <>
              <button
                type="button"
                title="Chèn ảnh (PNG, JPEG, WebP, GIF; tối đa 2 MB)"
                aria-label="Chèn ảnh"
                disabled={uploading}
                onClick={() => fileRef.current?.click()}
                className="flex h-7 items-center gap-1 rounded-[4px] border border-rule-strong bg-surface px-1.5 text-xs hover:border-ink"
              >
                {uploading ? <Spinner /> : <ImagePlus aria-hidden="true" className="size-3.5" />}
                Ảnh
              </button>
              <input
                ref={fileRef}
                type="file"
                accept="image/png,image/jpeg,image/webp,image/gif"
                className="sr-only"
                tabIndex={-1}
                aria-hidden="true"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) void upload(file);
                }}
              />
            </>
          )}
          {!compact && (
            <button
              type="button"
              aria-pressed={preview}
              onClick={() => setPreview((v) => !v)}
              className={cn(
                'h-7 rounded-[4px] border px-1.5 text-xs',
                preview ? 'border-ink bg-ink text-paper' : 'border-rule-strong bg-surface hover:border-ink',
              )}
            >
              Xem trước
            </button>
          )}
        </div>
      </div>
      <textarea
        ref={ref}
        id={id}
        lang={lang}
        rows={compact ? 1 : rows}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        aria-invalid={issues.length > 0 || undefined}
        aria-describedby={describedBy}
        spellCheck={lang === 'vi'}
        className={cn(
          'w-full rounded-[var(--radius-control)] border border-rule-strong bg-surface px-3 py-2 text-base',
          'focus-visible:border-son aria-[invalid=true]:border-son',
          lang === 'ja' && 'font-jp',
          compact ? 'min-h-11 resize-y' : 'resize-y',
        )}
      />
      {hint && (
        <p id={`${id}-hint`} className="text-xs text-ink-muted">
          {hint}
        </p>
      )}
      {issues.length > 0 && (
        <ul id={`${id}-issues`} className="text-sm font-medium text-son-ink">
          {issues.map((issue, index) => (
            <li key={index}>
              {issue.message} (gần “{issue.snippet}”)
            </li>
          ))}
        </ul>
      )}
      {(preview || compact) && value.trim() && (
        <div className={cn('rounded-[var(--radius-control)] border border-dashed border-rule-strong bg-paper px-3 py-2', compact && 'py-1')}>
          <Markup source={value} lang={lang} inline={compact} />
        </div>
      )}
    </div>
  );
}
