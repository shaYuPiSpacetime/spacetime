读08-推荐与理想型条件筛选小程序先读设计稿，看生成设计描述文件，然后再读取设计描述文件生成页面，严格 1:1 还原
蓝湖推荐分组所有的 ui 稿 https://lanhuapp.com/web/#/item/project/stage?pid=d9c9e50f-fee5-47ca-bd6b-ae05c0d5332b&image_id=b7c6a008-f0ae-4a29-a320-87e0abf4d9fc&tid=428e8368-c279-4369-947b-a5828487924d
然后打通后台，ui 数据传至数据库实现动态化。达到整体闭环
用户主页和主页预览是共用的,免费开聊到私信，没解锁之前都是悄悄话，解锁后就是私信
商业化配置新增折扣比例，解锁全部按折扣来计算

和demo/08-推荐与理想型条件筛选/html/admin.html，管理后台实现闭环，
完成未处理 https://docs.qq.com/sheet/DVWNidG1xaWhIenBu?tab=BB08J2 达到闭环

UPDATE app_user
SET first_login_completed = 0,提交代码,push 代码，发布小程序
    first_login_next_step = 1
WHERE phone = '17366629764'; 重置
波：04、05、06、08
uploadFile 合法域名中 https://shikongxiehou.oss-cn-shanghai.aliyuncs.com


读/Users/bobo/IdeaProjects/shayupi/spacetime/docs/静态Demo/06-认证与安全设置、我的页与搜索 实现管理后台和后台能力，对接小程序实现闭环，
新增的菜单需要和 demo 保持一致。sql 改动直接执行。闭环后我看效果

https://lanhuapp.com/web/#/item/project/stage?tid=428e8368-c279-4369-947b-a5828487924d&pid=d9c9e50f-fee5-47ca-bd6b-ae05c0d5332b  未认证点立即完善应该是到认证-基本资料，任何认证-添加头像，认证-自我介绍，认证-三重认证。 现在是直接到三重认证了，且样式不对，中间有进度条的要对应上。返回时如果填了基本资料，要回到 未认证-填完部分资料。根据认证情况打勾，效果要和 ui 稿一致。实现闭环，不要自我发挥样式。要一致，达到闭环

所有枚举都是字典配置，不要偷懒写死，细节流程都打磨好，流程都是连贯通的，  文案提示也是哦，不是写死的哦，都是动态配置的，你需要取接口里面的，不能写死哦


1:1 蓝湖 mcp 还原 https://lanhuapp.com/web/#/item/project/stage?pid=d9c9e50f-fee5-47ca-bd6b-ae05c0d5332b&image_id=e3ab4fcf-8f3a-44da-b997-e86d13a295fc  消息 15 个页面 这一次全 mock，并梳理出需要的接口。生成文档，后面接口好了，引用文档达到闭环
注意切图，要完美的还原。落地。一模一样

1、现在我们来开始编写PRD-04的技术文档；
2、自查技术方案是否有问题，排查是否依赖其他PRD地方，忽略或者引用；
3、基于PRD+技术方案编写测试用例；
4、自查测试用例；
5、开始编码：5.1-根据PRD+技术方案+测试用例拆分代码编写任务；5.2-边开发边派生测试脚本
后端至少 L1 cURL + L3 Service 单测；后台页面完成后再补 L4 Playwright。
6、直接询问代码是否都已完成；查看未完成的部分自行决定如何处理
7、根据测试用例进行测试，L4 Playwright需安装（AI装就完事了）测试完成会有测试报告，自己看测试报告以及还需自行测试的部分

/opsx:propose

1、现在我们来开始编写PRD-05的技术文档；
2、自查技术方案是否有问题，排查是否依赖其他PRD地方，忽略或者引用；
3、基于PRD+技术方案编写测试用例；
4、自查测试用例；
5、开始编码：5.1-根据PRD+技术方案+测试用例拆分代码编写任务；5.2-边开发边派生测试脚本
后端至少 L1 cURL + L3 Service 单测；后台页面完成后再补 L4 Playwright。
6、直接询问代码是否都已完成；查看未完成的部分自行决定如何处理
7、根据测试用例进行测试，L4 Playwright需安装（AI装就完事了）测试完成会有测试报告，自己看测试报告以及还需自行测试的部分

8、完善miniapp-api.md

https://lanhuapp.com/link/#/invite?sid=lXB9eRla

蓝湖链接：https://lanhuapp.com/link/#/invite?sid=lXW7rf47

根据https://lanhuapp.com/web/#/item/project/stage?pid=00cf551c-26f6-49e5-82db-1dc6fda9ca3a
mcp1:1还原小程序蓝湖ui稿,在miniapp中。用其他模型跑起来一塌糊涂，字体都太大了。需要 1:1 还原

npm run build:h5 -- --watch

启动管理后台和后台项目

figma https://www.figma.com/design/BqQhSLVSvuLYrZsgVlKmkU/%E6%88%90%E5%AE%B6%E7%AB%8B%E4%B8%9A?t=NH6dggfURmTA3PuA-1


蓝湖 1:1 还原推荐朋友,认证所有页面，注意页面要分模块，按规范还原，背景图要一致，所有的都要一模一样，并更新文档

添加头像,裁剪不可用，点击下一步报错
Error: MiniProgramError
{"errMsg":"navigateTo:fail webview count limit exceed"}
杜绝这个问题，更新文档

1、认证添加头像，ui 还原不对。头像右侧应该是三行展示的，并带有切图。本人照片，能看清头像，展示完美的你，现在都挤在一起了，
2、自我介绍填写完应该到三重认证了，而不是到首页，

2、地址输入完后，应该跳转到成家-未认证页面

点击实名认证和学历认证都是有的，不应该是建设中，1:1 还原 ui 稿，按规范还原，背景图要一致，所有的都要一模一样，并更新文档

推荐,觅知音,悦目,诚意贴,诚意贴发布，蓝湖ui 稿，1:1还原，注意切图，把图切到本地，进行引入
，背景图要一致，所有的都要一模一样，并更新文档

底部 icon 切换,有明显抖动的感觉，消息切到我的。切换完后，icon图标竟然丢失了

miniapp-api-requirements.md 文档感觉不对,继续更新文档,可以参考蓝湖 ui 图或本地已经存的图，
保障流程能通