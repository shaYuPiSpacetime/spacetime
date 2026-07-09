# 2026-07-07 商业化蓝湖还原验收记录

## 范围

- 小程序千寻币：`09`、`66`、`67`、`68`、`69`、`70`、`71`、`72`、`79`
- 小程序会员中心：`08`、`58`、`59`、`60`、`61`、`62`、`63`、`64`、`65`、`75`、`76`、`77`
- 小程序订阅管理：`78`

设计来源：`miniapp/.lanhu-ref/lanhu-full-2026-07-07/images/`

目标视口：蓝湖参考图宽 1500px，对应小程序 750rpx。

蓝湖 MCP 当前列表为 93 张；商业化验收以设计稿名称和本地参考图文件名绑定为准，范围中的 `08/58/78` 等编号仅作为本地参考图文件名锚点，不等同于当前 MCP 列表 index。

蓝湖全量设计稿 index 连续性：manifest.index 已按 1..93 严格连续校验，避免商业化状态清单漏用或错用参考图编号。

## 页面状态清单与静态覆盖矩阵

矩阵结论：以下状态均已接入路由、mock 数据和静态 bbox/source 门禁；但缺图占位和原生支付态仍不作为严格 1:1 完成。

| 页面组 | 设计稿 | 路由 | 当前静态证据 | 剩余缺口 |
|------|------|------|------|------|
| 会员中心 | 会员中心-全 | `/pages/membership/index` | 会员卡、套餐轨道、权益卡 bbox；会员权益 MCP 切片接入 | 会员卡无文案背景仍为结构化占位，缺真实切图 |
| 会员中心 | 会员中心-会员未开通，支付按钮固定下方 | `/pages/membership/index?variant=none` | 会员卡、套餐轨道、固定底栏 bbox | 会员卡背景为结构化占位，缺真实切图 |
| 会员中心 | 会员中心-已开通 | `/pages/membership/index?variant=active` | 会员卡、头像金边、套餐轨道、底栏 bbox | 会员卡背景为结构化占位，缺真实切图 |
| 会员中心 | 会员中心-已过期 | `/pages/membership/index?variant=expired` | 会员卡、头像金边、过期态文案、底栏 bbox | 会员卡背景为结构化占位，缺真实切图 |
| 会员中心 | 会员中心-连续包年 | `/pages/membership/index?variant=annual` | 连续包年文案、套餐轨道、协议行、底栏 bbox | 会员卡背景为结构化占位，缺真实切图 |
| 会员中心 | 会员中心-微信支付 | `/pages/membership/index?payState=wechat-pay` | 遮罩透明度和原生面板顶部 band | 微信原生系统 UI，不绘制键盘；需真机支付截图补验收 |
| 会员中心 | 会员中心-支付成功 | `/pages/membership/index?payState=pay-success` | 灰色结果提示 bbox | 支付结果只做 demo 状态，缺真实支付回调截图 |
| 会员中心 | 会员中心-取消支付 | `/pages/membership/index?payState=pay-cancel` | 灰色结果提示 bbox | 支付结果只做 demo 状态，缺真实支付回调截图 |
| 会员中心 | 会员中心-未支付出弹窗 | `/pages/membership/index?payState=unpaid-sheet` | 底部弹层、确认按钮、协议行 bbox | 弹层为手写结构，缺蓝湖组件切图 |
| 订阅管理 | 订阅管理 | `/pages/membership/subscription` | 会员卡、扣费说明、指引卡、STEP 白底图、红框箭头 bbox | `SubscriptionHeroPattern`、`SearchPlaceholder`、`RenewPlaceholder` 均为结构化占位，缺真实切图 |
| 会员记录 | 会员记录 | `/pages/membership/records` | 两张列表卡、会员菱形、退款章 bbox | `MemberRecordDiamond`、`RefundStamp` 为结构化占位，缺真实切图 |
| 会员记录 | 会员记录-详情（已支付） | `/pages/membership/record-detail?status=paid` | 摘要卡和信息卡 bbox | MCP 仅返回纯色矩形 shape，不接入业务切图 |
| 会员记录 | 会员记录-详情（已退款） | `/pages/membership/record-detail?status=refunded` | 摘要卡和信息卡 bbox | MCP 仅返回纯色矩形 shape，不接入业务切图 |
| 千寻币 | 千寻币 | `/pages/coins/index` | 余额卡、套餐轨道、底部按钮 bbox；用途卡 MCP 切片接入 | 已有整卡 MCP 切片，缺 8 个独立用途 icon 切片 |
| 千寻币 | 千寻币-协议勾选 | `/pages/coins/index?variant=checked` | 底部支付按钮、协议勾选圆点 bbox | 协议栏为手写结构，缺蓝湖组件切图 |
| 千寻币 | 千寻币-点支付未勾选协议 | `/pages/coins/index?variant=unchecked-error` | 底部协议弹层白底 band bbox | 弹层为手写结构，缺蓝湖组件切图 |
| 千寻币 | 千寻币-微信支付 | `/pages/coins/index?payState=wechat-pay` | 遮罩透明度和原生面板顶部 band | 微信原生系统 UI，不绘制键盘；需真机支付截图补验收 |
| 千寻币 | 千寻币-支付成功 | `/pages/coins/index?payState=pay-success` | 灰色结果提示 bbox | 支付结果只做 demo 状态，缺真实支付回调截图 |
| 千寻币 | 千寻币-取消支付 | `/pages/coins/index?payState=pay-cancel` | 灰色结果提示 bbox | 支付结果只做 demo 状态，缺真实支付回调截图 |
| 千寻币 | 千寻币-充值须知 | `/pages/coins/index?variant=recharge-notice` | 白色弹窗、底部支付按钮 bbox | 弹窗为手写结构，缺蓝湖组件切图 |
| 千寻币明细 | 千寻币明细 | `/pages/coins/detail` | Tab 选中态、列表分割线 bbox | 列表数据为 mock，待接口替换 |
| 千寻币明细 | 千寻币明细-暂无数据 | `/pages/coins/detail?variant=empty` | 空态插画、暂无记录文字、去充值按钮 bbox | `EmptyState`、`EmptyPlusMark`、`EmptyRingMark` 为结构化占位，缺真实空态插画切图 |

