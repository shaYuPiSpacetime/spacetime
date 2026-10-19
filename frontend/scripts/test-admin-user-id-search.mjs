import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const expectedPlaceholder = 'placeholder="用户ID/姓名/昵称/手机号/身份证/标签"';
const pages = [
  'src/pages/customers/CustomersPage.tsx',
  'src/pages/verify/VerificationManagementPage.tsx',
  'src/pages/moderation/ModerationPage.tsx',
];

for (const page of pages) {
  test(`${page} advertises user ID in the unified keyword search`, async () => {
    const source = await readFile(new URL(`../${page}`, import.meta.url), 'utf8');

    assert.ok(
      source.includes(expectedPlaceholder),
      `${page} should include the unified user ID search placeholder`,
    );
    assert.match(source, /value=\{keyword\}/);
  });
}
