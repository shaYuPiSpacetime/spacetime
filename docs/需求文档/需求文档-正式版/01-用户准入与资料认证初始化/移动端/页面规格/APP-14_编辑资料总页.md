# 页面规格 - APP-01-PAGE-profile-edit-home 编辑资料总页

> 老用户编辑页单独做，不复用首登强引导页。蓝湖暂无本页正式设计图，本文按 `M01-DATA-user-input-fields` 汇总资料入口，视觉与详细交互待补设计图。

| 版本 | 日期 | 修改人 | 变更摘要 |
|------|------|--------|----------|
| 版本01 | 2026-06-24 | Codex | 版本 01：按最终确认口径收敛 |

- **页面 ID**：`APP-01-PAGE-profile-edit-home`
- **所属模块 PRD**：`../模块PRD文档/模块PRD_APP-01_用户准入与资料认证初始化.md`
- **页面路由**：待技术方案确认
- **入口来源**：我的页资料编辑入口；游客模式补全入口；核心准入拦截入口
- **对应设计稿**：待补
- **对应后台**：`ADM-01-PAGE-app-user-management`

---

## 1. 页面定位

- **目标用户**：已登录用户、老用户、游客模式用户
- **核心任务**：集中展示资料完整度、认证状态、基础资料、扩展资料入口与主页预览入口
- **页面类型**：资料编辑总览页
- **字段事实源**：入口覆盖范围以 `M01-DATA-user-input-fields` 为准；后台未启用字段不展示入口、不计入缺失项。

---

## 2. 布局

| 区块 | 内容 | 规则 |
|------|------|------|
| 资料完整度 | 完整度分、缺失项、补全按钮 | 权重引用 `M01-CFG-profile-score-weight` |
| 认证提示卡 | 实名、头像、学历三重认证状态 | 未通过时展示去认证入口 |
| 头像/主页预览 | 主头像、背景图、预览入口 | 主头像变更触发头像重新提审 |
| 基础资料入口 | 轻量资料与基础资料字段摘要 | 点击进入基础资料编辑页；具体字段以 `M01-DATA-user-input-fields` 为准 |
| 扩展资料入口 | 扩展资料与联系方式字段入口 | 按 `M01-DATA-user-input-fields` 和后台字段配置展示；不作为三重认证准入项 |
| 审核提示 | 文字/资料图片审核中或驳回提示 | 驳回原因原文展示，引导修改或联系客服 |

---

## 3. 字段与入口

| 入口 ID | 显示名 | 覆盖字段 | 是否本期 | 关联审核 |
|---------|--------|----------|----------|----------|
| `profileBasic` | 基础资料 | `M01-DATA-user-input-fields` 中轻量资料/基础资料字段组 | 是 | — |
| `profileCertification` | 三重认证 | 头像认证、实名认证、学历认证字段组 | 是 | 认证审核 |
| `profileGoal` | 脱单目标/感情状态 | `datingGoal`、`emotionalStatus` | 按配置 | 开放文字如有 |
| `profileText` | 介绍文本 | `aboutMe`、`hopeTheyKnow`、`qaList` | 按配置 | 开放性文字审核 |
| `profileTags` | 标签 | `tags` | 按配置 | 字典/内容审核 |
| `profilePhotos` | 相册 | `photos` | 按配置 | 资料图片审核 |
| `profileBgImage` | 资料背景图 | `profileBgImage` | 按配置 | 图片内容安全/资料图片审核 |
| `profileVoice` | 语音介绍 | `voiceIntroUrl`、`voiceIntroDuration` | 按配置 | 微信音频内容安全机审 |
| `profileMbti` | MBTI | `mbtiType` | 按配置 | — |
| `profileMore` | 更多扩展资料 | 歌曲、见面偏好、生活方式、联系方式等扩展字段 | 按配置 | 文字/字典/平台可见 |

---

## 4. 操作表

| 操作 ID | 操作名 | 触发条件 | 成功态 | 失败态 |
|---------|--------|----------|--------|--------|
| `APP-01-PAGE-profile-edit-home-ACT-edit-basic` | 编辑基础资料 | 点击基础资料入口 | 进入基础资料编辑页 | — |
| `APP-01-PAGE-profile-edit-home-ACT-edit-extended` | 编辑扩展资料 | 点击扩展资料入口 | 进入对应扩展资料页面 | — |
| `APP-01-PAGE-profile-edit-home-ACT-certify` | 去认证 | 点击认证卡 | 进入三重认证页 | — |
| `APP-01-PAGE-profile-edit-home-ACT-preview` | 预览主页 | 点击预览 | 展示对外资料页预览 | 加载失败提示重试 |

---

## 5. 规则

1. 老用户资料编辑页与首登强引导页分离。
2. 性别用户端不可编辑，仅展示锁定说明。
3. 头像、资料图片、开放性文字审核状态互相隔离；资料背景图为独立字段，不并入相册数量。
4. 扩展资料与联系方式入口按 `M01-DATA-user-input-fields` 和后台字段配置生成；字段关闭时不展示入口。
5. 语音介绍上传后走微信音频内容安全机审，机审通过后展示；首版不进入后台人工语音审核页。
6. 游客模式用户进入时需突出补全资料和认证引导。

---

## 6. 验收标准

| AC ID | 场景 | 类型 | 优先级 |
|-------|------|------|--------|
| `APP-01-AC-profile-home-score` | 展示资料完整度和缺失项 | 正常 | P1 |
| `APP-01-AC-profile-home-extended` | 扩展资料入口覆盖 `M01-DATA-user-input-fields` 中已启用字段 | 正常 | P0 |
| `APP-01-AC-profile-home-cert` | 三重认证状态可见且可跳转 | 正常 | P0 |
| `APP-01-AC-profile-home-gender-lock` | 性别不可编辑 | 正常 | P0 |

---

## 7. 关联

| 关联类型 | 引用 ID | 说明 |
|----------|---------|------|
| 规则 | `M01-RULE-profile-scope` | 字段范围 |
| 字段总表 | `M01-DATA-user-input-fields` | 字段与入口来源 |
| 规则 | `M01-RULE-profile-score` | 完整度 |
| 页面 | `APP-01-PAGE-profile-extended-edit` | 扩展资料 |
