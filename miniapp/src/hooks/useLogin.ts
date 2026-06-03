import { create } from 'zustand'
import Taro from '@tarojs/taro'
import { useAuthStore } from '@/stores/authStore'
import type { LoginStep, LoginUserInfo } from '@/types/login'

// ==================== Mock 数据 ====================

/** 学历选项列表（Mock） */
const EDUCATION_OPTIONS: string[] = [
  '博士',
  '硕士',
  '本科',
  '大专',
  '高中/中专',
  '初中及以下',
]

/** 年龄范围 */
const AGE_RANGE = { min: 18, max: 60 }

/** 省份城市映射（Mock 数据） */
const PROVINCE_CITY_MAP: Record<string, string[]> = {
  北京市: ['东城区', '西城区', '朝阳区', '海淀区', '丰台区', '通州区', '大兴区'],
  上海市: ['黄浦区', '徐汇区', '长宁区', '静安区', '浦东新区', '闵行区', '宝山区'],
  广东省: ['广州市', '深圳市', '珠海市', '东莞市', '佛山市', '中山市', '惠州市'],
  浙江省: ['杭州市', '宁波市', '温州市', '嘉兴市', '绍兴市', '金华市', '台州市'],
  江苏省: ['南京市', '苏州市', '无锡市', '常州市', '南通市', '扬州市', '徐州市'],
  四川省: ['成都市', '绵阳市', '德阳市', '宜宾市', '南充市', '泸州市', '乐山市'],
  湖北省: ['武汉市', '宜昌市', '襄阳市', '荆州市', '黄冈市', '十堰市', '孝感市'],
  湖南省: ['长沙市', '株洲市', '湘潭市', '衡阳市', '岳阳市', '常德市', '郴州市'],
  山东省: ['济南市', '青岛市', '烟台市', '潍坊市', '临沂市', '淄博市', '济宁市'],
  福建省: ['福州市', '厦门市', '泉州市', '漳州市', '莆田市', '龙岩市', '三明市'],
}

// ==================== 登录流程状态 Store ====================

interface LoginFlowState {
  /** 当前步骤 */
  step: LoginStep
  /** 用户填写的信息 */
  userInfo: LoginUserInfo
  /** 设置当前步骤 */
  setStep: (step: LoginStep) => void
  /** 更新用户信息（合并） */
  updateUserInfo: (info: Partial<LoginUserInfo>) => void
  /** 重置登录流程 */
  reset: () => void
}

/**
 * 登录流程共享状态 Store
 * 跨页面共享，各步骤页面通过 useLogin hook 读写
 */
const useLoginFlowStore = create<LoginFlowState>((set) => ({
  step: 'auth',
  userInfo: {},
  setStep: (step) => set({ step }),
  updateUserInfo: (info) =>
    set((state) => ({ userInfo: { ...state.userInfo, ...info } })),
  reset: () => set({ step: 'auth', userInfo: {} }),
}))


// ==================== Hook ====================

/**
 * 登录流程 Hook
 * 提供跨页面的登录状态管理、步骤导航、选项数据、Mock 提交
 */
export function useLogin() {
  const { step, userInfo, setStep, updateUserInfo, reset } = useLoginFlowStore()
  const { setLogin } = useAuthStore()

  /**
   * 获取指定省份的城市列表
   * @param province 省份名称
   * @returns 城市名称数组
   */
  const getCities = (province: string): string[] => {
    return PROVINCE_CITY_MAP[province] || []
  }

  /**
   * 提交登录（Mock）
   * 模拟后端登录 → 写入 authStore → 跳转首页
   */
  const submit = async (): Promise<void> => {
    try {
      // Mock 登录数据
      const mockToken = 'mock_token_' + Date.now()
      const mockUserId = 1001
      const mockNickname = userInfo.nickname || '成家用户'
      const mockAvatar =
        userInfo.avatar ||
        'https://img.zcool.cn/community/01460b5e0f0e64a80121985c3f3e1e.png'

      // 写入认证状态
      setLogin(mockToken, mockUserId, mockNickname, mockAvatar)

      // 重置登录流程状态
      reset()

      Taro.showToast({ title: '登录成功', icon: 'success', duration: 1500 })

      // 延迟跳转首页
      setTimeout(() => {
        Taro.switchTab({ url: '/pages/index/index' })
      }, 1500)
    } catch {
      Taro.showToast({ title: '登录失败，请重试', icon: 'none' })
    }
  }

  return {
    /** 当前步骤 */
    step,
    /** 用户已填写的信息 */
    userInfo,
    /** 学历选项列表 */
    educationOptions: EDUCATION_OPTIONS,
    /** 年龄范围 { min: 18, max: 60 } */
    ageRange: AGE_RANGE,
    /** 省份名称列表 */
    provinces: Object.keys(PROVINCE_CITY_MAP),
    /** 根据省份获取城市列表 */
    getCities,
    /** 更新用户信息（合并写入） */
    updateUserInfo,
    /** 提交登录（Mock，成功后跳转首页） */
    submit,
    /** 设置当前步骤 */
    setStep,
    /** 重置登录流程状态 */
    reset,
  }
}
