package com.spacetime.admin.service;

import com.spacetime.admin.dto.request.MessageRecordPageReq;
import com.spacetime.admin.dto.request.MessageRecordExportReq;
import com.spacetime.admin.service.impl.MessageRecordAdminServiceImpl;
import com.spacetime.common.dao.AppUserExportTaskDao;
import com.spacetime.common.dao.AppUserDao;
import com.spacetime.common.dao.MessageAdminQueryDao;
import com.spacetime.common.model.message.MessageAdminRecordProjection;
import com.spacetime.common.entity.AppUserExportTask;
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
import static org.mockito.Mockito.verify;
import org.mockito.ArgumentCaptor;

@ExtendWith(MockitoExtension.class)
@DisplayName("PRD-03 管理后台消息记录元数据查询")
class MessageRecordAdminServiceImplTest {
    @Mock private MessageAdminQueryDao queryDao;
    @Mock private AppUserExportTaskDao exportTaskDao;
    @Mock private AppUserDao appUserDao;

    @Test
    @DisplayName("列表应正常展示用户编号和昵称，不返回掩码标识")
    void shouldReturnBusinessUserIdentity() {
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

        com.spacetime.common.entity.AppUser sender = new com.spacetime.common.entity.AppUser();
        sender.setId(12L);
        sender.setNickname("发送用户");
        com.spacetime.common.entity.AppUser peer = new com.spacetime.common.entity.AppUser();
        peer.setId(34L);
        peer.setNickname("接收用户");
        when(appUserDao.selectByIds(any())).thenReturn(List.of(sender, peer));

        var result = new MessageRecordAdminServiceImpl(queryDao, exportTaskDao, appUserDao,
                null, null, null, null, null, null)
                .records(new MessageRecordPageReq());

        assertThat(result.getTotal()).isEqualTo(1);
        assertThat(result.getRecords()).singleElement().satisfies(record -> {
            assertThat(record.getRecordNo()).isEqualTo("MSG-001");
            assertThat(record.getUserId()).isEqualTo(12L);
            assertThat(record.getUserNickname()).isEqualTo("发送用户");
            assertThat(record.getPeerUserId()).isEqualTo(34L);
            assertThat(record.getPeerNickname()).isEqualTo("接收用户");
            assertThat(record.getCaseCount()).isEqualTo(2);
        });
    }

    @Test
    @DisplayName("导出文件的表头和业务枚举应使用中文")
    void exportShouldUseChineseHeadersAndEnums() {
        MessageAdminRecordProjection projection = new MessageAdminRecordProjection();
        projection.setRecordNo("MSG-001");
        projection.setRecordType("system_message");
        projection.setMessageType("system_tip");
        projection.setSystemCategory("assistant");
        projection.setStatus("sent");
        projection.setBusinessTime(LocalDateTime.of(2026, 8, 13, 12, 0));
        when(queryDao.selectPage(any(), org.mockito.ArgumentMatchers.eq(0),
                org.mockito.ArgumentMatchers.eq(10001))).thenReturn(List.of(projection));
        when(appUserDao.selectByIds(any())).thenReturn(List.of());
        MessageRecordExportReq req = new MessageRecordExportReq();
        req.setConfirmNoContent(true);

        new MessageRecordAdminServiceImpl(queryDao, exportTaskDao, appUserDao,
                null, null, null, null, null, null).export(req);

        ArgumentCaptor<AppUserExportTask> captor = ArgumentCaptor.forClass(AppUserExportTask.class);
        verify(exportTaskDao).insert(captor.capture());
        assertThat(captor.getValue().getDownloadContent())
                .contains("记录编号,记录类型,用户编号,用户昵称")
                .contains("系统消息", "系统提示", "官方助手", "已发送")
                .doesNotContain("system_message", "system_tip", "assistant");
    }
}
