import { describe, it, expect } from 'vitest';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { createServer } from '../server.js';
import {
  runWithCredentials,
  getCredentials,
  type IronscalesCredentials,
} from '../utils/client.js';

describe('credential isolation', () => {
  it('createServer() returns distinct Server instances each call', () => {
    const s1 = createServer();
    const s2 = createServer();
    expect(s1).not.toBe(s2);
  });

  it('stateless transport has sessionIdGenerator undefined', () => {
    const transport = new StreamableHTTPServerTransport({
      sessionIdGenerator: undefined,
      enableJsonResponse: true,
    });
    // sessionId should be undefined (no session assigned)
    expect(transport.sessionId).toBeUndefined();
  });

  it('runWithCredentials isolates both fields across concurrent requests', async () => {
    const results: Array<{ apiKey: string; companyId: string }> = [];

    await Promise.all([
      runWithCredentials({ apiKey: 'key-tenant-A', companyId: 'company-A' }, async () => {
        await new Promise(r => setTimeout(r, 10)); // simulate async work
        const creds = getCredentials();
        results.push({ apiKey: creds!.apiKey, companyId: creds!.companyId });
      }),
      runWithCredentials({ apiKey: 'key-tenant-B', companyId: 'company-B' }, async () => {
        const creds = getCredentials();
        results.push({ apiKey: creds!.apiKey, companyId: creds!.companyId });
      }),
    ]);

    // Both tenants' credentials were independently captured
    expect(results).toHaveLength(2);
    const tenantA = results.find(r => r.apiKey === 'key-tenant-A');
    const tenantB = results.find(r => r.apiKey === 'key-tenant-B');
    expect(tenantA).toEqual({ apiKey: 'key-tenant-A', companyId: 'company-A' });
    expect(tenantB).toEqual({ apiKey: 'key-tenant-B', companyId: 'company-B' });
  });

  it('runWithCredentials does not mutate process.env', () => {
    const before = {
      key: process.env.IRONSCALES_API_KEY,
      company: process.env.IRONSCALES_COMPANY_ID,
    };

    runWithCredentials({ apiKey: 'injected-key', companyId: 'injected-company' }, () => {});

    expect(process.env.IRONSCALES_API_KEY).toBe(before.key);
    expect(process.env.IRONSCALES_COMPANY_ID).toBe(before.company);
  });

  it('getCredentials falls back to env vars outside ALS context', () => {
    process.env.IRONSCALES_API_KEY = 'env-key';
    process.env.IRONSCALES_COMPANY_ID = 'env-company';

    const creds = getCredentials();
    expect(creds).toEqual({ apiKey: 'env-key', companyId: 'env-company' });
  });

  it('getCredentials returns ALS value when inside runWithCredentials', () => {
    process.env.IRONSCALES_API_KEY = 'env-key';
    process.env.IRONSCALES_COMPANY_ID = 'env-company';

    let captured: IronscalesCredentials | null = null;
    runWithCredentials({ apiKey: 'als-key', companyId: 'als-company' }, () => {
      captured = getCredentials();
    });

    expect(captured).toEqual({ apiKey: 'als-key', companyId: 'als-company' });
  });
});
