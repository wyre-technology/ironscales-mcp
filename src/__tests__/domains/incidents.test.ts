import { describe, it, expect, beforeEach } from 'vitest';
import { incidentsHandler } from '../../domains/incidents.js';

describe('incidentsHandler', () => {
  beforeEach(() => {
    process.env.IRONSCALES_API_KEY = 'test-api-key';
    process.env.IRONSCALES_COMPANY_ID = 'test-company-id';
  });

  describe('getTools', () => {
    it('returns 2 tools', () => {
      const tools = incidentsHandler.getTools();
      expect(tools).toHaveLength(2);
    });

    it('returns list and get tools', () => {
      const tools = incidentsHandler.getTools();
      const names = tools.map((t) => t.name);
      expect(names).toContain('ironscales_incidents_list');
      expect(names).toContain('ironscales_incidents_get');
    });

    it('get tool requires incident_id', () => {
      const tools = incidentsHandler.getTools();
      const getTool = tools.find((t) => t.name === 'ironscales_incidents_get');
      const schema = getTool?.inputSchema as Record<string, unknown>;
      expect(schema.required).toContain('incident_id');
    });
  });

  describe('handleCall', () => {
    it('lists incidents', async () => {
      const result = await incidentsHandler.handleCall('ironscales_incidents_list', {});
      expect(result.isError).toBeFalsy();
      const data = JSON.parse(result.content[0].text);
      expect(data.incidents).toBeDefined();
      expect(Array.isArray(data.incidents)).toBe(true);
    });

    it('gets an incident by ID', async () => {
      const result = await incidentsHandler.handleCall('ironscales_incidents_get', {
        incident_id: 'inc-001',
      });
      expect(result.isError).toBeFalsy();
      const data = JSON.parse(result.content[0].text);
      expect(data.id).toBe('inc-001');
    });

    it('returns error for unknown tool', async () => {
      const result = await incidentsHandler.handleCall('ironscales_incidents_unknown', {});
      expect(result.isError).toBe(true);
    });
  });
});
