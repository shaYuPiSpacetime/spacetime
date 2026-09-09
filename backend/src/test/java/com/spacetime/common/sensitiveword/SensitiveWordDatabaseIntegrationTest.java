package com.spacetime.common.sensitiveword;

import com.baomidou.mybatisplus.core.MybatisConfiguration;
import com.baomidou.mybatisplus.core.config.GlobalConfig;
import com.baomidou.mybatisplus.extension.spring.MybatisSqlSessionFactoryBean;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.spacetime.admin.dto.request.SensitiveWordSaveReq;
import com.spacetime.admin.service.SensitiveWordService;
import com.spacetime.admin.service.impl.SensitiveWordServiceImpl;
import com.spacetime.common.community.CommunitySecurityConclusion;
import com.spacetime.common.config.*;
import com.spacetime.common.dao.*;
import com.spacetime.common.dao.impl.*;
import com.spacetime.common.mapper.ContentSensitiveWordMapper;
import com.spacetime.common.service.LocalSensitiveWordService;
import com.spacetime.common.service.impl.*;
import com.zaxxer.hikari.*;
import org.apache.ibatis.session.SqlSessionFactory;
import org.junit.jupiter.api.*;
import org.mybatis.spring.SqlSessionTemplate;
import org.springframework.context.annotation.*;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.datasource.DataSourceTransactionManager;
import org.springframework.transaction.annotation.EnableTransactionManagement;
import org.springframework.transaction.support.TransactionTemplate;
import java.nio.file.*;
import java.util.*;
import java.util.concurrent.*;
import static org.junit.jupiter.api.Assertions.*;
import static org.junit.jupiter.api.Assumptions.assumeTrue;
import static org.mockito.Mockito.*;

/** Uses only the task-owned database created by scripts/sensitive_word_mysql_regression.py. */
@TestInstance(TestInstance.Lifecycle.PER_CLASS)
class SensitiveWordDatabaseIntegrationTest {
    static String url,user,password;
    AnnotationConfigApplicationContext context;
    SensitiveWordService service;
    JdbcTemplate jdbc;
    TransactionTemplate tx;
    HikariDataSource primary;
    SensitiveWordReadResources resources;
    SensitiveWordReadDao reader;
    LocalSensitiveWordService notification;

