# PRD-01 用户准入与资料认证初始化 测试用例

> 关联文档：
> - `docs/技术方案/2026-06-03-PRD-01-用户准入与资料认证初始化-tcdesign.md`
> - `docs/需求文档/移动端/细化PRD-01_用户准入与资料认证初始化.md`
> - `docs/需求文档/管理后台/管理后台细化PRD-01_用户准入与资料认证初始化.md`

---

## L1 — cURL 接口测试（小程序端）

> 测试脚本: `docs/测试文档/用户准入-PRD01-test-l1-miniapp.sh`
> 前置条件: 后端正常启动，DB 已执行 DDL

### L1-01: 微信授权登录 — 新用户自动注册

| 项目 | 内容 |
| --- | --- |
| 用例编号 | L1-01 |
| 接口 | `POST /miniapp/auth/wechat-login` |
| 入参 | `{"code":"mock_new_user_code"}` |
| 预期结果 | code=200, data.token 非空, data.userId > 0, data.firstLoginCompleted=false |
| 验证点 | 1. 返回 token 2. firstLoginCompleted=false 3. DB中app_user记录已创建 4. DB中app_user_verification记录已创建 |

### L1-02: 微信授权登录 — 老用户登录

| 项目 | 内容 |
| --- | --- |
| 用例编号 | L1-02 |
| 接口 | `POST /miniapp/auth/wechat-login` |
| 入参 | `{"code":"mock_existing_user_code"}` |
| 预期结果 | code=200, data.token 非空, data.userId > 0, data.firstLoginCompleted=true |
| 验证点 | 1. lastLoginTime 更新 2. 不会重复创建用户 |

### L1-03: 微信授权登录 — 已冻结账号

| 项目 | 内容 |
| --- | --- |
| 用例编号 | L1-03 |
| 接口 | `POST /miniapp/auth/wechat-login` |
| 入参 | `{"code":"mock_frozen_user_code"}` |
| 预期结果 | code=5001, msg 包含"冻结" |
| 验证点 | 返回业务异常，拒绝登录 |

### L1-04: 微信授权登录 — 缺少 code

| 项目 | 内容 |
| --- | --- |
| 用例编号 | L1-04 |
| 接口 | `POST /miniapp/auth/wechat-login` |
| 入参 | `{}` |
| 预期结果 | code=4001, msg 不为空 |
| 验证点 | 参数校验生效 |

### L1-05: 首登资料 — 查询初始状态

| 项目 | 内容 |
| --- | --- |
| 用例编号 | L1-05 |
| 接口 | `GET /miniapp/profile/init-status` |
| 入参 | Header: X-Auth-Token (新用户token) |
| 预期结果 | code=200, data.currentStep=1, data.firstLoginCompleted=false |
| 验证点 | 新用户 step=1 |

### L1-06: 首登资料 — 第1步保存

| 项目 | 内容 |
| --- | --- |
| 用例编号 | L1-06 |
| 接口 | `POST /miniapp/profile/init-save` |
| 入参 | `{"step":1, "nickname":"测试同学", "gender":"MALE", "birthday":"2000-01-15", "height":175, "locationProvince":"广东", "locationCity":"广州", "hometownProvince":"湖南", "hometownCity":"长沙"}` |
| 预期结果 | code=200, data.nextStep=2 |
| 验证点 | 1. 字段已保存到DB 2. nextStep=2 |

### L1-07: 首登资料 — 第2步保存

| 项目 | 内容 |
| --- | --- |
| 用例编号 | L1-07 |
| 接口 | `POST /miniapp/profile/init-save` |
| 入参 | `{"step":2, "school":"中山大学", "educationLevel":"BACHELOR", "emotionalStatus":"LOOKING", "datingGoal":"SERIOUS_RELATIONSHIP", "maritalStatus":"UNMARRIED"}` |
| 预期结果 | code=200, data.nextStep=3 |
| 验证点 | 学校等字段已保存 |

### L1-08: 首登资料 — 第3步完成

| 项目 | 内容 |
| --- | --- |
| 用例编号 | L1-08 |
| 接口 | `POST /miniapp/profile/init-complete` |
| 入参 | `{"step":3, "aboutMe":"我是中山大学研二的学生,平时喜欢摄影和旅行,希望在这里找到志同道合的人"}` |
| 预期结果 | code=200, data.firstLoginCompleted=true, data.profileScore > 0 |
| 验证点 | 1. firstLoginCompleted=1 2. profileScore 已按权重计算 3. 自动触发头像认证（avatarVerifyStatus=PENDING） |

### L1-09: 首登资料 — 缺少昵称校验失败

| 项目 | 内容 |
| --- | --- |
| 用例编号 | L1-09 |
| 接口 | `POST /miniapp/profile/init-save` |
| 入参 | `{"step":1, "nickname":"ab"}` (2字以下) |
| 预期结果 | code=4001, msg 包含"昵称" |
| 验证点 | 昵称长度 2-12 校验 |

### L1-10: 首登资料 — 昵称含敏感词

| 项目 | 内容 |
| --- | --- |
| 用例编号 | L1-10 |
| 接口 | `POST /miniapp/profile/init-save` |
| 入参 | `{"step":1, "nickname":"敏感词测试"}` (含违禁词) |
| 预期结果 | code=4001, msg 包含"敏感" |
| 验证点 | 敏感词过滤生效 |

### L1-11: 资料详情 — 已有资料用户

| 项目 | 内容 |
| --- | --- |
| 用例编号 | L1-11 |
| 接口 | `GET /miniapp/profile/detail` |
| 入参 | Header: X-Auth-Token (已完成首登的用户) |
| 预期结果 | code=200, data 包含所有已填资料 + profileScore + accessStatus(canBrowseCards/canMatch/canBeExposed/blockReason) |
| 验证点 | 1. 所有字段正确返回 2. profileScore 计算正确 3. accessStatus 准入状态存在 |

