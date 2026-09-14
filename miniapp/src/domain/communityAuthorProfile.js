export function resolveCommunityAuthorProfileRoute(authorId, currentUserId) {
  const targetId = Number(authorId || 0)
  const ownerId = Number(currentUserId || 0)
  if (targetId > 0 && ownerId > 0 && targetId === ownerId) {
    return '/pages/profile/edit?variant=preview'
  }
  return `/pages/heart/user?targetUserId=${targetId}&sourceScene=profile`
}

export function openCommunityAuthorProfile(authorId, currentUserId, navigateTo) {
  return navigateTo({ url: resolveCommunityAuthorProfileRoute(authorId, currentUserId) })
}
