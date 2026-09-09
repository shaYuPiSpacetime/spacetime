package com.spacetime.common.service.impl;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.hankcs.algorithm.AhoCorasickDoubleArrayTrie;
import com.spacetime.common.community.*;
import com.spacetime.common.dao.SensitiveWordReadDao;
import com.spacetime.common.enums.SensitiveWordCategory;
import com.spacetime.common.service.LocalSensitiveWordService;
import jakarta.annotation.PostConstruct;
import jakarta.annotation.PreDestroy;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import java.text.Normalizer;
import java.util.*;
import java.util.concurrent.*;
import java.util.concurrent.atomic.AtomicReference;
import java.util.concurrent.atomic.LongAdder;
import java.time.Instant;
import org.slf4j.MDC;

/** 单构建线程和原子不可变快照；版本不明时绝不使用旧树拒绝。 */
@Service @Slf4j
public class LocalSensitiveWordServiceImpl implements LocalSensitiveWordService, AutoCloseable {
    private final SensitiveWordReadDao dao;
    private final ObjectMapper json;
    private final AtomicReference<Snapshot> snapshot = new AtomicReference<>();
    private final ExecutorService executor = new ThreadPoolExecutor(1, 1, 0, TimeUnit.MILLISECONDS,
            new ArrayBlockingQueue<>(1), r -> { Thread t = new Thread(r, "sensitive-word-refresh"); t.setDaemon(true); return t; });
    private CompletableFuture<Snapshot> running;
    private boolean pending;
    private long retryAfter;
    private record Word(long id, String word, String categoryCode, String categoryName) {}
    private record Snapshot(long revision, AhoCorasickDoubleArrayTrie<Word> tree, int size,
                            int enabledWords, long buildMillis, Instant builtAt) {}
    public enum SkipReason { REVISION_MISSING, REVISION_CHANGED, REVISION_UNSTABLE, COOLDOWN,
        TIMEOUT, INTERRUPTED, BUILD_FAILED, FAILURE }
    public record Diagnostics(Long revision, int enabledWordCount, int normalizedKeyCount,
                              long buildCount, long successfulBuildCount, long totalBuildMillis,
                              long lastBuildMillis, Instant lastSuccess, Map<SkipReason, Long> skipCounts) {}
    private final LongAdder buildCount = new LongAdder();
    private final LongAdder successfulBuildCount = new LongAdder();
    private final LongAdder totalBuildMillis = new LongAdder();
    private final Map<SkipReason, LongAdder> skips = new EnumMap<>(SkipReason.class);
    { for (SkipReason reason : SkipReason.values()) skips.put(reason, new LongAdder()); }

    /** Read-only operational snapshot; never exposes indexed words or request content. */
    public Diagnostics diagnostics() {
        Snapshot current = snapshot.get();
        Map<SkipReason, Long> counts = new EnumMap<>(SkipReason.class);
        skips.forEach((reason, count) -> counts.put(reason, count.sum()));
        return new Diagnostics(current == null ? null : current.revision,
                current == null ? 0 : current.enabledWords, current == null ? 0 : current.size,
                buildCount.sum(), successfulBuildCount.sum(), totalBuildMillis.sum(),
                current == null ? 0 : current.buildMillis, current == null ? null : current.builtAt,
                Collections.unmodifiableMap(counts));
    }

    /** 注入独立读 DAO 和统一 JSON 序列化器。 */
    public LocalSensitiveWordServiceImpl(SensitiveWordReadDao dao, ObjectMapper json) { this.dao=dao; this.json=json; }
    /** 启动预热只排队，失败不影响启动。 */
    @PostConstruct public void warmup() { requestRefresh(); }

    @Override public CommunitySecurityResult checkText(String content) {
        if (content == null || content.isBlank()) return CommunitySecurityResult.pass("empty_text");
        Long knownRevision = null;
        try {
            long revision = revision();
            knownRevision = revision;
            Snapshot current = snapshot.get();
            if (current == null || current.revision != revision) current = refresh(false).get(1000, TimeUnit.MILLISECONDS);
            if (current == null || current.revision < revision) return unavailable(SkipReason.REVISION_CHANGED, knownRevision);
            var hit = current.size == 0 ? null : current.tree.findFirst(normalize(content));
            if (hit == null) return CommunitySecurityResult.pass("local_sensitive_word_clear");
            Word word = hit.value;
            Map<String,Object> evidence = new LinkedHashMap<>();
            evidence.put("source", "local-sensitive-word"); evidence.put("revision", current.revision);
            evidence.put("wordId", word.id); evidence.put("word", word.word);
            evidence.put("categoryCode", word.categoryCode); evidence.put("categoryName", word.categoryName);
            return new CommunitySecurityResult(CommunitySecurityConclusion.REJECT, "local_sensitive_word:"+word.id,
                    "local_sensitive_word_hit", json.writeValueAsString(evidence));
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt(); return unavailable(SkipReason.INTERRUPTED, knownRevision);
        } catch (Exception e) { return unavailable(classify(e), knownRevision); }
    }

