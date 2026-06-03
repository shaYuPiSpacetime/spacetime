# PRD-01 用户准入与资料认证初始化 测试用例

> 关联文档：
> - `docs/技术方案/2026-06-03-PRD-01-用户准入与资料认证初始化-tcdesign.md`
> - `docs/需求文档/移动端/细化PRD-01_用户准入与资料认证初始化.md`
> - `docs/需求文档/管理后台/管理后台细化PRD-01_用户准入与资料认证初始化.md`

## L1 — cURL 接口测试

> 测试脚本: `docs/测试文档/用户准入-PRD01-test-l1.sh`
> 前置条件: 后端正常启动，DB 已执行 DDL

### L1-01: 微信授权登录 — 新用户自动注册

| 项目 | 内容 |
| --- | --- |
| 用例编号 | L1-01 |
| 接口 | `POST /miniapp/auth/wechat-login` |
| 入参 | `{"code":"mock_new_user_code"}` |
| 预期结果 | code=200, data.token 非空, data.userId > 0, data.firstLoginCompleted=false |
| 验证点 | 1. 返回 token 2. firstLoginCompleted=false 3. DB中app_user记录已创建 |

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
| 验证点 | 返回业务异常 |

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
| 验证点 | 1. 字段已保存 2. 下一步=2 |

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
| 验证点 | 1. firstLoginCompleted=1 2. profileScore 已计算 |

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
| 预期结果 | code=200, data 包含所有已填资料 + profileScore + accessStatus |
| 验证点 | 1. 所有字段正确返回 2. profileScore 计算正确 3. accessStatus 存在 |

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
| 验证点 | 性别锁定校验 |

### L1-14: 资料编辑 — 修改头像触发认证重置

| 项目 | 内容 |
| --- | --- |
| 用例编号 | L1-14 |
| 接口 | `PATCH /miniapp/profile` |
| 入参 | `{"avatar":"https://cdn.example.com/new-avatar.jpg"}` |
| 预期结果 | code=200, verification.avatarVerifyStatus 更新为 PENDING |
| 验证点 | 1. 头像URL已更新 2. 头像认证状态重置为 PENDING |

### L1-15: 资料编辑 — 修改 aboutMe 触文字审核重置

