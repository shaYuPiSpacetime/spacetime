# 页面规格 - APP-01-PAGE-profile-extended-edit 扩展资料页面组

> 本页面组承接 `M01-DATA-user-input-fields` 中扩展资料与联系方式字段。蓝湖暂无本页面组正式设计图，本文先固定页面承载、审核和验收规则。

| 版本 | 日期 | 修改人 | 变更摘要 |
|------|------|--------|----------|
| 版本01 | 2026-06-25 | Codex | 确定版 |

- **页面 ID**：`APP-01-PAGE-profile-extended-edit`
- **所属模块 PRD**：`../模块PRD文档/模块PRD_APP-01_用户准入与资料认证初始化.md`
- **页面路由**：待技术方案确认
- **入口来源**：编辑资料总页扩展资料入口
- **对应设计稿**：待补
- **对应后台/公共定义**：`ADM-01-PAGE-profile-photo-audit`、`ADM-01-PAGE-open-text-audit`、`M01-DICT-system-field-map`

---

## 1. 页面定位

- **目标用户**：已登录用户
- **核心任务**：补充表达型资料，提高资料完整度和匹配质量
- **页面类型**：页面组，包含多个编辑子页
- **字段事实源**：字段 ID、显示名、页面承载、必填与计分控制以 `M01-DATA-user-input-fields` 为准；后台未启用字段不展示、不校验、不计分。

---

## 2. 页面组范围

| 子页面/区块 | 字段 | 必填/计分 | 审核/来源 |
|-------------|------|-----------|-----------|
| 脱单目标 | `datingGoal` | 后台配置 | 系统字典 |
| 感情状态 | `emotionalStatus` | 后台配置 | 系统字典 |
| 关于我/自我描述 | `aboutMe` | 后台配置 | 开放性文字审核 |
| 希望 TA 了解 | `hopeTheyKnow` | 后台配置 | 开放性文字审核 |
| 标签 | `tags` | 后台配置 | 标签字典 |
| 相册 | `photos` | 后台配置 | 资料图片审核 |
| 资料背景图 | `profileBgImage` | 后台配置 | 图片内容安全/资料图片审核 |
| 语音介绍 | `voiceIntroUrl`、`voiceIntroDuration` | 后台配置 | 微信音频内容安全机审 |
| MBTI | `mbtiType` | 后台配置 | 枚举/测评结果 |
| 爱听的歌曲 | `favoriteSong` | 后台配置 | 内容安全审核 |
| 住房情况 | `housingStatus` | 后台配置 | 系统字典 |
| 购车情况 | `carStatus` | 后台配置 | 系统字典 |
| 是否想要孩子 | `childrenPlan` / `wantChild` | 后台配置 | 系统字典 |
| 有无子女 | `hasChild` | 后台配置 | 系统字典 |
| 结婚计划 | `marriagePlan` | 后台配置 | 系统字典 |
| 宗教信仰 | `religion` | 后台配置 | 系统字典 |
| 吸烟情况 | `smoking` | 后台配置 | 系统字典 |
| 饮酒情况 | `drinking` | 后台配置 | 系统字典 |
| 宠物态度 | `pets` | 后台配置 | 系统字典 |
| 见面偏好 | `meetingPreference` | 后台配置 | — |
| 喜欢的见面活动 | `preferredActivities` | 后台配置 | — |
| 资料问答 | `qaList` | 后台配置 | 开放性文字审核 |
| 微信号 | `wechatId` / `wechat` | 后台配置 | 仅平台紧急事件使用，不对其他用户公开 |

---

## 3. 操作表

