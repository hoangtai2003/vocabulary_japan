import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { isMockMode } from './api/env';
import App from './App';
import './index.css';

/** Chỉ khởi động MSW khi VITE_API_MODE=mock; ở chế độ real, code mock không được tải. */
async function enableMocking(): Promise<void> {
  if (!isMockMode) return;
  const { worker } = await import('./mock/browser');
  await worker.start({ onUnhandledRequest: 'bypass', quiet: true });
}

const rootElement = document.getElementById('root');
if (!rootElement) throw new Error('Không tìm thấy phần tử #root');

void enableMocking().then(() => {
  createRoot(rootElement).render(
    <StrictMode>
      <App />
    </StrictMode>,
  );
});