    @Configuration @EnableTransactionManagement
    static class Config {
        @Bean(destroyMethod="close") HikariDataSource dataSource(){
            HikariConfig c=new HikariConfig();c.setJdbcUrl(url);c.setUsername(user);c.setPassword(password);
            c.setMaximumPoolSize(2);c.setMinimumIdle(0);c.setConnectionTimeout(2000);c.setPoolName("sw-test-primary");
            return new HikariDataSource(c);
        }
        @Bean DataSourceTransactionManager transactionManager(HikariDataSource ds){return new DataSourceTransactionManager(ds);}
        @Bean SqlSessionFactory sqlSessionFactory(HikariDataSource ds)throws Exception{
            var f=new MybatisSqlSessionFactoryBean();f.setDataSource(ds);
            var config=new MybatisConfiguration();config.setMapUnderscoreToCamelCase(true);f.setConfiguration(config);
            var global=new GlobalConfig();global.setDbConfig(new GlobalConfig.DbConfig());global.setMetaObjectHandler(new MyMetaObjectHandler());
            f.setGlobalConfig(global);f.setPlugins(new MybatisPlusConfig().mybatisPlusInterceptor());
            var result=f.getObject();result.getConfiguration().addMapper(ContentSensitiveWordMapper.class);return result;
        }
        @Bean ContentSensitiveWordMapper mapper(SqlSessionFactory f){return new SqlSessionTemplate(f).getMapper(ContentSensitiveWordMapper.class);}
        @Bean SensitiveWordDao dao(ContentSensitiveWordMapper mapper){return new SensitiveWordDaoImpl(mapper);}
        @Bean LocalSensitiveWordService notification(){return mock(LocalSensitiveWordService.class);}
        @Bean SensitiveWordService service(SensitiveWordDao dao,LocalSensitiveWordService local){
            return new SensitiveWordServiceImpl(dao,local,new SpringAfterCommitExecutor());
        }
    }
    @BeforeAll void connect(){
        url=System.getenv("SENSITIVE_WORD_TEST_DB_URL");user=System.getenv("SENSITIVE_WORD_TEST_DB_USER");password=System.getenv("SENSITIVE_WORD_TEST_DB_PASSWORD");
        assumeTrue(url!=null&&user!=null&&password!=null,"No authorized isolated MySQL test configuration");
        assertTrue(url.matches("jdbc:mysql://[^/]+/sw_regression_20260908_[a-f0-9]{8}(\\?.*)?"),"Only owned regression database is allowed");
        context=new AnnotationConfigApplicationContext(Config.class);service=context.getBean(SensitiveWordService.class);
        primary=context.getBean(HikariDataSource.class);jdbc=new JdbcTemplate(primary);
        tx=new TransactionTemplate(context.getBean(DataSourceTransactionManager.class));
        resources=new SensitiveWordReadResources(url,user,password,"com.mysql.cj.jdbc.Driver");
        reader=new SensitiveWordReadDaoImpl(resources);notification=context.getBean(LocalSensitiveWordService.class);
    }
    @BeforeEach void emptyOwnedTables(){
        jdbc.update("DELETE FROM content_sensitive_word");
        jdbc.update("UPDATE content_sensitive_word_revision SET revision=1 WHERE id=1");
        reset(notification);
    }
    @AfterAll void close(){if(resources!=null)resources.close();if(context!=null)context.close();}
    SensitiveWordSaveReq req(String word,String status,String remark){
        var r=new SensitiveWordSaveReq();r.setWord(word);r.setCategoryCode("OTHER");r.setStatus(status);r.setRemark(remark);return r;
    }
    long revision(){return jdbc.queryForObject("SELECT revision FROM content_sensitive_word_revision WHERE id=1",Long.class);}
    int count(){return jdbc.queryForObject("SELECT COUNT(*) FROM content_sensitive_word WHERE deleted=0",Integer.class);}

