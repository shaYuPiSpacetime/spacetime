export const COMMUNITY_COPY_KEYS = {
  genericError: 'generic_error',
  loadFailed: 'load_failed',
  loading: 'loading',
  retry: 'retry',
  emptyFollowingFeed: 'empty_following_feed',
  emptyFollowingUsers: 'empty_following_users',
  emptyCityFeed: 'empty_city_feed',
  emptyFeedDescription: 'empty_feed_description',
  emptyYuemu: 'empty_yuemu',
  emptyYuemuDescription: 'empty_yuemu_description',
  emptySincere: 'empty_sincere',
  emptySincereDescription: 'empty_sincere_description',
  emptyTopics: 'empty_topics',
  emptyTopicPosts: 'empty_topic_posts',
  topicUnavailable: 'topic_unavailable',
  topicDefaultName: 'topic_default_name',
  topicDefaultDescription: 'topic_default_description',
  topicDefaultUser: 'topic_default_user',
  listEnd: 'list_end',
  emptyMyPosts: 'empty_my_posts',
  emptyUserPosts: 'empty_user_posts',
  emptyCommented: 'empty_commented',
  emptyLiked: 'empty_liked',
  emptyUnlocked: 'empty_unlocked',
  emptyInteractionDescription: 'empty_interaction_description',
  emptyHistory: 'empty_history',
  emptyFollowingRelations: 'empty_following_relations',
  emptyFollowerRelations: 'empty_follower_relations',
  emptyPostLikes: 'empty_post_likes',
  emptyPostComments: 'empty_post_comments',
  postCommentsUnavailable: 'post_comments_unavailable',
  postCommentsEmpty: 'post_comments_empty',
  postUnavailable: 'post_unavailable',
  profileUnavailable: 'profile_unavailable',
  reportReasonUnavailable: 'report_reason_unavailable',
  reportSubmitFailed: 'report_submit_failed',
  reportSubmitted: 'report_submitted',
  reportNumberFormat: 'report_number_format',
  blockUnavailable: 'block_unavailable',
  uploadIncomplete: 'upload_incomplete',
  uploadRetry: 'upload_retry',
  uploading: 'uploading',
  publishing: 'publishing',
  publishFailedTitle: 'publish_failed_title',
  publishFailed: 'publish_failed',
  publishRejectedDefault: 'publish_rejected_default',
  publishStatusUnknown: 'publish_status_unknown',
  composeContentRequired: 'compose_content_required',
  videoUnavailable: 'video_unavailable',
  emojiUnavailable: 'emoji_unavailable',
  careerUnavailable: 'career_unavailable',
  editPublishedUnavailable: 'edit_published_unavailable',
  deleteSuccess: 'delete_success',
  profilePendingNickname: 'profile_pending_nickname',
  profilePendingDescription: 'profile_pending_description',
  profileUnknownUser: 'profile_unknown_user',
  cannotFollowSelf: 'cannot_follow_self',
  commentSending: 'comment_sending',
} as const

export type CommunityCopyKey = typeof COMMUNITY_COPY_KEYS[keyof typeof COMMUNITY_COPY_KEYS]

interface CommunityCopyConfig {
  copy?: Record<string, string>
}

