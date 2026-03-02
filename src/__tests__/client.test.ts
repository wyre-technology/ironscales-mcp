import { describe, it, expect, beforeEach } from 'vitest';
import { getCredentials, getClient } from '../utils/client.js';

describe('client', () => {
  beforeEach(() => {
    process.env.IRONSCALES_API_KEY = 'test-api-key';
    process.env.IRONSCALES_COMPANY_ID = 'test-company-id';
  });

  it('getCredentials returns null when env vars missing', () => {
    delete process.env.IRONSCALES_API_KEY;
    delete process.env.IRONSCALES_COMPANY_ID;
    expect(getCredentials()).toBeNull();
  });

  it('getCredentials returns null when only API key is set', () => {
    process.env.IRONSCALES_API_KEY = 'key';
    delete process.env.IRONSCALES_COMPANY_ID;
    expect(getCredentials()).toBeNull();
  });

  it('getCredentials returns credentials when both env vars are set', () => {
    const creds = getCredentials();
    expect(creds).not.toBeNull();
    expect(creds?.apiKey).toBe('test-api-key');
    expect(creds?.companyId).toBe('test-company-id');
  });

  it('getClient throws when credentials are missing', async () => {
    delete process.env.IRONSCALES_API_KEY;
    delete process.env.IRONSCALES_COMPANY_ID;
    await expect(getClient()).rejects.toThrow('Ironscales credentials not configured');
  });

  it('getClient returns a client when credentials are present', async () => {
    const client = await getClient();
    expect(client).toBeDefined();
    expect(typeof client.request).toBe('function');
  });
});
