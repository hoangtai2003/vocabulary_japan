import { Trash2 } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { DeleteAccountModal } from './DeleteAccountModal';

/** Xóa tài khoản. (Xuất dữ liệu /me/export tạm hoãn.) */
export function DataSection() {
  const [deleteOpen, setDeleteOpen] = useState(false);

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h3 className="font-sans text-base font-semibold text-son-ink">Xóa tài khoản</h3>
        <p className="text-sm text-ink-muted">Xóa vĩnh viễn tài khoản và mọi dữ liệu học.</p>
      </div>
      <Button
        variant="danger"
        onClick={() => setDeleteOpen(true)}
        className="self-start sm:self-auto"
      >
        <Trash2 aria-hidden="true" className="size-4" />
        Xóa tài khoản
      </Button>
      <DeleteAccountModal open={deleteOpen} onClose={() => setDeleteOpen(false)} />
    </div>
  );
}
