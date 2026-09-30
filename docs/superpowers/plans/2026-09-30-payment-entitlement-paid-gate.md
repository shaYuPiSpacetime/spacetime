# 支付确认后发放购买权益实施计划

**目标：** 会员与千寻币购买权益仅在支付渠道确认对应订单已支付时入账。

**方案：** 普通微信支付以服务端查单结果为准，核对订单号、商户、应用、交易号和订单金额；回调只作为查单触发，不直接作为发放凭证。虚拟支付核对渠道已付状态、原支付单类型和用户实付金额。订单行锁与现有事务保证重复通知不重复入账。

**影响范围：** 后端支付服务、渠道结果模型及其定向测试；不修改已有生产订单、用户资产、优惠价、免费推广奖励或退款流程。

**成功标准：** 未支付、伪造通知、渠道/订单号/金额不匹配均不修改会员或千寻币；渠道确认匹配的订单正常入账；重复通知保持幂等；超时和并发不覆盖已支付订单或已发权益。

**授权边界：** 本次仅修改本地代码并做定向验证；不提交、Push、部署或直接修改生产数据。

### Task 1：建立失败回归用例

**文件：**
- 修改：`backend/src/test/java/com/spacetime/miniapp/service/PaymentServiceImplTest.java`
- 修改：`backend/src/test/java/com/spacetime/miniapp/service/impl/WechatVirtualPayServiceImplTest.java`

**步骤：**
- [x] 用伪造/缺字段通知重现普通微信支付未查单便发放权益。
- [x] 用虚拟支付已付状态但实付金额为零或不匹配重现错误入账；涵盖 iOS 订单类型 7。
- [x] 复现过期订单漏发、旧快照覆盖支付成功及会员资产缺少行锁。
- [x] 用官方字段构造的渠道查询结果验证正常付款可入账、重复通知不重复入账；未接触生产渠道样本。

**验证：** 运行上述两个测试类；新增用例应因现存漏洞而失败，而非编译或测试环境错误。

**完成条件：** 有明确的红灯证据，覆盖会员和千寻币发放门禁。

### Task 2：收紧渠道结果和权益发放门禁

**文件：**
- 修改：`backend/src/main/java/com/spacetime/miniapp/service/WechatPayService.java`
- 修改：`backend/src/main/java/com/spacetime/miniapp/service/impl/WechatPayServiceImpl.java`
- 修改：`backend/src/main/java/com/spacetime/miniapp/service/WechatVirtualPayService.java`
- 修改：`backend/src/main/java/com/spacetime/miniapp/service/impl/WechatVirtualPayServiceImpl.java`
- 修改：`backend/src/main/java/com/spacetime/miniapp/service/impl/PaymentServiceImpl.java`

**步骤：**
- [x] 解析普通微信查单的订单号、交易号、金额、应用及商户信息；缺失字段按未验证处理。
- [x] 支付通知仅触发渠道查单，按订单行锁、原支付渠道、订单号与金额核对后入账。
- [x] 虚拟支付解析 `paid_fee` 和 `order_type`；仅原支付单且金额匹配时入账；不以 `sett_state` 作为付款判断。
- [x] 过期订单在本地关闭前查单，关闭后若渠道已支付仍可补偿入账；结果查询不以旧快照覆盖支付成功。
- [x] 会员入账锁定用户资产行，避免不同已支付订单并发覆盖到期时间。

**验证：** 定向回归用例转绿；原有正常购买用例仍通过。

**完成条件：** 所有购买权益的新增入账路径均有渠道已支付且金额/订单匹配的证明，且同一用户并发支付不会因旧快照丢失权益。

### Task 3：最终核对

**文件：** 无新增生产文件。

**步骤：**
- [x] 运行受影响测试类及必要的编译检查：三个支付相关测试类共 51 例通过。
- [x] 复核 Git diff 与既有脏文件，确认没有越界改动或敏感信息；`git diff --check` 通过。
- [x] 明确说明 Apple 账单“待处理”与渠道已支付状态并非同一字段，无法从当前接口证明银行卡或微信绑定渠道已实际扣账。

**验证：** 测试命令退出码为 0；`git diff --check` 通过；变更范围符合上述文件。

**完成条件：** 可以说明已实现的渠道支付门禁与 Apple 账单可见性边界。