    @Test void DB01_concurrentCreatesSerializeBeforeDuplicateRead()throws Exception{
        var barrier=new CyclicBarrier(2);
        try(var pool=Executors.newFixedThreadPool(2)){
            Callable<Boolean> insert=()->{barrier.await();try{service.create(req("global-duplicate","DISABLED",""));return true;}catch(com.spacetime.common.exception.BusinessException expected){return false;}};
            var a=pool.submit(insert);var b=pool.submit(insert);
            assertNotEquals(a.get(10,TimeUnit.SECONDS),b.get(10,TimeUnit.SECONDS));
        }
        assertEquals(1,count());assertEquals(2,revision());
        service.create(req("A","ENABLED",""));service.create(req("a","ENABLED",""));service.create(req("Ａ","ENABLED",""));
        assertEquals(4,count());
    }
    @Test void DB02_deletedCyclesPatchAndLiteralSearch(){
        long id=service.create(req("percent%_!"+(char)92,"ENABLED","备注"));
        assertEquals(1,service.page(1,20,"%_!"+(char)92,null,null).getTotal());
        long r=revision();service.changeStatus(id,"ENABLED");assertEquals(r,revision());
        service.update(id,req("最新原词","ENABLED",""));service.changeStatus(id,"DISABLED");
        assertEquals("最新原词",service.detail(id).getWord());assertEquals("",service.detail(id).getRemark());
        for(int i=0;i<3;i++){service.delete(id);long next=service.create(req("最新原词","DISABLED",""));assertNotEquals(id,next);id=next;}
        assertEquals(1,count());
    }
    @Test void DB03_rollbackIncludesRevisionAndRefreshWaitsForCommit(){
        assertThrows(IllegalStateException.class,()->tx.execute(s->{
            service.create(req("rollback-word","ENABLED",""));verifyNoInteractions(notification);throw new IllegalStateException("rollback");
        }));
        assertEquals(0,count());assertEquals(1,revision());verifyNoInteractions(notification);
        tx.execute(s->{service.create(req("commit-word","ENABLED",""));verifyNoInteractions(notification);return null;});
        assertEquals(1,count());assertEquals(2,revision());verify(notification,times(1)).requestRefresh();
    }
    @Test void DB04_readerSeesFreshRevisionInsideOldRepeatableRead()throws Exception{
        var repeatableRead=new TransactionTemplate(context.getBean(DataSourceTransactionManager.class));
        repeatableRead.setIsolationLevel(org.springframework.transaction.TransactionDefinition.ISOLATION_REPEATABLE_READ);
        try(var pool=Executors.newSingleThreadExecutor()){
            repeatableRead.execute(s->{
                long old=revision();
                try{pool.submit(()->service.create(req("newly-committed","ENABLED",""))).get(10,TimeUnit.SECONDS);}catch(Exception e){throw new RuntimeException(e);}
                assertEquals(old,revision());assertEquals(old+1,reader.currentRevision());assertEquals(1,reader.selectEnabled().size());
                return null;
            });
        }
    }
    @Test void DB05_primaryPoolFullyOccupiedDoesNotStarveDedicatedReader()throws Exception{
        var barrier=new CyclicBarrier(2);
        try(var pool=Executors.newFixedThreadPool(2)){
            Callable<Long> business=()->tx.execute(s->{
                jdbc.queryForObject("SELECT 1",Integer.class);
                try{barrier.await(5,TimeUnit.SECONDS);}catch(Exception e){throw new RuntimeException(e);}
                assertEquals(2,primary.getHikariPoolMXBean().getActiveConnections());
                assertEquals(1,reader.currentRevision());return 1L;
            });
            var a=pool.submit(business);var b=pool.submit(business);
            assertEquals(1L,a.get(10,TimeUnit.SECONDS));assertEquals(1L,b.get(10,TimeUnit.SECONDS));
        }
        assertEquals(0,primary.getHikariPoolMXBean().getActiveConnections());
    }
    @Test void DB05_exhaustedReaderIsBoundedAndHealthyBusinessStillCommits()throws Exception{
        try(var first=resources.openSession();var second=resources.openSession();
            var matcher=new LocalSensitiveWordServiceImpl(reader,new ObjectMapper())){
            first.getConnection();second.getConnection();
            long start=System.nanoTime();
            tx.execute(s->{assertEquals(CommunitySecurityConclusion.UNAVAILABLE,matcher.checkText("example").conclusion());
                jdbc.update("UPDATE content_sensitive_word_revision SET revision=revision+1 WHERE id=1");return null;});
            assertTrue((System.nanoTime()-start)/1_000_000<1600,"reader acquisition must be bounded");
            assertEquals(2,revision());
        }
        assertEquals(2,reader.currentRevision());
    }
    @Test void DB06_twoInstancesObserveUpdatesWithoutNotification(){
        try(var a=new LocalSensitiveWordServiceImpl(reader,new ObjectMapper());var b=new LocalSensitiveWordServiceImpl(reader,new ObjectMapper())){
            assertEquals(CommunitySecurityConclusion.PASS,a.checkText("同时生效").conclusion());
            assertEquals(CommunitySecurityConclusion.PASS,b.checkText("同时生效").conclusion());
            long id=service.create(req("同时生效","ENABLED",""));
            assertEquals(CommunitySecurityConclusion.REJECT,a.checkText("内容同时生效").conclusion());
            assertEquals(CommunitySecurityConclusion.REJECT,b.checkText("内容同时生效").conclusion());
            service.changeStatus(id,"DISABLED");
            assertEquals(CommunitySecurityConclusion.PASS,a.checkText("内容同时生效").conclusion());
            assertEquals(CommunitySecurityConclusion.PASS,b.checkText("内容同时生效").conclusion());
        }
    }

