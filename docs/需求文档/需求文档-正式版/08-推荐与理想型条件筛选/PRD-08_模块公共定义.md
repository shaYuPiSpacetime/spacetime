# PRD-08 推荐与理想型条件筛选 - 模块公共定义

> 本文件是 PRD-08 在移动端多个页面间复用的唯一事实源。用户资料与核心准入引用 PRD-01，关系行为引用 PRD-02，VIP 与理想型解锁引用 PRD-04；页面规格只引用本文件的 `M08-*` ID，不复述规则。

| 版本 | 日期 | 修改人 | 变更摘要 |
|------|------|--------|----------|
| 版本01 | 2026-07-16 | Codex | 按产品确认将一期推荐模型改为“推荐 + 理想型”固定条件筛选，删除测评特征、算法配置后台和认证状态筛选 |

## 1. 已确认产品决策

| 决策 ID | 决策 | 结论 | 主要落点 |
|---------|------|------|----------|
| `M08-DEC-01` | 主页面结构 | `推荐`、`理想型`两个固定 Tab，默认打开推荐 Tab | `APP-08-PAGE-recommend-ideal` |
| `M08-DEC-02` | 推荐筛选入口 | 推荐 Tab 右上筛选图标进入独立推荐筛选设置页 | `APP-08-PAGE-filter-settings` |
| `M08-DEC-03` | 推荐基础筛选 | 免费用户可设置位置、年龄 | `M08-RULE-recommend-filter` |
| `M08-DEC-04` | 推荐高级筛选 | 时空邂逅会员可设置身高、体重、学历、家乡、学校、专业 | `M08-RULE-vip-filter` |
| `M08-DEC-05` | 认证状态筛选 | 删除；PRD-01 已要求实名、头像、学历三项认证全部通过后才能曝光，重复筛选无业务意义 | `M08-RULE-candidate-pool` |
| `M08-DEC-06` | 理想型定位 | 在共享位置、年龄基础上叠加固定资料/标签条件，点击“选好了”生成结果 | `M08-RULE-ideal-match` |
| `M08-DEC-07` | 条件组合 | 不同字段及每个已选理想型条件均按 AND；同一字段的多个允许值按 OR | `M08-RULE-condition-combination` |
| `M08-DEC-08` | 缺失字段 | 候选资料为空或无法解析时按不满足处理，不用自由文本、照片或其他字段推测 | `M08-RULE-missing-data` |
| `M08-DEC-09` | 位置放宽 | 推荐仅在用户开启开关后用周边城市补足；其他条件不放宽；理想型任何条件均不自动放宽 | `M08-RULE-location-expansion` |
| `M08-DEC-10` | 理想型商业化 | 筛选免费，结果为模糊态；单个/批量解锁消耗千寻币，会员不免单，统一引用 PRD-04 | `M08-RULE-ideal-unlock-handoff` |
| `M08-DEC-11` | 条件共享 | 推荐与理想型共用位置、年龄；任一入口保存后另一 Tab 同步回显 | `M08-RULE-shared-basic-filter` |
| `M08-DEC-12` | 保留页面 | 见面偏好、推荐回看、理想型筛选记录、历史解锁保留 | APP-08 页面树 |
| `M08-DEC-13` | 一期后台 | 不建设 PRD-08 独立管理后台；复用系统地区/学校/资料字典和 PRD-04 商业化配置 | `M08-RULE-admin-boundary` |
| `M08-DEC-14` | 一期算法边界 | 不做测评特征、画像评分、权重、协同过滤、模型训练、排序解释或精选页 | 第 8 节 |

## 2. 模块术语

