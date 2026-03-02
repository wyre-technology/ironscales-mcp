import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { createServer } from './server.js';
import { logger } from './utils/logger.js';

async function main(): Promise<void> {
  const server = createServer();
  const transport = new StdioServerTransport();
  await server.connect(transport);
  logger.info('Ironscales MCP server started (stdio transport)');
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