| 操作 ID | 操作名 | 触发条件 | 成功态 | 失败态 |
|---------|--------|----------|--------|--------|
| `APP-01-PAGE-profile-extended-edit-ACT-save-goal` | 保存脱单目标/感情状态 | 字段有效 | 保存并刷新完整度 | 保存失败提示 |
| `APP-01-PAGE-profile-extended-edit-ACT-save-text` | 保存开放文本 | 长度符合配置 | 进入文字审核或待审核 | 校验失败提示 |
| `APP-01-PAGE-profile-extended-edit-ACT-save-tags` | 保存标签 | 标签数量符合配置 | 保存并刷新完整度 | 超数量提示 |
| `APP-01-PAGE-profile-extended-edit-ACT-upload-photo` | 上传相册 | 选择图片 | 上传并进入资料图片审核 | 上传失败可重试 |
| `APP-01-PAGE-profile-extended-edit-ACT-upload-bg` | 上传资料背景图 | 选择图片 | 保存为独立背景图并进入图片安全处理 | 上传失败可重试 |
| `APP-01-PAGE-profile-extended-edit-ACT-record-voice` | 录制/上传语音 | 权限允许且时长 10-60 秒 | 提交微信音频机审；通过后展示并刷新完整度 | 权限拒绝/机审不通过提示重录 |
| `APP-01-PAGE-profile-extended-edit-ACT-save-mbti` | 保存 MBTI | 选择/测评完成 | 保存并展示 | — |
| `APP-01-PAGE-profile-extended-edit-ACT-save-lifestyle` | 保存住房/购车/子女/结婚/宗教/烟酒/宠物 | 选择字典项 | 保存并刷新完整度 | 字典失败提示重试 |
| `APP-01-PAGE-profile-extended-edit-ACT-save-meeting` | 保存见面偏好/喜欢的活动 | 字段有效 | 保存并刷新完整度 | 校验失败提示 |
| `APP-01-PAGE-profile-extended-edit-ACT-save-song` | 保存爱听的歌曲 | 字段有效 | 保存并展示 | 保存失败提示 |
| `APP-01-PAGE-profile-extended-edit-ACT-save-qa` | 保存资料问答 | 题目和回答有效 | 进入文字审核或待审核 | 校验失败提示 |
| `APP-01-PAGE-profile-extended-edit-ACT-save-wechat-id` | 保存微信号 | 字段有效 | 保存（仅平台可见） | 保存失败提示 |

---

## 4. 规则

1. 本页面组字段以 `M01-DATA-user-input-fields` 的扩展资料与联系方式字段组为准，后台未启用字段不展示。
2. 相册、语音、标签等字段是否参与资料完整度以后台计分配置为准。
3. 资料背景图为独立字段，不并入相册、不参与 3 张相册计数。
4. 相册审核与主头像认证隔离，单张照片驳回只影响单张展示。
5. 希望 TA 了解等开放文本进入开放性文字审核，驳回原因原文展示。
6. 语音介绍走微信音频内容安全机审，首版不设后台人工语音审核页。
7. 标签、脱单目标、感情状态优先取系统字典；停用/改名只影响新增。
8. MBTI 可由用户选择或测试结果写入，具体测评流程归属对应模块时，本页只承接展示和编辑入口。
9. 住房情况、购车情况、是否想要孩子、有无子女、结婚计划、宗教信仰、吸烟、饮酒、宠物态度等生活方式字段由后台配置控制是否展示、是否必填、是否计分。
10. 爱听的歌曲、见面偏好、喜欢的见面活动、资料问答由后台配置控制是否展示。
11. 微信号仅用于平台紧急事件或客服场景，不对其他用户公开，由后台配置控制是否展示。

---

## 5. 状态与异常

| 状态类型 | 场景 | 页面表现 |
|----------|------|----------|
| 空态 | 未填写扩展资料 | 展示补充入口 |
| 审核中 | 文本/图片/问答提交后 | 展示审核中标签，不影响其他资料编辑 |
| 已驳回 | 文本/图片/问答被驳回 | 展示原文原因并允许修改/重传 |
| 语音机审中 | 语音上传后 | 展示处理中，不对外展示 |
| 语音机审失败 | 微信音频机审不通过 | 提示重录，不进入人工审核 |
| 上传失败 | 相册/语音上传失败 | toast + 重试 |
| 字典失败 | 标签/目标/状态/生活方式字段加载失败 | 展示重试，保留已选历史值 |
| 微信号已保存 | 微信号保存成功 | 展示已保存标识，不对外展示 |

---

## 6. 验收标准

| AC ID | 场景 | 类型 | 优先级 |
|-------|------|------|--------|
| `APP-01-AC-extended-all-fields` | `M01-DATA-user-input-fields` 中已启用扩展字段均有页面承载 | 正常 | P0 |
| `APP-01-AC-extended-score` | 字段计分结果按后台配置刷新资料完整度 | 正常 | P0 |
| `APP-01-AC-extended-photo-isolated` | 相册审核不影响头像认证 | 正常 | P0 |
| `APP-01-AC-extended-text-reject` | 开放文本驳回原因原文展示 | 正常 | P1 |
| `APP-01-AC-extended-voice-safety` | 语音介绍机审通过后展示，机审失败可重录 | 安全 | P1 |

---

## 7. 关联

| 关联类型 | 引用 ID | 说明 |
|----------|---------|------|
| 规则 | `M01-RULE-profile-scope` | 字段范围 |
| 字段总表 | `M01-DATA-user-input-fields` | 扩展资料字段来源 |
| 规则 | `M01-RULE-profile-score` | 完整度 |
| 后台页面 | `ADM-01-PAGE-profile-photo-audit` | 资料图片审核 |
| 后台页面 | `ADM-01-PAGE-open-text-audit` | 文字审核 |
