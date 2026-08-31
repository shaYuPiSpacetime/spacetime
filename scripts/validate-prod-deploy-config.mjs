import assert from 'node:assert/strict';
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const acrRegistry = 'crpi-agc08x7zneglt1wg.cn-hangzhou.personal.cr.aliyuncs.com';

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
  assertIncludes(content, 'runs-on: ubuntu-latest', file);
  assertNotIncludes(content, 'runs-on: self-hosted', file);
  assertIncludes(content, 'appleboy/ssh-action', file);
  assertIncludes(content, 'appleboy/scp-action', file);
  assertIncludes(content, "source: 'deploy/scripts/*,deploy/nginx-prod/conf.d/*", file);
  assertIncludes(content, "target: '/mnt/data/spacetime-prod'", file);
  assertIncludes(content, 'host: ${{ env.PROD_SERVER_HOST }}', file);
  assertIncludes(content, 'username: ${{ env.PROD_SERVER_USER }}', file);
  assertIncludes(content, 'password: ${{ secrets.ALIYUN_PASSWORD }}', file);
  assertIncludes(content, 'cd "${{ env.PROD_DEPLOY_DIR }}"', file);
  assertIncludes(content, 'scripts/deploy-prod-local.sh', file);
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
assertIncludes(adminWorkflow, acrRegistry, '.github/workflows/deploy-admin-prod.yml');
assertIncludes(adminWorkflow, "ALIYUN_REGISTRY_USER_NAME: '393841724@qq.com'", '.github/workflows/deploy-admin-prod.yml');
assertIncludes(adminWorkflow, 'PROD_SERVER_HOST: 112.124.59.146', '.github/workflows/deploy-admin-prod.yml');
assertIncludes(adminWorkflow, 'PROD_DEPLOY_DIR: /mnt/data/spacetime-prod/deploy', '.github/workflows/deploy-admin-prod.yml');
assertIncludes(adminWorkflow, 'bash scripts/deploy-prod-local.sh admin', '.github/workflows/deploy-admin-prod.yml');
assertIncludes(adminWorkflow, 'NGINX_IMAGE_TAG: spacetime-nginx-prod', '.github/workflows/deploy-admin-prod.yml');
assertIncludes(adminWorkflow, 'docker pull nginx:1.27-alpine', '.github/workflows/deploy-admin-prod.yml');
assertIncludes(adminWorkflow, 'Validate static demo bundle', '.github/workflows/deploy-admin-prod.yml');
assertIncludes(adminWorkflow, 'Build admin image with static demos', '.github/workflows/deploy-admin-prod.yml');
assertIncludes(adminWorkflow, 'Static demo pages:', '.github/workflows/deploy-admin-prod.yml');
assertIncludes(adminWorkflow, "'docs/静态Demo/**'", '.github/workflows/deploy-admin-prod.yml');
assertNotIncludes(adminWorkflow, "'docs/静态Demo/04-商业化（VIP、千寻币、解锁与资产中心）/html/**'", '.github/workflows/deploy-admin-prod.yml');
assertNotIncludes(adminWorkflow, "'docs/静态Demo/shared/**'", '.github/workflows/deploy-admin-prod.yml');
assertIncludes(adminWorkflow, '-f frontend/Dockerfile', '.github/workflows/deploy-admin-prod.yml');
assertIncludes(adminWorkflow, '\n            .', '.github/workflows/deploy-admin-prod.yml');

const backendWorkflow = read('.github/workflows/deploy-backend-prod.yml');
assertIncludes(backendWorkflow, 'spacetime-backend-prod', '.github/workflows/deploy-backend-prod.yml');
for (const expected of [
  acrRegistry,
  "ALIYUN_REGISTRY_USER_NAME: '393841724@qq.com'",
  'PROD_SERVER_HOST: 112.124.59.146',
  'PROD_DEPLOY_DIR: /mnt/data/spacetime-prod/deploy',
  'bash scripts/migrate-prod-db.sh',
  'deploy/sql/prod/071_prd03_message_mobile_contract.sql',
  'deploy/sql/prod/072_prd03_admin_menu_visibility.sql',
  'deploy/sql/prod/073_prd03_platform_message_plaintext.sql',
  'deploy/sql/prod/074_prd03_remove_message_kms.sql',
  'deploy/sql/prod/075_prd03_tim_message_lookup_index.sql',
  'deploy/sql/prod/076_prd03_im_account_sdk_app_id.sql',
  'deploy/sql/prod/077_prd01_wechat_content_security.sql',
  'bash scripts/deploy-prod-local.sh backend',
  'NGINX_IMAGE_TAG: spacetime-nginx-prod',
  'docker pull nginx:1.27-alpine',
]) {
  assertIncludes(backendWorkflow, expected, '.github/workflows/deploy-backend-prod.yml');
}
for (const forbidden of [
  'secrets.COMMUNITY_CONTENT_SECURITY_CALLBACK_TOKEN',
  'ENVIRON["COMMUNITY_CONTENT_SECURITY_CALLBACK_TOKEN"]',
]) {
  assertNotIncludes(backendWorkflow, forbidden, '.github/workflows/deploy-backend-prod.yml');
}

