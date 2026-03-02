import type { Tool } from '@modelcontextprotocol/sdk/types.js';
import type { DomainHandler, CallToolResult } from '../utils/types.js';
import type { RequestHandlerExtra } from '@modelcontextprotocol/sdk/shared/protocol.js';
import { getClient } from '../utils/client.js';
import { logger } from '../utils/logger.js';

function getTools(): Tool[] {
  return [
    {
      name: 'ironscales_allowlist_manage',
      description:
        'Add or remove entries from the sender allowlist. Allowlisted senders are never flagged as phishing threats. Supports email addresses, domains, and IP addresses.',
      inputSchema: {
        type: 'object' as const,
        properties: {
          operation: {
            type: 'string',
            enum: ['add', 'remove', 'list'],
            description:
              'Operation to perform: add (allowlist an entry), remove (remove from allowlist), list (get current allowlist)',
          },
          entry_type: {
            type: 'string',
            enum: ['email', 'domain', 'ip'],
            description: 'Type of entry to add or remove (required for add/remove operations)',
          },
          value: {
            type: 'string',
            description:
              'The email address, domain, or IP address to add/remove (required for add/remove operations)',
          },
          reason: {
            type: 'string',
            description: 'Reason for adding/removing the entry (optional, for audit purposes)',
          },
        },
        required: ['operation'],
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
    case 'ironscales_allowlist_manage': {
      const operation = args.operation as string;
      const entryType = args.entry_type as string | undefined;
      const value = args.value as string | undefined;
      const reason = args.reason as string | undefined;

      logger.info('API call: allowlist.manage', { operation, entryType, value });

      if (operation === 'list') {
        const result = await client.request<unknown>('/api/v1/allowlist');
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      }

      if (!entryType || !value) {
        return {
          content: [
            {
              type: 'text',
              text: 'entry_type and value are required for add/remove operations.',
            },
          ],
          isError: true,
        };
      }

      const payload: Record<string, unknown> = {
        type: entryType,
        value,
      };
      if (reason) payload.reason = reason;

      const method = operation === 'add' ? 'POST' : 'DELETE';
      const result = await client.request<unknown>('/api/v1/allowlist', {
        method,
        body: JSON.stringify(payload),
      });

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(result, null, 2),
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

export const allowlistHandler: DomainHandler = { getTools, handleCall };
