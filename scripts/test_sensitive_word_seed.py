import unittest
from generate_sensitive_word_seed import assign_categories, trim_word, seed_sql

class SensitiveWordSeedTest(unittest.TestCase):
    def test_global_dedup_and_deterministic_single_candidate_category(self):
        entries=[('OTHER','词甲'),('OTHER','词甲'),('POLITICS','词甲'),('OTHER','词乙')]
        a=assign_categories(entries);b=assign_categories(reversed(entries))
        self.assertEqual(a,b)
        self.assertEqual(2,len(a))
        self.assertEqual({'词甲','词乙'},{word for category,word in a})
        self.assertIn(dict((word,category) for category,word in a)['词甲'],['OTHER','POLITICS'])
        self.assertEqual('OTHER',dict((word,category) for category,word in a)['词乙'])

    def test_unicode_trim_keeps_internal_characters_and_raw_case(self):
        self.assertEqual('ABC',trim_word(chr(0x85)+chr(0xa0)+' ABC'+chr(0x3000)))
        self.assertEqual('Ａ b',trim_word(' Ａ b '))
        self.assertNotEqual(trim_word('A'),trim_word('a'))

    def test_seed_is_atomic_empty_table_only_and_has_no_removed_columns(self):
        sql=seed_sql([('OTHER','引号'+chr(39)+chr(92)+'符号')],'DISABLED')
        for field in ['source_file','source_key','active_marker',chr(96)+'version'+chr(96),'ON DUPLICATE KEY']:
            self.assertNotIn(field,sql)
        self.assertIn('FOR UPDATE',sql)
        self.assertIn('ROLLBACK',sql)
        self.assertIn('RESIGNAL',sql)
        self.assertIn('IF existing_count = 0 THEN',sql)
        self.assertIn('DISABLED',sql)
        self.assertIn('CONVERT(0x',sql)


    def test_deployment_status_is_required_and_sql_delimiter_preserves_lines(self):
        from apply_sensitive_word_migration import statements, deployment_lock_name
        sql=seed_sql([('OTHER','词甲')],'REQUIRED')
        self.assertIn('@sensitive_word_initial_status',sql)
        self.assertIn("SIGNAL SQLSTATE '45000'",sql)
        chunks=list(statements(sql))
        self.assertEqual(4,len(chunks))
        self.assertTrue(chunks[1].startswith('CREATE PROCEDURE'))
        self.assertIn(chr(10),chunks[1])
        self.assertLessEqual(len(deployment_lock_name('a'*200)),64)

if __name__=='__main__':unittest.main()