### L1-12: 资料编辑 — 增量更新昵称

| 项目 | 内容 |
| --- | --- |
| 用例编号 | L1-12 |
| 接口 | `PATCH /miniapp/profile` |
| 入参 | `{"nickname":"新昵称测试"}` |
| 预期结果 | code=200, data.nickname="新昵称测试", 其他字段不变 |
| 验证点 | 1. 增量更新生效 2. profileScore 重新计算 |

### L1-13: 资料编辑 — 修改性别拒绝

| 项目 | 内容 |
| --- | --- |
| 用例编号 | L1-13 |
| 接口 | `PATCH /miniapp/profile` |
| 入参 | `{"gender":"FEMALE"}` |
| 前置条件 | 用户已设置 gender=MALE |
| 预期结果 | code=5001, msg 包含"不可修改"或"性别" |
| 验证点 | 性别锁定校验（首登提交后不可改） |

### L1-14: 资料编辑 — 修改头像触发认证重置

| 项目 | 内容 |
| --- | --- |
| 用例编号 | L1-14 |
| 接口 | `PATCH /miniapp/profile` |
| 入参 | `{"avatar":"https://cdn.example.com/new-avatar.jpg"}` |
| 预期结果 | code=200, verification.avatarVerifyStatus 更新为 PENDING |
| 验证点 | 1. 头像URL已更新 2. 头像认证状态重置为 PENDING 3. avatarVerifySubmitTime 更新 |

### L1-15: 资料编辑 — 修改 aboutMe 触文字审核重置

| 项目 | 内容 |
| --- | --- |
| 用例编号 | L1-15 |
| 接口 | `PATCH /miniapp/profile` |
| 入参 | `{"aboutMe":"新的关于我内容测试"}` |
| 预期结果 | code=200, verification.openTextAuditStatus 更新为 PENDING |
| 验证点 | 1. aboutMe已更新 2. 文字审核状态重置 3. openTextSubmitTime 更新 |

### L1-16: 认证状态查询

| 项目 | 内容 |
| --- | --- |
| 用例编号 | L1-16 |
| 接口 | `GET /miniapp/verify/status` |
| 入参 | Header: X-Auth-Token (已提交认证的用户) |
| 预期结果 | code=200, data 包含 realNameStatus/educationStatus/avatarVerifyStatus/verifyLevel/unlockMateRecommend |
| 验证点 | 1. 所有认证状态正确 2. verifyLevel 计算正确 3. unlockMateRecommend 判定正确 |

### L1-17: 提交实名认证

| 项目 | 内容 |
| --- | --- |
| 用例编号 | L1-17 |
| 接口 | `POST /miniapp/verify/real-name` |
| 入参 | `{"realName":"张三", "idCard":"110101200001011234"}` |
| 预期结果 | code=200, data.realNameStatus="APPROVED" (mock) |
| 验证点 | 1. 姓名/身份证号已保存（加密存储） 2. 状态变更为 APPROVED 3. verifyLevel +1 |

### L1-18: 提交实名认证 — 身份证格式错误

| 项目 | 内容 |
| --- | --- |
| 用例编号 | L1-18 |
| 接口 | `POST /miniapp/verify/real-name` |
| 入参 | `{"realName":"张三", "idCard":"123456"}` |
| 预期结果 | code=4001, msg 包含"身份证" |
| 验证点 | 身份证号格式校验（18位或15位） |

### L1-19: 提交学历认证

| 项目 | 内容 |
| --- | --- |
| 用例编号 | L1-19 |
| 接口 | `POST /miniapp/verify/education` |
| 入参 | `{"educationMethod":"CHSI", "verificationCode":"123456"}` |
| 预期结果 | code=200, data.educationStatus="PENDING" (mock 异步) |
| 验证点 | 1. 认证方式已保存 2. 状态为 PENDING 3. educationSubmitTime 已更新 |

### L1-20: 头像认证检查

| 项目 | 内容 |
| --- | --- |
| 用例编号 | L1-20 |
| 接口 | `POST /miniapp/verify/avatar` |
| 入参 | 无 |
| 前置条件 | 用户已有主头像 |
| 预期结果 | code=200, data.avatarVerifyStatus="APPROVED" (mock) |
| 验证点 | 1. 头像认证状态更新为 APPROVED 2. verifyLevel 重新计算 |

### L1-21: 准入状态 — 未完成首登

| 项目 | 内容 |
| --- | --- |
| 用例编号 | L1-21 |
| 接口 | `GET /miniapp/profile/access-status` |
| 入参 | Header: X-Auth-Token (首登未完成用户) |
| 预期结果 | canBrowseCards=false, canMatch=false, canBeExposed=false, blockReason 非空 |
| 验证点 | 首登未完成时全能力不可用 |

### L1-22: 准入状态 — 完成首登未实名

| 项目 | 内容 |
| --- | --- |
| 用例编号 | L1-22 |
| 接口 | `GET /miniapp/profile/access-status` |
| 入参 | Header: X-Auth-Token (已完成首登+未实名) |
| 预期结果 | canBrowseCards=true, canMatch=false, canBeExposed=false |
| 验证点 | 仅可浏览卡片，不可匹配曝光 |

### L1-23: 准入状态 — 完成首登且实名通过

| 项目 | 内容 |
| --- | --- |
| 用例编号 | L1-23 |
| 接口 | `GET /miniapp/profile/access-status` |
| 入参 | Header: X-Auth-Token (已完成首登+实名通过) |
| 预期结果 | canBrowseCards=true, canMatch=true, canBeExposed=true |
| 验证点 | 全能力可用 |

### L1-24: 准入状态 — 账号冻结

| 项目 | 内容 |
| --- | --- |
| 用例编号 | L1-24 |
| 接口 | `GET /miniapp/profile/access-status` |
| 入参 | Header: X-Auth-Token (已冻结用户) |
| 预期结果 | 全部 false, blockReason 包含"异常"或"冻结" |
| 验证点 | 冻结账号全能力锁定 |