## 本轮完成

- 新增 `pages/membership/subscription`，承接蓝湖「订阅管理」独立页。
- 新增 `pages/membership/record-detail`，承接「会员记录-详情（已支付）」和「会员记录-详情（已退款）」。
- 会员中心移除旧的内嵌订阅管理分支，订阅管理统一通过独立页进入。
- 千寻币、会员中心支付态按微信原生支付边界处理：正式链路应由 `wx.requestPayment` 唤起微信系统面板，页面不手写微信键盘；当前 `WechatMockPayPanel` 仅作为蓝湖 demo 预览和无真实支付参数时的闭环模拟。
- 千寻币未勾选协议改为底部确认弹层。
- 千寻币支付成功/取消、会员支付成功/取消改为蓝湖灰色提示态。
- `lanhuDemo.json` 补齐商业化页面 manifest、uiDesigns、订单详情 mock 数据。
- 商业化源码文案统一为「千寻币」，不再保留「成家币」。
- `validate-commerce-ui-coverage.mjs` 已新增缺失切图报告门禁，防止占位素材被误判为 1:1 完成。
- `validate-commerce-ui-coverage.mjs` 已补充缺切图源码追溯门禁：每个缺失切图项除报告登记外，还必须能反查到对应源码占位、手写结构或已接入 MCP 切片，避免只有文字总结但页面无落点。
- 商业化页面不再使用 CommercePlaceholderIcon 泛用占位；千寻币用途和会员权益优先使用 MCP 切片，切不到的会员记录、详情和订阅管理流程图只允许页面专属结构化占位，并在缺口清单中登记。
- 旧 CommercePlaceholderIcon 泛用占位组件已移除，防止后续继续用 `♡/•/▷` 等字符或近似 CSS 图形冒充蓝湖切图。
- 千寻币用途与会员权益图标已从散落字符/结构化占位升级为蓝湖 MCP 切片：千寻币使用整卡切片，会员权益使用 08 页面导出的独立图标切片。
- 会员权益未映射 icon 不允许静默泛用占位；校验脚本会对 `membership.benefits` 的 icon key 与 `MEMBER_BENEFIT_ICONS` MCP 切片映射逐项比对，后续数据新增权益时必须先补切片或登记页面专属占位缺口。
- 千寻币套餐卡补齐蓝湖原价删除线与折扣胶囊：3000 套餐为 `¥301.12 / 8.9折`，6000 套餐为 `¥602.82 / 7.1折`。
- 千寻币明细页 mock 数据改为首屏即展示，加载态只在无记录时出现；消耗和退款金额按蓝湖改为红色，空态按钮圆角和插画位置向参考图靠齐。
- 千寻币明细空态按 `67-千寻币明细-暂无数据.png` 采样继续收敛：插画整体顶部对齐到约 `526rpx`，宽度从 `280rpx` 调整为 `298rpx`，按钮顶部对齐到约 `864rpx`，空态内容 `paddingTop` 从 `360rpx` 调整为 `262rpx`，文字到按钮间距从 `74rpx` 调整为 `52rpx`。
- 千寻币明细空态按钮继续按 `67` 复核：蓝色按钮 bbox 约 `left:44rpx/top:864rpx/right:707.5rpx/height:98rpx`，因此按钮宽度从 `662rpx` 收敛为 `664rpx`。
- 67-千寻币明细-暂无数据.png 空态插画 bbox 采样：浅灰插画整体为 `left:226rpx/top:526rpx/298rpx*254rpx`；暂无记录文字为 `left:321rpx/top:779rpx/108rpx*25.5rpx`。
- 67-千寻币明细-暂无数据.png bbox 采样：去充值按钮为 `left:44rpx/top:864rpx/664rpx*98rpx`。
- 千寻币明细空态插画继续收敛：装饰加号和圆点不再用 `+`/`。` 文本字符冒充，改为页面专属 CSS 线性装饰，并由校验脚本防回退；该插画仍登记为 MCP slices 为 0 的结构化占位。
- 千寻币首页套餐卡的数量行从纯文本 `¥ 3000` 改为圆形币图标 + 数字结构，贴近 `09-千寻币.png` 的币种视觉锚点。
- 千寻币首页入口箭头不再使用文本字符冒充：余额卡「明细」和充值卡「充值须知」右箭头改为页面专属 CSS 结构化箭头，并由校验脚本防回退。
- 千寻币首页通过蓝湖 MCP `slices` 获取 `金币` 与 `千寻币用途` 两个切片：`金币` 已用于套餐数量前缀，`千寻币用途` 整卡切片已替换原 8 个结构化占位图标。
- 千寻币首页按 `09-千寻币.png` 复核充值套餐横向初始位：默认选中 `3000` 卡外框约 `left:209rpx/top:497.5rpx/width:238rpx/height:178rpx`，左侧露出的前一张卡右边约 `198.5rpx`；因此横向列表偏移从 `-68rpx` 修正为 `-97rpx`。
- 千寻币首页按 `09-千寻币.png` 复核余额卡外框：非背景色连通域约 `left:25rpx/top:182rpx/right:724.5rpx/bottom:369.5rpx`，整卡宽约 `700rpx`、高约 `188rpx`，且本地余额背景图为 `700x190`；因此继续锁定内容区顶部 `6rpx` 与余额卡 `190rpx` 高度，不采用只按亮蓝色区域得到的 `180rpx` 内部阈值。
- 09-千寻币.png bbox 采样：余额卡为 `left:25rpx/top:182rpx/700rpx*188rpx`，底部支付按钮为 `left:44rpx/top:1440rpx/664rpx*98rpx`。
- 千寻币首页按 `09-千寻币.png` 采样继续收敛用途卡：白色卡片外框约 `748-1225.5rpx`，高度约 `478rpx`，8 个用途圆形图标两行顶部约 `853rpx/1030rpx`；因此用途卡从 `520rpx` 收到 `478rpx`，单个用途项从 `176rpx` 收到 `170rpx`。
- 千寻币明细页选中 Tab 文字色改为蓝湖蓝，和 `66/67` 参考图里的「全部」选中态一致。
- 千寻币明细页按 `66-千寻币明细.png` 复核列表分割线：参考图分割线约在 `411rpx/559rpx/703rpx/851rpx/995rpx`，原 `152rpx` 行高会让后续分割线逐步下漂；因此列表行高收敛为 `148rpx`，使首两条分割线更贴近蓝湖基线。
- 66-千寻币明细.png bbox 采样：分割线为 `top:411/559/703/851/995rpx`，横向为 `left:24.5rpx/width:701rpx`。
- 千寻币充值须知弹窗改为「常见问题」两条说明 + 「联系客服 / 好的」双按钮，并从 `coins.rechargeNotice` mock 数据读取文案。
- 千寻币充值须知弹窗从全屏居中改为上半屏偏上布局，贴近 `72-千寻币-充值须知.png` 里弹窗覆盖充值卡顶部区域的视觉位置。
- 千寻币充值须知弹窗按 `72-千寻币-充值须知.png` 采样继续收敛：白色弹窗外框约 `left:65rpx/top:386rpx/width:620rpx/height:538rpx`，因此遮罩内容区 padding 从 `420rpx 55rpx 0` 修正为 `386rpx 65rpx 0`，弹窗宽度从 `640rpx` 修正为 `620rpx`。
- 千寻币充值须知弹窗继续按 `72` 复核外框：白色弹窗 bbox 约 `left:65rpx/top:386rpx/right:684.5rpx/bottom:923.5rpx`，源码新增 `height: 538rpx` 固定外框，避免文案换行导致弹窗底部漂移。
- 72-千寻币-充值须知.png bbox 采样：白色弹窗为 `left:65rpx/top:386rpx/620rpx*538rpx`，底部支付按钮为 `left:44rpx/top:1440rpx/664rpx*98rpx`。
- 千寻币支付成功/取消提示按 `68/69` 参考图采样收敛为 `left:231rpx/top:393rpx/288rpx*98rpx/#ADADAD`，使灰色 toast 覆盖充值套餐卡顶部区域。
- 68/69 千寻币支付结果 bbox 采样：灰色提示为 `left:231rpx/top:393rpx/288rpx*98rpx`。
- 千寻币未勾选协议底部弹层按 `79-千寻币-点支付未勾选协议.png` 重新采样收敛：白色层顶部圆角约 `1236rpx`，蓝色按钮约 `1443-1540.5rpx`，因此白色层高度修正为 `388rpx`，内容顶部内边距修正为 `107rpx`。
- 79 千寻币协议弹层 bbox 采样：白色底层圆角顶部 band 从 `top:1236rpx` 开始，高约 `108.5rpx`。
- 千寻币协议勾选态按 `70-千寻币-协议勾选.png` 采样继续收敛：底部按钮约 `left:44rpx/top:1440rpx/width:664rpx/height:98rpx`，已勾选圆点约 `32rpx` 且 top 约 `1562rpx`；因此底部栏 padding 修正为 `20rpx 44rpx calc(30rpx + env(safe-area-inset-bottom))`，协议行上距修正为 `24rpx`，圆点从 `28rpx` 调整为 `32rpx`，白色勾选对号同步加粗放大。
- 70-千寻币-协议勾选.png bbox 采样：底部支付按钮为 `left:44rpx/top:1440rpx/664rpx*98rpx`。
- 千寻币 `payState=wechat-pay/pay-success/pay-cancel` 直达预览态同步按已勾协议初始化底部栏，避免 `68/69/71` 支付流程参考图下方协议圆点被默认态还原为空心未勾选。
- 千寻币微信支付态按 `71-千寻币-微信支付.png` 与 `70` 无遮罩参考图同坐标反推遮罩：白底区域像素约从 `255` 变为 `173`，黑色遮罩透明度约 `0.32`；因此微信支付层遮罩从 `0.48` 修正为 `0.32`，保留充值须知弹窗独立遮罩不受影响。
- 微信支付键盘属于微信原生系统 UI，不纳入业务页面手写 1:1；`65/71` 支付态里的系统面板只作为原生能力参考，不继续把键盘尺寸当作页面还原门禁。
- 65/71 微信支付态原生系统面板参考：白色系统面板顶部均为 `top:578rpx`；键盘为微信原生 UI，不作为业务手写门禁。
- `WechatMockPayPanel` 保留为 demo fallback：用于蓝湖预览态和无真实支付参数时走通支付成功/取消闭环，不作为生产支付 UI。
- `WechatMockPayPanel` 不再手写微信数字支付键盘，只保留 demo 支付结果动作；生产链路必须由 `wx.requestPayment` 唤起微信原生面板。
- WechatMockPayPanel 可见 UI 不再展示模拟字样或 wx.requestPayment 开发说明，原生支付边界只保留在源码注释和验收报告中。
- 千寻币和会员中心页面内的微信支付 wrapper 已统一命名为 `WechatPayDemoFallback`，避免误判为正在手写微信原生支付面板。
- 千寻币各状态 manifest 直指对应蓝湖参考图 `09/66/67/68/69/70/71/72/79`，避免只引用余额背景图导致验收证据错配。
- 会员中心默认态 `/pages/membership/index` 已从连续订阅未开通态拆出，新增 `membership.regularPlans` 承接 `08-会员中心-全.png` 的普通包年/包季/包月套餐；`variant=none` 继续承接 `63-会员中心-会员未开通，支付按钮固定下方.png`。
- 默认态普通包年套餐补齐蓝湖显示：`包年 / 12个月 / ¥57.33/月 / ¥688.00`，底部支付价仍按参考图显示 `¥568.00/包年`。
- 会员权益标题按状态切换：默认/未开通/已开通/过期显示「时空邂逅会员特权」，仅连续包年显示「VIP特权」，分别匹配 `62-会员中心-已开通.png` 与 `61-会员中心-连续包年.png`。
- 会员套餐横向轨道补齐第 4 张普通年卡卡片，使右侧露出卡片结构与蓝湖首屏一致。
- 会员中心默认态按 `08-会员中心-全.png` 复核首屏外框：会员卡约 `left:25rpx/top:182rpx/width:700rpx/height:268rpx`，套餐卡主体约 `top:504rpx/bottom:751.5rpx`，首张权益卡约 `top:856rpx/height:168rpx`；因此内容区顶部调整为 `6rpx`，会员卡高度调整为 `268rpx`，套餐轨道上距调整为 `54rpx`，套餐卡主体高度调整为 `248rpx`，权益标题容器保持 `104rpx`。
- 08-会员中心-全.png bbox 采样：前两张权益卡为 `top:856rpx/1044rpx`，尺寸均为 `700rpx*168rpx`。
- 会员中心默认态按 `08-会员中心-全.png` 复核套餐横向左边界：卡片约落在 `25rpx/253rpx/481rpx/709rpx`，源码保留 `220rpx` 卡宽后，将卡片右间距从 `16rpx` 收敛为 `8rpx`，避免后续卡片逐张右漂。
- 会员中心会员卡移除带头像和「你还不是会员」文案残影的 `member-vip-bg.webp`，改为无文案 CSS 几何纹理背景；`08/60/61/62/63/64/65/75/76` 的 manifest 均改为直指对应蓝湖参考图。
- 会员权益已使用 08 MCP 图标切片：`心动名单/访客/悄悄话/额外浏览/筛选/曝光/隐身/回放/每日机会` 9 个图标均替换为 `member-benefits` 目录下的真实切图，标题两侧分隔装饰也替换为 MCP 切片。
- 会员权益切片映射不再保留静默金色圆形 fallback：当前 mock icon 必须逐项映射到 MCP 切片；后续接口新增权益 icon 时，应先补切图或登记页面专属占位，不能在页面里悄悄画泛用圆形冒充。
- 会员权益切片按图形语义映射，文件名不作为业务语义：例如 `member-slice-greeting-b.png` 实际图形为回放箭头，因此固定映射到 `replay`，避免后续按文件名误换成悄悄话图标。
- 会员中心 `60/61/62/63` 状态图复核会员卡外框：四张状态图均约为 `left:25rpx/top:182rpx/width:700rpx/height:268rpx`，因此共享 `MemberHero` 统一使用 `268rpx` 高度，避免默认态和状态态首屏卡片高度不一致。
- 08/60/61/62/63 会员中心状态图 bbox 采样：会员卡统一为 `left:25rpx/top:182rpx/700rpx*268rpx`。
- 会员中心 `60/61/62/63` 状态图复核头像金边 bbox：四张状态图均约为 `x:52rpx/y:241rpx/92rpx*92rpx`，因此会员卡内头像从 `left:38rpx/80rpx` 调整为 `left:27rpx/92rpx`，屏幕锚点对齐到 `x≈52rpx/y≈241rpx`。
- 60/61/62/78 会员卡头像金边 bbox 采样：`left:52rpx/top:241rpx/92rpx*92rpx`；63 未开通态为 `left:51rpx/top:241rpx/92rpx*92rpx`。
- 08/60/61/62/63 会员套餐轨道 bbox 采样：前三张卡为 `left:29rpx/top:508.5rpx/210rpx*239.5rpx`、`left:253rpx/top:504rpx/218rpx*248rpx`、`left:481rpx/top:504rpx/218rpx*248rpx`。
- 会员中心查看记录入口固定为页面专属结构：已开通/已过期/支付态沿用蓝湖右上 `right:38rpx/top:58rpx` 锚点和 `40rpx` 行高，未开通态隐藏，点击仍进入会员记录页。
- 会员中心未开通固定底栏按 `63-会员中心-会员未开通，支付按钮固定下方.png` 采样继续收敛：白色底栏顶部约 `1387rpx`、黑金按钮约 `left:25rpx/top:1427rpx/height:98rpx` 已基本贴合；协议圆点 bbox 约 `25rpx/1552rpx/28rpx`，因此协议行上距从 `30rpx` 收紧为 `26rpx`。
- 63-会员中心-会员未开通，支付按钮固定下方.png bbox 采样：白色固定底栏约 `left:1rpx/top:1387rpx/748rpx*236rpx`。
- 60/62 会员中心固定底栏 bbox 采样：白色底栏为 `left:1rpx/top:1387rpx/748rpx*236rpx`；61 连续包年为 `left:1rpx/top:1361rpx/748rpx*262rpx`。
- 连续包年状态底部协议文案改为「会员服务协议 + 连续订阅会员服务协议 + 享568订阅优惠价（原价688）」并从 `membership.subscription` 数据读取。
- 连续包年协议优惠文案展示时去掉金额尾部 `.00`，与蓝湖 `享568订阅优惠价（原价688）` 一致，数据层仍保留 `¥568.00 / ¥688.00` 方便后续接口对接。
- 连续包年协议行按 `61-会员中心-连续包年.png` 复核：优惠说明应跟随协议文本自然换行，移除旧的 `marginLeft:40rpx/marginTop:12rpx` 额外缩进，避免第二行相对协议正文右移。
- 连续包年套餐卡和协议行按 `61` 保留蓝湖两套价格口径：套餐卡下方原价显示 `¥568.00`，协议优惠说明显示「享568订阅优惠价（原价688）」。这是同一张设计稿内的视觉文案差异，校验脚本已分别锁定，不互相覆盖。
- 会员过期态补齐灰色「已过期」胶囊和「尊贵特权已过期，重启会员，精准匹配、自由畅聊」首屏文案；未开通态不再显示右侧记录入口。
- 会员过期态导航按蓝湖 `60-会员中心-已过期.png` 隐藏居中标题，只保留返回和小程序胶囊区域。
- 会员记录页补齐蓝湖列表专用文案「时空邂逅会员连续包年 / 时空邂逅会员包年」、右侧「12个月」周期和列表有效期 `2026.05.28 15:58 - 2027.05.27 15:58`。
- 会员记录页有效期分隔符锁定为蓝湖/mock 数据一致的半角连字符 ` - `，不再使用 en dash，避免列表文案与设计稿口径不一致。
- 会员记录页按 `58-会员记录.png` 采样继续收敛：列表容器顶部留白从 `54rpx` 收到 `6rpx`，使首卡顶部约 `182rpx`、第二卡顶部约 `390rpx`，并将会员菱形从文本字符改为 CSS 结构化占位，将退款状态从简单文字圈改为倾斜圆章 + 退款标识条的结构化占位。
- 会员记录菱形图标按 `58` 继续采样收敛：参考图首个金色菱形可见 bbox 约 `x=51-98.5rpx/y=229-266.5rpx`，换算为卡片内约 `x=26-73.5rpx/y=47-84.5rpx`；因此结构化占位外层从 `left:30rpx/top:54rpx/52rpx` 调整为 `left:20rpx/top:41rpx/58rpx`，内层菱形从 `38rpx` 放大到 `42rpx`。
- 会员记录菱形会员图标内部切面继续收敛：`MemberRecordDiamond` 不再使用旋转方框，改为 `MemberRecordGemLine` 线段组合，覆盖顶部切面、左右斜边、底部 V 形和内部切面线；仍登记为缺真实会员菱形图标切图的结构化占位。
- 会员记录退款章按 `58-会员记录.png` 继续采样收敛：参考图退款章主要可见区域约 `x=324.5-506rpx/y=416-552.5rpx`，原结构化占位文字条约落到 `x=365-549rpx` 偏右，因此容器从 `left:322rpx/top:14rpx` 调整为 `left:280rpx/top:24rpx`。
- 58-会员记录.png 图标 bbox 采样：首条会员菱形金色主体约 `left:51rpx/top:229rpx/48rpx*38rpx`；退款章灰色主体约 `left:320.5rpx/top:440.5rpx/189.5rpx*85.5rpx`。
- 会员记录退款章内部圆弧和星形装饰继续收敛：`RefundStamp` 由完整圆圈改为 `RefundStampArc` 断圆弧，并补 `RefundStampStar` 结构化星形装饰；仍登记为缺真实退款章切图的占位，不使用文本 `★/☆` 冒充。
- 会员记录 mock 数据改为首屏即展示，加载态只在无记录时出现，避免进入蓝湖默认态时先闪过空态或加载态。
- 58-会员记录.png bbox 采样：列表卡片为 `left:25rpx/top:182rpx/700rpx*188rpx`，第二张 `top:390rpx`。
- 会员记录列表与会员详情页按蓝湖参考图保留两套字段口径：`58-会员记录.png` 列表使用「时空邂逅会员连续包年 / 时空邂逅会员包年」和有效期 `2026.05.28 15:58 - 2027.05.27 15:58`；`77/59` 详情页摘要使用「连续包年」，信息卡使用 `2027.05.26 15:58 / 2027.05.27 15:58`，不为了业务一致性覆盖设计稿。
- 会员详情页闭环补齐：记录页跳转已经传 `id`，详情页现在读取 `router.params.id` 并优先按 `id + 支付/退款状态` 解析记录，找不到时才按支付/退款状态回退，避免后续同状态多条记录打开错误详情，也避免直达路由 `status` 与 `id` 不一致时显示错角标。
- 会员详情页按 `77/59` 参考图采样继续收敛：内容区顶部从 `56rpx` 调整为 `8rpx`，摘要卡从 `212rpx` 收到 `168rpx`，信息卡从 `666rpx` 收到 `528rpx`，行高从 `104rpx` 收到 `88rpx`，使两张卡片的顶部、间距和首屏底部位置更贴近蓝湖。
- 会员详情页摘要卡按 `77/59` 继续复核：摘要卡 bbox 约 `left:25rpx/top:184rpx/width:700rpx/height:168rpx`，左侧文字起点约 `55.5rpx`，状态角标约 `left:590rpx/top:216rpx/right:56.5rpx/height:40rpx`；因此摘要卡内边距从 `34rpx 38rpx` 调整为 `34rpx 30rpx`，状态角标从 `top:40rpx/height:52rpx/radius:18rpx` 收敛为 `top:32rpx/height:40rpx/radius:16rpx`。
- 会员详情页信息卡按 `77/59` 继续复核：标签左锚点约 `55rpx`、右侧值贴近 `695rpx`，因此信息卡水平内边距从 `38rpx` 收敛为 `30rpx`，与摘要卡文字锚点保持一致。
- 会员详情页信息卡按 `77/59` 深色卡片连通域继续采样：外框固定为 `left:25rpx/top:372rpx/width:700rpx/height:528rpx`，6 行文字纵向节奏约每 `88rpx` 一行；因此信息卡从 `minHeight:528rpx + 上下 padding 26rpx` 修正为固定 `height:528rpx`、`padding:0 30rpx`，避免实际渲染被 6 行内容撑高到约 `580rpx`。
- 77/59 会员详情 bbox 采样：摘要卡 `left:25rpx/top:184rpx/700rpx*168rpx`，信息卡 `left:25rpx/top:372rpx/700rpx*528rpx`。
- 会员支付态直达路由 `payState=wechat-pay/pay-success/pay-cancel/unpaid-sheet` 的底层页面统一切到连续包年已开通态，匹配 `64/65/75/76` 里「连续包年、查看记录、有效期、连续套餐轨道」的蓝湖基线。
- 会员微信支付直达预览态 `payState=wechat-pay` 的支付面板金额按 `65-会员中心-微信支付.png` 固定展示 `¥268.00`；正常点击支付仍使用当前选中套餐价格，避免为了演示态破坏真实支付路径。
- 会员支付闭环继续收紧：`useMembership` 现在按页面状态初始化默认套餐，会员页首屏也同步初始化选中卡片 ID，避免 `payState=wechat-pay` 直达后在 effect 写入套餐前点击 demo 支付成功时触发「请选择套餐」。
- 会员微信支付态同步复用 `65/71` 约 `0.32` 的黑色遮罩透明度，避免原 `0.48` 造成背景会员卡和套餐区过暗。
- 会员支付成功/取消提示按 `64/75` 参考图从 `500rpx` 上移到 `393rpx`，并将提示层尺寸收敛到 `288rpx*98rpx`，让半透明提示覆盖会员卡与套餐卡之间的位置。
- 64/75 会员中心支付结果 bbox 采样：提示为 `left:231rpx/top:393rpx/288rpx*98rpx`。
- 订阅管理会员卡移除带文案残影的 `member-vip-bg.webp`，改为 CSS 几何纹理占位，避免叠加出现「你还不是会员」等错误底图文案。
- 订阅管理会员卡按 `78-订阅管理.png` 采样继续收敛：头像照片框约 `left:52rpx/top:241rpx/92rpx*92rpx`，昵称/「连续包年」胶囊起点约 `x=174.5rpx`，因此卡片内头像修正为卡片内 `left:27rpx/top:59rpx/92rpx*92rpx`，文字左锚点从 `130rpx` 调整到 `150rpx`。
- 订阅管理按 `78-订阅管理.png` 复核首屏外框：会员卡约 `left:25rpx/top:182rpx/width:700rpx/height:268rpx`，三行续费说明分别约 `570/678/786rpx` 且高度约 `98rpx`，取消续费指引卡约 `left:25rpx/top:1003rpx/width:700rpx/height:1007rpx`，底部按钮约 `top:2053rpx/height:98rpx`；因此内容区顶部调整为 `6rpx`，会员卡高度调整为 `268rpx`，说明行高度调整为 `98rpx`，说明行距调整为 `24rpx/10rpx`，指引卡上距调整为 `23rpx`。
- 78-订阅管理.png bbox 采样：会员卡 `top:182rpx/700rpx*268rpx`，三行扣费说明 `top:570/678/786rpx`，取消指引卡约 `top:1003rpx/height:1007rpx`，底部按钮 `top:2053rpx/height:98rpx`。
- 订阅管理吸收只读复核补充：底部按钮采样色约 `#242122`，源码从 `#211D1E` 调整为 `#242122`；STEP1 内嵌微信搜索截图参考尺寸约 `340.5rpx x 230rpx`，STEP2 内嵌自动续费截图参考尺寸约 `341.5rpx x 390rpx`，源码自绘占位收敛为 `342rpx` 宽、`230rpx/390rpx` 高。
- 订阅管理「取消续费指引」结构化占位补齐微信搜索页 tabs、「前往」按钮、红色箭头、自动续费服务项、开通服务日期等关键锚点，进一步贴近 `78-订阅管理.png`。
- 78-订阅管理.png 内嵌微信流程截图 bbox 采样：STEP1 白底图约 `left:51rpx/top:1136rpx/340.5rpx*230rpx`，STEP2 白底图约 `left:51rpx/top:1496rpx/341.5rpx*390rpx`。
- 78-订阅管理.png 红色标注 bbox 采样：STEP1 箭头约 `left:346rpx/top:1246rpx/17rpx*34.5rpx`、前往红框约 `left:318.5rpx/top:1294.5rpx/65.5rpx*43rpx`；STEP2 箭头约 `left:305.5rpx/top:1657rpx/44.5rpx*41.5rpx`、服务项红框约 `left:73.5rpx/top:1707.5rpx/313.5rpx*95.5rpx`。
- 订阅管理 STEP 红框/箭头源码锚点继续收敛：`SearchPlaceholder` 内「前往」红框锁定为 `right:8rpx/top:158rpx/66rpx*43rpx`，STEP1 箭头锁定为 `right:30rpx/top:110rpx/17rpx*35rpx`；`RenewPlaceholder` 服务项红框锁定为 `left:22rpx/top:211rpx/314rpx*96rpx`，STEP2 箭头锁定为 `right:43rpx/top:161rpx/45rpx*42rpx`。
- 订阅管理内嵌微信流程截图占位继续收敛：STEP1 的微信支付自动续费图标、STEP2 的会员自动续费服务图标不再使用 `□`/`卡` 文本字符冒充，改为页面专属 CSS 结构化小图标，并由校验脚本防回退。
- 订阅管理微信流程导航符号不再使用文本字符冒充：STEP1 返回箭头、语音图标，STEP2 返回箭头、更多点和服务项右箭头均改为页面专属 CSS 结构化小图标，并由校验脚本防回退。
- 订阅管理 STEP 标记不再使用文本 bullet 冒充：`STEP1/STEP2` 前的金色圆点改为页面专属 CSS 圆点，避免字体渲染差异造成参考图里的小圆点失真。
- 订阅管理长页节奏按 `78-订阅管理.png` 采样调整：取消续费指引卡由 `946rpx` 增高到约 `1007rpx`，底部按钮后的留白由 `150rpx` 收紧到 `60rpx`，贴近参考图中指引卡底部、按钮和页面底边的垂直距离。
- 订阅管理底部按钮按 `78-订阅管理.png` 复核：取消续费指引卡底约 `2009.5rpx`，按钮约 `left:25rpx/top:2053rpx/width:700rpx/height:98rpx`，页面底部留白约 `58.5rpx`；当前指引卡 `height:1007rpx`、按钮 `marginTop:43rpx`、按钮 `98rpx`、底部 padding `60rpx` 已贴合。
- 订阅管理取消续费指引卡继续锁定为固定 `height:1007rpx`，并移除最后一个 STEP 的底部 margin，避免 STEP2 文案换行时把卡片撑高、导致「查看会员订单」按钮相对 `78-订阅管理.png` 下漂。
- 会员中心「未支付出弹窗」按 `76-会员中心-未支付出弹窗.png` 收敛为白色底部圆角层 + 协议行 + 单一黑金「确认并开通」按钮，移除蓝湖没有的次按钮。
- 会员中心「未支付出弹窗」继续按 `76` 像素采样收敛：白色弹层顶部约 `1236rpx`、高度约 `388rpx`，黑金按钮约 `left:44rpx/top:1443rpx/width:664rpx/height:98rpx`；因此弹层高度从 `392rpx` 修正为 `388rpx`，顶部内边距从 `46rpx` 收紧为 `28rpx`，标题/协议/按钮节奏调整为 `48rpx + 30rpx + 50rpx + 50rpx + 98rpx`。
- 76-会员中心-未支付出弹窗.png bbox 采样：白色弹层为 `left:0rpx/top:1236rpx/750rpx*388rpx`，确认按钮为 `left:44rpx/top:1443rpx/664rpx*98rpx`。
- 会员中心协议交互闭环补齐：底部协议默认未勾选，点击「立即开通」先进入 `76` 未支付底部弹层；在弹层点击「确认并开通」后自动勾选协议并进入微信支付流程，当前 demo 使用 `WechatMockPayPanel` 模拟，不再直接模拟支付成功。
- 会员中心支付结果态按 `64/75` 继续复核：底部协议圆点 bbox 约 `left:25rpx/top:1552rpx/28rpx*28rpx` 且中心为白色空心；真实点击路径现在在支付成功/取消回调里先复位协议勾选，再展示 `64/75` 结果 toast，避免底部残留已勾选态。

