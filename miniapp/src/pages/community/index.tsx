import { useState } from 'react'
import { View, Text } from '@tarojs/components'
import CustomNavBar from '@/components/CustomNavBar'

/** 社区动态 Mock 数据 */
interface CommunityPost {
  id: number
  nickname: string
  avatar: string
  time: string
  content: string
  images: string[]
  likeCount: number
  commentCount: number
  isLiked: boolean
}

const MOCK_POSTS: CommunityPost[] = [
  {
    id: 1,
    nickname: '小甜心',
    avatar: '😊',
    time: '3分钟前',
    content: '今天在校园里遇到一个超可爱的猫咪，忍不住拍了几张！有没有猫友一起交流呀～',
    images: ['🐱', '🌸'],
    likeCount: 23,
    commentCount: 5,
    isLiked: false,
  },
  {
    id: 2,
    nickname: '阳光男孩',
    avatar: '🌞',
    time: '28分钟前',
    content: '推荐一家学校附近的甜品店，抹茶千层超好吃！周末约起来～',
    images: ['🍰', '🍵', '✨'],
    likeCount: 47,
    commentCount: 12,
    isLiked: true,
  },
  {
    id: 3,
    nickname: '文艺青年',
    avatar: '📖',
    time: '1小时前',
    content: '刚看完《百年孤独》，感触很深。人生就是一场孤独的旅行，但旅途中总会遇到懂你的人。',
    images: [],
    likeCount: 89,
    commentCount: 31,
    isLiked: false,
  },
  {
    id: 4,
    nickname: '运动达人',
    avatar: '🏃',
    time: '2小时前',
    content: '今早跑了5公里，配速4分30！坚持晨跑的第100天，身体状态越来越好了💪',
    images: ['🏅', '🌅'],
    likeCount: 156,
    commentCount: 43,
    isLiked: false,
  },
  {
    id: 5,
    nickname: '音乐精灵',
    avatar: '🎵',
    time: '3小时前',
    content: '分享一首最近单曲循环的歌《晴天》，每次听都像回到了高中时代。你们最近在听什么歌？',
    images: [],
    likeCount: 67,
    commentCount: 18,
    isLiked: true,
  },
]

/**
 * 社区动态页面
 * 展示动态列表，每条动态包含头像、昵称、时间、内容、图片、点赞/评论数
 */
export default function CommunityPage() {
  // 1. 状态管理
  const [posts, setPosts] = useState<CommunityPost[]>(MOCK_POSTS)

  // 2. 事件处理：点赞切换
  const handleToggleLike = (postId: number) => {
    setPosts((prev) =>
      prev.map((post) => {
        if (post.id !== postId) return post
        return {
          ...post,
          isLiked: !post.isLiked,
          likeCount: post.isLiked ? post.likeCount - 1 : post.likeCount + 1,
        }
      }),
    )
  }

  // 3. 空状态
  if (posts.length === 0) {
    return (
      <View className="min-h-screen bg-gray-50 flex flex-col items-center justify-center">
        <CustomNavBar bgColor="transparent" />
        <Text className="text-4xl mb-4">📭</Text>
        <Text className="text-sm text-gray-400">暂无动态，快去发布第一条吧</Text>
      </View>
    )
  }

  // 4. 渲染动态列表
  return (
    <View className="min-h-screen bg-gray-50">
      <CustomNavBar bgColor="transparent" />
      <View className="pt-2 pb-4">
        {posts.map((post) => (
          <View
            key={post.id}
            className="mx-3 mt-3 bg-white rounded-card px-4 py-4"
          >
            {/* 头部：头像 + 昵称 + 时间 */}
            <View className="flex items-center">
              <View className="w-12 h-12 bg-brand-blue-bg rounded-full flex items-center justify-center">
                <Text className="text-xl">{post.avatar}</Text>
              </View>
              <View className="ml-3 flex-1">
                <Text className="text-sm font-medium text-text-dark">
                  {post.nickname}
                </Text>
                <Text className="text-xs text-gray-400 mt-1">{post.time}</Text>
              </View>
            </View>

            {/* 内容文字 */}
            <View className="mt-3">
              <Text className="text-sm text-gray-700 leading-relaxed">
                {post.content}
              </Text>
            </View>

            {/* 图片区域（用 emoji 占位） */}
            {post.images.length > 0 && (
              <View className="mt-3 flex flex-wrap gap-2">
                {post.images.map((img, idx) => (
                  <View
                    key={idx}
                    className="w-20 h-20 bg-gray-100 rounded-lg flex items-center justify-center"
                  >
                    <Text className="text-2xl">{img}</Text>
                  </View>
                ))}
              </View>
            )}

            {/* 底部：点赞 + 评论 */}
            <View className="mt-4 flex items-center gap-6">
              <View
                className="flex items-center gap-1"
                onClick={() => handleToggleLike(post.id)}
              >
                <Text className="text-sm">
                  {post.isLiked ? '❤️' : '🤍'}
                </Text>
                <Text
                  className={`text-xs ${post.isLiked ? 'text-primary' : 'text-gray-400'}`}
                >
                  {post.likeCount}
                </Text>
              </View>
              <View className="flex items-center gap-1">
                <Text className="text-sm">💬</Text>
                <Text className="text-xs text-gray-400">{post.commentCount}</Text>
              </View>
            </View>
          </View>
        ))}

        {/* 底部提示 */}
        <View className="flex items-center justify-center py-6">
          <Text className="text-xs text-gray-300">没有更多了</Text>
        </View>
      </View>
    </View>
  )
}
