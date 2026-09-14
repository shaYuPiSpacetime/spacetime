# 主页预览照片 - 测试报告

## 测试概况

- 日期：2026-09-14；分支：master，基于 `65b6dd45` 的本地改动。
- 依据：[主页预览照片-testcase.md](./主页预览照片-testcase.md)。
- 修复：将关于我移动到相册图片之后，首张照片紧跟自我介绍；继续展示全部有效照片。
- 后端相册读取与前端6槽位映射经只读核对，无需修改接口或数据库。

## 结果

| 项目 | 结果 |
|---|---|
| 新增实际组件/相册映射回归 | 8/8通过，覆盖PHOTO-01～05 |
| 原资料页及体验回归 | 40/40通过 |
| 预览蓝湖静态门禁 | 通过 |
| 修改的TSX文件 ESLint | 通过 |
| 浏览器局部截图与图片解码 | 修改前后各覆盖6张/空相册；6个节点URL及解码均通过 |
| Taro编译 | 成功，15.35秒；保留既有私信页体积建议警告 |
| 构建后产物门禁 | 3项通过；85个页面注册正常、无开发Token、主包1.24MiB/总包2.25MiB |
| 完整前置门禁 | 未重复执行；此前已确认的会员中心参考图仍缺失 |
| 线上接口/微信真机 | 未执行，缺少反馈账号的有效登录环境 |

修复前新增8项中，关于本人预览、公开主页及无简介场景的3项顺序断言失败；其余5项通过。修复后48项全部通过。测试脚本首次编写时的TypeScript编译选项遗漏已修正，该脚本问题不计作业务缺陷复现。

## 执行命令

```bash
cd miniapp
node --test scripts/test-profile-preview-photos.cjs scripts/test-profile-edit-closure.cjs scripts/test-0831-miniapp-experience-fixes.cjs
node scripts/validate-profile-preview-lanhu.mjs
./node_modules/.bin/eslint src/pages/profile/components/ProfilePreviewPage.tsx
node scripts/test-profile-preview-photos.cjs --screenshots before
node scripts/test-profile-preview-photos.cjs --screenshots after
./node_modules/.bin/taro build --type weapp
npm run postbuild:weapp
```

`before` 截图在修改生产组件前执行，`after` 在修改后执行。Playwright自带浏览器未安装，改用本机已有Chrome完成截图，无需安装依赖。新回归已接入现有 `test:0831-fixes`，随既有开发/构建前置流程执行。

## 结论与限制

本次布局修复的本地回归通过；线上与真机验收待补。当前工作区仍缺少 `.lanhu-ref/lanhu-full-2026-07-07/images/08-会员中心-全.png`，因此单独验证编译，不宣称完整构建前置流程通过。

没有取得反馈账号的线上相册响应或图片加载日志，不能把本次布局问题等同于所有“图片完全加载失败”的原因。修改前样例中6张照片实际均已渲染，只是被较长关于我推到了后面；修改后首张照片已在正确位置出现。

截图、差异和范围说明见[局部验收报告](../验收报告/2026-09-14-主页预览照片-蓝湖还原-acceptance.md)。

## 本轮复核（2026-09-14）

接续处理时，工作区已包含上述组件顺序修复及回归脚本。本轮保留既有修复，重新执行照片、资料编辑及体验回归，共48项全部通过（失败0、跳过0）；预览蓝湖静态门禁、目标TSX文件ESLint及定向`git diff --check`均通过。

重新核对了相册接口实现、六槽位映射和预览模型传递，并打开已有`after-six.png`与`after-empty.png`复核：首张照片紧跟自我介绍，关于我位于照片之后；空相册不生成图片卡。本轮未重新编译或生成截图，上文编译及截图执行结果为此前记录。反馈账号线上接口和微信真机仍未实测。