| 项目 | 内容 |
| --- | --- |
| 用例编号 | L1-15 |
| 接口 | `PATCH /miniapp/profile` |
| 入参 | `{"aboutMe":"新的关于我内容测试"}` |
| 预期结果 | code=200, verification.openTextAuditStatus 更新为 PENDING |
| 验证点 | 1. aboutMe已更新 2. 文字审核状态重置 |

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
| 接口 | POST /miniapp/verify/real-name` |
| 入参 | `{"realName":"张三", "idCard":"110101200001011234"}` |
| 预期结果 | code=200, data.realNameStatus="APPROVED" (mock) |
| 验证点 | 1. 姓名/身份证号已保存（加密） 2. 状态变更为 APPROVED |

### L1-18: 提交实名认证 — 身份证格式错误

| 项目 | 内容 |
| --- | --- |
| 用例编号 | L1-18 |
| 接口 | `POST /miniapp/verify/real-name` |
| 入参 | `{"realName":"张三", "idCard":"123456"}` |
| 预期结果 | code=4001, msg 包含"身份证" |
| 验证点 | 身份证号格式校验 |

### L1-19: 提交学历认证

| 项目 | 内容 |
| --- | --- |
| 用例编号 | L1-19 |
| 接口 | `POST /miniapp/verify/education` |
| 入参 | `{"educationMethod":"CHSI", "verificationCode":"123456"}` |
| 预期结果 | code=200, data.educationStatus="PENDING" (mock 异步) |
| 验证点 | 1. 认证方式已保存 2. 状态为 PENDING |

### L1-20: 头像认证检查

| 项目 | 内容 |
| --- | --- |
| 用例编号 | L1-20 |
| 接口 | `POST /miniapp/verify/avatar` |
| 入参 | 无 |
| 前置条件 | 用户已有主头像 |
| 预期结果 | code=200, data.avatarVerifyStatus="APPROVED" (mock) |
| 验证点 | 头像认证状态更新为通过 |

### L1-21: 准入状态 — 未完成首登

| 项目 | 内容 |
| --- | --- |
| 用例编号 | L1-21 |
| 接口 | `GET /miniapp/profile/access-status` |
| 入参 | Header: X-Auth-Token (首登未完成用户) |
| 预期结果 | canBrowseCards=false, canMatch=false, canBeExposed=false |
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

---

## L1-Admin — 后台管理接口测试

### L1-A01: 用户列表 — 基础分页

| 项目 | 内容 |
| --- | --- |
| 用例编号 | L1-A01 |
| 接口 | `GET /admin/users/app/list?page=1&size=20` |
| 入参 | 无 |
| 预期结果 | code=200, data.records 不为空, data.total >= 0 |
| 验证点 | 分页正常返回 |

### L1-A02: 用户列表 — 按认证状态筛选

| 项目 | 内容 |
| --- | --- |
| 用例编号 | L1-A02 |
| 接口 | `GET /admin/users/app/list?realNameStatus=APPROVED` |
| 预期结果 | data.records 中所有用户 realNameStatus=APPROVED |
| 验证点 | 筛选条件生效 |

### L1-A03: 用户列表 — 按学校筛选

| 项目 | 内容 |
| --- | --- |
| 用例编号 | L1-A03 |
| 接口 | `GET /admin/users/app/list?school=中山大学` |
| 预期结果 | data.records 中所有用户 school 包含"中山大学" |
| 验证点 | 模糊搜索生效 |

### L1-A04: 用户详情

| 项目 | 内容 |
| --- | --- |
| 用例编号 | L1-A04 |
| 接口 | `GET /admin/users/app/{id}` |
| 预期结果 | code=200, data 包含基本资料+认证信息+准入信息 |
| 验证点 | 四大信息区全部有数据 |

### L1-A05: 冻结用户

| 项目 | 内容 |
| --- | --- |
| 用例编号 | L1-A05 |
| 接口 | `PUT /admin/users/app/{id}/status` |
| 入参 | `{"status":"FROZEN"}` |
| 预期结果 | code=200, DB 中 accountStatus=FROZEN |
| 验证点 | 1. 状态已更新 2. 该用户无法登录 |

### L1-A06: 实名认证审核 — 通过

| 项目 | 内容 |
| --- | --- |
| 用例编号 | L1-A06 |
| 接口 | `PUT /admin/verify/real-name/{id}/audit` |
| 入参 | `{"action":"APPROVE"}` |
| 预期结果 | code=200, realNameStatus=APPROVED |
| 验证点 | 审核通过后状态更新 |

### L1-A07: 实名认证审核 — 驳回

| 项目 | 内容 |
| --- | --- |
| 用例编号 | L1-A07 |
| 接口 | `PUT /admin/verify/real-name/{id}/audit` |
| 入参 | `{"action":"REJECT", "rejectReason":"姓名与证件不一致"}` |
| 预期结果 | code=200, realNameStatus=REJECTED, realNameRejectReason 非空 |
| 验证点 | 驳回原因已记录 |

### L1-A08: 照片审核 — 通过

| 项目 | 内容 |
| --- | --- |
| 用例编号 | L1-A08 |
| 接口 | `PUT /admin/moderation/photos/{id}/audit` |
| 入参 | `{"action":"APPROVE"}` |
| 预期结果 | code=200, profilePhotoAuditStatus=APPROVED |
| 验证点 | 照片审核通过 |

### L1-A09: 文字审核 — 驳回

| 项目 | 内容 |
| --- | --- |
| 用例编号 | L1-A09 |
| 接口 | `PUT /admin/moderation/texts/{id}/audit` |
| 入参 | `{"action":"REJECT", "rejectReason":"包含联系方式导流"}` |
| 预期结果 | code=200, openTextAuditStatus=REJECTED, openTextRejectReason 非空 |
| 验证点 | 文字审核驳回，不影响其他状态 |

### L1-A10: 无权限访问后台接口

| 项目 | 内容 |
| --- | --- |
| 用例编号 | L1-A10 |
| 接口 | `GET /admin/verify/real-name/list` |
| 入参 | Header: X-Auth-Token (无 verify:realname:list 权限的用户) |
| 预期结果 | code=403 |
| 验证点 | 权限校验生效 |

---

## L3 — Service 层单元测试

> 测试包路径: `backend/src/test/java/com/spacetime/`

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
| 预期 | 全部 false，blockReason 包含"冻结" |

### L3-08: 微信登录 — 新用户注册流程

| 项目 | 内容 |
| --- | --- |
| 用例编号 | L3-08 |
| 类 | `AuthMiniappServiceTest` |
| 方法 | `shouldAutoRegisterNewUser()` |
| 前置 | mock 微信 code2Session 返回新 openId |
| 预期 | 创建新的 app_user + app_user_verification 记录，返回 firstLoginCompleted=false |

### L3-09: 微信登录 — 老用户返回

| 项目 | 内容 |
| --- | --- |
| 用例编号 | L3-09 |
| 方法 | `shouldReturnExistingUser()` |
| 前置 | DB 已有该 openId 的用户 |
| 预期 | 返回已有 userId，firstLoginCompleted 按实际状态 |

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

### L3-12: 首登资料 — 第三步完成

| 项目 | 内容 |
| --- | --- |
| 用例编号 | L3-12 |
| 方法 | `shouldCompleteInitOnStep3()` |
| 前置 | step1+step2 已完成 |
| 预期 | firstLoginCompleted=1, profileScore 已计算 |

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
| 预期 | avatar 已更新, avatarVerifyStatus=PENDING |

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
| 预期 | realNameStatus=APPROVED, realNameSubitTime 非空, verifyLevel +1 |

### L3-18: 实名认证 — 身份证格式校验失败

| 项目 | 内容 |
| --- | --- |
| 用例编号 | L3-18 |
| 方法 | `shouldRejectInvalidIdCard()` |
| 入参 | idCard="123456" |
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
| 预期 | realNameStatus=APPROVED, verifyLevel +1 |

### L3-22: 后台审核 — 驳回带原因

| 项目 | 内容 |
| --- | --- |
| 用例编号 | L3-22 |
| 方法 | `shouldRejectWithReason()` |
| 入参 | action=REJECT, rejectReason="资料不完整" |
| 预期 | status=REJECTED, rejectReason 已保存 |

### L3-23: 后台审核 — 照片审核不影响认证

| 项目 | 内容 |
| --- | --- |
| 用例编号 | L3-23 |
| 类 | `ModerationAdminServiceTest` |
| 方法 | `shouldNotAffectAvatarVerifyWhenRejectingPhoto()` |
| 前置 | avatarVerifyStatus=APPROVED |
| 入参 | 驳回资料照片 |
| 预期 | profilePhotoAuditStatus=REJECTED, avatarVerifyStatus 仍为 APPROVED |

---

## L4 — Playwright 管理后台页面测试

> 测试文件: `frontend/e2e-tests/tests/prd01-user.spec.ts`
> 前置: 前端已启动，已使用有权限的管理员账号登录

### L4-01: 用户列表 — 认证状态筛选

| 项目 | 内容 |
| --- | --- |
| 用例编号 | L4-01 |
| 步骤 | 1. 导航到 /customers 2. 选择"实名认证状态"下拉→"已通过" 3. 点击查询 |
| 预期 | 列表中只显示实名认证已通过的用户 |

### L4-02: 用户列表 — 学校搜索

| 项目 | 内容 |
| --- | --- |
| 用例编号 | L4-02 |
| 步骤 | 1. 输入学校关键词 2. 点击查询 |
| 预期 | 列表中只显示匹配学校的用户 |

### L4-03: 用户列表 — 首登完成状态筛选

| 项目 | 内容 |
| --- | --- |
| 用例编号 | L4-03 |
| 步骤 | 1. 选择"首登完成"下拉→"未完成" 2. 点击查询 |
| 预期 | 列表中只显示首登未完成的用户 |

### L4-04: 用户详情 — 查看基本资料

| 项目 | 内容 |
| --- | --- |
| 用例编号 | L4-04 |
| 步骤 | 1. 点击用户"查看详情" 2. 查看基本资料 Tab |
| 预期 | 显示昵称/性别/生日/身高/居住地/家乡/学校/专业/学历/关于我/标签/相册 |

### L4-05: 用户详情 — 查看认证信息

| 项目 | 内容 |
| --- | --- |
| 用例编号 | L4-05 |
| 步骤 | 1. 点击用户"查看详情" 2. 切换到认证信息 Tab |
| 预期 | 显示实名/学历/头像认证状态、提交时间、驳回原因 |

### L4-06: 用户详情 — 查看准入信息

| 项目 | 内容 |
| --- | --- |
| 用例编号 | L4-06 |
| 步骤 | 1. 点击用户"查看详情" 2. 切换到准入信息 Tab |
| 预期 | 显示首登完成状态、资料完整度分、核心准入状态、未解锁原因 |

### L4-07: 用户管理 — 冻结操作

| 项目 | 内容 |
| --- | --- |
| 用例编号 | L4-07 |
| 步骤 | 1. 在列表点击"冻结"按钮 2. 确认弹窗 |
| 预期 | 用户状态变为"已冻结"，该用户登录时返回错误 |

### L4-08: 实名认证审核 — Tab 切换

| 项目 | 内容 |
| --- | --- |
| 用例编号 | L4-08 |
| 步骤 | 1. 导航到 /verify/real-name 2. 切换到"学历认证" Tab 3. 切换到"头像认证" Tab |
| 预期 | 三个 Tab 各自加载对应列表 |

### L4-09: 实名认证审核 — 通过

| 项目 | 内容 |
| --- | --- |
| 用例编号 | L4-09 |
| 步骤 | 1. 在实名认证审核列表选择一个待审核的记录 2. 点击"通过" |
| 预期 | 状态变为"已通过"，提示审核成功 |

### L4-10: 实名认证审核 — 驳回

| 项目 | 内容 |
| --- | --- |
| 用例编号 | L4-10 |
| 步骤 | 1. 选择一个待审核记录 2. 点击"驳回" 3. 输入驳回原因 4. 确认 |
| 预期 | 状态变为"已驳回"，驳回原因已显示 |

### L4-11: 学历认证审核 — 列表筛选

| 项目 | 内容 |
| --- | --- |
| 用例编号 | L4-11 |
| 步骤 | 1. 导航到 /verify/education 2. 选择状态筛选→"待审核" 3. 点击查询 |
| 预期 | 列表中只显示待审核的学历认证记录 |

### L4-12: 头像认证审核 — 查看头像

| 项目 | 内容 |
| --- | --- |
| 用例编号 | L4-12 |
| 步骤 | 1. 导航到 /verify/avatar 2. 查看列表中的头像缩略图 |
| 预期 | 当前主头像缩略图可正常显示 |

### L4-13: 照片审核 — 通过操作

| 项目 | 内容 |
| --- | --- |
| 用例编号 | L4-13 |
| 步骤 | 1. 导航到 /moderation/photos 2. 选择一个待审核记录 3. 点击"通过" |
| 预期 | 状态变为"已通过" |

### L4-14: 照片审核 — 驳回并检查不影响头像认证

| 项目 | 内容 |
| --- | --- |
| 用例编号 | L4-14 |
| 步骤 | 1. 选择一个照片审核记录(其头像认证为已通过) 2. 驳回照片 3. 回到用户详情查看认证信息 |
| 预期 | 照片审核状态=已驳回，头像认证状态仍=已通过 |

### L4-15: 文字审核 — 查看文本内容

| 项目 | 内容 |
| --- | --- |
| 用例编号 | L4-15 |
| 步骤 | 1. 导航到 /moderation/texts 2. 查看列表中的文本摘要 |
| 预期 | 文本摘要正确显示，长文本截断 |

### L4-16: 无权限用户访问认证审核页

| 项目 | 内容 |
| --- | --- |
| 用例编号 | L4-16 |
| 步骤 | 1. 使用无 verify 权限的账号登录 2. 尝试访问 /verify/real-name |
| 预期 | 页面显示无权限提示或菜单不显示 |

### L4-17: 用户列表 — 分页功能

| 项目 | 内容 |
| --- | --- |
| 用例编号 | L4-17 |
| 步骤 | 1. 导航到 /customers 2. 点击下一页 |
| 预期 | 页面数据更新，页码正确 |

### L4-18: 用户列表 — 重置筛选

| 项目 | 内容 |
| --- | --- |
| 用例编号 | L4-18 |
| 步骤 | 1. 设置多个筛选条件 2. 点击"重置" |
| 预期 | 所有筛选条件清空，列表恢复默认 |
