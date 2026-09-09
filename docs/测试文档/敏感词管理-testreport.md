# 敏感词管理 - 测试报告

> 更新：2026-09-09。最新 Vocabulary-clean3.zip 初始化48,244条，全部启用；初始化后后台的实际编辑/删除予以保留，维护后48,243条。菜单已按最新要求移入「运营中心」。
> 累计77项用例：77 PASS / 0 FAIL / 0 BLOCKED（包含此前回归，不代表本轮全部重跑）。最新增量修复启停跨域403及即时查询，FIX-01—05通过；此前9项真实业务HTTP流程与1项真实后台浏览器验收保留。

## 1. 当前交付与验证

| 执行项 | 结果与边界 |
| --- | --- |
| 最新附件初始化 | Vocabulary-clean3.zip，SHA256 1099308ba86bcc95d8bbd84b7bcc66fcfd7b5057948422a57ad9caff3dd6084a；48,244条全局唯一原词、18个分类选项（17个非空）、48,212规范化匹配键；全部ENABLED，0停用。11:21全量核对附件一致 |
| 后续实际维护 | 后台随后编辑1条初始化词、删除1条初始化词；当前维护后快照48,243条全部启用。这些管理操作保留，未覆盖回初始化内容 |
| 替换旧初始化 | 本次全部49,188条旧有效词逻辑删除，写入48,244新词，刷新标记10→11；预检确认额外后台新增词为0，覆盖整个当时有效词库。最初51,344条历史删除状态保留 |
| 一级菜单修复 | SidebarSection原本对无子项一级节点直接返回null；现在有path的独立页面显示一级链接，无path空目录继续隐藏。回归修复前失败、修复后通过 |
| Java相关自动化 | 之前202项去重回归全部通过，其中16项真实MySQL。此前词库替换阶段未修改后端生产逻辑；最新启停修复修改WebConfig，见第10节；不把此前原词库性能实验冒称本次新词库性能重测 |
| Python/数据库 | 生成器4项通过；原初始化SQL6项隔离MySQL回归保留；新替换事务5项独立MySQL回归通过；新附件全量开发库核对通过 |
| 受控页面测试 | 12项通过（原11项+新增一级菜单），API响应受控，不代替真实验收 |
| 此前真实浏览器回归 | 4项去重通过：未登录保护；一级菜单/全量词库/18类/状态/搜索/刷新重登；真实审核数据；四种真实角色权限。无page.route伪造数据 |
| 真实L1 | 七API CRUD、重复校验通过；6项非法参数/重复请求均拒绝，词库总数不变；七接口无登录均401 |
| 实际审核数据 | 准入文字227条、社区内容37条、动态32条、评论44条；保留各自原业务模块，未伪造新的审核记录 |
| 此前重启持久性 | clean词库阶段已重启本任务创建的验收后端，正常登录核对49188全部启用、0停用；本次clean3通过刷新标记刷新，没有重启 |
| 前端正式构建 | npm run build通过；已有大chunk提示保留，不是构建失败 |

用户明确要求最新文件所有初始化词启用，原来的“默认停用”决定已作废。未对新文件做语义删词或自行停用。密码只在本轮进程内使用，未写入项目文件或报告。真实角色测试经正常管理员API创建4个临时账号、3个角色，全部清理，仅清理自身测试词。

页面回归曾出现两个测试等待问题：先是串行分类检查耗尽整个90秒预算，后是页面默认5秒等待短于实际加载。已改成四路独立分类核对、等待真实列表响应和有界15秒呈现等待，并从正常审核页进入菜单；相关用例最终通过。直连与代理列表接口实际抽样约2.2—2.9秒，未将该值作为生产SLA，也未绕过前端10秒请求超时。

## 2. 验收汇总

| 分组 | 用例数 | PASS | FAIL | BLOCKED |
| --- | ---: | ---: | ---: | ---: |
| DATA | 8 | 8 | 0 | 0 |
| L1 | 3 | 3 | 0 | 0 |
| L2 | 6 | 6 | 0 | 0 |
| L3 | 24 | 24 | 0 | 0 |
| DB | 7 | 7 | 0 | 0 |
| L4 | 9 | 9 | 0 | 0 |
| E2E真实业务 | 10 | 10 | 0 | 0 |
| PERF | 4 | 4 | 0 | 0 |
| FIX启停与查询 | 5 | 5 | 0 | 0 |
| REL生产发布清单 | 1 | 1 | 0 | 0 |
| **合计** | **77** | **77** | **0** | **0** |

