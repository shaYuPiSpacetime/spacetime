package com.spacetime.admin.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.spacetime.admin.dto.request.GlobalSendSwitchReq;
import com.spacetime.admin.dto.request.MessageConfigPublishReq;
import com.spacetime.admin.dto.request.MessageTemplatePublishReq;
import com.spacetime.admin.dto.response.MessageConfigVO;
import com.spacetime.admin.service.impl.MessageConfigAdminServiceImpl;
import com.spacetime.common.dao.AppMessageRuleVersionDao;
import com.spacetime.common.dao.AppMessageRuntimeControlDao;
import com.spacetime.common.dao.AppMessageTemplateVersionDao;
import com.spacetime.common.dao.ContentOperationLogDao;
import com.spacetime.common.dao.MenuDao;
import com.spacetime.common.entity.AppMessageRuleVersion;
import com.spacetime.common.entity.AppMessageRuntimeControl;
import com.spacetime.common.exception.BusinessException;
import com.spacetime.common.interceptor.UserContext;
import com.spacetime.common.interceptor.UserContextHolder;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.argThat;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
@DisplayName("PRD-03 消息配置后台服务")
class MessageConfigAdminServiceImplTest {
    @Mock private AppMessageRuleVersionDao ruleDao;
    @Mock private AppMessageRuntimeControlDao runtimeDao;
    @Mock private AppMessageTemplateVersionDao templateDao;
    @Mock private ContentOperationLogDao operationLogDao;
    @Mock private MenuDao menuDao;

    @AfterEach
    void clearContext() {
        UserContextHolder.clear();
    }

    @Test
    @DisplayName("发布普通规则应退役旧版本并插入新的唯一当前版本")
    void shouldPublishImmutableRuleVersion() {
        UserContextHolder.set(new UserContext(7L, "运营", List.of("operator"),
                List.of("message:config:edit")));
        AppMessageRuleVersion current = currentRule("MSG-CFG-001");
        AppMessageRuntimeControl runtime = runtime(true, 3);
        when(ruleDao.selectCurrent("global")).thenReturn(current);
        when(ruleDao.retireCurrent(1L)).thenReturn(1);
        when(runtimeDao.selectByControlKey("global_send_enabled")).thenReturn(runtime);
        MessageConfigPublishReq req = publishRequest("MSG-CFG-001");

        MessageConfigVO result = service().publishVersion(req);

        assertThat(result.getVersionNo()).startsWith("MSG-CFG-");
        assertThat(result.getVersionNo()).isNotEqualTo("MSG-CFG-001");
        verify(ruleDao).retireCurrent(1L);
        verify(ruleDao).insert(argThat(value -> "published".equals(value.getStatus())
                && Integer.valueOf(1).equals(value.getActiveMarker())
                && Long.valueOf(7L).equals(value.getPublishedBy())));
        verify(operationLogDao).insert(argThat(value -> "MESSAGE_CONFIG".equals(value.getBizType())));
    }

    @Test
    @DisplayName("全局发送开关应按期望版本原子更新")
    void shouldUpdateGlobalSwitchByVersion() {
        UserContextHolder.set(new UserContext(8L, "风控", List.of("risk"),
                List.of("message:config:edit")));
        AppMessageRuntimeControl current = runtime(true, 5);
        when(runtimeDao.selectByControlKeyForUpdate("global_send_enabled")).thenReturn(current);
        when(runtimeDao.updateByVersion(any(), org.mockito.ArgumentMatchers.eq(5))).thenReturn(1);
        GlobalSendSwitchReq req = new GlobalSendSwitchReq();
        req.setEnabled(false);
        req.setExpectedVersion(5);
        req.setReason("发生紧急安全事件，暂停新消息发送");

        var result = service().updateGlobalSend(req);

        assertThat(result.getEnabled()).isFalse();
        assertThat(result.getVersion()).isEqualTo(6);
        verify(operationLogDao).insert(argThat(value -> "MESSAGE_RUNTIME".equals(value.getBizType())));
    }

    @Test
    @DisplayName("旧登录会话缺少角色时应从数据库补查超级管理员角色")
    void shouldResolveRiskRoleForLegacySession() {
        UserContextHolder.set(new UserContext(1L, "peter", null,
                List.of("message:config:edit")));
        when(menuDao.selectRoleCodesByUserId(1L)).thenReturn(List.of("super_admin"));
        AppMessageRuntimeControl current = runtime(true, 5);
        when(runtimeDao.selectByControlKeyForUpdate("global_send_enabled")).thenReturn(current);
        when(runtimeDao.updateByVersion(any(), org.mockito.ArgumentMatchers.eq(5))).thenReturn(1);
        GlobalSendSwitchReq req = new GlobalSendSwitchReq();
        req.setEnabled(false);
        req.setExpectedVersion(5);
        req.setReason("兼容旧登录会话执行安全开关操作");

        var result = service().updateGlobalSend(req);

        assertThat(result.getEnabled()).isFalse();
        verify(menuDao).selectRoleCodesByUserId(1L);
    }

