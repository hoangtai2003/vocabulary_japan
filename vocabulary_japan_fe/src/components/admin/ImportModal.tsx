import { Check, FileDown } from 'lucide-react';
import { useId, useMemo, useRef, useState, type ChangeEvent } from 'react';
import { isApiError } from '@/api/client';
import { FormAlert } from '@/components/auth/FormAlert';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { Skeleton, SkeletonGroup } from '@/components/ui/Skeleton';
import { useImportWords } from '@/hooks/queries/useAdminWords';
import { toast } from '@/stores/toastStore';
import type { ImportFormat, ImportResult, ImportRowError } from '@/types/api';
import { cn } from '@/utils/cn';
import { downloadBlob } from '@/utils/download';
import { parseWordsCsv, sampleWordsCsv } from '@/utils/wordCsv';

const MAX_FILE_BYTES = 2 * 1024 * 1024;
/** Hiện tối đa ngần này dòng hợp lệ trong bảng xem trước; dòng lỗi luôn được hiện. */
const PREVIEW_LIMIT = 300;

interface LoadedFile {
  name: string;
  format: ImportFormat;
  content: string;
}

interface PreviewRow {
  /** Số dòng giống server: 1 = dòng dữ liệu đầu tiên. */
  row: number;
  word: string;
  reading: string;
  meaning: string;
  level: string;
  topic: string;
}

const text = (value: unknown) => (typeof value === 'string' ? value : '');

/** Đọc file ở phía trình duyệt chỉ để hiển thị bảng xem trước; kiểm tra thật do dry run. */
function previewRows(file: LoadedFile): PreviewRow[] {
  let raw: unknown[] = [];
  if (file.format === 'csv') {
    raw = parseWordsCsv(file.content).rows;
  } else {
    try {
      const parsed: unknown = JSON.parse(file.content);
      if (Array.isArray(parsed)) raw = parsed;
    } catch {
      // Lỗi cấu trúc do server báo (row 0).
    }
  }
  return raw.map((item, index) => {
    const r = (item && typeof item === 'object' ? item : {}) as Record<string, unknown>;
    const meanings = Array.isArray(r.meanings_vi) ? r.meanings_vi.map(text) : [];
    const kanji = text(r.kanji);
    return {
      row: index + 1,
      word: kanji || text(r.kana),
      reading: kanji ? text(r.kana) : '',
      meaning: meanings.join('; '),
      level: text(r.level),
      topic: text(r.topic_id),
    };
  });
}

function formatFromName(name: string): ImportFormat | null {
  const ext = name.toLowerCase().split('.').pop();
  return ext === 'csv' || ext === 'json' ? ext : null;
}

/**
 * Nhập từ từ file CSV/JSON: chọn file → gọi dry run → bảng xem trước (dòng lỗi tô đỏ, kèm
 * thông báo từng dòng) → bấm "Nhập" mới ghi thật. Chỉ các dòng hợp lệ được nhập.
 */
