# 设置安全中心 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 设置 → 安全中心 → 反诈指南，完整展示指定原图。

**Architecture:** 复用 SettingsShell 和 settings-row 样式，两个新页面注册在 pages/settings 分包。原图存档并原样上传 OSS，运行页仅引用生成的公网地址。资产上传器支持指定资源，避免重传或覆盖其他资源清单。

**Tech Stack:** Taro 4.1.9、React 18、TypeScript、SCSS、Node test、微信 CLI。

## Global Constraints

- 仅 master；修改前和发布前实际同步 origin/master，只提交本次文件。
- 原图不压缩、不裁剪、不转换；不引入包内大图，不改聊天及认证。
- 两页均自定义导航，不模拟微信原生胶囊。
- 发布使用全新独立目录，校验逐文件 SHA256 和 preview/upload 分包字节数。

## Task 1: 导航、指南及原图交付

**Files:**

- 修改 `miniapp/src/pages/settings/index.tsx`、`miniapp/src/app.config.ts`。
- 新增 `miniapp/src/pages/settings/security-center.tsx`、`anti-fraud-guide.tsx` 及各自 `.config.ts`，新增 `security.scss`；SettingsShell 可选 overlay 把退出弹层放在滚动内容之外。
- 修改 `miniapp/scripts/upload-miniapp-oss-icons.mjs`、生成 `miniapp/src/constants/ossIcons.ts`；原图存档 `docs/素材/安全中心/anti-fraud-guide.jpg`。
- 测试 `miniapp/scripts/test-settings-security-center.cjs`、`test-oss-icon-upload-selection.cjs`。

**Interfaces:** 消费 SettingsShell 的 title/scroll/className；输出两个注册路由和 miniappOssIcons.settingsAntiFraudGuide 公网原图地址。

- [x] 测试先行：实际执行页面组件、点按钮并断言 navigateTo；测试图片 widthFix、加载失败重试、ready 时 previewImage 参数与 preview 拒绝提示。上传工具选择测试须断言 `--only=key` 不读取其他资源，合并后其他 URL 不变，未知 key 在上传前拒绝。
- [x] 运行 `node --test miniapp/scripts/test-settings-security-center.cjs miniapp/scripts/test-oss-icon-upload-selection.cjs`，确认因入口和页面尚未实现而失败。
- [x] 设置增加 `<SettingsRow label="安全中心" arrow onClick={() => void Taro.navigateTo({ url: '/pages/settings/security-center' })} />`；安全页真实 Button 跳转 `/pages/settings/anti-fraud-guide`；指南状态 `loading | ready | error`，Image `mode="widthFix"`，ready 时调用 `Taro.previewImage({current:src,urls:[src]})`，异常 toast，错误时重试创建新 Image。
- [x] 将两页加入 settings subPackages；配置 `definePageConfig({ navigationStyle: 'custom' })`。指南 SCSS 设置 Image width:100%，内容底部安全区，复用滚动壳；设置首页启用 scroll 保证新增第八行在小屏可达。页面数门禁同步为89，保留完整隔离检查。
- [x] 上传器增加 `selectAssets(assets,args)`、`mergeManifestEntries(existing,updates)`；无 --only 保持旧行为，有 --only 时保留已生成清单其他条目，只上传选定原图。执行 `npm run assets:upload-icons -- --only=settingsAntiFraudGuide`。
- [x] 运行上述测试及 `node --test miniapp/scripts/test-settings-lanhu-flow.cjs`，校验远端原图长度与 SHA256 等于源文件。
- [x] 运行一次 `npm run prebuild:weapp`，记录结果；提交前只复核任务 diff/远端，不重复全量测试。首次因旧页面数期望失败，更新门禁后395项通过；scoped最终16项通过。
- [x] scoped commit/push master；本次源码构建、postbuild、全新目录复制哈希审计、CLI preview、核对远端 SHA、upload 同一目录并逐分包比较。更新独立测试报告，真机未实测时不宣称真机验收通过。体验版2026.10.13.1854；440文件哈希一致、主包及13分包字节一致。
