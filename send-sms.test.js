const test = require('node:test');
const assert = require('node:assert');
const { parseArgs, isValidPhone, sendBatch } = require('./send-sms');

test('parseArgs: 解析合法 flags', () => {
  const result = parseArgs(['--message', 'hi', '--to', '+886912345678,+886923456789']);
  assert.strictEqual(result.message, 'hi');
  assert.deepStrictEqual(result.to, ['+886912345678', '+886923456789']);
});

test('parseArgs: --to 去除空白', () => {
  const result = parseArgs(['--message', 'hi', '--to', '+886912345678, +886923456789 ']);
  assert.deepStrictEqual(result.to, ['+886912345678', '+886923456789']);
});

test('parseArgs: 缺少 --message 會拋錯', () => {
  assert.throws(() => parseArgs(['--to', '+886912345678']), /--message/);
});

test('parseArgs: 缺少 --to 會拋錯', () => {
  assert.throws(() => parseArgs(['--message', 'hi']), /--to/);
});

test('isValidPhone: 合法 E.164 通過', () => {
  assert.strictEqual(isValidPhone('+886912345678'), true);
  assert.strictEqual(isValidPhone('+14155552671'), true);
});

test('isValidPhone: 非法格式拒絕', () => {
  assert.strictEqual(isValidPhone('886912345678'), false);
  assert.strictEqual(isValidPhone('+0912345678'), false);
  assert.strictEqual(isValidPhone('not-a-number'), false);
  assert.strictEqual(isValidPhone(''), false);
});

test('sendBatch: 非法號碼計入失敗且不呼叫 SNS', async () => {
  const sent = [];
  const client = { send: async (cmd) => { sent.push(cmd); return {}; } };
  const result = await sendBatch({ client, message: 'hi', recipients: ['invalid'] });
  assert.strictEqual(sent.length, 0);
  assert.strictEqual(result.successes.length, 0);
  assert.strictEqual(result.failures.length, 1);
  assert.strictEqual(result.failures[0].phone, 'invalid');
});

test('sendBatch: 合法號碼會以 Promotional 呼叫 SNS', async () => {
  const sent = [];
  const client = { send: async (cmd) => { sent.push(cmd); return {}; } };
  const result = await sendBatch({ client, message: 'hello', recipients: ['+886912345678'] });
  assert.strictEqual(sent.length, 1);
  const input = sent[0].input;
  assert.strictEqual(input.PhoneNumber, '+886912345678');
  assert.strictEqual(input.Message, 'hello');
  assert.strictEqual(
    input.MessageAttributes['AWS.SNS.SMS.SMSType'].StringValue,
    'Promotional'
  );
  assert.deepStrictEqual(result.successes, ['+886912345678']);
  assert.strictEqual(result.failures.length, 0);
});

test('sendBatch: 單筆失敗不影響其他筆', async () => {
  let calls = 0;
  const client = {
    send: async () => {
      calls++;
      if (calls === 2) throw new Error('boom');
      return {};
    },
  };
  const result = await sendBatch({
    client,
    message: 'hi',
    recipients: ['+886912345678', '+886923456789', '+886934567890'],
  });
  assert.strictEqual(result.successes.length, 2);
  assert.deepStrictEqual(result.successes, ['+886912345678', '+886934567890']);
  assert.strictEqual(result.failures.length, 1);
  assert.strictEqual(result.failures[0].phone, '+886923456789');
  assert.match(result.failures[0].reason, /boom/);
});
