import type { DomainName, DomainHandler } from '../utils/types.js';

const domainCache = new Map<DomainName, DomainHandler>();

export async function getDomainHandler(domain: DomainName): Promise<DomainHandler> {
  const cached = domainCache.get(domain);
  if (cached) return cached;

  let handler: DomainHandler;

  switch (domain) {
    case 'incidents': {
      const { incidentsHandler } = await import('./incidents.js');
      handler = incidentsHandler;
      break;
    }
    case 'email': {
      const { emailHandler } = await import('./email.js');
      handler = emailHandler;
      break;
    }
    case 'remediation': {
      const { remediationHandler } = await import('./remediation.js');
      handler = remediationHandler;
      break;
    }
    case 'stats': {
      const { statsHandler } = await import('./stats.js');
      handler = statsHandler;
      break;
    }
    case 'allowlist': {
      const { allowlistHandler } = await import('./allowlist.js');
      handler = allowlistHandler;
      break;
    }
    default:
      throw new Error(`Unknown domain: ${domain}`);
  }

  domainCache.set(domain, handler);
  return handler;
}
