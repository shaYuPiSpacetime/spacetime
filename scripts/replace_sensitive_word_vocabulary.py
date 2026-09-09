"""Replace a verified initial vocabulary atomically; preserve unrelated manual words."""
import argparse,json,hashlib,re
from datetime import datetime
from pathlib import Path
import pymysql
from apply_sensitive_word_migration import ROOT,load_env
from generate_sensitive_word_seed import collect_entries,assign_categories


def load_seed_baseline(sql_file,summary_file):
    summary=json.loads(summary_file.read_text(encoding='utf-8'))
    payload=sql_file.read_bytes()
    if hashlib.sha256(payload).hexdigest()!=summary['sqlSha256']:
        raise ValueError('original generated SQL checksum mismatch')
    pairs=re.findall(r'^\(CONVERT\(0x([0-9a-f]+) USING utf8mb4\), CONVERT\(0x([0-9a-f]+) USING utf8mb4\),',payload.decode('utf-8'),re.MULTILINE)
    rows=[(bytes.fromhex(cat).decode('utf-8'),bytes.fromhex(word).decode('utf-8')) for cat,word in pairs]
    if len(rows)!=summary['initializedRecords'] or len({word for cat,word in rows})!=len(rows):
        raise ValueError('original seed row count mismatch')
    return rows,summary


def replace_rows(conn,old_rows,new_rows,status,dry_run=False):
    if status not in ('ENABLED','DISABLED'):raise ValueError('explicit initial status required')
    old={word:category for category,word in old_rows}
    new={word:category for category,word in new_rows}
    if not old or not new or len(old)!=len(old_rows) or len(new)!=len(new_rows):raise ValueError('nonempty globally unique inputs required')
    conn.begin()
    try:
        with conn.cursor() as c:
            c.execute('SELECT revision FROM content_sensitive_word_revision WHERE id=1 AND deleted=0 FOR UPDATE')
            revision=c.fetchone()
            if not revision:raise ValueError('revision row missing')
            c.execute('SELECT id,word,category_code,status,remark,created_by,updated_by FROM content_sensitive_word WHERE deleted=0')
            rows=c.fetchall();active={r[1]:r for r in rows}
            if len(active)!=len(rows):raise ValueError('existing active duplicates')
            c.execute('SELECT word,category_code FROM content_sensitive_word WHERE deleted=1')
            retired={(r[0],r[1]) for r in c.fetchall()}
            if all((w,cat) in retired for w,cat in old.items()) and all(w in active and active[w][2]==cat and active[w][3]==status for w,cat in new.items()):
                conn.rollback()
                return {'result':'ALREADY_REPLACED','oldRowsDeleted':0,'newRowsInserted':0,'initialWords':len(new),'initialStatus':status,'revision':revision[0]}
            if any(w not in active or active[w][2]!=cat for w,cat in old.items()):raise ValueError('original initial vocabulary does not match; no changes applied')
            original=[active[w] for w in old]
            if any(r[4] not in (None,'') or r[5] is not None or r[6] is not None for r in original):raise ValueError('initial record was manually changed; no changes applied')
            extra={w:r for w,r in active.items() if w not in old}
            if set(extra)&set(new):raise ValueError('new vocabulary conflicts with unrelated manual words')
            report={'result':'READY' if dry_run else 'REPLACED','oldRowsDeleted':len(original),'newRowsInserted':len(new),'initialWords':len(new),'initialStatus':status,'preservedManualWords':len(extra),'revisionBefore':revision[0]}
            if dry_run:conn.rollback();return report
            ids=[r[0] for r in original]
            for start in range(0,len(ids),500):
                batch=ids[start:start+500]
                c.execute('UPDATE content_sensitive_word SET deleted=1 WHERE deleted=0 AND id IN ('+','.join(['%s']*len(batch))+')',batch)
                if c.rowcount!=len(batch):raise ValueError('initial row set changed')
            for start in range(0,len(new_rows),500):
                c.executemany('INSERT INTO content_sensitive_word (category_code,word,status) VALUES (%s,%s,%s)',[(cat,word,status) for cat,word in new_rows[start:start+500]])
            c.execute('UPDATE content_sensitive_word_revision SET revision=revision+1,update_time=CURRENT_TIMESTAMP WHERE id=1 AND deleted=0')
            if c.rowcount!=1:raise ValueError('revision update failed')
            c.execute('SELECT id,word,category_code,status FROM content_sensitive_word WHERE deleted=0')
            final=c.fetchall();by_word={r[1]:r for r in final}
            if len(final)!=len(new)+len(extra) or any(w not in by_word or by_word[w][2]!=cat or by_word[w][3]!=status for w,cat in new.items()):raise ValueError('replacement verification failed')
            new_ids=[by_word[w][0] for w in new]
            report.update({'revision':revision[0]+1,'newIdMin':min(new_ids),'newIdMax':max(new_ids),'activeRows':len(final)})
        conn.commit();return report
    except BaseException:
        conn.rollback();raise


if __name__=='__main__':
    parser=argparse.ArgumentParser(description=__doc__)
    old_source=parser.add_mutually_exclusive_group(required=True)
    old_source.add_argument('--old-archive',type=Path)
    old_source.add_argument('--old-seed-sql',type=Path)
    parser.add_argument('--old-seed-summary',type=Path)
    parser.add_argument('--archive',type=Path,required=True)
    parser.add_argument('--initial-status',choices=['ENABLED','DISABLED'],required=True)
    parser.add_argument('--env-file',type=Path,default=ROOT/'backend/.env.local')
    parser.add_argument('--dry-run',action='store_true')
    parser.add_argument('--report',type=Path,required=True)
    args=parser.parse_args()
    if args.old_archive:
        old_entries,old_summary=collect_entries(args.old_archive)
        old_rows=assign_categories(old_entries)
    else:
        if not args.old_seed_summary:parser.error('--old-seed-summary is required with --old-seed-sql')
        old_rows,old_summary=load_seed_baseline(args.old_seed_sql,args.old_seed_summary)
    new_entries,new_summary=collect_entries(args.archive)
    cfg=load_env(args.env_file)
    conn=pymysql.connect(host=cfg['DEV_DB_HOST'],port=int(cfg['DEV_DB_PORT']),user=cfg['DEV_DB_USER'],password=cfg['DEV_DB_PASSWORD'],database=cfg['DEV_DB_NAME'],charset='utf8mb4',connect_timeout=5,read_timeout=60,write_timeout=60,autocommit=True)
    try:result=replace_rows(conn,old_rows,assign_categories(new_entries),args.initial_status,args.dry_run)
    finally:conn.close()
    result.update({'executedAt':datetime.now().astimezone().isoformat(),'oldArchiveSha256':old_summary['archiveSha256'],'newArchiveSha256':new_summary['archiveSha256'],'categoryCount':new_summary['categoryCount'],'dryRun':args.dry_run})
    args.report.write_text(json.dumps(result,ensure_ascii=False,indent=2),encoding='utf-8')
    print(json.dumps(result,ensure_ascii=False))
