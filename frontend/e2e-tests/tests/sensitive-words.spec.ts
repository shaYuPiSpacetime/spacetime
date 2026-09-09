import { expect, test, type Page } from '@playwright/test';

const permissions = [
  'sensitive-word:list',
  'sensitive-word:add',
  'sensitive-word:edit',
  'sensitive-word:delete',
];

async function authenticate(page: Page, grantedPermissions = permissions) {
  await page.addInitScript(({ perms }) => {
    localStorage.setItem('token', 'sensitive-word-e2e-token');
    localStorage.setItem('auth', JSON.stringify({
      state: { token: 'sensitive-word-e2e-token', user: { nickname: '内容管理员', permissions: perms } },
      version: 0,
    }));
  }, { perms: grantedPermissions });
  await page.route(url => url.pathname.startsWith('/api/'), route => route.fulfill({ json: { code: 200, data: [] } }));
  await page.route('**/api/admin/permissions', route => route.fulfill({ json: { code: 200, data: grantedPermissions } }));
}

test('L4-01/L4-04 supports filtering and does not expose bulk import', async ({ page }) => {
  await authenticate(page);
  const listQueries: string[] = [];
  await page.route('**/api/admin/sensitive-words/categories', route => route.fulfill({
    json: { code: 200, data: [{ code: 'POLITICS', name: '政治类型' }, { code: 'OTHER', name: '其他词库' }] },
  }));
  await page.route('**/api/admin/sensitive-words?**', route => {
    listQueries.push(route.request().url());
    return route.fulfill({ json: { code: 200, data: { records: [], total: 0, current: 1, size: 10 } } });
  });

  await page.goto('/sensitive-words');
  await expect(page.getByRole('heading', { name: '敏感词管理' })).toBeVisible();
  await expect(page.getByText('批量导入')).toHaveCount(0);

  await page.getByPlaceholder('搜索敏感词').fill('测试词');
  await page.getByRole('button', { name: '全部分类' }).click();
  await page.getByRole('button', { name: '政治类型' }).click();
  await page.getByRole('button', { name: '搜索', exact: true }).click();
  await expect.poll(() => listQueries.at(-1) ?? '').toContain('keyword=%E6%B5%8B%E8%AF%95%E8%AF%8D');
  expect(listQueries.at(-1)).toContain('categoryCode=POLITICS');
});

test('L4-02 creates a sensitive word and refreshes the list', async ({ page }) => {
  await authenticate(page);
  let createBody: unknown;
  let listRequestCount = 0;
  await page.route('**/api/admin/sensitive-words/categories', route => route.fulfill({
    json: { code: 200, data: [{ code: 'OTHER', name: '其他词库' }] },
  }));
  await page.route('**/api/admin/sensitive-words?**', route => {
    listRequestCount += 1;
    return route.fulfill({ json: { code: 200, data: { records: [], total: 0, current: 1, size: 10 } } });
  });
  await page.route('**/api/admin/sensitive-words', async route => {
    if (route.request().method() !== 'POST') return route.fallback();
    createBody = route.request().postDataJSON();
    return route.fulfill({ json: { code: 200, data: 101 } });
  });

  await page.goto('/sensitive-words');
  await page.getByRole('button', { name: '新增敏感词' }).click();
  await page.getByPlaceholder('请输入敏感词').fill('示例敏感词');
  await page.getByRole('dialog').getByRole('button', { name: '请选择分类' }).click();
  await page.getByRole('dialog').getByRole('button', { name: '其他词库' }).click();
  await page.getByRole('button', { name: '保存', exact: true }).click();

  await expect.poll(() => listRequestCount).toBeGreaterThan(1);
  expect(createBody).toMatchObject({ word: '示例敏感词', categoryCode: 'OTHER', status: 'ENABLED' });
  await expect(page.getByRole('dialog')).toHaveCount(0);
});

