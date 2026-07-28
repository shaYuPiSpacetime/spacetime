package com.spacetime.common.service;

import com.spacetime.common.dao.PromotionAgentDao;
import com.spacetime.common.dao.PromotionInviteRelationDao;
import com.spacetime.common.dao.PromotionSourceTraceDao;
import com.spacetime.common.dao.PromotionAgentQrCodeDao;
import com.spacetime.common.dao.PromotionAgentStatDao;
import com.spacetime.common.entity.PromotionAgent;
import com.spacetime.common.entity.PromotionInviteRelation;
import com.spacetime.common.entity.PromotionSourceTrace;
import com.spacetime.common.service.impl.PromotionAttributionServiceImpl;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.dao.DuplicateKeyException;

import java.time.LocalDateTime;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.doAnswer;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/**
 * 注册来源归因和永久关系测试。
 */
class PromotionAttributionServiceImplTest {
    private PromotionSourceTraceDao traceDao;
    private PromotionInviteRelationDao relationDao;
    private PromotionAgentDao agentDao;
    private PromotionAttributionServiceImpl service;

    @BeforeEach
    void setUp() {
        traceDao = mock(PromotionSourceTraceDao.class);
        relationDao = mock(PromotionInviteRelationDao.class);
        agentDao = mock(PromotionAgentDao.class);
        service = new PromotionAttributionServiceImpl(
                traceDao,
                relationDao,
                agentDao,
                mock(PromotionAgentQrCodeDao.class),
                mock(PromotionAgentStatDao.class));
    }

    @Test
    void 同时存在普通与启用代理来源时代理优先() {
        PromotionSourceTrace normal = trace(1L, "normal_user", 8L, null, LocalDateTime.now());
        PromotionSourceTrace agentTrace = trace(2L, "campus_agent", null, 9L, LocalDateTime.now().minusMinutes(1));
        when(traceDao.selectByTraceNo("normal")).thenReturn(normal);
        when(traceDao.selectByTraceNo("agent")).thenReturn(agentTrace);
        PromotionAgent agent = new PromotionAgent();
        agent.setId(9L);
        agent.setStatus("enabled");
        when(agentDao.selectById(9L)).thenReturn(agent);
        doAnswer(invocation -> {
            PromotionInviteRelation relation = invocation.getArgument(0);
            relation.setId(100L);
            return null;
        }).when(relationDao).insert(any());

        PromotionInviteRelation result = service.bindNewUser(
                20L, LocalDateTime.now(), List.of("normal", "agent"), true);

        assertThat(result.getSourceType()).isEqualTo("campus_agent");
        assertThat(result.getAgentId()).isEqualTo(9L);
    }

    @Test
    void 已有关系直接返回且不可被第二来源覆盖() {
        PromotionInviteRelation existing = new PromotionInviteRelation();
        existing.setRelationNo("REL-old");
        existing.setInviteeId(20L);
        existing.setInviterId(8L);
        when(relationDao.selectByInviteeId(20L)).thenReturn(existing);

        PromotionInviteRelation result = service.bindNewUser(
                20L, LocalDateTime.now(), List.of("other"), true);

        assertThat(result).isSameAs(existing);
    }

    @Test
    void 数据库唯一键竞争时返回已落库关系() {
        PromotionSourceTrace normal = trace(1L, "normal_user", 8L, null, LocalDateTime.now());
        when(traceDao.selectByTraceNo("normal")).thenReturn(normal);
        doThrow(new DuplicateKeyException("uk_invitee_id")).when(relationDao).insert(any());
        PromotionInviteRelation winner = new PromotionInviteRelation();
        winner.setRelationNo("REL-winner");
        when(relationDao.selectByInviteeId(20L)).thenReturn(null, winner);

        PromotionInviteRelation result = service.bindNewUser(
                20L, LocalDateTime.now(), List.of("normal"), true);

        assertThat(result.getRelationNo()).isEqualTo("REL-winner");
    }

    @Test
    void 停用代理不建立新关系() {
        PromotionSourceTrace agentTrace = trace(2L, "campus_agent", null, 9L, LocalDateTime.now());
        when(traceDao.selectByTraceNo("agent")).thenReturn(agentTrace);
        PromotionAgent agent = new PromotionAgent();
        agent.setStatus("disabled");
        when(agentDao.selectById(9L)).thenReturn(agent);

        PromotionInviteRelation result = service.bindNewUser(
                20L, LocalDateTime.now(), List.of("agent"), true);

        assertThat(result).isNull();
        verify(relationDao, org.mockito.Mockito.never()).insert(any());
    }

    @Test
    void 自邀请不建立关系() {
        PromotionSourceTrace normal = trace(1L, "normal_user", 20L, null, LocalDateTime.now());
        when(traceDao.selectByTraceNo("normal")).thenReturn(normal);

        PromotionInviteRelation result = service.bindNewUser(
                20L, LocalDateTime.now(), List.of("normal"), true);

        assertThat(result).isNull();
        ArgumentCaptor<PromotionInviteRelation> captor = ArgumentCaptor.forClass(PromotionInviteRelation.class);
        org.mockito.Mockito.verify(relationDao, org.mockito.Mockito.never()).insert(captor.capture());
    }

    @Test
    void 伪造来源不建立关系且安全结束() {
        when(traceDao.selectByTraceNo("fake")).thenReturn(null);

        PromotionInviteRelation result = service.bindNewUser(
                20L, LocalDateTime.now(), List.of("fake"), true);

        assertThat(result).isNull();
        verify(relationDao, org.mockito.Mockito.never()).insert(any());
    }

    private PromotionSourceTrace trace(Long id, String type, Long inviterId, Long agentId, LocalDateTime time) {
        PromotionSourceTrace trace = new PromotionSourceTrace();
        trace.setId(id);
        trace.setTraceNo("trace-" + id);
        trace.setSourceType(type);
        trace.setInviterId(inviterId);
        trace.setAgentId(agentId);
        trace.setTracedAt(time);
        return trace;
    }
}