---

## L1-Admin — 后台管理接口测试

> 测试脚本: `docs/测试文档/用户准入-PRD01-test-l1-admin.sh`
> 前置条件: 后台管理后端正常启动，admin 账号已登录，拥有全部管理权限

### L1-A01: 用户列表 — 基础分页

| 项目 | 内容 |
| --- | --- |
| 用例编号 | L1-A01 |
| 接口 | `GET /admin/users/app/list?page=1&size=20` |
| 预期结果 | code=200, data.records 不为空, data.total >= 0 |
| 验证点 | 分页正常返回 |

### L1-A02: 用户列表 — 按实名认证状态筛选

| 项目 | 内容 |
| --- | --- |
| 用例编号 | L1-A02 |
| 接口 | `GET /admin/users/app/list?realNameStatus=APPROVED` |
| 预期结果 | data.records 中所有用户 realNameStatus=APPROVED |
| 验证点 | EXISTS 子查询筛选生效，分页数正确 |

### L1-A03: 用户列表 — 按学校模糊搜索

| 项目 | 内容 |
| --- | --- |
| 用例编号 | L1-A03 |
| 接口 | `GET /admin/users/app/list?school=中山` |
| 预期结果 | data.records 中所有用户 school 包含"中山" |
| 验证点 | 模糊搜索生效 |

### L1-A04: 用户详情 — 基本资料

| 项目 | 内容 |
| --- | --- |
| 用例编号 | L1-A04 |
| 接口 | `GET /admin/users/app/{id}` |
| 预期结果 | code=200, data 包含 nickname/avatar/gender/birthday/age/height/locationProvince/locationCity/hometownProvince/hometownCity/school/major/educationLevel/aboutMe/hopeTheyKnow/tags/photos/profileScore |
| 验证点 | 基本资料区块完整 |

### L1-A05: 用户详情 — 认证信息内嵌对象

| 项目 | 内容 |
| --- | --- |
| 用例编号 | L1-A05 |
| 接口 | `GET /admin/users/app/{id}` |
| 预期结果 | data.verification 包含 realNameStatus/realNameRejectReason/realNameSubmitTime/educationStatus/educationMethod/educationRejectReason/educationSubmitTime/avatarVerifyStatus/avatarVerifyRejectReason/avatarVerifySubmitTime/profilePhotoAuditStatus/openTextAuditStatus/verifyLevel |
| 验证点 | VerificationBlock 内嵌对象所有字段存在 |

### L1-A06: 用户详情 — 准入信息

| 项目 | 内容 |
| --- | --- |
| 用例编号 | L1-A06 |
| 接口 | `GET /admin/users/app/{id}` |
| 预期结果 | data 包含 canBrowseCards/canMatch/canBeExposed/blockReason |
| 验证点 | 准入信息四字段存在且值正确 |

### L1-A07: 用户列表 — 按性别筛选

| 项目 | 内容 |
| --- | --- |
| 用例编号 | L1-A07 |
| 接口 | `GET /admin/users/app/list?gender=MALE` |
| 预期结果 | data.records 中所有用户 gender=MALE |
| 验证点 | 性别精确筛选 |

### L1-A08: 用户列表 — 按账号状态筛选

| 项目 | 内容 |
| --- | --- |
| 用例编号 | L1-A08 |
| 接口 | `GET /admin/users/app/list?accountStatus=FROZEN` |
| 预期结果 | data.records 中所有用户 accountStatus=FROZEN |
| 验证点 | 状态筛选生效 |

### L1-A09: 用户列表 — 按首登完成状态筛选

| 项目 | 内容 |
| --- | --- |
| 用例编号 | L1-A09 |
| 接口 | `GET /admin/users/app/list?firstLoginCompleted=0` |
| 预期结果 | data.records 中所有用户 firstLoginCompleted=0 |
| 验证点 | 首登未完成筛选 |

### L1-A10: 用户列表 — 关键词搜索

| 项目 | 内容 |
| --- | --- |
| 用例编号 | L1-A10 |
| 接口 | `GET /admin/users/app/list?keyword=测试` |
| 预期结果 | data.records 中所有用户 nickname 或 school 包含"测试" |
| 验证点 | 关键词模糊匹配 |

### L1-A11: 用户列表 — 按用户ID精确筛选

| 项目 | 内容 |
| --- | --- |
| 用例编号 | L1-A11 |
| 接口 | `GET /admin/users/app/list?userId=1` |
| 预期结果 | data.records 仅包含 id=1 的用户 |
| 验证点 | userId 精确筛选 |

### L1-A12: 冻结用户

| 项目 | 内容 |
| --- | --- |
| 用例编号 | L1-A12 |
| 接口 | `PUT /admin/users/app/{id}/status` |
| 入参 | `{"status":"FROZEN"}` |
| 预期结果 | code=200, DB 中 accountStatus=FROZEN |
| 验证点 | 1. 状态已更新 2. 该用户无法登录 |

### L1-A13: 冻结用户 — 不合法状态拒绝

| 项目 | 内容 |
| --- | --- |
| 用例编号 | L1-A13 |
| 接口 | `PUT /admin/users/app/{id}/status` |
| 入参 | `{"status":"INVALID"}` |
| 预期结果 | code=5001, msg 包含"不支持"或"状态" |
| 验证点 | 非法状态参数被拒绝 |

### L1-A14: 实名认证审核列表 — 基础分页

| 项目 | 内容 |
| --- | --- |
| 用例编号 | L1-A14 |
| 接口 | `GET /admin/verify/real-name/list?page=1&size=10` |
| 预期结果 | code=200, data.records 不为空, 每条含 id/userId/nickname/avatar/status/submitTime |
| 验证点 | 列表字段完整 |

### L1-A15: 实名认证审核列表 — 按状态筛选

