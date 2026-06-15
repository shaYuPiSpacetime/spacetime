export default {
  lazyCodeLoading: 'requiredComponents',
  pages: [
    'pages/profile/index',
    'pages/community/index',
    'pages/chat/index',
    'pages/index/index',
    'pages/recommend/index',
    'pages/recommend/post',
    'pages/profile/edit'
  ],
  subPackages: [
    {
      root: 'pages/login',
      pages: [
        'index',
        'gender',
        'education',
        'address',
        'age'
      ]
    },
    {
      root: 'pages/verification',
      pages: [
        'triple',
        'basic',
        'height-weight',
        'hometown',
        'career',
        'income',
        'avatar',
        'avatar-album',
        'avatar-crop',
        'avatar-review',
        'intro',
        'intro-edit',
        'real-name',
        'education-student',
        'education-mainland',
        'education-chsi-help',
        'education-diploma-no',
        'education-certificate-upload'
      ]
    },
    {
      root: 'pages/featured',
      pages: [
        'index'
      ]
    },
    {
      root: 'pages/membership',
      pages: [
        'index',
        'records'
      ]
    },
    {
      root: 'pages/coins',
      pages: [
        'index',
        'detail'
      ]
    },
    {
      root: 'pages/assessment',
      pages: [
        'index'
      ]
    }
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
        selectedIconPath: 'assets/icons/tab-home.png'
      },
      {
        pagePath: 'pages/community/index',
        text: '立业',
        iconPath: 'assets/icons/tab-work.png',
        selectedIconPath: 'assets/icons/tab-work.png'
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
        iconPath: 'assets/icons/tab-message.png',
        selectedIconPath: 'assets/icons/tab-message.png'
      },
      {
        pagePath: 'pages/profile/index',
        text: '我的',
        iconPath: 'assets/icons/tab-profile-active.png',
        selectedIconPath: 'assets/icons/tab-profile-active.png'
      }
    ]
  }
}
