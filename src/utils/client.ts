import { logger } from './logger.js';

export interface IronscalesCredentials {
  apiKey: string;
  companyId: string;
}

export interface IronscalesClient {
  request<T>(path: string, options?: RequestInit): Promise<T>;
}

let _client: IronscalesClientImpl | null = null;
let _credentials: IronscalesCredentials | null = null;

const BASE_URL = 'https://appapi.ironscales.com';

class IronscalesClientImpl implements IronscalesClient {
  constructor(private readonly creds: IronscalesCredentials) {}

  async request<T>(path: string, options: RequestInit = {}): Promise<T> {
    const url = path.startsWith('http') ? path : `${BASE_URL}${path}`;
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      'X-IronScales-API-Key': this.creds.apiKey,
      'X-IronScales-Company-ID': this.creds.companyId,
      ...(options.headers as Record<string, string>),
    };

    const response = await fetch(url, {
      ...options,
      headers,
      signal: options.signal ?? AbortSignal.timeout(30_000),
    });

    if (response.ok) {
      if (response.status === 204) return {} as T;
      const contentType = response.headers.get('content-type');
      if (contentType?.includes('application/json')) {
        return response.json() as Promise<T>;
      }
      return {} as T;
    }

    // Safe: read text once, then parse as JSON if possible
    const rawText = await response.text();
    let responseBody: unknown;
    try {
      responseBody = JSON.parse(rawText);
    } catch {
      responseBody = rawText;
    }

    const message =
      typeof responseBody === 'object' &&
      responseBody !== null &&
      'message' in responseBody
        ? String((responseBody as Record<string, unknown>).message)
        : `HTTP ${response.status}`;

    switch (response.status) {
      case 401:
        throw new Error(`Ironscales authentication failed: ${message}`);
      case 403:
        throw new Error(`Ironscales access forbidden: ${message}`);
      case 404:
        throw new Error(`Ironscales resource not found: ${message}`);
      case 429:
        throw new Error(`Ironscales rate limit exceeded: ${message}`);
      default:
        throw new Error(`Ironscales API error (HTTP ${response.status}): ${message}`);
    }
  }
}

export function getCredentials(): IronscalesCredentials | null {
  const apiKey = process.env.IRONSCALES_API_KEY;
  const companyId = process.env.IRONSCALES_COMPANY_ID;

  if (!apiKey || !companyId) {
    logger.warn('Missing Ironscales credentials', {
      hasApiKey: !!apiKey,
      hasCompanyId: !!companyId,
    });
    return null;
  }

  return { apiKey, companyId };
}

export async function getClient(): Promise<IronscalesClient> {
  const creds = getCredentials();
  if (!creds) {
    throw new Error(
      'Ironscales credentials not configured. Set IRONSCALES_API_KEY and IRONSCALES_COMPANY_ID.'
    );
  }

  // Invalidate cache if credentials changed
  if (
    _client &&
    _credentials &&
    (creds.apiKey !== _credentials.apiKey || creds.companyId !== _credentials.companyId)
  ) {
    _client = null;
  }

  if (!_client) {
    _client = new IronscalesClientImpl(creds);
    _credentials = creds;
    logger.info('Created Ironscales API client', { companyId: creds.companyId });
  }

  return _client;
}
