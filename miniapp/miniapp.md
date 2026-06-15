日常开发流程：
 cd miniapp
 npm run dev:weapp    # 编译 + watch，改代码自动重新编译
 # 然后在微信开发者工具中查看效果

## 上传检查 / 包体积规范

微信开发者工具上传前必须先过静态门禁。主包目标是不含插件小于 `1.5M`，主包图片/音频资源总量小于 `200K`；当前 DevTools “代码包 图片和音频资源”检查也按全上传包口径控制在 `200K` 内，运行资产单文件不超过 `200K`。

**当前分包口径：**

| 包 | 页面 |
|----|------|
| 主包 | `pages/profile/index`、`pages/community/index`、`pages/chat/index`、`pages/index/index`、`pages/recommend/index`、`pages/recommend/post`、`pages/profile/edit` |
| `pages/login` | 授权、性别、年龄、学历、地址 |
| `pages/verification` | 三重认证、基本资料、头像、实名认证、学历认证等认证链路 |
| `pages/featured` | 精选 |
| `pages/membership` | 会员中心、会员记录 |
| `pages/coins` | 成家币、成家币明细 |
| `pages/assessment` | 测评 |

**强制约束：**

- `miniapp/config/index.ts` 必须关闭 SourceMap、关闭 Taro prebundle、开启 `optimizeMainPackage`，并通过 `imageUrlLoaderOption.name` 把登录/认证/精选/会员/成家币等分包专用图片输出到对应分包目录。
- `miniapp/src/app.config.ts` 保留 `lazyCodeLoading: 'requiredComponents'` 和微信官方字段 `subPackages`，不要写小写 `subpackages`。
- `miniapp/project.config.json`、`miniapp/project.private.config.json` 保留 `"lazyCodeLoading": "requiredComponents"`。
- `miniapp/project.config.json` 的 `packOptions.ignore` 必须忽略 `.lanhu-ref` 和 `.map`，`uploadWithSourceMap` 必须为 `false`。
- Tab 页面不能放进分包；分包 root 不能覆盖包含 Tab 页的目录，例如 `pages/profile`、`pages/recommend`。
- 蓝湖整屏参考图、压缩前原图、暂不用资源放 `miniapp/.lanhu-ref/`，不要放 `miniapp/src/assets`。
- 蓝湖切图必须自动转 WebP 后再进入 `miniapp/src/assets`；原始 PNG/JPG 只放 `miniapp/.lanhu-ref/` 或 `miniapp/.lanhu-ref/compressed-source-backup/`。
- 除 Tab 图标、小于 `4K` 的线性图标、确需透明像素且 WebP 体积不优的极小 PNG 外，运行时代码不得新增 `.png` / `.jpg` 大图。
- 运行时图片通过本地 import 引入；新增 WebP 依赖 `miniapp/types/global.d.ts` 的 `declare module '*.webp'`。
- 页面代码不得引用 `lanhuapp.com`、`alipic.lanhuapp.com`，也不得 import `.lanhu-ref` 下文件。
- 微信开发者工具看的是 `miniapp/dist` 上传包；不能只检查 `src/assets`。

**切图落地命令：**

```bash
mkdir -p miniapp/.lanhu-ref/compressed-source-backup/<模块名>
cp <切图原文件.png> miniapp/.lanhu-ref/compressed-source-backup/<模块名>/
cwebp -q 60 -m 6 -metadata none <切图原文件.png> -o miniapp/src/assets/<模块名>/<切图名>.webp
find miniapp/src/assets -type f \( -name '*.png' -o -name '*.jpg' -o -name '*.jpeg' \) -size +4k -print
```

最后一条必须无输出；确需保留超过 `4K` 的 PNG/JPG 时，需要在变更说明里写明原因。

**上传前静态核对：**

```bash
find miniapp/src/assets -type f \( -name '*.png' -o -name '*.jpg' -o -name '*.jpeg' -o -name '*.webp' -o -name '*.mp3' -o -name '*.mp4' \) -size +200k -print
find miniapp/dist -type f \( -name '*.png' -o -name '*.jpg' -o -name '*.jpeg' -o -name '*.webp' -o -name '*.mp3' -o -name '*.mp4' \) -size +200k -print
find miniapp/dist -type f | awk '!/miniapp\/dist\/pages\/(login|verification|featured|membership|coins|assessment)\// {print}' | xargs stat -f '%z' | awk '{s+=$1} END {printf "main-package-mib=%.2f\n", s/1024/1024}'
find miniapp/dist/assets -type f \( -name '*.png' -o -name '*.jpg' -o -name '*.jpeg' -o -name '*.webp' -o -name '*.mp3' -o -name '*.mp4' \) -exec stat -f '%z' {} + | awk '{s+=$1} END {printf "main-assets-kib=%.1f\n", s/1024}'
find miniapp/dist -type f \( -name '*.png' -o -name '*.jpg' -o -name '*.jpeg' -o -name '*.webp' -o -name '*.mp3' -o -name '*.mp4' \) -exec stat -f '%z' {} + | awk '{s+=$1} END {printf "all-assets-kib=%.1f\n", s/1024}'
du -sh miniapp/src/assets
du -sh miniapp/dist miniapp/dist/assets miniapp/dist/pages miniapp/dist/prebundle 2>/dev/null
rg -n "enableSourceMap|prebundle|optimizeMainPackage|imageUrlLoaderOption|lazyCodeLoading|subPackages|packOptions" miniapp/config/index.ts miniapp/src/app.config.ts miniapp/project.config.json miniapp/project.private.config.json
rg -n "subpackages" miniapp/src/app.config.ts miniapp/dist/app.json
rg -n "lanhuapp\\.com|alipic\\.lanhuapp|\\.lanhu-ref" miniapp/src
find miniapp/src/assets -type f \( -name '*.png' -o -name '*.jpg' -o -name '*.jpeg' \) -size +4k -print
node -e "const fs=require('fs'); JSON.parse(fs.readFileSync('miniapp/project.config.json','utf8')); JSON.parse(fs.readFileSync('miniapp/project.private.config.json','utf8')); console.log('json ok')"
git diff --check -- miniapp/src/app.config.ts miniapp/project.config.json miniapp/project.private.config.json miniapp/types/global.d.ts miniapp/src/assets
```

