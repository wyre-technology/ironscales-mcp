import { beforeAll, afterAll, afterEach } from 'vitest';
import { server } from './mocks/server.js';

beforeAll(() => server.listen({ onUnhandledRequest: 'warn' }));
afterEach(() => {
  server.resetHandlers();
  // Reset env vars between tests
  delete process.env.IRONSCALES_API_KEY;
  delete process.env.IRONSCALES_COMPANY_ID;
});
afterAll(() => server.close());
