import { PagePlaceholder } from '@/components/layout/PagePlaceholder';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';

// TẠM THỜI: trang đầy đủ được viết ở giai đoạn 4.
export default function WordsPage() {
  useDocumentTitle('Từ vựng');
  return <PagePlaceholder title="Từ vựng" />;
}
