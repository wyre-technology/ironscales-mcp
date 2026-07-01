import { createServer as createHttpServer } from 'node:http';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { createServer } from './server.js';
import { getCredentials, runWithCredentials } from './utils/client.js';
import { logger } from './utils/logger.js';

function startHttpServer(): void {
  const port = parseInt(process.env.MCP_HTTP_PORT || '8080', 10);
  const host = process.env.MCP_HTTP_HOST || '0.0.0.0';
  const isGatewayMode = process.env.AUTH_MODE === 'gateway';

  const httpServer = createHttpServer(async (req, res) => {
    const url = new URL(req.url || '/', `http://${req.headers.host || 'localhost'}`);

    // Health check — shallow, unauthenticated, no upstream/credential checks.
    // Must always return 200 so the ACA liveness probe does not kill the
    // container in gateway mode (credentials are injected per-request, not
    // at startup).
    if (req.method === 'GET' && (url.pathname === '/health' || url.pathname === '/healthz')) {
      const creds = getCredentials();
      res.writeHead(creds ? 200 : 200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ status: 'ok' }));
      return;
    }

    if (url.pathname !== '/mcp') {
      res.writeHead(404, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Not found', endpoints: ['/mcp', '/health', '/healthz'] }));
      return;
    }

    // Gateway mode: extract credentials from injected headers
    if (isGatewayMode) {
      const apiKey = req.headers['x-ironscales-api-key'] as string | undefined;
      const companyId = req.headers['x-ironscales-company-id'] as string | undefined;

      if (!apiKey || !companyId) {
        res.writeHead(401, { 'Content-Type': 'application/json' });
        res.end(
          JSON.stringify({
            error: 'Missing credentials. Gateway must inject X-Ironscales-API-Key and X-Ironscales-Company-ID headers.',
          })
        );
        return;
      }

      const handle = async () => {
        const server = createServer();
        const transport = new StreamableHTTPServerTransport({
          sessionIdGenerator: undefined,
          enableJsonResponse: true,
        });
        res.on('close', () => { transport.close(); server.close(); });
        await server.connect(transport);
        await transport.handleRequest(req, res);
      };

      await runWithCredentials({ apiKey, companyId }, handle);
      return;
    }

    const handle = async () => {
      const server = createServer();
      const transport = new StreamableHTTPServerTransport({
        sessionIdGenerator: undefined,
        enableJsonResponse: true,
      });
      res.on('close', () => { transport.close(); server.close(); });
      await server.connect(transport);
      await transport.handleRequest(req, res);
    };

    await handle();
  });

  httpServer.listen(port, host, () => {
    logger.info(`Ironscales MCP HTTP streaming server listening on ${host}:${port}`);
  });
}

const transport = process.env.MCP_TRANSPORT;
if (transport === 'http') {
  startHttpServer();
} else {
  import('./index.js');
}
