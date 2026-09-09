import os,json,re,subprocess,base64,sys
from pathlib import Path
from generate_sensitive_word_seed import collect_entries,assign_categories
ROOT=Path(__file__).resolve().parents[1]
os.chdir(ROOT)
cfg={}
for line in Path('backend/.env.local').read_text(encoding='utf-8-sig').splitlines():
 if '=' in line and not line.lstrip().startswith('#'):
  k,v=line.split('=',1);cfg[k.strip()]=v.strip().strip('"').strip("'")
state=json.loads(Path('tmp/sensitive-word-implementation/isolated-db.json').read_text())
assert state['createdBy']=='sensitive-word-regression' and re.fullmatch('sw_regression_20260908_[a-f0-9]{8}',state['database'])
corpus=Path('tmp/sensitive-word-implementation/corpus.tsv').resolve()
if not corpus.exists():
 raise RuntimeError('Generate the corpus fixture before this run')
env=os.environ.copy()
env['JAVA_HOME']=os.environ.get('SENSITIVE_WORD_JAVA_HOME','C:/Users/50449/.jdks/ms-21.0.11')
env['PATH']=env['JAVA_HOME']+'/bin;'+env['PATH']
env['MAVEN_OPTS']='-Xmx256m -XX:ActiveProcessorCount=2'
env['SENSITIVE_WORD_TEST_DB_URL']='jdbc:mysql://'+cfg['DEV_DB_HOST']+':'+cfg['DEV_DB_PORT']+'/'+state['database']+'?useUnicode=true&characterEncoding=UTF-8&serverTimezone=Asia/Shanghai&useSSL=false&rewriteBatchedStatements=true'
import pymysql
with pymysql.connect(host=cfg['DEV_DB_HOST'],port=int(cfg['DEV_DB_PORT']),user=cfg['DEV_DB_USER'],password=cfg['DEV_DB_PASSWORD'],database=cfg['DEV_DB_NAME'],charset='utf8mb4') as source:
 with source.cursor() as c:
  c.execute("SELECT config_value FROM app_config WHERE config_key=%s AND deleted=0 AND status='ENABLED'",('community.post_max_text_length',))
  value=c.fetchone()
  if not value:raise RuntimeError('Community post maximum length configuration missing')
  env['SENSITIVE_WORD_POST_MAX_LENGTH']=str(int(value[0]))
env['SENSITIVE_WORD_TEST_DB_USER']=cfg['DEV_DB_USER'];env['SENSITIVE_WORD_TEST_DB_PASSWORD']=cfg['DEV_DB_PASSWORD'];env['SENSITIVE_WORD_TEST_CORPUS_PATH']=str(corpus)
log=Path('tmp/sensitive-word-implementation/backend-db-regression.log')
maven=os.environ.get('SENSITIVE_WORD_MAVEN','D:/apache-maven-3.6.3-bin/apache-maven-3.6.3/bin/mvn.cmd')
repo=os.environ.get('SENSITIVE_WORD_MAVEN_REPO','D:/apache-maven-3.6.3-bin/repository')
with log.open('w',encoding='utf-8') as f:
 code=subprocess.run([maven,'-f','backend/pom.xml','-Dmaven.repo.local='+repo,'-DargLine=-Xmx256m -XX:ActiveProcessorCount=2','-Dtest='+os.environ.get('SENSITIVE_WORD_TEST_CLASSES','SensitiveWordDatabaseIntegrationTest,SensitiveWordControllerTest,SensitiveWordServiceImplTest,SensitiveWordDaoImplTest,LocalSensitiveWordServiceImplTest,WechatLocalSensitiveWordTest,WechatSensitiveWordEvidenceTest,CommunityServiceImplTest,CommunityAdminServiceImplTest,CommunityAuditPolicyTest,WechatContentSafetyProviderTest,WechatAccessTokenCacheIsolationTest,OpenTextAuditServiceImplTest,ModerationAdminServiceImplTest,SensitiveWordInterceptorIntegrationTest,SensitiveWordBusinessMatrixTest'),'test'],env=env,stdout=f,stderr=subprocess.STDOUT).returncode
print('Database regression exit',code)
print('\n'.join(log.read_text(encoding='utf-8',errors='replace').splitlines()[-90:]))
raise SystemExit(code)
