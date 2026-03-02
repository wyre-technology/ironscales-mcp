import { describe, it, expect, beforeEach } from 'vitest';
import { allowlistHandler } from '../../domains/allowlist.js';

describe('allowlistHandler', () => {
  beforeEach(() => {
    process.env.IRONSCALES_API_KEY = 'test-api-key';
    process.env.IRONSCALES_COMPANY_ID = 'test-company-id';
  });

  describe('getTools', () => {
    it('returns 1 tool', () => {
      const tools = allowlistHandler.getTools();
      expect(tools).toHaveLength(1);
      expect(tools[0].name).toBe('ironscales_allowlist_manage');
    });

    it('operation is required', () => {
      const tools = allowlistHandler.getTools();
      const schema = tools[0].inputSchema as Record<string, unknown>;
      expect(schema.required).toContain('operation');
    });
  });

  describe('handleCall', () => {
    it('lists allowlist entries', async () => {
      const result = await allowlistHandler.handleCall('ironscales_allowlist_manage', {
        operation: 'list',
      });
      expect(result.isError).toBeFalsy();
      const data = JSON.parse(result.content[0].text);
      expect(data.entries).toBeDefined();
    });

    it('adds an entry', async () => {
      const result = await allowlistHandler.handleCall('ironscales_allowlist_manage', {
        operation: 'add',
        entry_type: 'domain',
        value: 'trusted-partner.com',
        reason: 'Known partner',
      });
      expect(result.isError).toBeFalsy();
      const data = JSON.parse(result.content[0].text);
      expect(data.success).toBe(true);
    });

    it('returns error when value missing for add', async () => {
      const result = await allowlistHandler.handleCall('ironscales_allowlist_manage', {
        operation: 'add',
        entry_type: 'domain',
      });
      expect(result.isError).toBe(true);
    });

    it('removes an entry', async () => {
      const result = await allowlistHandler.handleCall('ironscales_allowlist_manage', {
        operation: 'remove',
        entry_type: 'email',
        value: 'newsletter@legit.com',
      });
      expect(result.isError).toBeFalsy();
      const data = JSON.parse(result.content[0].text);
      expect(data.success).toBe(true);
    });
  });
});