const compose = read('deploy/docker-compose.prod.yml');
for (const expected of [
  'nginx',
  'admin-web',
  'backend',
  'spacetime-prod',
  '/mnt/data/spacetime-prod/secrets/prod.env',
  `${acrRegistry}/bobo2026/bobo2026:spacetime-admin-prod`,
  `${acrRegistry}/bobo2026/bobo2026:spacetime-backend-prod`,
  `${acrRegistry}/bobo2026/bobo2026:spacetime-nginx-prod`,
]) {
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
  `ALIYUN_CR_REGISTRY=${acrRegistry}`,
  'ALIYUN_REGISTRY_USER_NAME=393841724@qq.com',
  'ALIYUN_REGISTRY_PASSWORD=',
  'ADMIN_IMAGE_NAME=bobo2026',
  'ADMIN_IMAGE_TAG=spacetime-admin-prod',
  'BACKEND_IMAGE_NAME=bobo2026',
  'BACKEND_IMAGE_TAG=spacetime-backend-prod',
  `NGINX_IMAGE=${acrRegistry}/bobo2026/bobo2026:spacetime-nginx-prod`,
  `ADMIN_IMAGE=${acrRegistry}/bobo2026/bobo2026:spacetime-admin-prod`,
  `BACKEND_IMAGE=${acrRegistry}/bobo2026/bobo2026:spacetime-backend-prod`,
  'DB_HOST=',
  'DB_NAME=',
  'DB_USER=shikongxiehou',
  'REDIS_USERNAME=r-bp182i9r17g2ybq30g',
  'OSS_ENDPOINT=https://oss-cn-shanghai.aliyuncs.com',
  'OSS_BUCKET_NAME=shikongxiehou',
  'OSS_ACCESS_KEY_ID=',
  'OSS_ACCESS_KEY_SECRET=',
  'SMS_PROVIDER=aliyun',
  'SMS_ACCESS_KEY_ID=',
  'SMS_ACCESS_KEY_SECRET=',
  'SMS_ENDPOINT=dysmsapi.aliyuncs.com',
  'SMS_SIGN_NAME=上海兴家立业网络科技',
  'SMS_TEMPLATE_CODE=SMS_336060313',
  'WECHAT_PAY_APP_ID=wx03e8cd2d1380c465',
  'WECHAT_PAY_MCH_ID=',
  'WECHAT_PAY_API_V3_KEY=',
  'WECHAT_PAY_CERT_SERIAL_NO=',
  'WECHAT_PAY_NOTIFY_URL=https://admin.shikongxiehou.com/api/miniapp/payment/wechat/notify',
  'WECHAT_MINIAPP_APP_ID=wx03e8cd2d1380c465',
  'WECHAT_MINIAPP_APP_SECRET=',
  'PRD01_CONTENT_SECURITY_PROVIDER=wechat',
  'COMMUNITY_CONTENT_SECURITY_PROVIDER=wechat',
  'COMMUNITY_CONTENT_SECURITY_CALLBACK_TOKEN=',
  'TENCENT_IM_ENABLED=false',
  'TENCENT_IM_SDK_APP_ID=0',
  'TENCENT_IM_SECRET_KEY=',
  'TENCENT_IM_ADMINISTRATOR=administrator',
  'TENCENT_IM_REST_BASE_URL=https://console.tim.qq.com',
  'TENCENT_IM_CALLBACK_PATH_TOKEN=',
  'TENCENT_IM_CALLBACK_AUTH_TOKEN=',
  'TENCENT_IM_USER_SIG_EXPIRE_SECONDS=86400',
  'TENCENT_IM_PROTOCOL_VERSION=1',
  'TENCENT_IM_CONNECT_TIMEOUT_MILLIS=3000',
  'TENCENT_IM_REQUEST_TIMEOUT_MILLIS=5000',
]) {
  assertIncludes(envExample, expected, 'deploy/server.prod.env.example');
}