test('L4-03 list permission denial sends no sensitive-word requests', async ({ page }) => {
  await authenticate(page, []);
  let requestCount = 0;
  await page.route('**/api/admin/sensitive-words**', route => {
    requestCount += 1;
    return route.fulfill({ json: { code: 200, data: [] } });
  });

  await page.goto('/sensitive-words');
  await expect(page.getByText('您没有访问该页面的权限')).toBeVisible();
  expect(requestCount).toBe(0);
});

const row = { id: 101, word: '原词', categoryCode: 'OTHER', categoryName: '其他词库', status: 'ENABLED', remark: '旧备注' };
async function fixture(page: Page, perms = permissions) {
  await authenticate(page, perms);
  await page.route('**/api/admin/sensitive-words/categories', r => r.fulfill({ json: { code: 200, data: [{code:'OTHER',name:'其他词库'}] } }));
  await page.route('**/api/admin/sensitive-words?**', r => r.fulfill({ json: { code: 200, data: {records:[row],total:1,current:1,size:20} } }));
}
test('L4-02 current detail, clear remark, PATCH only status', async ({page}) => {
  await fixture(page);
  const writes: unknown[] = [];
  await page.route('**/api/admin/sensitive-words/101', r => {
    if(r.request().method()==='GET') return r.fulfill({json:{code:200,data:{...row,word:'最新词'}}});
    writes.push({method:r.request().method(),body:r.request().postDataJSON()});
    return r.fulfill({json:{code:200,data:null}});
  });
  await page.route('**/api/admin/sensitive-words/101/status', r => {
    writes.push({method:r.request().method(),body:r.request().postDataJSON()});
    return r.fulfill({json:{code:200,data:null}});
  });
  await page.goto('/sensitive-words');
  await page.getByRole('button',{name:'编辑',exact:true}).click();
  await expect(page.getByLabel('敏感词',{exact:true})).toHaveValue('最新词');
  await page.getByLabel('备注',{exact:true}).fill('');
  await page.getByRole('button',{name:'保存',exact:true}).click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await page.getByRole('button',{name:'停用',exact:true}).click();
  await expect.poll(()=>writes.length).toBe(2);
  expect(writes).toEqual([
    {method:'PUT',body:{word:'最新词',categoryCode:'OTHER',status:'ENABLED',remark:''}},
    {method:'PATCH',body:{status:'DISABLED'}}
  ]);
});
test('L4-06 invalid and duplicate input retains form', async ({page}) => {
  await fixture(page); let writes=0;
  await page.route('**/api/admin/sensitive-words',r=>{writes++;return r.fulfill({json:{code:400,msg:'敏感词已存在'}});});
  await page.goto('/sensitive-words'); await page.getByRole('button',{name:'新增敏感词'}).click();
  const d=page.getByRole('dialog'), save=d.getByRole('button',{name:'保存',exact:true});
  await save.click(); await expect(d.getByRole('alert')).toHaveText('请填写敏感词');
  await page.getByPlaceholder('请输入敏感词').fill('a'.repeat(257));
  await save.click(); await expect(d.getByRole('alert')).toHaveText('敏感词不能超过256个字符');expect(writes).toBe(0);
  await page.getByPlaceholder('请输入敏感词').fill('重复词');
  await d.getByRole('button',{name:'请选择分类'}).click(); await d.getByRole('button',{name:'其他词库'}).click();
  await page.getByLabel('备注',{exact:true}).fill('保留这个输入');await save.click();
  await expect(d.getByRole('alert')).toHaveText('敏感词已存在');
  await expect(page.getByPlaceholder('请输入敏感词')).toHaveValue('重复词');
  await expect(page.getByLabel('备注',{exact:true})).toHaveValue('保留这个输入');expect(writes).toBe(1);
});
test('L4-06 delete confirmation and empty final page fallback',async({page})=>{
  await fixture(page);let deleted=false,deletes=0;
  await page.route('**/api/admin/sensitive-words?**',r=>{
    const n=Number(new URL(r.request().url()).searchParams.get('page'));
    return r.fulfill({json:{code:200,data:{records:n===2?(deleted?[]:[row]):[{...row,id:100,word:'上一页词'}],total:deleted?20:21,current:n,size:20}}});
  });
  await page.route('**/api/admin/sensitive-words/101',r=>{
    expect(r.request().method()).toBe('DELETE');deleted=true;deletes++;return r.fulfill({json:{code:200,data:null}});
  });
  await page.goto('/sensitive-words');await page.getByRole('button',{name:'2',exact:true}).click();
  await expect(page.getByRole('cell',{name:'原词',exact:true})).toBeVisible();
  await page.getByRole('button',{name:'删除',exact:true}).click();expect(deletes).toBe(0);
  await page.getByRole('dialog').getByRole('button',{name:'取消',exact:true}).click();expect(deletes).toBe(0);
  await page.getByRole('button',{name:'删除',exact:true}).click();
  await page.getByRole('button',{name:'确认删除',exact:true}).click();
  await expect(page.getByText('共20条记录 第 1 / 1 页')).toBeVisible();
  await expect(page.getByRole('cell',{name:'上一页词',exact:true})).toBeVisible();expect(deletes).toBe(1);
});
test('L4-06 stale response cannot replace newer search',async({page})=>{
  await fixture(page);let release!:()=>void,oldRequested=false;
  const pending=new Promise<void>(resolve=>{release=resolve;});
  await page.route('**/api/admin/sensitive-words?**',async r=>{
    const k=new URL(r.request().url()).searchParams.get('keyword');
    if(k==='旧查询'){oldRequested=true;await pending;}
    await r.fulfill({json:{code:200,data:{records:[{...row,word:k||'初始词'}],total:1,current:1,size:20}}});
  });
  await page.goto('/sensitive-words');
  await page.getByPlaceholder('搜索敏感词').fill('旧查询');await page.getByRole('button',{name:'搜索',exact:true}).click();
  await expect.poll(()=>oldRequested).toBe(true);
  await page.getByPlaceholder('搜索敏感词').fill('新查询');await page.getByRole('button',{name:'搜索',exact:true}).click();
  await expect(page.getByRole('cell',{name:'新查询',exact:true})).toBeVisible();
  const response=page.waitForResponse(r=>r.url().includes('keyword=%E6%97%A7%E6%9F%A5%E8%AF%A2'));
  release();await response;
  await expect(page.getByRole('cell',{name:'新查询',exact:true})).toBeVisible();
  await expect(page.getByRole('cell',{name:'旧查询',exact:true})).toHaveCount(0);
});
test('L4-06 write success is separate from reload failure',async({page})=>{
  await fixture(page);let saved=false;
  await page.route('**/api/admin/sensitive-words/101',r=>{
    if(r.request().method()==='GET')return r.fulfill({json:{code:200,data:row}});
    saved=true;return r.fulfill({json:{code:200,data:null}});
  });
  await page.route('**/api/admin/sensitive-words?**',r=>r.fulfill({json:saved?{code:500,msg:'列表暂时不可用'}:{code:200,data:{records:[row],total:1,current:1,size:20}}}));
  await page.goto('/sensitive-words');await page.getByRole('button',{name:'编辑',exact:true}).click();
  await page.getByRole('button',{name:'保存',exact:true}).click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(page.getByText('敏感词保存成功',{exact:true})).toBeVisible();
  await expect(page.getByRole('alert').filter({has:page.getByRole('button',{name:'重新加载',exact:true})})).toContainText('列表暂时不可用');
  await expect(page.getByRole('button',{name:'重新加载',exact:true})).toBeVisible();
});
test('L4-03 read only buttons',async({page})=>{
  await fixture(page,['sensitive-word:list']);await page.goto('/sensitive-words');
  await expect(page.getByRole('cell',{name:'原词',exact:true})).toBeVisible();
  for(const name of ['新增敏感词','编辑','停用','删除'])await expect(page.getByRole('button',{name,exact:true})).toHaveCount(0);
});

