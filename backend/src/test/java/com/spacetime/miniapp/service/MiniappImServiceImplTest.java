package com.spacetime.miniapp.service;

import com.spacetime.common.dao.AppUserDao;
import com.spacetime.common.entity.AppUser;
import com.spacetime.common.exception.BusinessException;
import com.spacetime.common.provider.ImAccountCredential;
import com.spacetime.common.provider.InstantMessageAccountProvider;
import com.spacetime.common.provider.InstantMessageException;
import com.spacetime.miniapp.dto.response.AccessStatusVO;
import com.spacetime.miniapp.dto.response.ImCredentialVO;
import com.spacetime.miniapp.service.impl.MiniappImServiceImpl;
import com.spacetime.miniapp.service.impl.Prd01AccessEvaluator;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.Instant;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class MiniappImServiceImplTest {
    @Mock private AppUserDao userDao;
    @Mock private Prd01AccessEvaluator accessEvaluator;
    @Mock private InstantMessageAccountProvider accountProvider;

    private MiniappImServiceImpl service;

    @BeforeEach
    void setUp() {
        service = new MiniappImServiceImpl(userDao, accessEvaluator, accountProvider);
    }

    @Test
    void shouldIssueCredentialForCoreAccessUser() {
        AppUser user = user(7L);
        AccessStatusVO access = new AccessStatusVO();
        access.setCanMessage(true);
        when(userDao.selectById(7L)).thenReturn(user);
        when(accessEvaluator.evaluate(user)).thenReturn(access);
        when(accountProvider.issueCredential(7L, "测试用户", null)).thenReturn(
                new ImAccountCredential(1400000001L, "tu_random", "user-sig",
                        Instant.parse("2026-08-11T09:00:00Z"), 1));

        ImCredentialVO result = service.credentials(7L);

        assertThat(result.getSdkAppId()).isEqualTo(1400000001L);
        assertThat(result.getImUserId()).isEqualTo("tu_random");
        assertThat(result.getUserSig()).isEqualTo("user-sig");
        assertThat(result.getExpireAt()).isEqualTo("2026-08-11 17:00:00");
        assertThat(result.getProtocolVersion()).isEqualTo(1);
    }

    @Test
    void shouldRejectUserWithoutMessageAccessBeforeCallingTim() {
        AppUser user = user(7L);
        AccessStatusVO access = new AccessStatusVO();
        access.setCanMessage(false);
        when(userDao.selectById(7L)).thenReturn(user);
        when(accessEvaluator.evaluate(user)).thenReturn(access);

        assertThatThrownBy(() -> service.credentials(7L))
                .isInstanceOf(BusinessException.class)
                .extracting("code").isEqualTo(30001);
        verifyNoInteractions(accountProvider);
    }

    @Test
    void shouldMapProviderFailureToCredentialUnavailable() {
        AppUser user = user(7L);
        AccessStatusVO access = new AccessStatusVO();
        access.setCanMessage(true);
        when(userDao.selectById(7L)).thenReturn(user);
        when(accessEvaluator.evaluate(user)).thenReturn(access);
        when(accountProvider.issueCredential(7L, "测试用户", null))
                .thenThrow(new InstantMessageException("TIM_70500", "internal", true));

        assertThatThrownBy(() -> service.credentials(7L))
                .isInstanceOf(BusinessException.class)
                .extracting("code").isEqualTo(30023);
    }

    private AppUser user(Long id) {
        AppUser user = new AppUser();
        user.setId(id);
        user.setNickname("测试用户");
        user.setAccountStatus("NORMAL");
        user.setFirstLoginCompleted(1);
        return user;
    }
}