| 术语 ID | 统一术语 | 禁用旧称/别名 | 定义 |
|---------|----------|---------------|------|
| `M08-TERM-recommend-tab` | 推荐 Tab | 觅缘、算法推荐 | 按用户保存的固定条件展示可互动候选人的主卡片流 |
| `M08-TERM-ideal-tab` | 理想型 Tab | 精选、智能理想型 | 用户主动选择理想型条件并发起筛选的入口 |
| `M08-TERM-candidate-pool` | 候选池 | 模型召回池 | 满足 PRD-01 核心准入、性别和账号关系安全门槛的用户集合 |
| `M08-TERM-filter-profile` | 筛选偏好 | 算法画像 | 用户保存的位置、年龄及会员高级条件 |
| `M08-TERM-ideal-condition` | 理想型条件 | 理想型标签 | UI 中可选且能唯一映射到 PRD-01 结构化字段或稳定标签 code 的固定条件 |
| `M08-TERM-filter-snapshot` | 筛选快照 | 推荐模型版本 | 发起理想型筛选时保存的条件、命中对象和数据版本快照 |
| `M08-TERM-neighbor-city` | 周边城市 | 附近城市 | 地区基础数据中与目标城市建立邻接关系的城市，不按客户端 GPS 半径临时计算 |
| `M08-TERM-replay` | 推荐回看 | 三天回放 | 引用 PRD-04 `three_day_replay` 权益查看最近 3 天已浏览或跳过的推荐候选人 |

## 3. 模块枚举与固定参数

### 3.1 `M08-ENUM-scene` 筛选场景

| code | 显示名 | 说明 | 状态 |
|------|--------|------|------|
| `recommend` | 推荐 | 推荐 Tab 条件筛选与卡片流 | 启用 |
| `ideal` | 理想型 | 理想型条件选择、结果与记录 | 启用 |

### 3.2 `M08-ENUM-filter-tier` 筛选层级

| code | 显示名 | 权限 | 状态 |
|------|--------|------|------|
| `basic` | 基础筛选 | 完成核心准入的普通用户与会员 | 启用 |
| `advanced` | 高级筛选 | PRD-04 `advanced_filter` 权益有效的会员 | 启用 |

### 3.3 `M08-ENUM-filter-record-status` 理想型筛选记录状态

| code | 显示名 | 说明 | 状态 |
|------|--------|------|------|
| `active` | 可查看 | 快照仍在 90 天保留期内 | 启用 |
| `expired` | 已过期 | 超过保留期，只展示条件摘要，不再返回候选结果 | 启用 |

### 3.4 `M08-ENUM-waiting-reason` 推荐等待原因

| code | 显示名 | 说明 | 状态 |
|------|--------|------|------|
| `no_candidate` | 暂无符合条件的嘉宾 | 当前条件与候选池实时过滤后为 0 | 启用 |
| `browse_limit` | 今日浏览额度已用完 | PRD-04 权益服务明确返回剩余浏览数为 0 | 启用 |

### 3.5 代码固定参数

| 参数 ID | 值 | 说明 | 是否后台可配 |
|---------|----|------|--------------|
| `M08-PARAM-page-size` | 20 | 推荐与理想型结果每次加载数量 | 否 |
| `M08-PARAM-target-city-max` | 3 | 最多选择 3 个目标城市 | 否 |
| `M08-PARAM-age-default-radius` | 5 | 首次年龄范围为本人年龄前后 5 岁，并裁剪到 PRD-01 年龄范围 | 否 |
| `M08-PARAM-ideal-record-retention-days` | 90 | 理想型筛选快照保留期 | 否 |
| `M08-PARAM-ideal-record-max` | 20 | 筛选记录页最多展示最近 20 次 | 否 |
| `M08-PARAM-replay-days` | 3 | 推荐回看窗口；是否可用由 PRD-04 权益控制 | 否 |

## 4. 状态机

### 4.1 `M08-SM-filter-profile` 筛选偏好状态机

