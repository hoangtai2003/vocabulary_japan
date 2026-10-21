import { Download, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { useExportData } from '@/hooks/queries/useAccount';
import { toast } from '@/stores/toastStore';
import { DeleteAccountModal } from './DeleteAccountModal';

/** Xuất dữ liệu (file JSON từ /me/export) và xóa tài khoản. */
export function DataSection() {
  const exportData = useExportData();
  const [deleteOpen, setDeleteOpen] = useState(false);

  const onExport = () =>
    exportData.mutate(undefined, {
      onSuccess: () => toast.success('Đã tải file dữ liệu về máy.'),
      onError: () => toast.error('Chưa xuất được dữ liệu. Thử lại sau ít phút.'),
    });

  return (
    <div className="flex flex-col divide-y divide-rule">
      <div className="flex flex-col gap-3 pb-5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="font-sans text-base font-semibold">Xuất dữ liệu</h3>
          <p className="text-sm text-ink-muted">
            File JSON gồm hồ sơ, trạng thái từng từ và lịch sử ôn của bạn.
          </p>
        </div>
        <Button
          variant="secondary"
          onClick={onExport}
          loading={exportData.isPending}
          className="self-start sm:self-auto"
        >
          {!exportData.isPending && <Download aria-hidden="true" className="size-4" />}
          {exportData.isPending ? 'Đang chuẩn bị…' : 'Tải file JSON'}
        </Button>
      </div>
      <div className="flex flex-col gap-3 pt-5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="font-sans text-base font-semibold text-son-ink">Xóa tài khoản</h3>
          <p className="text-sm text-ink-muted">
            Xóa vĩnh viễn tài khoản và mọi dữ liệu học. Nên xuất dữ liệu trước.
          </p>
        </div>
        <Button
          variant="danger"
          onClick={() => setDeleteOpen(true)}
          className="self-start sm:self-auto"
        >
          <Trash2 aria-hidden="true" className="size-4" />
          Xóa tài khoản
        </Button>
      </div>
      <DeleteAccountModal open={deleteOpen} onClose={() => setDeleteOpen(false)} />
    </div>
  );
}
