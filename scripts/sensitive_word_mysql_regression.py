"""Real MySQL seed regressions in a newly-created task-owned database only."""
import argparse,base64,json,os,re,threading,time,unittest,uuid
from pathlib import Path
from concurrent.futures import ThreadPoolExecutor
import pymysql
from generate_sensitive_word_seed import collect_entries,assign_categories,seed_sql

ROOT=Path(__file__).resolve().parents[1]
CFG={}
for line in (ROOT/'backend/.env.local').read_text(encoding='utf-8-sig').splitlines():
    if '=' in line and not line.lstrip().startswith('#'):
        k,v=line.split('=',1);CFG[k.strip()]=v.strip().strip('"').strip("'")
DB='sw_regression_20260908_'+uuid.uuid4().hex[:8]
def connection(database=None):
    return pymysql.connect(host=CFG['DEV_DB_HOST'],port=int(CFG['DEV_DB_PORT']),user=CFG['DEV_DB_USER'],password=CFG['DEV_DB_PASSWORD'],
       database=database or DB,charset='utf8mb4',connect_timeout=5,read_timeout=60,write_timeout=60,autocommit=True)
from apply_sensitive_word_migration import statements,execute_sql,run_seed

RESULTS=[]
ROWS=[]
class SeedDatabaseTest(unittest.TestCase):
    def setUp(self):
        self.conn=connection()
        with self.conn.cursor() as c:
            c.execute('DROP TRIGGER IF EXISTS reject_sensitive_seed_test')
            c.execute('DELETE FROM content_sensitive_word')
            c.execute('UPDATE content_sensitive_word_revision SET revision=1 WHERE id=1')
    def tearDown(self):self.conn.close()
    def scalar(self,sql,args=None):
        with self.conn.cursor() as c:c.execute(sql,args);return c.fetchone()[0]
    def test_01_full_corpus_and_nonempty_skip_preserves_edits_and_deleted_rows(self):
        sql=seed_sql(ROWS,'DISABLED')
        result=run_seed(self.conn,sql)
        self.assertEqual(len(ROWS),self.scalar('SELECT COUNT(*) FROM content_sensitive_word'))
        self.assertEqual(len({category for category, _ in ROWS}),self.scalar('SELECT COUNT(DISTINCT category_code) FROM content_sensitive_word'))
        self.assertEqual(0,self.scalar("SELECT COUNT(*) FROM content_sensitive_word WHERE status <> 'DISABLED'"))
        with self.conn.cursor() as c:
            c.execute('SELECT category_code,word FROM content_sensitive_word')
            self.assertEqual(set(ROWS),set(c.fetchall()))
            c.execute("UPDATE content_sensitive_word SET word='维护后的原词',status='ENABLED',remark='不可覆盖' ORDER BY id LIMIT 1")
        before=self.scalar('SELECT revision FROM content_sensitive_word_revision WHERE id=1')
        self.assertIn('SKIPPED_NONEMPTY',str(run_seed(self.conn,sql)))
        self.assertEqual(1,self.scalar("SELECT COUNT(*) FROM content_sensitive_word WHERE word='维护后的原词' AND remark='不可覆盖'"))
        with self.conn.cursor() as c:c.execute('UPDATE content_sensitive_word SET deleted=1')
        self.assertIn('SKIPPED_NONEMPTY',str(run_seed(self.conn,sql)))
        self.assertEqual(0,self.scalar('SELECT COUNT(*) FROM content_sensitive_word WHERE deleted=0'))
        self.assertEqual(before,self.scalar('SELECT revision FROM content_sensitive_word_revision WHERE id=1'))
    def test_02_special_text_roundtrip_and_raw_exact_comparison(self):
        words=["a'b","a"+chr(92)+"b","a\nb","a\tb","a"+chr(0)+"b","emoji😀","A","a","Ａ","百分%_!"]
        run_seed(self.conn,seed_sql([('OTHER',word) for word in words],'ENABLED'))
        with self.conn.cursor() as c:c.execute('SELECT word FROM content_sensitive_word');actual={r[0] for r in c.fetchall()}
        self.assertEqual(set(words),actual)
        for word in ('A','a','Ａ'):
            self.assertEqual(1,self.scalar('SELECT COUNT(*) FROM content_sensitive_word WHERE word=%s',(word,)))
    def test_03_failure_in_second_batch_rolls_back_words_and_revision(self):
        with self.conn.cursor() as c:
            c.execute("CREATE TRIGGER reject_sensitive_seed_test BEFORE INSERT ON content_sensitive_word FOR EACH ROW BEGIN IF NEW.word='FAIL_SECOND_BATCH' THEN SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='intentional isolated regression'; END IF; END")
        rows=[('OTHER','batch-'+str(i)) for i in range(600)]+[('OTHER','FAIL_SECOND_BATCH')]
        with self.assertRaises(pymysql.MySQLError):run_seed(self.conn,seed_sql(rows,'DISABLED'))
        self.assertEqual(0,self.scalar('SELECT COUNT(*) FROM content_sensitive_word'))
        self.assertEqual(1,self.scalar('SELECT revision FROM content_sensitive_word_revision WHERE id=1'))
    def test_04_two_connections_initialize_once(self):
        sql=seed_sql([('OTHER','concurrent-'+str(i)) for i in range(1001)],'DISABLED')
        barrier=threading.Barrier(2)
        def invoke():
            c=connection()
            try:barrier.wait();return run_seed(c,sql)
            finally:c.close()
        with ThreadPoolExecutor(max_workers=2) as pool:
            outcomes=list(pool.map(lambda _:invoke(),range(2)))
        self.assertEqual(1001,self.scalar('SELECT COUNT(*) FROM content_sensitive_word'))
        self.assertEqual(2,self.scalar('SELECT revision FROM content_sensitive_word_revision WHERE id=1'))
        self.assertEqual(1,sum('SKIPPED_NONEMPTY' in str(outcome) for outcome in outcomes))
    def test_06_required_status_refuses_missing_policy_before_writing(self):
        sql=seed_sql([('OTHER','explicit-policy')],'REQUIRED')
        with self.assertRaises(pymysql.MySQLError):run_seed(self.conn,sql)
        self.assertEqual(0,self.scalar('SELECT COUNT(*) FROM content_sensitive_word'))
        with self.conn.cursor() as c:c.execute("SET @sensitive_word_initial_status='DISABLED'")
        self.assertIn('INITIALIZED',str(run_seed(self.conn,sql)))
        self.assertEqual(1,self.scalar("SELECT COUNT(*) FROM content_sensitive_word WHERE status='DISABLED'"))

    def test_05_schema_idempotent_operation_menu_and_removed_fields(self):
        sql=(ROOT/'deploy/sql/prod/081_content_sensitive_word_schema.sql').read_text(encoding='utf-8')
        execute_sql(self.conn,sql);execute_sql(self.conn,sql)
        with self.conn.cursor() as c:c.execute('SHOW COLUMNS FROM content_sensitive_word');fields={r[0] for r in c.fetchall()}
        self.assertFalse(fields & {'version','source_file','source_key','active_marker'})
        self.assertEqual(1,self.scalar("SELECT COUNT(*) FROM sys_menu WHERE path='/sensitive-words' AND parent_id IN (SELECT id FROM sys_menu WHERE parent_id=0 AND menu_name='运营中心' AND menu_type='M' AND deleted=0) AND deleted=0"))
        self.assertEqual(4,self.scalar("SELECT COUNT(*) FROM sys_menu WHERE perms LIKE 'sensitive-word:%%' AND deleted=0"))

