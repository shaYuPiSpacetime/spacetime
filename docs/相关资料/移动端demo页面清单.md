## 1. 功能页面清单

| 编号         | 分类路径                             | 页面名称                | demo 线索                                                                                             | 备注                            |
| ------------ | ------------------------------------ | ----------------------- | ----------------------------------------------------------------------------------------------------- | ------------------------------- |
| APP-PAGE-001 | 千寻 -> 成家 -> 关注                 | 成家关注信息流页        | `Community.vue`、`activeMarriageSubTab=following`                                                     | 成家内容流                      |
| APP-PAGE-002 | 千寻 -> 成家 -> 同城                 | 成家同城信息流页        | `Community.vue`、`activeMarriageSubTab=local`                                                         | 成家内容流                      |
| APP-PAGE-003 | 千寻 -> 成家 -> 热门                 | 成家热门信息流页        | `Community.vue`、`activeMarriageSubTab=hot`                                                           | 成家内容流                      |
| APP-PAGE-004 | 千寻 -> 成家 -> 热门                 | 家园话题模块 / 话题入口 | `VillageTopics.vue`                                                                                   | 热门内容入口                    |
| APP-PAGE-005 | 千寻 -> 成家                         | 发布动态页              | `PublishView.vue`、路由 `publish` / `publish-moment`                                                  | 动态发布                        |
| APP-PAGE-006 | 千寻 -> 成家                         | 社区发布动态页          | `community/PublishPage.vue`、路由 `community/publish`                                                 | 发布独立页                      |
| APP-PAGE-007 | 千寻 -> 成家                         | 动态详情 / 帖子详情页   | `PostDetail.vue`、路由 `post/:id`                                                                     | 内容详情                        |
| APP-PAGE-008 | 千寻 -> 成家                         | 话题详情页              | `TopicDetail.vue`、路由 `topic/:id`                                                                   | 话题详情                        |
| APP-PAGE-009 | 千寻 -> 成家                         | 话题列表 / 家园话题页   | `TopicList.vue`、路由 `topics`                                                                        | 话题列表                        |
| APP-PAGE-010 | 千寻 -> 成家                         | 话题聚合详情页          | `TopicDetail.vue`、路由 `topic/:id` 话题聚合页                                                        | demo 已有，对应单个话题聚合详情 |
| APP-PAGE-011 | 千寻 -> 成家                         | 社区更多操作页          | `community/MoreAction.vue`、路由 `community/more`                                                     | 内容操作                        |
| APP-PAGE-012 | 千寻 -> 成家                         | 社区打招呼页            | `community/YoPage.vue`、路由 `community/yo`                                                           | 内容操作                        |
| APP-PAGE-013 | 千寻 -> 成家                         | 社区发私信页            | `community/WhisperPage.vue`、路由 `community/whisper`                                                 | 内容操作                        |
| APP-PAGE-014 | 千寻 -> 成家                         | 社区举报页              | `community/ReportPage.vue`、路由 `community/report`                                                   | 内容操作                        |
| APP-PAGE-015 | 千寻 -> 立业 -> 择业                 | 择业页                  | `Community.vue`、`activeCareerSubTab=choice`                                                          | 千寻内立业子页                  |
| APP-PAGE-016 | 千寻 -> 立业 -> 择业                 | 择业应届生列表          | `careerMenuItems=freshman`                                                                            | 择业分类                        |
| APP-PAGE-017 | 千寻 -> 立业 -> 择业                 | 择业出路列表            | `careerMenuItems=career`                                                                              | 择业分类                        |
| APP-PAGE-018 | 千寻 -> 立业 -> 择业                 | 择业国企列表            | `careerMenuItems=state`                                                                               | 择业分类                        |
| APP-PAGE-019 | 千寻 -> 立业 -> 职业推荐             | 职业推荐页              | `Community.vue`、`activeCareerSubTab=part-time`                                                       | 千寻内立业子页                  |
| APP-PAGE-020 | 千寻 -> 立业 -> 高考志愿             | 高考志愿页              | `Community.vue`、`activeCareerSubTab=college-entrance`                                                | 千寻内立业子页                  |
| APP-PAGE-021 | 千寻 -> 立业                         | 职业帖子详情页          | `PostDetail.vue`、路由 `post/:id?from=career`                                                         | 内容详情                        |
| APP-PAGE-022 | 千寻 -> 立业                         | 立业个人主页            | `CareerUserProfile.vue`、路由 `career/user/:id`                                                       | 立业用户页                      |
| APP-PAGE-023 | 千寻 -> 立业                         | 职业测评报告页          | `CareerRecommend.vue`、路由 `career-recommend` / `career-report/:id`                                  | 职业报告                        |
| APP-PAGE-024 | 千寻 -> 立业                         | 推荐职位页              | `CareerOpportunities.vue`、路由 `career-opportunities`                                                | 职业机会                        |
| APP-PAGE-025 | 千寻 -> 知音 -> 觅知音               | 觅知音页                | `Community.vue`、`activeFriendsSubTab=mizhiyin`、`recommend/MizhiyinTab.vue`                          | 知音子页                        |
| APP-PAGE-026 | 千寻 -> 知音 -> 悦目                 | 悦目页                  | `Community.vue`、`activeFriendsSubTab=yueyu`、`recommend/YueyuTab.vue`                                | 知音子页                        |
| APP-PAGE-027 | 千寻 -> 知音 -> 诚意贴               | 诚意贴列表页            | `Community.vue`、`activeFriendsSubTab=chengyi`、`recommend/ChengyiTab.vue`                            | 知音子页                        |
| APP-PAGE-028 | 千寻 -> 知音 -> 高山流水测评         | 知音匹配页              | `AssessmentList.vue` 底部「知音匹配」进入；`ZhiyinMatch.vue`、路由 `zhiyin-match`                     | 不是点击单个测评卡片进入        |
| APP-PAGE-029 | 千寻 -> 知音 -> 知音匹配             | 匹配详情页 / 恋爱风格页 | `ZhiyinMatch.vue` 点击匹配记录进入；`MatchDetail.vue`、路由 `match-detail/:id`                        | 知音匹配结果详情                |
| APP-PAGE-030 | 心动 -> 顶部 Tab                     | 喜欢我的页              | `Career.vue` 顶部 Tab、`marriage/LikesMe.vue`、路由 `career/likes-me`                                 | 心动页内 Tab                    |
| APP-PAGE-031 | 心动 -> 顶部 Tab                     | 最近看过我的页          | `Career.vue` 顶部 Tab、`marriage/RecentViewers.vue`、路由 `career/recent-viewers`                     | 心动页内 Tab                    |
| APP-PAGE-032 | 心动 -> 右上角入口                   | 相互喜欢页              | `Career.vue` 右上角爱心入口、`MutualLikes.vue`                                                        | 双向喜欢                        |
| APP-PAGE-033 | 荐 -> 成家 -> 觅缘                   | 觅缘推荐流              | `marriage/FateRecommend.vue`、`MarriageLayout.vue`                                                    | 推荐卡片流                      |
| APP-PAGE-034 | 荐 -> 成家 -> 觅缘                   | 觅缘卡片详情            | `marriage/FateCard.vue`                                                                               | 推荐用户卡片详情                |
| APP-PAGE-035 | 荐 -> 成家 -> 觅缘                   | 觅缘等待页              | `marriage/FateWaiting.vue`                                                                            | 推荐等待/空态                   |
| APP-PAGE-036 | 荐 -> 成家 -> 觅缘                   | 觅缘回看页              | `HistoryView.vue`、路由 `history`                                                                     | 推荐回看                        |
| APP-PAGE-037 | 荐 -> 成家 -> 觅缘                   | 偏好设置页              | `Preference.vue`、路由 `preference`                                                                   | 推荐偏好                        |
| APP-PAGE-038 | 荐 -> 成家 -> 觅缘                   | 见面偏好页              | `MeetingPreference.vue`、路由 `meeting-preference`                                                    | 见面偏好                        |
| APP-PAGE-039 | 荐 -> 成家 -> 心印测试               | 心印测试页              | `marriage/SoulTest.vue`                                                                               | 成家测评入口                    |
| APP-PAGE-040 | 荐 -> 成家 -> 理想型                 | 理想型页                | `marriage/IdealType.vue`                                                                              | 理想型筛选/搜索                 |
| APP-PAGE-041 | 荐 -> 成家 -> 理想型                 | 推荐记录页              | `marriage/IdealTypeHistory.vue`、路由 `ideal-history`                                                 | 理想型/推荐历史                 |
| APP-PAGE-042 | 荐 -> 成家 -> 理想型                 | 历史解锁页              | `marriage/UnlockedHistory.vue`、路由 `unlocked-history`                                               | 已解锁用户记录                  |
| APP-PAGE-043 | 荐 -> 成家 -> 精选                   | 精选页                  | `marriage/Featured.vue` 精选页面                                                                      | 高质量用户推荐                  |
| APP-PAGE-044 | 荐 -> 成家                           | 婚恋推荐页              | `MarriageRecommend.vue`                                                                               | demo 页面，未见当前路由         |
| APP-PAGE-045 | 荐 -> 成家                           | 分享三观页              | `ShareValues.vue`、路由 `share-values`                                                                | demo 功能页                     |
| APP-PAGE-046 | 荐 -> 用户主页                       | 用户主页 / 个人主页     | `UserProfile.vue`、路由 `user/:id` / `profile/:id` / `user/profile/:id`                               | 通用用户主页                    |
| APP-PAGE-047 | 荐 -> 用户主页                       | 用户详情页              | `UserDetail.vue`                                                                                      | demo 功能页，未见当前路由       |
| APP-PAGE-048 | 荐 -> 用户主页                       | 用户首页                | `UserHomePage.vue`                                                                                    | demo 功能页，未见当前路由       |
| APP-PAGE-049 | 消息                                 | 消息列表页              | `Message.vue`、路由 `message`                                                                         | 消息首页                        |
| APP-PAGE-050 | 消息                                 | 私信对话页              | `PrivateMessage.vue`、路由 `private-message/:id`                                                      | 私信                            |
| APP-PAGE-051 | 消息                                 | 官方助手聊天页          | `OfficialChat.vue`、路由 `official-chat`                                                              | 官方助手                        |
| APP-PAGE-052 | 消息                                 | 官方消息详情页          | `OfficialMessageDetail.vue`、路由 `official-message/:id`                                              | 官方消息                        |
| APP-PAGE-053 | 消息                                 | 悄悄话消息页            | `NoteMessageList.vue`、路由 `note-messages`                                                           | 悄悄话                          |
| APP-PAGE-054 | 消息                                 | 通知中心页              | `Notifications.vue`、路由 `notifications`                                                             | 通知列表                        |
| APP-PAGE-055 | 消息                                 | 通知详情页              | `NotificationDetail.vue`、路由 `notifications/:type`                                                  | 通知详情                        |
| APP-PAGE-056 | 消息 -> 邀请消息                     | 邀请响应页              | `Message.vue` 邀请类消息点击进入；`InvitationResponse.vue`、路由 `invitation-response`                | 邀请/关系响应                   |
| APP-PAGE-057 | 我的                                 | 我的页 / 更多页         | `Discover.vue`、路由 `discover` 我的页                                                                | 我的功能首页                    |
| APP-PAGE-058 | 我的 -> 资料卡                       | 编辑资料总页            | `Discover.vue` 头像编辑入口；`ProfileEdit.vue`、路由 `profile-edit`                                   | 截图顶部资料卡入口              |
| APP-PAGE-059 | 我的 -> 资料编辑                     | 编辑资料信息页          | `ProfileInfoEdit.vue`、路由 `profile-info-edit`                                                       | 资料编辑                        |
| APP-PAGE-060 | 我的 -> 资料编辑                     | 添加标签页              | `TagSelect.vue`、`AddTags.vue`、路由 `tag-select`                                                     | 标签编辑                        |
| APP-PAGE-061 | 我的 -> 资料编辑                     | 选择行业页              | `IndustrySelect.vue`、路由 `industry-select`                                                          | 资料字段选择                    |
| APP-PAGE-062 | 我的 -> 资料编辑                     | 选择职业页              | `JobSelect.vue`、路由 `job-select`                                                                    | 资料字段选择                    |
| APP-PAGE-063 | 我的 -> 资料编辑                     | 选择公司页              | `CompanySearch.vue`、路由 `company-search`                                                            | 资料字段选择                    |
| APP-PAGE-064 | 我的 -> 统计区                       | 我喜欢的页              | `Discover.vue`「我喜欢的」入口；`Likes.vue`、路由 `likes`                                             | 截图统计区入口                  |
| APP-PAGE-065 | 我的 -> 统计区                       | 喜欢我的页              | `Discover.vue`「喜欢我的」入口；当前跳 `/?tab=search&subMenu=likesMe`，心动页也有 `/career/likes-me`  | 截图统计区入口，入口待统一      |
| APP-PAGE-066 | 我的 -> 统计区                       | 最近来访页              | `Discover.vue`「最近来访」入口；当前跳 `/?tab=search&subMenu=recentViewers`                           | 截图统计区入口，入口待统一      |
| APP-PAGE-067 | 我的 -> 统计区                       | 提升人气页              | `Discover.vue`「提升人气」入口；`FateWaiting.vue` 等待页卡片入口；`BoostView.vue`、路由 `boost`       | 截图统计区入口                  |
| APP-PAGE-068 | 我的 -> 成家会员                     | VIP 会员中心页          | `Discover.vue`「成家会员」卡片；`VipMembership.vue`、路由 `vip-membership`                            | 截图会员卡入口                  |
| APP-PAGE-069 | 我的 -> 成家会员                     | VIP 图片查看页          | `Discover.vue` 会员卡右侧箭头；`VipImageView.vue`、路由 `vip-image-view`                              | 会员卡右侧入口                  |
| APP-PAGE-070 | 我的 -> 成家币                       | 成家币充值页            | `Discover.vue`「成家币」菜单；`CoinRecharge.vue`、路由 `coin-recharge`                                | 截图菜单入口                    |
| APP-PAGE-071 | 我的 -> 成家币                       | 成家币明细页            | `CoinDetail.vue`、路由 `coin-detail`                                                                  | 成家币流水                      |
| APP-PAGE-072 | 我的 -> 福利中心                     | 每日签到页              | `Discover.vue`「福利中心」菜单；`CheckIn.vue`、路由 `check-in`                                        | 截图菜单入口                    |
| APP-PAGE-073 | 我的 -> 我的动态                     | 我的动态页              | `Discover.vue`「我的动态」菜单；`MyMoments.vue`、路由 `my-moments`                                    | 截图菜单入口                    |
| APP-PAGE-074 | 我的 -> 我的动态                     | TA 的动态页             | `MyMoments.vue`、路由 `my-moments/:id`；demo 仅见路由定义，未见明确点击入口                           | 他人动态，可能为预留页面        |
| APP-PAGE-075 | 我的 -> 情感课程                     | 情感课程页              | `Discover.vue`「情感课程」菜单；`EmotionalCourses.vue`、路由 `emotional-courses`                      | 截图菜单入口                    |
| APP-PAGE-076 | 我的 -> 情感课程                     | 课程播放页              | `CourseVideo.vue`、路由 `course/:id`                                                                  | 内容课程                        |
| APP-PAGE-077 | 我的 -> 推荐给好友                   | 推荐给好友页 / 邀请首页 | `Discover.vue`「推荐给好友」菜单；`InviteFriends.vue`、路由 `invite-friends`                          | 截图菜单入口                    |
| APP-PAGE-078 | 我的 -> 推荐给好友                   | 活动规则页              | `ActivityRules.vue`、路由 `activity-rules`                                                            | 活动规则                        |
| APP-PAGE-079 | 我的 -> 帮助与客服                   | 反馈箱页 / 帮助与客服页 | `Discover.vue`「帮助与客服」菜单当前跳 `feedback`；`FeedbackBox.vue`                                  | 截图底部菜单入口                |
| APP-PAGE-080 | 我的 -> 帮助与客服                   | 客服中心页              | `CustomerService.vue`、路由 `customer-service`                                                        | 客服                            |
| APP-PAGE-081 | 我的 -> 帮助与客服                   | 公告栏页                | `Announcement.vue`、路由 `announcement`                                                               | 公告                            |
| APP-PAGE-082 | 我的 -> 安全中心                     | 安全中心页              | `Discover.vue`「安全中心」菜单；`Security.vue`、路由 `security`                                       | 截图底部菜单入口                |
| APP-PAGE-083 | 我的 -> 安全中心                     | 关键词屏蔽页            | `Security.vue`「关键词屏蔽」入口；`KeywordBlock.vue`、路由 `keyword-block`                            | 安全工具入口                    |
| APP-PAGE-084 | 我的 -> 设置                         | 设置页                  | `Discover.vue`「设置」菜单；`Settings.vue`、路由 `settings`                                           | 截图底部菜单入口                |
| APP-PAGE-085 | 我的 -> 设置 -> 隐私设置             | 隐私设置页              | `Settings.vue`「隐私设置」入口；`PrivacySettings.vue`、路由 `privacy-settings`                        | 设置页入口                      |
| APP-PAGE-086 | 我的 -> 设置 -> 隐私设置             | 屏蔽的用户 / 黑名单页   | `PrivacySettings.vue`「屏蔽的用户」入口；`BlockedUsers.vue`、路由 `blocked-users`                     | 隐私设置下级                    |
| APP-PAGE-087 | 我的 -> 设置 -> 隐私设置             | 不看 TA 动态页          | `PrivacySettings.vue`「不看ta的动态」入口；`HiddenUsers.vue`、路由 `hidden-users`                     | 隐私设置下级                    |
| APP-PAGE-088 | 我的 -> 设置 -> 隐私设置             | 关键词屏蔽页            | `PrivacySettings.vue`「关键词屏蔽」入口；`KeywordBlock.vue`、路由 `keyword-block`                     | 隐私设置下级                    |
| APP-PAGE-089 | 我的 -> 设置 -> 隐私设置             | 系统权限页              | `PrivacySettings.vue`「系统权限管理」入口；`SystemPermissions.vue`、路由 `system-permissions`         | 隐私设置下级                    |
| APP-PAGE-090 | 我的 -> 设置 -> 隐私设置 -> 系统权限 | 权限设置详情页          | `SystemPermissions.vue` 点击权限项进入；`PermissionDetail.vue`、路由 `permission/:type`               | 权限详情                        |
| APP-PAGE-091 | 我的 -> 设置                         | 通知设置页              | `Settings.vue`「消息通知」入口；`NotificationSettings.vue`、路由 `notification-settings`              | 设置页入口                      |
| APP-PAGE-092 | 我的 -> 设置                         | 第三方信息共享清单页    | `Settings.vue`「第三方信息共享清单」入口；`ThirdPartyInfo.vue`、路由 `third-party-info`               | 设置页入口                      |
| APP-PAGE-093 | 我的 -> 设置                         | 个人信息收集清单页      | `Settings.vue`「个人信息收集清单」入口；`PersonalInfoCollection.vue`、路由 `personal-info-collection` | 设置页入口                      |
| APP-PAGE-094 | 我的 -> 设置                         | 关于我们页              | `Settings.vue`「关于我们」入口；`AboutUs.vue`、路由 `about-us`                                        | 设置页入口                      |
| APP-PAGE-095 | 我的 -> 设置 -> 关于我们             | 用户协议页              | `AboutUs.vue`「用户协议」入口；`UserAgreement.vue`、路由 `user-agreement`                             | 关于我们下级                    |
| APP-PAGE-096 | 我的 -> 设置 -> 关于我们             | 隐私政策页              | `AboutUs.vue`「隐私政策」入口；`PrivacyPolicy.vue`、路由 `privacy-policy`                             | 关于我们下级                    |
| APP-PAGE-097 | 我的 -> 设置 -> 关于我们             | 隐私政策摘要页          | `AboutUs.vue`「隐私政策摘要」入口；`PrivacySummary.vue`、路由 `privacy-summary`                       | 关于我们下级                    |
| APP-PAGE-098 | 我的 -> 设置 -> 关于我们             | 平台信息管理规范页      | `AboutUs.vue`「平台信息管理规范」入口；`PlatformRules.vue`、路由 `platform-rules`                     | 关于我们下级                    |
| APP-PAGE-099 | 我的 -> 设置 -> 关于我们             | 公告栏页                | `AboutUs.vue`「公告栏」入口；`Announcement.vue`、路由 `announcement`                                  | 关于我们下级                    |
| APP-PAGE-100 | 我的 -> 认证                         | 我的认证页 / 认证中心   | `MyCertifications.vue`、路由 `my-certifications`                                                      | 资料卡认证状态关联              |
| APP-PAGE-101 | 我的 -> 认证                         | 实名认证页              | `RealNameVerify.vue`、路由 `verify`                                                                   | 认证                            |
| APP-PAGE-102 | 我的 -> 认证                         | 学历认证页              | `EducationVerify.vue`、路由 `education-verify`                                                        | 认证                            |
| APP-PAGE-103 | 我的 -> 认证                         | 认证成功页              | `VerifySuccess.vue`、路由 `verify-success`                                                            | 认证结果                        |
| APP-PAGE-104 | 我的 -> 认证                         | 婚姻认证页              | `MarriageVerify.vue`、路由 `marriage-verify`                                                          | 认证扩展                        |
| APP-PAGE-105 | 我的 -> 认证                         | 单身承诺函页            | `SingleCommitment.vue`、路由 `single-commitment`                                                      | 认证扩展                        |
| APP-PAGE-106 | 测评                                 | 测评列表页              | `AssessmentList.vue`、路由 `assessment`                                                               | 测评                            |
| APP-PAGE-107 | 测评                                 | 测评详情 / 测评说明页   | `AssessmentDetail.vue`、路由 `assessment/:testId`                                                     | 测评说明                        |
| APP-PAGE-108 | 测评                                 | 测评作答页              | `AssessmentDetail.vue`                                                                                | 可由详情页承接                  |
| APP-PAGE-109 | 测评                                 | 测评报告列表页          | `ReportList.vue`、路由 `report-list`                                                                  | 报告列表                        |
| APP-PAGE-110 | 测评 -> 报告                         | 霍兰德报告页            | `HollandReport.vue`、路由 `report/holland`                                                            | 报告                            |
| APP-PAGE-111 | 测评 -> 报告                         | 荣格认知功能报告页      | `JungReport.vue`、路由 `jung-report`                                                                  | 报告                            |
| APP-PAGE-112 | 测评 -> 报告                         | 荣格八维报告详情页      | `JungReportDetail.vue`、路由 `jung-report/:id`                                                        | 报告详情                        |
| APP-PAGE-113 | 测评 -> 报告                         | MBTI 报告页             | `MbtiReport.vue`、路由 `report/mbti`                                                                  | 报告                            |
| APP-PAGE-114 | 测评 -> 报告                         | MBTI 详情页             | `MbtiDetail.vue`、路由 `mbti-detail`                                                                  | 报告详情                        |
| APP-PAGE-115 | 测评 -> 报告                         | 婚恋测评报告列表页      | `MarriageReports.vue`、路由 `marriage-reports`                                                        | 报告                            |
| APP-PAGE-116 | 测评 -> 报告                         | 依恋类型报告详情页      | `MarriageReportDetail.vue`、路由 `marriage-report/:id`                                                | 报告详情                        |
| APP-PAGE-117 | 测评 -> 匹配                         | 合拍的人页              | `MatchUsers.vue`、路由 `match-users`                                                                  | 测评匹配                        |
| APP-PAGE-118 | 测评 -> 匹配                         | 合拍度分析页            | `Compatibility.vue`、路由 `compatibility`                                                             | 测评匹配                        |
| APP-PAGE-119 | 登录注册                             | 微信授权登录页          | `Login.vue`                                                                                           | 登录                            |
| APP-PAGE-120 | 登录注册                             | 微信回调页              | `WechatCallback.vue`                                                                                  | 登录回调                        |
| APP-PAGE-121 | 全局                                 | 搜索首页                | `Search.vue`、路由 `search`                                                                           | 搜索                            |
| APP-PAGE-122 | 全局                                 | 搜索结果页              | `Search.vue`                                                                                          | 搜索                            |
| APP-PAGE-123 | 全局                                 | 分享到微信页            | `WechatShare.vue`、路由 `wechat-share`                                                                | 分享                            |
| APP-PAGE-124 | 全局                                 | 施工中页                | `ConstructingPage.vue`                                                                                | 兜底页                          |

