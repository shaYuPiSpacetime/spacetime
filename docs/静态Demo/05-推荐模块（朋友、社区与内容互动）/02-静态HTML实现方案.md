# PRD-05 静态 HTML 实现方案

## 1. 实现结构

- `html/miniapp.html`：页面结构、导航和弹层容器。
- `html/mock/demo-data.js`：互动历史、关系、收藏、草稿、话题社交证明等本地数据。
- `html/assets/demo.js`：原生 JavaScript 状态机、渲染和点击事件。
- `html/assets/demo.css`：沿用现有 token 与卡片体系，新增状态样式。

## 2. 关键实现口径

1. 收藏使用 `favoritePostIds` 记录最终态，按钮和数量同步刷新。
2. 上传图片使用 `uploadStatus`，非 success 状态禁用提交；重试后恢复 success。
3. 草稿保存正文、标题、话题和上传成功图片；恢复只回填，不自动提交。
4. `hiddenPostId` 与 `hiddenAuthor` 分别实现单内容和作者级过滤。
5. 新增三页使用独立 Tab 状态，切换后只刷新对应页面数据。

## 3. 验收门禁

执行：

```bash
node docs/静态Demo/05-推荐模块（朋友、社区与内容互动）/verify-reverse-gaps.mjs
```

校验页面锚点、收藏、草稿、上传状态、术语和两级屏蔽等 14 项静态契约。