## 素材与 MCP 状态

- 当前可用设计基线来自 `miniapp/.lanhu-ref/lanhu-full-2026-07-07/images/` 的 1500px 宽参考图。
- 当前项目可复用商业化资产包括 `coin-balance-bg.webp`、`coin-gold.png`、`coin-usage-slice.png`、`member-benefits/*` 以及我的页部分卡片图；`member-vip-bg.webp` 因含旧文案和头像残影，已不再作为会员卡背景使用。
- 仓库内可追踪缺失切图台账见 `docs/验收报告/2026-07-08-商业化蓝湖缺失切图台账.md`；本机 `.lanhu-ref/lanhu-full-2026-07-07/missing-slices.md` 为蓝湖参考目录内的同步台账。
- 蓝湖 MCP 对 `千寻币-协议勾选` 当前只返回圆角 token，未返回完整 HTML/layer 布局；本页底部栏尺寸基线来自本地参考图像素采样。
- 蓝湖 MCP 对 `订阅管理` 的 slices 查询结果为 `totalSlices: 0`，无法导出 STEP1/STEP2 微信流程截图、红框和红箭头独立切图；本页仍按整页参考图采样 + 结构化占位还原。
- 蓝湖 MCP 对 `千寻币明细-暂无数据` 的 slices 查询结果为 `totalSlices: 0`，无法导出空态插画切片。
- 蓝湖 MCP 对 `会员记录` 的 slices 查询结果为 `totalSlices: 0`，无法导出会员菱形图标或退款章切片。
- 蓝湖 MCP 对 `会员记录-详情（已支付）`、`会员记录-详情（已退款）` 只返回纯色矩形 shape，未返回可替换的业务图标或状态切片。
- 蓝湖 MCP 对会员状态页 `60/61/62/63` 的 slices 查询结果均为 `totalSlices: 0`；会员状态页权益图标沿用 `08-会员中心-全` 导出的 MCP 图标切片。
- 蓝湖 MCP 对微信支付态 `65-会员中心-微信支付`、`71-千寻币-微信支付` 的 slices 查询结果均为 `totalSlices: 0`；同时微信支付键盘属于微信原生系统 UI，不纳入业务页面手写 1:1，当前只登记 demo fallback。
- 蓝湖 MCP 对底部协议弹层 `76-会员中心-未支付出弹窗`、`79-千寻币-点支付未勾选协议` 的 slices 查询结果均为 `totalSlices: 0`，当前继续按整页参考图采样手写。
- 本轮通过蓝湖 MCP 查询后未能获取新增 slices；缺失素材按占位处理并登记。
- 禁止从整页参考图热区硬裁缺失素材为运行切图；未通过 MCP slices 或明确导出的局部素材，只能作为结构化占位并登记。