PASS按用例所属层级解释。资料L3下游审计服务受控模拟、微信HTTP/Token传输受控，之前真实MySQL证据往返与生产JSX转义检查并不等于小程序在线端到端验收。

## 3. 逐项执行矩阵

| ID | 场景 | 结果 | 证据 / 边界 |
| --- | --- | --- | --- |
| DATA-01 | TXT 非空行及 JSON.words、全局初始化去重和随机归类 | PASS | clean3全量48,244原词与分类逐条核对；18个分类选项、非法网址0条；合并总表集合一致且不重复导入。生成器4项回归通过，历史附件夹具保留。 |
| DATA-02 | 已有词条或重复初始化，包括已编辑、停用、逻辑删除的数据 | PASS | MySQL seed test_01：编辑、停用/启用、全部逻辑删除后重复执行均整批跳过。 |
| DATA-03 | 安全编码 | PASS | MySQL seed test_02：引号、反斜杠、换行、NUL、emoji及大小写精确往返。 |
| DATA-04 | 空表初始化中断、失败及并发执行 | PASS | MySQL seed test_03/04：第二批故障全回滚；两连接经正式runner初始化仅一次。 |
| DATA-05 | 精简字段与页面返回 | PASS | MySQL seed test_05、Controller/VO及页面复核：字段精简、根菜单、18分类。 |
| L2-01 | 七个接口绑定及返回 | PASS | SensitiveWordControllerTest；七路由准确绑定并沿用R<T>。 |
| L2-02 | 空词、超长词、非法状态 | PASS | SensitiveWordControllerTest / SensitiveWordServiceImplTest 参数拒绝。 |
| L2-03 | 无权限访问/编辑 | PASS | SensitiveWordInterceptorIntegrationTest 真实TokenInterceptor+PermissionInterceptor；Redis会话存储受控模拟。 |
| L3-01 | 同词同分类/跨分类新增、修改为其他已有词、停用词重复、并发新增、修改自身及多轮删除再新增 | PASS | Service查重单测；DB01并发新增/跨分类修改撞词；DB02停用、自身编辑、删除重建。 |
| L3-02 | 非法分类、不存在记录 | PASS | SensitiveWordServiceImplTest 参数/不存在记录拒绝。 |
| L3-03 | 新增、编辑、启停、逻辑删除及多人编辑 | PASS | Service/DAO单测、DB02实际编辑/PATCH/逻辑删除/审计操作者与时间。 |
| L3-04 | 字面词、单字符、重叠词、全半角/大小写、网址 | PASS | LocalSensitiveWordServiceImplTest 字面、Unicode、单字符/重叠/规范化；PERF oracle。 |
| L3-05 | 提交后预热、多次校验及词库变化 | PASS | DB03真实commit/rollback；DB06无通知跨实例刷新与版本重试。 |
| L3-06 | 初始化缺失、词库连接/查询失败、版本读取/重建异常 | PASS | Local/WechatLocal测试；DB05真实读池耗尽、SQL超时、连接中断和恢复；holder启动不连库。 |
| L3-07 | 本地命中 | PASS | WechatLocalSensitiveWordTest与BusinessMatrix：本地REJECT时token/http零调用。 |
| L3-08 | 本地未命中 | PASS | WechatLocalSensitiveWordTest与BusinessMatrix：本地PASS保留微信四种结果。 |
| L3-09 | 图文及空正文 | PASS | WechatLocalSensitiveWordTest与BusinessMatrix：图文正文短路、空正文媒体链路。 |
| L3-10 | Provider 映射与 C 端隐私 | PASS | Provider证据测试、业务矩阵、管理员详情测试；固定安全原因和内部证据分离。 |
| L3-11 | 资料/动态/诚意贴/评论状态回归 | PASS | SensitiveWordBusinessMatrixTest：社区真实业务状态/计数；资料真实OpenTextService审核决策调用。 |
| L3-12 | 本地不可用后各业务处理 | PASS | BusinessMatrix覆盖本地PASS/UNAVAILABLE × 微信四态 × 资料/普通帖/诚意贴/评论。 |
| L3-13 | 本地不可用后图文审核 | PASS | BusinessMatrix与WechatLocal：文字通过才审图、文字拒绝短路、诚意贴人工。 |
| L3-14 | 本地异常恢复 | PASS | Local冷却恢复测试、DB05断连恢复、DB06旧版本/新实例。 |
| L3-15 | 本地异常边界与事务 | PASS | DB05真实健康事务仍commit；BusinessMatrix保存异常传播、原业务分支不被本地catch吞掉。 |
| L3-16 | 跳过记录及 C 端 | PASS | Local诊断/原因计数测试，BusinessMatrix保留原回执，C端无新增词库异常提示。 |
| L3-17 | 提交后任务拒绝、刷新通知遗漏、另一实例或进程重启 | PASS | DB03刷新任务拒绝后仍commit、DB06漏通知和新实例；Local有界任务测试。 |
| L3-18 | 连续修改及并发审核 | PASS | Local并发future/版本变化测试；DB06混合读取重试；PERF12次更新/4线程审核。 |
| L3-19 | 外层业务事务已有旧读视图 | PASS | DB04显式RR旧视图与独立读；DB05健康事务隔离。 |
| L3-20 | 保存成功与在途审核的生效边界 | PASS | DB06与Local版本切换/并发测试；提交后新查与已有查的快照边界。 |
| L1-01 | 真实环境 CRUD 往返 | PASS | 真实管理员登录后完成七API增查改/清备注/PATCH/删除/跨类查重，测试词只清理自身。sensitive-word-live-crud.json。 |
| L4-01 | 页面、筛选、分页及分类单选 | PASS | Playwright all eighteen single-select categories、筛选/分页/重置；响应受控模拟。 |
| L4-02 | 新增/编辑/删除 | PASS | Playwright新增、最新详情编辑、清备注、删除确认、失败保留输入；响应受控模拟。 |
| L4-03 | 权限 | PASS | Playwright无list不请求、只读按钮；响应受控模拟，实际角色验收见L4-07。 |
| L4-04 | 导入功能不存在 | PASS | Playwright无导入入口；Controller固定七API无导入接口。 |
| DATA-06 | 初始启用策略 | PASS | 用户明确要求全部ENABLED；本次SQL、首次核验DB48244启用/0停用一致；之后后台维护留下48243条，均启用。 |
| L2-04 | 状态专用 PATCH，包括同状态、非法状态、已删除 ID | PASS | Controller/Service测试、DB02、页面PATCH body断言及同状态幂等。 |
| L2-05 | page/size/ID/keyword 边界、非法分类与状态 | PASS | Controller/Service边界、空筛选整改；非法非空枚举仍拒绝。 |
| L2-06 | 七个接口的真实拦截器组合 | PASS | SensitiveWordInterceptorIntegrationTest 7项：七API逐个核对无Token、非后台Token、权限及合法Token。 |
| L3-21 | 原词包含中文、双引号、反斜杠、控制字符及最长合法内容 | PASS | WechatSensitiveWordEvidenceTest；DB07最长256 UTF-16及控制字符在三处JSON往返。 |
| L3-22 | 同规范化键的多原词分别启停 | PASS | Local规范化同键最小启用ID、分别停用及全部停用；DB原词A/a/全角分别保存。 |
| L3-23 | 普通空格、NBSP、全角空格、U+0085、补充平面字符及内部空格 | PASS | Service/seed Unicode trim与UTF-16长度；DB精确SQL比较及特殊字符；页面超长拦截。 |
| L3-24 | 刷新等待超时、取消单个请求、任务拒绝、冷却和关闭 | PASS | Local超时不取消共享future、冷却、拒绝和关闭；DB05资源关闭/恢复。 |
| DB-01 | 真 MySQL 两连接并发同词/跨分类新增、修改撞词 | PASS | SensitiveWordDatabaseIntegrationTest 两连接新增、跨分类修改撞词，真实Spring事务代理。 |
| DB-02 | 停用词查重、修改排除自身、同词多轮删除再新增、并发启停 | PASS | DB02同词多轮删除新ID、状态不覆盖词/备注、精确搜索、不同操作者审计。 |
| DB-03 | 写事务回滚、提交后预热、刷新行缺失或更新失败 | PASS | DB03真实回滚/commit回调、缺刷新行、刷新更新触发器故障、RejectedExecutionException。 |
| DB-04 | 外层 RR 事务先建立旧读视图，其他连接更新词库 | PASS | DB04明确ISOLATION_REPEATABLE_READ，主事务仍旧revision而专用会话读到新值。 |
| DB-05 | 小型业务连接池已占满、读池获取超时、查询超时/断连 | PASS | DB05主池占满、读池500ms等待、真实表锁触发SQL超时、KILL自身测试连接、健康事务与恢复；Boot主池/工厂各一份。 |
| DB-06 | 两个词库服务实例共享主库，其中一个没有收到主动刷新；重启及在途检查 | PASS | DB06两个实例、无通知、旧数据读取期间实际提交新版本、新实例冷启动；新旧不混合。 |
| DB-07 | 本地命中证据真实保存并读取，然后修改/删除词条 | PASS | DB07社区after_snapshot、准入machine_signal_json、Provider response_payload_json真实往返，修改/删除词后证据不变；管理员/C端边界另由服务与渲染测试验证。 |
| L1-02 | 真实初始化结果经七个 API 往返 | PASS | 此前clean词库完成七API往返；本次clean3初始化全量DB核对与后续维护快照分别记录，页面验收按当前数据。sensitive-word-real-page.json。 |
| L1-03 | 真实 API 未登录/权限不足/非法参数/重复词 | PASS | 实际七API未登录401；四个真实权限账号403边界；6项非法参数/重复请求拒绝且词数不变。real-rbac.json及real-validation.json。 |
| L4-05 | 合法后台账号登录，从运营中心进入敏感词管理 | PASS | 真实登录验证运营中心展开/折叠，敏感词入口位于消息通知记录之后；原路由打开48243条启用记录，刷新重登通过，非Mock。 |
| L4-06 | 旧列表上的状态按钮、新增/编辑失败、删除页末项、快速切换查询 | PASS | Playwright PATCH-only、页末回退、GET乱序、mutation完成后当前query重载、保存成功与重载失败分离。 |
| L4-07 | 无列表权限、只读、编辑和删除分离的实际角色 | PASS | 经真实管理员API创建四个临时用户、三个角色，实际登录验证无权限/只读/编辑/删除分离，验证后全部清理。 |
| L4-08 | 数据持久性与机审证据详情 | PASS | 本轮使用既有开发账号正常登录并从HTTP业务入口提交，真实机审、落库、C端接口回执和后台证据详情串联核验；11条新记录全部逐条读库、三模块真实UI及刷新通过。此前词库重登/重启验证保留。 |
| PERF-01 | Java 21 真实附件启用数据构建、旧树保留时重建 | PASS | 运行态全附件启用+2条前缀夹具，Java21/Xmx256MiB，GC后稳定堆和5ms重建采样。 |
| PERF-02 | 首部命中、末尾命中、未命中、长公共前缀、各业务最大合法正文 | PASS | 8类样本各预热10/测100；含首尾、未命中、共同前缀、300/500/实际社区500上限、8192对抗样本，逐次结果比对字面oracle。 |
| PERF-03 | 单次更新、连续更新、并发审核时更新 | PASS | 12次实际事务更新、4审核线程320检查；统计构建轮次、唯一构建线程和故障跳过，最终收敛到revision16。 |
| PERF-04 | 应用内端到端资源验证 | PASS | 性能数据计入真实revision查询；DB05覆盖资源等待/超时/断连；报告不推断整机或生产永不OOM。 |
| L4-09 | 一级页面与目录共存 | PASS | 修复前真实组件回归稳定失败；修复后12项受控页面通过，真实根菜单也可见。空目录保持隐藏。 |
| DATA-07 | 新附件替换旧初始化词 | PASS | 本次旧49188条全部逻辑删除、新clean3的48244条全部启用；提交后全量原词/分类一致，合并总表不重复导入；后续后台维护保留。 |
| DATA-08 | 替换安全性与重跑 | PASS | 5项独立MySQL测试：保留额外词、拒绝修改/冲突、二批插入失败整笔回滚、重复不导入、预检无写入。 |

