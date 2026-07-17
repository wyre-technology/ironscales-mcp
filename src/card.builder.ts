/**
 * Incident-card payload builder for the MCP Apps (SEP-1865) UI surface.
 *
 * ironscales_incidents_get results get a normalized `_card` object attached
 * (see domains/incidents.ts) that the ui:// incident card renders from. The
 * card is progressive enhancement: every step here is best-effort, and a null
 * return simply means the host renders no card while the JSON payload is
 * unchanged.
 *
 * The card is read-only by design: Ironscales remediation (quarantine et al.)
 * is a deliberate, destructive action that stays with the model-driven
 * remediation tools rather than a one-click card button.
 */

export const INCIDENT_CARD_RESOURCE_URI = 'ui://ironscales/incident-card.html';

/** MCP Apps resource MIME (RESOURCE_MIME_TYPE in @modelcontextprotocol/ext-apps). */
export const MCP_APP_RESOURCE_MIME = 'text/html;profile=mcp-app';

/**
 * Tool `_meta` advertising the card. Carries both the canonical flat key
 * (RESOURCE_URI_META_KEY in ext-apps) and the nested form ext-apps'
 * registerAppTool emits, so any MCP Apps host revision finds it.
 */
export const INCIDENT_CARD_META = {
  'ui/resourceUri': INCIDENT_CARD_RESOURCE_URI,
  ui: { resourceUri: INCIDENT_CARD_RESOURCE_URI },
} as const;

/** Mirror of Brand in ui/incident-card.ts — keep in sync. */
export interface CardBrand {
  name?: string;
  logoUrl?: string;
  primaryColor?: string;
  accentColor?: string;
  bg?: string;
  text?: string;
}

/** The BRAND_INJECT comment marker baked into the card HTML (see ui/index.html). */
const BRAND_INJECT_RE = /<!--\s*BRAND_INJECT:[\s\S]*?-->/;

/**
 * Serve-time brand injection: replace the BRAND_INJECT marker with an inline
 * `window.__BRAND__` script so self-hosters can theme the card without
 * rebuilding the bundle. An empty brand returns the HTML unchanged (the card
 * renders its neutral defaults). `<` is escaped so brand values can never
 * break out of the script tag.
 */
export function applyBrandInjection(html: string, brand: CardBrand): string {
  if (!brand || Object.values(brand).every((v) => !v)) return html;
  const json = JSON.stringify(brand).replace(/</g, '\\u003c');
  return html.replace(BRAND_INJECT_RE, `<script>window.__BRAND__=${json}</script>`);
}

/**
 * Resolve brand overrides from MCP_BRAND_* environment variables. Guarded for
 * runtimes without `process` (Cloudflare Workers), where this returns an empty
 * brand and the card serves its neutral defaults.
 */
export function resolveBrandFromEnv(): CardBrand {
  if (typeof process === 'undefined' || !process.env) return {};
  const env = process.env;
  const brand: CardBrand = {};
  if (env.MCP_BRAND_NAME) brand.name = env.MCP_BRAND_NAME;
  if (env.MCP_BRAND_LOGO_URL) brand.logoUrl = env.MCP_BRAND_LOGO_URL;
  if (env.MCP_BRAND_PRIMARY_COLOR) brand.primaryColor = env.MCP_BRAND_PRIMARY_COLOR;
  if (env.MCP_BRAND_ACCENT_COLOR) brand.accentColor = env.MCP_BRAND_ACCENT_COLOR;
  if (env.MCP_BRAND_BG) brand.bg = env.MCP_BRAND_BG;
  if (env.MCP_BRAND_TEXT) brand.text = env.MCP_BRAND_TEXT;
  return brand;
}

/** Mirror of IncidentCard in ui/incident-card.ts — keep in sync. */
export interface IncidentCard {
  id: string;
  subject: string;
  status?: string;
  severity?: string;
  sender?: string;
  recipientCount?: number;
  recipients: string[];
  threatIndicators: string[];
  createdAt?: string;
}

const CARD_RECIPIENT_LIMIT = 5;
const CARD_INDICATOR_LIMIT = 10;
const CARD_TEXT_MAX_LENGTH = 300;

function str(value: unknown): string | undefined {
  if (typeof value === 'string' && value) return value.slice(0, CARD_TEXT_MAX_LENGTH);
  return undefined;
}

function strList(value: unknown, limit: number): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((v): v is string => typeof v === 'string' && !!v)
    .slice(0, limit)
    .map((v) => v.slice(0, CARD_TEXT_MAX_LENGTH));
}

/**
 * Build the renderable card from an ironscales_incidents_get payload. The
 * Ironscales API already returns flat, human-readable strings (status,
 * severity, sender), so normalization is field mapping plus size caps — no
 * extra lookups are needed or performed.
 */
export function buildIncidentCard(incident: Record<string, unknown>): IncidentCard | null {
  const id =
    typeof incident?.id === 'string' || typeof incident?.id === 'number'
      ? String(incident.id)
      : undefined;
  const subject = str(incident?.subject);
  if (!id || !subject) return null;

  const card: IncidentCard = {
    id,
    subject,
    recipients: strList(incident.recipients, CARD_RECIPIENT_LIMIT),
    threatIndicators: strList(incident.threat_indicators, CARD_INDICATOR_LIMIT),
  };

  const status = str(incident.status);
  const severity = str(incident.severity);
  const sender = str(incident.sender);
  const createdAt = str(incident.created_at);
  if (status) card.status = status;
  if (severity) card.severity = severity;
  if (sender) card.sender = sender;
  if (createdAt) card.createdAt = createdAt;
  if (typeof incident.recipient_count === 'number') {
    card.recipientCount = incident.recipient_count;
  } else if (card.recipients.length > 0) {
    card.recipientCount = card.recipients.length;
  }

  return card;
}