test('L4-06 delayed status write reloads the current search, never the old query',async({page})=>{
  await fixture(page);let release!:()=>void,patchStarted=false;
  const pending=new Promise<void>(resolve=>{release=resolve;});
  const queries:string[]=[];
  await page.route('**/api/admin/sensitive-words?**',r=>{
    const k=new URL(r.request().url()).searchParams.get('keyword')||'原词';queries.push(k);
    return r.fulfill({json:{code:200,data:{records:[{...row,word:k}],total:1,current:1,size:20}}});
  });
  await page.route('**/api/admin/sensitive-words/101/status',async r=>{patchStarted=true;await pending;await r.fulfill({json:{code:200,data:null}});});
  await page.goto('/sensitive-words');await page.getByRole('button',{name:'停用',exact:true}).click();
  await expect.poll(()=>patchStarted).toBe(true);
  await page.getByPlaceholder('搜索敏感词').fill('新筛选');await page.getByRole('button',{name:'搜索',exact:true}).click();
  await expect(page.getByRole('cell',{name:'新筛选',exact:true})).toBeVisible();
  const count=queries.length;release();await expect.poll(()=>queries.length).toBeGreaterThan(count);
  await expect(page.getByRole('cell',{name:'新筛选',exact:true})).toBeVisible();
  expect(queries.at(-1)).toBe('新筛选');
});

