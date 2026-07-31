const API_PATH = '/api/miniapp/app/h5-content/invite_rules';

const contentElement = document.querySelector('#rules-content');
const statusElement = document.querySelector('#rules-status');
const statusTextElement = document.querySelector('#rules-status-text');
const errorElement = document.querySelector('#rules-error');
const errorMessageElement = document.querySelector('#rules-error-message');
const retryButton = document.querySelector('#rules-retry');

function formatAmount(value) {
  const amount = Number(value);
  if (!Number.isFinite(amount) || amount < 0) return '0';
  return Number.isInteger(amount) ? String(amount) : amount.toFixed(2).replace(/0+$/, '').replace(/\.$/, '');
}

function paragraph(text) {
  const element = document.createElement('p');
  element.textContent = text;
  return element;
}

function renderRules(rule) {
  const events = Array.isArray(rule.events) ? rule.events : [];
  const tiers = rule.rewardMode === 'ladder' && Array.isArray(rule.tiers) ? rule.tiers : [];
  const eventCopies = events.map((event) => {
    const prefix = event.eventType === 'register_reward' ? '普通邀请' : '';
    return `${prefix}${event.eventLabel}奖励 ${formatAmount(event.amount)} 千寻币`;
  });
  const tierCopies = tiers.map((tier, index) => (
    `${index === 0 ? '累计成功邀请' : '累计'} ${tier.threshold} 人额外奖励 ${formatAmount(tier.amount)} 千寻币`
  ));
  const rewardCopy = [...eventCopies, ...tierCopies].join('；');
  const otherEventLabels = events
    .filter((event) => event.eventType !== 'register_reward')
    .map((event) => event.eventLabel);
  const eventPolicy = otherEventLabels.length > 0
    ? `${otherEventLabels.join('、')}等奖励事件按当前已发布规则分别发放；`
    : '';

  contentElement.replaceChildren(
    paragraph('新用户通过专属邀请入口完成注册后，即建立唯一且永久有效的邀请关系。'),
    paragraph(`${rewardCopy || '当前暂无启用的邀请奖励事件'}。`),
    paragraph(`${eventPolicy}阶梯奖励仅在首次命中对应累计人数时额外发放。`),
    paragraph('老用户不重复绑定邀请关系，校园代理停用后旧入口仍可访问，但不再建立新关系或产生新奖金。'),
  );
  document.documentElement.dataset.ruleVersion = String(rule.version || '');
  contentElement.hidden = false;
  statusElement.hidden = true;
  errorElement.hidden = true;
}

function showError(message) {
  contentElement.hidden = true;
  statusElement.hidden = true;
  errorMessageElement.textContent = message || '当前活动规则加载失败，请稍后重试。';
  errorElement.hidden = false;
}

async function loadRules() {
  statusTextElement.textContent = '活动规则加载中';
  statusElement.hidden = false;
  contentElement.hidden = true;
  errorElement.hidden = true;

  try {
    const response = await fetch(API_PATH, {
      cache: 'no-store',
      credentials: 'same-origin',
      headers: { Accept: 'application/json' },
    });
    if (!response.ok) throw new Error('活动规则服务暂不可用');
    const payload = await response.json();
    if (payload.code !== 200 || payload.data?.enabled !== true) {
      throw new Error(payload.msg || '当前活动规则暂未启用');
    }
    if (!payload.data.businessRule) {
      throw new Error('当前奖励规则暂未发布，请稍后查看');
    }
    renderRules(payload.data.businessRule);
  } catch (error) {
    showError(error instanceof Error ? error.message : '');
  }
}

retryButton.addEventListener('click', loadRules);
void loadRules();
