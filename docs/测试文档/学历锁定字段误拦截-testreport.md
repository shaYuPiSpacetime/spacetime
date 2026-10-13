# 学历锁定字段误拦截 - 测试报告

日期：2026-10-13。基线：master `0fcdc26cb3533e61ed3ee11329f014e8a43b2128`。
关联：[用例](学历锁定字段误拦截-testcase.md)、[方案](../superpowers/specs/2026-10-13-学历锁定字段误拦截-design.md)。

## 结论

有条件通过：已通过代码业务回归、原生小程序构建前门禁与只读接口检查，后端部署和新体验包上传已核验；本账号授权保存和真机下一步仍需复测，不把单元测试或上传成功当作真机验收。

## 执行结果

| 范围 | 结果 |
| --- | --- |
| ProfileServiceImplTest | 39通过、0失败/错误，旧/完整/部分快照，省略锁定字段与实名保护，四类真正篡改拒绝 |
| AppUserAdminServiceImplTest | 24通过、0失败/错误，新导入快照含规范code，材料完整且仍PENDING |
| ProfileDictionaryServiceTest | 14通过、0失败/错误，上一轮地区修复保持 |
| VerificationServiceImplTest | 17通过、0失败/错误，学历提交/重提规则未退化 |
| AppUserAuditServiceImplEducationProjectionTest | 1通过、0失败/错误 |
| AppUserAuditServiceTest | 15通过、0失败/错误 |
| L3合计 | 110通过，0失败/错误/跳过 |
| 小程序profile回归 | 53通过，0失败，含新增只读字段和上一轮13项地区回归 |
| 小程序prebuild门禁 | 395通过，0失败；包含上行53项，不重复累加 |
| TypeScript增量对照 | 当前及仅恢复本次TS文件为HEAD版本时，诊断完全相同：既有120项、本次新增0、目标领域文件0；全项目检查不记为通过 |
| L1只读 | 健康HTTP200/code200；无Token反显HTTP401/code401；授权反显因无有效目标会话跳过 |

## RED→GREEN与过程问题

1. 前端真实请求构造器新增2项RED：锁定字段及依赖学校编码被提交；修复visible/editable双白名单后GREEN。
2. 后端明确2项RED、0宿主错误：未修改旧快照反显值保存抛异常；新导入材料缺identity。三处生产代码修改后GREEN。
3. 扩大审核回归曾发现旧AppUserAuditServiceTest缺AppUserDao/ObjectMapper依赖，学历人工通过用例NPE；仅补齐测试构造和目标用户夹具，审核业务实现未修改，最终15项全部通过。
4. Windows系统curl因CRL离线失败；改用Git自带OpenSSL curl，TLS证书校验保持启用，同脚本2项通过、1项会话缺失跳过。
5. 独立只读审查无Critical/Important，部分缺项Minor已追加覆盖；实际篡改仍在apply/update之前拒绝。

## 命令与原始证据

证据目录：`.runtime/profile-education-lock-20261013/`，未提交凭据、用户完整认证材料或临时日志。

```text
Java21 Maven离线：-Dtest=ProfileServiceImplTest,AppUserAdminServiceImplTest,ProfileDictionaryServiceTest,VerificationServiceImplTest,AppUserAuditServiceImplEducationProjectionTest,AppUserAuditServiceTest test
cd miniapp: node --test scripts/test-profile-edit-closure.cjs
cd miniapp: npm run prebuild:weapp
node .runtime/profile-education-lock-20261013/typecheck-baseline.cjs
API_URL=<已验证部署地址> CURL_BIN=<Git自带curl> bash docs/测试文档/学历锁定字段误拦截-test-l1.sh
```

## 跳过与验收边界

- 授权反显、真实保存→头像下一步及微信真机：没有可用目标账号会话，不伪造Token、不替用户确认或推进流程；需用户更新新体验版后复测。
- 未修改历史学历材料、审核结论、数据库账号字段或basic_profile_completed；旧数据按页面一致的有效值兼容。
- 未改变审核权限/接口契约，也未放开认证字段修改；空值/省略仍不能清空锁定字段。
- 新导入只补快照元数据，不把PENDING直接变为APPROVED。
- 全项目120项既有TS诊断另行治理，本次无新增，不声称全仓类型检查通过。

## 交付记录

- 代码提交并Push至master：`836bff7b5a7516ae9370810ae309517644578888`，仅本次12个文件，其他未提交内容未混入。
- 新生产构建关闭固定登录/E2E；postbuild注册87页、开发Token及包体门禁通过。Webpack已有common.js/private-chat.js推荐阈值警告未作为本次性能优化成果。
- 独立目录：`.runtime/weapp-release-education-lock-20261013-173932-836bff7b/project`，未复制private配置。432个文件SHA256逐一一致。
- 上传前实际`git ls-remote`核对远端master等于构建SHA，上传版本`2026.10.13.1741`。preview/upload总包及每个分包字节数完全一致；manifest、preview-info、upload-info和package-audit保存于独立发布目录。
- [本次后端流水线](https://github.com/shaYuPiSpacetime/spacetime/actions/runs/38377610708)：对应上述head_sha，build/deploy均success，2026-10-13 17:40:44完成。部署后L1脚本再次健康HTTP200/code200、未登录HTTP401/code401，授权会话仍缺失明确跳过。
- 本次未修改目标数据库用户资料或审核快照、状态；未来真实保存才由既有服务推进流程。体验包上传并不等同于微信正式版审核上线。

| 包名 | preview与upload共同字节数 |
| --- | ---: |
| main | 1390158 |
| /pages/assessment/ | 4199 |
| /pages/coins/ | 44537 |
| /pages/featured/ | 79801 |
| /pages/heart/ | 55668 |
| /pages/membership/ | 39115 |
| /pages/message/ | 441317 |
| /pages/prd08/ | 87671 |
| /pages/profile-edit/ | 33454 |
| /pages/promotion/ | 364357 |
| /pages/qianxun/ | 135424 |
| /pages/search/ | 19869 |
| /pages/settings/ | 53699 |
| /pages/verification/ | 126191 |
| TOTAL | 2875460 |
