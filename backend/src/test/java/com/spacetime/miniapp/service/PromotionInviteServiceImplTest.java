package com.spacetime.miniapp.service;

import com.spacetime.common.dao.PromotionAgentQrCodeDao;
import com.spacetime.common.dao.PromotionAgentEventDao;
import com.spacetime.common.dao.PromotionInviteRelationDao;
import com.spacetime.common.dao.PromotionSourceTraceDao;
import com.spacetime.common.entity.PromotionAgentQrCode;
import com.spacetime.common.entity.PromotionInviteRelation;
import com.spacetime.common.entity.PromotionSourceTrace;
import com.spacetime.common.exception.BusinessException;
import com.spacetime.miniapp.service.impl.PromotionInviteServiceImpl;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.argThat;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
@DisplayName("PromotionInviteServiceImpl L3 测试")
class PromotionInviteServiceImplTest {

    @Mock
    private PromotionSourceTraceDao sourceTraceDao;
    @Mock
    private PromotionInviteRelationDao relationDao;
    @Mock
    private PromotionAgentQrCodeDao qrCodeDao;
    @Mock
    private PromotionAgentEventDao agentEventDao;

    @InjectMocks
    private PromotionInviteServiceImpl service;

    @Test
    @DisplayName("F1-P0-04 普通用户二维码来源写入 traceNo 和 unbound")
    void shareLog_normal_shouldCreateTrace() {
        PromotionSourceTrace trace = new PromotionSourceTrace();
        trace.setSourceType("user_qr");
        trace.setInviterId(100L);

        PromotionSourceTrace result = service.shareLog(trace);

        assertThat(result.getTraceNo()).startsWith("TR");
        assertThat(result.getBindStatus()).isEqualTo("unbound");
        verify(sourceTraceDao).insert(trace);
    }

    @Test
    @DisplayName("F1-P2-01 二维码来源缺少类型应报错")
    void shareLog_missingSourceType_shouldReject() {
        assertThatThrownBy(() -> service.shareLog(new PromotionSourceTrace()))
                .isInstanceOf(BusinessException.class)
                .hasMessageContaining("来源类型不能为空");
    }

    @Test
    @DisplayName("F1-P0-06/L3-01 新用户通过普通 trace 建立邀请关系")
    void bind_normalInvite_shouldCreateRelation() {
        PromotionSourceTrace trace = new PromotionSourceTrace();
        trace.setId(1L);
        trace.setTraceNo("TR1");
        trace.setSourceType("user_qr");
        trace.setInviterId(100L);
        when(sourceTraceDao.selectByTraceNo("TR1")).thenReturn(trace);

        PromotionInviteRelation relation = service.bind(200L, "TR1", null, null);

        assertThat(relation.getInviterId()).isEqualTo(100L);
        assertThat(relation.getInviteeId()).isEqualTo(200L);
        assertThat(relation.getStatus()).isEqualTo("registered");
        assertThat(relation.getRegisterTime()).isNotNull();
        assertThat(trace.getBindStatus()).isEqualTo("bound");
        verify(relationDao).insert(relation);
        verify(sourceTraceDao).updateById(trace);
    }

    @Test
    @DisplayName("F1-P2-04/L3-03 自己邀请自己应拒绝")
    void bind_selfInvite_shouldReject() {
        PromotionSourceTrace trace = new PromotionSourceTrace();
        trace.setTraceNo("TR1");
        trace.setSourceType("user_qr");
        trace.setInviterId(200L);
        when(sourceTraceDao.selectByTraceNo("TR1")).thenReturn(trace);

        assertThatThrownBy(() -> service.bind(200L, "TR1", null, null))
                .isInstanceOf(BusinessException.class)
                .hasMessageContaining("不能邀请自己");

        verify(relationDao, never()).insert(any());
    }

    @Test
    @DisplayName("F1-P2-05/L3-04 重复绑定保持首次关系")
    void bind_duplicateInvitee_shouldKeepFirstRelation() {
        PromotionInviteRelation existing = new PromotionInviteRelation();
        existing.setId(1L);
        existing.setInviteeId(200L);
        existing.setInviterId(100L);
        when(relationDao.selectByInviteeId(200L)).thenReturn(existing);

        PromotionInviteRelation relation = service.bind(200L, "TR2", null, null);

        assertThat(relation).isSameAs(existing);
        verify(sourceTraceDao, never()).selectByTraceNo(any());
        verify(relationDao, never()).insert(any());
    }