## 4. 历史原词库性能验证：实际内存和性能

Java 21.0.11，Windows 11，主机i7-12700H（14核/20逻辑处理器），JVM限制为2个处理器，Xmx=256MiB。库为com.hankcs:aho-corasick-double-array-trie:1.2.3。附件51344原词全部启用，规范化51085键；随后额外新增2条前缀测试词。以下堆统计包含测试Spring/JDBC及夹具，不是仅AC对象的大小。

| 指标 | 本次测量 |
| --- | --- |
| 首次构建 / 可用 | 1016 / 1146 ms |
| GC后含初始索引的堆 | 47.59 MiB |
| 初次构建采样峰值 | 149.15 MiB |
| 重建采样峰值 | 253.48 MiB |
| 更新后可见等待 | 1267 ms |
| 连续更新 | 12次；4线程/320次检查；构建轮次2，构建线程1 |
| 该轮更新期间跳过本地 | 4次；按需求继续后续微信，不使用未知版本旧树拒绝 |

每类预热10次、测量100次，耗时包括真实主库revision查询；结果逐次与直接字面包含oracle核对。

| 样本 | p50 ms | p95 ms | p99 ms |
| --- | ---: | ---: | ---: |
| head-hit | 8.345 | 9.269 | 10.680 |
| tail-hit | 8.353 | 10.118 | 10.577 |
| no-hit-300 | 8.248 | 9.058 | 9.617 |
| long-common-prefix | 8.262 | 10.562 | 12.389 |
| about-me-max-300 | 8.188 | 9.384 | 10.200 |
| profile-answer-max-500 | 8.152 | 11.437 | 18.536 |
| community-post-max-500 | 8.207 | 9.992 | 16.046 |
| long-adversarial-8192 | 8.442 | 9.870 | 12.270 |

