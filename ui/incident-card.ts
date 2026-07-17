/**
 * Iframe bridge + renderer for the Ironscales incident card (MCP Apps, SEP-1865).
 *
 * Runs inside the host's sandboxed iframe. Uses the official MCP Apps client
 * (`App`) to receive the ironscales_incidents_get tool result from the host.
 * The card is read-only: phishing-incident remediation is a deliberate,
 * destructive action that stays with the model-driven remediation tools.
 *
 * The server attaches a normalized `_card` payload to ironscales_incidents_get
 * results (see src/card.builder.ts) so this renderer never needs to resolve
 * fields itself.
 *
 * Rendering uses DOM construction (no innerHTML) — subjects, senders, and
 * recipients are untrusted attacker-controlled email data, so text only ever
 * lands in text nodes.
 *
 * White-label: the card is neutral by default (no vendor identity) and applies
 * an injected `window.__BRAND__` override (set by the MCP server via
 * MCP_BRAND_* env vars, or a gateway per-org) so the same card can render in
 * any operator's brand.
 */
import { App } from '@modelcontextprotocol/ext-apps';

interface Brand {
  name?: string;
  logoUrl?: string;
  primaryColor?: string;
  accentColor?: string;
  bg?: string;
  text?: string;
}
declare global {
  interface Window {
    __BRAND__?: Brand;
  }
}

/** Mirror of IncidentCard in src/card.builder.ts — keep in sync. */
interface IncidentCard {
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

const brand: Brand = window.__BRAND__ ?? {};
// No brand injected → no brand identity rendered (neutral default).
const brandName = brand.name ?? '';

// Apply any injected brand overrides onto the CSS custom properties.
function applyBrand(): void {
  const root = document.documentElement.style;
  if (brand.primaryColor) root.setProperty('--brand-primary', brand.primaryColor);
  if (brand.accentColor) root.setProperty('--brand-accent', brand.accentColor);
  if (brand.bg) root.setProperty('--brand-bg', brand.bg);
  if (brand.text) root.setProperty('--brand-text', brand.text);
}

const app = new App({ name: 'Ironscales Incident Card', version: '1.0.0' });

/** Create an element with a class and (safe, text-node) children. */
function el(
  tag: string,
  className = '',
  ...children: Array<Node | string | null>
): HTMLElement {
  const node = document.createElement(tag);
  if (className) node.className = className;
  for (const child of children) {
    if (child == null) continue;
    node.append(child); // strings become text nodes — never parsed as HTML
  }
  return node;
}

function fmtDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

function field(label: string, value: string | undefined): HTMLElement | null {
  if (!value) return null;
  return el(
    'div',
    'field',
    el('div', 'field__label', label),
    el('div', 'field__value', value)
  );
}

function badge(text: string | undefined, cls: string): HTMLElement | null {
  return text ? el('span', `badge ${cls}`, text) : null;
}

function render(incident: IncidentCard): void {
  // Brand identity only renders when a brand was injected — the neutral
  // default shows just the incident id/vendor context in the header.
  let brandId: HTMLElement | null = null;
  if (brandName || brand.logoUrl) {
    brandId = el('span', 'brandid');
    if (brand.logoUrl) {
      const logo = document.createElement('img');
      logo.src = brand.logoUrl;
      logo.alt = brandName;
      logo.style.display = 'inline-block';
      brandId.append(logo);
    }
    if (brandName) brandId.append(el('span', 'brand', brandName));
  }

  const body = el(
    'div',
    'card__body',
    el('div', 'brandrow', brandId, el('span', 'incno', `${incident.id} · Ironscales`)),
    el('h1', '', incident.subject),
    el(
      'div',
      'badges',
      badge(incident.status, 'badge--status'),
      badge(incident.severity, 'badge--sev')
    ),
    el(
      'div',
      'grid',
      field('Sender', incident.sender),
      field(
        'Recipients',
        incident.recipientCount != null ? String(incident.recipientCount) : undefined
      ),
      field('Reported', incident.createdAt && fmtDate(incident.createdAt))
    )
  );

  if (incident.threatIndicators.length > 0) {
    const chips = el('div', 'chips');
    for (const indicator of incident.threatIndicators) chips.append(el('span', 'chip', indicator));
    body.append(el('div', 'section', el('div', 'section__h', 'Threat indicators'), chips));
  }

  if (incident.recipients.length > 0) {
    const section = el(
      'div',
      'section',
      el('div', 'section__h', `Affected recipients (${incident.recipientCount ?? incident.recipients.length})`)
    );
    for (const recipient of incident.recipients) section.append(el('div', 'recipient', recipient));
    const total = incident.recipientCount ?? incident.recipients.length;
    if (total > incident.recipients.length) {
      section.append(el('div', 'more', `+${total - incident.recipients.length} more`));
    }
    body.append(section);
  }

  const root = document.getElementById('root')!;
  root.replaceChildren(el('div', 'card', el('div', 'card__bar'), body));
}

// ironscales-mcp returns the incident JSON directly and attaches the
// normalized card to ironscales_incidents_get results as _card.
function extractCard(obj: unknown): IncidentCard | null {
  const card = (obj as { _card?: IncidentCard })?._card;
  return card && typeof card.id === 'string' && typeof card.subject === 'string' ? card : null;
}

applyBrand();

// Must be set before connect() so the initial tool-result isn't missed.
app.ontoolresult = (result: { content?: Array<{ type: string; text?: string }> }) => {
  const payload = (result.content ?? []).find((c) => c.type === 'text');
  if (!payload?.text) return;
  try {
    const card = extractCard(JSON.parse(payload.text));
    if (card) render(card);
  } catch {
    /* ignore malformed payloads */
  }
};

app.connect();