    @Test
    @DisplayName("F1-P2-06/L3-05 同时携带普通用户二维码和校园代理二维码时代理优先")
    void bind_agentPriority_shouldPreferAgent() {
        PromotionSourceTrace trace = new PromotionSourceTrace();
        trace.setTraceNo("TR1");
        trace.setSourceType("user_qr");
        trace.setInviterId(100L);
        PromotionAgentQrCode agent = enabledQrCode();
        when(sourceTraceDao.selectByTraceNo("TR1")).thenReturn(trace);
        when(qrCodeDao.selectByQrCode("A001")).thenReturn(agent);

        PromotionInviteRelation relation = service.bind(200L, "TR1", null, "A001");

        assertThat(relation.getSourceType()).isEqualTo("agent_qr");
        assertThat(relation.getAgentId()).isEqualTo(9L);
        assertThat(relation.getInviterId()).isNull();
    }

    @Test
    @DisplayName("F3-P1-01/L3-15 停用校园代理二维码不应建立代理关系")
    void bind_disabledQrCode_shouldRejectAgentRelation() {
        PromotionAgentQrCode disabled = enabledQrCode();
        disabled.setStatus("disabled");
        when(qrCodeDao.selectByQrCode("A001")).thenReturn(disabled);

        assertThatThrownBy(() -> service.bind(200L, null, null, "A001"))
                .isInstanceOf(BusinessException.class)
                .hasMessageContaining("邀请来源不能为空");

        verify(relationDao, never()).insert(any());
    }

    @Test
    @DisplayName("F1-P0-05 只有 enabled 校园代理二维码记录 click 事件")
    void shareLog_disabledQrCode_shouldNotCreateClickEvent() {
        PromotionAgentQrCode disabled = enabledQrCode();
        disabled.setStatus("disabled");
        when(qrCodeDao.selectByQrCode("A001")).thenReturn(disabled);

        PromotionSourceTrace trace = new PromotionSourceTrace();
        trace.setSourceType("agent_qr");
        trace.setQrCode("A001");
        service.shareLog(trace);

        verify(agentEventDao, never()).insert(any());
    }

    @Test
    @DisplayName("F1-P1-01 查询代理来源返回可用状态")
    void qrSource_shouldExposeAvailability() {
        when(qrCodeDao.selectByQrCode("A001")).thenReturn(enabledQrCode());

        assertThat(service.qrSource("A001"))
                .containsEntry("available", true)
                .containsEntry("qrCode", "A001");
    }

    @Test
    @DisplayName("被邀请人资料完善后推进邀请关系状态")
    void markProfileCompleted_shouldAdvanceRelation() {
        PromotionInviteRelation relation = relation("registered");
        when(relationDao.selectByInviteeId(200L)).thenReturn(relation);

        PromotionInviteRelation result = service.markProfileCompleted(200L);

        assertThat(result.getStatus()).isEqualTo("profile_completed");
        assertThat(result.getProfileCompleteTime()).isNotNull();
        verify(relationDao).updateById(relation);
    }

    @Test
    @DisplayName("被邀请人三项认证完成后推进邀请关系状态")
    void markVerifySuccess_shouldAdvanceRelation() {
        PromotionInviteRelation relation = relation("registered");
        when(relationDao.selectByInviteeId(200L)).thenReturn(relation);

        PromotionInviteRelation result = service.markVerifySuccess(200L);

        assertThat(result.getStatus()).isEqualTo("verify_success");
        assertThat(result.getProfileCompleteTime()).isNotNull();
        assertThat(result.getVerifySuccessTime()).isNotNull();
        verify(relationDao).updateById(relation);
    }

    @Test
    @DisplayName("重复认证完成事件不重复更新")
    void markVerifySuccess_duplicate_shouldKeepRelation() {
        PromotionInviteRelation relation = relation("verify_success");
        when(relationDao.selectByInviteeId(200L)).thenReturn(relation);

        PromotionInviteRelation result = service.markVerifySuccess(200L);

        assertThat(result).isSameAs(relation);
        verify(relationDao, never()).updateById(any());
        verify(agentEventDao, never()).insert(any());
    }

    private PromotionAgentQrCode enabledQrCode() {
        PromotionAgentQrCode code = new PromotionAgentQrCode();
        code.setId(1L);
        code.setAgentId(9L);
        code.setQrCode("A001");
        code.setMiniappPath("/pages/index/index?qrCode=A001");
        code.setStatus("enabled");
        return code;
    }

    private PromotionInviteRelation relation(String status) {
        PromotionInviteRelation relation = new PromotionInviteRelation();
        relation.setId(1L);
        relation.setInviteeId(200L);
        relation.setInviterId(100L);
        relation.setSourceType("user_qr");
        relation.setStatus(status);
        return relation;
    }
}