| 项目 | 内容 |
| --- | --- |
| 用例编号 | L1-A15 |
| 接口 | `GET /admin/verify/real-name/list?status=PENDING` |
| 预期结果 | data.records 中所有记录 status=PENDING |
| 验证点 | 状态筛选有效且分页准确 |

### L1-A16: 实名认证审核 — 通过

| 项目 | 内容 |
| --- | --- |
| 用例编号 | L1-A16 |
| 接口 | `POST /admin/verify/real-name/{id}/audit` |
| 入参 | `{"action":"APPROVE"}` |
| 预期结果 | code=200, DB 中 realNameStatus=APPROVED, realNameResultTime 非空 |
| 验证点 | 审核通过后状态和审核时间更新 |

### L1-A17: 实名认证审核 — 驳回（带原因）

| 项目 | 内容 |
| --- | --- |
| 用例编号 | L1-A17 |
| 接口 | `POST /admin/verify/real-name/{id}/audit` |
| 入参 | `{"action":"REJECT", "rejectReason":"姓名与证件不一致"}` |
| 预期结果 | code=200, DB 中 realNameStatus=REJECTED, rejectReason 非空 |
| 验证点 | 驳回原因已记录 |

### L1-A18: 实名认证审核 — 驳回无原因拒绝

| 项目 | 内容 |
| --- | --- |
| 用例编号 | L1-A18 |
| 接口 | `POST /admin/verify/real-name/{id}/audit` |
| 入参 | `{"action":"REJECT"}` 或 `{"action":"REJECT", "rejectReason":""}` |
| 预期结果 | code=5001, msg 包含"原因"或"驳回" |
| 验证点 | 驳回时必填原因校验 |

### L1-A19: 实名认证审核 — 非法 action 拒绝

| 项目 | 内容 |
| --- | --- |
| 用例编号 | L1-A19 |
| 接口 | `POST /admin/verify/real-name/{id}/audit` |
| 入参 | `{"action":"DELETE"}` |
| 预期结果 | code=5001, msg 包含"支持"或"审核" |
| 验证点 | 不支持的动作被拒绝 |

### L1-A20: 实名认证详情

| 项目 | 内容 |
| --- | --- |
| 用例编号 | L1-A20 |
| 接口 | `GET /admin/verify/real-name/{id}` |
| 预期结果 | code=200, data 含 id/userId/nickname/avatar/verifyLevel/fields(数组[{label,value}])/submitTime/resultTime/rejectReason/status |
| 验证点 | 1. fields[0].label="真实姓名", value 脱敏 2. fields[1].label="身份证号", value 脱敏 3. fields[2].label="人脸核身结果" |

### L1-A21: 学历认证详情

| 项目 | 内容 |
| --- | --- |
| 用例编号 | L1-A21 |
| 接口 | `GET /admin/verify/education/{id}` |
| 预期结果 | code=200, data 含 fields 数组 (学校/认证方式/认证材料摘要/第三方结果) |
| 验证点 | 1. fields 包含学校全称 2. fields 包含认证方式 3. submitTime 非空 |

### L1-A22: 头像认证详情

| 项目 | 内容 |
| --- | --- |
| 用例编号 | L1-A22 |
| 接口 | `GET /admin/verify/avatar/{id}` |
| 预期结果 | code=200, data 含 fields 数组 (当前头像URL/历史认证记录/提交时间) |
| 验证点 | 1. fields 包含头像URL 2. fields 包含历史认证记录 3. 审核标准提示 |

### L1-A23: 照片审核列表

| 项目 | 内容 |
| --- | --- |
| 用例编号 | L1-A23 |
| 接口 | `GET /admin/moderation/photos/list?page=1&size=10` |
| 预期结果 | code=200, data.records 每条含 id/userId/nickname/avatar/contentType/contentPreview/status/submitTime |
| 验证点 | 1. contentType="照片" 2. contentPreview 为照片URL 3. 筛选条件生效 |

### L1-A24: 照片审核 — 通过

| 项目 | 内容 |
| --- | --- |
| 用例编号 | L1-A24 |
| 接口 | `POST /admin/moderation/photos/{id}/audit` |
| 入参 | `{"action":"APPROVE"}` |
| 预期结果 | code=200, profilePhotoAuditStatus=APPROVED |
| 验证点 | 照片审核通过，不影响头像认证状态 |

### L1-A25: 照片审核 — 驳回

| 项目 | 内容 |
| --- | --- |
| 用例编号 | L1-A25 |
| 接口 | `POST /admin/moderation/photos/{id}/audit` |
| 入参 | `{"action":"REJECT", "rejectReason":"图片不清晰"}` |
| 预期结果 | code=200, profilePhotoAuditStatus=REJECTED, rejectReason 非空 |
| 验证点 | 1. 驳回原因记录 2. 头像认证状态保持不变 |

### L1-A26: 照片审核详情

| 项目 | 内容 |
| --- | --- |
| 用例编号 | L1-A26 |
| 接口 | `GET /admin/moderation/photos/{id}` |
| 预期结果 | code=200, data 含 userId/nickname/avatar/contentType="照片"/contentFull(原图URL)/submitTime/status/rejectReason |
| 验证点 | 1. contentFull 为照片原图URL 2. 可正常渲染 |

### L1-A27: 文字审核列表

| 项目 | 内容 |
| --- | --- |
| 用例编号 | L1-A27 |
| 接口 | `GET /admin/moderation/texts/list?page=1&size=10` |
| 预期结果 | code=200, data.records 每条含 contentType="文字"/contentPreview(文本摘要,截断50字)/contentField(字段类型) |
| 验证点 | 1. 文本摘要正确 2. contentField 为"关于我"或"希望TA了解" |

### L1-A28: 文字审核 — 驳回

| 项目 | 内容 |
| --- | --- |
| 用例编号 | L1-A28 |
| 接口 | `POST /admin/moderation/texts/{id}/audit` |
| 入参 | `{"action":"REJECT", "rejectReason":"包含联系方式导流"}` |
| 预期结果 | code=200, openTextAuditStatus=REJECTED, rejectReason 非空 |
| 验证点 | 1. 文字审核驳回 2. 不影响认证状态 |

