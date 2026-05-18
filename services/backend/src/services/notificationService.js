import twilio from 'twilio';

const SID   = process.env.TWILIO_ACCOUNT_SID;
const TOKEN = process.env.TWILIO_AUTH_TOKEN;
const SMS_FROM      = process.env.TWILIO_SMS_FROM;
const WA_FROM       = process.env.TWILIO_WHATSAPP_FROM;
const NOTIFY_PHONES = (process.env.NOTIFY_PHONES || '').split(',').map(s => s.trim()).filter(Boolean);
const DAILY_LIMIT   = parseInt(process.env.NOTIFY_DAILY_LIMIT || '25', 10);

const client = SID && TOKEN ? twilio(SID, TOKEN) : null;

if (!client) {
  console.log('[notify] Twilio not configured — SMS/WhatsApp disabled.');
}

// Daily counter — resets at midnight
let sentToday = 0;
let counterDate = new Date().toDateString();

function checkAndCount() {
  const today = new Date().toDateString();
  if (today !== counterDate) {
    sentToday = 0;
    counterDate = today;
  }
  if (sentToday >= DAILY_LIMIT) return false;
  sentToday++;
  return true;
}

function buildText({ severity, facility, timestamp, message, action }) {
  const icon = severity === 'critical' ? '🚨' : severity === 'warning' ? '⚠️' : 'ℹ️';
  return [
    `${icon} AquaSense AI — ${severity.toUpperCase()} ALERT`,
    `Facility: ${facility}`,
    `Time: ${timestamp}`,
    ``,
    message,
    action ? `Action: ${action}` : null,
  ].filter(Boolean).join('\n');
}

export async function sendBulletin(alert) {
  if (!client || NOTIFY_PHONES.length === 0) return;
  if (!checkAndCount()) {
    console.log(`[notify] Daily limit of ${DAILY_LIMIT} reached — skipping.`);
    return;
  }

  const text = buildText({
    severity: alert.severity,
    facility: alert.facility_id,
    timestamp: alert.timestamp,
    message: alert.message,
    action: alert.recommended_action,
  });

  const tasks = [];

  for (const phone of NOTIFY_PHONES) {
    if (SMS_FROM) {
      tasks.push(
        client.messages.create({ body: text, from: SMS_FROM, to: phone })
          .then(() => console.log(`[notify] SMS sent to ${phone} (${sentToday}/${DAILY_LIMIT} today)`))
          .catch(e => console.error(`[notify] SMS failed to ${phone}:`, e.message))
      );
    }
    if (WA_FROM) {
      tasks.push(
        client.messages.create({ body: text, from: `whatsapp:${WA_FROM}`, to: `whatsapp:${phone}` })
          .then(() => console.log(`[notify] WhatsApp sent to ${phone} (${sentToday}/${DAILY_LIMIT} today)`))
          .catch(e => console.error(`[notify] WhatsApp failed to ${phone}:`, e.message))
      );
    }
  }

  await Promise.allSettled(tasks);
}
