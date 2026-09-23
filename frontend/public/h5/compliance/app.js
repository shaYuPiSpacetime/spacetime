const allowedCodes = new Set([
  'user_agreement',
  'privacy_policy',
  'privacy_summary',
  'single_commitment',
  'education_verification_agreement',
  'account_cancellation',
  'third_party_list',
  'personal_info_list',
  'platform_rule',
  'vip_service_agreement',
  'coin_recharge_agreement',
  'announcement',
  'help_service',
]);

const safeTags = new Set(['P', 'H2', 'H3', 'H4', 'STRONG', 'EM', 'UL', 'OL', 'LI', 'BR', 'BLOCKQUOTE']);
const code = new URLSearchParams(window.location.search).get('code') || '';
const title = document.getElementById('compliance-title');
const meta = document.getElementById('compliance-meta');
const content = document.getElementById('compliance-content');
const error = document.getElementById('compliance-error');
const errorMessage = document.getElementById('compliance-error-message');
const loading = document.getElementById('compliance-loading');
const retry = document.getElementById('compliance-retry');

function showError(message, canRetry = false) {
  loading.hidden = true;
  content.hidden = true;
  error.hidden = false;
  errorMessage.textContent = message;
  retry.hidden = !canRetry;
}

function safeNode(source) {
  if (source.nodeType === Node.TEXT_NODE) return document.createTextNode(source.textContent || '');
  if (source.nodeType !== Node.ELEMENT_NODE) return null;
  if (['SCRIPT', 'STYLE', 'IFRAME', 'OBJECT', 'SVG', 'FORM'].includes(source.tagName)) return null;
  if (!safeTags.has(source.tagName)) {
    const fragment = document.createDocumentFragment();
    for (const child of source.childNodes) {
      const safeChild = safeNode(child);
      if (safeChild) fragment.appendChild(safeChild);
    }
    return fragment;
  }
  const node = document.createElement(source.tagName.toLowerCase());
  for (const child of source.childNodes) {
    const safeChild = safeNode(child);
    if (safeChild) node.appendChild(safeChild);
  }
  return node;
}

function renderBody(body) {
  content.replaceChildren();
  if (/<[a-z][\s\S]*>/i.test(body)) {
    const parsed = new DOMParser().parseFromString(body, 'text/html');
    for (const child of parsed.body.childNodes) {
      const safeChild = safeNode(child);
      if (safeChild) content.appendChild(safeChild);
    }
  } else {
    for (const paragraph of body.split(/\n\s*\n/)) {
      const element = document.createElement('p');
      element.textContent = paragraph.trim();
      content.appendChild(element);
    }
  }
  content.hidden = false;
}

async function load() {
  if (!allowedCodes.has(code)) {
    showError('内容类型无效');
    return;
  }
  loading.hidden = false;
  error.hidden = true;
  content.hidden = true;
  try {
    const response = await fetch(`/api/miniapp/content/compliance/${encodeURIComponent(code)}`, {
      credentials: 'omit',
      headers: { Accept: 'application/json' },
    });
    if (!response.ok) throw new Error('内容暂不可查看');
    const result = await response.json();
    if (result.code !== 200 || !result.data) throw new Error('内容暂不可查看');
    const detail = result.data;
    const body = typeof detail.contentBody === 'string' ? detail.contentBody.trim() : '';
    title.textContent = detail.title || '协议与规则';
    document.title = title.textContent;
    if (detail.version || detail.effectiveTime) {
      meta.textContent = [detail.version, detail.effectiveTime ? `${detail.effectiveTime} 生效` : ''].filter(Boolean).join(' · ');
      meta.hidden = false;
    } else {
      meta.hidden = true;
    }
    if (!body || /^请配置/.test(body)) {
      showError('当前内容尚未发布');
      return;
    }
    renderBody(body);
    loading.hidden = true;
  } catch {
    showError('内容加载失败，请稍后重试', true);
  }
}

retry.addEventListener('click', load);
void load();