## 缺失切图替换映射

| 缺口 | 页面/状态 | 源码占位 | 替换目标 | 不可硬裁说明 |
|------|----------|----------|----------|--------------|
| 千寻币用途 8 个独立 icon | 09-千寻币 | `coin-usage-slice.png` 整卡 | 8 个独立用途 icon 切片 | 不从 09 整页图热区硬裁 |
| 千寻币明细空态插画 | 67-千寻币明细-暂无数据 | `EmptyState` / `EmptyPlusMark` / `EmptyRingMark` | 空态插画独立 PNG/WebP | 不从 67 整页图热区硬裁 |
| 会员中心无文案会员卡背景 | 60/61/62/63 会员状态页、78-订阅管理 | `MemberHeroPattern` / `SubscriptionHeroPattern` | 无文案会员卡背景切图 | 不复用含旧文案的 `member-vip-bg.webp` |
| 会员记录图标与退款章 | 58-会员记录 | `MemberRecordDiamond` / `RefundStamp` | 会员菱形图标、退款章独立切图 | 不从 58 整页图热区硬裁 |
| 会员记录详情纯色 shape | 59/77 会员记录详情 | `SummaryCard` / `InfoCard` 源码结构 | 有业务图标时重新导出切片 | 不接入无语义纯色矩形 shape |
| 订阅管理 STEP 微信流程图 | 78-订阅管理 | `SearchPlaceholder` / `RenewPlaceholder` | STEP1/STEP2 微信流程截图切图 | 不从 78 整页图热区硬裁 |
| 微信支付原生键盘 | 65/71 微信支付态 | `WechatMockPayPanel` demo fallback | 真机 `wx.requestPayment` 原生截图 | 不手写数字键盘，不把 fallback 当生产 UI |
| 底部协议弹层 | 76/79 底部弹层 | `UnpaidBottomSheet` / `AgreementConfirmSheet` | 蓝湖组件切片或截图差异验收 | 不从 76/79 整页图热区硬裁 |

