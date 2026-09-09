import json, unittest, uuid
from pathlib import Path
import pymysql
from apply_sensitive_word_migration import ROOT, load_env
from replace_sensitive_word_vocabulary import replace_rows

CFG=load_env(ROOT/'backend/.env.local')
DB='sw_replace_20260909_'+uuid.uuid4().hex[:8]
def connect(database):
    return pymysql.connect(host=CFG['DEV_DB_HOST'],port=int(CFG['DEV_DB_PORT']),user=CFG['DEV_DB_USER'],password=CFG['DEV_DB_PASSWORD'],database=database,charset='utf8mb4',autocommit=True)

class ReplacementTest(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        source=connect(CFG['DEV_DB_NAME'])
        with source.cursor() as c:
            c.execute('SHOW DATABASES LIKE %s',(DB,))
            if c.fetchone():raise RuntimeError('test database already exists')
            c.execute('CREATE DATABASE '+DB+' CHARACTER SET utf8mb4')
            definitions=[]
            for table in ['content_sensitive_word','content_sensitive_word_revision']:
                c.execute('SHOW CREATE TABLE '+table);definitions.append(c.fetchone()[1])
        source.close()
        cls.conn=connect(DB)
        with cls.conn.cursor() as c:
            for ddl in definitions:c.execute(ddl)
            c.execute('INSERT INTO content_sensitive_word_revision (id,revision) VALUES (1,1)')
    @classmethod
    def tearDownClass(cls):cls.conn.close()
    def setUp(self):
        with self.conn.cursor() as c:
            c.execute('SELECT DATABASE()');assert c.fetchone()[0]==DB and DB.startswith('sw_replace_20260909_')
            c.execute('DROP TRIGGER IF EXISTS reject_replacement')
            c.execute('DELETE FROM content_sensitive_word')
            c.execute('UPDATE content_sensitive_word_revision SET revision=1 WHERE id=1')
            c.executemany("INSERT INTO content_sensitive_word (word,category_code,status) VALUES (%s,%s,'DISABLED')",[('old-a','OTHER'),('old-b','POLITICS')])
        self.old=[('OTHER','old-a'),('POLITICS','old-b')]
        self.new=[('OTHER','old-a'),('POLITICS','new-word')]
    def scalar(self,sql):
        with self.conn.cursor() as c:c.execute(sql);return c.fetchone()[0]
    def test_replace_and_repeat_preserve_extra(self):
        with self.conn.cursor() as c:c.execute("INSERT INTO content_sensitive_word (word,category_code,status,created_by) VALUES ('manual-word','OTHER','DISABLED',99)")
        r=replace_rows(self.conn,self.old,self.new,'ENABLED')
        self.assertEqual('REPLACED',r['result']);self.assertEqual(2,r['oldRowsDeleted'])
        self.assertEqual(2,self.scalar('SELECT COUNT(*) FROM content_sensitive_word WHERE deleted=1'))
        self.assertEqual(2,self.scalar("SELECT COUNT(*) FROM content_sensitive_word WHERE deleted=0 AND status='ENABLED'"))
        self.assertEqual(1,self.scalar("SELECT COUNT(*) FROM content_sensitive_word WHERE word='manual-word' AND deleted=0 AND created_by=99"))
        self.assertEqual('ALREADY_REPLACED',replace_rows(self.conn,self.old,self.new,'ENABLED')['result'])
        self.assertEqual(2,self.scalar('SELECT revision FROM content_sensitive_word_revision WHERE id=1'))
    def test_partial_insert_failure_rolls_back_deletes_and_revision(self):
        with self.conn.cursor() as c:c.execute("CREATE TRIGGER reject_replacement BEFORE INSERT ON content_sensitive_word FOR EACH ROW BEGIN IF NEW.word='FAIL_SECOND_BATCH' THEN SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='isolated failure'; END IF; END")
        new=[('OTHER','new-'+str(i)) for i in range(510)]+[('OTHER','FAIL_SECOND_BATCH')]
        with self.assertRaises(pymysql.MySQLError):replace_rows(self.conn,self.old,new,'ENABLED')
        self.assertEqual(2,self.scalar('SELECT COUNT(*) FROM content_sensitive_word WHERE deleted=0'))
        self.assertEqual(0,self.scalar('SELECT COUNT(*) FROM content_sensitive_word WHERE deleted=1'))
        self.assertEqual(1,self.scalar('SELECT revision FROM content_sensitive_word_revision WHERE id=1'))
    def test_reject_changed_initial_data(self):
        with self.conn.cursor() as c:c.execute("UPDATE content_sensitive_word SET remark='admin changed',updated_by=99 WHERE word='old-a'")
        with self.assertRaises(ValueError):replace_rows(self.conn,self.old,self.new,'ENABLED')
        self.assertEqual(0,self.scalar('SELECT COUNT(*) FROM content_sensitive_word WHERE deleted=1'))
    def test_reject_conflict_with_manual_word(self):
        with self.conn.cursor() as c:c.execute("INSERT INTO content_sensitive_word (word,category_code,status,created_by) VALUES ('new-word','OTHER','DISABLED',99)")
        with self.assertRaises(ValueError):replace_rows(self.conn,self.old,self.new,'ENABLED')
        self.assertEqual(3,self.scalar('SELECT COUNT(*) FROM content_sensitive_word WHERE deleted=0'))
    def test_dry_run_does_not_change_data(self):
        self.assertEqual('READY',replace_rows(self.conn,self.old,self.new,'ENABLED',dry_run=True)['result'])
        self.assertEqual(2,self.scalar('SELECT COUNT(*) FROM content_sensitive_word WHERE deleted=0'))
        self.assertEqual(1,self.scalar('SELECT revision FROM content_sensitive_word_revision WHERE id=1'))

if __name__=='__main__':
    result=unittest.TextTestRunner(verbosity=2).run(unittest.defaultTestLoader.loadTestsFromTestCase(ReplacementTest))
    (ROOT/'docs/test-artifacts/sensitive-word-replacement-tests-20260909.json').write_text(json.dumps({'tests':result.testsRun,'failures':len(result.failures),'errors':len(result.errors),'database':DB,'isolated':True},indent=2),encoding='utf-8')
    raise SystemExit(0 if result.wasSuccessful() else 1)
