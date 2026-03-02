import type { Tool } from '@modelcontextprotocol/sdk/types.js';
import type { DomainHandler, CallToolResult } from '../utils/types.js';
import type { RequestHandlerExtra } from '@modelcontextprotocol/sdk/shared/protocol.js';
import { getClient } from '../utils/client.js';
import { logger } from '../utils/logger.js';

function getTools(): Tool[] {
  return [
    {
      name: 'ironscales_stats_company',
      description:
        'Get dashboard statistics for the company, including incident counts, threat trends, top targeted users, most common attack types, and remediation summary over a time period.',
      inputSchema: {
        type: 'object' as const,
        properties: {
          period: {
            type: 'string',
            enum: ['7d', '30d', '90d', '1y'],
            description: 'Time period for statistics (default: 30d)',
          },
        },
      },
    },
  ];
}

async function handleCall(
  toolName: string,
  args: Record<string, unknown>,
  _extra?: RequestHandlerExtra
): Promise<CallToolResult> {
  const client = await getClient();

  switch (toolName) {
    case 'ironscales_stats_company': {
      const period = (args.period as string) || '30d';
      logger.info('API call: stats.company', { period });

      const stats = await client.request<unknown>(
        `/api/v1/company/stats?period=${encodeURIComponent(period)}`
      );

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(stats, null, 2),
          },
        ],
      };
    }

    default:
      return {
        content: [{ type: 'text', text: `Unknown tool: ${toolName}` }],
        isError: true,
      };
  }
}

export const statsHandler: DomainHandler = { getTools, handleCall };
