const { SNSClient, PublishCommand } = require('@aws-sdk/client-sns');

const E164 = /^\+[1-9]\d{6,14}$/;
const REGION = 'ap-northeast-1';

function parseArgs(argv) {
  let message = null;
  let to = null;
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--message') message = argv[++i];
    else if (argv[i] === '--to') to = argv[++i];
  }
  if (!message) throw new Error('Missing required flag: --message');
  if (!to) throw new Error('Missing required flag: --to');
  const recipients = to.split(',').map((s) => s.trim()).filter(Boolean);
  return { message, to: recipients };
}

function isValidPhone(number) {
  return typeof number === 'string' && E164.test(number);
}

function buildCommand(phone, message) {
  return new PublishCommand({
    PhoneNumber: phone,
    Message: message,
    MessageAttributes: {
      'AWS.SNS.SMS.SMSType': { DataType: 'String', StringValue: 'Promotional' },
    },
  });
}

async function sendBatch({ client, message, recipients }) {
  const successes = [];
  const failures = [];
  for (const phone of recipients) {
    if (!isValidPhone(phone)) {
      failures.push({ phone, reason: 'invalid E.164 format' });
      continue;
    }
    try {
      await client.send(buildCommand(phone, message));
      successes.push(phone);
    } catch (err) {
      failures.push({ phone, reason: err.message || String(err) });
    }
  }
  return { successes, failures };
}

function printUsage() {
  console.error('Usage: node send-sms.js --message "<text>" --to "+886...,+886..."');
  console.error('Env:   AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY (required)');
}

async function main() {
  require('dotenv').config();

  let parsed;
  try {
    parsed = parseArgs(process.argv.slice(2));
  } catch (e) {
    console.error(e.message);
    printUsage();
    process.exit(1);
  }

  const client = new SNSClient({ region: REGION });
  const { successes, failures } = await sendBatch({
    client,
    message: parsed.message,
    recipients: parsed.to,
  });

  console.log(`成功: ${successes.length} / 失敗: ${failures.length}`);
  if (failures.length) {
    console.log('失敗清單:');
    for (const f of failures) console.log(`  ${f.phone} - ${f.reason}`);
  }
  process.exit(failures.length > 0 ? 2 : 0);
}

if (require.main === module) {
  main();
}

module.exports = { parseArgs, isValidPhone, sendBatch };
