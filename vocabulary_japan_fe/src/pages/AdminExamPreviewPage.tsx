import { Link, useParams, useSearchParams } from 'react-router-dom';
import { isApiError } from '@/api/client';
import { ExamPreview } from '@/components/examAdmin/ExamPreview';
import { StatusBadge } from '@/components/examAdmin/StatusBadge';
import { buttonClasses } from '@/components/ui/buttonStyles';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorState } from '@/components/ui/ErrorState';
import { FullPageLoader } from '@/components/ui/FullPageLoader';
import { useAdminExam, useMondaiTypes } from '@/hooks/queries/useExamAdmin';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';

/**
 * /quan-tri/de-thi/:examId/xem-truoc (FR-CMS-11): toàn màn hình như màn hình làm bài.
 * ?cau=<id> mở sẵn một câu, ?mondai=<id> chỉ xem một mondai.
 */
export default function AdminExamPreviewPage() {
  const { examId = '' } = useParams();
  const [params] = useSearchParams();
  const exam = useAdminExam(examId);
  const types = useMondaiTypes();
  useDocumentTitle(exam.data ? `Xem trước: ${exam.data.title}` : 'Xem trước');

  if (exam.isPending) return <FullPageLoader />;
  if (exam.isError) {
    return (
      <div className="mx-auto max-w-lg px-4 py-16">
        {isApiError(exam.error) && exam.error.status === 404 ? (
          <EmptyState mark="無" title="Không tìm thấy đề" />
        ) : (
          <ErrorState title="Chưa tải được đề" onRetry={() => void exam.refetch()} />
        )}
      </div>
    );
  }

  return (
    <div className="min-h-dvh bg-paper">
      <header className="flex h-14 items-center gap-3 border-b border-rule px-4">
        <Link to={`/quan-tri/de-thi/${examId}${params.get('cau') ? `?muc=question:${params.get('cau')}` : ''}`} className={buttonClasses({ variant: 'ghost', size: 'sm' })}>
          ← Về trình soạn
        </Link>
        <p className="min-w-0 flex-1 truncate font-medium">
          Xem trước: {exam.data.title}
        </p>
        <StatusBadge status={exam.data.status} />
      </header>
      <main className="mx-auto max-w-[1200px] px-4 py-4">
        <ExamPreview
          exam={exam.data}
          types={types.data ?? []}
          initialQuestionId={params.get('cau')}
          initialMondaiId={params.get('mondai')}
        />
      </main>
    </div>
  );
}
