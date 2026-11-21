export const SPEC = {
  "title": "Prompt Firewall",
  "tagline": "Screen a prompt before your model sees it.",
  "method": "POST",
  "path": "/api/screen",
  "button": "Screen text",
  "headline": [
    "verdict",
    "risk_score",
    "partial"
  ],
  "fields": [
    {
      "name": "text",
      "label": "Text to screen",
      "type": "textarea",
      "placeholder": "Paste a prompt, a document or model input here",
      "required": true,
      "maxlength": 20000,
      "rows": 8
    }
  ]
}
