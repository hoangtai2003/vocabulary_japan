import { EmptyState } from '@/components/ui/EmptyState';
import { PageHeader } from './PageHeader';

// TẠM THỜI cho giai đoạn 3: giữ chỗ cho các trang sẽ viết ở giai đoạn 4.
export function PagePlaceholder({ title }: { title: string }) {
  return (
    <>
      <PageHeader title={title} />
      <EmptyState
        mark="準"
        title="Trang đang được chuẩn bị"
        description="Nội dung trang này có ở giai đoạn 4."
      />
    </>
  );
}
