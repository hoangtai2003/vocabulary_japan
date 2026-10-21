import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { describe, expect, it } from 'vitest';
import { Button } from './Button';
import { Modal } from './Modal';

function Harness() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button onClick={() => setOpen(true)}>Mở</Button>
      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="Xóa từ"
        footer={<Button>Xác nhận</Button>}
      >
        <input aria-label="Ô nhập" />
      </Modal>
    </>
  );
}

describe('Modal', () => {
  it('focus vào trong, Tab xoay vòng bên trong, Esc đóng và trả focus', async () => {
    const user = userEvent.setup();
    render(<Harness />);
    const opener = screen.getByRole('button', { name: 'Mở' });
    await user.click(opener);

    const dialog = screen.getByRole('dialog', { name: 'Xóa từ' });
    expect(dialog).toHaveAttribute('aria-modal', 'true');
    expect(screen.getByRole('button', { name: 'Đóng' })).toHaveFocus();

    await user.tab();
    expect(screen.getByLabelText('Ô nhập')).toHaveFocus();
    await user.tab();
    expect(screen.getByRole('button', { name: 'Xác nhận' })).toHaveFocus();
    await user.tab();
    expect(screen.getByRole('button', { name: 'Đóng' })).toHaveFocus();
    await user.tab({ shift: true });
    expect(screen.getByRole('button', { name: 'Xác nhận' })).toHaveFocus();

    await user.keyboard('{Escape}');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(opener).toHaveFocus();
  });
});
