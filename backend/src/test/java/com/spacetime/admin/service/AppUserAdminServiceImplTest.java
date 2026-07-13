package com.spacetime.admin.service;

import com.spacetime.admin.dto.response.AppUserDetailVO;
import com.spacetime.admin.service.impl.AppUserAdminServiceImpl;
import com.spacetime.common.dao.AppUserAuditRecordDao;
import com.spacetime.common.dao.AppUserDao;
import com.spacetime.common.dao.AppUserImportBatchDao;
import com.spacetime.common.dao.AppUserImportRowDao;
import com.spacetime.common.dao.ContentOperationLogDao;
import com.spacetime.common.entity.AppUser;
import com.spacetime.common.service.AppUserAuditContentService;
import com.spacetime.common.service.ProfileDictionaryService;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;

/**
 * 管理后台小程序用户服务测试。
 */
@ExtendWith(MockitoExtension.class)
@DisplayName("AppUserAdminService L3 测试")
class AppUserAdminServiceImplTest {

    @Mock
    private AppUserDao appUserDao;
    @Mock
    private AppUserAuditRecordDao auditRecordDao;
    @Mock
    private AppUserImportBatchDao importBatchDao;
    @Mock
    private AppUserImportRowDao importRowDao;
    @Mock
    private ContentOperationLogDao contentOperationLogDao;
    @Mock
    private ProfileDictionaryService profileDictionaryService;
    @Mock
    private AppUserAuditContentService auditContentService;

    @InjectMocks
    private AppUserAdminServiceImpl service;

    @Test
    @DisplayName("用户详情关联头像只展示当前对外生效头像")
    void shouldUsePublicAvatarForRelatedUser() {
        AppUser user = new AppUser();
        user.setId(71L);
        user.setNickname("头像规则用户");
        user.setAccountStatus("NORMAL");
        when(appUserDao.selectById(71L)).thenReturn(user);
        when(auditRecordDao.selectList(any())).thenReturn(List.of());
        when(profileDictionaryService.labels(any())).thenReturn(Map.of());
        when(auditContentService.publicAvatar(71L)).thenReturn("https://oss.example.com/avatar-approved.jpg");

        AppUserDetailVO detail = service.getUserDetail(71L);

        assertThat(detail.getAvatar()).isEqualTo("https://oss.example.com/avatar-approved.jpg");
    }
}
