package com.spacetime.admin.service;

import com.spacetime.admin.dto.request.MessageRecordPageReq;
import com.spacetime.admin.service.impl.MessageRecordAdminServiceImpl;
import com.spacetime.common.dao.AppUserExportTaskDao;
import com.spacetime.common.dao.MessageAdminQueryDao;
import com.spacetime.common.model.message.MessageAdminRecordProjection;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDateTime;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
@DisplayName("PRD-03 管理后台消息记录元数据查询")
class MessageRecordAdminServiceImplTest {
    @Mock private MessageAdminQueryDao queryDao;
    @Mock private AppUserExportTaskDao exportTaskDao;

    @Test
    @DisplayName("列表只映射消息元数据和案件数量")
    void shouldReturnMetadataOnly() {
        MessageAdminRecordProjection projection = new MessageAdminRecordProjection();
        projection.setRecordNo("MSG-001");
        projection.setRecordType("private_message");
        projection.setUserId(12L);
        projection.setPeerUserId(34L);
        projection.setMessageType("text");
        projection.setStatus("sent");
        projection.setBusinessTime(LocalDateTime.of(2026, 8, 10, 12, 0));
        projection.setCaseCount(2L);
        when(queryDao.count(any())).thenReturn(1L);
        when(queryDao.selectPage(any(), org.mockito.ArgumentMatchers.eq(0),
                org.mockito.ArgumentMatchers.eq(20))).thenReturn(List.of(projection));

        var result = new MessageRecordAdminServiceImpl(queryDao, exportTaskDao)
                .records(new MessageRecordPageReq());

        assertThat(result.getTotal()).isEqualTo(1);
        assertThat(result.getRecords()).singleElement().satisfies(record -> {
            assertThat(record.getRecordNo()).isEqualTo("MSG-001");
            assertThat(record.getUserMask()).endsWith("0012");
            assertThat(record.getPeerMask()).endsWith("0034");
            assertThat(record.getCaseCount()).isEqualTo(2);
        });
    }
}