const allCategories = [{"code": "SENSITIVE_LEXICON", "name": "SensitiveLexicon"}, {"code": "COVID_19", "name": "COVID-19词库"}, {"code": "GFW_SUPPLEMENT", "name": "GFW补充词库"}, {"code": "OTHER", "name": "其他词库"}, {"code": "REACTIONARY", "name": "反动词库"}, {"code": "ADVERTISEMENT", "name": "广告类型"}, {"code": "POLITICS", "name": "政治类型"}, {"code": "NEW_THOUGHT", "name": "新思想启蒙"}, {"code": "TERRORISM", "name": "暴恐词库"}, {"code": "LIVELIHOOD", "name": "民生词库"}, {"code": "WEAPONS", "name": "涉枪涉爆"}, {"code": "NETEASE", "name": "网易前端过滤敏感词库"}, {"code": "PORNOGRAPHY_TYPE", "name": "色情类型"}, {"code": "PORNOGRAPHY", "name": "色情词库"}, {"code": "SUPPLEMENT", "name": "补充词库"}, {"code": "CORRUPTION", "name": "贪腐词库"}, {"code": "TENCENT", "name": "零时-Tencent"}, {"code": "ILLEGAL_URL", "name": "非法网址"}];

test('L4-01 all eighteen single-select categories, paging and reset',async({page})=>{
  await fixture(page);const queries:string[]=[];
  await page.route('**/api/admin/sensitive-words/categories',r=>r.fulfill({json:{code:200,data:allCategories}}));
  await page.route('**/api/admin/sensitive-words?**',r=>{
    queries.push(r.request().url());const n=Number(new URL(r.request().url()).searchParams.get('page'));
    return r.fulfill({json:{code:200,data:{records:[row],total:42,current:n,size:20}}});
  });
  await page.goto('/sensitive-words');
  await page.getByRole('button',{name:'全部分类',exact:true}).click();
  for(const category of allCategories)await expect(page.getByRole('button',{name:category.name,exact:true})).toHaveCount(1);
  await page.getByRole('button',{name:'非法网址',exact:true}).click();
  await page.getByPlaceholder('搜索敏感词').fill('筛选词');
  await page.getByRole('button',{name:'全部状态',exact:true}).click();
  await page.locator('form').first().getByRole('button',{name:'停用',exact:true}).click();
  await page.getByRole('button',{name:'搜索',exact:true}).click();
  await expect.poll(()=>queries.at(-1)||'').toContain('categoryCode=ILLEGAL_URL');
  expect(queries.at(-1)).toContain('status=DISABLED');
  await page.getByRole('button',{name:'2',exact:true}).click();
  await expect.poll(()=>queries.at(-1)||'').toContain('page=2');
  await page.getByRole('button',{name:'重置',exact:true}).click();
  await expect(page.getByPlaceholder('搜索敏感词')).toHaveValue('');
  await expect(page.getByRole('button',{name:'全部分类',exact:true})).toBeVisible();
  await expect(page.getByRole('button',{name:'全部状态',exact:true})).toBeVisible();
  await expect.poll(()=>queries.at(-1)||'').toContain('page=1');
  const last=new URL(queries.at(-1)!);
  expect(last.searchParams.has('keyword')).toBe(false);expect(last.searchParams.has('status')).toBe(false);expect(last.searchParams.has('categoryCode')).toBe(false);
});


