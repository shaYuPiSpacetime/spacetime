# 登录流程 unionId 分流技术方案

## 需求与设计基线

- 来源：用户提供的登录流程截图，目标端为微信小程序，默认视口 375×812。
- 点击“立即使用”后通过 `wx.login` 获取临时 code，由服务端换取 openId/unionId。
- unionId 可用时优先按 unionId 判断是否使用过小程序，缺失时回退 openId。
- 历史用户按 unionId 恢复会话，首次用户创建续填会话；二者均直接进入当前待完成的性别、年龄、身份、学历、地址准入步骤。
- 首次用户完成地址后进入现有未认证态；受限操作继续复用项目统一未认证弹窗。
- 自我介绍填写达到门槛后点亮“下一步”；该真实按钮承载 `getPhoneNumber`，授权成功后进入三重认证。

## 实现设计

后端新增 `POST /miniapp/auth/wechat-usage`。历史用户返回恢复后的会话，首次用户创建仅具备资料续填能力的微信会话，使现有五步资料接口无需复制一套游客存储逻辑。手机号授权时再次用 unionId 定位同一账号并补齐手机号。

调用链：`LoginAuthPage -> AuthMiniappController -> AuthMiniappService -> WechatMiniappClient/AppUserDao`。资料保存仍保持 `Controller -> Service -> ServiceImpl -> DAO -> DAOImpl -> Mapper`，未引入 admin/miniapp 交叉依赖。

## 风险与约束

- 微信开放平台未绑定、无法返回 unionId 时只能按当前小程序 openId 识别。
- “立即使用”会创建可续填账号；手机号仍只在用户点击自我介绍下一步并明确授权后绑定。
- 交互控件均为真实 View/Button；未使用截图热区或透明覆盖层。

## 验证清单

- 后端编译与单元测试。
- 小程序 Taro 构建。
- 微信开发者工具分别验证首次、历史、拒绝手机号授权三种状态。
- 375×812 截图核对入口页、自我介绍按钮启用态和微信授权返回后的三重认证页。
