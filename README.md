# Ironscales MCP Server

[![License](https://img.shields.io/badge/License-Apache_2.0-blue.svg)](https://opensource.org/licenses/Apache-2.0)
[![Node.js](https://img.shields.io/badge/node-%3E%3D18.0.0-brightgreen.svg)](https://nodejs.org/)

A Model Context Protocol (MCP) server for Ironscales email security. Enables AI assistants to investigate phishing incidents, manage email classification, execute remediations, and view security statistics.

This is a [Model Context Protocol (MCP)](https://modelcontextprotocol.io/) server that connects Claude (or any MCP-compatible AI) to your Ironscales environment.

> **Part of the [MSP Claude Plugins](https://github.com/wyre-technology) ecosystem** — a growing suite of AI integrations for the MSP stack. Built by MSPs, for MSPs.

## Installation

```bash
npm install @wyre-technology/ironscales-mcp
```

## Configuration

Set the following environment variables:

| Variable | Required | Description |
|----------|----------|-------------|
| `IRONSCALES_API_KEY` | Yes | Your Ironscales API key |
| `IRONSCALES_COMPANY_ID` | Yes | Your Ironscales company ID |
| `MCP_TRANSPORT` | No | Transport mode: stdio (default) or http |

## Usage

### Running with Claude Desktop

Add to your Claude Desktop `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "ironscales-mcp": {
      "command": "npx",
      "args": ["@wyre-technology/ironscales-mcp"],
      "env": {
        "IRONSCALES_API_KEY": "your-ironscales-api-key"
        "IRONSCALES_COMPANY_ID": "your-ironscales-company-id"
      }
    }
  }
}
```

### Running with Claude Code (CLI)

```bash
claude mcp add ironscales-mcp \
  -e IRONSCALES_API_KEY=your-value \
  -e IRONSCALES_COMPANY_ID=your-value \
  -- npx -y @wyre-technology/ironscales-mcp
```

### Docker

```bash
docker build -t ironscales-mcp .
docker run \
  -e IRONSCALES_API_KEY=your-value \
  -e IRONSCALES_COMPANY_ID=your-value \
  -p 8080:8080 ironscales-mcp
```

## Available Domains

### Allowlist
Manage email allowlists and blocklists

### Email
Email investigation and classification

### Incidents
Phishing incident management and triage

### Remediation
Execute email remediations and quarantine

### Stats
Security statistics and reporting


## Development

```bash
# Clone the repository
git clone https://github.com/wyre-technology/ironscales-mcp.git
cd ironscales-mcp

# Install dependencies
npm install

# Build
npm run build

# Run tests
npm test
```

## Contributing

Contributions are welcome! Please see [CONTRIBUTING.md](CONTRIBUTING.md) if present, or open an issue to discuss changes.

## License

Licensed under the Apache License, Version 2.0. See [LICENSE](LICENSE) for details.
