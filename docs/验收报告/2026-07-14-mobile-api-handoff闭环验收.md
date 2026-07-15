# 用户准入与资料认证初始化小程序闭环验收

## 1. 验收结论

按 `docs/技术方案/2026-07-07-用户准入与资料认证初始化-mobile-api-handoff.md` 第 2-11 节重新核对并完成修复。配置、字典、地区、登录、首登、主页资料、三重认证、审核型资料、独立资料、准入状态和 OSS 直传链路均已接入；原有蓝湖页面布局未因接口动态化被重构。

结论：代码、当前 dev 数据库、Java 21 本地后台、微信小程序构建产物均通过本轮门禁。

## 2. 本轮根因与修复

| 根因 | 修复 |
| --- | --- |
| 页面在配置未加载或认证文案缺失时继续渲染，导致标题、按钮和性别等选项为空 | 首登运行态校验字典、年龄、步骤和地区；认证目录统一校验 56 个文案 key 与 7 组字典，加载失败进入可重试错误态 |
| 认证子页各自异步初始化，错误后仍显示空壳 | 头像、实名、学历及认证中心统一接入 `VerificationRuntimeBoundary` |
| 学历 OSS 票据返回受保护相对地址，后端却只接受公网 URL，图片组件又无法携带 token | 后端接受严格 `/miniapp/file/credential/` 路径；小程序使用带 `X-Auth-Token` 的 `Taro.downloadFile` 生成临时预览，提交仍保存稳定相对地址 |
| 语音配置缺失时回退图片格式，dev 数据实际返回 jpg/jpeg/png | voice 缺省格式改为 mp3；新增幂等迁移修正现存配置并保留后台其他配置项 |
| 背景图错误配置为最多 4 张 | 数据库、运行时返回和业务服务三层钳制为最多 1 张待审核/审核中记录 |
| 标签分组依赖数据库存在 ALL 节点 | 服务端固定合成首个 `ALL/全部`，汇总全部标签并去重 |
| 性别、头像来源、学历人群/方式以及地区部分校验写死或不完整 | 枚举 code 统一查启用字典；省市区校验 `china_region` 真实节点和父子层级 |
| 媒体大小可不传，服务端无法按动态配置复核 | `fileSizeBytes` 前后端改为必填；相册新增和替换均透传 OSS 实际文件大小 |
| 登录响应的 nextStep 可能与服务端实时状态不一致 | 手机号和微信登录保存 token 后统一重新请求 `/miniapp/profile/init-status` 决定路由 |
| 个人主页预览仍使用演示用户数据 | 预览改为 `home-detail`、基础资料、相册、认证、标签、介绍和语音等真实数据模型；优先展示真实资料背景图 |
| 历史介绍/头像路由仍有演示状态或断链 | `intro`、`intro-edit`、`avatar-album` 改为安全薄重定向并编码透传 query |
| 原入口门禁漏掉 3 页且只查直接导入 | 精确解析 `app.config.ts` 全部 58 页，递归检查 import/export/dynamic import；构建后逐文件校验 Page/App 唯一注册 |

## 3. 动态化边界

- 认证目录使用数据库文案配置。本轮必需文案从 52 个扩展为 56 个，新增加载中、加载失败标题、加载失败说明、重新加载，均已写入当前 dev 数据库。
- 登录页、千寻、消息、推荐、社区、个人中心等设计稿固定 UI 文案不读取认证文案 key，避免认证配置缺失影响非认证页面。
- 性别、身份、学历、行业、职业、收入、婚姻、目标、感情状态、标签、审核状态、头像来源、学历认证人群和方式等业务枚举只提交 code，中文展示来自字典。
- 接口返回的驳回原因、准入阻断原因和业务错误信息继续按服务端结果展示。

## 4. 数据库验收

已在当前 dev 数据库执行：

- `048_prd01_gender_dictionary_seed.sql`
- `049_prd01_verification_runtime_seed.sql`
- `050_prd01_handoff_runtime_contract_fix.sql`

`050` 连续执行两次均成功，认证边界新增文案未重复。接口实测：

- voice：`maxCount=1`、`maxMb=20`、`formats=[mp3]`、时长 10-60 秒；
- profileBg：`maxCount=1`；
- gender：2 项；
- profileTagGroups：`ALL/MBTI/PERSONALITY/HOBBY/SPORT/FOOTPRINT`，ALL 汇总 36 个标签；
- 认证 56 个必需文案 key：缺失 0。

## 5. 接口与流程验收

Java 21 dev 后台已重新启动，使用 dev 固定登录态完成只读接口巡检：

- 公共接口：PRD01 配置、资料字典、地区省市区三级懒加载；
- 登录态接口：init-status、home-detail、basic、access-status、avatar、verify/status、real-name、education、albums、background、introduction、about-me、voice-intro；
- 共 16 个 GET 请求均返回 HTTP 200 且业务 code 200；
- 地区样例链路：`110000 -> 110100 -> 110101`；
- 学历上传票据返回 `protectedFile=true` 和 `/miniapp/file/credential/` 稳定地址；
- 语音票据接受 mp3、拒绝 jpg；
- 相册提交缺少 `fileSizeBytes` 被服务端明确拒绝，未写入业务数据。

## 6. 自动化验证

| 验证 | 结果 |
| --- | --- |
| `JAVA_HOME=...azul-21.0.5... mvn test` | 269 tests，0 failures，0 errors，1 skipped |
| `npm run validate:prd01-handoff` | 原 PRD01 30/30、新运行态 6/6、SQL 与真实预览契约通过 |
| `npm run build:weapp` | 编译成功；仅保留既有千寻图片体积警告 |
| 页面源码隔离门禁 | app.config 58 页递归检查通过 |
| 构建注册门禁 | 58 个页面各 Page=1，共享脚本 Page=0，App=1 |
| 消息模块门禁 | 消息 18 稿、举报链路与静态安全门禁通过 |
| 主页预览视觉门禁 | 蓝湖画布、卡片、相册、标题、MBTI 几何基线通过 |
| `git diff --check` | 通过 |

## 7. 视觉与可用性复核

- 原蓝湖绝对定位、尺寸、颜色、圆角和组件骨架保持不变，运行态边界只在未加载或失败时覆盖页面。
- 首登和认证页面不会在配置未完成时展示空标题、空按钮或空选项。
- 错误态包含明确说明与真实可见的重新加载按钮，不使用透明热区或截图交互。
- 主页预览仍保留 6803rpx 画布、828rpx 首图、4 个大图卡位、认证卡片和 MBTI 构图；业务内容改为真实数据。

## 8. 保留事项

- 小程序完整构建仍提示 `assets/lanhu/pages/qianxun-center.png` 超过 Webpack 推荐体积，这是本轮之前已有的资源体积告警，不影响构建和本次流程正确性。
- 本轮没有把非认证页面固定 UI 文案扩成数据库 key；该边界与当前约定一致。
