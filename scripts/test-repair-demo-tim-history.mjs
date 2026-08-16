import assert from 'node:assert/strict';
import { inflateSync } from 'node:zlib';

import {
  buildImportPayload,
  generateTencentUserSig,
  selectDemoIncomingMessages,
} from './repair-demo-tim-history.mjs';

const conversations = [
  {
    conversationNo: 'CV-DEMO-001',
    lastMessage: {
      messageNo: 'DEMO-HOME-U1-P1-IN',
      messageType: 'text',
      direction: 'incoming',
      preview: '对方发来的消息',
      messageTime: '2026-08-15 11:53:36',
      sendStatus: 'sent',
    },
  },
  {
    conversationNo: 'CV-REAL-002',
    lastMessage: {
      messageNo: 'MSG-REAL-002',
      direction: 'incoming',
      preview: '真实消息不得按演示修复脚本回灌',
      messageTime: '2026-08-15 11:54:36',
      sendStatus: 'sent',
    },
  },
  {
    conversationNo: 'CV-DEMO-003',
    lastMessage: {
      messageNo: 'DEMO-HOME-U1-P3-OUT',
      direction: 'outgoing',
      preview: '我方消息',
      messageTime: '2026-08-15 11:55:36',
      sendStatus: 'sent',
    },
  },
];

assert.deepEqual(
  selectDemoIncomingMessages(conversations).map(item => item.conversationNo),
  ['CV-DEMO-001'],
  '只允许修复已发送且缺失于 TIM 的 DEMO-HOME 入站演示消息',
);

const payload = buildImportPayload({
  messageNo: 'DEMO-HOME-U1-P1-IN',
  messageType: 'text',
  preview: '对方发来的消息',
  messageTime: '2026-08-15 11:53:36',
  fromAccount: 'tu_peer',
  toAccount: 'tu_current',
});
assert.equal(payload.SyncFromOldSystem, 2);
assert.equal(payload.From_Account, 'tu_peer');
assert.equal(payload.To_Account, 'tu_current');
assert.equal(payload.MsgTimeStamp, 1_786_766_016);
assert.ok(payload.MsgSeq > 0 && payload.MsgSeq <= 0xffff_ffff);
assert.ok(payload.MsgRandom > 0 && payload.MsgRandom <= 0xffff_ffff);
assert.deepEqual(payload.MsgBody, [{
  MsgType: 'TIMTextElem',
  MsgContent: { Text: '对方发来的消息' },
}]);
assert.equal(
  JSON.parse(payload.CloudCustomData).messageNo,
  'DEMO-HOME-U1-P1-IN',
  '回灌消息必须保留平台 messageNo，保障已读与举报继续命中原记录',
);

const userSig = generateTencentUserSig({
  sdkAppId: 1_400_000_001,
  userId: 'administrator',
  secretKey: 'unit-test-secret',
  expireSeconds: 86_400,
  issuedAtSeconds: 1_786_276_800,
});
const decoded = JSON.parse(inflateSync(Buffer.from(
  userSig.replaceAll('*', '+').replaceAll('-', '/').replaceAll('_', '='),
  'base64',
)).toString('utf8'));
assert.equal(decoded['TLS.identifier'], 'administrator');
assert.equal(decoded['TLS.sdkappid'], 1_400_000_001);
assert.equal(decoded['TLS.time'], 1_786_276_800);
assert.equal(decoded['TLS.expire'], 86_400);
assert.ok(decoded['TLS.sig']);

console.log('TIM 演示入站历史对账脚本测试通过');