### L1-A29: 文字审核详情

| 项目 | 内容 |
| --- | --- |
| 用例编号 | L1-A29 |
| 接口 | `GET /admin/moderation/texts/{id}` |
| 预期结果 | code=200, data 含 contentFull(完整文本,不截断)/contentField/submitTime/status |
| 验证点 | 1. contentFull 为完整文本 2. contentField 指示字段类型 |

### L1-A30: 无权限访问后台接口

| 项目 | 内容 |
| --- | --- |
| 用例编号 | L1-A30 |
| 接口 | `GET /admin/verify/real-name/list` |
| 入参 | Header: X-Auth-Token (无 verify:realname:list 权限的用户) |
| 预期结果 | code=403 |
| 验证点 | 权限校验生效 |

### L1-A31: 详情接口 — 不存在的记录

| 项目 | 内容 |
| --- | --- |
| 用例编号 | L1-A31 |
| 接口 | `GET /admin/verify/real-name/99999` |
| 预期结果 | code=5001, msg 包含"不存在" |
| 验证点 | 不存在记录返回业务异常 |

### L1-A32: 认证审核 — 按昵称模糊搜索

| 项目 | 内容 |
| --- | --- |
| 用例编号 | L1-A32 |
| 接口 | `GET /admin/verify/real-name/list?keyword=林` |
| 预期结果 | data.records 中所有记录的 nickname 包含"林" |
| 验证点 | 昵称模糊搜索有效，分页准确 |

### L1-A33: 内容审核 — 按昵称模糊搜索

| 项目 | 内容 |
| --- | --- |
| 用例编号 | L1-A33 |
| 接口 | `GET /admin/moderation/photos/list?keyword=林` |
| 预期结果 | data.records 中所有记录的 nickname 包含"林" |
| 验证点 | ModerationAdminService 新增 keyword 搜索能力 |

---

## L3 — Service 层单元测试

> 测试包路径: `backend/src/test/java/com/spacetime/`
> 使用 @ExtendWith(MockitoExtension.class)，mock Dao 层

### L3-01: 资料完整度 — 全满

| 项目 | 内容 |
| --- | --- |
| 用例编号 | L3-01 |
| 类 | `ProfileServiceTest` |
| 方法 | `shouldCalculateFullScore()` |
| 前置 | 构造 AppUser，所有计分字段均已填充 |
| 预期 | profileScore = 100 |

### L3-02: 资料完整度 — 空用户

| 项目 | 内容 |
| --- | --- |
| 用例编号 | L3-02 |
| 方法 | `shouldCalculateZeroScore()` |
| 前置 | 构造 AppUser，仅 id 有值 |
| 预期 | profileScore = 0 |

### L3-03: 资料完整度 — 部分填充

| 项目 | 内容 |
| --- | --- |
| 用例编号 | L3-03 |
| 方法 | `shouldCalculatePartialScore()` |
| 前置 | nickname=1, avatar=1, gender=1, school=1 → 5+10+5+10=30 |
| 预期 | profileScore = 30 |

### L3-04: 准入判定 — 未完成首登

| 项目 | 内容 |
| --- | --- |
| 用例编号 | L3-04 |
| 方法 | `shouldBlockAccessWhenFirstLoginNotCompleted()` |
| 前置 | firstLoginCompleted=0 |
| 预期 | canBrowseCards=false, canMatch=false, canBeExposed=false, blockReason 非空 |

### L3-05: 准入判定 — 完成首登未实名

| 项目 | 内容 |
| --- | --- |
| 用例编号 | L3-05 |
| 方法 | `shouldAllowBrowseOnlyWhenNotRealNameVerified()` |
| 前置 | firstLoginCompleted=1, accountStatus=NORMAL, realNameStatus=NOT_CERTIFIED |
| 预期 | canBrowseCards=true, canMatch=false, canBeExposed=false |

### L3-06: 准入判定 — 完成首登且实名通过

| 项目 | 内容 |
| --- | --- |
| 用例编号 | L3-06 |
| 方法 | `shouldAllowFullAccessWhenRealNameVerified()` |
| 前置 | firstLoginCompleted=1, accountStatus=NORMAL, realNameStatus=APPROVED |
| 预期 | canBrowseCards=true, canMatch=true, canBeExposed=true |

### L3-07: 准入判定 — 账号冻结

| 项目 | 内容 |
| --- | --- |
| 用例编号 | L3-07 |
| 方法 | `shouldBlockAllWhenAccountFrozen()` |
| 前置 | accountStatus=FROZEN |
| 预期 | 全部 false，blockReason 包含"冻结"或"异常" |

### L3-08: 微信登录 — 新用户注册流程

| 项目 | 内容 |
| --- | --- |
| 用例编号 | L3-08 |
| 类 | `AuthMiniappServiceTest` |
| 方法 | `shouldAutoRegisterNewUser()` |
| 前置 | mock 微信 code2Session 返回新 openId |
| 预期 | 1. 创建新的 app_user 记录 2. 创建 app_user_verification 记录 3. 返回 firstLoginCompleted=false 4. token 写入 Redis |

### L3-09: 微信登录 — 老用户返回

| 项目 | 内容 |
| --- | --- |
| 用例编号 | L3-09 |
| 方法 | `shouldReturnExistingUser()` |
| 前置 | DB 已有该 openId 的用户 |
| 预期 | 返回已有 userId，firstLoginCompleted 按实际状态，lastLoginTime 更新 |

### L3-10: 微信登录 — 冻结账号拒绝

| 项目 | 内容 |
| --- | --- |
| 用例编号 | L3-10 |
| 方法 | `shouldRejectFrozenUser()` |
| 前置 | 匹配到的用户 accountStatus=FROZEN |
| 预期 | 抛出 BusinessException |