    @Test void DB02_fullEditUpdatesActualOperatorAndTimestamp(){
        var first=new com.spacetime.common.interceptor.UserContext();first.setId(900001L);
        var second=new com.spacetime.common.interceptor.UserContext();second.setId(900002L);
        try{
            com.spacetime.common.interceptor.UserContextHolder.set(first);
            long id=service.create(req("audit-fields","ENABLED",""));
            jdbc.update("UPDATE content_sensitive_word SET update_time='2001-01-01 00:00:00' WHERE id=?",id);
            com.spacetime.common.interceptor.UserContextHolder.set(second);
            service.update(id,req("audit-fields-edited","ENABLED",""));
            assertEquals(900002L,jdbc.queryForObject("SELECT updated_by FROM content_sensitive_word WHERE id=?",Long.class,id));
            assertTrue(service.detail(id).getUpdateTime().isAfter(java.time.LocalDateTime.of(2026,1,1,0,0)));
            assertEquals(1,service.page(1,20,null,"","").getTotal());
        }finally{com.spacetime.common.interceptor.UserContextHolder.clear();}
    }
    @Test void DB07_historicalEvidenceSurvivesWordChangesAndRawJsonRoundtrip()throws Exception{
        String word="测".repeat(249)+"历史"+(char)34+(char)92+(char)31+"\n词";
        long id=service.create(req(word,"ENABLED",""));
        try(var matcher=new LocalSensitiveWordServiceImpl(reader,new ObjectMapper())){
            var result=matcher.checkText(word);assertEquals(CommunitySecurityConclusion.REJECT,result.conclusion());
            var json=new ObjectMapper();var evidence=json.readTree(result.evidenceJson());
            jdbc.update("INSERT INTO community_audit_record(biz_type,action,result,after_snapshot) VALUES('POST','machine_audit','REJECT',?)",result.evidenceJson());
            String signal=json.createObjectNode().set("evidence",evidence).toString();
            jdbc.update("INSERT INTO external_provider_task(provider_type,provider_code,response_payload_json) VALUES('CONTENT_SAFETY','local-sensitive-word',?)",signal);
            jdbc.update("INSERT INTO app_user_audit_record(user_id,audit_group,audit_type,machine_signal_json) VALUES(900001,'CONTENT','INTRO',?)",signal);
            service.update(id,req("后来修改的词","DISABLED",""));service.delete(id);
            String community=jdbc.queryForObject("SELECT after_snapshot FROM community_audit_record ORDER BY id DESC LIMIT 1",String.class);
            String profile=jdbc.queryForObject("SELECT machine_signal_json FROM app_user_audit_record ORDER BY id DESC LIMIT 1",String.class);
            String provider=jdbc.queryForObject("SELECT response_payload_json FROM external_provider_task ORDER BY id DESC LIMIT 1",String.class);
            assertEquals(evidence,json.readTree(provider).get("evidence"));
            assertEquals(evidence,json.readTree(community));assertEquals(evidence,json.readTree(profile).get("evidence"));
            assertEquals(word,evidence.get("word").asText());assertEquals(2,evidence.get("revision").asLong());
        }
    }
    @Test void DB05_bootAutoconfigurationRetainsOnePrimaryFactoryAndDataSource(){
        new org.springframework.boot.test.context.runner.ApplicationContextRunner()
            .withConfiguration(org.springframework.boot.autoconfigure.AutoConfigurations.of(
                org.springframework.boot.autoconfigure.jdbc.DataSourceAutoConfiguration.class,
                com.baomidou.mybatisplus.autoconfigure.MybatisPlusAutoConfiguration.class))
            .withUserConfiguration(SensitiveWordReadConfiguration.class)
            .withPropertyValues("spring.datasource.url="+url,"spring.datasource.username="+user,
                "spring.datasource.password="+password,"spring.datasource.hikari.maximum-pool-size=2","spring.datasource.hikari.minimum-idle=0")
            .run(ctx->{
                assertNull(ctx.getStartupFailure());
                assertEquals(1,ctx.getBeansOfType(javax.sql.DataSource.class).size());
                assertEquals(1,ctx.getBeansOfType(SqlSessionFactory.class).size());
                assertNotNull(ctx.getBean(SensitiveWordReadResources.class));
                try(var session=ctx.getBean(SensitiveWordReadResources.class).openSession()){
                    assertEquals(1,session.getMapper(com.spacetime.common.sensitiveword.persistence.SensitiveWordReadMapper.class).currentRevision());
                }
            });
    }

