# 修复每日推荐配额重复计数与学历材料上传超限（i10.8）

**日期：** 2026-09-30

## 问题一：非会员推荐看不满 10 个就提示看完

**现象：** 账号「小坏公主」（821）昨天（09-29）浏览推荐：只看了 5 个候选就提示"今天的推荐已看完"，但历史记录显示 10 个。

**根因（数据库取证）：** `ct_recommend_view_log` 中 821 当天 view 日志 10 条、去重后仅 9 个候选——候选 507 在 16:51 和 16:54 两次页面会话中被重复曝光，各写一条 view。前端 requestId 含时间戳+随机数（每次不同），后端 requestId 幂等失效；配额按 view 日志**条数**计数，重复曝光提前耗尽每日 10 人配额。

**修复（后端，提交 `6d78cefd`）：**
- `recordAction` 的 view 动作增加**当天候选级去重**：同一用户当天对同一候选已有 view 记录则不再写入，不占配额。
- `getCandidates` 过滤当天已浏览过的候选，队列只返回未看过的人。

**验证：** 新增 2 个单测（跨会话重复曝光不写库、队列排除已看候选），`RecommendServiceImplTest` 32/32 通过；全量 1178 个测试中新增失败为 0（既有 9 个失败与本次无关，stash 对比确认）。端到端：同一候选两次 view 后 remaining 只扣 1，队列不再包含该候选。

## 问题二：学历认证相册图片上传报错

**现象：** 学历认证页从相册选择图片添加，上传报错。

**根因（本地复现）：** 数据库 `prd01.upload.rules` 中学历材料单张限制 **3MB**，后端返回 `文件大小不能超过3MB`（code 5001）。前端 `chooseImage({ sizeType: ['original'] })` 选原图且不压缩，iOS 相册原图普遍超 3MB。2MB 文件验证通过、4MB 文件复现报错。

**修复（小程序，提交 `ad0ab379`）：** 学历材料上传复用社区图片压缩策略（`prepareCommunityImageForUpload`，目标 3MB，三档压缩：2400/1920/1600px + 82/70/55 质量），与后端 3MB 限制匹配。

**验证：** `test-community-image-upload` 7/7 通过；`tsc --noEmit` 无新增类型错误；`taro build --type weapp` 构建成功。

## 问题三：iOS 虚拟支付提示（确认无需修改）

「当前微信商户尚未开通iOS虚拟支付…」是**预期提示**：微信商户号（`WECHAT_PAY_MCH_ID`）为空、商户确实未开通 iOS 虚拟支付，前端 `resolvePaymentFailureFeedback` 正确归一化该错误并在支付弹窗展示（不误报安卓）。如需 iPhone 可购买，需在微信支付商户平台开通 iOS 虚拟支付（商务流程，非代码问题）。

## 发布

- 后端 `6d78cefd` + 小程序 `ad0ab379` 已推送 `master`；后端生产流水线于 09-30 完成（success），公网健康接口返回 `code=200`。
- 小程序需在微信开发者工具中上传新体验版（`miniapp/dist` 已构建完成）。
- 遗留：全量测试存在 9 个既有失败（CommunityServiceImplTest 6 个、AppUserAuditServiceTest 1 个、CommunityCopyLiteralGuardTest 1 个、MiniappMessageControllerContractTest 1 个），与本次改动无关，建议后续单独处理。

## 追加：关闭操作面板后信息流弹回顶部（提交 `fbe4b582`）

**现象：** 时空站台滑到底部 → 点三个点弹面板 → 点空白关闭 → 页面弹回顶端。

**根因：** 操作面板开关触发页面内容重渲染，渲染层将 ScrollView 弹回顶部；此前仅"悄悄话"面板有手动恢复逻辑，三个点操作面板未覆盖。

**修复：** 新增 `useFeedScrollRestore` hook（滚动记录位置 + 面板关闭后受控 scrollTop 恢复，删除动态等主动回顶场景可跳过/重置），统一接入千寻时空站台/心灵搭子、成家信息流、话题页、动态详情、我的动态列表 5 个页面；动态详情兼容评论聚焦 scrollIntoView 互斥。

**验证：** tsc 类型检查通过、taro build 编译通过；真机弹顶行为需上传体验版后复测。