持续更新下的跳过比例会随构建与更新时序变化：较早一轮相同12次更新/320检查出现300次跳过，最新测量见上表。这符合已确认的故障跳过策略，不能把异步更新宣传为每次都立即生效或稳定低于1秒。没有擅自改变该策略。

两次并行启动JVM遇到本机原生内存不足，其中一次发生在测试进程启动阶段（0测试执行、未加载词库）。改为串行、限制堆和处理器后测试通过。上述测试没有Java堆OOM，但不能据此承诺生产不会OOM，也不应把256MiB测试堆当作整套业务服务的容量配置。

## 5. 当前证据

- ../test-artifacts/sensitive-word-clean3-replacement-20260909.json：最新整批原子替换范围和结果。
- ../test-artifacts/sensitive-word-clean3-current-state-20260909.json：后续真实后台编辑/删除之后的只读数据快照。
- ../test-artifacts/sensitive-word-clean3-runtime-20260909.json：当前服务运行与AC刷新日志。
- ../test-artifacts/sensitive-word-clean-replacement-20260909.json：此前clean替换历史结果。
- ../test-artifacts/sensitive-word-dev-data-verification-20260909.json：clean3导入后首次完整词库、分类、状态与附件一致（后台后续维护前）。
- ../test-artifacts/sensitive-word-seed-summary.json：当前启用SQL、分类计数、SHA256。
- ../test-artifacts/sensitive-word-replacement-tests-20260909.json：5项新替换回归。
- ../test-artifacts/sensitive-word-live-crud.json：真实CRUD。
- ../test-artifacts/sensitive-word-real-validation.json：6项实际非法参数/重复校验。
- ../test-artifacts/sensitive-word-real-page.json：真实菜单、18分类/样本/筛选、重载重登。
- ../test-artifacts/sensitive-word-real-rbac.json：4类实际权限、临时账号/角色清理。
- ../test-artifacts/sensitive-word-real-audit-pages.json：已有审核数据统计。
- ../test-artifacts/sensitive-word-real-restart.json：此前clean词库阶段实际后端重启后真实数据可读。
- ../test-artifacts/sensitive-word-real-initialized-list.png：登录后的词库列表截图。
- ../test-artifacts/sensitive-word-real-source-search.png：搜索附件样本截图。
- ../test-artifacts/sensitive-word-real-text-audits.png：真实准入文字审核列表截图。
- ../test-artifacts/sensitive-word-final-environment-20260909.json：最终服务与数据状态。
- ../test-artifacts/sensitive-word-java-regression-20260908.json：既有202项Java回归。
- ../test-artifacts/sensitive-word-runtime-performance-20260908.json：历史原词库性能明细。
- ../../tmp/sensitive-word-implementation/implementation-review.md：此前两轮独立审查。

