package com.spacetime.admin.service;

import com.spacetime.admin.service.impl.WebsiteAdminServiceImpl;
import com.spacetime.common.dao.WebsiteDao;
import com.spacetime.common.exception.BusinessException;
import com.spacetime.common.interceptor.UserContext;
import com.spacetime.common.interceptor.UserContextHolder;
import com.spacetime.common.website.WebsiteData;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;

import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertEquals;
import org.mockito.ArgumentCaptor;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class WebsiteAdminServiceImplTest {
    @Mock WebsiteDao dao;
    @InjectMocks WebsiteAdminServiceImpl service;

    @AfterEach void cleanup() { UserContextHolder.clear(); }

    @Test void 审核活动通过后图片才公开() {
        UserContextHolder.set(new UserContext(8L, "审核员", List.of(), List.of()));
        WebsiteData.Activity activity = new WebsiteData.Activity();
        activity.setId(1L); activity.setStatus("PENDING");
        WebsiteData.Media image = new WebsiteData.Media();
        image.setId(5L); image.setStatus("PENDING");
        when(dao.activity(1L)).thenReturn(activity);
        when(dao.mediaFor("ACTIVITY", 1L)).thenReturn(List.of(image));
        service.moderateActivity(1L, "APPROVED", "图片和文案正常");
        verify(dao).updateActivityStatus(1L, "APPROVED", "图片和文案正常");
        verify(dao).updateMediaStatus(5L, "APPROVED");
        ArgumentCaptor<WebsiteData.AuditLog> audit = ArgumentCaptor.forClass(WebsiteData.AuditLog.class);
        verify(dao).insertAudit(audit.capture());
        assertEquals("图片和文案正常", audit.getValue().getRemark());
    }

    @Test void 审核操作必须说明原因() {
        assertThrows(BusinessException.class, () -> service.moderateActivity(1L, "REJECTED", " "));
        verifyNoInteractions(dao);
    }
}