const prodConfig = read('backend/src/main/resources/application-prod.yml');
for (const expected of [
  '${DB_NAME}',
  '${REDIS_USERNAME}',
  '${OSS_ACCESS_KEY_ID}',
  '${OSS_ACCESS_KEY_SECRET}',
  '${OSS_BUCKET_NAME:shikongxiehou}',
  'endpoint: ${OSS_ENDPOINT:https://oss-cn-shanghai.aliyuncs.com}',
  'bucket-name: ${OSS_BUCKET_NAME:shikongxiehou}',
  'provider: ${SMS_PROVIDER:aliyun}',
  'provider: ${PRD01_CONTENT_SECURITY_PROVIDER:wechat}',
]) {
  assertIncludes(prodConfig, expected, 'backend/src/main/resources/application-prod.yml');
}

const devConfigFile = 'backend/src/main/resources/application-dev.yml.example';
const devConfig = read(devConfigFile);
for (const expected of [
  '${DEV_DB_HOST}',
  '${DEV_DB_USER',
  '${DEV_DB_PASSWORD',
  '${DEV_REDIS_HOST}',
  '${DEV_REDIS_USERNAME',
  '${DEV_REDIS_PASSWORD',
  '${DEV_OSS_ENDPOINT:https://oss-cn-shanghai.aliyuncs.com}',
  '${DEV_OSS_BUCKET_NAME:shikongxiehou}',
  '${DEV_OSS_ACCESS_KEY_ID',
  '${DEV_OSS_ACCESS_KEY_SECRET',
]) {
  assertIncludes(devConfig, expected, devConfigFile);
}

const devEnvExample = read('backend/.env.local.example');
for (const expected of [
  'SMS_PROVIDER=mock',
  'SMS_ACCESS_KEY_ID=',
  'SMS_ACCESS_KEY_SECRET=',
  'SMS_ENDPOINT=dysmsapi.aliyuncs.com',
  'SMS_SIGN_NAME=上海兴家立业网络科技',
  'SMS_TEMPLATE_CODE=SMS_336060313',
]) {
  assertIncludes(devEnvExample, expected, 'backend/.env.local.example');
}

const frontendRequest = read('frontend/src/api/request.ts');
assertIncludes(frontendRequest, "baseURL: '/api'", 'frontend/src/api/request.ts');

const sslPem = read('deploy/nginx-prod/ssl/admin.shikongxiehou.com.pem');
assertIncludes(sslPem, 'BEGIN CERTIFICATE', 'deploy/nginx-prod/ssl/admin.shikongxiehou.com.pem');
assertNotIncludes(sslPem, 'PRIVATE KEY', 'deploy/nginx-prod/ssl/admin.shikongxiehou.com.pem');

const deployScript = read('deploy/scripts/deploy-prod-local.sh');
for (const expected of [
  'SPACETIME_PROD_ENV_FILE',
  'registry_password_from_pipeline',
  'docker pull "$ADMIN_IMAGE"',
  'docker pull "$BACKEND_IMAGE"',
  'docker run -d',
  '--network-alias backend',
  '--network-alias admin-web',
  'docker login "$ALIYUN_CR_REGISTRY"',
  '跳过数据库迁移',
  'WECHAT_MINIAPP_APP_ID WECHAT_MINIAPP_APP_SECRET',
  'PRD01_CONTENT_SECURITY_PROVIDER COMMUNITY_CONTENT_SECURITY_PROVIDER',
  'COMMUNITY_CONTENT_SECURITY_CALLBACK_TOKEN',
  'SMS_ACCESS_KEY_ID SMS_ACCESS_KEY_SECRET',
  'SMS_PROVIDER SMS_ENDPOINT SMS_SIGN_NAME SMS_TEMPLATE_CODE',
  'TENCENT_IM_ENABLED TENCENT_IM_SDK_APP_ID TENCENT_IM_SECRET_KEY',
  'TENCENT_IM_ADMINISTRATOR TENCENT_IM_REST_BASE_URL',
  'TENCENT_IM_CALLBACK_PATH_TOKEN TENCENT_IM_CALLBACK_AUTH_TOKEN',
  'TENCENT_IM_USER_SIG_EXPIRE_SECONDS TENCENT_IM_PROTOCOL_VERSION',
  'TENCENT_IM_CONNECT_TIMEOUT_MILLIS TENCENT_IM_REQUEST_TIMEOUT_MILLIS',
  'TENCENT_IM_ENABLED,,',
  'prod.env 缺少腾讯云 TIM 配置',
  'prod.env 腾讯云 TIM 配置 ${key} 必须为正整数',
]) {
  assertIncludes(deployScript, expected, 'deploy/scripts/deploy-prod-local.sh');
}
assertNotIncludes(deployScript, 'secrets.', 'deploy/scripts/deploy-prod-local.sh');
assertNotIncludes(deployScript, 'mysql:8.4', 'deploy/scripts/deploy-prod-local.sh');