    @Test void DB01_concurrentCrossCategoryChangesCannotProduceDuplicate()throws Exception{
        long a=service.create(req("first-original","ENABLED","")),b=service.create(req("second-original","DISABLED",""));
        long before=revision();var barrier=new CyclicBarrier(2);
        try(var pool=Executors.newFixedThreadPool(2)){
            var one=pool.submit(()->{barrier.await();try{service.update(a,req("shared-target","ENABLED",""));return true;}catch(com.spacetime.common.exception.BusinessException e){return false;}});
            var two=pool.submit(()->{barrier.await();try{var input=req("shared-target","DISABLED","");input.setCategoryCode("POLITICS");service.update(b,input);return true;}catch(com.spacetime.common.exception.BusinessException e){return false;}});
            assertNotEquals(one.get(10,TimeUnit.SECONDS),two.get(10,TimeUnit.SECONDS));
        }
        assertEquals(2,count());assertEquals(before+1,revision());
        assertEquals(1,jdbc.queryForObject("SELECT COUNT(*) FROM content_sensitive_word WHERE word='shared-target' AND deleted=0",Integer.class));
    }
    @Test void DB03_missingRevisionAndBumpFailureRollBackAndRejectedRefreshCannotUndoCommit(){
        jdbc.update("DELETE FROM content_sensitive_word_revision WHERE id=1");
        try{assertThrows(com.spacetime.common.exception.BusinessException.class,()->service.create(req("missing","ENABLED","")));assertEquals(0,count());}
        finally{jdbc.update("INSERT INTO content_sensitive_word_revision(id,revision) VALUES(1,1)");}
        jdbc.execute("CREATE TRIGGER reject_revision_test BEFORE UPDATE ON content_sensitive_word_revision FOR EACH ROW SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='isolated rollback regression'");
        try{assertThrows(RuntimeException.class,()->service.create(req("bump-failure","ENABLED","")));assertEquals(0,count());assertEquals(1,revision());verifyNoInteractions(notification);}
        finally{jdbc.execute("DROP TRIGGER reject_revision_test");}
        doThrow(new RejectedExecutionException("isolated executor rejection")).when(notification).requestRefresh();
        long id=service.create(req("committed","ENABLED",""));assertNotNull(service.detail(id));assertEquals(2,revision());
    }
    @Test void DB05_queryTimeoutPreservesHealthyTransactionAndReaderRecovers()throws Exception{
        try(var blocker=java.sql.DriverManager.getConnection(url,user,password);var lock=blocker.createStatement();
            var isolated=new SensitiveWordReadResources(url,user,password,"com.mysql.cj.jdbc.Driver");
            var matcher=new LocalSensitiveWordServiceImpl(new SensitiveWordReadDaoImpl(isolated),new ObjectMapper())){
            lock.execute("LOCK TABLES content_sensitive_word_revision WRITE");
            long started=System.nanoTime();
            try{tx.execute(s->{
                assertEquals(CommunitySecurityConclusion.UNAVAILABLE,matcher.checkText("query-timeout").conclusion());
                jdbc.update("INSERT INTO community_audit_record(biz_type,action,result,reason) VALUES('POST','test','PASS','healthy-after-timeout')");
                return null;
            });}finally{lock.execute("UNLOCK TABLES");}
            assertTrue((System.nanoTime()-started)/1_000_000<3500,"bounded statement timeout");
            assertEquals(CommunitySecurityConclusion.PASS,matcher.checkText("query-timeout").conclusion());
            assertTrue(jdbc.queryForObject("SELECT COUNT(*) FROM community_audit_record WHERE reason='healthy-after-timeout'",Integer.class)>0);
        }
    }
    @Test void DB05_serverDisconnectedReadConnectionIsUnavailableThenRecovers()throws Exception{
        try(var blocker=java.sql.DriverManager.getConnection(url,user,password);var lock=blocker.createStatement();
            var isolated=new SensitiveWordReadResources(url,user,password,"com.mysql.cj.jdbc.Driver");
            var matcher=new LocalSensitiveWordServiceImpl(new SensitiveWordReadDaoImpl(isolated),new ObjectMapper());
            var worker=Executors.newSingleThreadExecutor()){
            long connectionId;
            try(var session=isolated.openSession();var st=session.getConnection().createStatement();var rs=st.executeQuery("SELECT CONNECTION_ID()")){
                rs.next();connectionId=rs.getLong(1);
            }
            lock.execute("LOCK TABLES content_sensitive_word_revision WRITE");
            try{
                var future=worker.submit(()->matcher.checkText("connection-killed"));
                boolean waiting=false;
                for(int i=0;i<30;i++){
                    try(var rs=lock.executeQuery("SELECT STATE FROM information_schema.PROCESSLIST WHERE ID="+connectionId)){
                        if(rs.next()&&String.valueOf(rs.getString(1)).toLowerCase(Locale.ROOT).contains("lock")){waiting=true;break;}
                    }
                    Thread.sleep(10);
                }
                assertTrue(waiting,"reader reaches an actual blocked query before disconnect");
                lock.execute("KILL CONNECTION "+connectionId);
                assertEquals(CommunitySecurityConclusion.UNAVAILABLE,future.get(4,TimeUnit.SECONDS).conclusion());
            }finally{lock.execute("UNLOCK TABLES");}
            assertEquals(CommunitySecurityConclusion.PASS,matcher.checkText("connection-killed").conclusion());
        }
    }
    @Test void DB06_mixedReadIsRetriedAndNewInstanceLoadsCommittedState()throws Exception{
        service.create(req("before","ENABLED",""));
        var readStarted=new CountDownLatch(1);var release=new CountDownLatch(1);
        var first=new java.util.concurrent.atomic.AtomicBoolean(true);
        SensitiveWordReadDao gated=new SensitiveWordReadDao(){
            public Long currentRevision(){return reader.currentRevision();}
            public List<com.spacetime.common.entity.ContentSensitiveWord> selectEnabled(){
                var rows=reader.selectEnabled();
                if(first.getAndSet(false)){readStarted.countDown();try{assertTrue(release.await(5,TimeUnit.SECONDS));}catch(InterruptedException e){throw new RuntimeException(e);}}
                return rows;
            }
        };
        try(var matcher=new LocalSensitiveWordServiceImpl(gated,new ObjectMapper());var pool=Executors.newSingleThreadExecutor()){
            var check=pool.submit(()->matcher.checkText("fresh"));
            assertTrue(readStarted.await(5,TimeUnit.SECONDS));
            service.create(req("fresh","ENABLED",""));release.countDown();
            assertEquals(CommunitySecurityConclusion.REJECT,check.get(5,TimeUnit.SECONDS).conclusion());
            assertEquals(2,matcher.diagnostics().enabledWordCount());assertEquals(revision(),matcher.diagnostics().revision());
        }finally{release.countDown();}
        try(var restarted=new LocalSensitiveWordServiceImpl(reader,new ObjectMapper())){
            assertEquals(CommunitySecurityConclusion.REJECT,restarted.checkText("fresh").conclusion());
            assertEquals(revision(),restarted.diagnostics().revision());
        }
    }