const DEFAULT_COMMUNITY_COPY: Record<CommunityCopyKey, string> = {
  generic_error: '操作失败，请稍后重试',
  load_failed: '加载失败，请稍后重试',
  loading: '加载中',
  retry: '重试',
  empty_following_feed: '关注的人还没有发布动态',
  empty_following_users: '还没有关注用户',
  empty_city_feed: '同城暂时没有新动态',
  empty_feed_description: '去其他频道看看更多真实分享吧',
  empty_yuemu: '暂时没有悦目推荐',
  empty_yuemu_description: '完善资料后会获得更合适的推荐',
  empty_sincere: '暂时没有诚意贴',
  empty_sincere_description: '发布一篇真诚的自我介绍吧',
  empty_topics: '暂时没有可用话题',
  empty_topic_posts: '这个话题还没有动态',
  topic_unavailable: '这个话题暂时无法查看',
  topic_default_name: '家园话题',
  topic_default_description: '和有共同话题的人交换真实生活与想法',
  topic_default_user: '社区用户',
  list_end: '已经到底啦',
  empty_my_posts: '你还没有发布动态',
  empty_user_posts: '该用户还没有发布动态',
  empty_commented: '还没有评论过动态',
  empty_liked: '还没有点赞过动态',
  empty_unlocked: '还没有解锁记录',
  empty_interaction_description: '参与社区互动后会记录在这里',
  empty_history: '还没有浏览记录',
  empty_following_relations: '还没有关注的人',
  empty_follower_relations: '还没有粉丝',
  empty_post_likes: '这条动态还没有人点赞',
  empty_post_comments: '这条动态还没有评论',
  post_comments_unavailable: '评论暂时无法查看',
  post_comments_empty: '快来发表第一条评论吧',
  post_unavailable: '这条动态暂时无法查看',
  profile_unavailable: '用户资料暂时无法查看',
  report_reason_unavailable: '举报原因加载失败，请稍后重试',
  report_submit_failed: '举报提交失败，请稍后重试',
  report_submitted: '举报已提交，请等待处理',
  report_number_format: '举报编号：{reportNo}',
  block_unavailable: '暂时无法执行屏蔽操作',
  upload_incomplete: '还有图片未上传完成',
  upload_retry: '重新上传',
  uploading: '图片上传中',
  publishing: '发布中',
  publish_failed_title: '发布失败',
  publish_failed: '内容发布失败，请稍后重试',
  publish_rejected_default: '内容未通过审核，请修改后重试',
  publish_status_unknown: '发布状态未知，请稍后查看',
  compose_content_required: '请输入发布内容',
  video_unavailable: '视频功能暂未开放',
  emoji_unavailable: '表情功能暂未开放',
  career_unavailable: '立业内容暂未开放',
  edit_published_unavailable: '已发布内容暂不支持编辑',
  delete_success: '删除成功',
  profile_pending_nickname: '资料审核中',
  profile_pending_description: '资料通过审核后展示',
  profile_unknown_user: '未知用户',
  cannot_follow_self: '不能关注自己',
  comment_sending: '评论发送中',
}

const KNOWN_COPY_KEYS = new Set<string>(Object.values(COMMUNITY_COPY_KEYS))

export function resolveCommunityCopy(
  config: CommunityCopyConfig | undefined,
  key: CommunityCopyKey | string,
) {
  const configured = safeUserFacingText(config?.copy?.[key])
  if (configured) return configured
  const generic = key === COMMUNITY_COPY_KEYS.genericError
    ? ''
    : safeUserFacingText(config?.copy?.[COMMUNITY_COPY_KEYS.genericError])
  if (generic) return generic
  return DEFAULT_COMMUNITY_COPY[key as CommunityCopyKey] || DEFAULT_COMMUNITY_COPY.generic_error
}

export function resolveCommunityFeedback(
  config: CommunityCopyConfig | undefined,
  key: CommunityCopyKey | string,
  source?: unknown,
) {
  return readCommunityServerMessage(source) || resolveCommunityCopy(config, key)
}

function readCommunityServerMessage(source: unknown) {
  if (source instanceof Error) return safeUserFacingText(source.message)
  if (typeof source === 'string') return safeUserFacingText(source)
  if (!source || typeof source !== 'object') return ''
  const value = source as Record<string, unknown>
  for (const field of ['message', 'statusMessage', 'auditRemark', 'statusName']) {
    const text = safeUserFacingText(value[field])
    if (text) return text
  }
  return ''
}

function safeUserFacingText(value: unknown) {
  const text = typeof value === 'string' ? value.trim() : ''
  if (!text) return ''
  if (/community\.copy\.[a-z0-9_.-]+/i.test(text) || KNOWN_COPY_KEYS.has(text)) return ''
  return text
}
