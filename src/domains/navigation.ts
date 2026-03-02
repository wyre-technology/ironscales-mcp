import type { Tool } from '@modelcontextprotocol/sdk/types.js';
import type { DomainName, NavigationState } from '../utils/types.js';

const sessionStates = new Map<string, NavigationState>();

export function getState(sessionId: string = 'default'): NavigationState {
  if (!sessionStates.has(sessionId)) {
    sessionStates.set(sessionId, { currentDomain: null });
  }
  return sessionStates.get(sessionId)!;
}

export function getNavigationTools(): Tool[] {
  return [
    {
      name: 'ironscales_navigate',
      description:
        'Navigate to a domain to see its available tools. Domains: incidents (phishing incidents), email (email classification), remediation (incident remediation), stats (company statistics), allowlist (sender allowlist management).',
      inputSchema: {
        type: 'object' as const,
        properties: {
          domain: {
            type: 'string',
            enum: ['incidents', 'email', 'remediation', 'stats', 'allowlist'] as string[],
            description: 'The domain to navigate to',
          },
        },
        required: ['domain'],
      },
    },
    {
      name: 'ironscales_status',
      description: 'Check Ironscales API connection status and available domains.',
      inputSchema: {
        type: 'object' as const,
        properties: {},
      },
    },
  ];
}

export function getBackTool(): Tool {
  return {
    name: 'ironscales_back',
    description: 'Return to the domain navigation menu.',
    inputSchema: {
      type: 'object' as const,
      properties: {},
    },
  };
}

export function getAllDomains(): DomainName[] {
  return ['incidents', 'email', 'remediation', 'stats', 'allowlist'];
}
