import assert from 'node:assert/strict';
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

const read = (relativePath) => {
  const absolutePath = path.join(root, relativePath);
  assert.ok(existsSync(absolutePath), `${relativePath} 不存在`);
  return readFileSync(absolutePath, 'utf8');
};

const assertIncludes = (content, expected, file) => {
  assert.ok(content.includes(expected), `${file} 缺少 ${expected}`);
};

const assertNotIncludes = (content, forbidden, file) => {
  assert.ok(!content.includes(forbidden), `${file} 不应包含 ${forbidden}`);
};

const listFiles = (relativeDir) => {
  const absoluteDir = path.join(root, relativeDir);
  assert.ok(existsSync(absoluteDir), `${relativeDir} 不存在`);
  return readdirSync(absoluteDir)
    .map((name) => path.join(relativeDir, name))
    .filter((relativePath) => statSync(path.join(root, relativePath)).isFile());
};

const workflows = [
  '.github/workflows/deploy-admin-prod.yml',
  '.github/workflows/deploy-backend-prod.yml',
];

for (const file of workflows) {
  const content = read(file);
  for (const forbidden of ['yuanxi', 'yudao', '123.57.83.82', 'backend-java', 'yuanxi-admin-react']) {
    assertNotIncludes(content, forbidden, file);
  }
  assertIncludes(content, 'spacetime', file);
  assertIncludes(content, 'branches: [ master ]', file);
  assertIncludes(content, 'runs-on: self-hosted', file);
  assertIncludes(content, 'deploy/scripts/deploy-prod-local.sh', file);
  assertIncludes(content, 'ALIYUN_REGISTRY_PASSWORD', file);
  assertNotIncludes(content, 'PROD_DB_PASSWORD', file);
  assertNotIncludes(content, 'PROD_REDIS_PASSWORD', file);
  assertNotIncludes(content, 'PROD_OSS_ACCESS_KEY_ID', file);
  assertNotIncludes(content, 'PROD_OSS_ACCESS_KEY_SECRET', file);
}

const adminWorkflow = read('.github/workflows/deploy-admin-prod.yml');
assertIncludes(adminWorkflow, 'spacetime-admin-prod', '.github/workflows/deploy-admin-prod.yml');
assertNotIncludes(adminWorkflow, 'ADMIN_SSL_CERT_PEM', '.github/workflows/deploy-admin-prod.yml');
assertNotIncludes(adminWorkflow, 'ADMIN_SSL_CERT_KEY', '.github/workflows/deploy-admin-prod.yml');
assertIncludes(adminWorkflow, 'registry.cn-hangzhou.aliyuncs.com', '.github/workflows/deploy-admin-prod.yml');
assertIncludes(adminWorkflow, 'ALIYUN_REGISTRY_USER_NAME: bobo2026', '.github/workflows/deploy-admin-prod.yml');
assertIncludes(adminWorkflow, 'deploy/scripts/deploy-prod-local.sh admin', '.github/workflows/deploy-admin-prod.yml');

const backendWorkflow = read('.github/workflows/deploy-backend-prod.yml');
assertIncludes(backendWorkflow, 'spacetime-backend-prod', '.github/workflows/deploy-backend-prod.yml');
for (const expected of [
  'registry.cn-hangzhou.aliyuncs.com',
  'ALIYUN_REGISTRY_USER_NAME: bobo2026',
  'deploy/scripts/deploy-prod-local.sh backend',
]) {
  assertIncludes(backendWorkflow, expected, '.github/workflows/deploy-backend-prod.yml');
}

const compose = read('deploy/docker-compose.prod.yml');
for (const expected of ['nginx', 'admin-web', 'backend', 'spacetime-prod', '/mnt/data/spacetime-prod/secrets/prod.env']) {
  assertIncludes(compose, expected, 'deploy/docker-compose.prod.yml');
}

const nginx = read('deploy/nginx-prod/conf.d/default.conf');
for (const expected of [
  'server_name admin.shikongxiehou.com',
  'return 301 https://$host$request_uri',
  'location /api/',
  'rewrite ^/api/(.*)$ /$1 break',
  'proxy_pass http://$backend_upstream',
  'location /',
  'proxy_pass http://$admin_upstream',
]) {
  assertIncludes(nginx, expected, 'deploy/nginx-prod/conf.d/default.conf');
}

