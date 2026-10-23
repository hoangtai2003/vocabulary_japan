import { Download, FileJson } from 'lucide-react';
import { useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { examAdminApi } from '@/api/examAdminApi';
import { isApiError } from '@/api/client';
import { AdminTabs } from '@/components/admin/AdminTabs';
import { ExamPreview } from '@/components/examAdmin/ExamPreview';
import { IssuesPanel } from '@/components/examAdmin/IssuesPanel';
import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/Button';
import { buttonClasses } from '@/components/ui/buttonStyles';
import { Card } from '@/components/ui/Card';
import { ErrorState } from '@/components/ui/ErrorState';
import { useImportDryRun, useImportExam, useMondaiTypes } from '@/hooks/queries/useExamAdmin';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { toast } from '@/stores/toastStore';
import type { ImportIssue } from '@/types/exam';
import { saveBlob } from '@/utils/download';

/** FR-IMP-01: file tối đa 5 MB. */
const MAX_BYTES = 5 * 1024 * 1024;

/**
 * /quan-tri/de-thi/nhap (FR-IMP): chọn file JSON → server kiểm tra và trả số phần, mondai, câu,
 * lỗi, cảnh báo và bản xem trước → còn lỗi thì không nhập được; hợp lệ thì nhập trọn vẹn thành
 * một đề Nháp mới, rồi mở trình soạn.
 */
export default function AdminExamImportPage() {
  useDocumentTitle('Nhập đề');
  const navigate = useNavigate();
  const fileRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<{ name: string; content: string } | null>(null);
  const [localError, setLocalError] = useState<string | null>(null);
  const [importErrors, setImportErrors] = useState<ImportIssue[] | null>(null);
  const dryRun = useImportDryRun();
  const doImport = useImportExam();
  const types = useMondaiTypes();
  const result = dryRun.data;

  const choose = async (picked: File) => {
    setLocalError(null);
    setImportErrors(null);
    dryRun.reset();
    if (picked.size > MAX_BYTES) {
      setFile(null);
      setLocalError('File tối đa 5 MB.');
      return;
    }
    const content = await picked.text();
    setFile({ name: picked.name, content });
    dryRun.mutate(content);
  };

  const confirmImport = () => {
    if (!file) return;
    doImport.mutate(file.content, {
      onSuccess: ({ exam, warnings }) => {
        toast.success(
          warnings.length > 0 ? `Đã nhập đề (Nháp), còn ${warnings.length} cảnh báo cần xem` : 'Đã nhập đề ở trạng thái Nháp',
        );
        navigate(`/quan-tri/de-thi/${exam.id}`);
      },
      onError: (error) => {
        if (isApiError(error) && error.code === 'EXAM_INVALID') {
          setImportErrors((error.details?.errors as ImportIssue[] | undefined) ?? []);
        }
        toast.error(isApiError(error) ? error.message : 'Chưa nhập được đề');
      },
    });
  };

  const downloadTemplate = async () => {
    try {
      const { blob, filename } = await examAdminApi.importTemplate();
      saveBlob(blob, filename);
    } catch {
      toast.error('Chưa tải được file mẫu');
    }
  };

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title="Quản trị"
        description="Nhập một đề mới từ file JSON theo định dạng nhập đề chuẩn."
        actions={
          <Link to="/quan-tri/de-thi" className={buttonClasses({ variant: 'ghost', size: 'sm' })}>
            ← Danh sách đề
          </Link>
        }
      />
      <AdminTabs />

      <Card className="flex flex-col gap-4 p-4 sm:p-5">
        <div>
          <h2 className="text-xl">Nhập đề</h2>
          <p className="text-sm text-ink-muted">
            Mỗi lần nhập tạo một đề mới ở trạng thái Nháp, không ghi đè đề có sẵn. Sau khi nhập, sửa đề trên trình soạn. Việc
            chuyển đề từ PDF hay markdown sang JSON làm bên ngoài app.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button onClick={() => fileRef.current?.click()} loading={dryRun.isPending}>
            <FileJson aria-hidden="true" className="size-4" />
            Chọn file JSON
          </Button>
          <Button variant="secondary" onClick={() => void downloadTemplate()}>
            <Download aria-hidden="true" className="size-4" />
            Tải file mẫu (đề số 11)
          </Button>
          {file && <span className="text-sm text-ink-muted">{file.name}</span>}
          <input
            ref={fileRef}
            type="file"
            accept="application/json,.json"
            className="sr-only"
            tabIndex={-1}
            aria-hidden="true"
            onChange={(e) => {
              const picked = e.target.files?.[0];
              if (picked) void choose(picked);
              e.target.value = '';
            }}
          />
        </div>
        {localError && (
          <p role="alert" className="font-medium text-son-ink">
            {localError}
          </p>
        )}
        {dryRun.isError && (
          <ErrorState
            title="Chưa kiểm tra được file"
            message={isApiError(dryRun.error) ? dryRun.error.message : undefined}
            onRetry={() => file && dryRun.mutate(file.content)}
          />
        )}
      </Card>

      {result && (
        <>
          <Card className="flex flex-col gap-4 p-4 sm:p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-xl">Kết quả kiểm tra</h2>
                {result.summary && (
                  <p className="text-sm text-ink-muted">
                    {result.summary.sections} phần thi · {result.summary.mondai} mondai · {result.summary.passages} bài đọc ·{' '}
                    <strong className="text-ink">{result.summary.questions} câu</strong>
                  </p>
                )}
              </div>
              <Button onClick={confirmImport} disabled={!result.valid} loading={doImport.isPending}>
                Nhập đề
              </Button>
            </div>
            {!result.valid && <p className="text-[15px] text-son-ink">Còn lỗi nên chưa nhập được. Sửa file rồi chọn lại.</p>}
            <IssuesPanel errors={importErrors ?? result.errors} warnings={result.warnings} />
          </Card>

          {result.preview && (
            <section aria-labelledby="preview-heading" className="flex flex-col gap-3">
              <h2 id="preview-heading" className="text-xl">
                Xem trước: {result.preview.title}
              </h2>
              <ExamPreview exam={result.preview} types={types.data ?? []} />
            </section>
          )}
        </>
      )}
    </div>
  );
}
