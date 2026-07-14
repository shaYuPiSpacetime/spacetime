const API = process.env.API_URL || 'http://127.0.0.1:8080';
const ADMIN_ACCOUNT = process.env.ADMIN_ACCOUNT || 'peter';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || '000000';

const stamp = new Date().toISOString().replace(/[-:.TZ]/g, '').slice(0, 14);
const phone = '19' + String(Date.now()).slice(-9);

const results = [];

function record(name, ok, detail = {}) {
  results.push({ name, ok, ...detail });
  const mark = ok ? 'PASS' : 'FAIL';
  console.log(`[${mark}] ${name}`, Object.keys(detail).length ? JSON.stringify(detail) : '');
}

async function http(method, path, body, token) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers['X-Auth-Token'] = token;
  const response = await fetch(API + path, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const text = await response.text();
  let json;
  try {
    json = text ? JSON.parse(text) : {};
  } catch {
    throw new Error(`${method} ${path} returned non-json: ${text.slice(0, 200)}`);
  }
  if (!response.ok || json.code !== 200) {
    throw new Error(`${method} ${path} failed: http=${response.status}, body=${text.slice(0, 500)}`);
  }
  return json.data;
}

async function step(name, fn) {
  try {
    const data = await fn();
    record(name, true, summarize(data));
    return data;
  } catch (error) {
    record(name, false, { error: error.message });
    throw error;
  }
}

function summarize(data) {
  if (data == null) return {};
  if (Array.isArray(data)) return { count: data.length };
  if (data.sample) return data;
  const keys = ['userId', 'token', 'isNewUser', 'nextStep', 'auditStatus', 'fieldName', 'mediaId',
    'auditRecordId', 'voiceIntroAuditStatus', 'profileScore', 'total', 'current', 'size'];
  const out = {};
  for (const key of keys) {
    if (Object.prototype.hasOwnProperty.call(data, key)) {
      out[key] = key === 'token' ? '***' : data[key];
    }
  }
  if (data.records) out.records = data.records.length;
  return out;
}

function firstCode(options, key, preferred = []) {
  const rows = options[key] || [];
  for (const code of preferred) {
    const found = rows.find((item) => item.code === code || item.value === code);
    if (found) return found.code || found.value;
  }
  const first = rows[0];
  if (!first) throw new Error(`missing dict options: ${key}`);
  return first.code || first.value;
}

async function locationCodes(token) {
  const provinces = await http('GET', '/miniapp/dict/locations', undefined, token);
  const province = provinces.find((item) => item.hasChildren) || provinces[0];
  if (!province) throw new Error('missing province dict');
  const cities = await http('GET', `/miniapp/dict/locations?parentCode=${encodeURIComponent(province.code)}`, undefined, token);
  const city = cities.find((item) => item.hasChildren) || cities[0];
  if (!city) throw new Error('missing city dict');
  const districts = await http('GET', `/miniapp/dict/locations?parentCode=${encodeURIComponent(city.code)}`, undefined, token);
  const district = districts[0];
  return { province: province.code, city: city.code, district: district?.code || '' };
}