### L3-11: 首登资料 — 第一步保存

| 项目 | 内容 |
| --- | --- |
| 用例编号 | L3-11 |
| 方法 | `shouldSaveStep1Fields()` |
| 前置 | firstLoginCompleted=0 的用户 |
| 预期 | step1 字段已保存到 DB, nextStep=2 |

### L3-12: 首登资料 — 第三步完成触发认证

| 项目 | 内容 |
| --- | --- |
| 用例编号 | L3-12 |
| 方法 | `shouldCompleteInitAndTriggerVerifyOnStep3()` |
| 前置 | step1+step2 已完成 |
| 预期 | firstLoginCompleted=1, profileScore 已计算, avatarVerifyStatus=PENDING |

### L3-13: 首登资料 — 昵称敏感词校验

| 项目 | 内容 |
| --- | --- |
| 用例编号 | L3-13 |
| 方法 | `shouldRejectSensitiveNickname()` |
| 前置 | 昵称包含敏感词 |
| 预期 | 抛出 BusinessException, msg 包含"敏感" |

### L3-14: 资料编辑 — 性别不可修改

| 项目 | 内容 |
| --- | --- |
| 用例编号 | L3-14 |
| 方法 | `shouldRejectGenderChange()` |
| 前置 | 用户已设置 gender=MALE |
| 入参 | gender=FEMALE |
| 预期 | 抛出 BusinessException |

### L3-15: 资料编辑 — 修改头像重置认证

| 项目 | 内容 |
| --- | --- |
| 用例编号 | L3-15 |
| 方法 | `shouldResetAvatarVerifyOnAvatarChange()` |
| 前置 | avatarVerifyStatus=APPROVED |
| 入参 | 新 avatar URL |
| 预期 | avatar 已更新, avatarVerifyStatus=PENDING, avatarVerifySubmitTime 更新 |

### L3-16: 资料编辑 — 修改文字重置审核

| 项目 | 内容 |
| --- | --- |
| 用例编号 | L3-16 |
| 方法 | `shouldResetTextAuditOnAboutMeChange()` |
| 前置 | openTextAuditStatus=APPROVED |
| 入参 | 新 aboutMe |
| 预期 | aboutMe 已更新, openTextAuditStatus=PENDING |

### L3-17: 实名认证 — mock 通过

| 项目 | 内容 |
| --- | --- |
| 用例编号 | L3-17 |
| 类 | `VerificationServiceTest` |
| 方法 | `shouldMockApproveRealName()` |
| 前置 | realNameStatus=NOT_CERTIFIED |
| 预期 | realNameStatus=APPROVED, realNameSubmitTime 非空, verifyLevel +1 |

### L3-18: 实名认证 — 身份证格式校验失败

| 项目 | 内容 |
| --- | --- |
| 用例编号 | L3-18 |
| 方法 | `shouldRejectInvalidIdCard()` |
| 入参 | idCard="123456"（非18位） |
| 预期 | 抛出 BusinessException |

### L3-19: 学历认证 — mock PENDING

| 项目 | 内容 |
| --- | --- |
| 用例编号 | L3-19 |
| 方法 | `shouldSetEducationPending()` |
| 前置 | educationStatus=NOT_CERTIFIED |
| 预期 | educationStatus=PENDING, educationSubmitTime 非空 |

### L3-20: 认证等级计算

| 项目 | 内容 |
| --- | --- |
| 用例编号 | L3-20 |
| 方法 | `shouldCalculateVerifyLevel()` |
| 前置 | realNameStatus=APPROVED, avatarVerifyStatus=APPROVED, educationStatus=NOT_CERTIFIED |
| 预期 | verifyLevel=2 |

### L3-21: 后台审核 — 实名认证通过

| 项目 | 内容 |
| --- | --- |
| 用例编号 | L3-21 |
| 类 | `VerificationAdminServiceTest` |
| 方法 | `shouldApproveRealNameVerification()` |
| 前置 | realNameStatus=PENDING |
| 入参 | action=APPROVE |
| 预期 | realNameStatus=APPROVED, realNameResultTime 非空, verifyLevel +1 |

### L3-22: 后台审核 — 驳回带原因

| 项目 | 内容 |
| --- | --- |
| 用例编号 | L3-22 |
| 方法 | `shouldRejectWithReason()` |
| 入参 | action=REJECT, rejectReason="资料不完整" |
| 预期 | status=REJECTED, rejectReason 已保存 |

### L3-23: 后台审核 — 驳回无原因抛异常

| 项目 | 内容 |
| --- | --- |
| 用例编号 | L3-23 |
| 方法 | `shouldThrowWhenRejectWithoutReason()` |
| 入参 | action=REJECT, rejectReason=null 或 "" |
| 预期 | 抛出 BusinessException, msg 包含"原因" |

### L3-24: 后台审核 — 非法 action 抛异常

| 项目 | 内容 |
| --- | --- |
| 用例编号 | L3-24 |
| 方法 | `shouldThrowWhenInvalidAction()` |
| 入参 | action="DELETE" |
| 预期 | 抛出 BusinessException |

### L3-25: 后台审核 — 照片审核不影响头像认证

| 项目 | 内容 |
| --- | --- |
| 用例编号 | L3-25 |
| 类 | `ModerationAdminServiceTest` |
| 方法 | `shouldNotAffectAvatarVerifyWhenRejectingPhoto()` |
| 前置 | avatarVerifyStatus=APPROVED, profilePhotoAuditStatus=PENDING |
| 入参 | 驳回资料照片 |
| 预期 | profilePhotoAuditStatus=REJECTED, avatarVerifyStatus 仍为 APPROVED |

### L3-26: 后台认证详情 — 查询实名认证详情