const migrateScript = read('deploy/scripts/migrate-prod-db.sh');
for (const expected of [
  'SPACETIME_PROD_ENV_FILE',
  'mysql_client',
  'CREATE DATABASE IF NOT EXISTS',
  'deploy/sql/prod/*.sql',
  'MYSQL_PWD="$DB_PASSWORD"',
  '--default-character-set=utf8mb4',
]) {
  assertIncludes(migrateScript, expected, 'deploy/scripts/migrate-prod-db.sh');
}
assertNotIncludes(migrateScript, 'docker run', 'deploy/scripts/migrate-prod-db.sh');
assertNotIncludes(migrateScript, 'mysql:8.4', 'deploy/scripts/migrate-prod-db.sh');

read('backend/Dockerfile');
const frontendDockerfile = read('frontend/Dockerfile');
assertIncludes(frontendDockerfile, 'COPY frontend/package*.json ./', 'frontend/Dockerfile');
assertIncludes(frontendDockerfile, 'COPY frontend/ ./', 'frontend/Dockerfile');
assertIncludes(frontendDockerfile, 'COPY docs/静态Demo/ /usr/share/nginx/html/demo/', 'frontend/Dockerfile');
assertNotIncludes(frontendDockerfile, 'COPY docs/静态Demo/04-商业化（VIP、千寻币、解锁与资产中心）/html /usr/share/nginx/html/demo', 'frontend/Dockerfile');
assertNotIncludes(frontendDockerfile, 'COPY docs/静态Demo/shared /usr/share/nginx/html/shared', 'frontend/Dockerfile');
assertIncludes(frontendDockerfile, 'index=/usr/share/nginx/html/demo/index.html', 'frontend/Dockerfile');
assertIncludes(frontendDockerfile, "find /usr/share/nginx/html/demo -mindepth 3 -maxdepth 3 -path '*/html/index.html'", 'frontend/Dockerfile');

const dockerignore = read('.dockerignore');
assertIncludes(dockerignore, '!docs/静态Demo/**', '.dockerignore');
assertNotIncludes(dockerignore, '!docs/静态Demo/04-商业化（VIP、千寻币、解锁与资产中心）/html/**', '.dockerignore');
assertIncludes(dockerignore, '**/.DS_Store', '.dockerignore');
assertIncludes(dockerignore, '**/._*', '.dockerignore');

const healthController = read('backend/src/main/java/com/spacetime/common/controller/HealthController.java');
assertIncludes(healthController, '@GetMapping("/health")', 'backend/src/main/java/com/spacetime/common/controller/HealthController.java');
assertIncludes(healthController, 'R.ok("ok")', 'backend/src/main/java/com/spacetime/common/controller/HealthController.java');

const ossUtil = read('backend/src/main/java/com/spacetime/common/util/OssUtil.java');
assertIncludes(ossUtil, 'replaceFirst("^https?://", "")', 'backend/src/main/java/com/spacetime/common/util/OssUtil.java');

const prodSqlFiles = listFiles('deploy/sql/prod').filter((file) => file.endsWith('.sql'));
assert.ok(prodSqlFiles.length > 0, 'deploy/sql/prod 缺少生产迁移 SQL');
for (const file of prodSqlFiles) {
  const content = read(file);
  assert.ok(
    /CREATE TABLE IF NOT EXISTS/i.test(content) ||
      /INSERT\s+IGNORE/i.test(content) ||
      /ON\s+DUPLICATE\s+KEY\s+UPDATE/i.test(content) ||
      /ALTER TABLE/i.test(content),
    `${file} 缺少幂等迁移语句`
  );
  assert.ok(!/DROP\s+TABLE/i.test(content), `${file} 禁止包含 DROP TABLE`);
}

const secretLikeChecks = [
  'LTAI',
  'accessKeySecret ',
  'shikongxiehou@',
  'replace-with-a-strong-password',
];
for (const file of [
  ...workflows,
  'backend/src/main/resources/application-prod.yml',
  'backend/src/main/resources/application-dev.yml.example',
  'backend/.env.local.example',
  'deploy/server.prod.env.example',
]) {
  const content = read(file);
  for (const marker of secretLikeChecks) {
    assertNotIncludes(content, marker, file);
  }
}

console.log('生产部署静态配置校验通过');
