package com.spacetime.admin.service;

import com.spacetime.admin.dto.request.PromotionAgentSaveReq;
import com.spacetime.admin.dto.response.PromotionAgentCodeVO;
import com.spacetime.admin.service.impl.PromotionAgentAdminServiceImpl;
import com.spacetime.common.dao.PromotionAgentCodeDao;
import com.spacetime.common.dao.PromotionAgentDao;
import com.spacetime.common.dao.PromotionAgentEventDao;
import com.spacetime.common.dao.PromotionAuditLogDao;
import com.spacetime.common.entity.PromotionAgent;
import com.spacetime.common.entity.PromotionAgentCode;
import com.spacetime.common.exception.BusinessException;
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
    private PromotionAgentCodeDao agentCodeDao;
    @Mock
    private PromotionAgentEventDao agentEventDao;
    @Mock
    private PromotionAuditLogDao auditLogDao;

    @InjectMocks
    private PromotionAgentAdminServiceImpl service;

    @Test
    @DisplayName("F3-P0-05 新增代理默认 normal/DEFAULT")
    void createAgent_shouldFillDefaults() {
        PromotionAgentSaveReq req = new PromotionAgentSaveReq();
        req.setAgentName("北大校园代理");

        service.create(req);

        verify(agentDao).insert(argThat(agent ->
                "北大校园代理".equals(agent.getAgentName())
                        && "normal".equals(agent.getStatus())
                        && "DEFAULT".equals(agent.getAgentGroup())));
        verify(auditLogDao).insert(any());
    }

    @Test
    @DisplayName("F3-P0-06 生成代理码返回 enabled 和小程序路径")
    void regenerateCode_shouldReturnEnabledCode() {
        PromotionAgent agent = new PromotionAgent();
        agent.setId(1L);
        agent.setAgentName("代理");
        when(agentDao.selectById(1L)).thenReturn(agent);

        PromotionAgentCodeVO vo = service.regenerateCode(1L);

        assertThat(vo.getAgentCode()).startsWith("A");
        assertThat(vo.getMiniappPath()).contains("agentCode=");
        assertThat(vo.getStatus()).isEqualTo("enabled");
        verify(agentCodeDao).insert(any(PromotionAgentCode.class));
    }

    @Test
    @DisplayName("F3-P1-01 停用代理码")
    void disableCode_shouldUpdateStatus() {
        PromotionAgentCode code = new PromotionAgentCode();
        code.setId(3L);
        code.setStatus("enabled");
        when(agentCodeDao.selectById(3L)).thenReturn(code);

        service.disableCode(3L);

        assertThat(code.getStatus()).isEqualTo("disabled");
        verify(agentCodeDao).updateById(code);
        verify(auditLogDao).insert(any());
    }

    @Test
    @DisplayName("停用不存在代理码应报错")
    void disableMissingCode_shouldReject() {
        when(agentCodeDao.selectById(404L)).thenReturn(null);

        assertThatThrownBy(() -> service.disableCode(404L))
                .isInstanceOf(BusinessException.class)
                .hasMessageContaining("代理码不存在");
    }
}
