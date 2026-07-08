package com.spacetime.miniapp.service;

import com.spacetime.common.dao.AppUserOpenTextAuditDao;
import com.spacetime.common.dao.ExternalProviderTaskDao;
import com.spacetime.common.exception.BusinessException;
import com.spacetime.common.provider.ProviderCheckResult;
import com.spacetime.common.provider.TextSafetyProvider;
import com.spacetime.miniapp.dto.request.OpenTextSubmitReq;
import com.spacetime.miniapp.service.impl.OpenTextAuditServiceImpl;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.argThat;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
@DisplayName("OpenTextAuditService L3 测试")
class OpenTextAuditServiceTest {

    @Mock
    private AppUserOpenTextAuditDao openTextAuditDao;
    @Mock
    private ExternalProviderTaskDao externalProviderTaskDao;
    @Mock
    private TextSafetyProvider textSafetyProvider;

    @InjectMocks
    private OpenTextAuditServiceImpl service;

    @Test
    @DisplayName("开放性文字只允许三类字段，拒绝 CUSTOM_OPEN_TEXT")
    void shouldRejectCustomOpenTextField() {
        assertThatThrownBy(() -> service.submitOpenText(1L, request("CUSTOM_OPEN_TEXT", "这是一段不应该被接受的预留字段内容")))
                .isInstanceOf(BusinessException.class)
                .hasMessageContaining("开放性文字字段");
    }

    @Test
    @DisplayName("ABOUT_ME mock 文本安全通过时审核来源为 MACHINE，不记录 MOCK 来源")
    void shouldApproveAboutMeWithMachineSourceWhenMockProviderSafe() {
        when(textSafetyProvider.check("ABOUT_ME", "喜欢稳定而真诚的关系，工作之余会运动和看展。"))
                .thenReturn(ProviderCheckResult.safe("mock-text", "{\"risk\":\"none\"}", true));

        var vo = service.submitOpenText(1L, request("ABOUT_ME", "喜欢稳定而真诚的关系，工作之余会运动和看展。"));

        assertThat(vo.getFieldName()).isEqualTo("ABOUT_ME");
        assertThat(vo.getAuditStatus()).isEqualTo("APPROVED");
        assertThat(vo.getAuditSource()).isEqualTo("MACHINE");
        verify(openTextAuditDao).insert(argThat(record ->
                "ABOUT_ME".equals(record.getFieldName())
                        && "APPROVED".equals(record.getAuditStatus())
                        && "MACHINE".equals(record.getAuditSource())));
        verify(externalProviderTaskDao).insert(argThat(task ->
                "TEXT_SAFETY".equals(task.getProviderType())
                        && Integer.valueOf(1).equals(task.getMocked())));
    }

    private OpenTextSubmitReq request(String fieldName, String contentText) {
        OpenTextSubmitReq req = new OpenTextSubmitReq();
        req.setFieldName(fieldName);
        req.setContentText(contentText);
        return req;
    }
}
