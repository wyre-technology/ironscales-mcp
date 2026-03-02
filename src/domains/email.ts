import type { Tool } from '@modelcontextprotocol/sdk/types.js';
import type { DomainHandler, CallToolResult } from '../utils/types.js';
import type { RequestHandlerExtra } from '@modelcontextprotocol/sdk/shared/protocol.js';
import { getClient } from '../utils/client.js';
import { logger } from '../utils/logger.js';

function getTools(): Tool[] {
  return [
    {
      name: 'ironscales_email_classify',
      description:
        'Classify an email as phishing, spam, or legitimate using Ironscales AI analysis. Provide raw email headers and/or body content for analysis.',
      inputSchema: {
        type: 'object' as const,
        properties: {
          subject: {
            type: 'string',
            description: 'Email subject line',
          },
          sender: {
            type: 'string',
            description: 'Sender email address',
          },
          sender_display_name: {
            type: 'string',
            description: 'Display name shown in the From field',
          },
          reply_to: {
            type: 'string',
            description: 'Reply-To email address if different from sender',
          },
          body_text: {
            type: 'string',
            description: 'Plain text body of the email',
          },
          body_html: {
            type: 'string',
            description: 'HTML body of the email',
          },
          headers: {
            type: 'object',
            description: 'Additional email headers as key-value pairs',
          },
          urls: {
            type: 'array',
            items: { type: 'string' },
            description: 'URLs found in the email body',
          },
          attachments: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                filename: { type: 'string' },
                content_type: { type: 'string' },
                size_bytes: { type: 'number' },
              },
            },
            description: 'List of attachment metadata (do not include file contents)',
          },
        },
        required: ['sender'],
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
    case 'ironscales_email_classify': {
      logger.info('API call: email.classify', {
        sender: args.sender,
        subject: args.subject,
      });

      const payload: Record<string, unknown> = {
        sender: args.sender,
      };

      if (args.subject) payload.subject = args.subject;
      if (args.sender_display_name) payload.sender_display_name = args.sender_display_name;
      if (args.reply_to) payload.reply_to = args.reply_to;
      if (args.body_text) payload.body_text = args.body_text;
      if (args.body_html) payload.body_html = args.body_html;
      if (args.headers) payload.headers = args.headers;
      if (args.urls) payload.urls = args.urls;
      if (args.attachments) payload.attachments = args.attachments;

      const result = await client.request<unknown>('/api/v1/email/classify', {
        method: 'POST',
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

export const emailHandler: DomainHandler = { getTools, handleCall };
