/*
 * Cloud Functions for worlds-site.
 *
 * ONE function today: logInstallClick, the beacon the page fires when someone
 * clicks Copy on the install snippet. It writes a structured log line;
 * Cloud Logging captures it; the firebase-hosting-requests sink forwards it to
 * BigQuery (dataset worlds_site_analytics), where the analytics query lives.
 *
 * Why a function rather than a BigQuery client here: the sink is already the
 * write path for hosting request logs, and reusing it keeps this function
 * stateless (no service account, no client library, no batching, no failure
 * modes to invent). If a log line is dropped by Cloud Logging, one click's
 * telemetry is lost -- an acceptable failure for a landing-page counter.
 */
const { onRequest } = require('firebase-functions/v2/https');

exports.logInstallClick = onRequest(
  {
    region: 'us-central1',
    // The site is public and this is a beacon called from public JS, so the
    // function must be unauthenticated. cors=true lets any origin call it,
    // which matches the hosting site's own openness.
    cors: true,
    invoker: 'public',
    // Small everything. This handler does five string ops and one console.log,
    // and burns a tiny fraction of the free tier per invocation.
    memory: '128MiB',
    timeoutSeconds: 5,
    maxInstances: 10,
  },
  (req, res) => {
    // Clamp untrusted input to a short lowercased string with a known shape.
    // 'unix' and 'windows' are the values the page sends today.
    const os = String(req.query.os || 'unknown').slice(0, 20).toLowerCase();

    // Structured log line. Cloud Logging parses JSON stdout into jsonPayload,
    // preserving each field for BigQuery queries downstream. The 'severity'
    // key is honoured by Cloud Logging as the entry's severity.
    console.log(JSON.stringify({
      severity: 'INFO',
      event: 'install_click',
      os,
      // IP and User-Agent captured for basic bot filtering; not for
      // identification. GDPR-safe: no cookies, no ids, no tracking join key.
      userAgent: req.get('User-Agent') || '',
      referer: req.get('Referer') || '',
      ip: req.ip || '',
    }));

    // 204 No Content: beacon protocol expects no body, and browsers dispatched
    // via sendBeacon() do not read the response.
    res.status(204).send();
  }
);
