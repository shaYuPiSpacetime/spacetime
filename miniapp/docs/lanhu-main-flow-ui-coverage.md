# 蓝湖主闭环页面对照清单

目标：登录之外的认证、会员、千寻币、我的页也进入 demo 闭环；每个页面有可打开路由、蓝湖稿映射、切图引用和轻量脚本校验。

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

## 会员/千寻币/我的

| 模块 | 蓝湖 UI 稿 | 落地入口 | 闭环要点 | 切图追踪 |
| --- | --- | --- | --- | --- |
| 会员 | 会员中心-会员未开通，支付按钮固定下方 | `/pages/membership/index?variant=none` | 默认未开通；可选套餐并触发真实微信支付，蓝湖 `payState` 只保留预览态。 | 会员卡背景、默认头像 |
| 会员 | 会员中心-已开通 | `/pages/membership/index?variant=active` | 展示生效中和有效期；按钮为续费。 | 会员卡背景、默认头像 |
| 会员 | 会员中心-已过期 | `/pages/membership/index?variant=expired` | 展示过期文案；可重新开通。 | 会员卡背景、默认头像 |
| 会员 | 会员中心-连续包年 | `/pages/membership/index?variant=annual` | 包年套餐默认选中；底部价格同步。 | 会员卡背景、默认头像 |
| 会员 | 会员记录 | `/pages/membership/records` | 生效中和已退款记录列表。 | 会员卡背景、默认头像 |
| 千寻币 | 千寻币 | `/pages/coins/index` | 余额、套餐、用途列表；默认协议未勾选。 | 千寻币余额背景 |
| 千寻币 | 千寻币-协议勾选 | `/pages/coins/index?variant=checked` | 协议默认勾选；支付走真实微信支付，异常时保留蓝湖预览闭环。 | 千寻币余额背景 |
| 千寻币 | 千寻币-点支付未勾选协议 | `/pages/coins/index?variant=unchecked-error` | 未勾选支付时停留并提示。 | 千寻币余额背景 |
| 千寻币 | 千寻币明细 | `/pages/coins/detail` | 交易明细列表和获取/消耗筛选。 | 千寻币余额背景 |
| 千寻币 | 千寻币明细-暂无数据 | `/pages/coins/detail?variant=empty` | 空态文案可直接打开验收。 | 千寻币余额背景 |
| 我的 | 我的 | `/pages/profile/index?variant=none` | 资料、统计、VIP 入口、千寻币入口、菜单入口。 | 我的背景、VIP 条、功能卡、菜单图标 |
| 我的 | 我的会员开通状态 | `/pages/profile/index?variant=active` | VIP 条显示生效中；点击进会员已开通态。 | 我的背景、VIP 条、功能卡、菜单图标 |
| 我的 | 我的会员已过期状态 | `/pages/profile/index?variant=expired` | VIP 条显示已过期；点击进会员过期态。 | 我的背景、VIP 条、功能卡、菜单图标 |
| 我的 | 编辑资料-资料填写 | `/pages/profile/edit` | 启动验收页；只展示入口和摘要，按钮跳真实子页面。 | 我的页同组 profile 资产 |
| 我的 | 自我介绍 | `/pages/profile-edit/intro` | 独立文字编辑页，保存后返回编辑资料。 | 代码绘制 |
| 我的 | 我的标签 | `/pages/profile-edit/tags` | 独立标签页，顶部分类 tab、三列标签墙和底部已添加面板均可点击。 | 代码绘制 |
| 我的 | 关于我 | `/pages/profile-edit/about` | 关于我顶部 tab 在当前页切换，左上角返回编辑资料。 | 代码绘制 |
| 我的 | 见面便好（样式复用） | `/pages/profile-edit/about?topic=meet` | 作为关于我页面初始选中 tab，不破坏返回栈。 | 代码绘制 |
| 我的 | 爱听的歌曲 | `/pages/profile-edit/songs` | 独立歌曲选择页，搜索框、歌曲列表和添加成功态均在当前页处理。 | 代码绘制 |
| 我的 | 语音介绍 | `/pages/profile/edit?voice=voice` | 编辑资料页内蓝湖底部弹窗承载录制、播放、完成、退出、删除、删除成功等状态。 | 代码绘制 |
| 认证 | 我的认证 | `/pages/verification/my-certification` | 编辑资料“更新认证”入口；展示头像、实名、学历认证结果。 | 三个认证图标 |

执行命令：

```bash
cd miniapp
node scripts/validate-main-flow-ui-coverage.mjs
node scripts/validate-login-ui-coverage.mjs
node scripts/validate-membership-payment-ui.mjs
node scripts/validate-lanhu-demo-data.mjs
node scripts/validate-lanhu-full-assets.mjs
```

当前约束：

- 主闭环页面只消费 `lanhuDemo` service 或现有 hook，后续对接接口时替换 service/hook 内部实现。
- 支付相关真实点击链路为 `createOrder -> wx.requestPayment -> 微信回调入账`；微信系统支付页不手写，蓝湖 `payState=wechat-pay` 仅用于设计预览态。
- 编辑资料关联页必须走 `pages/profile-edit` 分包；不得把自我介绍、我的标签、关于我、爱听歌曲塞回编辑资料页的临时弹窗或聚合 variant。语音介绍是蓝湖明确的编辑资料底部弹窗，只能留在编辑资料页内组件化实现。
- 蓝湖 93 张全量参考图保存在 `miniapp/.lanhu-ref/lanhu-full-2026-07-07/`，仅用于视觉对照，不进入运行包。
