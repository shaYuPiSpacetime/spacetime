package com.spacetime.admin.service;

import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.spacetime.admin.dto.request.PromotionAgentSaveReq;
import com.spacetime.admin.dto.response.PromotionAgentQrCodeVO;
import com.spacetime.admin.service.impl.PromotionAgentAdminServiceImpl;
import com.spacetime.common.dao.PromotionAgentQrCodeDao;
import com.spacetime.common.dao.PromotionAgentDao;
import com.spacetime.common.dao.PromotionAgentEventDao;
import com.spacetime.common.dao.PromotionAuditLogDao;
import com.spacetime.common.entity.PromotionAgent;
import com.spacetime.common.entity.PromotionAgentQrCode;
import com.spacetime.common.exception.BusinessException;
import com.spacetime.common.service.PromotionAgentStatService;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
@DisplayName("PromotionAgentAdminServiceImpl L3 测试")
class PromotionAgentAdminServiceImplTest {

    @Mock
    private PromotionAgentDao agentDao;
    @Mock
    private PromotionAgentQrCodeDao qrCodeDao;
    @Mock
    private PromotionAgentEventDao agentEventDao;
    @Mock
    private PromotionAuditLogDao auditLogDao;
    @Mock
    private PromotionAgentStatService agentStatService;

    @InjectMocks
    private PromotionAgentAdminServiceImpl service;

    @Test
    @DisplayName("F3-P0-05 新增代理默认 normal")
    void createAgent_shouldFillDefaults() {
        PromotionAgentSaveReq req = new PromotionAgentSaveReq();
        req.setAgentName("北大校园代理");

        service.create(req);

        verify(agentDao).insert(argThat(agent ->
                "北大校园代理".equals(agent.getAgentName())
                        && "normal".equals(agent.getStatus())
                        && agent.getAgentGroup() == null));
        verify(agentStatService).initAgentStat(any(PromotionAgent.class));
        verify(auditLogDao).insert(any());
    }

    @Test
    @DisplayName("F3-P0-06 生成校园代理二维码返回 enabled 和小程序路径")
    void regenerateCode_shouldReturnEnabledCode() {
        PromotionAgent agent = new PromotionAgent();
        agent.setId(1L);
        agent.setAgentName("代理");
        PromotionAgentQrCode latestCode = new PromotionAgentQrCode();
        latestCode.setVersionNo(2);
        Page<PromotionAgentQrCode> latestPage = new Page<>(1, 1);
        latestPage.setRecords(java.util.List.of(latestCode));
        when(agentDao.selectById(1L)).thenReturn(agent);
        when(qrCodeDao.selectPage(any(), any())).thenReturn(latestPage);

        PromotionAgentQrCodeVO vo = service.regenerateCode(1L);

        assertThat(vo.getQrCode()).startsWith("A");
        assertThat(vo.getMiniappPath()).contains("qrCode=");
        assertThat(vo.getVersionNo()).isEqualTo(3);
        assertThat(vo.getStatus()).isEqualTo("enabled");
        verify(qrCodeDao).insert(any(PromotionAgentQrCode.class));
    }

    @Test
    @DisplayName("F3-P1-01 停用校园代理二维码")
    void disableCode_shouldUpdateStatus() {
        PromotionAgentQrCode code = new PromotionAgentQrCode();
        code.setId(3L);
        code.setStatus("enabled");
        when(qrCodeDao.selectById(3L)).thenReturn(code);

        service.disableCode(3L);

        assertThat(code.getStatus()).isEqualTo("disabled");
        verify(qrCodeDao).updateById(code);
        verify(auditLogDao).insert(any());
    }

    @Test
    @DisplayName("停用不存在校园代理二维码应报错")
    void disableMissingCode_shouldReject() {
        when(qrCodeDao.selectById(404L)).thenReturn(null);

        assertThatThrownBy(() -> service.disableCode(404L))
                .isInstanceOf(BusinessException.class)
                .hasMessageContaining("校园代理二维码不存在");
    }
}
