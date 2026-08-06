/* eslint-env node */
/* eslint-disable @typescript-eslint/no-var-requires */
const http = require('node:http')

function success(data) {
  return { code: 200, msg: 'success', data }
}

function page(records, current, total, hasMore) {
  return { records, current, size: 20, total, pages: hasMore ? current + 1 : current, hasMore }
}

function createRelationFeedbackMockServer(port) {
  const state = {
    likesMode: 'ready',
    visitorsMode: 'ready',
    unlocked: false,
    matchPopup: null,
    failMatchAckOnce: false,
    requests: [],
  }

  const server = http.createServer(async (request, response) => {
    const url = new URL(request.url, `http://127.0.0.1:${port}`)
    const pathname = url.pathname.replace(/^\/api/, '')
    const chunks = []
    for await (const chunk of request) chunks.push(chunk)
    const rawBody = Buffer.concat(chunks).toString('utf8')
    let body
    try {
      body = rawBody ? JSON.parse(rawBody) : undefined
    } catch {
      body = rawBody
    }
    state.requests.push({ method: request.method, pathname, query: Object.fromEntries(url.searchParams), body, at: Date.now() })

    let payload
    if (pathname === '/miniapp/profile/access-status') {
      payload = success({ canBrowseCards: true, canMatch: true, canMessage: true, canCommunity: true, canBeExposed: true, coreAccessStatus: 'OPEN', blockReasons: [] })
    } else if (pathname === '/miniapp/relation/likes-me' && request.method === 'GET') {
      if (state.likesMode === 'error') {
        payload = { code: 5201, msg: '喜欢列表模拟失败', data: null }
      } else if (state.likesMode === 'empty') {
        payload = success({ ...page([], 1, 0, false), newCount: 0, visibleTotal: 0, hiddenCount: 0, readCursor: null, newLikePreviewAvatars: [], accessMode: 'MIXED' })
      } else if (url.searchParams.get('page') === '2') {
        payload = success({ ...page([{ recordNo: 'LIK-OLDER', userId: 103, displayStatus: 'clear', nickname: '晚风', avatar: null, age: 28, sourceScene: 'profile', isNew: false, groupKey: 'earlier_unlocked', likedTime: '2026-08-03 09:00:00', onlineText: '1小时前在线', weakTags: [] }], 2, 3, false), newCount: 2, visibleTotal: 3, hiddenCount: 1, readCursor: 'read-cursor-1', newLikePreviewAvatars: [], accessMode: 'MIXED' })
      } else {
        const blurStatus = state.unlocked ? 'clear' : 'blur'
        payload = success({
          ...page([
            { recordNo: 'LIK-CLEAR', userId: 101, displayStatus: 'clear', nickname: '清风', avatar: null, age: 27, sourceScene: 'featured', isNew: true, groupKey: 'new', likedTime: '2026-08-04 09:10:00', onlineText: '在线', weakTags: ['同城'] },
            { recordNo: 'LIK-BLUR', userId: 102, displayStatus: blurStatus, nickname: state.unlocked ? '山岚' : '不可泄露昵称', avatar: null, age: state.unlocked ? 29 : null, sourceScene: 'profile', isNew: true, groupKey: 'new', likedTime: '2026-08-04 09:00:00', onlineText: '刚刚在线', weakTags: ['研究生', '同城'] },
          ], 1, 3, true),
          newCount: 2,
          visibleTotal: 3,
          hiddenCount: state.unlocked ? 0 : 1,
          readCursor: 'read-cursor-1',
          newLikePreviewAvatars: [
            { recordNo: 'LIK-CLEAR', displayStatus: 'clear', avatar: null, onlineStatus: 'online' },
            { recordNo: 'LIK-BLUR', displayStatus: blurStatus, avatar: null, onlineStatus: 'online' },
          ],
          accessMode: 'MIXED',
        })
      }
    } else if (pathname === '/miniapp/relation/likes-me/read' && request.method === 'POST') {
      payload = success(null)
    } else if (pathname === '/miniapp/relation/recent-viewers' && request.method === 'GET') {
      if (state.visitorsMode === 'error') {
        payload = { code: 5202, msg: '访客列表模拟失败', data: null }
      } else if (state.visitorsMode === 'empty') {
        payload = success({
          ...page([], 1, 0, false),
          visibleTotal: 0,
          hiddenCount: 0,
          accessMode: 'MIXED',
          visibleDays: 7,
          totalPv: 0,
          visitorUv7d: 0,
          visitorPv7d: 0,
          todayVisitorUv: 0,
          todayVisitPv: 0,
        })
      } else payload = success({
        ...page([
          { recordNo: 'VIS-TODAY', userId: 201, displayStatus: 'clear', nickname: '星河', avatar: null, age: 26, groupKey: 'today', visitCount: 2, lastVisitTime: '2026-08-04 10:00:00', onlineText: '10分钟前在线', weakTags: [] },
          { recordNo: 'VIS-YESTERDAY', userId: 202, displayStatus: 'blur', nickname: '不可泄露昵称', avatar: null, age: null, groupKey: 'yesterday', visitCount: 1, lastVisitTime: '2026-08-03 19:00:00', onlineText: '昨天来访', weakTags: ['本科', '杭州'] },
          { recordNo: 'VIS-EARLIER', userId: 203, displayStatus: 'blur', nickname: '不可泄露昵称', avatar: null, age: null, groupKey: 'recent7d', visitCount: 3, lastVisitTime: '2026-08-01 12:00:00', onlineText: '3天前来访', weakTags: ['体制内'] },
        ], 1, 3, false),
        visibleTotal: 3,
        hiddenCount: 2,
        accessMode: 'MIXED',
        visibleDays: 7,
        totalPv: 6,
        visitorUv7d: 3,
        visitorPv7d: 6,
        todayVisitorUv: 1,
        todayVisitPv: 2,
      })
    } else if (pathname === '/miniapp/relation/mutual-matches' && request.method === 'GET') {
      const current = Number(url.searchParams.get('page') || 1)
      const record = current === 1
        ? { matchNo: 'MAT-101', userId: 101, nickname: '清风', avatar: null, age: 27, height: 168, currentCity: '杭州', hometownCity: '郑州', canEnterConversation: true }
        : { matchNo: 'MAT-102', userId: 102, nickname: '山岚', avatar: null, age: 29, height: 172, currentCity: '杭州', hometownCity: '南京', canEnterConversation: true }
      payload = success(page([record], current, 2, current === 1))
    } else if (pathname === '/miniapp/relation/match-popup/pending' && request.method === 'GET') {
      payload = success(state.matchPopup)
    } else if (/^\/miniapp\/relation\/match-popup\/[^/]+\/read$/.test(pathname) && request.method === 'POST') {
      if (state.failMatchAckOnce) {
        state.failMatchAckOnce = false
        payload = { code: 5202, msg: '匹配回执模拟失败', data: null }
      } else {
        payload = success(null)
      }
    } else if (pathname === '/miniapp/asset/unlock/quote' && request.method === 'POST') {
      payload = success({ quoteToken: 'quote-token-1', scene: body.scene, targetBizType: body.targetBizType, targetBizNo: body.targetBizNo, targetUserId: 102, unitPrice: 88, coinBalance: 200, alreadyUnlocked: state.unlocked, expireAt: '2026-08-04 18:00:00' })
    } else if (pathname === '/miniapp/asset/unlock/confirm' && request.method === 'POST') {
      state.unlocked = true
      payload = success({ unlockNo: 'UNL-1', targetBizType: 'like', targetBizNo: 'LIK-BLUR', targetUserId: 102, status: 'effective', coinCost: 88, coinBalance: 112, displayStatus: 'clear', charged: true, effectiveTime: '2026-08-04 17:00:00' })
    } else if (/^\/miniapp\/profile\/public\/\d+$/.test(pathname) && request.method === 'GET') {
      const userId = Number(pathname.split('/').pop())
      payload = success({ userId, nickname: userId === 102 ? '山岚' : '清风', avatar: null, heroPhoto: null, photos: [], gender: 'FEMALE', age: 29, height: 166, zodiac: '双鱼座', currentCity: '杭州', hometownCity: '郑州', school: '浙江大学', identityLabel: '职场人', industryLabel: '互联网', occupationLabel: '产品经理', company: '科技公司', annualIncomeLabel: '30W+', tags: ['真诚沟通', '喜欢旅行', '周末徒步'], introduction: '认真生活，也认真期待一段稳定的关系。', liked: true, matched: true, matchNo: 'MAT-101', canEnterConversation: true })
    } else if (pathname === '/miniapp/relation/visits' && request.method === 'POST') {
      payload = success({ visitNo: 'VISIT-1', deduplicated: false, visitCount: 1, recordedTime: '2026-08-04 17:00:00' })
    } else if (pathname === '/miniapp/community/meta' && request.method === 'GET') {
      payload = success({ postMaxImages: 9, postMaxTextLength: 1000, reportEntryEnabled: true, topics: [], reportReasons: [{ code: 'spam', label: '垃圾内容' }], homeTabs: [], copies: { generic_error: '操作失败', empty_user_posts: '还没有发布动态', report_submitted: '举报已提交', block_unavailable: '拉黑功能暂不可用' } })
    } else if (/^\/miniapp\/community\/users\/\d+\/posts$/.test(pathname) && request.method === 'GET') {
      payload = success(page([], 1, 0, false))
    } else if (pathname === '/miniapp/relation/likes' && request.method === 'POST') {
      payload = success({ likeNo: 'LIKE-1', likeStatus: 'active', matched: true, matchNo: 'MAT-101', matchStatus: 'active', canEnterConversation: true })
    } else if (/^\/miniapp\/relation\/likes\/\d+$/.test(pathname) && request.method === 'DELETE') {
      payload = success({ likeStatus: 'cancelled', matched: true, matchNo: 'MAT-101', matchStatus: 'active', canEnterConversation: true })
    } else if (pathname === '/miniapp/config/prd01' || pathname === '/miniapp/dict/profile-options') {
      payload = { code: 5200, msg: '自动化不加载非关系模块配置', data: null }
    } else {
      payload = { code: 404, msg: `未模拟接口：${request.method} ${pathname}`, data: null }
    }

    response.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8', 'Access-Control-Allow-Origin': '*' })
    response.end(JSON.stringify(payload))
  })

  return {
    state,
    start: () => new Promise(resolve => server.listen(port, '127.0.0.1', resolve)),
    close: () => new Promise((resolve, reject) => server.close(error => error ? reject(error) : resolve())),
  }
}

module.exports = { createRelationFeedbackMockServer }