export function ImportModal({ onClose }: { onClose: () => void }) {
  const inputId = useId();
  const dryRun = useImportWords();
  const commit = useImportWords();
  const [file, setFile] = useState<LoadedFile | null>(null);
  const [preview, setPreview] = useState<ImportResult | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  // Chọn file khác khi dry run trước chưa xong: bỏ kết quả cũ.
  const latestFile = useRef<LoadedFile | null>(null);

  const rows = useMemo(() => (file ? previewRows(file) : []), [file]);
  const { rowErrors, fileErrors } = useMemo(() => {
    const byRow = new Map<number, ImportRowError[]>();
    const general: ImportRowError[] = [];
    for (const error of preview?.errors ?? []) {
      if (error.row <= 0) general.push(error);
      else byRow.set(error.row, [...(byRow.get(error.row) ?? []), error]);
    }
    return { rowErrors: byRow, fileErrors: general };
  }, [preview]);
  const shownRows = rows.filter((r) => r.row <= PREVIEW_LIMIT || rowErrors.has(r.row));

  const onFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const picked = event.target.files?.[0];
    latestFile.current = null;
    setPreview(null);
    setFile(null);
    setFileError(null);
    if (!picked) return;

    const format = formatFromName(picked.name);
    if (!format) return setFileError('Chỉ nhận file .csv hoặc .json.');
    if (picked.size > MAX_FILE_BYTES) return setFileError('File lớn hơn 2 MB. Chia nhỏ rồi nhập.');

    const loaded: LoadedFile = { name: picked.name, format, content: await picked.text() };
    latestFile.current = loaded;
    setFile(loaded);
    dryRun.mutate(
      { format, content: loaded.content, dry_run: true },
      {
        onSuccess: (result) => {
          if (latestFile.current === loaded) setPreview(result);
        },
        onError: (error) =>
          latestFile.current === loaded &&
          setFileError(
            isApiError(error) ? error.message : 'Chưa kiểm tra được file. Thử chọn lại.',
          ),
      },
    );
  };

  const onImport = () => {
    if (!file) return;
    commit.mutate(
      { format: file.format, content: file.content, dry_run: false },
      {
        onSuccess: (result) => {
          const skipped = rowErrors.size;
          toast.success(
            `Đã nhập ${result.created_count} từ` +
              (skipped > 0 ? `, bỏ qua ${skipped} dòng lỗi.` : '.'),
          );
          onClose();
        },
        onError: () => toast.error('Chưa nhập được. Kiểm tra mạng rồi thử lại.'),
      },
    );
  };

  const downloadSample = () =>
    downloadBlob(
      // BOM giúp Excel nhận đúng UTF-8.
      new Blob([String.fromCharCode(0xfeff) + sampleWordsCsv()], {
        type: 'text/csv;charset=utf-8',
      }),
      'tu-vung-mau.csv',
    );

  const validCount = preview?.valid_count ?? 0;
  const busy = commit.isPending;

  return (
    <Modal
      open
      onClose={onClose}
      title="Nhập từ từ file"
      description="CSV (UTF-8, dòng đầu là tên cột, các nghĩa ngăn cách bằng |) hoặc JSON là mảng các từ."
      size="lg"
      dismissible={!busy}
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={busy}>
            Hủy
          </Button>
          <Button
            onClick={onImport}
            loading={busy}
            disabled={!preview || validCount === 0 || dryRun.isPending}
          >
            {busy ? 'Đang nhập…' : validCount > 0 ? `Nhập ${validCount} từ` : 'Nhập'}
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div className="flex min-w-0 flex-col gap-1.5">
            <label htmlFor={inputId} className="text-sm font-medium">
              Chọn file
            </label>
            <input
              id={inputId}
              type="file"
              accept=".csv,.json,text/csv,application/json"
              data-autofocus
              disabled={busy}
              onChange={(e) => void onFileChange(e)}
              className={cn(
                'max-w-full text-sm text-ink-muted',
                'file:mr-3 file:h-9 file:cursor-pointer file:rounded-[var(--radius-control)] file:border file:border-rule-strong',
                'file:bg-surface file:px-3 file:text-sm file:font-semibold file:text-ink hover:file:bg-paper',
              )}
            />
          </div>
          <Button variant="ghost" size="sm" onClick={downloadSample}>
            <FileDown aria-hidden="true" className="size-4" />
            Tải file CSV mẫu
          </Button>
        </div>

        <FormAlert message={fileError} />

        {dryRun.isPending && (
          <SkeletonGroup label="Đang kiểm tra file" className="flex flex-col gap-2">
            <Skeleton className="h-5 w-56" />
            <Skeleton className="h-32 w-full" />
          </SkeletonGroup>
        )}

        {preview && file && (
          <>
            {fileErrors.map((e) => (
              <FormAlert key={e.message} message={e.message} />
            ))}
            <p aria-live="polite" className="text-sm">
              <span className="font-semibold">{file.name}</span>:{' '}
              <span className="text-moss-ink">{preview.valid_count} dòng hợp lệ</span>
              {rowErrors.size > 0 && (
                <>
                  , <span className="font-semibold text-son-ink">{rowErrors.size} dòng lỗi</span> sẽ
                  bị bỏ qua
                </>
              )}
              .
            </p>
            {shownRows.length > 0 && (
              <div className="max-h-[45dvh] overflow-auto rounded-[var(--radius-card)] border border-rule">
                <table className="w-full min-w-[560px] text-left text-sm">
                  <caption className="sr-only">Xem trước dữ liệu nhập</caption>
                  <thead className="sticky top-0 border-b border-rule-strong bg-paper">
                    <tr>
                      <th scope="col" className="w-14 px-3 py-2 font-semibold">
                        Dòng
                      </th>
                      <th scope="col" className="px-3 py-2 font-semibold">
                        Chữ
                      </th>
                      <th scope="col" className="px-3 py-2 font-semibold">
                        Nghĩa
                      </th>
                      <th scope="col" className="w-12 px-3 py-2 font-semibold">
                        Cấp
                      </th>
                      <th scope="col" className="px-3 py-2 font-semibold">
                        Kết quả
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {shownRows.map((r) => {
                      const errs = rowErrors.get(r.row);
                      return (
                        <tr
                          key={r.row}
                          className={cn(
                            'border-b border-rule align-top last:border-0',
                            errs && 'bg-son-wash/60 shadow-[inset_3px_0_0_var(--son)]',
                          )}
                        >
                          <td className="px-3 py-2 tabular-nums text-ink-muted">{r.row}</td>
                          <td className="px-3 py-2">
                            <span lang="ja" className="font-jp">
                              {r.word || '—'}
                            </span>
                            {r.reading && (
                              <span lang="ja" className="block font-jp text-xs text-ink-muted">
                                {r.reading}
                              </span>
                            )}
                          </td>
                          <td className="max-w-48 px-3 py-2">{r.meaning || '—'}</td>
                          <td className="px-3 py-2">{r.level || '—'}</td>
                          <td className="px-3 py-2">
                            {errs ? (
                              <ul className="flex flex-col gap-0.5 text-son-ink">
                                {errs.map((e) => (
                                  <li key={`${e.field}-${e.message}`}>
                                    <span className="font-mono text-xs">{e.field}</span>:{' '}
                                    {e.message}
                                  </li>
                                ))}
                              </ul>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-moss-ink">
                                <Check aria-hidden="true" className="size-4" />
                                Hợp lệ
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
            {shownRows.length < rows.length && (
              <p className="text-sm text-ink-muted">
                Bảng hiện {shownRows.length}/{rows.length} dòng (mọi dòng lỗi đều được hiện).
              </p>
            )}
          </>
        )}

        {!file && !fileError && !dryRun.isPending && (
          <p className="text-sm text-ink-muted">
            Chọn file để xem trước. Chưa có gì được ghi cho tới khi bạn bấm Nhập.
          </p>
        )}
      </div>
    </Modal>
  );
}
