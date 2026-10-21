import { PagePlaceholder } from '@/components/layout/PagePlaceholder';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';

// TẠM THỜI: trang đầy đủ được viết ở giai đoạn 4.
export default function AdminPage() {
  useDocumentTitle('Quản trị');
  return <PagePlaceholder title="Quản trị" />;
}
