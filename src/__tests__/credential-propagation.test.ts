import { describe, it, expect, beforeEach } from 'vitest';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';
import { createServer } from '../server.js';
import { runWithCredentials } from '../utils/client.js';

/**
 * Drive one tools/call for ironscales_status through a real MCP server inside
 * a runWithCredentials scope and resolve with the parsed JSON payload the tool
 * returns.  The handler calls getCredentials(), which reads from AsyncLocalStorage,
 * so the returned companyId must match the one injected into the ALS scope.
 */
async function callStatusWithCreds(apiKey: string, companyId: string): Promise<{
  connected: boolean;
  companyId: string | null;
  domains: string[];
  currentDomain: string | null;
}> {
  return runWithCredentials({ apiKey, companyId }, async () => {
    const server = createServer();
    const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();

    await server.connect(serverTransport);

    const client = new Client(
      { name: 'test-client', version: '1.0.0' },
      { capabilities: {} }
    );
    await client.connect(clientTransport);

    const result = await client.callTool({ name: 'ironscales_status', arguments: {} });

    await client.close();
    await server.close();

    // The tool returns content[0].text as a JSON string
    const content = result.content as Array<{ type: string; text: string }>;
    return JSON.parse(content[0].text);
  });
}

describe('credential propagation through transport', () => {
  beforeEach(() => {
    delete process.env.IRONSCALES_API_KEY;
    delete process.env.IRONSCALES_COMPANY_ID;
  });

  it('tool handler observes the request-scoped companyId', async () => {
    const status = await callStatusWithCreds('key-A', 'company-A');
    expect(status.companyId).toBe('company-A');
    expect(status.connected).toBe(true);
  });

  it('concurrent requests do not bleed credentials across tenants', async () => {
    const [a, b] = await Promise.all([
      callStatusWithCreds('key-A', 'company-A'),
      callStatusWithCreds('key-B', 'company-B'),
    ]);
    expect(a.companyId).toBe('company-A');
    expect(b.companyId).toBe('company-B');
  });
});
