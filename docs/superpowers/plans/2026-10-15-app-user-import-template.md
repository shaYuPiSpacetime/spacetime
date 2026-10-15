# App 用户导入模板与材料地址校验 Implementation Plan

> **For agentic workers:** 按 `executing-plans` 在当前会话逐项执行；不创建功能分支。

**Goal:** 修复下载模板错位、缺少户口字段和无效枚举示例，并将超长媒体地址转为逐行错误。

**Architecture:** 模板用同一组“表头+示例”键值对生成 CSV；页面只负责下载和说明。后端保留六层架构、既有必填配置、手机号重复保护与人工审核，在写库前按审核表的 500 字符约束校验独立材料地址。

**Tech Stack:** React 18、TypeScript、Node 内置测试；Java 21、JUnit 5、Mockito。

## Global Constraints

- 只在 master 修改、提交、Push；保留其他未提交文件。
- 不执行真实导入，不覆盖或删除已有用户，不改用户生日、认证资料或手机号。
- 不截断或剥离图片 URL 查询参数，避免破坏原图片。
- 截图女性 v17 未提供、服务器日志无访问权限，不能宣称其系统异常已定位。

### Task 1: 模板生成及契约回归

**Files:** `frontend/src/pages/customers/appUserImportTemplate.ts`（新增纯函数）、`CustomersPage.tsx`（接入）、`frontend/scripts/test-app-user-import-template.mjs`（新增）。

**Interfaces:** `buildImportTemplateCsv(): string`；72 个中文表头（原 71 个加“户口所在地”），每个定义直接绑定一个示例值。

- [x] 先执行旧模板红灯：解析现有实际生成的 CSV，断言表头数等于示例数；资料问答必须是 JSON 数组，认证方式必须是 `CHSI` 等启用 code。
- [x] 改为键值对，不再维护平行数组：

```ts
const fields = [
  ['资料问答', JSON.stringify([{ questionKey: 'meetingPreference', title: '见面偏好', answer: '周末咖啡或展览' }])],
  ['户口所在地', '河南省郑州市'],
] as const;
// 完整 72 字段以此结构定义；表头和值从同一项产生。
export function buildImportTemplateCsv(): string {
  return [0, 1].map(index => fields.map(field => `"${field[index].replace(/"/g, '""')}"`).join(',')).join('\n');
}
```

- [x] 删除页面旧模板数组/函数，保留错误报告依赖的 csvCell；补充示例必须换成真实资料、URL 长度和重复保护说明，纠正不存在的“先预校验”操作提示。
- [x] 执行 `node --test frontend/scripts/test-app-user-import-template.mjs`，再 `cd frontend; npm run build`。

### Task 2: 后端字段兼容与逐行材料校验

**Files:** `backend/src/main/java/com/spacetime/admin/service/impl/AppUserAdminServiceImpl.java`；`backend/src/test/java/com/spacetime/admin/service/AppUserAdminServiceImplTest.java`。

- [x] 先写红灯：中文“户口所在地”满足 residence 必填；501 字符头像地址返回带行号错误且不插用户；500 字符正常；相册逐张判断，不以拼接总长度误拒；背景图和语音同样检查。
- [x] 增加 `Map.entry("户口所在地", "residence")`，英文 residence 继续兼容。
- [x] 在必填和重复检查通过后调用 `validateImportMediaUrls(rowData)`，保留旧有重复报错优先级；对 avatarUrl、albumPhotoUrls 单项、profileBgImageUrl、voiceIntroUrl 返回字段、序号与 500 字符限制；不修改输入。
- [x] 审查补充：按生日计算年龄，无生日保留旧年龄；学历审核按人群/规范认证方式选择材料，规范 educationMaterialUrls 仍优先；新增 6 项入口红绿回归。
- [x] 执行 `mvn "-Dtest=AppUserAdminServiceImplTest,AppUserControllerTest,AppUserControllerNamespacedXlsxTest" test`（本机 JDK 21）。45/45 通过。

### Task 3: 审查与交付

- [x] 测试依据写入 `docs/测试文档/App用户导入模板与地址校验-testcase.md`；结果写独立 testreport。
- [x] 只读审查任务文件，核实没有跳过认证、截断 URL、真实写库或混入其他改动。审查发现两项 Important，补充用例修复后复核 Ready。
- [ ] 再同步远端、仅提交本任务文件、Push master；核对后台与后端部署结果。
- [ ] 按发布文档从当前源码构建小程序，独立目录校验哈希及 preview/upload 分包大小，上传体验版；明确本次功能修正在管理后台/后端。
