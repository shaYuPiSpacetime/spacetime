(function () {
  const data = window.PRD05_DEMO_DATA || {};
  const common = window.DemoCommon || {};
  const qs = common.qs || ((selector, root = document) => root.querySelector(selector));
  const qsa = common.qsa || ((selector, root = document) => Array.from(root.querySelectorAll(selector)));
  const escapeHtml = common.escapeHtml || ((value) => String(value ?? ''));
  const statusClass = common.statusClass || (() => 'brand');
  const showToast = common.showToast || ((message) => window.alert(message));
  const openModal = common.openModal || (() => {});
  const openDrawer = common.openDrawer || (() => {});

  const state = {
    feedTab: '关注',
    detailPostId: data.posts?.[0]?.id,
    publishType: 'community_post',
    selectedTopic: data.topics?.[0]?.name || '',
    publishImages: (data.uploadSamples || []).slice(0, 2).map((label) => ({ label, uploadStatus: 'success' })),
    draft: data.publishDraft || null,
    hiddenAuthor: null,
    followingAuthor: null,
    topicSort: '热门',
    commentSort: 'latest',
    sincereSort: '热门',
    userPostView: 'owner',
    interactionEstablished: false,
    greetingTemplate: data.greetingTemplates?.[0] || '',
    replyTo: null,
    moreTargetType: 'post',
    moreTargetPostId: data.posts?.[0]?.id,
    reportTargetType: 'post',
    reportTargetId: data.posts?.[0]?.id || 'P-240701',
    reportSubmissions: new Set(),
    previewImage: null,
    yuemuLimit: 2,
    yuemuLiked: new Set(),
    historyType: 'commented',
    relationType: 'following',
    interactorType: 'liked'
  };

  function tag(text, tone = '') {
    return `<span class="tag ${tone}">${escapeHtml(text)}</span>`;
  }

  function commentStatusLabel(status) {
    const map = {
      published: '已公开',
      pending_machine: '机审中',
      pending_manual: '待人工复核',
      blocked: '已屏蔽',
      rejected: '已驳回'
    };
    return map[status] || status || '-';
  }

  function commentStatusTone(status) {
    if (status === 'blocked' || status === 'rejected') return 'danger';
    if (status === 'pending_machine' || status === 'pending_manual') return 'warning';
    return 'success';
  }

  function isImageSource(value) {
    return /^(data:image|https?:|\.{0,2}\/|\/)/.test(String(value || ''));
  }

  function avatar(source, soft = false, alt = '用户上传头像') {
    if (isImageSource(source)) {
      return `<img class="avatar avatar-img ${soft ? 'soft' : ''}" src="${escapeHtml(source)}" alt="${escapeHtml(alt)}">`;
    }
    return `<span class="avatar avatar-default ${soft ? 'soft' : ''}" role="img" aria-label="${escapeHtml(alt)}"></span>`;
  }

  function topicCover(topic, className = 'topic-thumb') {
    const src = topic?.cover;
    if (isImageSource(src)) {
      return `<span class="${className}" style="background-image:url('${escapeHtml(src)}')" role="img" aria-label="${escapeHtml(topic.name)}封面"></span>`;
    }
    return `<span class="${className} topic-thumb-default" role="img" aria-label="${escapeHtml(topic?.name || '话题')}默认封面"></span>`;
  }

  function imageTile(item, index = 0, options = {}) {
    const label = typeof item === 'string' ? item : item?.label || '图片';
    const style = options.ratio ? ` style="aspect-ratio:${Number(options.width) || 1}/${Number(options.height) || 1}"` : '';
    const attrs = [
      'type="button"',
      options.preview ? `data-open-preview="${escapeHtml(label)}"` : '',
      options.postId ? `data-preview-post="${escapeHtml(options.postId)}"` : '',
      options.toast ? `data-toast="${escapeHtml(options.toast)}"` : ''
    ].filter(Boolean).join(' ');
    return `<button class="image-tile image-tile-${(index % 4) + 1}" ${attrs}${style}><span>${escapeHtml(label)}</span></button>`;
  }

  function sceneTabs(active = '成家') {
    return `
      <div class="qianxun-scenes" aria-label="千寻场景">
        <button class="${active === '成家' ? 'is-active' : ''}" data-jump="#APP-05-PAGE-community-hot">成家</button>
        <button class="${active === '知音' ? 'is-active' : ''}" data-jump="#APP-05-PAGE-yuemu">知音</button>
      </div>
    `;
  }

  function bottomNav() {
    return `
      <nav class="mobile-bottom-nav" aria-label="一期主导航">
        <button class="is-active" type="button" data-jump="#APP-05-PAGE-community-following">千寻</button>
        <button type="button" data-toast="心动由 PRD-02 承接">心动</button>
        <button type="button" data-toast="荐由 PRD-01 承接">荐</button>
        <button type="button" data-toast="消息由 PRD-03 承接">消息</button>
        <button type="button" data-toast="我的由 PRD-04 承接">我的</button>
      </nav>
    `;
  }

  function followedUsers() {
    const seen = new Set();
    return (data.posts || []).filter((post) => post.followed).reduce((users, post) => {
      if (seen.has(post.author)) return users;
      seen.add(post.author);
      users.push(post);
      return users;
    }, []);
  }

  function renderFollowingList() {
    qsa('[data-render="following-list"]').forEach((target) => {
      const users = followedUsers();
      target.innerHTML = `
        <section class="following-list-card" aria-label="我的关注列表">
          <div class="following-list-head">
            <div>
              <strong>我的关注列表</strong>
              <span>${users.length} 位已关注</span>
            </div>
            <button type="button" data-following-all class="${state.followingAuthor ? '' : 'is-active'}">全部</button>
          </div>
          <div class="following-users">
            ${users.map((user) => `
              <button type="button" class="following-user ${state.followingAuthor === user.author ? 'is-active' : ''}" data-focus-author="${escapeHtml(user.author)}">
                ${avatar(user.avatar, true, `${user.author}上传头像`)}
                <span>
                  <strong>${escapeHtml(user.author)}</strong>
                  <em>${escapeHtml(user.activeText || user.time)}</em>
                </span>
              </button>
            `).join('') || '<div class="notice">暂无关注对象，去热门页看看</div>'}
          </div>
        </section>
      `;
    });
  }

  function postCard(post, compact = false) {
    const isSincere = post.type === 'sincere_post';
    const title = isSincere ? `<h3>${escapeHtml(post.title)}</h3>` : '';
    const imageItems = (post.images || []).slice(0, compact ? 3 : 4);
    const images = imageItems.map((item, index) => imageTile(item, index, {
      preview: true,
      postId: post.id
    })).join('');
    const imageClass = imageItems.length > 1 ? 'image-strip image-strip-grid' : 'image-strip image-strip-single';
    const commentPreview = (post.commentPreview || []).slice(0, 2);
    return `
      <article class="${isSincere ? 'sincere-card' : 'feed-card'}" data-post-card="${escapeHtml(post.id)}">
        <div class="author-row feed-author-row">
          <button class="author-profile-link" type="button" data-user-post-view="other" data-jump="#APP-05-PAGE-user-posts">
            ${avatar(post.avatar, isSincere, `${post.author}上传头像`)}
            <span>
              <strong>${escapeHtml(post.author)} ${post.gender ? `<span class="gender-dot">${escapeHtml(post.gender)}</span>` : ''}</strong>
              <span class="helper">${escapeHtml(post.profile || `97年 · ${post.city} · ${post.topic}`)}</span>
            </span>
          </button>
          <button class="follow-btn" type="button" data-toast="${post.followed ? '已打开取消关注确认' : '已打开关注确认'}">${post.followed ? '已关注' : '关注'}</button>
          <button class="more-dot" type="button" data-open-modal="moreActionsModal" data-target-type="post" data-target-post="${escapeHtml(post.id)}" aria-label="更多操作">⋮</button>
        </div>
        ${title}
        <p class="post-text">${escapeHtml(compact ? post.text.slice(0, 70) + '...' : post.text)}</p>
        ${images ? `<div class="${imageClass}">${images}</div>` : ''}
        <div class="feed-meta">
          <span>${escapeHtml(post.activeText || post.time)}</span>
          <button type="button" data-jump="#APP-05-PAGE-topic-detail"># ${escapeHtml(post.topic)} ›</button>
        </div>
        <div class="community-actions">
          ${state.interactionEstablished
            ? '<button class="action-link yo-link" data-direct-chat>发消息</button>'
            : '<button class="action-link yo-link" data-jump="#APP-05-PAGE-community-greeting">申请认识</button>'}
          <button class="action-link" data-jump="#APP-05-PAGE-post-interactors">互动 ${escapeHtml(post.interactionCount || 0)}</button>
          <button class="action-link" data-open-detail="${escapeHtml(post.id)}">评论 ${escapeHtml(post.commentCount)}</button>
          <button class="action-link" data-like="${escapeHtml(post.id)}">赞 ${escapeHtml(post.likeCount)}</button>
        </div>
        ${commentPreview.length ? `<div class="comment-preview">${commentPreview.map((item) => `<p>${escapeHtml(item)}</p>`).join('')}<button type="button" data-open-detail="${escapeHtml(post.id)}">查看全部 ${escapeHtml(post.commentCount)} 条评论</button></div>` : ''}
      </article>
    `;
  }

  function renderFeed() {
    qsa('[data-render="feed"]').forEach((target) => {
      const rows = (data.posts || []).filter((post) => {
        if (post.author === state.hiddenAuthor) return false;
        if (state.feedTab === '关注') {
          if (!post.followed) return false;
          return state.followingAuthor ? post.author === state.followingAuthor : true;
        }
        if (state.feedTab === '同城') return post.city === data.currentUser?.city;
        if (state.feedTab === '热门') return post.likeCount >= 50;
        return true;
      });
      target.innerHTML = `<div class="feed-list">${rows.map((post) => postCard(post, true)).join('') || '<div class="notice">当前没有可展示内容</div>'}</div>`;
    });
  }

  function renderTabs() {
    qsa('[data-feed-tab]').forEach((button) => {
      button.classList.toggle('is-active', button.dataset.feedTab === state.feedTab);
    });
  }

  function renderHotTopicEntry() {
    qsa('[data-render="hot-topic-entry"]').forEach((target) => {
      const topics = (data.topics || [])
        .filter((topic) => topic.status === '启用')
        .slice()
        .sort((a, b) => b.hot - a.hot)
        .slice(0, 3);
      target.innerHTML = `
        <section class="hot-topic-entry" aria-label="家园话题入口区">
          <div class="hot-topic-head">
            <div>
              <strong>家园话题</strong>
              <span>MVP-PAGE-004 入口区</span>
            </div>
            <button type="button" data-jump="#APP-05-PAGE-topic-list">全部</button>
          </div>
          <div class="hot-topic-rail">
            ${topics.map((topic, index) => `
              <button type="button" class="hot-topic-card hot-topic-card-${index + 1}" style="background-image:url('${escapeHtml(topic.cover)}')" data-jump="#APP-05-PAGE-topic-list">
                <span># ${escapeHtml(topic.name)}</span>
                <strong>${escapeHtml(topic.name)}</strong>
                <span class="participant-avatars">${(topic.participantAvatars || []).slice(0, 3).map((item, avatarIndex) => avatar(item, true, `参与者${avatarIndex + 1}`)).join('')}</span>
                <em>${escapeHtml(topic.participantCount || 0)} 人参与 · ${escapeHtml(topic.viewCount || 0)} 次浏览</em>
              </button>
            `).join('')}
          </div>
        </section>
      `;
    });
  }

  function renderTopics() {
    qsa('[data-render="topics"]').forEach((target) => {
      const rows = (data.topics || [])
        .filter((topic) => topic.status === '启用')
        .slice()
        .sort((a, b) => (a.sort || 0) - (b.sort || 0) || b.hot - a.hot);
      const topicCard = (topic) => `
        <article class="topic-card">
          <div class="author-row">
            ${topicCover(topic)}
            <div>
              <strong>${escapeHtml(topic.name)}</strong>
              <div class="helper">${escapeHtml(topic.desc)}</div>
            </div>
            ${tag(`${topic.count} 条`, 'success')}
          </div>
          <div class="community-actions">
            <button class="btn" data-jump="#APP-05-PAGE-topic-detail">查看话题</button>
            <button class="btn" data-jump="#APP-05-PAGE-post-publish">参与发布</button>
          </div>
          <div class="topic-social-proof"><span>${escapeHtml(topic.count || 0)} 条内容 · 热度 ${escapeHtml(topic.hot || 0)}</span></div>
        </article>
      `;
      target.innerHTML = rows.length ? `<div class="topic-section">${rows.map(topicCard).join('')}</div>` : '<div class="notice">暂无数据</div>';
    });
  }

  function currentDetailPost() {
    return (data.posts || []).find((post) => post.id === state.detailPostId) || data.posts?.[0];
  }

  function renderDetail() {
    const post = currentDetailPost();
    qsa('[data-render="post-detail"]').forEach((target) => {
      target.innerHTML = post ? postCard(post) : '<div class="notice">内容不存在或已不可见</div>';
    });
    qsa('[data-detail-title]').forEach((node) => {
      node.textContent = post?.type === 'sincere_post' ? '动态详情 · 诚意贴视图' : '动态详情';
    });
  }

  function renderComments() {
    qsa('[data-render="comments"]').forEach((target) => {
      const rows = (data.comments || []).slice().sort((a, b) => {
        const compared = String(a.createTime || '').localeCompare(String(b.createTime || ''));
        return state.commentSort === 'earliest' ? compared : -compared;
      });
      target.innerHTML = rows.map((item) => `
        <div class="comment-row">
          <div class="author-row">
            ${avatar(item.avatar, true, `${item.author}上传头像`)}
            <div><strong>${escapeHtml(item.author)}</strong><div class="helper">${escapeHtml(item.time)} · ${escapeHtml(commentStatusLabel(item.status))}</div></div>
            <button class="more-dot" type="button" data-open-modal="moreActionsModal" data-target-type="comment" aria-label="评论更多">⋮</button>
          </div>
          <p class="post-text">${escapeHtml(item.text)}</p>
          <div class="community-actions">
            <button class="action-link" data-reply-comment="${escapeHtml(item.author)}">回复</button>
            <button class="action-link" data-open-modal="reportModal" data-target-type="comment">举报</button>
          </div>
        </div>
      `).join('');
    });

    qsa('[data-comment-sort]').forEach((button) => {
      button.classList.toggle('is-active', button.dataset.commentSort === state.commentSort);
    });

    qsa('[data-render="comment-reply-target"]').forEach((target) => {
      target.innerHTML = state.replyTo ? `
        <div class="reply-target">
          <span>回复 ${escapeHtml(state.replyTo)}</span>
          <button type="button" data-clear-reply>取消</button>
        </div>
      ` : '';
    });
  }

  function renderYuemu() {
    qsa('[data-render="yuemu"]').forEach((target) => {
      const all = (data.posts || []).filter((post) => post.yuemu);
      const rows = all.slice(0, state.yuemuLimit);
      target.innerHTML = rows.map((post, index) => {
        const liked = state.yuemuLiked.has(post.id);
        return `
          <article class="yuemu-card">
            <div class="yuemu-cover" style="aspect-ratio:${Number(post.width) || 1}/${Number(post.height) || 1}">
              ${imageTile(post.images?.[0] || '悦目图片', index, {
                preview: true,
                postId: post.id,
                ratio: true,
                width: post.width,
                height: post.height
              })}
            </div>
            <div class="yuemu-meta">
              <div class="author-row">${avatar(post.avatar, true, `${post.author}上传头像`)}<strong>${escapeHtml(post.author)}</strong></div>
              <span class="helper">${escapeHtml(post.width)} x ${escapeHtml(post.height)} · 原比例展示</span>
              <div class="yuemu-actions">
                <button class="btn ${liked ? 'primary' : ''}" data-yuemu-like="${escapeHtml(post.id)}">${liked ? '已赞' : '点赞'} ${escapeHtml(post.likeCount + (liked ? 1 : 0))}</button>
                <button class="btn" data-open-detail="${escapeHtml(post.id)}">详情</button>
              </div>
            </div>
          </article>
        `;
      }).join('') || '<div class="notice">暂无悦目内容，下拉刷新后重试。</div>';

      qsa('[data-yuemu-load]').forEach((button) => {
        button.disabled = state.yuemuLimit >= all.length;
        button.textContent = state.yuemuLimit >= all.length ? '已加载全部' : '加载更多';
      });
    });
  }

  function sortedSincerePosts() {
    const rows = (data.posts || []).filter((post) => post.type === 'sincere_post');
    return rows.slice().sort((a, b) => {
      if (state.sincereSort === '热门') return b.likeCount - a.likeCount;
      return String(b.time).localeCompare(String(a.time));
    });
  }

  function renderSincere() {
    qsa('[data-render="sincere"]').forEach((target) => {
      const rows = sortedSincerePosts();
      target.innerHTML = rows.map((post) => postCard(post, true)).join('') || '<div class="notice">暂无诚意贴，去发布第一条吧。</div>';
    });

    qsa('[data-sincere-sort]').forEach((button) => {
      button.classList.toggle('is-active', button.dataset.sincereSort === state.sincereSort);
    });
  }

  function renderTopicDetailPosts() {
    qsa('[data-render="topic-detail-posts"]').forEach((target) => {
      const rows = (data.posts || [])
        .filter((post) => post.topic === '认真找对象')
        .slice()
        .sort((a, b) => {
          if (state.topicSort === '热门') return b.likeCount - a.likeCount;
          return String(b.time).localeCompare(String(a.time));
        });
      target.innerHTML = rows.map((post) => postCard(post, true)).join('') || '<div class="notice">暂无数据</div>';
    });

    qsa('[data-topic-sort]').forEach((button) => {
      button.classList.toggle('is-active', button.dataset.topicSort === state.topicSort);
    });
  }

  function renderPublishControls() {
    qsa('[data-render="topic-chips"]').forEach((target) => {
      target.innerHTML = `
        <div class="control-label">选择话题</div>
        <div class="chip-row">
          ${(data.topics || []).filter((topic) => topic.status === '启用').map((topic) => `
            <button type="button" class="${state.selectedTopic === topic.name ? 'is-active' : ''}" data-select-topic="${escapeHtml(topic.name)}"># ${escapeHtml(topic.name)}</button>
          `).join('')}
        </div>
      `;
    });

    qsa('[data-render="upload-grid"]').forEach((target) => {
      const max = data.config?.maxImages || 9;
      target.innerHTML = `
        <div class="upload-head">
          <strong>图片</strong>
          <span>${state.publishImages.length}/${max}</span>
        </div>
        <div class="upload-grid">
          ${state.publishImages.map((item, index) => `
            <div class="upload-item is-${escapeHtml(item.uploadStatus || 'success')}">
              ${imageTile(item, index, { preview: true })}
              <span class="upload-status">${escapeHtml({ queued: '等待上传', uploading: '上传中 68%', success: '上传成功', failed: '上传失败' }[item.uploadStatus] || '上传成功')}</span>
              ${item.uploadStatus === 'failed' ? `<button type="button" class="retry-image" data-retry-image="${index}">重试</button>` : ''}
              <button type="button" class="remove-image" data-remove-image="${index}" aria-label="删除图片">×</button>
            </div>
          `).join('')}
          ${state.publishImages.length < max ? `<button type="button" class="upload-add" data-add-image><span>+</span><em>添加图片</em></button>` : ''}
        </div>
      `;
    });

    qsa('[data-publish-type]').forEach((button) => {
      button.classList.toggle('is-active', button.dataset.publishType === state.publishType);
    });
    qsa('[data-sincere-only]').forEach((node) => {
      node.hidden = state.publishType !== 'sincere_post';
    });
    const hasIncompleteUpload = state.publishImages.some((item) => item.uploadStatus !== 'success');
    qsa('[data-submit-publish]').forEach((button) => {
      button.disabled = hasIncompleteUpload;
      button.title = hasIncompleteUpload ? '图片尚未上传完成，请处理后再发布' : '';
    });
  }

  function renderInteractionCenter() {
    qsa('[data-history-type]').forEach((button) => button.classList.toggle('is-active', button.dataset.historyType === state.historyType));
    qsa('[data-render="received-like-stats"]').forEach((target) => {
      const stats = data.receivedLikeStats || {};
      target.innerHTML = `<button class="stats-card" type="button" data-toast="动态获赞 ${escapeHtml(stats.posts || 0)}，评论获赞 ${escapeHtml(stats.comments || 0)}"><span>累计获赞</span><strong>${escapeHtml(stats.total || 0)}</strong><em>动态 ${escapeHtml(stats.posts || 0)} · 评论 ${escapeHtml(stats.comments || 0)}</em></button>`;
    });
    qsa('[data-render="interaction-history"]').forEach((target) => {
      const rows = data.interactionHistory?.[state.historyType] || [];
      target.innerHTML = rows.map((item) => `<article class="history-card"><strong>${escapeHtml(item.title)}</strong><p>${escapeHtml(item.summary)}</p><span>${escapeHtml(item.time)}</span></article>`).join('') || '<div class="notice">暂无相关互动记录。</div>';
    });
    qsa('[data-clear-history]').forEach((button) => {
      button.hidden = state.historyType !== 'viewed';
    });
  }

  function renderFollowRelations() {
    qsa('[data-relation-type]').forEach((button) => button.classList.toggle('is-active', button.dataset.relationType === state.relationType));
    qsa('[data-render="follow-relations"]').forEach((target) => {
      const rows = data.followRelations?.[state.relationType] || [];
      target.innerHTML = rows.map((user) => `<article class="relation-card"><div class="author-row">${avatar(user.avatar, true, `${user.name}上传头像`)}<div><strong>${escapeHtml(user.name)}</strong><div class="helper">${escapeHtml(user.profile)} · ${escapeHtml(user.activeText)}</div></div><button class="follow-btn" type="button" data-toggle-relation="${escapeHtml(user.name)}">${user.followed ? '已关注' : state.relationType === 'followers' ? '回关' : '关注'}</button></div></article>`).join('') || '<div class="notice">暂无相关用户。</div>';
    });
  }

  function renderPostInteractors() {
    qsa('[data-interactor-type]').forEach((button) => button.classList.toggle('is-active', button.dataset.interactorType === state.interactorType));
    qsa('[data-render="post-interactors"]').forEach((target) => {
      const rows = data.postInteractors?.[state.interactorType] || [];
      const emptyText = state.interactorType === 'liked' ? '暂无点赞' : '暂无评论';
      target.innerHTML = rows.map((user) => `<article class="relation-card"><div><strong>${escapeHtml(user.name)}</strong><p>${escapeHtml(user.detail)}</p></div><button class="btn" data-user-post-view="other" data-jump="#APP-05-PAGE-user-posts">查看主页</button></article>`).join('') || `<div class="notice">${emptyText}</div>`;
    });
  }

  function renderUserPosts() {
    qsa('[data-user-post-view]').forEach((button) => {
      button.classList.toggle('is-active', button.dataset.userPostView === state.userPostView);
    });

    qsa('[data-render="user-posts"]').forEach((target) => {
      if (state.userPostView === 'owner') {
        target.innerHTML = (data.myPosts || []).map((post, index) => `
          <article class="user-post-card">
            <div class="author-row">
              ${tag(post.statusText, statusClass(post.statusText))}
              <strong>${escapeHtml(post.topic)}</strong>
              <span class="helper">${escapeHtml(post.time)}</span>
            </div>
            <p class="post-text">${escapeHtml(post.summary)}</p>
            <div class="image-strip image-strip-grid">${(post.images || []).map((item) => imageTile(item, index, { preview: true })).join('')}</div>
            <div class="community-actions">
              <button class="action-link" data-toast="已进入动态详情页审核态视图">查看</button>
              <button class="action-link" data-delete-user-post="${escapeHtml(post.id)}">删除</button>
            </div>
          </article>
        `).join('');
        return;
      }

      const rows = (data.posts || []).filter((post) => post.author === '周予安' && post.status === 'published');
      const profile = data.otherUserProfile || {};
      const primaryAction = state.interactionEstablished
        ? '<button class="btn primary" data-direct-chat>发消息</button>'
        : '<button class="btn primary" data-jump="#APP-05-PAGE-community-greeting">申请认识</button>';
      target.innerHTML = `
        <article class="community-card profile-summary-card">
          <div class="author-row">${avatar(profile.avatar || data.posts?.[0]?.avatar, false, `${profile.name || '周予安'}上传头像`)}<div><strong>${escapeHtml(profile.name || '周予安')}</strong><div class="helper">${escapeHtml(profile.birthYear || '97年')} · ${escapeHtml(profile.city || '杭州')} · ${escapeHtml(profile.occupation || '设计行业')}</div></div>${tag('三项认证', 'success')}</div>
          <p>${escapeHtml(profile.bio || '认真生活，也认真认识愿意分享日常的人。')}</p>
          <div class="metric-strip"><div class="metric"><strong>${escapeHtml(profile.followingCount || 18)}</strong><span>关注</span></div><div class="metric"><strong>${escapeHtml(profile.followerCount || 26)}</strong><span>粉丝</span></div><div class="metric"><strong>${escapeHtml(profile.receivedLikeCount || 328)}</strong><span>获赞</span></div></div>
          <div class="community-actions">${primaryAction}<button class="btn" data-more-target-type="user" data-open-modal="moreActionsModal">更多</button></div>
        </article>
        ${rows.map((post) => postCard(post, true)).join('') || '<div class="notice">暂无数据</div>'}
      `;
    });
  }

  function renderGreeting() {
    qsa('[data-render="greeting-templates"]').forEach((target) => {
      target.innerHTML = `
        <div class="control-label">招呼语模板</div>
        <div class="chip-row">
          ${(data.greetingTemplates || []).map((text) => `
            <button type="button" class="${state.greetingTemplate === text ? 'is-active' : ''}" data-greeting-template="${escapeHtml(text)}">${escapeHtml(text)}</button>
          `).join('')}
        </div>
      `;
    });

    qsa('[data-render="greeting-cost"]').forEach((target) => {
      const free = data.currentUser?.freeWhisper || 0;
      target.innerHTML = free > 0
        ? `<div class="notice">本次优先使用免费次数；剩余 ${free} 次，千寻币余额 ${escapeHtml(data.currentUser?.coinBalance)}。</div>`
        : `<div class="notice warning">需消耗 20 千寻币；余额 ${escapeHtml(data.currentUser?.coinBalance)}。</div>`;
    });

    qsa('[data-greeting-content]').forEach((textarea) => {
      if (!textarea.dataset.touched) textarea.value = state.greetingTemplate;
    });
  }

  function renderReportModal() {
    qsa('[data-render="report-reasons"]').forEach((target) => {
      target.innerHTML = (data.config?.reportReasons || []).map((reason) => `
        <button type="button" data-report-reason="${escapeHtml(reason)}">${escapeHtml(reason)}</button>
      `).join('');
    });
  }

  function moreActions() {
    if (state.moreTargetType === 'user') {
      return [
        { label: data.posts?.[0]?.followed ? '取消关注' : '关注', action: data.posts?.[0]?.followed ? '取消' : '关注', attrs: 'data-close-surface data-more-follow' },
        { label: state.hiddenAuthor ? '取消不看 TA 动态' : '不看 TA 动态', action: state.hiddenAuthor ? '取消' : '设置', attrs: `data-close-surface data-author-preference="${state.hiddenAuthor ? 'unhide_author_posts' : 'hide_author_posts'}"` },
        { label: '举报用户', action: '举报', danger: true, attrs: 'data-close-surface data-open-modal="reportModal"' }
      ];
    }
    if (state.moreTargetType === 'comment') {
      return [
        { label: '举报评论', action: '举报', danger: true, attrs: 'data-close-surface data-open-modal="reportModal"' },
        { label: '复制评论链接', action: '复制', attrs: 'data-close-surface data-toast="评论链接已复制"' }
      ];
    }
    return [
      { label: '分享', action: '分享', attrs: 'data-close-surface data-toast="已调起小程序分享"' },
      { label: data.posts?.[0]?.followed ? '取消关注' : '关注', action: data.posts?.[0]?.followed ? '取消' : '关注', attrs: 'data-close-surface data-more-follow' },
      { label: state.hiddenAuthor ? '取消不看 TA 动态' : '不看 TA 动态', action: state.hiddenAuthor ? '取消' : '设置', attrs: `data-close-surface data-author-preference="${state.hiddenAuthor ? 'unhide_author_posts' : 'hide_author_posts'}"` },
      { label: '举报内容', action: '举报', danger: true, attrs: 'data-close-surface data-open-modal="reportModal"' }
    ];
  }

  function renderMoreActions() {
    qsa('[data-more-target-type]').forEach((button) => {
      button.classList.toggle('is-active', button.dataset.moreTargetType === state.moreTargetType);
    });

    qsa('[data-render="more-actions"]').forEach((target) => {
      const typeLabel = { post: '内容对象', comment: '评论对象', user: '用户对象' }[state.moreTargetType] || '内容对象';
      target.innerHTML = `
        <div class="modal-subtitle">${typeLabel} · 仅展示当前对象可用操作</div>
        <ul class="check-list action-list">
          ${moreActions().map((item) => `
            <li class="${item.disabled ? 'is-disabled' : ''}">
              <span>${escapeHtml(item.label)}${item.reason ? `<em>${escapeHtml(item.reason)}</em>` : ''}</span>
              <button class="btn ${item.danger ? 'danger' : ''}" ${item.disabled ? 'disabled' : item.attrs}>${escapeHtml(item.action)}</button>
            </li>
          `).join('')}
        </ul>
      `;
    });
  }

  function renderImagePreview() {
    qsa('[data-render="image-preview"]').forEach((target) => {
      const post = (data.posts || []).find((item) => item.id === state.previewImage?.postId);
      const label = state.previewImage?.label || post?.images?.[0] || '图片';
      target.innerHTML = `
        <div class="preview-top">
          <h2>图片预览</h2>
          <button class="btn" data-close-surface>关闭</button>
        </div>
        <div class="preview-image">${imageTile(label, 0, { ratio: true, width: post?.width || 720, height: post?.height || 960 })}</div>
        <div class="preview-meta">
          <strong>${escapeHtml(post?.author || '发布草稿')}</strong>
          <span>${post ? `${escapeHtml(post.width)} x ${escapeHtml(post.height)} · 原比例预览` : '发布前预览'}</span>
        </div>
        ${post ? `<button class="btn primary full" data-close-surface data-open-detail="${escapeHtml(post.id)}">进入详情</button>` : ''}
      `;
    });
  }

  function renderConfig() {
    qsa('[data-render="config"]').forEach((target) => {
      target.innerHTML = `
        <div class="community-card"><h3>社区 Tab</h3><p>${data.config?.tabs?.join(' / ')}</p></div>
        <div class="community-card"><h3>家园话题</h3><p>话题字典、推荐入口和发布页话题 chips 由家园话题管理独立维护。</p></div>
        <div class="community-card"><h3>举报原因</h3><p>${data.config?.reportReasons?.join('、')}</p></div>
        <div class="community-card"><h3>敏感词库</h3><p>联系方式、广告引流、攻击辱骂；高危词命中进入人工复核。</p></div>
        <div class="community-card"><h3>发布规则</h3><p>最多 ${data.config?.maxImages} 图；诚意贴正文不少于 ${data.config?.sincereMinText} 字；机审 ${data.config?.machineAudit}。</p></div>
        <div class="community-card"><h3>治理策略</h3><p>禁言周期 ${data.config?.mutePeriods?.join(' / ')}；IP 封禁 ${data.config?.ipBlock}，周期 ${data.config?.ipBlockPeriods?.join(' / ')}。</p></div>
        <div class="community-card"><h3>审计要求</h3><p>规则启停、联系方式开关、处罚处理均写入操作日志。</p></div>
      `;
    });
  }

  function tableRows(rows, columns) {
    return rows.map((row) => `<tr>${columns.map((col) => `<td>${col(row)}</td>`).join('')}</tr>`).join('');
  }

  function renderAdminTables() {
    qsa('[data-render="content-manage"]').forEach((target) => {
      target.innerHTML = tableRows(data.audits || [], [
        (r) => escapeHtml(r.id),
        (r) => escapeHtml(r.contentId),
        (r) => `<strong>${escapeHtml(r.type)}</strong><div class="helper">${escapeHtml(r.mediaType)}</div>`,
        (r) => escapeHtml(r.module),
        (r) => `<strong>${escapeHtml(r.title)}</strong><div class="helper">${escapeHtml(r.content)}</div>`,
        (r) => escapeHtml(r.author),
        (r) => escapeHtml(r.time),
        (r) => `${tag(r.machine, r.machine === '通过' ? 'success' : 'warning')}<div class="helper">${escapeHtml(r.risk)}风险</div>`,
        (r) => `${tag(r.status, r.status.includes('待') ? 'warning' : 'success')}<div class="helper">${escapeHtml(r.violationTag)}</div>`,
        () => '<div class="table-actions"><button class="btn" data-open-drawer="auditDrawer">详情</button></div>'
      ]);
    });

    qsa('[data-render="moment-manage"]').forEach((target) => {
      const moments = (data.audits || []).filter((row) => row.type === '动态');
      target.innerHTML = tableRows(moments, [
        (r) => escapeHtml(r.contentId),
        (r) => escapeHtml((r.module || '').replace('成家 / ', '') || '成家'),
        (r) => escapeHtml(r.mediaType),
        (r) => `<strong>${escapeHtml(r.title)}</strong><div class="helper">${escapeHtml(r.content)}</div>`,
        (r) => escapeHtml(r.author),
        (r) => escapeHtml(r.time),
        (r) => `${escapeHtml(r.views)} / ${escapeHtml(r.likes)} / ${escapeHtml(r.comments)}`,
        (r) => tag(r.status, r.status.includes('待') ? 'warning' : 'success'),
        (r) => `${escapeHtml(r.risk)}风险${r.violationTag && r.violationTag !== '-' ? `<div class="helper">${escapeHtml(r.violationTag)}</div>` : ''}`,
        () => '<div class="table-actions"><button class="btn" data-open-drawer="auditDrawer">详情</button></div>'
      ]);
    });

    qsa('[data-render="comment-audits"]').forEach((target) => {
      target.innerHTML = tableRows(data.comments || [], [
        (r, index) => escapeHtml(r.id || `C-${8000 + index}`),
        (r) => escapeHtml(r.source || '动态 P-240701'),
        (r) => `${escapeHtml(r.authorId || '-') } / ${escapeHtml(r.author)}`,
        (r) => escapeHtml(r.text),
        (r) => escapeHtml(r.createTime || r.time),
        (r) => `${escapeHtml(r.likes || 0)} / ${escapeHtml(r.reports || 0)}`,
        (r) => tag(commentStatusLabel(r.status), commentStatusTone(r.status)),
        () => '<div class="table-actions"><button class="btn" data-open-drawer="commentDrawer">详情</button></div>'
      ]);
    });

    qsa('[data-render="reports"]').forEach((target) => {
      target.innerHTML = tableRows(data.reports || [], [
        (r) => escapeHtml(r.id),
        (r) => `<strong>${escapeHtml(r.type || '内容')}</strong><div class="helper">${escapeHtml(r.target)}</div>`,
        (r) => escapeHtml(r.reporter),
        (r) => escapeHtml(r.targetUser),
        (r) => escapeHtml(r.reason),
        (r) => tag(r.status, r.status.includes('成立') ? 'danger' : 'warning'),
        (r) => r.replied ? tag('已回复', 'success') : tag('未回复', 'warning'),
        (r) => escapeHtml(r.time),
        () => '<div class="table-actions"><button class="btn" data-open-drawer="reportDrawer">处理</button></div>'
      ]);
    });

    qsa('[data-render="topic-manage"]').forEach((target) => {
      target.innerHTML = tableRows(data.topics || [], [
        (r) => escapeHtml(r.id),
        (r) => topicCover(r, 'topic-cover'),
        (r) => `<strong>${escapeHtml(r.name)}</strong><div class="helper">${escapeHtml(r.desc)}</div>`,
        (r) => tag(r.recommended ? '推荐' : '普通', r.recommended ? 'success' : 'neutral'),
        (r) => `${escapeHtml(r.count)} / ${escapeHtml(r.hot)}<div class="helper">${(r.scenes || []).map(escapeHtml).join(' / ')}</div>`,
        (r) => escapeHtml(r.sort),
        (r) => tag(r.status, r.status === '启用' ? 'success' : 'warning'),
        (r) => `<strong>${escapeHtml(r.updatedTime)}</strong><div class="helper">${escapeHtml(r.updatedBy || '系统')}</div>`,
        () => '<div class="table-actions"><button class="btn" data-open-drawer="topicDrawer">详情</button></div>'
      ]);
    });

  }

  function decoratePhones() {
    qsa('[data-static-avatar]').forEach((node) => {
      const post = (data.posts || []).find((item) => item.id === node.dataset.staticAvatar) || data.posts?.[0];
      node.outerHTML = avatar(post?.avatar, true, `${post?.author || '用户'}上传头像`);
    });

    qsa('.phone-screen').forEach((screen) => {
      if (!screen.querySelector('.qianxun-scenes')) {
        const active = screen.closest('#APP-05-PAGE-yuemu, #APP-05-PAGE-sincere-list') ? '知音' : '成家';
        screen.insertAdjacentHTML('afterbegin', sceneTabs(active));
      }
      if (screen.closest('#APP-05-PAGE-community-following') && !screen.querySelector('[data-render="following-list"]')) {
        const scenes = screen.querySelector('.qianxun-scenes');
        scenes.insertAdjacentHTML('afterend', '<div data-render="following-list"></div>');
      }
      if (!screen.querySelector('.mobile-bottom-nav')) {
        screen.insertAdjacentHTML('beforeend', bottomNav());
      }
    });
  }

  function renderAll() {
    decoratePhones();
    renderFollowingList();
    renderTabs();
    renderFeed();
    renderHotTopicEntry();
    renderTopics();
    renderTopicDetailPosts();
    renderDetail();
    renderComments();
    renderYuemu();
    renderSincere();
    renderPublishControls();
    renderUserPosts();
    renderInteractionCenter();
    renderFollowRelations();
    renderPostInteractors();
    renderGreeting();
    renderReportModal();
    renderMoreActions();
    renderImagePreview();
    renderConfig();
    renderAdminTables();
  }

  function closeSurface(surface) {
    if (!surface) return;
    surface.classList.remove('is-open');
    surface.setAttribute('aria-hidden', 'true');
  }

  function wireEvents() {
    window.addEventListener('hashchange', () => {
      qsa('.modal-backdrop.is-open, .drawer-backdrop.is-open').forEach(closeSurface);
    });

    document.addEventListener('input', (event) => {
      const greetingContent = event.target.closest('[data-greeting-content]');
      if (greetingContent) {
        greetingContent.dataset.touched = 'true';
        state.greetingTemplate = greetingContent.value;
      }
    });

    document.addEventListener('click', (event) => {
      const tab = event.target.closest('[data-feed-tab]');
      if (tab) {
        state.feedTab = tab.dataset.feedTab;
        state.followingAuthor = null;
        renderAll();
        showToast(`已切换到${state.feedTab}信息流`);
      }

      const focusAuthor = event.target.closest('[data-focus-author]');
      if (focusAuthor) {
        state.feedTab = '关注';
        state.followingAuthor = focusAuthor.dataset.focusAuthor;
        renderAll();
        showToast(`已查看 ${state.followingAuthor} 的关注动态`);
      }

      const followingAll = event.target.closest('[data-following-all]');
      if (followingAll) {
        state.feedTab = '关注';
        state.followingAuthor = null;
        renderAll();
        showToast('已显示全部关注动态');
      }

      const openPreview = event.target.closest('[data-open-preview]');
      if (openPreview) {
        state.previewImage = {
          label: openPreview.dataset.openPreview,
          postId: openPreview.dataset.previewPost
        };
        renderImagePreview();
        openModal('imagePreviewModal');
      }

      const openDetail = event.target.closest('[data-open-detail]');
      if (openDetail) {
        state.detailPostId = openDetail.dataset.openDetail;
        renderDetail();
        location.hash = 'APP-05-PAGE-post-detail';
      }

      const like = event.target.closest('[data-like]');
      if (like) {
        const post = (data.posts || []).find((item) => item.id === like.dataset.like);
        if (post) post.likeCount += 1;
        renderAll();
        showToast('点赞成功，通知事件由 PRD-03 承接');
      }

      const yuemuLike = event.target.closest('[data-yuemu-like]');
      if (yuemuLike) {
        const id = yuemuLike.dataset.yuemuLike;
        if (state.yuemuLiked.has(id)) state.yuemuLiked.delete(id);
        else state.yuemuLiked.add(id);
        renderYuemu();
        showToast(state.yuemuLiked.has(id) ? '悦目点赞成功' : '已取消点赞');
      }

      const jump = event.target.closest('[data-jump]');
      if (jump) location.hash = jump.dataset.jump.replace('#', '');

      const modal = event.target.closest('[data-open-modal]');
      if (modal) {
        if (modal.dataset.openModal === 'moreActionsModal') {
          state.moreTargetType = modal.dataset.targetType || state.moreTargetType;
          state.moreTargetPostId = modal.dataset.targetPost || state.moreTargetPostId;
          renderMoreActions();
        }
        if (modal.dataset.openModal === 'reportModal') {
          state.reportTargetType = modal.dataset.targetType || state.moreTargetType || 'post';
          state.reportTargetId = modal.dataset.targetId || modal.dataset.targetPost || state.moreTargetPostId || currentDetailPost()?.id || 'P-240701';
          renderReportModal();
        }
        openModal(modal.dataset.openModal);
      }

      const drawer = event.target.closest('[data-open-drawer]');
      if (drawer) openDrawer(drawer.dataset.openDrawer);

      const toast = event.target.closest('[data-toast]');
      if (toast) showToast(toast.dataset.toast);

      const publishType = event.target.closest('[data-publish-type]');
      if (publishType) {
        state.publishType = publishType.dataset.publishType;
        renderPublishControls();
      }

      const selectTopic = event.target.closest('[data-select-topic]');
      if (selectTopic) {
        state.selectedTopic = selectTopic.dataset.selectTopic;
        renderPublishControls();
        showToast(`已选择话题：${state.selectedTopic}`);
      }

      const addImage = event.target.closest('[data-add-image]');
      if (addImage) {
        const max = data.config?.maxImages || 9;
        if (state.publishImages.length >= max) {
          showToast(`最多上传 ${max} 张图片`, 'warning');
        } else {
          const next = (data.uploadSamples || [])[state.publishImages.length % (data.uploadSamples || []).length] || `图片 ${state.publishImages.length + 1}`;
          state.publishImages.push({ label: next, uploadStatus: 'uploading' });
          renderPublishControls();
          showToast('图片开始上传；上传成功不代表动态已发布');
        }
      }

      const retryImage = event.target.closest('[data-retry-image]');
      if (retryImage) {
        const item = state.publishImages[Number(retryImage.dataset.retryImage)];
        if (item) item.uploadStatus = 'success';
        renderPublishControls();
        showToast('图片重新上传成功，可继续提交');
      }

      const cycleUpload = event.target.closest('[data-cycle-upload]');
      if (cycleUpload && state.publishImages[0]) {
        const statuses = ['success', 'uploading', 'failed'];
        const current = statuses.indexOf(state.publishImages[0].uploadStatus);
        state.publishImages[0].uploadStatus = statuses[(current + 1) % statuses.length];
        renderPublishControls();
        showToast(`首图状态：${state.publishImages[0].uploadStatus}`);
      }

      const saveDraft = event.target.closest('[data-save-draft]');
      if (saveDraft) {
        state.draft = {
          contentType: state.publishType,
          content: qs('[data-publish-content]')?.value || '',
          title: qs('[data-publish-title]')?.value || '',
          topic: state.selectedTopic,
          images: state.publishImages.filter((item) => item.uploadStatus === 'success').map((item) => ({ ...item })),
          updatedAt: '刚刚'
        };
        showToast('草稿已保存；每种内容类型保留最近 1 份');
      }

      const restoreDraft = event.target.closest('[data-restore-draft]');
      if (restoreDraft) {
        if (!state.draft) {
          showToast('暂无可恢复草稿', 'warning');
        } else {
          state.publishType = state.draft.contentType || 'community_post';
          state.selectedTopic = state.draft.topic || '';
          state.publishImages = (state.draft.images || []).map((item) => ({ ...item, uploadStatus: 'success' }));
          const contentNode = qs('[data-publish-content]');
          const titleNode = qs('[data-publish-title]');
          if (contentNode) contentNode.value = state.draft.content || '';
          if (titleNode) titleNode.value = state.draft.title || '';
          renderPublishControls();
          showToast(`已恢复 ${state.draft.updatedAt || ''} 的草稿，尚未发布`);
        }
      }

      const removeImage = event.target.closest('[data-remove-image]');
      if (removeImage) {
        state.publishImages.splice(Number(removeImage.dataset.removeImage), 1);
        renderPublishControls();
        showToast('已删除图片');
      }

      const submitPublish = event.target.closest('[data-submit-publish]');
      if (submitPublish) {
        const title = qs('[data-publish-title]')?.value.trim();
        const content = qs('[data-publish-content]')?.value.trim();
        if (!state.selectedTopic) {
          showToast('请选择话题', 'warning');
          return;
        }
        if (state.publishType === 'sincere_post' && !title) {
          showToast('诚意贴标题必填', 'warning');
          return;
        }
        if (!content || (state.publishType === 'sincere_post' && content.length < 20)) {
          showToast('请补充正文，诚意贴正文不少于 20 字', 'warning');
          return;
        }
        if (state.publishImages.some((item) => item.uploadStatus !== 'success')) {
          showToast('图片尚未上传完成，请处理后再发布', 'warning');
          return;
        }
        state.draft = null;
        const pendingPost = {
          id: `MY-${Date.now()}`,
          type: state.publishType,
          summary: content,
          topic: state.selectedTopic,
          status: state.publishType === 'sincere_post' ? 'pending_manual' : 'pending_machine',
          statusText: '待复核',
          time: '刚刚',
          images: state.publishImages.map((item) => item.label)
        };
        data.myPosts = [pendingPost, ...(data.myPosts || [])];
        state.userPostView = 'owner';
        renderUserPosts();
        location.hash = 'APP-05-PAGE-user-posts';
      }

      const historyType = event.target.closest('[data-history-type]');
      if (historyType) {
        state.historyType = historyType.dataset.historyType;
        renderInteractionCenter();
      }

      const clearHistory = event.target.closest('[data-clear-history]');
      if (clearHistory) {
        if (state.historyType !== 'viewed') return;
        data.interactionHistory.viewed = [];
        renderInteractionCenter();
        showToast('浏览记录已清空，不影响其他互动历史');
      }

      const relationType = event.target.closest('[data-relation-type]');
      if (relationType) {
        state.relationType = relationType.dataset.relationType;
        renderFollowRelations();
      }

      const toggleRelation = event.target.closest('[data-toggle-relation]');
      if (toggleRelation) {
        const rows = data.followRelations?.[state.relationType] || [];
        const user = rows.find((item) => item.name === toggleRelation.dataset.toggleRelation);
        if (user) user.followed = !user.followed;
        renderFollowRelations();
        showToast(user?.followed ? '关注成功，不改变匹配或私信资格' : '已取消关注');
      }

      const interactorType = event.target.closest('[data-interactor-type]');
      if (interactorType) {
        state.interactorType = interactorType.dataset.interactorType;
        renderPostInteractors();
      }

      const topicSort = event.target.closest('[data-topic-sort]');
      if (topicSort) {
        state.topicSort = topicSort.dataset.topicSort;
        renderTopicDetailPosts();
      }

      const commentSort = event.target.closest('[data-comment-sort]');
      if (commentSort) {
        state.commentSort = commentSort.dataset.commentSort;
        renderComments();
      }

      const sincereSort = event.target.closest('[data-sincere-sort]');
      if (sincereSort) {
        state.sincereSort = sincereSort.dataset.sincereSort;
        renderSincere();
      }

      const yuemuRefresh = event.target.closest('[data-yuemu-refresh]');
      if (yuemuRefresh) {
        state.yuemuLimit = Math.min(2, (data.posts || []).filter((post) => post.yuemu).length);
        renderYuemu();
        showToast('悦目内容已刷新');
      }

      const yuemuLoad = event.target.closest('[data-yuemu-load]');
      if (yuemuLoad) {
        state.yuemuLimit += 2;
        renderYuemu();
        showToast('已加载更多悦目内容');
      }

      const userPostView = event.target.closest('[data-user-post-view]');
      if (userPostView) {
        state.userPostView = userPostView.dataset.userPostView;
        renderUserPosts();
      }

      const deleteUserPost = event.target.closest('[data-delete-user-post]');
      if (deleteUserPost) {
        showToast('已打开删除确认弹窗');
      }

      const greetingTemplate = event.target.closest('[data-greeting-template]');
      if (greetingTemplate) {
        state.greetingTemplate = greetingTemplate.dataset.greetingTemplate;
        qsa('[data-greeting-content]').forEach((textarea) => {
          textarea.value = state.greetingTemplate;
          textarea.dataset.touched = 'true';
        });
        renderGreeting();
      }

      const reportReason = event.target.closest('[data-report-reason]');
      if (reportReason) {
        const reporterId = data.currentUser?.id || 'CURRENT-USER';
        const reportKey = `${reporterId}:${state.reportTargetType}:${state.reportTargetId}`;
        const duplicated = state.reportSubmissions.has(reportKey);
        if (!duplicated) state.reportSubmissions.add(reportKey);
        showToast(duplicated ? '你的举报已提交，请等待处理' : `举报已提交：${reportReason.dataset.reportReason}`);
        qsa('.modal-backdrop.is-open').forEach(closeSurface);
      }

      const moreType = event.target.closest('[data-more-target-type]');
      if (moreType) {
        state.moreTargetType = moreType.dataset.moreTargetType;
        renderMoreActions();
      }

      const replyComment = event.target.closest('[data-reply-comment]');
      if (replyComment) {
        state.replyTo = replyComment.dataset.replyComment;
        renderComments();
        showToast(`正在回复 ${state.replyTo}`);
      }

      const clearReply = event.target.closest('[data-clear-reply]');
      if (clearReply) {
        state.replyTo = null;
        renderComments();
      }

      const confirmGreeting = event.target.closest('[data-confirm-greeting]');
      if (confirmGreeting) {
        showToast('悄悄话已发送，等待对方回复');
        qsa('.modal-backdrop.is-open').forEach(closeSurface);
      }

      const authorPreference = event.target.closest('[data-author-preference]');
      if (authorPreference) {
        const post = (data.posts || []).find((item) => item.id === state.moreTargetPostId) || currentDetailPost();
        const action = authorPreference.dataset.authorPreference;
        state.hiddenAuthor = action === 'hide_author_posts' ? post?.author : null;
        renderAll();
        showToast(action === 'hide_author_posts' ? '已设置不看 TA 动态；关注和私信关系不变' : '已取消不看 TA 动态');
      }

      const moreFollow = event.target.closest('[data-more-follow]');
      if (moreFollow && data.posts?.[0]) {
        data.posts[0].followed = !data.posts[0].followed;
        renderAll();
        showToast(data.posts[0].followed ? '关注成功' : '已取消关注');
      }

      const toggleInteraction = event.target.closest('[data-toggle-interaction]');
      if (toggleInteraction) {
        state.interactionEstablished = !state.interactionEstablished;
        state.userPostView = 'other';
        renderUserPosts();
        showToast(state.interactionEstablished ? '已建立互动关系：消息动作直达 PRD-03' : '未建立互动关系：展示申请认识');
      }

      const directChat = event.target.closest('[data-direct-chat]');
      if (directChat) showToast('已直接进入 APP-03 私信对话页');

      const close = event.target.closest('[data-close-surface]');
      if (close) {
        closeSurface(close.closest('.modal-backdrop, .drawer-backdrop'));
      }
    });

    if (common.wireBackdropClose) common.wireBackdropClose();
  }

  document.addEventListener('DOMContentLoaded', () => {
    renderAll();
    wireEvents();
  });
})();
