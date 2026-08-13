# 知音悦目心动图标验收报告

## 验收结论

“知音-悦目”卡片右下角心动操作已替换为用户指定的珊瑚红圆形白心完整切图；保留原有 `54×54rpx` 视觉尺寸、右侧 `20rpx` 与底部 `26rpx` 定位，以及心动/取消心动交互。旧的“背景色 + 点赞图标 + CSS 反白滤镜”拼装方式已移除。

## 素材与实现

- 原始素材：`196×196px`、RGBA PNG。
- 仓库源文件：`miniapp/src/assets/lanhu/qianxun-community/yuemu-heart.png`。
- 原图、本地源文件与 OSS 公网回读文件的 SHA-256 均为 `c1afc7dde639e388637e82dd8bbc94b2bf359fea50a427322d9f15b91183c24f`，确认未压缩、未缩放、未转换格式。
- 页面通过 `miniappOssIcons.qianxunYuemuHeart` 引用 OSS 公网资源，未新增本地包运行时引用。

## 自动验证

- TDD 红灯：新门禁在实现前以“悦目右下角必须使用用户指定的完整圆形心动 OSS 切图”失败。
- `node scripts/validate-qianxun-tab-and-zhiyin.mjs`：通过。
- `node scripts/validate-qianxun-community-interaction-closure.mjs`：通过。
- `npm run assets:upload-icons -- --dry-run`：通过，共校验 119 个非底部图标源文件。
- `npm run assets:upload-icons`：通过，共原样上传 119 个非底部图标并更新常量清单。
- `npm run build:weapp`：通过；84 个页面注册门禁通过，主包 1.35 MiB，千寻分包 116.2 KiB，总包 2.10 MiB。
- `git diff --check`：通过。

## 运行态截图限制

微信开发者工具自动化 WebSocket 能连接，但读取设备信息连续超时，因此本轮未生成新的运行态截图，也未复用旧截图冒充本轮证据。代码尺寸、OSS 原图哈希和完整小程序构建均已闭环；视觉截图仍需在开发者工具自动化通道恢复后补录。

## 变更边界

本轮仅追加知音悦目心动素材、OSS 映射、页面引用及对应回归门禁。工作区中原有的消息私信卡片相关未提交修改均保留，未覆盖、回滚或纳入本轮结论。
