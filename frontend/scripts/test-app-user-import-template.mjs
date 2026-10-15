import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import test from 'node:test';
import ts from 'typescript';

const page = fs.readFileSync(new URL('../src/pages/customers/CustomersPage.tsx', import.meta.url), 'utf8');
const templateModule = new URL('../src/pages/customers/appUserImportTemplate.ts', import.meta.url);
const context = { exports: {} };
const source = ts.transpileModule(fs.readFileSync(templateModule, 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText;
vm.runInNewContext(source, context);
const { buildImportTemplateCsv } = context.exports;

function parseCsvLine(line) {
  const cells = [];
  let value = '';
  let quoted = false;
  for (let i = 0; i < line.length; i++) {
    if (line[i] === '"') {
      if (quoted && line[i + 1] === '"') { value += '"'; i++; }
      else quoted = !quoted;
    } else if (line[i] === ',' && !quoted) { cells.push(value); value = ''; }
    else value += line[i];
  }
  assert.equal(quoted, false, 'CSV 引号必须成对');
  return [...cells, value];
}

const [headers, values] = buildImportTemplateCsv().split(/\r?\n/).map(parseCsvLine);
const sample = Object.fromEntries(headers.map((header, index) => [header, values[index]]));

test('N-P0-01 表头和示例严格对齐为 72 列', () => {
  assert.equal(headers.length, values.length, '示例不能多出一格造成后半段字段错位');
  assert.equal(headers.length, 72);
  assert.equal(new Set(headers).size, headers.length);
});

test('N-P1-02 资料问答及认证字段各就各位', () => {
  const qa = JSON.parse(sample['资料问答']);
  assert.equal(qa[0].questionKey, 'meetingPreference');
  assert.equal(qa[0].answer, sample['见面偏好']);
  assert.equal(sample['真实姓名'], '张三');
  assert.equal(sample['证书姓名'], sample['真实姓名']);
  assert.equal(sample['认证方式'], 'DIPLOMA_NO');
  assert.equal(sample['学历协议勾选'], '是');
});

test('N-P1-03 户口、学校和枚举使用正确示例', () => {
  assert.equal(sample['户口所在地'], '河南省郑州市');
  assert.equal(sample['学校名称'], '浙江工商大学');
  assert.equal(sample['学校'], sample['学校名称']);
  assert.equal(sample['个人标签'], 'LOVE_TRAVEL|OUTDOOR_LOVER');
  assert.equal(sample['头像来源'], 'ALBUM');
  assert.equal(sample['学历人群'], 'MAINLAND_GRADUATE');
});

test('N-P2-04 不提供易过期的年龄或覆盖出生日期推导的星座', () => {
  assert.equal(sample['年龄'], '');
  assert.equal(sample['星座'], '');
  assert.equal(sample['出生日期'], '1997-03-06');
  assert.equal(sample['自我介绍'], '我是一个真诚稳定的人，希望你也认真对待关系。');
});

test('N-P1-05 页面接入统一生成器并告知真实材料和重复保护', () => {
  assert.match(page, /import\s*\{\s*buildImportTemplateCsv\s*\}\s*from\s*['"]\.\/appUserImportTemplate['"]/);
  assert.match(page, /new Blob\(\['\\uFEFF', content\]/);
  assert.match(page, /示例.*真实/);
  assert.match(page, /500/);
  assert.match(page, /手机号.*不覆盖/);
});
