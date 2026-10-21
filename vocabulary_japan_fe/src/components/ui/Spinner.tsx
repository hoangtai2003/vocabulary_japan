import { LoaderCircle } from 'lucide-react';
import { cn } from '@/utils/cn';

/** Vòng xoay nhỏ trong nút đang gửi. Ẩn với trình đọc màn hình; nút đã có aria-busy. */
export function Spinner({ className }: { className?: string }) {
  return <LoaderCircle aria-hidden="true" className={cn('size-4 animate-spin', className)} />;
}