const envExample = read('deploy/server.prod.env.example');
for (const expected of [
  'ALIYUN_CR_REGISTRY=registry.cn-hangzhou.aliyuncs.com',
  'ALIYUN_REGISTRY_USER_NAME=bobo2026',
  'ALIYUN_REGISTRY_PASSWORD=',
  'ADMIN_IMAGE=registry.cn-hangzhou.aliyuncs.com/bobo2026/spacetime-admin-prod:latest',
  'BACKEND_IMAGE=registry.cn-hangzhou.aliyuncs.com/bobo2026/spacetime-backend-prod:latest',
  'DB_HOST=',
  'DB_NAME=',
  'DB_USER=shikongxiehou',
  'REDIS_USERNAME=r-bp182i9r17g2ybq30g',
  'OSS_ENDPOINT=',
  'OSS_BUCKET_NAME=',
  'OSS_ACCESS_KEY_ID=',
  'OSS_ACCESS_KEY_SECRET=',
]) {
  assertIncludes(envExample, expected, 'deploy/server.prod.env.example');
}

const prodConfig = read('backend/src/main/resources/application-prod.yml');
for (const expected of [
  '${DB_NAME}',
  '${REDIS_USERNAME}',
  '${OSS_ACCESS_KEY_ID}',
  '${OSS_ACCESS_KEY_SECRET}',
  '${OSS_BUCKET_NAME}',
]) {
  assertIncludes(prodConfig, expected, 'backend/src/main/resources/application-prod.yml');
}

const devConfig = read('backend/src/main/resources/application-dev.yml');
for (const expected of [
  'rm-bp11i1ru1405fb2iqio.mysql.rds.aliyuncs.com',
  '${DEV_DB_USER',
  '${DEV_DB_PASSWORD',
  'r-bp182i9r17g2ybq30gpd.redis.rds.aliyuncs.com',
  '${DEV_REDIS_USERNAME',
  '${DEV_REDIS_PASSWORD',
  '${DEV_OSS_ACCESS_KEY_ID',
  '${DEV_OSS_ACCESS_KEY_SECRET',
]) {
  assertIncludes(devConfig, expected, 'backend/src/main/resources/application-dev.yml');
}

const frontendRequest = read('frontend/src/api/request.ts');
assertIncludes(frontendRequest, "baseURL: '/api'", 'frontend/src/api/request.ts');

const sslPem = read('deploy/nginx-prod/ssl/admin.shikongxiehou.com.pem');
assertIncludes(sslPem, 'BEGIN CERTIFICATE', 'deploy/nginx-prod/ssl/admin.shikongxiehou.com.pem');
assertNotIncludes(sslPem, 'PRIVATE KEY', 'deploy/nginx-prod/ssl/admin.shikongxiehou.com.pem');

const deployScript = read('deploy/scripts/deploy-prod-local.sh');
for (const expected of [
  'SPACETIME_PROD_ENV_FILE',
  'docker pull "$ADMIN_IMAGE"',
  'docker pull "$BACKEND_IMAGE"',
  'docker run -d',
  'deploy/sql/prod/*.sql',
  'docker login "$ALIYUN_CR_REGISTRY"',
]) {
  assertIncludes(deployScript, expected, 'deploy/scripts/deploy-prod-local.sh');
}
assertNotIncludes(deployScript, 'secrets.', 'deploy/scripts/deploy-prod-local.sh');

read('backend/Dockerfile');
read('frontend/Dockerfile');

const healthController = read('backend/src/main/java/com/spacetime/common/controller/HealthController.java');
assertIncludes(healthController, '@GetMapping("/health")', 'backend/src/main/java/com/spacetime/common/controller/HealthController.java');
assertIncludes(healthController, 'R.ok("ok")', 'backend/src/main/java/com/spacetime/common/controller/HealthController.java');

const ossUtil = read('backend/src/main/java/com/spacetime/common/util/OssUtil.java');
assertIncludes(ossUtil, 'replaceFirst("^https?://", "")', 'backend/src/main/java/com/spacetime/common/util/OssUtil.java');

const prodSqlFiles = listFiles('deploy/sql/prod').filter((file) => file.endsWith('.sql'));
assert.ok(prodSqlFiles.length > 0, 'deploy/sql/prod 缺少生产迁移 SQL');
for (const file of prodSqlFiles) {
  const content = read(file);
  assert.ok(/CREATE TABLE IF NOT EXISTS/i.test(content) || /INSERT\s+IGNORE/i.test(content) || /ALTER TABLE/i.test(content), `${file} 缺少幂等迁移语句`);
  assert.ok(!/DROP\s+TABLE/i.test(content), `${file} 禁止包含 DROP TABLE`);
}

const secretLikeChecks = [
  'LTAI',
  'accessKeySecret ',
  'shikongxiehou@',
  '@Yu8168907',
];
for (const file of [
  ...workflows,
  'backend/src/main/resources/application-prod.yml',
  'backend/src/main/resources/application-dev.yml',
  'deploy/server.prod.env.example',
]) {
  const content = read(file);
  for (const marker of secretLikeChecks) {
    assertNotIncludes(content, marker, file);
  }
}

console.log('生产部署静态配置校验通过');
