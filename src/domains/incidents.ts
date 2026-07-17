import type { Tool } from '@modelcontextprotocol/sdk/types.js';
import type { DomainHandler, CallToolResult } from '../utils/types.js';
import type { RequestHandlerExtra } from '@modelcontextprotocol/sdk/shared/protocol.js';
import { getClient } from '../utils/client.js';
import { logger } from '../utils/logger.js';
import { buildIncidentCard, INCIDENT_CARD_META } from '../card.builder.js';

function getTools(): Tool[] {
  return [
    {
      name: 'ironscales_incidents_list',
      description:
        'List phishing incidents. Returns a paginated list of incidents with their status, severity, and summary information.',
      inputSchema: {
        type: 'object' as const,
        properties: {
          status: {
            type: 'string',
            enum: ['open', 'closed', 'in_progress', 'pending'],
            description: 'Filter incidents by status (optional)',
          },
          severity: {
            type: 'string',
            enum: ['low', 'medium', 'high', 'critical'],
            description: 'Filter incidents by severity (optional)',
          },
          limit: {
            type: 'number',
            description: 'Maximum number of incidents to return (default: 50, max: 100)',
          },
          offset: {
            type: 'number',
            description: 'Pagination offset (default: 0)',
          },
        },
      },
    },
    {
      name: 'ironscales_incidents_get',
      description:
        'Get detailed information about a specific phishing incident by its ID, including affected recipients, email headers, threat indicators, and timeline.',
      _meta: INCIDENT_CARD_META,
      inputSchema: {
        type: 'object' as const,
        properties: {
          incident_id: {
            type: 'string',
            description: 'The unique incident ID',
          },
        },
        required: ['incident_id'],
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
    case 'ironscales_incidents_list': {
      const limit = (args.limit as number) || 50;
      const offset = (args.offset as number) || 0;
      const status = args.status as string | undefined;
      const severity = args.severity as string | undefined;

      logger.info('API call: incidents.list', { limit, offset, status, severity });

      const params = new URLSearchParams();
      params.set('limit', String(limit));
      params.set('offset', String(offset));
      if (status) params.set('status', status);
      if (severity) params.set('severity', severity);

      const response = await client.request<unknown>(`/api/v1/incidents?${params.toString()}`);
      const incidents = Array.isArray(response)
        ? response
        : ((response as Record<string, unknown>)?.incidents ?? response);

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({ incidents, offset, limit }, null, 2),
          },
        ],
      };
    }

    case 'ironscales_incidents_get': {
      const incidentId = args.incident_id as string;
      logger.info('API call: incidents.get', { incidentId });

      const incident = await client.request<unknown>(`/api/v1/incidents/${encodeURIComponent(incidentId)}`);

      // MCP Apps: attach the normalized card payload the ui:// incident card
      // renders from. Best-effort — any failure just means no UI surface and
      // the model-visible payload is served unchanged.
      let payload: unknown = incident;
      try {
        if (incident && typeof incident === 'object' && !Array.isArray(incident)) {
          const card = buildIncidentCard(incident as Record<string, unknown>);
          if (card) payload = { ...(incident as Record<string, unknown>), _card: card };
        }
      } catch {
        payload = incident;
      }

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(payload, null, 2),
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

export const incidentsHandler: DomainHandler = { getTools, handleCall };