| 项目 | 内容 |
| --- | --- |
| 用例编号 | L3-26 |
| 类 | `VerificationAdminServiceTest` |
| 方法 | `shouldReturnRealNameDetailWithMaskedFields()` |
| 前置 | 存在实名认证记录 |
| 预期 | VerificationAuditDetailVO.fields 包含3个 FieldEntry: 姓名(脱敏)/身份证号(脱敏)/核身结果; submitTime 非空 |

### L3-27: 后台认证详情 — 查询学历认证详情

| 项目 | 内容 |
| --- | --- |
| 用例编号 | L3-27 |
| 方法 | `shouldReturnEducationDetail()` |
| 前置 | 存在学历认证记录 |
| 预期 | fields 包含学校/认证方式/认证材料摘要; submitTime 非空 |

### L3-28: 后台认证详情 — 查询头像认证详情

| 项目 | 内容 |
| --- | --- |
| 用例编号 | L3-28 |
| 方法 | `shouldReturnAvatarDetail()` |
| 前置 | 存在头像认证记录 |
| 预期 | fields 包含头像URL/历史认证记录; submitTime 非空 |

### L3-29: 后台审核详情 — 查询照片审核详情

| 项目 | 内容 |
| --- | --- |
| 用例编号 | L3-29 |
| 类 | `ModerationAdminServiceTest` |
| 方法 | `shouldReturnPhotoModerationDetail()` |
| 前置 | 存在照片审核记录 |
| 预期 | ModerationDetailVO.contentType="照片", contentFull 为照片URL, submitTime 非空 |

### L3-30: 后台审核详情 — 查询文字审核详情

| 项目 | 内容 |
| --- | --- |
| 用例编号 | L3-30 |
| 方法 | `shouldReturnTextModerationDetail()` |
| 前置 | 存在文字审核记录 |
| 预期 | contentType="文字", contentFull 为完整文本, contentField 非空 |

### L3-31: 用户分页 — EXISTS 子查询筛选认证状态

| 项目 | 内容 |
| --- | --- |
| 用例编号 | L3-31 |
| 类 | `AppUserAdminServiceTest` |
| 方法 | `shouldFilterByRealNameStatusInSQL()` |
| 前置 | DB 中有不同认证状态的多条用户 |
| 入参 | realNameStatus=APPROVED |
| 预期 | 返回结果全部匹配，total 为匹配总数（非当前页数量），分页准确 |

### L3-32: 用户分页 — 批量加载认证数据避免 N+1

| 项目 | 内容 |
| --- | --- |
| 用例编号 | L3-32 |
| 方法 | `shouldBatchLoadVerificationData()` |
| 前置 | 用户列表 10 条 |
| 预期 | 只执行 1 次 verification 批量查询（IN userIds），非 10 次单条查询 |

### L3-33: 用户状态变更 — 不合法状态拒绝

| 项目 | 内容 |
| --- | --- |
| 用例编号 | L3-33 |
| 方法 | `shouldRejectInvalidAccountStatus()` |
| 入参 | status="INVALID_STATUS" |
| 预期 | 抛出 BusinessException |

### L3-34: 内容审核 — 昵称模糊搜索

| 项目 | 内容 |
| --- | --- |
| 用例编号 | L3-34 |
| 测试方法 | `shouldFilterByKeywordInPhotoModerationPage()` / `shouldFilterByKeywordInTextModerationPage()` |
| 入参 | `VerificationPageReq(keyword="林")` |
| 预期 | wrapper 含 `like(AppUser::getNickname, "林")` 子查询，结果仅含匹配昵称的用户 |
| 验证点 | `ModerationAdminServiceImpl.buildModerationWrapper()` 在 keyword 非空时先查 app_user 再 in userIds |

---

## L4 — Playwright 管理后台页面测试

> 测试文件: `frontend/e2e-tests/tests/prd01-user.spec.ts`
> 前置: 前端已启动，已使用有权限的管理员账号登录

### L4-01: 用户列表 — 实名认证状态筛选

| 项目 | 内容 |
| --- | --- |
| 用例编号 | L4-01 |
| 步骤 | 1. 导航到 /customers 2. 选择"实名认证状态"下拉→"已通过" 3. 点击搜索 |
| 预期 | 列表中只显示实名认证已通过的用户，分页数正确 |

### L4-02: 用户列表 — 学校搜索

| 项目 | 内容 |
| --- | --- |
| 用例编号 | L4-02 |
| 步骤 | 1. 输入学校关键词 2. 点击搜索 |
| 预期 | 列表中只显示匹配学校的用户 |

### L4-03: 用户列表 — 首登完成状态筛选

| 项目 | 内容 |
| --- | --- |
| 用例编号 | L4-03 |
| 步骤 | 1. 选择"首登完成"下拉→"未完成" 2. 点击搜索 |
| 预期 | 列表中只显示首登未完成的用户 |

### L4-04: 用户列表 — 性别筛选

| 项目 | 内容 |
| --- | --- |
| 用例编号 | L4-04 |
| 步骤 | 1. 选择"性别"下拉→"男" 2. 点击搜索 |
| 预期 | 列表中只显示男性用户 |

### L4-05: 用户列表 — 关键词搜索

| 项目 | 内容 |
| --- | --- |
| 用例编号 | L4-05 |
| 步骤 | 1. 输入关键词 2. 点击搜索 |
| 预期 | 昵称或学校匹配关键词的用户显示在列表中 |

### L4-06: 用户列表 — 重置筛选

| 项目 | 内容 |
| --- | --- |
| 用例编号 | L4-06 |
| 步骤 | 1. 设置多个筛选条件 2. 点击"重置" |
| 预期 | 所有筛选条件清空，列表恢复默认 |

### L4-07: 用户列表 — 分页功能

| 项目 | 内容 |
| --- | --- |
| 用例编号 | L4-07 |
| 步骤 | 1. 导航到 /customers 2. 点击下一页 |
| 预期 | 页面数据更新，页码正确 |

### L4-08: 用户管理 — 冻结操作

