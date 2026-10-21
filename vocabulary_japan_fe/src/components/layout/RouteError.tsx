import { isRouteErrorResponse, Link, useRouteError } from 'react-router-dom';
import { buttonClasses } from '@/components/ui/buttonStyles';
import { Button } from '@/components/ui/Button';
import { GenkoMark } from '@/components/ui/GenkoMark';

/** errorElement của router: lỗi khi tải mã trang (mất mạng, bản deploy mới) hoặc lỗi render. */
export function RouteError() {
  const error = useRouteError();
  if (import.meta.env.DEV) console.error(error);
  const status = isRouteErrorResponse(error) ? error.status : null;

  return (
    <div
      role="alert"
      className="mx-auto flex min-h-dvh max-w-md flex-col items-center justify-center gap-5 px-4 text-center"
    >
      <GenkoMark char="誤" />
      <div>
        <h1 className="text-2xl">Trang này gặp lỗi</h1>
        <p className="mt-2 text-ink-muted">
          {status ? `Mã lỗi ${status}. ` : ''}Tải lại trang thường sẽ khắc phục được. Tiến độ học
          của bạn không bị mất.
        </p>
      </div>
      <div className="flex gap-2">
        <Button onClick={() => window.location.reload()}>Tải lại trang</Button>
        <Link to="/" className={buttonClasses({ variant: 'secondary' })}>
          Về Hôm nay
        </Link>
      </div>
    </div>
  );
}