| 起始状态 | 触发 | 目标状态 | 前置条件 | 副作用 |
|----------|------|----------|----------|--------|
| 无记录 | 首次进入推荐/理想型 | `defaulted` | 已完成核心准入 | 用现居城市和年龄 ±5 岁生成默认值，不写库 |
| `defaulted` | 用户保存 | `saved` | 基础字段有效；高级字段需会员权益 | 创建版本 1，刷新两个 Tab |
| `saved` | 用户再次保存 | `saved` | 请求携带当前版本 | 版本 +1；旧版本只供历史快照追溯 |
| `saved` | 会员到期 | `saved` | 存在高级条件 | 高级值保留但不生效，页面锁定并展示会员引导 |
| `saved` | 会员恢复 | `saved` | 高级筛选权益恢复 | 已保存高级值重新生效，无需再次提交 |

### 4.2 `M08-SM-ideal-snapshot` 理想型筛选快照状态机

| 起始状态 | 触发 | 目标状态 | 前置条件 | 副作用 |
|----------|------|----------|----------|--------|
| 无记录 | 点击“选好了” | `active` | 位置、年龄有效；依赖本人字段的条件可判定 | 保存条件快照和候选业务编号集合 |
| `active` | 达到 90 天 | `expired` | 系统定时任务 | 结果不可再翻页；已解锁对象继续按 PRD-04 保留期处理 |
| `active` | 候选账号失效 | `active` | 候选冻结/注销/拉黑/认证失效 | 返回结果时实时剔除，不改快照状态 |

## 5. 筛选条件与字段映射

### 5.1 推荐筛选条件

| 条件 ID | 层级 | UI 名称 | 数据来源 | 匹配逻辑 | 缺失处理 |
|---------|------|---------|----------|----------|----------|
| `M08-FILTER-location` | 基础 | 位置 | `locationProvince/locationCity` | 候选现居城市命中目标城市集合；开启周边城市时按 `M08-RULE-location-expansion` 补足 | 候选现居城市为空则不满足 |
| `M08-FILTER-age` | 基础 | 年龄 | `birthday` 系统计算年龄 | 闭区间 `[minAge,maxAge]` | 生日为空或年龄异常则不满足 |
| `M08-FILTER-height` | 高级 | 身高 | `height` | 闭区间 `[minHeight,maxHeight]`，范围继承 PRD-01 | 空值不满足 |
| `M08-FILTER-weight` | 高级 | 体重 | `weight` | 闭区间 `[minWeight,maxWeight]`，范围继承 PRD-01 | 空值不满足 |
| `M08-FILTER-education` | 高级 | 学历 | `educationLevel` | 候选 code 命中用户多选集合 | 空值不满足 |
| `M08-FILTER-hometown` | 高级 | 家乡 | `hometownProvince/hometownCity` | 选择到市时按城市 code；只选省时按省 code | 对应层级为空则不满足 |
| `M08-FILTER-school` | 高级 | 学校 | `school` | 候选学校业务 code 命中多选集合 | 自由文本未映射学校 code 时不满足 |
| `M08-FILTER-major` | 高级 | 专业 | `major` | 对标准化后的专业全称精确匹配；同一字段多个值按 OR | 空值或仅模糊包含时不满足 |

### 5.2 理想型条件

理想型位置、年龄直接引用 `M08-FILTER-location`、`M08-FILTER-age`；以下条件均可多选，每个已选条件之间按 AND。

