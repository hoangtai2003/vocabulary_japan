import { setupServer } from 'msw/node';
import { handlers } from './handlers';

/** MSW cho môi trường Node (Vitest). */
export const server = setupServer(...handlers);