    @Override public void requestRefresh() {
        try { refresh(true); } catch (Exception e) { unavailable(classify(e), null); }
    }

    private synchronized CompletableFuture<Snapshot> refresh(boolean requested) {
        if (running != null) { pending |= requested; return running; }
        if (System.nanoTime() < retryAfter) return CompletableFuture.failedFuture(new IllegalStateException("refresh_cooldown"));
        CompletableFuture<Snapshot> future = new CompletableFuture<>();
        running = future;
        String requestId=MDC.get("requestId");
        try { executor.execute(() -> {
            if(requestId!=null) MDC.put("requestId",requestId);
            try { build(future); } finally { MDC.remove("requestId"); }
        }); }
        catch (RuntimeException e) { running=null; recordSkip(SkipReason.BUILD_FAILED,null); future.completeExceptionally(e); }
        return future;
    }

    private void build(CompletableFuture<Snapshot> future) {
        long started=System.nanoTime();
        buildCount.increment();
        Long knownRevision=null;
        boolean succeeded=false;
        try {
            Snapshot result=null;
            for (int attempt=0; attempt<3; attempt++) {
                long before=revision();
                knownRevision=before;
                Snapshot existing=snapshot.get();
                if (existing!=null && existing.revision==before) { result=existing; break; }
                TreeMap<String,Word> words=new TreeMap<>();
                int enabledWords=0;
                for (var row:dao.selectEnabled()) {
                    if (!"ENABLED".equals(row.getStatus()) || (row.getDeleted()!=null && row.getDeleted()!=0)) continue;
                    enabledWords++;
                    String key=normalize(row.getWord());
                    if (key.isEmpty()) continue;
                    Word word=new Word(row.getId(),row.getWord(),row.getCategoryCode(),
                            SensitiveWordCategory.valueOf(row.getCategoryCode()).getDisplayName());
                    words.merge(key,word,(a,b)->a.id<=b.id?a:b);
                }
                var tree=new AhoCorasickDoubleArrayTrie<Word>();
                if (!words.isEmpty()) tree.build(words);
                if (before!=revision()) continue;
                result=new Snapshot(before,tree,words.size(),enabledWords,(System.nanoTime()-started)/1_000_000,Instant.now());
                successfulBuildCount.increment();
                snapshot.set(result);
                log.info("Sensitive word snapshot built revision={} enabledWords={} keys={} elapsedMs={}",before,enabledWords,words.size(),result.buildMillis);
                break;
            }
            if (result==null) throw new IllegalStateException("revision_unstable");
            succeeded=true;
            // Clear the running marker before completing so subsequent revisions can schedule work.
            synchronized (this) { running=null; retryAfter=0; }
            future.complete(result);
        } catch (Exception e) {
            synchronized (this) { running=null; retryAfter=System.nanoTime()+TimeUnit.SECONDS.toNanos(1); }
            recordSkip(SkipReason.BUILD_FAILED, knownRevision);
            future.completeExceptionally(e);
        } finally {
            totalBuildMillis.add((System.nanoTime()-started)/1_000_000);
            synchronized (this) {
                boolean again=pending; pending=false;
                if (again && succeeded && running==null) refresh(false);
            }
        }
    }

    private long revision() {
        Long value=dao.currentRevision();
        if (value==null || value<1) throw new IllegalStateException("revision_missing");
        return value;
    }
    private static String normalize(String value) { return Normalizer.normalize(value,Normalizer.Form.NFKC).toLowerCase(Locale.ROOT); }
    private SkipReason classify(Exception failure) {
        Throwable cause = failure instanceof ExecutionException && failure.getCause()!=null ? failure.getCause() : failure;
        if (cause instanceof TimeoutException) return SkipReason.TIMEOUT;
        if (cause instanceof InterruptedException) return SkipReason.INTERRUPTED;
        if (cause instanceof IllegalStateException) {
            if ("revision_missing".equals(cause.getMessage())) return SkipReason.REVISION_MISSING;
            if ("revision_unstable".equals(cause.getMessage())) return SkipReason.REVISION_UNSTABLE;
            if ("refresh_cooldown".equals(cause.getMessage())) return SkipReason.COOLDOWN;
        }
        return SkipReason.FAILURE;
    }
    private void recordSkip(SkipReason reason, Long revision) {
        skips.get(reason).increment();
        Snapshot current=snapshot.get();
        log.warn("Sensitive word skipped reason={} revision={} snapshotRevision={} requestId={}",
                reason, revision, current==null?null:current.revision, MDC.get("requestId"));
    }
    private CommunitySecurityResult unavailable(SkipReason reason, Long revision) {
        recordSkip(reason, revision);
        return CommunitySecurityResult.unavailable("local_sensitive_word_unavailable");
    }
    /** 应用退出时停止构建线程。 */
    @Override @PreDestroy public void close() { executor.shutdownNow(); }
}
