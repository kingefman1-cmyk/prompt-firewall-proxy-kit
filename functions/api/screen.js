// POST /api/screen   { "text": "...", "redact": true }
// One screening call per request: prompt-injection patterns, hidden characters, personal data and secrets, with an allow, review or block verdict.
import { callCaelara, gate, json, readJsonBody } from '../../lib/proxy.js'

export const SHIELD_HOST = 'https://shield.caelaralabs.com'
export const MAX_TEXT = 20000
const clip = (v, n) => (typeof v === 'string' ? v.slice(0, n) : null)

export async function handleScreen(request, env, fetcher = fetch) {
  if (request.method !== 'POST') return json({ error: 'Send a POST with {"text": "..."}.' }, 405, { Allow: 'POST' })
  const blocked = gate(request, env)
  if (blocked) return blocked
  const b = await readJsonBody(request, MAX_TEXT * 4 + 1024)
  if (b.error) return json({ error: b.error }, 400)
  const text = b.value.text
  if (typeof text !== 'string' || !text.trim() || text.length > MAX_TEXT) return json({ error: `text must be 1 to ${MAX_TEXT} characters.` }, 400)
  const r = await callCaelara(fetcher, `${SHIELD_HOST}/v1/shield/prompt`, env.CAELARA_API_KEY, { method: 'POST', body: { text, redact: b.value.redact !== false } })
  if (!r.ok) return json({ error: r.error }, r.status)
  const d = r.body
  return json({
    verdict: ['allow', 'review', 'block'].includes(d.verdict) ? d.verdict : 'review',
    risk_score: typeof d.risk_score === 'number' ? d.risk_score : null,
    findings: (Array.isArray(d.findings) ? d.findings : []).slice(0, 25).map((f) => ({ id: clip(f?.id, 80), category: clip(f?.category, 40), severity: clip(f?.severity, 20), detail: clip(f?.detail, 300) })),
    sanitized_text: typeof d.sanitized_text === 'string' ? d.sanitized_text : null,
    partial: d.partial === true,
    note: clip(d.note, 300),
  })
}

export const onRequest = ({ request, env }) => handleScreen(request, env)