## 6. 执行入口与剩余项

- scripts/generate_sensitive_word_seed.py：当前clean3附件生成48,244条ENABLED数据到082；原附件校验支持保留供历史回归。
- scripts/replace_sensitive_word_vocabulary.py：--dry-run先核对旧初始化范围；显式指定新附件和初始状态，在一个事务中替换。不能直接使用空表初始化器覆盖已有词库。
- scripts/verify_sensitive_word_initialization.py：只读逐条核对当前附件与数据库。
- scripts/test_sensitive_word_live.py：从私有配置或进程环境读取真实管理员凭据，七API回归仅清理自身词。
- frontend/e2e-tests/tests/sensitive-words-real.spec.ts：真实菜单、数据与角色验收。私有配置缺失时跳过，不伪造Token或接口。

L4-08已于本轮解除阻塞：项目文档既有开发账号123通过正常验证码登录，已验证真实HTTP业务提交、本地/微信机审、业务表落库、管理端详情和C端接口回执，详见第9节。本轮没有自动操作微信客户端界面；C端证据来自真实业务接口，后台展示由真实浏览器验证。

最初DISABLED导入及失败排查文件保留为历史证据；以本报告、当前新附件SQL和最新替换/核对报告为准。未提交、推送或部署生产。

## 7. 2026-09-09 最新 clean3 替换增量回归

