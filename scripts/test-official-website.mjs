import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = relative => {
  const absolute = path.join(root, relative);
  assert.ok(existsSync(absolute), `${relative} 不存在`);
  return readFileSync(absolute, 'utf8');
};
const app = read('website/src/App.tsx');
const api = read('website/src/api.ts');
const css = read('website/src/styles.css');
const sql = read('deploy/sql/prod/096_website_activity_platform.sql');
const reportMigration = read('deploy/sql/prod/097_website_public_report_contact.sql');
const legalMigration = read('deploy/sql/prod/098_website_legal_publication.sql');
const copyMigration = read('deploy/sql/prod/099_website_legal_copy_update.sql');
const adminMenuMigration = read('deploy/sql/prod/100_website_admin_menu_parent_permission.sql');
const docker = read('frontend/Dockerfile');
const gateway = read('deploy/nginx-prod/conf.d/default.conf');
const client = read('frontend/nginx.conf');
const imageStore = read('backend/src/main/java/com/spacetime/common/util/OssUtil.java');
const imageConfig = read('backend/src/main/java/com/spacetime/common/config/OssConfig.java');
const adminService = read('backend/src/main/java/com/spacetime/admin/service/impl/WebsiteAdminServiceImpl.java');
const prodSettings = read('backend/src/main/resources/application-prod.yml');
const prodDeploy = read('deploy/scripts/deploy-prod-local.sh');
const websiteService = read('backend/src/main/java/com/spacetime/website/service/impl/WebsiteServiceImpl.java');
const backendWorkflow = read('.github/workflows/deploy-backend-prod.yml');
const frontendWorkflow = read('.github/workflows/deploy-admin-prod.yml');

assert.match(app, /时空邂逅面向大学生提供线下活动信息与报名服务。/);
assert.match(app, /免费报名/);
for (const route of ['/activities', '/publish', '/my', '/chats', '/login', '/business', '/about', '/report', '/legal/user-agreement', '/legal/privacy-policy']) {
  assert.ok(app.includes(`path="${route}"`) || app.includes(`to="${route}"`), `缺少路由 ${route}`);
}
for (const value of ['沪ICP备2026033427号-1', '用户协议', '隐私政策', '不良信息举报', '线下预计费用', '免费报名', 'aria-modal="true"']) {
  assert.ok(app.includes(value), `缺少页面要素 ${value}`);
}
for (const operation of ['sendCode:', 'login:', 'publish:', 'register:', 'startConversation:', 'sendMessage:', 'upload:', 'report:', 'publicReport:']) {
  assert.ok(api.includes(operation), `缺少真实接口 ${operation}`);
}
assert.match(api, /fetch\(`\/api\/website\$\{path\}`/);
assert.match(css, /:focus-visible/);
assert.match(css, /prefers-reduced-motion/);
assert.match(css, /@media\(max-width:700px\)/);
assert.match(docker, /COPY --from=website-build \/app\/website\/dist \/usr\/share\/nginx\/html\/website\//);
assert.match(gateway, /location \/api\/website\//);
const adminHttpsGateway = gateway.slice(gateway.lastIndexOf('server_name admin.shikongxiehou.com;'));
assert.match(adminHttpsGateway, /location = \/website\/activities\s*\{/);
assert.match(adminHttpsGateway, /rewrite \^ \/index\.html break;/);
assert.match(client, /location \/website\//);
assert.match(imageStore, /metadata\.setObjectAcl\(CannedAccessControlList\.Private\)/);
assert.match(imageConfig, /websiteBucketName/);
assert.match(imageStore, /websiteBucketName\(\)/);
assert.match(adminService, /toWebsiteSignedUrl/);
assert.match(prodSettings, /WEBSITE_OSS_BUCKET_NAME/);
assert.match(prodDeploy, /WEBSITE_OSS_BUCKET_NAME/);
assert.match(prodDeploy, /\[ "\$WEBSITE_OSS_BUCKET_NAME" != "\$OSS_BUCKET_NAME" \]/);
assert.match(websiteService, /publicMedia\(Long mediaId\)/);
assert.match(websiteService, /privateMedia\(Long userId, Long mediaId\)/);
assert.match(websiteService, /publicReport\(PublicReportRequest request\)/);
assert.match(app, /无需登录也可举报公开活动或反馈隐私问题/);
assert.match(reportMigration, /ALTER TABLE website_report MODIFY COLUMN reporter_id BIGINT NULL/);
assert.match(reportMigration, /ADD COLUMN contact VARCHAR\(120\) NULL/);
assert.match(legalMigration, /'USER_AGREEMENT','1\.1','官网用户服务协议'/);
assert.match(legalMigration, /'PRIVACY_POLICY','1\.1','官网隐私政策'/);
assert.match(legalMigration, /'PUBLISHED'/);
assert.match(copyMigration, /'USER_AGREEMENT','1\.2','官网用户服务协议'/);
assert.match(copyMigration, /'PRIVACY_POLICY','1\.2','官网隐私政策'/);
assert.doesNotMatch(copyMigration, /小程序账号分别管理|创建独立的网站账号/);
assert.ok(backendWorkflow.includes('deploy/sql/prod/096_website_activity_platform.sql'));
assert.ok(backendWorkflow.includes('deploy/sql/prod/097_website_public_report_contact.sql'));
assert.ok(backendWorkflow.includes('deploy/sql/prod/098_website_legal_publication.sql'));
assert.ok(backendWorkflow.includes('deploy/sql/prod/099_website_legal_copy_update.sql'));
assert.ok(backendWorkflow.includes('deploy/sql/prod/100_website_admin_menu_parent_permission.sql'));
assert.match(adminMenuMigration, /INSERT INTO sys_role_menu\(role_id,menu_id\)/);
assert.match(adminMenuMigration, /website:activity:list/);
assert.match(sql, /status VARCHAR\(20\) NOT NULL DEFAULT 'DRAFT'/);
assert.match(sql, /'DRAFT' WHERE NOT EXISTS\(SELECT 1 FROM website_legal_document WHERE document_type='USER_AGREEMENT'/);
assert.match(sql, /'DRAFT' WHERE NOT EXISTS\(SELECT 1 FROM website_legal_document WHERE document_type='PRIVACY_POLICY'/);
assert.match(frontendWorkflow, /for document in USER_AGREEMENT PRIVACY_POLICY/);
assert.match(frontendWorkflow, /expectedVersion="1\.2"/);
for (const table of ['website_user', 'website_activity', 'website_registration', 'website_conversation', 'website_message', 'website_report', 'website_audit_log', 'website_legal_document']) {
  assert.ok(sql.includes(`CREATE TABLE IF NOT EXISTS ${table}`), `缺少表 ${table}`);
}
assert.doesNotMatch(app, /支付订单|立即支付|会员权益|智能匹配|婚恋推荐/);
assert.doesNotMatch(app, /小程序账号分别管理|网站活动账号|不提供线上付费功能|本网站不提供婚恋匹配/);
console.log('官网活动平台源码与部署契约校验通过');
