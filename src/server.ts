import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import {
  ListToolsRequestSchema,
  CallToolRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { getState, getNavigationTools, getBackTool, getAllDomains } from './domains/navigation.js';
import { getDomainHandler } from './domains/index.js';
import { getCredentials } from './utils/client.js';
import { logger } from './utils/logger.js';
import type { DomainName } from './utils/types.js';

export function createServer(): Server {
  const server = new Server(
    { name: 'ironscales-mcp', version: '1.0.0' },
    {
      capabilities: {
        tools: {},
        logging: {},
      },
    }
  );

  // Dynamic tool list based on navigation state
  server.setRequestHandler(ListToolsRequestSchema, async (request, extra) => {
    const sessionId = (extra as { sessionId?: string }).sessionId || 'default';
    const state = getState(sessionId);

    if (!state.currentDomain) {
      return { tools: getNavigationTools() };
    }

    const handler = await getDomainHandler(state.currentDomain);
    return { tools: [...handler.getTools(), getBackTool()] };
  });

  // Route tool calls through the decision tree
  server.setRequestHandler(CallToolRequestSchema, async (request, extra) => {
    const { name, arguments: args } = request.params;
    const sessionId = (extra as { sessionId?: string }).sessionId || 'default';
    const state = getState(sessionId);
    const safeArgs = (args ?? {}) as Record<string, unknown>;

    // Navigation: go to domain
    if (name === 'ironscales_navigate') {
      const domain = safeArgs.domain as DomainName;
      state.currentDomain = domain;
      const handler = await getDomainHandler(domain);
      const tools = handler.getTools().map((t) => t.name);

      await server.sendToolListChanged();

      return {
        content: [
          {
            type: 'text' as const,
            text: `Navigated to ${domain}. Available tools: ${tools.join(', ')}`,
          },
        ],
      };
    }

    // Navigation: go back
    if (name === 'ironscales_back') {
      state.currentDomain = null;
      await server.sendToolListChanged();
      return {
        content: [{ type: 'text' as const, text: 'Returned to domain navigation.' }],
      };
    }

    // Status check
    if (name === 'ironscales_status') {
      const creds = getCredentials();
      return {
        content: [
          {
            type: 'text' as const,
            text: JSON.stringify(
              {
                connected: !!creds,
                companyId: creds?.companyId ?? null,
                domains: getAllDomains(),
                currentDomain: state.currentDomain,
              },
              null,
              2
            ),
          },
        ],
      };
    }

    // Domain tool calls
    if (!state.currentDomain) {
      return {
        content: [
          {
            type: 'text' as const,
            text: `Unknown tool: ${name}. Use ironscales_navigate to select a domain first.`,
          },
        ],
        isError: true,
      };
    }

    const handler = await getDomainHandler(state.currentDomain);
    try {
      return await handler.handleCall(name, safeArgs, extra);
    } catch (error) {
      logger.error('Tool call failed', { tool: name, error: (error as Error).message });
      return {
        content: [
          {
            type: 'text' as const,
            text: `Error: ${(error as Error).message}`,
          },
        ],
        isError: true,
      };
    }
  });

  return server;
}