| 分类 | 条件 ID | UI 文案 | 数据来源 | 唯一判定逻辑 |
|------|---------|---------|----------|--------------|
| 外在条件 | `M08-IDEAL-height-165` | 身高 165+ | `height` | `height >= 165` |
| 教育背景 | `M08-IDEAL-school-tier` | 985/211 | `school.schoolTierCodes` | 包含 `985` 或 `211` 任一值 |
| 教育背景 | `M08-IDEAL-doctor` | 博士学历 | `educationLevel` | 等于 `doctor` |
| 教育背景 | `M08-IDEAL-overseas` | 留学海归 | `tags` | 包含 `overseas_returnee` |
| 教育背景 | `M08-IDEAL-alumni` | 校友 | 双方 `school` | 候选学校业务 code 与当前用户学校 code 完全一致；当前用户未填写学校时条件禁用 |
| 经济实力 | `M08-IDEAL-home-owner` | 已购房 | `housingStatus/tags` | `housingStatus=owned`；结构化字段为空时允许 `home_owner` 标签兜底；明确非自有时标签不覆盖 |
| 经济实力 | `M08-IDEAL-car-owner` | 已购车 | `carStatus/tags` | `carStatus=owned`；结构化字段为空时允许 `car_owner` 标签兜底；明确非自有时标签不覆盖 |
| 家庭背景 | `M08-IDEAL-only-child` | 独生子女 | `tags` | 包含 `only_child` |
| 家庭背景 | `M08-IDEAL-public-family` | 体制内家庭 | `tags` | 包含 `public_sector_family` |
| 家庭背景 | `M08-IDEAL-local` | 本地人 | `residence` 或 `hometownCity` | 任一字段的城市 code 命中当前目标城市；只同省不同市不满足 |
| 兴趣爱好 | `M08-IDEAL-sports` | 有运动习惯 | `tags` | 包含 `sports_habit` |
| 兴趣爱好 | `M08-IDEAL-animals` | 喜欢小动物 | `tags` | 包含 `likes_animals` |
| 兴趣爱好 | `M08-IDEAL-food` | 喜欢美食 | `tags` | 包含 `foodie` |
| 兴趣爱好 | `M08-IDEAL-travel` | 喜欢旅行 | `tags` | 包含 `travel_lover` |
| 兴趣爱好 | `M08-IDEAL-interest-similar` | 兴趣相似 | 双方 `tagGroup=interest` | 双方至少一个启用的兴趣标签 code 相同；当前用户无兴趣标签时条件禁用 |
| 感情与经历 | `M08-IDEAL-view-compatible` | 感情观相合 | 双方 `tagGroup=relationship_view` | 双方至少一个启用的感情观标签 code 相同；当前用户无感情观标签时条件禁用 |
| 感情与经历 | `M08-IDEAL-marry-2y` | 想 2 年内结婚 | `datingGoal` | 等于 `marry_within_2_years` |

> 一期不提供“高颜值”“收入可观”。前者无客观结构化字段，后者未纳入本次确认条件；UI 不得沿用参考图中的对应按钮。

## 6. 模块业务规则

