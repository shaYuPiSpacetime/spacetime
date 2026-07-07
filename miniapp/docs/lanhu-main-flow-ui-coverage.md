# 蓝湖主闭环页面对照清单

目标：登录之外的认证、会员、成家币、我的页也进入 demo 闭环；每个页面有可打开路由、蓝湖稿映射、切图引用和轻量脚本校验。

## 认证链路

| 蓝湖 UI 稿 | 落地入口 | 闭环要点 | 切图追踪 |
| --- | --- | --- | --- |
| 认证-基本资料 | `/pages/verification/basic` | 从登录资料完成后进入；继续认证跳头像页；返回可暂不认证进首页。 | 认证背景图 |
| 认证-添加头像 | `/pages/verification/avatar` | 头像规范说明；选择照片后进裁剪页。 | 认证背景、合规头像、违规头像 |
| 认证-添加头像-选择相册 | `/pages/verification/avatar-album` | 底部相册选择弹层；取消回头像说明页。 | 认证背景、合规头像、违规头像 |
| 认证-添加头像-裁剪照片 | `/pages/verification/avatar-crop` | 裁剪确认后进入头像审核。 | 认证背景、头像参考图 |
| 认证-添加头像-头像审核 | `/pages/verification/avatar-review` | 审核中态；下一步进入自我介绍。 | 认证背景、头像参考图 |
| 认证-自我介绍 | `/pages/verification/intro` | 空态点击进入填写页。 | 认证背景图 |
| 认证-自我介绍-填写内容 | `/pages/verification/intro-edit` | 默认 mock 文案来自数据层；通过后进三重认证。 | 认证背景图 |
| 认证-三重认证 | `/pages/verification/triple` | 头像、实名、学历三项入口；实名和学历可继续深入。 | 三个认证图标、认证背景 |
| 三重认证-实名认证-身份证 | `/pages/verification/real-name` | 姓名和身份证表单；提交后进入学历认证。 | 认证背景图 |
| 三重认证-学历认证在校学生 | `/pages/verification/education-student` | 学校、学历、证明材料上传；协议勾选后 mock 提交。 | 上传相机切图 |
| 三重认证-学历认证中国大陆 | `/pages/verification/education-mainland` | 学信网、证书编号、上传证书三种方式互跳。 | 认证背景图 |
| 学信网验证编码 | `/pages/verification/education-chsi-help` | 四步学信网说明、验证码输入、协议勾选、mock 提交。 | 四张学信网步骤切图、上传相机 |
| 毕业证或者学位证书编号 | `/pages/verification/education-diploma-no` | 证书编号方式表单闭环。 | 上传相机切图 |
| 上传毕业证或学位证书 | `/pages/verification/education-certificate-upload` | 上传证书图片后可 mock 提交。 | 上传相机切图 |

## 会员/成家币/我的

| 模块 | 蓝湖 UI 稿 | 落地入口 | 闭环要点 | 切图追踪 |
| --- | --- | --- | --- | --- |
| 会员 | 会员中心-会员未开通，支付按钮固定下方 | `/pages/membership/index?variant=none` | 默认未开通；可选套餐并触发 mock 支付。 | 会员卡背景、默认头像 |
| 会员 | 会员中心-已开通 | `/pages/membership/index?variant=active` | 展示生效中和有效期；按钮为续费。 | 会员卡背景、默认头像 |
| 会员 | 会员中心-已过期 | `/pages/membership/index?variant=expired` | 展示过期文案；可重新开通。 | 会员卡背景、默认头像 |
| 会员 | 会员中心-连续包年 | `/pages/membership/index?variant=annual` | 包年套餐默认选中；底部价格同步。 | 会员卡背景、默认头像 |
| 会员 | 会员记录 | `/pages/membership/records` | 生效中和已退款记录列表。 | 会员卡背景、默认头像 |
| 成家币 | 千寻币 | `/pages/coins/index` | 余额、套餐、用途列表；默认协议未勾选。 | 成家币余额背景 |
| 成家币 | 千寻币-协议勾选 | `/pages/coins/index?variant=checked` | 协议默认勾选；支付走 mock 成功。 | 成家币余额背景 |
| 成家币 | 千寻币-点支付未勾选协议 | `/pages/coins/index?variant=unchecked-error` | 未勾选支付时停留并提示。 | 成家币余额背景 |
| 成家币 | 千寻币明细 | `/pages/coins/detail` | 交易明细列表和获取/消耗筛选。 | 成家币余额背景 |
| 成家币 | 千寻币明细-暂无数据 | `/pages/coins/detail?variant=empty` | 空态文案可直接打开验收。 | 成家币余额背景 |
| 我的 | 我的 | `/pages/profile/index?variant=none` | 资料、统计、VIP 入口、成家币入口、菜单入口。 | 我的背景、VIP 条、功能卡、菜单图标 |
| 我的 | 我的会员开通状态 | `/pages/profile/index?variant=active` | VIP 条显示生效中；点击进会员已开通态。 | 我的背景、VIP 条、功能卡、菜单图标 |
| 我的 | 我的会员已过期状态 | `/pages/profile/index?variant=expired` | VIP 条显示已过期；点击进会员过期态。 | 我的背景、VIP 条、功能卡、菜单图标 |
| 我的 | 编辑资料-资料填写 | `/pages/profile/edit` | 启动验收页；只展示入口和摘要，按钮跳真实子页面。 | 我的页同组 profile 资产 |
| 我的 | 自我介绍 | `/pages/profile-edit/intro` | 独立文字编辑页，保存后返回编辑资料。 | 代码绘制 |
| 我的 | 我的标签 | `/pages/profile-edit/tags` | 独立标签页，标签分组可点击选择。 | 代码绘制 |
| 我的 | 关于我 | `/pages/profile-edit/about` | 关于我条目列表；具体条目走 topic 页面。 | 代码绘制 |
| 我的 | 见面便好（样式复用） | `/pages/profile-edit/about?topic=meet` | 关于我条目的编辑态复用页面。 | 代码绘制 |
| 我的 | 爱听的歌曲 | `/pages/profile-edit/songs` | 独立歌曲选择页，添加成功态走 `variant=added`。 | 代码绘制 |
| 我的 | 语音介绍 | `/pages/profile-edit/voice?variant=voice` | 语音介绍状态页承载录制、播放、完成、退出、删除等蓝湖状态。 | 代码绘制 |

执行命令：

```bash
cd miniapp
node scripts/validate-main-flow-ui-coverage.mjs
node scripts/validate-login-ui-coverage.mjs
node scripts/validate-lanhu-demo-data.mjs
```

当前约束：

- 主闭环页面只消费 `lanhuDemo` service 或现有 hook，后续对接接口时替换 service/hook 内部实现。
- 支付相关当前为 mock 成功/提示闭环，不把微信系统支付页作为本轮必须 1:1 页面。
- 编辑资料关联页必须走 `pages/profile-edit` 分包；不得把自我介绍、我的标签、关于我、爱听歌曲、语音介绍塞回编辑资料页的临时弹窗或聚合 variant。
- 其余 91 张蓝湖稿仍保留在 `lanhuDemo.json` manifest，后续按模块继续从 `ready/todo` 推进到 `implemented`。
