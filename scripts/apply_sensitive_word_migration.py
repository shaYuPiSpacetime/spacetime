"""Apply the sensitive-word schema and optional seed to the explicitly configured database.
The initial seed status is mandatory; existing rows, including deleted rows, are preserved.
"""
import argparse,hashlib,json
from pathlib import Path
import pymysql

ROOT=Path(__file__).resolve().parents[1]

def statements(sql):
    delimiter=';';pending=[]
    for line in sql.splitlines():
        if line.strip().upper().startswith('DELIMITER '):
            if pending:raise ValueError('unexpected pending SQL')
            delimiter=line.strip().split(maxsplit=1)[1];continue
        if not pending and (not line.strip() or line.lstrip().startswith('--')):continue
        pending.append(line)
        if line.rstrip().endswith(delimiter):
            statement='\n'.join(pending).rstrip()[:-len(delimiter)].strip()
            if statement:yield statement
            pending=[]
    if pending:raise ValueError('unterminated SQL')

def execute_sql(conn,sql):
    results=[]
    with conn.cursor() as cursor:
        for statement in statements(sql):
            cursor.execute(statement)
            if cursor.description:results.append(cursor.fetchall())
            while cursor.nextset():
                if cursor.description:results.append(cursor.fetchall())
    return results

def deployment_lock_name(database):
    return 'sw_seed_'+hashlib.sha256(database.encode()).hexdigest()[:40]

def run_seed(conn,sql):
    with conn.cursor() as c:
        c.execute('SELECT DATABASE()');database=c.fetchone()[0]
        lock=deployment_lock_name(database)
        c.execute('SELECT GET_LOCK(%s,30)',(lock,))
        if c.fetchone()[0]!=1:raise TimeoutError('sensitive word migration is already running')
    try:return execute_sql(conn,sql)
    finally:
        with conn.cursor() as c:c.execute('SELECT RELEASE_LOCK(%s)',(lock,))

def load_env(path):
    cfg={}
    for line in path.read_text(encoding='utf-8-sig').splitlines():
        if '=' in line and not line.lstrip().startswith('#'):
            k,v=line.split('=',1);cfg[k.strip()]=v.strip().strip('"').strip("'")
    return cfg

def apply(env_file,schema_only,status):
    if not schema_only and status not in ('ENABLED','DISABLED'):
        raise ValueError('select --initial-status before initializing real words')
    cfg=load_env(env_file)
    conn=pymysql.connect(host=cfg['DEV_DB_HOST'],port=int(cfg['DEV_DB_PORT']),user=cfg['DEV_DB_USER'],password=cfg['DEV_DB_PASSWORD'],
        database=cfg['DEV_DB_NAME'],charset='utf8mb4',connect_timeout=5,read_timeout=60,write_timeout=60,autocommit=True)
    try:
        schema=(ROOT/'deploy/sql/prod/081_content_sensitive_word_schema.sql').read_text(encoding='utf-8')
        sql=schema
        if not schema_only:
            with conn.cursor() as c:c.execute('SET @sensitive_word_initial_status=%s',(status,))
            sql+='\n'+(ROOT/'deploy/sql/prod/082_content_sensitive_word_seed.sql').read_text(encoding='utf-8')
        result=run_seed(conn,sql)
        with conn.cursor() as c:
            c.execute('SELECT COUNT(*),SUM(deleted=0),SUM(deleted=0 AND status=\'ENABLED\') FROM content_sensitive_word')
            counts=c.fetchone()
            c.execute("SELECT COUNT(*) FROM sys_menu WHERE path='/sensitive-words' AND parent_id IN (SELECT id FROM sys_menu WHERE parent_id=0 AND menu_name='运营中心' AND menu_type='M' AND deleted=0) AND deleted=0")
            menus=c.fetchone()[0]
        return {'schemaOnly':schema_only,'initialStatus':status,'totalRows':counts[0],'activeRows':int(counts[1] or 0),'enabledRows':int(counts[2] or 0),
                'operationCenterMenus':menus,'seedResults':result}
    finally:conn.close()

if __name__=='__main__':
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--env-file',type=Path,default=ROOT/'backend/.env.local')
    parser.add_argument('--schema-only',action='store_true')
    parser.add_argument('--initial-status',choices=['ENABLED','DISABLED'])
    parser.add_argument('--report',type=Path)
    args=parser.parse_args()
    if not args.schema_only and not args.initial_status:parser.error('--initial-status is required when seeding')
    result=apply(args.env_file,args.schema_only,args.initial_status)
    payload=json.dumps(result,ensure_ascii=False,indent=2)
    if args.report:args.report.write_text(payload,encoding='utf-8')
    print(payload)
