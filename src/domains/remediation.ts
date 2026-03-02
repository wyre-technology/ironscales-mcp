import type { Tool } from '@modelcontextprotocol/sdk/types.js';
import type { DomainHandler, CallToolResult } from '../utils/types.js';
import type { RequestHandlerExtra } from '@modelcontextprotocol/sdk/shared/protocol.js';
import { getClient } from '../utils/client.js';
import { logger } from '../utils/logger.js';

function getTools(): Tool[] {
  return [
    {
      name: 'ironscales_remediation_act',
      description:
        'Take a remediation action on a phishing incident. Actions include quarantining emails, blocking senders, deleting messages from all mailboxes, or marking as false positive.',
      inputSchema: {
        type: 'object' as const,
        properties: {
          incident_id: {
            type: 'string',
            description: 'The incident ID to remediate',
          },
          action: {
            type: 'string',
            enum: ['quarantine', 'delete', 'block_sender', 'mark_false_positive', 'report_to_microsoft'],
            description:
              'Remediation action to take: quarantine (move to quarantine folder), delete (permanently remove from all mailboxes), block_sender (add sender to blocklist), mark_false_positive (mark as legitimate and restore), report_to_microsoft (submit to Microsoft for analysis)',
          },
          reason: {
            type: 'string',
            description: 'Optional reason or notes for the remediation action',
          },
          notify_users: {
            type: 'boolean',
            description: 'Whether to notify affected users about the remediation (default: false)',
          },
        },
        required: ['incident_id', 'action'],
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
    case 'ironscales_remediation_act': {
      const incidentId = args.incident_id as string;
      const action = args.action as string;
      const reason = args.reason as string | undefined;
      const notifyUsers = (args.notify_users as boolean) ?? false;

      logger.info('API call: remediation.act', { incidentId, action });

      const payload: Record<string, unknown> = {
        action,
        notify_users: notifyUsers,
      };
      if (reason) payload.reason = reason;

      const result = await client.request<unknown>(
        `/api/v1/incidents/${encodeURIComponent(incidentId)}/remediate`,
        {
          method: 'POST',
          body: JSON.stringify(payload),
        }
      );

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

export const remediationHandler: DomainHandler = { getTools, handleCall };