前两条和 PNG/JPG 大图扫描必须无输出；主包估算必须小于 `1.5M`，`main-assets-kib` 与 `all-assets-kib` 都必须小于 `200K`。`du` 只用于观察目录体积，不替代上传门禁。

**2026-06-09 上传包修正记录：**

- 当前上传包曾因 `dist` 残留旧 PNG 导致资源 `200K` 检查失败，不能只看 `src/assets`。
- 当前上传包曾因分包专用图片统一输出到根 `assets/` 导致主包超过 `1.5M`，后续必须保持分包图片输出到分包目录。
- 当前 `dist` 静态核对口径：图片/音视频超过 `200K` 为 `0`，主包估算约 `0.99M`，主包图片/音频资源约 `75.5K`，全上传包图片/音频资源约 `184.2K`；`src/assets` 运行资源约 `189.0K`。

## Mock 模式

项目内置全局 Mock 开关，在未接后端时可独立运行小程序完成所有页面流程。

**开关位置：** `src/constants/config.ts`

```typescript
/** 全局 Mock 开关：true=使用 Mock 数据不请求后端，false=正常请求后端 */
export const MOCK_ENABLED = true
```

**Mock 覆盖范围：**

| 模块 | Mock 行为 |
|------|----------|
| 登录 | 自动生成 mock token，跳过微信授权 |
| 实名认证 | 提交即通过（APPROVED） |
| 学历认证 | 提交即审核中（PENDING） |
| 头像认证 | 提交即通过 |
| 会员/成家币 | 使用 `services/mock.ts` 中的 mock 数据 |

**对接后端时：** 将 `MOCK_ENABLED` 改为 `false` 即可恢复真实请求。

ui https://lanhuapp.com/web/#/item/project/stage?pid=00cf551c-26f6-49e5-82db-1dc6fda9ca3a&image_id=0af138d0-cb20-4dd9-8eee-c82e951af16f&tid=428e8368-c279-4369-947b-a5828487924d

figma链接：https://www.figma.com/design/BqQhSLVSvuLYrZsgVlKmkU/%E6%88%90%E5%AE%B6%E7%AB%8B%E4%B8%9A?t=NH6dggfURmTA3PuA-1

## 2026-06-09 推荐朋友蓝湖还原记录

- 推荐首页覆盖 `觅知音 / 悦目 / 诚意贴` 三个二级 Tab，入口仍为 `/pages/recommend/index`。
- 推荐发布页按蓝湖 `推荐-朋友-诚意贴-发布动态` 还原，入口为 `/pages/recommend/post`。
- 推荐参考图归档在 `miniapp/.lanhu-ref/推荐/`。
- 推荐运行切图放在 `miniapp/src/assets/lanhu/recommend/slices/`，当前包括动态头像、城市 WebP 图和未认证弹窗插画。
- 页面运行代码不得引用远程蓝湖 CDN；背景图继续使用本地 `miniapp/src/assets/lanhu/recommend/recommend-bg.webp`。

## 2026-06-09 我的页底部栏修正记录

- 小程序启动页调整为 `/pages/profile/index`，用于默认进入蓝湖 `我的` 页面。
- `AppTabBar` 运行时固定同一套 DOM 结构，只切换 icon、文字颜色和字重，避免 `消息` 切到 `我的` 时整张底栏背景替换造成抖动或图标短暂丢失。
- `tabbar-bg.png` 仅保留为蓝湖视觉参考，不再作为运行时底栏背景。
- `编辑资料` 右箭头改为 CSS 斜角箭头，跟随 34rpx 高度 flex 居中，避免文本箭头在小程序中基线偏移。
- `我的` 页 VIP 横幅和“提升人气”按钮改用本地局部切图 `miniapp/src/assets/profile/vip-banner.webp`、`miniapp/src/assets/profile/boost-button.png`，不再手绘渐变和闪电字符。
- 菜单列表图标与文字间距收敛到蓝湖标注值，当前图标右侧间距约 `20rpx`，避免 47rpx 的空隙过大。
