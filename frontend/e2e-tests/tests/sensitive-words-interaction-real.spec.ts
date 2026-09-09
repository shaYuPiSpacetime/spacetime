import { test, expect, type Page } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const cfg: Record<string,string> = {};
for (const line of fs.readFileSync(path.join(root,'frontend/e2e-tests/.env'),'utf8').split(/\r?\n/)) {
  if (!line.trim() || line.trimStart().startsWith('#') || !line.includes('=')) continue;
  const at=line.indexOf('='); cfg[line.slice(0,at).trim()]=line.slice(at+1).trim().replace(/^['"]|['"]$/g,'');
}
const base=cfg.BASE_URL?.replace(/\/$/,''), api=cfg.API_URL?.replace(/\/$/,'');
const username=process.env.SENSITIVE_WORD_ADMIN_USERNAME, password=process.env.SENSITIVE_WORD_ADMIN_PASSWORD;
const artifacts=path.join(root,'docs/test-artifacts');
test.setTimeout(120000);
test.use({trace:'off',video:'off',viewport:{width:1600,height:1000}});
async function login(page:Page) {
  expect(base && api && username && password,'configured environment and real credentials').toBeTruthy();
  await page.goto(`${base}/login`);
  await page.getByPlaceholder('请输入用户名/手机号').fill(username!);
  await page.getByPlaceholder('请输入密码').fill(password!);
  await page.getByRole('button',{name:'登录',exact:true}).click();
  await expect(page).toHaveURL(/\/dashboard$/);
  return (await page.evaluate(()=>localStorage.getItem('token')))!;
}
async function queryAfter(page:Page, action:()=>Promise<unknown>, matches:(p:URLSearchParams)=>boolean) {
  const response=page.waitForResponse(r=>r.request().method()==='GET' && new URL(r.url()).pathname==='/api/admin/sensitive-words' && matches(new URL(r.url()).searchParams),{timeout:15000});
  const [,r]=await Promise.all([action(),response]);
  expect(r.status()).toBe(200);const data=await r.json();expect(data.code).toBe(200);return data.data;
}
test('FIX-04/FIX-05 real filters query immediately and reset page',async({page})=>{
  await login(page);
  await queryAfter(page,()=>page.goto(`${base}/sensitive-words`),p=>p.get('page')==='1');
  await expect(page.locator('tbody tr')).toHaveCount(20);
  await queryAfter(page,()=>page.getByRole('button',{name:'2',exact:true}).click(),p=>p.get('page')==='2');
  await page.getByRole('button',{name:'全部分类',exact:true}).click();
  const category=await queryAfter(page,()=>page.getByRole('button',{name:'色情词库',exact:true}).click(),p=>p.get('categoryCode')==='PORNOGRAPHY' && p.get('page')==='1');
  expect(category.records.length).toBeGreaterThan(0);
  expect(category.records.every((r:any)=>r.categoryCode==='PORNOGRAPHY')).toBe(true);
  await page.getByRole('button',{name:'全部状态',exact:true}).click();
  const disabled=await queryAfter(page,()=>page.locator('form').first().getByRole('button',{name:'停用',exact:true}).click(),p=>p.get('categoryCode')==='PORNOGRAPHY' && p.get('status')==='DISABLED');
  expect(disabled.records.every((r:any)=>r.status==='DISABLED')).toBe(true);
  await queryAfter(page,()=>page.getByRole('button',{name:'重置',exact:true}).click(),p=>!p.has('categoryCode') && !p.has('status') && p.get('page')==='1');
  const sample=category.records[0];
  const keyword=await queryAfter(page,()=>page.getByPlaceholder('搜索敏感词').fill(sample.word),p=>p.get('keyword')===sample.word);
  expect(keyword.records.some((r:any)=>r.id===sample.id)).toBe(true);
  await queryAfter(page,()=>page.getByPlaceholder('搜索敏感词').press('Enter'),p=>p.get('keyword')===sample.word);
  await queryAfter(page,()=>page.getByRole('button',{name:'搜索',exact:true}).click(),p=>p.get('keyword')===sample.word);
  await queryAfter(page,()=>page.getByRole('button',{name:'重置',exact:true}).click(),p=>!p.has('keyword') && !p.has('status') && !p.has('categoryCode'));
  await expect(page.getByPlaceholder('搜索敏感词')).toHaveValue('');
  await page.screenshot({path:path.join(artifacts,'sensitive-word-filters-fixed.png'),fullPage:true});
  fs.writeFileSync(path.join(artifacts,'sensitive-word-filters-fix-20260909.json'),JSON.stringify({result:'PASS',responsesMocked:false,immediateCategory:true,immediateStatus:true,immediateKeyword:true,pageReset:true,enter:true,search:true,reset:true,verifiedAt:new Date().toISOString()},null,2));
});
test('FIX-03 real peter browser disables and enables a temporary word',async({page})=>{
  const token=await login(page);
  const call=async(method:string,url:string,data?:unknown)=>{
    const r=await page.request.fetch(`${api}${url}`,{method,headers:{'X-Auth-Token':token},data});
    expect(r.status()).toBe(200);const body=await r.json();expect(body.code).toBe(200);return body.data;
  };
  expect(await call('GET','/admin/permissions')).toContain('sensitive-word:edit');
  const word='启停回归_'+crypto.randomUUID();
  const id=await call('POST','/admin/sensitive-words',{word,categoryCode:'OTHER',status:'ENABLED',remark:'浏览器启停回归临时词'});
  const statuses:string[]=[];
  try {
    await queryAfter(page,()=>page.goto(`${base}/sensitive-words`),p=>p.get('page')==='1');
    await expect(page.locator('tbody tr')).toHaveCount(20,{timeout:15000});
    await queryAfter(page,()=>page.getByPlaceholder('搜索敏感词').fill(word),p=>p.get('keyword')===word);
    const row=page.locator('tbody tr').filter({has:page.getByRole('cell',{name:word,exact:true})});
    await expect(row).toBeVisible({timeout:15000});
    for (const [label,next] of [['停用','DISABLED'],['启用','ENABLED']]) {
      const response=page.waitForResponse(r=>r.url().endsWith(`/sensitive-words/${id}/status`) && r.request().method()==='PATCH');
      await row.getByRole('button',{name:label,exact:true}).click();
      const r=await response;
      expect(await r.text(),`PATCH HTTP ${r.status()}`).not.toContain('Invalid CORS request');
      expect(r.status()).toBe(200);
      await expect(row.getByRole('cell',{name:label,exact:true})).toBeVisible({timeout:15000});
      expect((await call('GET',`/admin/sensitive-words/${id}`)).status).toBe(next); statuses.push(next);
    }
    await expect(page.getByText('无权限执行此操作',{exact:true})).toHaveCount(0);
    await queryAfter(page,()=>page.reload(),p=>p.get('page')==='1');
    await expect(page.locator('tbody tr')).toHaveCount(20,{timeout:15000});
    await queryAfter(page,()=>page.getByPlaceholder('搜索敏感词').fill(word),p=>p.get('keyword')===word);
    await expect(row.getByRole('cell',{name:'启用',exact:true})).toBeVisible();
    await page.screenshot({path:path.join(artifacts,'sensitive-word-status-fixed.png'),fullPage:true});
  } finally {
    expect((await call('GET',`/admin/sensitive-words/${id}`)).word).toBe(word);
    await call('DELETE',`/admin/sensitive-words/${id}`);
  }
  fs.writeFileSync(path.join(artifacts,'sensitive-word-status-fix-20260909.json'),JSON.stringify({result:'PASS',responsesMocked:false,account:username,statuses,temporaryWordDeleted:true,verifiedAt:new Date().toISOString()},null,2));
});