- 本次按用户要求清除当时全部49,188条旧有效词，以单个事务导入48,244条clean3原词，全部ENABLED；预检确认没有额外维护词。生成SQL与当前附件SHA256一致。
- 11:21全量核验PASS：48,244条原词及分类逐条与附件一致，重复0、停用0；18分类选项，其中非法网址0条。全库合并总表的集合与分类文件完全相同，仅用于校验，没有重复入库。
- 生成器4项回归PASS；本次未重复运行业务代码未改变的202项Java、全部角色写操作与历史性能测试。
- 页面首次核验遇到同期真实后台维护，腾讯分类数量从31622变为31621，初始化基线断言失败。只读审计核对证明为导入之后的编辑/删除，并非少导入；没有覆盖这些维护操作。
- 独立保存维护后的只读快照后，真实Playwright菜单/列表/18分类逐类数量/状态/附件样本搜索/刷新/重登用例1项PASS，约1分钟；未Mock响应，未额外修改词条。当前截图为48,243条全部启用。
- 最终真实数据仍为48,243启用、0停用、旧词有效数0；1条初始化词被后台编辑，1条被删除，均保留。当前运行进程的AC日志已发布revision16、48,243启用原词、48,211规范化键，构建591ms；此单次运行日志不替代完整性能基准。
- 前端5173、后端8080保持运行。首次初始化一致性报告与后续管理快照分别保留，不将维护后的变化写成初始化失败，也不将历史61项结果宣称为本次全量重测。

## 8. 2026-09-09 菜单移入运营中心

- 按用户最新要求，将同一个敏感词页面菜单移到既有「运营中心」，排序10，位于消息通知记录查询（排序5）之后。原路由仍为/sensitive-words，菜单ID和三个按钮权限关联保留。
- 081结构/菜单脚本已同步最新父子关系；既有页面可以原位迁移，空环境可补齐运营中心。仅为已拥有敏感词页面的角色补齐无业务权限的父目录关联。
- 真实数据库核对PASS：运营中心下1个敏感词页面，最外层0个，三个按钮仍挂原页面，缺少父目录的已授权有效角色0个。48243条启用词及词库revision16保持原样。
- 真实Playwright既有页面用例1项PASS（约1.3分钟）：展开/折叠运营中心、进入页面、18分类/状态/搜索、刷新、重新登录。未Mock响应，无词库写入。本轮为菜单配置调整，未重复Java业务测试和前端构建。
- 证据：sensitive-word-menu-operation-migration-20260909.json、sensitive-word-menu-operation-verification-20260909.json、sensitive-word-real-page.json；列表截图已更新为运营中心内入口。

## 9. 三模块真实业务流程验收（2026-09-09）

用户要求走真实业务流程并在后台保留可查看数据。本轮使用项目文档已有开发账号123（昵称啵啵啵，准入CORE_ALLOWED），经正常验证码接口登录取得真实会话；没有向Redis手工写Token，没有直接插入审核记录，没有Mock业务接口或微信返回。

发现本机原资料文字Provider默认mock，社区Provider默认wechat。现已将验收启动器明确设为微信，并把application-dev.yml资料文字默认值改为wechat（仍支持环境变量显式覆盖）。后端PID28648、前端5173与后端8080运行。微信机审通过的资料任务provider_code=wechat-content-security、mocked=0；命中资料任务provider_code=local-sensitive-word、mocked=0。

| 用例 | 实际结果 |
| --- | --- |
| E2E-01 | PASS：自我介绍命中→REJECTED；C端回执通用原因；保留原已通过自我介绍，后台真实命中证据可查 |
| E2E-02 | PASS：关于我固定问题命中→REJECTED；审核记录和详情来源/词/分类一致 |
| E2E-03 | PASS：普通动态命中→rejected；后台内容记录可查，公共用户动态查询不显示 |
| E2E-04 | PASS：诚意贴命中→rejected；没有误转待人工 |
| E2E-05 | PASS：普通动态本地未命中→真实微信pass→published |
| E2E-06 | PASS：两条诚意贴均微信pass后pending_manual；保留一条待人工，另一条经后台审核API APPROVED后published，C端详情一致，人工历史保留 |
| E2E-07 | PASS：评论命中→rejected，回执“评论未通过审核”；公开评论列表无该条，主帖计数0→0 |
| E2E-08 | PASS：正常评论与回复均微信pass后published，C端列表可见；主帖评论计数0→1→2 |
| E2E-09 | PASS：另一固定问题未命中→真实微信SUCCESS→APPROVED；Provider任务mocked=0 |
| E2E-10 | PASS：真实后台登录，在文字内容审核、内容管理、评论管理查询本批记录，打开三处本地命中证据并截图，刷新仍可见；Playwright 1 passed，约28秒 |