### 2026-07-08 MCP slices 复查

- 千寻币明细-暂无数据：totalSlices=0。
- 会员记录：totalSlices=0。
- 会员记录-详情（已支付）：totalSlices=1，仅纯色矩形 shape，不作为业务切图接入。
- 会员记录-详情（已退款）：totalSlices=1，仅纯色矩形 shape，不作为业务切图接入。
- 会员中心-已开通：totalSlices=0。
- 会员中心-已过期：totalSlices=0。
- 会员中心-连续包年：totalSlices=0。
- 会员中心-会员未开通，支付按钮固定下方：totalSlices=0。
- 会员中心-微信支付：totalSlices=0。
- 订阅管理：totalSlices=0。

## 静态校验

- `cd miniapp && node scripts/validate-commerce-ui-coverage.mjs`：通过
- `cd miniapp && node scripts/validate-lanhu-demo-data.mjs`：通过
- `cd miniapp && node - <<'NODE' ... @babel/parser parse changed TSX/JSON/MJS ... NODE`：通过
- `git diff --check -- ...商业化相关文件`：通过

未执行：Taro build、dev server、小程序自动编译。原因：项目本机固定要求“改动落完后不要进行编译等任何操作”。

## 缺失切图

- 千寻币用途已使用 MCP 整卡切片，未获得 8 个独立 icon 切片；后续若用途需要接口动态化，应继续向蓝湖补导出单个图标切片。
- 千寻币明细暂无记录插画 MCP slices 为 0：当前使用 CSS 线框占位。
- 会员权益已使用 08 MCP 图标切片；会员状态页 60/61/62/63 MCP slices 均为 0，因此这些状态页沿用 08 的权益图标切片。
- 会员记录 MCP slices 为 0：会员菱形会员图标和退款圆章星形素材当前使用 CSS 结构化占位。
- 会员详情 MCP 只返回纯色矩形 shape：不接入无语义矩形切片，详情页继续使用源码结构还原卡片。
- 会员中心装饰分隔图标已使用 MCP 切片，不再作为缺失切图项。
- 会员中心/订阅管理会员卡专用无文案背景：当前使用 CSS 几何纹理占位，缺去除文案和头像后的专用背景切图。
- 订阅管理「取消续费指引」里的两张微信流程截图：当前使用结构化占位还原位置、文案、红框、红色箭头和服务项信息。
- 微信支付态 65/71 MCP slices 均为 0：微信支付键盘属于微信原生系统 UI，不纳入业务页面手写 1:1；当前 `WechatMockPayPanel` 仅用于 demo fallback。
- 底部协议弹层 76/79 MCP slices 均为 0：当前按整页参考图采样手写。
- 会员套餐第 4 张卡片完整展开后的隐藏区域标注：蓝湖首屏只露出右缘，当前按普通年卡数据占位。
- 切不到的素材必须保留在本节和 `.lanhu-ref/lanhu-full-2026-07-07/missing-slices.md`，不得从整页参考图里裁一块当作真实切片提交。

