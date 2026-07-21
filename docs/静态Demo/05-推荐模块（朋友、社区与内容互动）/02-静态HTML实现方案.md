# PRD-05 静态 HTML 实现方案

## 1. 实现结构

- `html/miniapp.html`：页面结构、导航和弹层容器。
- `html/mock/demo-data.js`：互动历史、关系、草稿、话题参与数据和审核态等本地数据。
- `html/assets/demo.js`：原生 JavaScript 状态机、渲染和点击事件。
- `html/assets/demo.css`：沿用现有 token 与卡片体系，新增状态样式。

## 2. 关键实现口径

1. 同城筛选固定使用 `currentUser.city`；`citySource=已审核资料`、`cityReadOnly=true`，页面不提供城市编辑控件。
2. 上传图片使用 `uploadStatus`，非 success 状态禁用提交；重试后恢复 success。
3. 草稿保存正文、标题、话题和上传成功图片；恢复只回填，不自动提交。
4. 提交成功后新增“我的动态”待复核卡片并跳转，不弹发布成功或审核结果提示。
5. 举报以 `reporterId + targetType + targetId` 作为处理中幂等键；点击原因直接提交并复用通用 toast。
6. 详情评论使用 `commentSort=latest/earliest`；点赞/评论用户使用通用列表与空态。
7. `hiddenAuthor` 只实现作者级“不看 TA 动态”；内容对象不提供单条屏蔽。
8. `interactionEstablished` 控制“申请认识”与“发消息”互斥；发消息直接模拟进入 PRD-03。
9. 发布话题 chips 只渲染启用话题，话题详情始终按快照展示；发布与草稿均不包含 @Ta。

## 3. 验收门禁

执行：

```bash
node docs/静态Demo/05-推荐模块（朋友、社区与内容互动）/verify-reverse-gaps.mjs
```

校验页面锚点、草稿、上传状态、互动路由、更多菜单、举报幂等和通用空态等静态契约。

最终 UI 口径另执行 `verify-ui-final-alignment.mjs`，同时校验 PRD、Demo 与蓝湖缺失清单。

同城范围另执行 `verify-city-scope.mjs`，校验 PRD、Demo 与蓝湖缺失清单不再出现本期外能力，并包含“资料城市只读、完善资料、去热门”最终口径。