async function main() {
  console.log(`API=${API}`);
  console.log(`TEST_PHONE=${phone}`);

  await step('miniapp send sms code', () => http('POST', '/miniapp/auth/sms-code', { phone }));
  const login = await step('miniapp phone login', () => http('POST', '/miniapp/auth/phone-login', {
    phone,
    smsCode: '000000',
    agreeProtocol: true,
  }));
  const token = login.token;
  const userId = login.userId;

  const adminLogin = await step('admin login', () => http('POST', '/admin/login', {
    account: ADMIN_ACCOUNT,
    password: ADMIN_PASSWORD,
  }));
  const adminToken = adminLogin.token;

  const config = await step('GET /miniapp/config/prd01', () => http('GET', '/miniapp/config/prd01', undefined, token));
  const dict = await step('GET /miniapp/dict/profile-options', () => http('GET', '/miniapp/dict/profile-options', undefined, token));
  const tagGroupCodes = (dict.profileTagGroups || []).map((item) => item.categoryCode);
  for (const code of ['ALL', 'MBTI', 'PERSONALITY', 'HOBBY', 'SPORT', 'FOOTPRINT']) {
    if (!tagGroupCodes.includes(code)) {
      throw new Error(`profileTagGroups missing category: ${code}`);
    }
  }
  if ((dict.profileTag || []).some((item) => !item.categoryCode || !item.categoryLabel)) {
    throw new Error('profileTag option requires categoryCode/categoryLabel');
  }
  const loc = await step('GET /miniapp/dict/locations lazy levels', () => locationCodes(token));

  const identity = firstCode(dict, 'identity', ['WORKER', 'STUDENT']);
  const educationLevel = firstCode(dict, 'educationLevel', ['BACHELOR', 'MASTER']);
  const industry = firstCode(dict, 'industry');
  const occupation = firstCode(dict, 'occupation');
  const annualIncome = firstCode(dict, 'annualIncome');
  const maritalStatus = firstCode(dict, 'maritalStatus');
  const datingGoal = firstCode(dict, 'datingGoal');
  const emotionalStatus = firstCode(dict, 'emotionalStatus');
  const tags = (dict.profileTag || []).slice(0, 4).map((item) => item.code || item.value);
  if (tags.length < 3) throw new Error('profileTag dict requires at least 3 options for this test');

  await step('GET /miniapp/profile/init-status', () => http('GET', '/miniapp/profile/init-status', undefined, token));
  await step('POST /miniapp/profile/init-step gender', () => http('POST', '/miniapp/profile/init-step', { step: 1, gender: 'FEMALE' }, token));
  await step('POST /miniapp/profile/init-step birthday', () => http('POST', '/miniapp/profile/init-step', { step: 2, birthday: '1996-07-14' }, token));
  await step('POST /miniapp/profile/init-step identity', () => http('POST', '/miniapp/profile/init-step', { step: 3, identity }, token));
  await step('POST /miniapp/profile/init-step education', () => http('POST', '/miniapp/profile/init-step', { step: 4, educationLevel }, token));
  await step('POST /miniapp/profile/init-step location', () => http('POST', '/miniapp/profile/init-step', {
    step: 5,
    locationProvince: loc.province,
    locationCity: loc.city,
    locationDistrict: loc.district,
  }, token));

  await step('GET /miniapp/profile/basic', () => http('GET', '/miniapp/profile/basic', undefined, token));
  await step('PUT /miniapp/profile/basic', () => http('PUT', '/miniapp/profile/basic', {
    nickname: `接口测试${stamp.slice(-6)}`,
    gender: 'MALE',
    birthday: '1996-07-14',
    height: 172,
    weight: 61,
    identity,
    educationLevel,
    industry,
    occupation,
    annualIncome,
    maritalStatus,
    locationProvince: loc.province,
    locationCity: loc.city,
    locationDistrict: loc.district,
    hometownProvince: loc.province,
    hometownCity: loc.city,
    hometownDistrict: loc.district,
    company: `接口测试公司${stamp.slice(-4)}`,
    schoolName: undefined,
    school: `接口测试大学${stamp.slice(-4)}`,
    major: '软件工程',
  }, token));
  await step('GET /miniapp/profile/basic after save', () => http('GET', '/miniapp/profile/basic', undefined, token));

  await step('GET /miniapp/profile/home-detail before audits', () => http('GET', '/miniapp/profile/home-detail', undefined, token));

  await step('GET /miniapp/profile/avatar', () => http('GET', '/miniapp/profile/avatar', undefined, token));
  await step('POST /miniapp/profile/avatar', () => http('POST', '/miniapp/profile/avatar', {
    avatarSource: 'ALBUM',
    avatarUrl: `https://example.test/prd01/${stamp}/avatar.jpg`,
    thumbUrl: `https://example.test/prd01/${stamp}/avatar-thumb.jpg`,
  }, token));

  await step('GET /miniapp/verify/status before submit', () => http('GET', '/miniapp/verify/status', undefined, token));
  await step('GET /miniapp/verify/real-name', () => http('GET', '/miniapp/verify/real-name', undefined, token));
  await step('POST /miniapp/verify/real-name', () => http('POST', '/miniapp/verify/real-name', {
    realName: `测${stamp.slice(-2)}`,
    idCardNo: '11010519960101001X',
    singleCommitmentChecked: true,
  }, token));
  await step('GET /miniapp/verify/education', () => http('GET', '/miniapp/verify/education', undefined, token));

  const educationBase = {
    schoolName: `接口测试大学${stamp.slice(-4)}`,
    educationLevel,
    educationAgreementChecked: true,
  };
  await step('POST /miniapp/verify/education STUDENT_CARD', () => http('POST', '/miniapp/verify/education', {
    ...educationBase,
    educationUserType: 'STUDENT',
    educationMethod: 'STUDENT_CARD',
    materialUrls: [`https://example.test/prd01/${stamp}/student-card-a.jpg`],
  }, token));
  await step('POST /miniapp/verify/education CHSI', () => http('POST', '/miniapp/verify/education', {
    ...educationBase,
    educationUserType: 'MAINLAND_GRADUATE',
    educationMethod: 'CHSI',
    chsiCode: `CHSI${stamp.slice(-8)}`,
  }, token));
  await step('POST /miniapp/verify/education DIPLOMA_NO', () => http('POST', '/miniapp/verify/education', {
    ...educationBase,
    educationUserType: 'MAINLAND_GRADUATE',
    educationMethod: 'DIPLOMA_NO',
    diplomaNo: `DIP${stamp}`,
    certificateName: `测${stamp.slice(-2)}`,
  }, token));
  await step('POST /miniapp/verify/education MATERIAL_UPLOAD', () => http('POST', '/miniapp/verify/education', {
    ...educationBase,
    educationUserType: 'MAINLAND_GRADUATE',
    educationMethod: 'MATERIAL_UPLOAD',
    certificateName: `测${stamp.slice(-2)}`,
    materialUrls: [
      `https://example.test/prd01/${stamp}/diploma-a.jpg`,
      `https://example.test/prd01/${stamp}/diploma-b.jpg`,
    ],
  }, token));

  await step('GET /miniapp/profile/albums before add', () => http('GET', '/miniapp/profile/albums', undefined, token));
  const album1 = await step('POST /miniapp/profile/albums add', () => http('POST', '/miniapp/profile/albums', {
    mediaUrl: `https://example.test/prd01/${stamp}/album-a.jpg`,
    thumbUrl: `https://example.test/prd01/${stamp}/album-a-thumb.jpg`,
    fileSizeBytes: 512000,
    sortOrder: 1,
  }, token));
  const album2 = await step('PUT /miniapp/profile/albums/{id} replace', () => http('PUT', `/miniapp/profile/albums/${album1.mediaId}`, {
    mediaUrl: `https://example.test/prd01/${stamp}/album-a-replace.jpg`,
    thumbUrl: `https://example.test/prd01/${stamp}/album-a-replace-thumb.jpg`,
    fileSizeBytes: 512000,
    sortOrder: 1,
  }, token));
  await step('DELETE /miniapp/profile/albums/{id}', () => http('DELETE', `/miniapp/profile/albums/${album2.mediaId}`, undefined, token));
  await step('POST /miniapp/profile/albums keep active', () => http('POST', '/miniapp/profile/albums', {
    mediaUrl: `https://example.test/prd01/${stamp}/album-active.jpg`,
    thumbUrl: `https://example.test/prd01/${stamp}/album-active-thumb.jpg`,
    fileSizeBytes: 512000,
    sortOrder: 2,
  }, token));
  await step('GET /miniapp/profile/albums after changes', () => http('GET', '/miniapp/profile/albums', undefined, token));

  await step('GET /miniapp/profile/background', () => http('GET', '/miniapp/profile/background', undefined, token));
  await step('PUT /miniapp/profile/background', () => http('PUT', '/miniapp/profile/background', {
    mediaUrl: `https://example.test/prd01/${stamp}/profile-bg.jpg`,
    thumbUrl: `https://example.test/prd01/${stamp}/profile-bg-thumb.jpg`,
    fileSizeBytes: 512000,
    sortOrder: 1,
  }, token));
  await step('DELETE /miniapp/profile/background', () => http('DELETE', '/miniapp/profile/background', undefined, token));
  await step('PUT /miniapp/profile/background keep active', () => http('PUT', '/miniapp/profile/background', {
    mediaUrl: `https://example.test/prd01/${stamp}/profile-bg-active.jpg`,
    thumbUrl: `https://example.test/prd01/${stamp}/profile-bg-active-thumb.jpg`,
    fileSizeBytes: 512000,
    sortOrder: 2,
  }, token));

  await step('GET /miniapp/profile/introduction', () => http('GET', '/miniapp/profile/introduction', undefined, token));
  await step('POST /miniapp/profile/introduction', () => http('POST', '/miniapp/profile/introduction', {
    aboutMe: `我是本轮接口测试用户${stamp}，喜欢认真生活、稳定沟通和持续学习，希望通过真实接口验证资料审核闭环。`,
  }, token));

  await step('GET /miniapp/profile/about-me', () => http('GET', '/miniapp/profile/about-me', undefined, token));
  await step('POST /miniapp/profile/about-me', () => http('POST', '/miniapp/profile/about-me', {
    questionKey: 'interests',
    contentText: `本轮接口测试${stamp}：周末喜欢徒步、做饭和听音乐。`,
  }, token));

  await step('PUT /miniapp/profile/dating-goal', () => http('PUT', '/miniapp/profile/dating-goal', { code: datingGoal }, token));
  await step('PUT /miniapp/profile/emotional-status', () => http('PUT', '/miniapp/profile/emotional-status', { code: emotionalStatus }, token));
  await step('GET /miniapp/profile/tags', () => http('GET', '/miniapp/profile/tags', undefined, token));
  await step('PUT /miniapp/profile/tags', () => http('PUT', '/miniapp/profile/tags', { tagCodes: tags }, token));

  const songs = await step('GET /miniapp/profile/songs/search', () => http('GET', `/miniapp/profile/songs/search?keyword=${encodeURIComponent('晴天')}&limit=3`, undefined, token));
  const song = songs[0] || { songId: `mock-song-${stamp}`, songName: '接口测试歌曲', artistName: 'Mock Artist', coverUrl: `https://example.test/prd01/${stamp}/song.jpg` };
  await step('PUT /miniapp/profile/favorite-song', () => http('PUT', '/miniapp/profile/favorite-song', song, token));

  await step('GET /miniapp/profile/wechat-id', () => http('GET', '/miniapp/profile/wechat-id', undefined, token));
  await step('PUT /miniapp/profile/wechat-id', () => http('PUT', '/miniapp/profile/wechat-id', { wechatId: `wx${stamp.slice(-10)}` }, token));

  await step('GET /miniapp/profile/voice-intro', () => http('GET', '/miniapp/profile/voice-intro', undefined, token));
  await step('POST /miniapp/profile/voice-intro', () => http('POST', '/miniapp/profile/voice-intro', {
    voiceUrl: `https://example.test/prd01/${stamp}/voice.mp3`,
    duration: 18,
  }, token));
  await step('GET /miniapp/profile/voice-intro after submit', () => http('GET', '/miniapp/profile/voice-intro', undefined, token));
  await step('DELETE /miniapp/profile/voice-intro', () => http('DELETE', '/miniapp/profile/voice-intro', undefined, token));

  await step('GET /miniapp/profile/access-status', () => http('GET', '/miniapp/profile/access-status', undefined, token));
  await step('GET /miniapp/profile/home-detail after all', () => http('GET', '/miniapp/profile/home-detail', undefined, token));
  await step('GET /miniapp/verify/status after all', () => http('GET', '/miniapp/verify/status', undefined, token));

  const adminChecks = [
    ['admin real-name list/detail by userId', `/admin/verify/real-name/list?page=1&size=10&userId=${userId}`, (id) => `/admin/verify/real-name/${id}`],
    ['admin education list/detail by userId', `/admin/verify/education/list?page=1&size=10&userId=${userId}`, (id) => `/admin/verify/education/${id}`],
    ['admin avatar list/detail by userId', `/admin/verify/avatar/list?page=1&size=10&userId=${userId}`, (id) => `/admin/verify/avatar/${id}`],
    ['admin moderation photos list/detail by userId', `/admin/moderation/photos/list?page=1&size=20&userId=${userId}`, (id) => `/admin/moderation/photos/${id}`],
    ['admin moderation texts list/detail by userId', `/admin/moderation/texts/list?page=1&size=20&userId=${userId}`, (id) => `/admin/moderation/texts/${id}`],
  ];
  for (const [name, path, detailPath] of adminChecks) {
    await step(name, async () => {
      const page = await http('GET', path, undefined, adminToken);
      const first = page.records?.[0];
      const detail = first ? await http('GET', detailPath(first.id), undefined, adminToken) : null;
      return {
        total: page.total,
        current: page.current,
        size: page.size,
        records: page.records?.length || 0,
        sample: (page.records || []).slice(0, 5).map((item) => ({
          id: item.id,
          status: item.status,
          submitTime: item.submitTime,
          type: item.imageType || item.textType || item.educationMaterialSummary || item.avatarUrl || item.realName || item.idCard,
          reason: item.rejectReason || null,
        })),
        detailChecked: Boolean(detail),
      };
    });
  }

  const failed = results.filter((item) => !item.ok);
  console.log('\nSUMMARY');
  console.log(JSON.stringify({
    userId,
    phone,
    stamp,
    passed: results.length - failed.length,
    failed: failed.length,
    failedNames: failed.map((item) => item.name),
  }, null, 2));
  if (failed.length) process.exit(1);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
