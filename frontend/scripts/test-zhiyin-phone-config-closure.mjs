import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import ts from 'typescript';

const helperUrl = new URL('../src/pages/community/communityPhoneConfig.ts', import.meta.url);
const pageSource = readFileSync(new URL('../src/pages/community/CommunityConfigPage.tsx', import.meta.url), 'utf8');

assert.ok(existsSync(helperUrl), '缺少心灵搭子手机号配置转换模块');

const helperSource = readFileSync(helperUrl, 'utf8');
const helperJavascript = ts.transpileModule(helperSource, {
  compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
}).outputText;
const helperModule = await import(`data:text/javascript;base64,${Buffer.from(helperJavascript).toString('base64')}`);

assert.equal(helperModule.SOULMATE_PHONE_CONFIG_KEY, 'community.soulmate_source_phones', '手机号配置键必须与后端一致');
assert.equal(helperModule.formatSoulmatePhoneConfig('["13800000000","13900000000"]'), '13800000000\n13900000000', 'JSON 手机号数组必须转成逐行文本');
assert.equal(helperModule.formatSoulmatePhoneConfig('not-json'), 'not-json', '历史异常值必须可见，不能静默丢失');
assert.equal(helperModule.serializeSoulmatePhoneConfig(' 13800000000\n13900000000,13800000000 '), '["13800000000","13900000000"]', '保存前必须去空白、支持逗号并去重');
assert.deepEqual(
  helperModule.prepareCommunityConfigItemsForSave([
    { configKey: 'community.soulmate_source_phones', configValue: '13800000000\n13900000000\n' },
    { configKey: 'community.post_max_images', configValue: 9 },
  ]),
  [
    { configKey: 'community.soulmate_source_phones', configValue: '["13800000000","13900000000"]' },
    { configKey: 'community.post_max_images', configValue: 9 },
  ],
  '编辑态必须保留换行，只在保存前序列化手机号配置',
);

assert.match(pageSource, /SOULMATE_PHONE_CONFIG_KEY/, '社区配置页必须识别心灵搭子手机号配置');
assert.match(pageSource, /每行输入一个手机号，最多 50 个/, '手机号配置必须提供运营可理解的输入提示');
assert.match(pageSource, /不会下发到小程序/, '手机号配置必须明确隐私边界');
assert.match(pageSource, /updateItem\(item\.configKey, event\.target\.value\)/, '逐行编辑时必须保留原始换行');
assert.match(pageSource, /prepareCommunityConfigItemsForSave/, '保存前必须统一序列化手机号配置');
assert.match(pageSource, /showToast\(message, 'error'\)/, '后端手机号校验失败时必须展示错误原因');

console.log('知音手机号配置静态回归测试通过');