| 规则 ID | 规则 | 判定逻辑 |
|---------|------|----------|
| `M08-RULE-candidate-pool` | 候选池门槛 | 排除本人；候选必须引用 `M01-RULE-core-access` 三项认证通过、账号正常且允许曝光；只保留 `M01-RULE-match-gender` 的异性；双向拉黑、场景屏蔽、不再推荐、冻结、注销中/已注销均实时剔除 |
| `M08-RULE-recommend-filter` | 推荐条件筛选 | 候选池依次应用位置、年龄及当前有效高级条件；不计算分数，不按匹配度加权 |
| `M08-RULE-vip-filter` | 高级筛选权益 | 只有 PRD-04 `advanced_filter` 权益有效时应用高级条件；普通用户点击高级区唤起 PRD-04 VIP 引导；会员到期后高级值保留但不参与查询 |
| `M08-RULE-condition-combination` | 条件组合 | 不同字段和不同理想型条件按 AND；同一字段内多城市、多学历、多学校、多专业按 OR；范围条件为闭区间 |
| `M08-RULE-missing-data` | 缺失数据 | 只有用户主动选择了某条件时才校验候选字段；对应字段为空、格式异常或无法映射稳定 code 时按不满足，不推测、不自动放宽 |
| `M08-RULE-shared-basic-filter` | 共享基础条件 | 推荐和理想型共用目标城市、周边城市开关与年龄范围；理想型执行时强制关闭周边城市扩展，但不清空用户开关 |
| `M08-RULE-location-expansion` | 周边城市补足 | 推荐先返回目标城市候选；不足 20 条且用户开启开关时，按目标城市顺序及地区邻接表补入周边城市，返回项标记实际城市；理想型不执行该规则 |
| `M08-RULE-ideal-match` | 理想型筛选 | 位置、年龄和所有已选理想型条件同时满足才进入结果；至少允许只用位置和年龄发起筛选；不自动删除用户已选条件 |
| `M08-RULE-dependent-condition` | 依赖本人资料 | “校友”“兴趣相似”“感情观相合”依赖当前用户对应字段；字段缺失时按钮置灰并引导到 PRD-01 编辑资料，不能提交伪空条件 |
| `M08-RULE-result-order` | 固定排序 | 推荐与理想型均按候选最近活跃时间倒序；相同时间按用户业务编号升序，使用游标稳定分页；不展示或保存匹配分数 |
| `M08-RULE-ideal-blur` | 理想型模糊态 | 未解锁只展示模糊头像、年龄段、目标城市及实际命中的已选条件；不展示昵称、精确生日、学校名称、联系方式或清晰头像 |
| `M08-RULE-ideal-unlock-handoff` | 理想型解锁 | 单个/批量解锁调用 PRD-04 `M04-RULE-ideal-unlock`；单次最多 5 个、会员不免单、价格与 90 天保留期均取 PRD-04，PRD-08 不写死金额 |
| `M08-RULE-filter-record` | 筛选记录 | 每次成功点击“选好了”生成一条条件快照；最多展示最近 20 条，保留 90 天；记录回看使用当时条件，不覆盖当前偏好 |
| `M08-RULE-replay` | 推荐回看 | 仅 PRD-04 `three_day_replay` 权益有效时展示最近 3 天推荐浏览记录；失效候选实时移除；回看不重新消耗浏览额度 |
| `M08-RULE-browse-quota` | 推荐浏览额度 | 本模块只消费 PRD-04 权益服务返回的 `remainingBrowseCount`：大于 0 时每展示一名新候选扣减 1，等于 0 进入等待页，null 表示当前不限制；基础额度和值的配置归 PRD-04，本模块不得写死或自行补数 |
| `M08-RULE-meeting-preference` | 见面偏好 | 只保存 PRD-01 `meetingPreference/preferredActivities`，不参与一期推荐或理想型筛选，避免形成未确认算法条件 |
| `M08-RULE-display-privacy` | 隐私与筛选 | 资料对外隐藏只改变卡片/主页展示，不改变核心筛选判定；筛选用途必须在隐私政策披露；不得向另一用户展示其未公开字段原值 |
| `M08-RULE-admin-boundary` | 后台边界 | 不新增推荐菜单、模型、参数、版本、训练、解释或看板；地区、学校分类、个人标签和资料枚举复用系统管理既有字典能力，修改审计沿用原模块 |

## 7. 事件、文案与错误码

### 7.1 事件与共用文案

| ID | 类型 | 触发/场景 | 内容 |
|----|------|-----------|------|
| `M08-EVT-filter-saved` | 事件 | 推荐筛选保存成功 | `userNo, version, basicFilterCount, advancedFilterCount, vipEffective` |
| `M08-EVT-ideal-searched` | 事件 | 理想型快照创建 | `userNo, snapshotNo, conditionCodes, resultCount, createdAt`；不记录自由文本原值 |
| `M08-EVT-candidate-viewed` | 事件 | 推荐卡进入可见区域 | `scene, candidateNo, filterVersion/snapshotNo, position` |
| `M08-TXT-empty-recommend` | 文案 | 推荐 0 候选 | `暂时没有符合条件的嘉宾，试试调整筛选条件` |
| `M08-TXT-empty-ideal` | 文案 | 理想型 0 候选 | `暂时没有同时满足这些条件的嘉宾，请调整理想型条件` |
| `M08-TXT-vip-required` | 文案 | 普通用户触发高级筛选 | `开通时空邂逅会员，使用身高、学历等高级筛选` |
| `M08-TXT-complete-profile` | 文案 | 依赖本人资料的条件不可用 | `先完善对应资料，再使用此理想型条件` |

