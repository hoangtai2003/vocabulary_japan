import { PagePlaceholder } from '@/components/layout/PagePlaceholder';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';

// TẠM THỜI: trang đầy đủ được viết ở giai đoạn 4.
export default function ProfilePage() {
  useDocumentTitle('Hồ sơ');
  return <PagePlaceholder title="Hồ sơ" />;
}
