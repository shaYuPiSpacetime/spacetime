package com.spacetime.common.service.impl;

import com.spacetime.common.dao.ContentOperationLogDao;
import com.spacetime.common.dto.RelationViewAudit;
import com.spacetime.common.entity.ContentOperationLog;
import com.spacetime.common.exception.BusinessException;
import com.spacetime.common.interceptor.UserContext;
import com.spacetime.common.interceptor.UserContextHolder;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.verify;

/** 关系敏感数据查看审计服务测试。 */
@ExtendWith(MockitoExtension.class)
class RelationAuditServiceImplTest {
    @Mock private ContentOperationLogDao operationLogDao;
    @InjectMocks private RelationAuditServiceImpl service;

    @AfterEach
    void clearContext() {
        UserContextHolder.clear();
    }

    @Test
    void writesOnlyQueryMetadata() {
        UserContextHolder.set(new UserContext(9L, "客服", List.of(), List.of("user:app:relation:view")));
        RelationViewAudit audit = new RelationViewAudit("REQ-1", 100L, "likes", 1, 10,
                "INBOUND", "active", "profile", 2L, false);

        service.recordRelationView(audit);

        ArgumentCaptor<ContentOperationLog> captor = ArgumentCaptor.forClass(ContentOperationLog.class);
        verify(operationLogDao).insert(captor.capture());
        ContentOperationLog log = captor.getValue();
        assertThat(log.getBizType()).isEqualTo("PRD02_RELATION_VIEW");
        assertThat(log.getBizId()).isEqualTo(100L);
        assertThat(log.getAfterValue()).contains("REQ-1", "likes", "INBOUND", "active");
        assertThat(log.getAfterValue()).doesNotContain("手机号", "昵称", "头像");
        assertThat(log.getCreatedBy()).isEqualTo(9L);
    }

    @Test
    void failsClosedWhenAuditStorageIsUnavailable() {
        doThrow(new IllegalStateException("db unavailable"))
                .when(operationLogDao).insert(org.mockito.ArgumentMatchers.any());

        assertThatThrownBy(() -> service.recordRelationView(
                new RelationViewAudit("REQ-2", 100L, "summary", 1, 10,
                        null, null, null, 1L, true)))
                .isInstanceOf(BusinessException.class)
                .extracting("code")
                .isEqualTo(20010);
    }
}
