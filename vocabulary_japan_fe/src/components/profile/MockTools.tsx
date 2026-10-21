import { useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { toast } from '@/stores/toastStore';

/**
 * Nút ẩn chỉ có ở chế độ mock: đưa dữ liệu mock trong localStorage về dữ liệu gốc.
 * Nằm trong <details> đóng sẵn ở cuối trang để không bấm nhầm.
 * Module mock được import động để bản build chế độ real không kéo theo code mock.
 */
export function MockTools() {
  const queryClient = useQueryClient();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [resetting, setResetting] = useState(false);

  const reset = async () => {
    setResetting(true);
    try {
      const { resetMockDb } = await import('@/mock/db');
      resetMockDb();
      // Tải lại mọi dữ liệu, kể cả /auth/me: tài khoản tự tạo không có trong dữ liệu gốc
      // sẽ nhận 401 và được đưa về trang đăng nhập.
      await queryClient.invalidateQueries();
      toast.success('Đã đặt lại dữ liệu mẫu.');
      setConfirmOpen(false);
    } catch {
      toast.error('Chưa đặt lại được dữ liệu mẫu.');
    } finally {
      setResetting(false);
    }
  };

  return (
    <details className="group text-sm text-ink-muted">
      <summary className="cursor-pointer select-none rounded-[var(--radius-control)] py-2 hover:text-ink">
        Công cụ chế độ thử nghiệm
      </summary>
      <div className="mt-2 flex flex-col items-start gap-3 rounded-[var(--radius-card)] border border-dashed border-rule-strong p-4">
        <p>
          App đang chạy bằng dữ liệu giả lưu trong trình duyệt. Đặt lại sẽ xóa mọi thay đổi và tạo
          lại hai tài khoản mẫu với lịch sử học tính theo hôm nay.
        </p>
        <Button variant="secondary" size="sm" onClick={() => setConfirmOpen(true)}>
          Đặt lại dữ liệu mẫu
        </Button>
      </div>
      <Modal
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        title="Đặt lại dữ liệu mẫu?"
        description="Mọi tiến độ, ghi chú, tài khoản tự tạo và từ đã thêm sẽ bị xóa."
        size="sm"
        dismissible={!resetting}
        footer={
          <>
            <Button variant="ghost" onClick={() => setConfirmOpen(false)} disabled={resetting}>
              Hủy
            </Button>
            <Button variant="danger" onClick={() => void reset()} loading={resetting}>
              Đặt lại
            </Button>
          </>
        }
      >
        <p className="text-sm">Dùng khi muốn thử lại từ đầu với dữ liệu mẫu.</p>
      </Modal>
    </details>
  );
}
