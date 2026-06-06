export default {
  pages: [
    'pages/login/index',
    'pages/community/index',
    'pages/assessment/index',
    'pages/chat/index',
    'pages/profile/index',
    'pages/index/index',
    'pages/recommend/index',
    'pages/recommend/post',
    'pages/profile/edit',
    'pages/featured/index',
    'pages/membership/index',
    'pages/membership/records',
    'pages/coins/index',
    'pages/coins/detail',
    'pages/login/gender',
    'pages/login/education',
    'pages/login/address',
    'pages/login/age',
    'pages/verification/basic',
    'pages/verification/height-weight',
    'pages/verification/hometown',
    'pages/verification/career',
    'pages/verification/income',
    'pages/verification/avatar',
    'pages/verification/avatar-album',
    'pages/verification/avatar-crop',
    'pages/verification/avatar-review',
    'pages/verification/intro',
    'pages/verification/intro-edit'
  ],
  window: {
    backgroundTextStyle: 'light',
    navigationBarBackgroundColor: '#ffffff',
    navigationBarTitleText: '成家立业',
    navigationBarTextStyle: 'black'
  },
  tabBar: {
    custom: true,
    color: '#999999',
    selectedColor: '#2876FF',
    backgroundColor: '#ffffff',
    borderStyle: 'white',
    list: [
      {
        pagePath: 'pages/index/index',
        text: '成家',
        iconPath: 'assets/icons/tab-home.png',
        selectedIconPath: 'assets/icons/tab-home-active.png'
      },
      {
        pagePath: 'pages/community/index',
        text: '立业',
        iconPath: 'assets/icons/tab-community.png',
        selectedIconPath: 'assets/icons/tab-community-active.png'
      },
      {
        pagePath: 'pages/recommend/index',
        text: '推荐',
        iconPath: 'assets/icons/tab-recommend.png',
        selectedIconPath: 'assets/icons/tab-recommend.png'
      },
      {
        pagePath: 'pages/chat/index',
        text: '消息',
        iconPath: 'assets/icons/tab-chat.png',
        selectedIconPath: 'assets/icons/tab-chat-active.png'
      },
      {
        pagePath: 'pages/profile/index',
        text: '我的',
        iconPath: 'assets/icons/tab-profile.png',
        selectedIconPath: 'assets/icons/tab-profile-active.png'
      }
    ]
  }
}
