import { describe, it, expect, beforeEach } from 'vitest';
import { getState, getNavigationTools, getBackTool, getAllDomains } from '../domains/navigation.js';

describe('navigation', () => {
  const sessionId = 'test-session';

  beforeEach(() => {
    // Reset navigation state
    const state = getState(sessionId);
    state.currentDomain = null;
  });

  it('returns navigation tools when no domain is selected', () => {
    const tools = getNavigationTools();
    expect(tools).toHaveLength(2);
    expect(tools[0].name).toBe('ironscales_navigate');
    expect(tools[1].name).toBe('ironscales_status');
  });

  it('navigate tool has all domains in enum', () => {
    const tools = getNavigationTools();
    const navigateTool = tools.find((t) => t.name === 'ironscales_navigate');
    const domainEnum = (navigateTool?.inputSchema as Record<string, unknown>)?.properties as Record<string, unknown>;
    const domainProp = domainEnum?.domain as Record<string, unknown>;
    expect(domainProp?.enum).toEqual(expect.arrayContaining(['incidents', 'email', 'remediation', 'stats', 'allowlist']));
  });

  it('getBackTool returns correct tool', () => {
    const backTool = getBackTool();
    expect(backTool.name).toBe('ironscales_back');
  });

  it('getAllDomains returns all 5 domains', () => {
    const domains = getAllDomains();
    expect(domains).toHaveLength(5);
    expect(domains).toContain('incidents');
    expect(domains).toContain('email');
    expect(domains).toContain('remediation');
    expect(domains).toContain('stats');
    expect(domains).toContain('allowlist');
  });

  it('state can be set and retrieved per session', () => {
    const state = getState(sessionId);
    expect(state.currentDomain).toBeNull();

    state.currentDomain = 'incidents';

    const retrieved = getState(sessionId);
    expect(retrieved.currentDomain).toBe('incidents');
  });

  it('different sessions have independent state', () => {
    const state1 = getState('session-a');
    const state2 = getState('session-b');

    state1.currentDomain = 'incidents';
    state2.currentDomain = 'email';

    expect(getState('session-a').currentDomain).toBe('incidents');
    expect(getState('session-b').currentDomain).toBe('email');
  });
});