if __name__=='__main__':
    parser=argparse.ArgumentParser();parser.add_argument('--archive',type=Path,required=True);args=parser.parse_args()
    ROWS=assign_categories(collect_entries(args.archive)[0])
    work=ROOT/'tmp/sensitive-word-implementation'
    work.mkdir(parents=True,exist_ok=True)
    (work/'corpus.tsv').write_text(chr(10).join(category+chr(9)+base64.b64encode(word.encode()).decode() for category,word in ROWS),encoding='utf-8')
    source=connection(CFG['DEV_DB_NAME'])
    with source.cursor() as c:
        c.execute('SHOW DATABASES LIKE %s',(DB,))
        if c.fetchone():raise RuntimeError('refuse existing regression database')
        c.execute('CREATE DATABASE '+DB+' CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci')
        definitions=[]
        for table in ['sys_role','sys_menu','sys_role_menu','community_audit_record','app_user_audit_record','external_provider_task']:
            c.execute('SHOW CREATE TABLE '+table);definitions.append(c.fetchone()[1])
    source.close()
    conn=connection()
    with conn.cursor() as c:
        for ddl in definitions:c.execute(ddl)
    execute_sql(conn,(ROOT/'deploy/sql/prod/081_content_sensitive_word_schema.sql').read_text(encoding='utf-8'));conn.close()
    state={'database':DB,'createdBy':'sensitive-word-regression','source':'configured DEV MySQL','createdAt':time.strftime('%Y-%m-%d %H:%M:%S')}
    (ROOT/'tmp/sensitive-word-implementation/isolated-db.json').write_text(json.dumps(state,indent=2),encoding='utf-8')
    start=time.perf_counter();result=unittest.TextTestRunner(verbosity=2).run(unittest.defaultTestLoader.loadTestsFromTestCase(SeedDatabaseTest))
    output={**state,'testsRun':result.testsRun,'failures':len(result.failures),'errors':len(result.errors),'elapsedSeconds':round(time.perf_counter()-start,3),'fullCorpusWords':len(ROWS)}
    (ROOT/'docs/test-artifacts/sensitive-word-mysql-seed-20260908.json').write_text(json.dumps(output,indent=2),encoding='utf-8')
    print(json.dumps(output));raise SystemExit(0 if result.wasSuccessful() else 1)
