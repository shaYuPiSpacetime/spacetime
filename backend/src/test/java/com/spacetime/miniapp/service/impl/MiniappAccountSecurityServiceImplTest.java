package com.spacetime.miniapp.service.impl;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.spacetime.common.dao.AppConfigDao;
import com.spacetime.common.dao.AppUserCancelRequestDao;
import com.spacetime.common.dao.AppUserDao;
import com.spacetime.common.dao.AppUserSecurityAuditLogDao;
import com.spacetime.common.dao.RefundRecordDao;
import com.spacetime.common.entity.AppConfig;
import com.spacetime.common.entity.AppUser;
import com.spacetime.common.entity.AppUserCancelRequest;
import com.spacetime.common.enums.AccountStatusEnum;
import com.spacetime.common.enums.CancelRequestStatusEnum;
import com.spacetime.miniapp.dto.request.MiniappAccountCancelReq;
import com.spacetime.miniapp.dto.response.CoinBalanceVO;
import com.spacetime.miniapp.dto.response.MiniappAccountCancelCheckVO;
import com.spacetime.miniapp.dto.response.VipStatusVO;
import com.spacetime.miniapp.service.CoinService;
import com.spacetime.miniapp.service.VipService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.data.redis.core.ValueOperations;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyBoolean;
import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.nullable;
import static org.mockito.Mockito.doAnswer;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/**
 * 账号注销状态机服务测试。
 */
@ExtendWith(MockitoExtension.class)
class MiniappAccountSecurityServiceImplTest {
    @Mock private AppUserCancelRequestDao cancelRequestDao;
    @Mock private AppUserSecurityAuditLogDao auditLogDao;
    @Mock private AppConfigDao appConfigDao;
    @Mock private AppUserDao appUserDao;
    @Mock private RefundRecordDao refundRecordDao;
    @Mock private VipService vipService;
    @Mock private CoinService coinService;
    @Mock private AccountCancellationRiskEvaluator riskEvaluator;
    @Mock private StringRedisTemplate redisTemplate;
    @Mock private ValueOperations<String, String> valueOperations;

    private MiniappAccountSecurityServiceImpl service;

    @BeforeEach
    void setUp() {
        service = new MiniappAccountSecurityServiceImpl(
                cancelRequestDao,
                auditLogDao,
                appConfigDao,
                appUserDao,
                refundRecordDao,
                vipService,
                coinService,
                riskEvaluator,
                new ObjectMapper(),
                redisTemplate);
    }

    @Test
    void applyMustPersistSnapshotAndMoveAccountToCancelling() {
        AppUser user = user(AccountStatusEnum.NORMAL.getCode());
        CoinBalanceVO coin = new CoinBalanceVO();
        coin.setCoinBalance(18);
        MiniappAccountCancelCheckVO check = new MiniappAccountCancelCheckVO();
        check.setCanSubmit(true);
        check.setHardBlocks(List.of());
        check.setRisks(List.of());

        when(cancelRequestDao.selectCoolingOffByUserId(7L)).thenReturn(null);
        when(redisTemplate.opsForValue()).thenReturn(valueOperations);
        when(valueOperations.get("miniapp:account-cancel:recheck:7")).thenReturn("token-7");
        when(appConfigDao.selectByKey(anyString())).thenAnswer(invocation ->
                config(invocation.getArgument(0)));
        when(appConfigDao.selectByKeys(any())).thenReturn(List.of());
        when(appUserDao.selectById(7L)).thenReturn(user);
        when(vipService.getStatus(7L)).thenReturn(new VipStatusVO());
        when(coinService.getBalance(7L)).thenReturn(coin);
        when(refundRecordDao.count(any())).thenReturn(0L);
        when(riskEvaluator.evaluate(
                anyString(), anyBoolean(), nullable(String.class), any(), any(),
                anyInt(), anyString(), any(), any())).thenReturn(check);
        doAnswer(invocation -> {
            ((AppUserCancelRequest) invocation.getArgument(0)).setId(19L);
            return null;
        }).when(cancelRequestDao).insert(any(AppUserCancelRequest.class));

        MiniappAccountCancelReq req = new MiniappAccountCancelReq();
        req.setConfirm(true);
        req.setReason("其他：暂时离开");
        req.setRecheckToken("token-7");
        Long requestId = service.applyCancel(7L, req);

        ArgumentCaptor<AppUserCancelRequest> requestCaptor =
                ArgumentCaptor.forClass(AppUserCancelRequest.class);
        verify(cancelRequestDao).insert(requestCaptor.capture());
        AppUserCancelRequest saved = requestCaptor.getValue();
        assertThat(saved.getRequestNo()).startsWith("CAN");
        assertThat(saved.getStatus()).isEqualTo(CancelRequestStatusEnum.COOLING_OFF.getCode());
        assertThat(saved.getCoinBalance()).isEqualTo(18);
        assertThat(saved.getRiskSnapshot()).isEqualTo("[]");
        assertThat(user.getAccountStatus()).isEqualTo(AccountStatusEnum.CANCELLING.getCode());
        assertThat(requestId).isEqualTo(19L);
    }

    @Test
    void revokeMustRestoreBothRequestAndAccount() {
        AppUserCancelRequest request = new AppUserCancelRequest();
        request.setId(11L);
        request.setUserId(7L);
        request.setStatus(CancelRequestStatusEnum.COOLING_OFF.getCode());
        AppUser user = user(AccountStatusEnum.CANCELLING.getCode());
        when(cancelRequestDao.selectCoolingOffByUserId(7L)).thenReturn(request);
        when(appUserDao.selectById(7L)).thenReturn(user);

        service.revokeCancel(7L);

        assertThat(request.getStatus()).isEqualTo(CancelRequestStatusEnum.RESTORED.getCode());
        assertThat(user.getAccountStatus()).isEqualTo(AccountStatusEnum.NORMAL.getCode());
        verify(cancelRequestDao).updateById(request);
        verify(appUserDao).updateById(user);
    }

    private AppUser user(String status) {
        AppUser user = new AppUser();
        user.setId(7L);
        user.setAccountStatus(status);
        return user;
    }

    private AppConfig config(String key) {
        AppConfig config = new AppConfig();
        config.setConfigKey(key);
        config.setConfigValue(switch (key) {
            case "account_cancel.reasons" -> "[\"其他\"]";
            case "account_cancel.cooling_days" -> "30";
            case "account_cancel.description" -> "注销说明";
            case "account_cancel.reason_required" -> "请选择注销原因";
            case "account_cancel.recheck_required" -> "请重新校验";
            case "account_cancel.blocked_fallback_text" -> "暂不可注销";
            case "account_cancel.confirm_required" -> "请确认注销";
            case "account_cancel.no_active_request" -> "无可撤销申请";
            case "account_cancel.risk.dependency_unavailable.description" -> "风险服务不可用";
            default -> null;
        });
        return config;
    }
}