    private Map<String,Object> latencyStats(List<Long> values,long elapsedNanos) {
        Collections.sort(values);int n=values.size();
        return Map.of("samples",n,"p50Microseconds",values.get((int)Math.ceil(n*.50)-1),
                "p95Microseconds",values.get((int)Math.ceil(n*.95)-1),
                "p99Microseconds",values.get((int)Math.ceil(n*.99)-1),
                "requestsPerSecond",n*1_000_000_000.0/elapsedNanos);
    }
    private void converge(LocalSensitiveWordServiceImpl matcher,String text,long expectedRevision)throws Exception{
        for(int i=0;i<12;i++){
            var result=matcher.checkText(text);
            if(result.conclusion()!=CommunitySecurityConclusion.UNAVAILABLE&&Objects.equals(expectedRevision,matcher.diagnostics().revision()))return;
            Thread.sleep(100);
        }
        fail("matcher did not converge to committed revision");
    }
    @Test void PERF_fullCorpusActualReadAndMatchingLatency()throws Exception{
        String corpus=System.getenv("SENSITIVE_WORD_TEST_CORPUS_PATH");assumeTrue(corpus!=null,"Full corpus fixture missing");
        String postLimit=System.getenv("SENSITIVE_WORD_POST_MAX_LENGTH");assumeTrue(postLimit!=null,"Actual post length configuration missing");
        List<String[]> lines=Files.readAllLines(Path.of(corpus)).stream().map(l->l.split("\\t",2)).toList();
        Set<String> oracle=new HashSet<>();
        tx.execute(s->{jdbc.batchUpdate("INSERT INTO content_sensitive_word(category_code,word,status) VALUES(?,?,'ENABLED')",
            lines,500,(ps,row)->{ps.setString(1,row[0]);String word=new String(Base64.getDecoder().decode(row[1]),java.nio.charset.StandardCharsets.UTF_8);ps.setString(2,word);
                oracle.add(java.text.Normalizer.normalize(word,java.text.Normalizer.Form.NFKC).toLowerCase(Locale.ROOT));});
            jdbc.update("UPDATE content_sensitive_word_revision SET revision=revision+1 WHERE id=1");return null;});
        assertEquals(51344,count());
        var mx=java.lang.management.ManagementFactory.getMemoryMXBean();
        System.gc();Thread.sleep(80);
        long baseline=mx.getHeapMemoryUsage().getUsed();
        var peak=new java.util.concurrent.atomic.AtomicLong(baseline);
        var threads=ConcurrentHashMap.<Long>newKeySet();
        SensitiveWordReadDao tracked=new SensitiveWordReadDao(){
            public Long currentRevision(){return reader.currentRevision();}
            public List<com.spacetime.common.entity.ContentSensitiveWord> selectEnabled(){threads.add(Thread.currentThread().threadId());return reader.selectEnabled();}
        };
        Map<String,Object> evidence=new LinkedHashMap<>();
        try(var sampler=Executors.newSingleThreadScheduledExecutor();
            var matcher=new LocalSensitiveWordServiceImpl(tracked,new ObjectMapper())){
            sampler.scheduleAtFixedRate(()->peak.accumulateAndGet(mx.getHeapMemoryUsage().getUsed(),Math::max),0,5,TimeUnit.MILLISECONDS);
            long buildStart=System.nanoTime();converge(matcher,"北京",revision());
            assertEquals(CommunitySecurityConclusion.REJECT,matcher.checkText("北京").conclusion());
            evidence.put("initialReadyMilliseconds",(System.nanoTime()-buildStart)/1_000_000);
            evidence.put("initialBuildMilliseconds",matcher.diagnostics().lastBuildMillis());
            evidence.put("initialNormalizedKeys",matcher.diagnostics().normalizedKeyCount());
            System.gc();Thread.sleep(80);
            evidence.put("stableHeapWithInitialIndexBytes",mx.getHeapMemoryUsage().getUsed());
            evidence.put("initialBuildSampledPeakBytes",peak.get());
            peak.set(mx.getHeapMemoryUsage().getUsed());
            doAnswer(inv->{matcher.requestRefresh();return null;}).when(notification).requestRefresh();
            String prefix="🧪".repeat(100);
            long control=service.create(req(prefix+"🪵","ENABLED","performance fixture"));
            service.create(req(prefix+"🌿","ENABLED","performance fixture"));
            oracle.add(prefix+"🪵");oracle.add(prefix+"🌿");
            long updated=System.nanoTime();converge(matcher,"北京",revision());
            evidence.put("updateToVisibleMilliseconds",(System.nanoTime()-updated)/1_000_000);
            assertEquals(51346,matcher.diagnostics().enabledWordCount());
            LinkedHashMap<String,String> samples=new LinkedHashMap<>();
            samples.put("head-hit","北京"+"🧪".repeat(149));
            samples.put("tail-hit","🧪".repeat(149)+"北京");
            samples.put("no-hit-300","🧪".repeat(150));
            samples.put("long-common-prefix",prefix+"🪨");
            samples.put("about-me-max-300","🧪".repeat(150));
            samples.put("profile-answer-max-500","🧪".repeat(250));
            int max=Integer.parseInt(postLimit);samples.put("community-post-max-"+max,"🧪".repeat(max/2)+(max%2==0?"":"\uE000"));
            samples.put("long-adversarial-8192","🧪".repeat(4096));
            Map<String,Object> scenarios=new LinkedHashMap<>();
            for(var sample:samples.entrySet()){
                String normalized=java.text.Normalizer.normalize(sample.getValue(),java.text.Normalizer.Form.NFKC).toLowerCase(Locale.ROOT);
                boolean hit=oracle.stream().anyMatch(normalized::contains);
                var expected=hit?CommunitySecurityConclusion.REJECT:CommunitySecurityConclusion.PASS;
                for(int i=0;i<10;i++)assertEquals(expected,matcher.checkText(sample.getValue()).conclusion());
                List<Long> latencies=new ArrayList<>();long started=System.nanoTime();
                for(int i=0;i<100;i++){long before=System.nanoTime();assertEquals(expected,matcher.checkText(sample.getValue()).conclusion());latencies.add((System.nanoTime()-before)/1000);}
                Map<String,Object> stats=new LinkedHashMap<>(latencyStats(latencies,System.nanoTime()-started));
                stats.put("utf16Length",sample.getValue().length());stats.put("oracle",expected.name());stats.put("warmup",10);
                scenarios.put(sample.getKey(),stats);
            }
            long beforeBuilds=matcher.diagnostics().buildCount();
            var unavailable=new java.util.concurrent.atomic.AtomicInteger();
            long concurrentStart=System.nanoTime();
            try(var pool=Executors.newFixedThreadPool(4)){
                List<Future<?>> requests=new ArrayList<>();
                for(int t=0;t<4;t++)requests.add(pool.submit(()->{
                    for(int i=0;i<80;i++){
                        var result=matcher.checkText("北京").conclusion();
                        assertNotEquals(CommunitySecurityConclusion.PASS,result);
                        if(result==CommunitySecurityConclusion.UNAVAILABLE)unavailable.incrementAndGet();
                    }
                }));
                for(int i=0;i<12;i++)service.changeStatus(control,i%2==0?"DISABLED":"ENABLED");
                for(var request:requests)request.get(30,TimeUnit.SECONDS);
            }
            converge(matcher,"北京",revision());
            assertEquals(1,threads.size(),"all full word reads use one construction worker");
            long builds=matcher.diagnostics().buildCount()-beforeBuilds;
            assertTrue(builds<=13,"updates do not create an unbounded build queue");
            evidence.put("concurrentUpdate",Map.of("updates",12,"requestThreads",4,"checks",320,
                "unavailable",unavailable.get(),"buildRounds",builds,"constructionThreadCount",threads.size(),
                "elapsedMilliseconds",(System.nanoTime()-concurrentStart)/1_000_000));
            evidence.put("rebuildSampledPeakBytes",peak.get());
            System.gc();Thread.sleep(80);
            evidence.put("stableHeapAfterRebuildBytes",mx.getHeapMemoryUsage().getUsed());
            evidence.put("snapshotRevision",matcher.diagnostics().revision());
            evidence.put("successfulBuilds",matcher.diagnostics().successfulBuildCount());
            evidence.put("buildRounds",matcher.diagnostics().buildCount());
            evidence.put("scenarios",scenarios);
            evidence.put("attachmentWords",51344);evidence.put("additionalPrefixFixtureWords",2);
            evidence.put("allAttachmentWordsEnabledForTest",true);evidence.put("heapBaselineBytes",baseline);
            evidence.put("heapMaxBytes",mx.getHeapMemoryUsage().getMax());evidence.put("javaVersion",System.getProperty("java.version"));
            evidence.put("os",System.getProperty("os.name"));evidence.put("jvmAvailableProcessors",Runtime.getRuntime().availableProcessors());
            evidence.put("library","com.hankcs:aho-corasick-double-array-trie:1.2.3");
            evidence.put("sampleIntervalMilliseconds",5);
            Files.writeString(Path.of("../docs/test-artifacts/sensitive-word-runtime-performance-20260908.json"),
                new ObjectMapper().writerWithDefaultPrettyPrinter().writeValueAsString(evidence));
        }
    }
}