    @Test
    @DisplayName("官方助手只能使用助手动作枚举，不能配置用户主页跳转")
    void assistantTemplateShouldRejectSystemOnlyJumpType() {
        MessageTemplatePublishReq req = new MessageTemplatePublishReq();
        req.setBizType("getting_started");
        req.setNotificationType("assistant");
        req.setTitleTemplate("欢迎使用消息中心");
        req.setContentTemplate("查看消息中心使用帮助");
        req.setAllowedVariables(List.of());
        req.setJumpType("profile");
        req.setJumpValueTemplate("/pages/user/profile");
        req.setSafetyRequired(true);
        req.setRemark("验证官方助手跳转类型白名单");

        assertThatThrownBy(() -> service().publishTemplate("assistant_getting_started", req))
                .isInstanceOf(BusinessException.class)
                .hasMessageContaining("模板跳转类型不合法");
        verifyNoInteractions(templateDao, operationLogDao);
    }

    @Test
    @DisplayName("模板行动文案渲染前也必须限制为最多十个字符")
    void templateShouldRejectActionTextLongerThanTenCharacters() {
        MessageTemplatePublishReq req = new MessageTemplatePublishReq();
        req.setBizType("getting_started");
        req.setNotificationType("assistant");
        req.setTitleTemplate("欢迎使用消息中心");
        req.setContentTemplate("查看消息中心使用帮助");
        req.setCardType("action");
        req.setContentFormat("plain_text");
        req.setActionTextTemplate("一二三四五六七八九十十一");
        req.setAllowedVariables(List.of());
        req.setJumpType("help");
        req.setJumpValueTemplate("chat-safety");
        req.setSafetyRequired(true);
        req.setRemark("验证行动文案长度和运行时限制保持一致");

        assertThatThrownBy(() -> service().publishTemplate("assistant_getting_started", req))
                .isInstanceOf(BusinessException.class)
                .hasMessageContaining("行动文案不能超过10个字符");
        verifyNoInteractions(templateDao, operationLogDao);
    }

    private MessageConfigAdminServiceImpl service() {
        return new MessageConfigAdminServiceImpl(ruleDao, runtimeDao, templateDao,
                operationLogDao, menuDao, new ObjectMapper());
    }

    private AppMessageRuleVersion currentRule(String versionNo) {
        AppMessageRuleVersion value = new AppMessageRuleVersion();
        value.setId(1L);
        value.setVersionNo(versionNo);
        value.setScopeCode("global");
        value.setStatus("published");
        value.setActiveMarker(1);
        value.setFemaleProtectionEnabled(1);
        value.setFemaleProtectionDays(3);
        value.setWhisperExpireDays(7);
        value.setWhisperCooldownDays(7);
        value.setOrdinaryMessageRetainDays(180);
        value.setSystemMessageVisibleDays(730);
        value.setReportEvidenceRetainDays(1095);
        value.setSevereEvidenceRetainDays(1825);
        value.setSensitiveAuditRetainDays(1095);
        return value;
    }

    private AppMessageRuntimeControl runtime(boolean enabled, int version) {
        AppMessageRuntimeControl value = new AppMessageRuntimeControl();
        value.setId(2L);
        value.setControlKey("global_send_enabled");
        value.setEnabled(enabled ? 1 : 0);
        value.setVersion(version);
        return value;
    }

    private MessageConfigPublishReq publishRequest(String expectedVersion) {
        MessageConfigPublishReq req = new MessageConfigPublishReq();
        req.setExpectedVersion(expectedVersion);
        req.setRemark("调整消息配置用于正式版本发布");
        req.setFemaleProtectionEnabled(true);
        req.setFemaleProtectionDays(3);
        req.setWhisperExpireDays(7);
        req.setWhisperCooldownDays(7);
        req.setOrdinaryMessageRetainDays(180);
        req.setSystemMessageVisibleDays(730);
        req.setReportEvidenceRetainDays(1095);
        req.setSevereEvidenceRetainDays(1825);
        req.setSensitiveAuditRetainDays(1095);
        return req;
    }
}
