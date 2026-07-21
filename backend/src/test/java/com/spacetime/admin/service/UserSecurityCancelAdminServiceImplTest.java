package com.spacetime.admin.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.spacetime.admin.dto.request.CancelRequestRemarkReq;
import com.spacetime.admin.service.impl.UserSecurityCancelAdminServiceImpl;
import com.spacetime.common.dao.AppUserCancelRemarkDao;
import com.spacetime.common.dao.AppUserCancelRequestDao;
import com.spacetime.common.dao.AppUserDao;
import com.spacetime.common.dao.AppUserSecurityAuditLogDao;
import com.spacetime.common.entity.AppUserCancelRemark;
import com.spacetime.common.entity.AppUserCancelRequest;
import com.spacetime.common.enums.CancelRequestStatusEnum;
import com.spacetime.common.interceptor.UserContext;
import com.spacetime.common.interceptor.UserContextHolder;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/**
 * 注销申请后台只读边界测试。
 */
@ExtendWith(MockitoExtension.class)
class UserSecurityCancelAdminServiceImplTest {
    @Mock private AppUserCancelRequestDao cancelRequestDao;
    @Mock private AppUserCancelRemarkDao cancelRemarkDao;
    @Mock private AppUserSecurityAuditLogDao auditLogDao;
    @Mock private AppUserDao appUserDao;

    private UserSecurityCancelAdminServiceImpl service;

    @BeforeEach
    void setUp() {
        service = new UserSecurityCancelAdminServiceImpl(
                cancelRequestDao,
                cancelRemarkDao,
                auditLogDao,
                appUserDao,
                new ObjectMapper());
        UserContextHolder.set(new UserContext(99L, "管理员", List.of(), List.of()));
    }

    @AfterEach
    void tearDown() {
        UserContextHolder.clear();
    }

    @Test
    void remarkMustAppendWithoutChangingCancellationStatus() {
        AppUserCancelRequest request = new AppUserCancelRequest();
        request.setId(12L);
        request.setUserId(7L);
        request.setStatus(CancelRequestStatusEnum.COOLING_OFF.getCode());
        request.setRemark("第一次备注");
        when(cancelRequestDao.selectById(12L)).thenReturn(request);

        CancelRequestRemarkReq req = new CancelRequestRemarkReq();
        req.setRemark("第二次备注");
        service.remark(12L, req);

        ArgumentCaptor<AppUserCancelRemark> remarkCaptor =
                ArgumentCaptor.forClass(AppUserCancelRemark.class);
        verify(cancelRemarkDao).insert(remarkCaptor.capture());
        assertThat(remarkCaptor.getValue().getOperatorId()).isEqualTo(99L);
        assertThat(remarkCaptor.getValue().getRemark()).isEqualTo("第二次备注");
        assertThat(request.getRemark()).isEqualTo("第一次备注\n第二次备注");
        assertThat(request.getStatus()).isEqualTo(CancelRequestStatusEnum.COOLING_OFF.getCode());
        verify(cancelRequestDao).updateById(request);
    }
}
