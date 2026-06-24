# 页面规格 - APP-01-PAGE-profile-basic-edit 基础资料编辑页

> 蓝湖暂无本页正式设计图。本文按 `M01-DATA-user-input-fields` 中“基础资料编辑页”承载字段落地，视觉与具体组件待补设计图。

| 版本 | 日期 | 修改人 | 变更摘要 |
|------|------|--------|----------|
| 版本01 | 2026-06-24 | Codex | 版本 01：按最终确认口径收敛 |

- **页面 ID**：`APP-01-PAGE-profile-basic-edit`
- **所属模块 PRD**：`../模块PRD文档/模块PRD_APP-01_用户准入与资料认证初始化.md`
- **页面路由**：待技术方案确认
- **入口来源**：编辑资料总页基础资料入口
- **对应设计稿**：待补
- **对应后台**：`ADM-01-PAGE-app-user-management`

---

## 1. 页面定位

- **目标用户**：已登录用户
- **核心任务**：编辑和保存基础展示资料
- **页面类型**：表单编辑页
- **字段事实源**：字段 ID、显示名、页面承载、必填与计分控制以 `M01-DATA-user-input-fields` 为准；后台未启用字段不展示、不校验、不计分。

---

## 2. 字段表

| 字段 ID | 显示名 | 类型 | 必填规则 | 可编辑 | 说明 |
|---------|--------|------|----------|--------|------|
| `nickname` | 昵称 | string | 后台配置 | 是 | 长度按配置 |
| `gender` | 性别 | enum | 后台配置 | 否 | 提交后用户端锁定 |
| `birthday` | 出生日期 | date | 后台配置 | 是 | 年龄需满足配置 |
| `locationProvince` / `locationCity` / `locationDistrict` | 现居地 | dict | 后台配置 | 是 | 支持定位/手动选择 |
| `height` | 身高 | int | 后台配置 | 是 | cm |
| `weight` | 体重 | int | 后台配置 | 是 | kg |
| `hometownProvince` / `hometownCity` / `hometownDistrict` | 家乡 | dict | 后台配置 | 是 | 中国大陆地区 |
| `residence` | 户口所在地 | dict/string | 后台配置 | 是 | 可与家乡并存，由配置决定是否启用 |
| `identityType` | 身份 | enum | 后台配置 | 是 | 在校生/职场人 |
| `educationLevel` | 最高学历 | dict | 后台配置 | 是 | 系统字典 |
| `industry` | 行业 | dict/string | 后台配置 | 是 | 可与职业字段联动 |
| `occupation` | 职业 | dict/string | 后台配置 | 是 | 支持手动填写 |
| `company` | 公司 | string | 后台配置 | 是 | 支持公司搜索或手动填写 |
| `school` | 学校 | dict/string | 后台配置 | 是 | 学校字典 |
| `major` | 专业 | string | 后台配置 | 是 | 长度按配置 |
| `annualIncomeRange` | 年收入 | dict | 后台配置 | 是 | 系统字典 |
| `maritalStatus` | 婚姻状况 | dict | 后台配置 | 是 | 资料字段，不是认证 |

---

## 3. 操作表

| 操作 ID | 操作名 | 触发条件 | 成功态 | 失败态 |
|---------|--------|----------|--------|--------|
| `APP-01-PAGE-profile-basic-edit-ACT-edit` | 编辑字段 | 点击字段 | 打开输入/选择器 | 字典失败可重试 |
| `APP-01-PAGE-profile-basic-edit-ACT-save` | 保存 | 后台配置的必填项满足 | 保存并刷新资料完整度 | 校验失败定位字段 |
| `APP-01-PAGE-profile-basic-edit-ACT-cancel` | 取消 | 点击返回/取消 | 返回编辑资料总页 | 未保存内容按统一离开确认 |

---

## 4. 联动规则

1. 修改生日后重新计算年龄和星座。
2. 修改身份后按后台字段配置重新计算分支展示、必填项、资料完整度。
3. 修改性别不向用户开放；如后台客服特殊修改，移动端只展示结果。
4. 字典停用/改名不影响历史冗余展示。
5. 身份切换不改变已通过学历认证；若存在审核中的学历认证记录，需提示用户重新提交学历认证材料。
6. 学历认证已通过后，如用户主动重新认证学历，新材料必须重新审核。

---

## 5. 验收标准

| AC ID | 场景 | 类型 | 优先级 |
|-------|------|------|--------|
| `APP-01-AC-profile-basic-save` | 基础资料可保存并刷新完整度 | 正常 | P1 |
| `APP-01-AC-profile-basic-identity-branch` | 身份切换按后台配置影响展示和必填字段 | 正常 | P1 |
| `APP-01-AC-profile-basic-gender-lock` | 性别字段不可编辑 | 正常 | P0 |

---

## 6. 关联

| 关联类型 | 引用 ID | 说明 |
|----------|---------|------|
| 页面 | `APP-01-PAGE-verify-basic` | 强引导基础资料 |
| 字段总表 | `M01-DATA-user-input-fields` | 基础资料编辑字段来源 |
| 规则 | `M01-RULE-gender-lock` | 性别锁定 |
