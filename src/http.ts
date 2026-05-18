import { createServer as createHttpServer } from 'node:http';
import { randomUUID } from 'node:crypto';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { isInitializeRequest } from '@modelcontextprotocol/sdk/types.js';
import { createServer } from './server.js';
import { logger } from './utils/logger.js';

const transports: Record<string, StreamableHTTPServerTransport> = {};

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
      res.writeHead(200, { 'Content-Type': 'application/json' });
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

      // Inject into env so the client singleton picks them up
      process.env.IRONSCALES_API_KEY = apiKey;
      process.env.IRONSCALES_COMPANY_ID = companyId;
    }

    const sessionId = req.headers['mcp-session-id'] as string | undefined;

    // POST — handle JSON-RPC messages
    if (req.method === 'POST') {
      const body = await readBody(req);
      let parsed: unknown;
      try {
        parsed = JSON.parse(body);
      } catch {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Invalid JSON' }));
        return;
      }

      if (sessionId && transports[sessionId]) {
        await transports[sessionId].handleRequest(req, res, parsed);
        return;
      }

      if (!sessionId && isInitializeRequest(parsed)) {
        const transport = new StreamableHTTPServerTransport({
          sessionIdGenerator: () => randomUUID(),
          enableJsonResponse: true,
          onsessioninitialized: (sid) => {
            transports[sid] = transport;
          },
        });
        transport.onclose = () => {
          const sid = transport.sessionId;
          if (sid) delete transports[sid];
        };

        const server = createServer();
        await server.connect(transport);
        await transport.handleRequest(req, res, parsed);
        return;
      }

      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(
        JSON.stringify({
          jsonrpc: '2.0',
          error: { code: -32000, message: 'Bad Request: missing or invalid session' },
          id: null,
        })
      );
      return;
    }

    // GET — SSE stream for server-initiated notifications
    if (req.method === 'GET') {
      if (!sessionId || !transports[sessionId]) {
        res.writeHead(400, { 'Content-Type': 'text/plain' });
        res.end('Invalid or missing session ID');
        return;
      }
      await transports[sessionId].handleRequest(req, res);
      return;
    }

    // DELETE — terminate session
    if (req.method === 'DELETE') {
      if (!sessionId || !transports[sessionId]) {
        res.writeHead(400, { 'Content-Type': 'text/plain' });
        res.end('Invalid or missing session ID');
        return;
      }
      await transports[sessionId].handleRequest(req, res);
      return;
    }

    res.writeHead(405).end();
  });

  httpServer.listen(port, host, () => {
    logger.info(`Ironscales MCP HTTP streaming server listening on ${host}:${port}`);
  });
}

function readBody(req: import('node:http').IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    req.on('data', (chunk) => chunks.push(chunk as Buffer));
    req.on('end', () => resolve(Buffer.concat(chunks).toString()));
    req.on('error', reject);
  });
}

const transport = process.env.MCP_TRANSPORT;
if (transport === 'http') {
  startHttpServer();
} else {
  import('./index.js');
}