### 7.2 错误码

| 错误码 ID | HTTP | 业务 code | 含义 | 用户提示 | 可重试 |
|-----------|------|-----------|------|----------|--------|
| `M08-ERR-core-access-required` | 403 | `RECOMMEND_CORE_ACCESS_REQUIRED` | 未完成核心准入 | `完成资料和三项认证后即可使用推荐` | 否 |
| `M08-ERR-filter-invalid` | 400 | `RECOMMEND_FILTER_INVALID` | 范围交叉、城市超限或条件 code 无效 | `筛选条件有误，请检查后重试` | 否 |
| `M08-ERR-vip-required` | 403 | `RECOMMEND_VIP_REQUIRED` | 无高级筛选权益 | 引用 `M08-TXT-vip-required` | 否 |
| `M08-ERR-filter-conflict` | 409 | `RECOMMEND_FILTER_VERSION_CONFLICT` | 筛选偏好版本冲突 | `筛选条件已在其他设备更新，请刷新后重试` | 是 |
| `M08-ERR-dictionary-unavailable` | 503 | `RECOMMEND_DICTIONARY_UNAVAILABLE` | 地区/学校/标签字典不可用 | `筛选项暂时无法加载，请稍后重试` | 是 |
| `M08-ERR-dependent-profile-missing` | 409 | `IDEAL_DEPENDENT_PROFILE_MISSING` | 本人学校/兴趣/感情观缺失 | 引用 `M08-TXT-complete-profile` | 否 |
| `M08-ERR-snapshot-expired` | 410 | `IDEAL_SNAPSHOT_EXPIRED` | 理想型快照过期 | `这次筛选记录已过期，请重新筛选` | 否 |
| `M08-ERR-candidate-unavailable` | 410 | `RECOMMEND_CANDIDATE_UNAVAILABLE` | 候选实时失效 | `该嘉宾暂时无法查看` | 否 |

## 8. 本期不做

| 能力 | 本期处理 | 原因/后续 |
|------|----------|-----------|
| 测评、心印、MBTI、依恋、感情观问卷等特征 | 不读取、不预留入口 | PRD-09 与全部测评能力移出一期 |
| 画像评分、权重、协同过滤、机器学习模型、训练与重训 | 不建设 | 一期固定条件筛选即可闭环 |
| SHAP/推荐解释/匹配度百分比 | 不展示、不返回字段 | 一期没有评分基础 |
| 精选 Tab/精选付费专区 | 隐藏历史入口 | 产品已收敛为推荐 + 理想型 |
| 高颜值、收入可观 | 不展示按钮 | 无本次确认的数据字段与客观规则 |
| 理想型自由关键词搜索 | 不提供输入框 | 防止自由文本引入模糊匹配和不可解释规则 |
| PRD-08 独立管理后台 | 不建设菜单或页面 | 字典与商业化配置由既有模块承接 |

## 9. 接口草案

> 接口鉴权、公共响应与业务编号展示遵循项目全局约定；路径用于 PRD/技术方案对齐，技术方案不得私自新增算法字段。

| 方法 | 路径 | 说明 | 关联规则 |
|------|------|------|----------|
| GET | `/api/app/recommend/preferences` | 查询共享基础条件、推荐高级条件、权益与版本 | `M08-SM-filter-profile` |
| PUT | `/api/app/recommend/preferences` | 原子保存筛选偏好 | `M08-RULE-condition-combination` |
| GET | `/api/app/recommend/candidates` | 按游标查询推荐候选 | `M08-RULE-candidate-pool`、`M08-RULE-result-order` |
| POST | `/api/app/recommend/candidates/{candidateNo}/skip` | 记录跳过并进入回看数据源 | `M08-RULE-replay` |
| GET | `/api/app/recommend/replay` | 查询最近 3 天回看记录 | PRD-04 `three_day_replay` |
| GET | `/api/app/recommend/meeting-preference` | 查询见面偏好 | `M08-RULE-meeting-preference` |
| PUT | `/api/app/recommend/meeting-preference` | 保存见面偏好 | `M08-RULE-meeting-preference` |
| POST | `/api/app/ideal/search` | 校验条件并创建理想型快照 | `M08-RULE-ideal-match` |
| GET | `/api/app/ideal/snapshots/{snapshotNo}/results` | 分页查询快照结果并实时剔除失效候选 | `M08-SM-ideal-snapshot` |
| GET | `/api/app/ideal/search-records` | 查询最近 20 条筛选记录 | `M08-RULE-filter-record` |
| GET | `/api/app/ideal/unlocks` | 查询理想型历史解锁；数据由 PRD-04 提供 | `M04-RULE-ideal-unlock` |

