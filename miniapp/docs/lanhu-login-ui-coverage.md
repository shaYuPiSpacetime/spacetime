# 蓝湖登录 9 稿对照清单

目标：登录域每一张 UI 稿都有独立可打开入口、明确变体、页面实现证据和自动校验覆盖。

| 蓝湖 UI 稿 | 落地入口 | 还原要点 | 自动校验证据 |
| --- | --- | --- | --- |
| 登录-年龄选择 | `/pages/login/age` | 出生年月日三列选择器；1997/10/01 默认值来自 `lanhuDemo.login.ageRange.defaultBirthday`；下一步默认浅蓝态。 | `validate-login-ui-coverage.mjs` 校验 `getDemoPageData`、`defaultBirthday`、`nextActive={touched}`。 |
| 登录-性别选择男 | `/pages/login/gender?variant=male` | 男生卡片蓝色描边与浅蓝背景；使用蓝湖男生玻璃图标切片；下一步蓝色点亮。 | 校验独立 route、`variant=male`、`genderMale` 资产存在。 |
| 登录-性别选择未选中 | `/pages/login/gender?variant=none` | 两张性别卡片均未选中；文字灰色；下一步浅蓝不可用态。 | 校验独立 route、`variant=none` 显式分支。 |
| 登录-地址-点亮 | `/pages/login/address?variant=selected` | 居住地填入默认城市；定位图标蓝色；下一步按钮点亮。 | 校验独立 route、`defaultAddress`、`locationColor`、`nextActive={Boolean(selected)}`。 |
| 登录-错误提示 | `/pages/login/index?variant=error` | 登录首页背景上覆盖黑色圆角提示；用于未同意协议/登录失败反馈。 | 校验独立 route、`variant=error`、错误提示源码。 |
| 登录-地址 | `/pages/login/address?variant=empty` | 地址输入默认空态；灰色定位图标；文案“选择城市”；下一步浅蓝态。 | 校验独立 route、`variant=empty` 显式分支。 |
| 登录-学历 | `/pages/login/education` | 博士/硕士/本科/大专四项；硕士默认高亮；下一步默认浅蓝态。 | 校验 `educationOptions.map` 和 `educationOptions[1]`。 |
| 登录-微信授权登录-授权说明 | `/pages/login/index?variant=auth` | 首页背景遮罩；温馨提示弹窗；不同意/同意双按钮；底部按钮置灰。 | 校验 `variant=auth`、弹窗坐标、真实底部按钮。 |
| 登录-性别选择女性选中 | `/pages/login/gender?variant=female` | 女生卡片粉色描边与浅粉背景；使用蓝湖女生玻璃图标切片；下一步蓝色点亮。 | 校验独立 route、`variant=female`、`genderFemale` 资产存在。 |

执行命令：

```bash
cd miniapp
node scripts/validate-login-ui-coverage.mjs
node scripts/validate-lanhu-demo-data.mjs
```

当前约束：

- 9 张稿均通过 `login.uiDesigns` 挂在数据层，页面不直接读取 JSON。
- 每张稿都有唯一 route，带 query 的状态稿可在微信开发者工具中直接打开。
- 蓝湖 MCP 对部分登录稿只返回 tokens/slices，未返回完整 HTML/layer；本轮采用 MCP 清单、可下载切片和 `.lanhu-ref/登录` 参考图共同对照。