### 缺失切图占位 allowlist

以下函数只允许作为缺失切图的临时占位；拿到蓝湖切图后必须替换为真实 `Image`/切片并删除对应占位函数：

- `EmptyState`、`EmptyPlusMark`、`EmptyRingMark`：千寻币明细暂无记录插画。
- `MemberHeroPattern`：会员中心会员卡无文案背景。
- `MemberRecordDiamond`、`MemberRecordGemLine`、`RefundStamp`、`RefundStampArc`、`RefundStampStar`：会员记录会员图标和退款章。
- `SubscriptionHeroPattern`：订阅管理会员卡无文案背景。
- `SearchPlaceholder`、`RenewPlaceholder`：订阅管理取消续费指引里的两张微信流程截图。

## 当前差异

- 由于未运行小程序截图闭环，本轮不能按像素差异给出 95%+ 高还原结论。
- 微信支付键盘为微信原生系统 UI，当前 demo fallback 不能作为生产支付面板 1:1 证据；正式小程序仍需用真实 `wx.requestPayment` 截图补验收。
- 缺失切图处只做占位，不作为 1:1 完成项。
- 只读复核确认：会员记录的 `MemberRecordDiamond`、`RefundStamp` 仍为结构化占位，缺真实菱形图标和退款章星形/圆弧细节切图。
- 只读复核确认：订阅管理的 `SubscriptionHeroPattern`、`SearchPlaceholder`、`RenewPlaceholder` 仍为结构化占位，缺专用会员卡无文案背景和两张微信流程截图切图。
- 旧参考图 `miniapp/.lanhu-ref/会员中心/会员记录.png` 与当前 `58-会员记录.png` 文案口径冲突，当前 manifest 以 `58-会员记录.png` 为主锚点。

## 结论

本轮已完成商业化主链路的源码、路由、数据和静态校验闭环；视觉还原已向蓝湖结构靠齐。要宣称严格 1:1，还需要在允许编译/预览后补小程序截图对比，并替换上述缺失切图。
