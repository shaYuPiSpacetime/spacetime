const apiUrl = process.env.API_URL || "http://127.0.0.1:8080";
const adminAccount = process.env.ADMIN_ACCOUNT || "peter";
const adminPassword = process.env.ADMIN_PASSWORD || "000000";

async function request(method, path, body, token) {
  const headers = { "Content-Type": "application/json" };
  if (token) headers["X-Auth-Token"] = token;
  const response = await fetch(apiUrl + path, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const text = await response.text();
  const json = text ? JSON.parse(text) : {};
  if (!response.ok || json.code !== 200) {
    throw new Error(`${method} ${path} failed: http=${response.status}, body=${text}`);
  }
  return json.data;
}

const dictType = "app_profile_tag";

const categories = [
  ["MBTI", "MBTI", 10],
  ["PERSONALITY", "性格", 20],
  ["HOBBY", "爱好", 30],
  ["SPORT", "运动", 40],
  ["FOOTPRINT", "足迹", 50],
];

const tags = [
  ["IT_GIRL", "IT女神", 1, "HOBBY"],
  ["OUTDOOR_LOVER", "户外发烧友", 2, "SPORT"],
  ["LOVE_TRAVEL", "热爱旅行", 3, "FOOTPRINT"],
  ["ESPORTS", "电子竞技", 4, "HOBBY"],

  ["ISTJ", "ISTJ物流师", 11, "MBTI"],
  ["ISFJ", "ISFJ守卫者", 12, "MBTI"],
  ["INFJ", "INFJ提倡者", 13, "MBTI"],
  ["INTJ", "INTJ建筑师", 14, "MBTI"],
  ["ISTP", "ISTP技术专家", 15, "MBTI"],
  ["ISFP", "ISFP艺术家", 16, "MBTI"],
  ["INFP", "INFP调停者", 17, "MBTI"],
  ["INTP", "INTP逻辑学家", 18, "MBTI"],
  ["ESTP", "ESTP企业家", 19, "MBTI"],
  ["ESFP", "ESFP表演者", 20, "MBTI"],
  ["ENFP", "ENFP竞选者", 21, "MBTI"],
  ["ENTP", "ENTP辩论家", 22, "MBTI"],
  ["ESTJ", "ESTJ总经理", 23, "MBTI"],
  ["ESFJ", "ESFJ执政官", 24, "MBTI"],
  ["ENFJ", "ENFJ主人公", 25, "MBTI"],
  ["ENTJ", "ENTJ指挥官", 26, "MBTI"],

  ["OUT_COLD_IN_HOT", "外冷内热", 31, "PERSONALITY"],
  ["FEW_WORDS", "话不多", 32, "PERSONALITY"],
  ["OPTIMISTIC", "乐观开朗", 33, "PERSONALITY"],
  ["DETAIL_CONTROL", "细节控", 34, "PERSONALITY"],

  ["MOVIE_LOVER", "电影爱好者", 41, "HOBBY"],
  ["FOODIE", "美食探索", 42, "HOBBY"],
  ["READING", "阅读爱好", 43, "HOBBY"],
  ["PET_LOVER", "宠物小伙伴", 44, "HOBBY"],

  ["RUNNING", "跑步", 51, "SPORT"],
  ["FITNESS", "健身", 52, "SPORT"],
  ["HIKING", "徒步", 53, "SPORT"],
  ["CYCLING", "骑行", 54, "SPORT"],

  ["CITY_WALK", "城市漫游", 61, "FOOTPRINT"],
  ["SEA_LOVER", "看海计划", 62, "FOOTPRINT"],
  ["MOUNTAIN_LOVER", "山野派", 63, "FOOTPRINT"],
  ["TRAVEL_MEMORY", "旅行收藏", 64, "FOOTPRINT"],
];

const login = await request("POST", "/admin/login", {
  account: adminAccount,
  password: adminPassword,
});
const token = login.token;

async function children(parentId) {
  return request("GET", `/admin/dict-data/children?dictType=${dictType}&parentId=${parentId}`, undefined, token);
}

async function upsert(current, body) {
  if (current) {
    await request("PUT", `/admin/dict-data/${current.id}`, body, token);
    return "updated";
  }
  await request("POST", "/admin/dict-data", body, token);
  return "created";
}

let created = 0;
let updated = 0;
const rootItems = await children(0);
const rootByCode = new Map(rootItems.map((item) => [item.dictValue, item]));

for (const [code, label, sort] of categories) {
  const result = await upsert(rootByCode.get(code), {
    dictType,
    parentId: 0,
    dictLabel: label,
    dictValue: code,
    dictSort: sort,
    status: "ENABLED",
    remark: "标签分类",
  });
  if (result === "created") created += 1;
  if (result === "updated") updated += 1;
}

const refreshedRootItems = await children(0);
const categoryByCode = new Map(refreshedRootItems
  .filter((item) => categories.some(([code]) => code === item.dictValue))
  .map((item) => [item.dictValue, item]));

const existingTagsByCode = new Map(refreshedRootItems.map((item) => [item.dictValue, item]));
for (const category of categoryByCode.values()) {
  for (const item of await children(category.id)) {
    existingTagsByCode.set(item.dictValue, item);
  }
}

for (const [code, label, sort, categoryCode] of tags) {
  const category = categoryByCode.get(categoryCode);
  if (!category) {
    throw new Error(`missing tag category: ${categoryCode}`);
  }
  const result = await upsert(existingTagsByCode.get(code), {
    dictType,
    parentId: category.id,
    dictLabel: label,
    dictValue: code,
    dictSort: sort,
    status: "ENABLED",
    remark: "",
  });
  if (result === "created") created += 1;
  if (result === "updated") updated += 1;
}

console.log(`PROFILE_TAG_PARENT_TREE_SEEDED created=${created} updated=${updated}`);