实际保留11条记录，全部经业务接口提交；每条ID、正文、作者、状态又与真实数据库逐条复核。未改动词库，仍48,243条全部启用，revision16。

| 模块 | 标记 | 记录ID / 业务编号 | 最终状态 |
| --- | --- | --- | --- |
| 文字内容审核 | 甲一自我介绍 | 1197 | REJECTED |
| 文字内容审核 | 甲二关于我 | 1198 | REJECTED |
| 文字内容审核 | 甲九正常问答 | 1199 | APPROVED |
| 内容管理 | 甲三普通动态 | 45 / POST-387B23E790DD42058A21 | rejected |
| 内容管理 | 甲四诚意贴 | 46 / POST-50778304454C4625A4D1 | rejected |
| 内容管理 | 甲五正常内容 | 47 / POST-E9C53169B7774786ACC9 | published |
| 内容管理 | 甲六待人工 | 48 / POST-B04E0AD0E4EF46FA9D9A | pending_manual |
| 评论管理 | 甲七评论 | 59 / CMT-A7DC2EB82BC5448D8BC5 | rejected |
| 评论管理 | 甲八评论 | 60 / CMT-7B73EBDFA7324DDD8D02 | published |
| 评论管理 | 甲八回复 | 61 / CMT-D3E93D9AF2234CBE8EF7 | published |
| 内容管理 | 甲六乙 | 49 / POST-887EAF2399BD4462AD81 | published |

查找方法：文字内容审核的“用户搜索”输入123（此框按用户搜索，不按正文）；内容管理和评论管理的关键词输入“敏感词回归0909”。所有记录按用户要求保留；其中“甲六待人工”诚意贴供用户继续查看人工审核入口。

测试脚本初次误读postId/commentId为id，后续按已创建记录精确匹配恢复，未重复提交已有样本；公共列表接口需登录，已按真实接口要求携带会话；正常样本文字“完成”命中现有词库，已换中性标签，未删词或停词。以上是脚本/样本整改，历史失败尝试保留于JSON，最终9项全部通过。

验证边界：本次覆盖真实资料/内容/评论的文字业务链、真实微信通过路径和诚意贴人工流程，没有伪造第三方风险/异常返回；微信错误矩阵、资源故障和并发边界沿用此前L3/DB回归。没有自动操作微信客户端UI，没有重跑全部202项Java或完整性能基准。

最新证据：
- ../test-artifacts/sensitive-word-business-real-20260909.json：9项真实HTTP、C端回执、11条记录及机审/人工证据。
- ../test-artifacts/sensitive-word-business-real-ui-20260909.json：三模块真实浏览器验收。
- ../test-artifacts/sensitive-word-business-real-db-20260909.json：11条真实表记录及评论计数只读核对。
- ../test-artifacts/sensitive-word-business-text-list.png、sensitive-word-business-text-evidence.png。
- ../test-artifacts/sensitive-word-business-content-list.png、sensitive-word-business-content-evidence.png。
- ../test-artifacts/sensitive-word-business-comment-list.png、sensitive-word-business-comment-evidence.png。

执行脚本为scripts/test_sensitive_word_business_real.py，凭据只从进程环境读取；已有报告时默认拒绝重写，必须检查后显式--resume，成功用例不再提交。L1入口为敏感词管理-真实业务-test-l1.sh；后台页面脚本为frontend/e2e-tests/tests/sensitive-word-business-real.spec.ts。

## 10. 启停权限提示与即时查询修复（2026-09-09 12:13）

### 根因与修复

- 真实浏览器点击停用，PATCH携带Origin经过前端代理到后端；旧WebConfig跨域允许方法不含PATCH，返回HTTP403与 `Invalid CORS request`。peter已有 `sensitive-word:edit`，未修改其角色或权限。此前无Origin的API及受控页面测试漏掉这个边界。
- 仅在 `/admin/sensitive-words/*/status` 增加PATCH/OPTIONS专用跨域映射，放在全局映射前。来源、请求头、凭据规则沿用原配置；其他接口不增加PATCH。登录和实时RBAC照常校验。
- 移除前端等待搜索提交的第二份筛选状态。关键词、分类、状态改变立即查询且回到第一页；搜索/回车重查、重置、分页、请求竞态和写后刷新行为均保留。

