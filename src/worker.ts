import { WebStandardStreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js';
import { createServer } from './server.js';
import { runWithCredentials } from './utils/client.js';

interface Env {
  IRONSCALES_API_KEY: string;
  IRONSCALES_COMPANY_ID: string;
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname === '/health') {
      return new Response(
        JSON.stringify({
          status: 'ok',
          transport: 'cloudflare-worker',
          timestamp: new Date().toISOString(),
        }),
        { headers: { 'Content-Type': 'application/json' } }
      );
    }

    if (url.pathname !== '/mcp') {
      return new Response(JSON.stringify({ error: 'Not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Run the request inside a request-scoped credential context — no
    // process.env mutation. Cloudflare secrets are read from `env` per request.
    return runWithCredentials(
      { apiKey: env.IRONSCALES_API_KEY, companyId: env.IRONSCALES_COMPANY_ID },
      async () => {
        const transport = new WebStandardStreamableHTTPServerTransport({
          sessionIdGenerator: undefined,
        });
        const server = createServer();
        await server.connect(transport);
        return transport.handleRequest(request);
      }
    );
  },
} satisfies ExportedHandler<Env>;