## 10. 数据、安全与可靠性

### 10.1 核心实体

| 实体 | 建议表名 | 关键字段 | 留存 |
|------|----------|----------|------|
| 筛选偏好 | `ct_recommend_preference` | `userNo, targetCityCodes, allowNeighborCity, minAge, maxAge, advancedFilters, version, updatedAt` | 账号存续期；注销按全局规则删除或匿名化 |
| 理想型快照 | `ct_ideal_filter_snapshot` | `snapshotNo, userNo, preferenceVersion, conditionCodes, conditionPayload, resultCount, status, createdAt, expiresAt` | 90 天 |
| 快照候选 | `ct_ideal_snapshot_candidate` | `snapshotNo, candidateNo, sortTime, sortTieBreaker` | 随快照 90 天；返回前实时校验候选有效性 |
| 推荐浏览记录 | `ct_recommend_view_log` | `userNo, candidateNo, scene, viewedAt, action` | 至少 3 天；超出回看窗口按日志策略归档 |

### 10.2 安全与隐私

- 出生日期、体重、家乡、住房、购车和标签属于敏感个人资料；筛选请求只提交条件，不向请求方返回候选原始隐藏字段。
- 理想型未解锁结果按 `M08-RULE-ideal-blur` 返回；解锁后的展示仍受 PRD-01 对外有效资料规则约束。
- 埋点和日志不得记录候选生日、体重、住房、购车、家乡或完整标签数组，只记录条件 code、数量和业务编号。
- 用户注销、冻结、拉黑、认证失效需在下一次查询实时生效，缓存最长不得超过 60 秒。

### 10.3 性能、并发与幂等

| 项 | 要求 |
|----|------|
| 推荐首屏 | P95 小于 800ms，单页 20 条；字典和邻接表使用版本化缓存 |
| 理想型搜索 | 创建快照 P95 小于 1500ms；超时返回可重试错误且不得保存不完整快照，一期不增加异步生成状态 |
| 稳定分页 | 游标由 `lastActiveAt + candidateNo` 组成，同一筛选版本不得重复或漏项 |
| 偏好保存 | 请求携带版本号，冲突返回 `M08-ERR-filter-conflict`，不得静默覆盖 |
| 理想型搜索 | 客户端生成幂等 key；同一用户、同一条件摘要、同一 key 重试返回同一 `snapshotNo` |
| 解锁 | 完全引用 PRD-04 订单/资产幂等，不在本模块重复扣币 |

## 11. 上线、迁移与回滚

- 旧推荐算法参数、模型文件和测评特征不迁入新偏好表；如已有旧偏好，只迁移能明确映射的位置、年龄、身高、体重、学历、家乡、学校、专业。
- 无历史偏好的用户使用现居城市和年龄 ±5 岁默认值；默认值只有用户保存后才落库。
- 老版本仍请求旧推荐接口时，网关可在灰度期映射到基础筛选结果；不得返回已废弃的评分、测评或解释字段。
- 灰度先覆盖内部账号，核对候选准入、筛选 AND 逻辑、VIP 到期回退、理想型扣币与快照过期，再逐步放量。
- 回滚仅回滚新页面入口和接口路由；用户已保存偏好、理想型快照与已完成解锁不可删除或反向扣币。