### 本轮执行（与历史结果分开计数）

| 执行项 | 结果 | 证据 |
| --- | --- | --- |
| 实际Origin预检对照 | PASS：状态PATCH200，其他路径PATCH403，原PUT200 | `docs/test-artifacts/sensitive-word-cors-fix-20260909.json` |
| MVC配置/权限/Controller | 16/16 PASS：WebConfigCorsTest 6，SensitiveWordInterceptorIntegrationTest 7，SensitiveWordControllerTest 3 | `tmp/sensitive-word-implementation/cors-green.log`；Maven surefire XML |
| 受控页面回归 | 13/13 PASS，含新增即时条件查询及已有旧响应/写后刷新测试 | `tmp/sensitive-word-implementation/interaction-green.log` |
| 真实页面筛选 | PASS，28.8s：第2页切分类回第1页，状态/关键词不点搜索即发请求，回车、搜索、重置 | `docs/test-artifacts/sensitive-word-filters-fix-20260909.json`；`sensitive-word-filters-fixed.png` |
| peter真实启停 | PASS，41.1s：页面按钮停用→启用，PATCH均200，详情回查及刷新一致，无权限提示消失 | `docs/test-artifacts/sensitive-word-status-fix-20260909.json`；`sensitive-word-status-fixed.png` |
| 前端构建 | PASS，tsc及Vite通过；已有大chunk警告，无新增构建错误 | `tmp/sensitive-word-implementation/frontend-interaction-build.log` |
| 数据保留 | PASS：48,243有效词全部启用，0停用；临时词0条，原3文字/5内容/3评论均保留 | `docs/test-artifacts/sensitive-word-interaction-db-20260909.json` |

| 用例ID | 结果 | 具体覆盖 |
| --- | --- | --- |
| FIX-01 | PASS | 3种允许来源预检；非法来源、非启停接口PATCH不放行；真实OPTIONS对照 |
| FIX-02 | PASS | 启停无登录401、缺edit权限403、有edit权限200；七路由原权限回归 |
| FIX-03 | PASS | peter正常登录，真实按钮启停、列表/详情一致、刷新保留，仅删除临时词 |
| FIX-04 | PASS | 分类/状态即时GET、条件组合、第2页切换回第1页 |
| FIX-05 | PASS | 关键词即时GET、搜索和回车重查、重置；旧响应/延迟写回归 |

修复前证据：真实停用PATCH403；配置测试5项中4项失败；即时筛选测试在选择分类后请求参数仍为空而失败。修复后全部通过。真实多步脚本初版30秒总预算/5秒响应等待不足，已改为120秒总预算/15秒响应等待，并在初始列表呈现后操作；未改应用10秒请求超时或跳过断言。

前后端继续运行：5173/8080，本任务后端PID19140。临时词的新增/启停/清理使刷新标记变为24，最终AC快照48,243启用词、48,211匹配键。前述11条真实业务记录保留；不将其重新创建或删除。


## 11. 线上版本排查与master发布准备（2026-09-09）

用户提交的动态50/51包含已启用词条，当前词库可匹配“枪支”“弹药”“炸药”“炸弹”。只读核查确认小程序普通构建指向线上域名，本机日志没有这两次提交；线上正常登录后敏感词接口返回业务404，两个动态详情返回通过。远程master仍为e1aa343c，功能代码0a765825仅在功能分支，尚未触发生产发布。因此属于线上运行版本未更新，不是AC字面匹配失效；未更改这两条历史动态状态。

用户随后授权合并master并提交推送。合并前补齐后端工作流SCP和迁移执行清单中的081建表/菜单与082最新初始化SQL，先迁移再启动新后端。082对任何非空表整批跳过，不覆盖用户已维护的词条。另将校验脚本逻辑路径统一为POSIX格式，解决Windows路径分隔符导致既有迁移例外表匹配失败。

REL-01：PASS。新增校验修复前明确报“backend SCP must include ...081...”；修复后生产配置静态校验、TIM运行配置门禁及部署脚本bash语法均通过，git diff --check通过。未重复执行已验证的业务测试，也未直接执行生产SQL；实际发布由推送master后现有GitHub Actions完成，发布结果须另外核对，不能把本地测试通过当作线上已更新。
