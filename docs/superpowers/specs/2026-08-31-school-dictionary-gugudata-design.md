# 学校字典与咕咕数据搜索设计

## 目标

为中国大陆高校提供可用于学历认证和基础资料编辑的搜索联想能力。查询本地学校字典表，本地候选不足 10 条时调用咕咕数据补全，将三方结果更新到本地表后合并返回。港澳台、海外学校和三方未命中场景继续允许手动输入。

## 范围

- 新增中国大陆高校本地字典表、六层数据访问实现和生产迁移脚本。
- 新增咕咕数据 School Provider、环境配置、超时和错误映射。
- 新增 C 端学校搜索接口与小程序学校搜索选择组件。
- 学历认证页和基础资料编辑页共用搜索能力。
- 保存学校时保留标准名称和稳定学校代码；兼容只提交文本的旧客户端。
- 核对小程序现有对接状态，输出接口字段调整前后对照并更新 PRD-01 移动端 API handoff 文档。
- 自测学校搜索接口和现有保存喜欢歌曲接口，输出实际数据证据。

不在本次范围：后台学校字典管理页、全量定时同步任务、港澳台或海外学校三方库、学历真实性核验 Provider。

## 方案选择

采用“本地优先、三方补全、成功入库”的懒加载字典方案：

1. 小程序提交 2 至 50 个字符的关键词，固定请求前 10 条。
2. 后端按标准名称、简称、旧称查询本地 `school_dictionary`。
3. 本地命中满 10 条时直接返回。
4. 本地不足 10 条且该关键词 10 分钟内未成功同步时，调用咕咕数据。
5. 以 `SchoolUUID` 为首选唯一键、学校代码为辅助键，将三方记录 upsert 到本地表。
6. 重新查询本地数据，按精确名称、简称/旧称、前缀、包含的优先级排序，去重后返回前 10 条。
7. Redis 写入关键词成功同步标记，TTL 为 10 分钟；Redis 不可用不阻断学校搜索。
8. 三方超时、限流、欠费或不可用时返回已有本地结果；没有候选时允许手动输入。

## 数据模型

`school_dictionary` 继承 `BaseEntity` 的审计字段和逻辑删除字段，新增：

- `provider_uuid`：咕咕数据 `SchoolUUID`，唯一。
- `school_code`：学校编号，可为空，建立普通索引。
- `school_name`：标准名称。
- `short_name`：简称。
- `old_name`：旧称。
- `province`、`city`、`district`：中国大陆行政区文本。
- `college_type`、`college_category`、`education_level`、`college_property`：学校分类元数据。
- `is_985`、`is_211`、`is_dual_class`：学校层级元数据。
- `source`：固定为 `GUGUDATA` 或 `MANUAL`。
- `provider_updated_time`：本地最后一次从三方更新的时间。
- `status`：`ENABLED` 或 `DISABLED`。

`app_user` 和学历审核记录继续保留学校名称快照，同时新增可空 `school_code`，旧客户端不传 code 时不阻断保存。

## 接口

### 学校搜索

`GET /miniapp/dict/schools?keyword=浙大&limit=10`

- `keyword`：必填，trim 后 2 至 50 字符。
- `limit`：可选，范围 1 至 10，默认 10。
- 返回：`code`、`name`、`shortName`、`province`、`city`、`is985`、`is211`、`isDualClass`、`source`。
- 接口使用现有 Token 拦截策略，不把三方 AppKey 暴露给客户端。

### 资料保存

- `BasicProfileSaveReq` 增加可空 `schoolCode`。
- `EducationSubmitReq` 增加可空 `schoolCode`。
- code 命中本地字典时，以字典标准名称覆盖客户端提交名称；code 为空时沿用现有手输规则。

## 配置与密钥

- `GUGUDATA_COLLEGE_ENABLED`：是否启用三方补全。
- `GUGUDATA_COLLEGE_BASE_URL`：默认 `https://api.gugudata.com/location/college`。
- `GUGUDATA_COLLEGE_APP_KEY`：私有密钥。
- `GUGUDATA_COLLEGE_CONNECT_TIMEOUT_MILLIS`：默认 2000。
- `GUGUDATA_COLLEGE_REQUEST_TIMEOUT_MILLIS`：默认 4000。

测试/本地密钥写入已被 Git 忽略的 `backend/.env.local`，生产密钥写入已被 Git 忽略的 `deploy/secrets/prod.env`。可提交的 YAML、示例 env 和部署脚本仅引用变量名，不包含密钥值。

## 前端交互

当前基线核对：小程序尚未对接学校搜索接口；`EducationSubmitPage` 使用普通文本 `InputRow`，基础资料请求仅提交 `school` 文本。实现时新增学校搜索 service/types/组件，并在学历认证与基础资料编辑两处接入。

- 输入少于 2 个字符不发请求。
- 输入停止 300ms 后发起搜索；新输入取消采用旧响应。
- 候选最多展示 10 条，展示学校名称和省市。
- 点击候选保存 `schoolCode + schoolName`。
- 用户继续修改已选择文本时清空 `schoolCode`，按手动输入提交。
- 请求失败显示非阻断提示并保留输入内容。

## 异常与安全

- AppKey 仅通过服务端 `X-GUGUDATA-APPKEY` Header 发送，不进入 URL、响应、业务日志、测试报告或 Git。
- 三方业务码非成功、HTTP 429/5xx、超时和 JSON 异常均视为补全失败，不清空本地结果。
- 三方返回记录必须做字段长度、空值和 URL 数据清洗后才能入库。
- 同一关键词的三方成功查询使用 Redis 10 分钟去重；失败不写成功标记，允许后续重试。

## 测试设计

- L2：Controller 参数绑定、缺少关键词、合法请求返回精确 `R<List<SchoolOptionVO>>`。
- L3：本地 10 条不调用三方；本地不足时调用并 upsert；三方失败回退本地；重复候选去重；简称和旧称搜索；保存时 code 标准化名称；手输兼容。
- Provider：真实 AppKey 冒烟查询至少覆盖 `浙江大学`、`浙大`、`北京大学`，记录状态码、候选名称和数量，不输出密钥。
- C 端 L1：真实启动后请求 `/miniapp/dict/schools`，验证首次补全、数据库落库和二次本地命中。
- 回归：请求 `/miniapp/profile/favorite-song` 保存一条测试歌曲，再查询资料详情验证歌曲 ID、名称、歌手和封面字段。
- 小程序：运行类型检查/构建和学校搜索交互脚本。
- 文档：更新 `docs/技术方案/2026-07-07-用户准入与资料认证初始化-mobile-api-handoff.md`，列明新增查询接口、响应字段以及两个保存请求新增的 `schoolCode` 字段。

## 验收标准

- 中国大陆学校关键词可以返回真实候选，前 10 条结果结构稳定。
- 首次三方结果写入本地，二次请求可从本地命中。
- 三方不可用不阻断已缓存搜索和手动填写。
- 测试与生产私有配置均包含有效 AppKey，提交文件不含明文密钥。
- 学校搜索 C 端接口和保存喜欢歌曲接口均有真实执行证据与测试报告。
- 小程序已实际调用学校搜索接口，API handoff 文档与最终代码字段一致，并向用户输出字段变更对照。
