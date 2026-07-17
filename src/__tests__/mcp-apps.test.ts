/**
 * MCP Apps (SEP-1865) contract tests — mirrors the checks an MCP Apps host
 * performs to render the incident card:
 *   1. the renderable tool advertises the UI resource via _meta
 *   2. the ui:// resource lists and reads back as profile=mcp-app HTML
 *   3. buildIncidentCard normalizes an Ironscales incident into the card
 *      payload the iframe renders from, best-effort and read-only
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { http, HttpResponse } from 'msw';
import type { Tool } from '@modelcontextprotocol/sdk/types.js';
import { getNavigationTools, getBackTool, getAllDomains } from '../domains/navigation.js';
import { getDomainHandler } from '../domains/index.js';
import { incidentsHandler } from '../domains/incidents.js';
import { listResources, readResource } from '../resources.js';
import {
  buildIncidentCard,
  applyBrandInjection,
  INCIDENT_CARD_RESOURCE_URI,
  MCP_APP_RESOURCE_MIME,
} from '../card.builder.js';
import { INCIDENT_CARD_HTML } from '../generated/incident-card-html.js';
import { server } from './mocks/server.js';

const RENDERABLE_TOOLS = ['ironscales_incidents_get'];

async function getAllTools(): Promise<Tool[]> {
  const tools: Tool[] = [...getNavigationTools(), getBackTool()];
  for (const domain of getAllDomains()) {
    const handler = await getDomainHandler(domain);
    tools.push(...handler.getTools());
  }
  return tools;
}

describe('MCP Apps incident card', () => {
  describe('tool _meta advertisement', () => {
    it.each(RENDERABLE_TOOLS)('%s links the card via _meta', async (name) => {
      const tool = (await getAllTools()).find((t) => t.name === name);
      expect(tool).toBeDefined();
      // Canonical flat key (ext-apps RESOURCE_URI_META_KEY) …
      expect(tool?._meta?.['ui/resourceUri']).toBe(INCIDENT_CARD_RESOURCE_URI);
      // … and the nested form registerAppTool also emits.
      expect((tool?._meta?.ui as { resourceUri?: string })?.resourceUri).toBe(
        INCIDENT_CARD_RESOURCE_URI
      );
    });

    it('no other tools carry UI metadata', async () => {
      const others = (await getAllTools()).filter(
        (t) => t._meta && !RENDERABLE_TOOLS.includes(t.name)
      );
      expect(others).toEqual([]);
    });
  });

  describe('ui:// resource', () => {
    it('is listed with the MCP Apps MIME type', () => {
      const card = listResources().find((r) => r.uri === INCIDENT_CARD_RESOURCE_URI);
      expect(card?.mimeType).toBe(MCP_APP_RESOURCE_MIME);
    });

    it('reads back as profile=mcp-app HTML containing the card app', () => {
      const content = readResource(INCIDENT_CARD_RESOURCE_URI);
      expect(content.mimeType).toBe(MCP_APP_RESOURCE_MIME);
      // No MCP_BRAND_* env set → the embedded HTML is served byte-identical.
      expect(content.text).toBe(INCIDENT_CARD_HTML);
      expect(content.text).toContain('card__bar');
      // The injection marker survives the vite build, exactly once.
      expect(content.text.split('BRAND_INJECT')).toHaveLength(2);
      // The vite build must have inlined the bridge script — a bare <script src>
      // would be unloadable from a resources/read HTML string.
      expect(content.text).not.toContain('src="./incident-card.ts"');
    });

    it('serves neutral defaults with no vendor identity', () => {
      const { text } = readResource(INCIDENT_CARD_RESOURCE_URI);
      expect(text).not.toMatch(/WYRE/i);
      expect(text).not.toContain('00c9db'); // WYRE cyan
      expect(text).not.toContain('ede947'); // WYRE yellow
      expect(text).not.toContain('fonts.googleapis.com'); // no external fetches
    });

    it('injects MCP_BRAND_* env vars into the served HTML', () => {
      vi.stubEnv('MCP_BRAND_NAME', 'Acme MSP');
      vi.stubEnv('MCP_BRAND_PRIMARY_COLOR', '#ff0000');
      try {
        const { text } = readResource(INCIDENT_CARD_RESOURCE_URI);
        expect(text).toContain(
          '<script>window.__BRAND__={"name":"Acme MSP","primaryColor":"#ff0000"}</script>'
        );
        expect(text).not.toContain('BRAND_INJECT');
      } finally {
        vi.unstubAllEnvs();
      }
    });

    it('rejects unknown resource URIs', () => {
      expect(() => readResource('ui://ironscales/nope.html')).toThrow(/Unknown resource/);
    });
  });

  describe('applyBrandInjection', () => {
    const html = INCIDENT_CARD_HTML;

    it('replaces the marker with an inline window.__BRAND__ script', () => {
      const out = applyBrandInjection(html, { name: 'Acme', primaryColor: '#123456' });
      expect(out).toContain('window.__BRAND__={"name":"Acme","primaryColor":"#123456"}');
      expect(out).not.toContain('BRAND_INJECT');
    });

    it('escapes < so brand values cannot break out of the script tag', () => {
      const out = applyBrandInjection(html, { name: '</script><script>alert(1)' });
      expect(out).not.toContain('</script><script>alert(1)');
      expect(out).toContain('\\u003c/script>\\u003cscript>alert(1)');
    });

    it('returns the HTML unchanged for an empty brand', () => {
      expect(applyBrandInjection(html, {})).toBe(html);
      expect(applyBrandInjection(html, { name: '' })).toBe(html);
    });
  });

  describe('buildIncidentCard', () => {
    const incident = {
      id: 'inc-001',
      status: 'open',
      severity: 'high',
      subject: 'Urgent: Verify your account',
      sender: 'attacker@evil.com',
      recipient_count: 5,
      recipients: ['user1@company.com', 'user2@company.com'],
      created_at: '2026-03-01T10:00:00Z',
      threat_indicators: ['suspicious_link', 'domain_spoofing'],
    };

    it('normalizes the incident into the card payload', () => {
      expect(buildIncidentCard(incident)).toEqual({
        id: 'inc-001',
        subject: 'Urgent: Verify your account',
        status: 'open',
        severity: 'high',
        sender: 'attacker@evil.com',
        recipientCount: 5,
        recipients: ['user1@company.com', 'user2@company.com'],
        threatIndicators: ['suspicious_link', 'domain_spoofing'],
        createdAt: '2026-03-01T10:00:00Z',
      });
    });

    it('coerces numeric ids and tolerates missing optional fields', () => {
      const card = buildIncidentCard({ id: 42, subject: 'Spearphish' });
      expect(card).toEqual({
        id: '42',
        subject: 'Spearphish',
        recipients: [],
        threatIndicators: [],
      });
    });

    it('caps list sizes and text length so the card payload stays small', () => {
      const card = buildIncidentCard({
        id: 'inc-002',
        subject: 'x'.repeat(600),
        recipients: Array.from({ length: 20 }, (_, i) => `user${i}@company.com`),
        threat_indicators: Array.from({ length: 30 }, (_, i) => `indicator_${i}`),
      });
      expect(card?.subject).toHaveLength(300);
      expect(card?.recipients).toHaveLength(5);
      expect(card?.threatIndicators).toHaveLength(10);
      // recipient_count missing → falls back to the rendered recipient count.
      expect(card?.recipientCount).toBe(5);
    });

    it('drops malformed list entries instead of failing', () => {
      const card = buildIncidentCard({
        id: 'inc-003',
        subject: 'Mixed payload',
        recipients: ['ok@company.com', 42, null, ''],
        threat_indicators: 'not-an-array',
      });
      expect(card?.recipients).toEqual(['ok@company.com']);
      expect(card?.threatIndicators).toEqual([]);
    });

    it('returns null for payloads that are not an incident', () => {
      expect(buildIncidentCard({ id: 'inc-004' })).toBeNull();
      expect(buildIncidentCard({ subject: 'no id' })).toBeNull();
      expect(buildIncidentCard({})).toBeNull();
    });
  });

  describe('ironscales_incidents_get integration', () => {
    beforeEach(() => {
      process.env.IRONSCALES_API_KEY = 'test-api-key';
      process.env.IRONSCALES_COMPANY_ID = 'test-company-id';
    });

    it('attaches _card without changing the incident payload', async () => {
      const result = await incidentsHandler.handleCall('ironscales_incidents_get', {
        incident_id: 'inc-001',
      });
      expect(result.isError).toBeFalsy();
      const data = JSON.parse(result.content[0].text);
      // Model-visible payload unchanged …
      expect(data.id).toBe('inc-001');
      expect(data.subject).toBe('Urgent: Verify your account');
      expect(data.recipients).toHaveLength(2);
      // … plus the additive normalized card.
      expect(data._card).toMatchObject({
        id: 'inc-001',
        subject: 'Urgent: Verify your account',
        status: 'open',
        severity: 'high',
      });
    });

    it('serves the tool result card-less when the payload is not card-worthy', async () => {
      server.use(
        http.get('https://appapi.ironscales.com/api/v1/incidents/:id', () =>
          HttpResponse.json({ id: 'inc-005' }) // no subject → no card
        )
      );
      const result = await incidentsHandler.handleCall('ironscales_incidents_get', {
        incident_id: 'inc-005',
      });
      expect(result.isError).toBeFalsy();
      const data = JSON.parse(result.content[0].text);
      expect(data.id).toBe('inc-005');
      expect(data._card).toBeUndefined();
    });
  });
});