| 项目 | 内容 |
| --- | --- |
| 用例编号 | L4-08 |
| 步骤 | 1. 在列表点击"冻结"按钮 2. 确认弹窗 |
| 预期 | 用户状态变为"已冻结"，提示成功 |

### L4-09: 实名认证审核 — Tab 切换

| 项目 | 内容 |
| --- | --- |
| 用例编号 | L4-09 |
| 步骤 | 1. 导航到 /verify/real-name 2. 切换到学历认证 Tab 3. 切换到头像认证 Tab |
| 预期 | 三个 Tab 各自加载对应列表数据 |

### L4-10: 实名认证审核 — 通过操作

| 项目 | 内容 |
| --- | --- |
| 用例编号 | L4-10 |
| 步骤 | 1. 在实名认证审核列表选择一个待审核的记录 2. 点击"通过" |
| 预期 | 状态变为"已通过"，提示审核成功 |

### L4-11: 实名认证审核 — 驳回操作（带原因）

| 项目 | 内容 |
| --- | --- |
| 用例编号 | L4-11 |
| 步骤 | 1. 选择一个待审核记录 2. 点击"驳回" 3. 输入驳回原因 4. 确认 |
| 预期 | 状态变为"已驳回"，驳回原因已显示在列表中 |

### L4-12: 实名认证审核 — 详情弹窗

| 项目 | 内容 |
| --- | --- |
| 用例编号 | L4-12 |
| 步骤 | 1. 点击列表中的"查看"按钮 2. 等待详情弹窗加载 |
| 预期 | 弹窗显示：用户信息(头像/昵称/userId)、认证内容(脱敏姓名/身份证号/核身结果)、审核信息(提交时间/审核时间/驳回原因) |

### L4-13: 学历认证审核 — 详情弹窗

| 项目 | 内容 |
| --- | --- |
| 用例编号 | L4-13 |
| 步骤 | 1. 导航到 /verify/education 2. 点击某条记录的"查看" |
| 预期 | 弹窗显示：学校/认证方式/认证材料摘要/审核信息 |

### L4-14: 头像认证审核 — 详情弹窗

| 项目 | 内容 |
| --- | --- |
| 用例编号 | L4-14 |
| 步骤 | 1. 导航到 /verify/avatar 2. 点击某条记录的"查看" |
| 预期 | 弹窗显示：当前主头像大图(可点击放大)/历史认证记录/审核信息 |

### L4-15: 照片审核 — Tab 切换

| 项目 | 内容 |
| --- | --- |
| 用例编号 | L4-15 |
| 步骤 | 1. 导航到 /moderation/photos 2. 切换到文字审核 Tab |
| 预期 | 两个 Tab 各自加载对应列表 |

### L4-16: 照片审核 — 通过操作

| 项目 | 内容 |
| --- | --- |
| 用例编号 | L4-16 |
| 步骤 | 1. 在照片审核列表选择一个待审核记录 2. 点击"通过" |
| 预期 | 状态变为"已通过" |

### L4-17: 照片审核 — 详情弹窗

| 项目 | 内容 |
| --- | --- |
| 用例编号 | L4-17 |
| 步骤 | 1. 在照片审核列表点击"查看" 2. 等待详情加载 |
| 预期 | 弹窗显示：照片原图(>=400px可点击放大)/照片分类/审核信息/审核操作按钮 |

### L4-18: 文字审核 — 详情弹窗

| 项目 | 内容 |
| --- | --- |
| 用例编号 | L4-18 |
| 步骤 | 1. 导航到 /moderation/texts 2. 点击某条记录的"查看" |
| 预期 | 弹窗显示：文本字段类型/完整文本(不截断)/审核信息/审核操作按钮 |

### L4-19: 审核详情弹窗 — PENDING 状态时可操作

| 项目 | 内容 |
| --- | --- |
| 用例编号 | L4-19 |
| 步骤 | 1. 打开一个 PENDING 状态记录的详情弹窗 2. 检查按钮 |
| 预期 | 弹窗底部显示"通过"和"驳回"按钮 |

### L4-20: 审核详情弹窗 — 已审核状态不可操作

| 项目 | 内容 |
| --- | --- |
| 用例编号 | L4-20 |
| 步骤 | 1. 打开一个 APPROVED 或 REJECTED 状态记录的详情弹窗 |
| 预期 | 无"通过"/"驳回"按钮 |

### L4-21: 审核详情弹窗 — 驳回必填原因

| 项目 | 内容 |
| --- | --- |
| 用例编号 | L4-21 |
| 步骤 | 1. 打开 PENDING 记录详情弹窗 2. 点击"驳回" 3. 不填原因直接确认 |
| 预期 | 提示"请填写驳回原因"或按钮不可点击 |

### L4-22: 无权限用户访问认证审核页

| 项目 | 内容 |
| --- | --- |
| 用例编号 | L4-22 |
| 步骤 | 1. 使用无 verify 权限的账号登录 2. 尝试访问 /verify/real-name |
| 预期 | 页面显示无权限提示或菜单不显示 |

### L4-23: 用户管理 — 查看用户详情

| 项目 | 内容 |
| --- | --- |
| 用例编号 | L4-23 |
| 步骤 | 1. 导航到 /customers 2. 点击某用户的"查看详情"或"画像"按钮 3. 等待详情弹窗加载 |
| 预期 | 弹窗显示：基本资料(昵称/性别/年龄/学校等)、认证信息(实名/学历/头像状态)、准入信息(canBrowseCards/canMatch/canBeExposed/blockReason) |

### L4-24: 内容审核 — 列表内容渲染

| 项目 | 内容 |
| --- | --- |
| 用例编号 | L4-24 |
| 步骤 | 1. 导航到 /moderation/photos 2. 检查列表中照片缩略图渲染 3. 切换到文字审核 4. 检查文本摘要显示 |
| 预期 | 照片列表显示缩略图(非裂图)；文字列表显示截断摘要(最多50字)；各状态 Badge 颜色正确 |
