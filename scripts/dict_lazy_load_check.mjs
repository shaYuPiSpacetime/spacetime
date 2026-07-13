import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');
const read = (relativePath) => fs.readFileSync(path.join(root, relativePath), 'utf8');

const api = read('frontend/src/api/dict.ts');
const page = read('frontend/src/pages/admin/DictDataManagement.tsx');
const miniappController = read('backend/src/main/java/com/spacetime/miniapp/controller/MiniappDictController.java');
const miniappService = read('backend/src/main/java/com/spacetime/miniapp/service/impl/MiniappDictServiceImpl.java');

const failures = [];
const requireText = (source, text, message) => {
  if (!source.includes(text)) failures.push(message);
};
const forbidText = (source, text, message) => {
  if (source.includes(text)) failures.push(message);
};

requireText(api, '/admin/dict-data/children', '后台字典 API 未切换到子节点懒加载接口');
requireText(page, 'getDictDataChildren', '后台字典页未按节点加载子级');
forbidText(page, 'setExpandedIds(allIds)', '后台字典页仍默认展开全部节点');
forbidText(page, 'getDictDataTree', '后台字典页仍调用全量树接口');
requireText(miniappController, 'parentCode', '移动端地区接口未接收父级编码');
requireText(miniappService, 'selectChildren', '移动端地区服务仍未按父级查询');
forbidText(miniappService, 'selectByDictType(CHINA_REGION_DICT_TYPE)', '移动端地区服务仍一次查询全部地区');

if (failures.length > 0) {
  console.error(failures.map((item) => `- ${item}`).join('\n'));
  process.exit(1);
}

console.log('地区字典分级懒加载静态检查通过');