test('L4-09 root page remains visible beside grouped menus', async ({ page }) => {
  await fixture(page);
  await page.route('**/api/admin/routers', route => route.fulfill({ json: { code: 200, data: [
    { id: 1, path: '/settings', sort: 1, meta: { title: '系统管理' }, children: [
      { id: 2, path: '/settings/users', sort: 1, meta: { title: '用户管理' } },
    ] },
    { id: 3, path: '/sensitive-words', sort: 75, meta: { title: '敏感词管理', icon: 'ShieldAlert' }, children: [] },
    { id: 4, path: null, sort: 80, meta: { title: '无可见页面的目录' }, children: [] },
  ] } }));
  await page.goto('/sensitive-words');
  const link = page.getByRole('link', { name: '敏感词管理', exact: true });
  await expect(link).toBeVisible();
  await expect(link).toHaveAttribute('href', '/sensitive-words');
  await expect(page.getByText('无可见页面的目录')).toHaveCount(0);
  await expect(link).toHaveCSS('padding-left', '16px');
  await page.getByRole('button', { name: '系统管理', exact: true }).click();
  await expect(page.getByRole('link', { name: '用户管理', exact: true })).toBeVisible();
  await link.click();
  await expect(page).toHaveURL(/\/sensitive-words$/);
});


test('FIX-04/FIX-05 filters request immediately without search button',async({page})=>{
  await fixture(page);const queries:URLSearchParams[]=[];
  await page.route('**/api/admin/sensitive-words?**',r=>{
    const params=new URL(r.request().url()).searchParams;queries.push(params);
    return r.fulfill({json:{code:200,data:{records:[row],total:42,current:Number(params.get('page')),size:20}}});
  });
  await page.goto('/sensitive-words');
  await expect(page.getByRole('cell',{name:'原词',exact:true})).toBeVisible();
  await page.getByRole('button',{name:'2',exact:true}).click();
  await expect.poll(()=>queries.at(-1)?.get('page')).toBe('2');
  await page.getByRole('button',{name:'全部分类',exact:true}).click();
  await page.getByRole('button',{name:'其他词库',exact:true}).click();
  await expect.poll(()=>queries.at(-1)?.get('categoryCode')).toBe('OTHER');
  expect(queries.at(-1)?.get('page')).toBe('1');
  await page.getByRole('button',{name:'全部状态',exact:true}).click();
  await page.locator('form').first().getByRole('button',{name:'停用',exact:true}).click();
  await expect.poll(()=>queries.at(-1)?.get('status')).toBe('DISABLED');
  await page.getByPlaceholder('搜索敏感词').fill('即时查询');
  await expect.poll(()=>queries.at(-1)?.get('keyword')).toBe('即时查询');
  expect(queries.at(-1)?.get('categoryCode')).toBe('OTHER');
  const count=queries.length;
  await page.getByPlaceholder('搜索敏感词').press('Enter');
  await expect.poll(()=>queries.length).toBeGreaterThan(count);
  await page.getByRole('button',{name:'重置',exact:true}).click();
  await expect.poll(()=>queries.at(-1)?.has('keyword')).toBe(false);
});
