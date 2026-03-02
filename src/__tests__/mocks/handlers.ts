import { http, HttpResponse } from 'msw';

const BASE_URL = 'https://appapi.ironscales.com';

export const handlers = [
  // Incidents list
  http.get(`${BASE_URL}/api/v1/incidents`, () =>
    HttpResponse.json({
      incidents: [
        {
          id: 'inc-001',
          status: 'open',
          severity: 'high',
          subject: 'Urgent: Verify your account',
          sender: 'attacker@evil.com',
          recipient_count: 5,
          created_at: '2026-03-01T10:00:00Z',
        },
      ],
      total: 1,
    })
  ),

  // Incident by ID
  http.get(`${BASE_URL}/api/v1/incidents/:id`, ({ params }) =>
    HttpResponse.json({
      id: params.id,
      status: 'open',
      severity: 'high',
      subject: 'Urgent: Verify your account',
      sender: 'attacker@evil.com',
      recipient_count: 5,
      recipients: ['user1@company.com', 'user2@company.com'],
      created_at: '2026-03-01T10:00:00Z',
      threat_indicators: ['suspicious_link', 'domain_spoofing'],
    })
  ),

  // Email classify
  http.post(`${BASE_URL}/api/v1/email/classify`, () =>
    HttpResponse.json({
      classification: 'phishing',
      confidence: 0.97,
      threat_types: ['credential_harvesting', 'brand_impersonation'],
      indicators: ['suspicious_link', 'lookalike_domain'],
    })
  ),

  // Remediate incident
  http.post(`${BASE_URL}/api/v1/incidents/:id/remediate`, ({ params }) =>
    HttpResponse.json({
      incident_id: params.id,
      action: 'quarantine',
      status: 'completed',
      affected_mailboxes: 5,
      timestamp: '2026-03-01T10:05:00Z',
    })
  ),

  // Company stats
  http.get(`${BASE_URL}/api/v1/company/stats`, () =>
    HttpResponse.json({
      period: '30d',
      total_incidents: 42,
      open_incidents: 7,
      closed_incidents: 35,
      by_severity: { low: 10, medium: 20, high: 10, critical: 2 },
      top_attack_types: ['phishing', 'bec', 'malware'],
      remediation_rate: 0.83,
    })
  ),

  // Allowlist - GET list
  http.get(`${BASE_URL}/api/v1/allowlist`, () =>
    HttpResponse.json({
      entries: [
        { type: 'domain', value: 'trusted-partner.com', added_at: '2026-01-15T09:00:00Z' },
        { type: 'email', value: 'newsletter@legit.com', added_at: '2026-02-01T12:00:00Z' },
      ],
    })
  ),

  // Allowlist - POST add
  http.post(`${BASE_URL}/api/v1/allowlist`, () =>
    HttpResponse.json({ success: true, message: 'Entry added to allowlist' })
  ),

  // Allowlist - DELETE remove
  http.delete(`${BASE_URL}/api/v1/allowlist`, () =>
    HttpResponse.json({ success: true, message: 'Entry removed from allowlist' })
  ),
];