## 2. 功能弹窗 / 浮层清单

| 编号        | 分类路径                 | 弹窗 / 浮层名称         | demo 线索                                       | 备注                               |
| ----------- | ------------------------ | ----------------------- | ----------------------------------------------- | ---------------------------------- |
| APP-POP-001 | 千寻 -> 成家             | 发布动态弹窗            | `PublishModal.vue`                              | 内容发布                           |
| APP-POP-002 | 千寻 -> 成家             | 更多操作弹窗            | `MoreModal.vue`、`MoreActionsModal.vue`         | 内容操作                           |
| APP-POP-003 | 千寻 -> 成家             | 举报弹窗                | `ReportModal.vue`                               | 内容举报                           |
| APP-POP-004 | 千寻 -> 成家             | 图片预览覆盖层          | `ImageOverlay.vue`                              | 图片查看                           |
| APP-POP-005 | 千寻 -> 知音 -> 悦目     | 悦目悄悄话弹窗          | `WhisperModal.vue`                              | 悦目互动                           |
| APP-POP-006 | 千寻 -> 知音 -> 诚意贴   | 诚意贴更多操作弹窗      | `MoreModal.vue`                                 | 诚意贴操作                         |
| APP-POP-007 | 千寻 -> 知音 -> 诚意贴   | 诚意贴 YO / 悄悄话弹窗  | `WhisperModal.vue`                              | 诚意贴互动                         |
| APP-POP-008 | 千寻 -> 知音 -> 诚意贴   | 诚意贴发布弹窗          | `PublishModal.vue`                              | 诚意贴发布                         |
| APP-POP-009 | 千寻 -> 内容解锁         | 解锁匿名身份弹窗        | `Community.vue`、`showUnlockModal`              | 匿名身份解锁                       |
| APP-POP-010 | 心动                     | 相互喜欢 / 匹配成功弹窗 | `MutualLikeModal.vue`                           | 匹配成功                           |
| APP-POP-011 | 心动                     | 用户喜欢详情弹窗        | `LikeUserDetailModal.vue`                       | 喜欢详情                           |
| APP-POP-012 | 荐 -> 成家 -> 觅缘       | 悄悄话弹窗              | `WhisperModal.vue`                              | 关系互动                           |
| APP-POP-013 | 荐 -> 成家 -> 觅缘       | VIP 会员弹窗            | `VipMembershipModal.vue`                        | 会员购买                           |
| APP-POP-014 | 荐 -> 成家 -> 觅缘       | 成家币充值弹窗          | `CoinRechargeModal.vue`                         | 成家币充值                         |
| APP-POP-015 | 荐 -> 成家 -> 理想型     | 理想型搜索弹窗          | `IdealTypeSearchModal.vue`                      | 理想型搜索                         |
| APP-POP-016 | 荐 -> 成家 -> 理想型     | 理想型筛选弹窗          | `IdealTypeFilterModal.vue`                      | 理想型筛选                         |
| APP-POP-017 | 荐 -> 成家               | 恋爱小贴士弹窗          | `DatingTipsModal.vue`                           | 成家辅助                           |
| APP-POP-018 | 消息                     | 留言 / 悄悄话消息弹窗   | `NoteMessageModal.vue`                          | 消息                               |
| APP-POP-019 | 我的 -> 商业化           | 充值弹窗                | `RechargeModal.vue`                             | 充值                               |
| APP-POP-020 | 我的 -> 商业化           | 成家币充值弹窗          | `CoinRechargeModal.vue`                         | 成家币充值                         |
| APP-POP-021 | 我的 -> 商业化           | VIP 引导弹窗            | `VipModal.vue`                                  | 会员引导                           |
| APP-POP-022 | 我的 -> 商业化           | 图片锁定覆盖层          | `ImageLockOverlay.vue`                          | 付费/权限                          |
| APP-POP-023 | 表单选择                 | 城市选择器弹窗 / 浮层   | `CitySelector.vue`                              | 城市选择                           |
| APP-POP-024 | 表单选择                 | 年龄范围选择器浮层      | `AgeRangePicker.vue`                            | 年龄选择                           |
| APP-POP-025 | 图片查看                 | 图片宫格预览区          | `ImageGrid.vue`                                 | 图片组件/可触发预览                |
| APP-POP-026 | 分享                     | 分享给好友弹窗          | `Home.vue`、`showShareDialog`                   | 分享                               |
| APP-POP-027 | 测评                     | 测评报告弹窗            | `ReportModal.vue`                               | 按组件名归并，具体用途需以页面为准 |
| APP-POP-028 | 我的 -> 设置             | 退出登录确认弹窗        | `Settings.vue`、`logoutDialog`                  | 设置页底部退出登录触发             |
| APP-POP-029 | 我的 -> 设置 -> 隐私设置 | 账号注销确认底部弹窗    | `PrivacySettings.vue`、`showDeleteAccountModal` | 隐私设置中账号注销触发             |
