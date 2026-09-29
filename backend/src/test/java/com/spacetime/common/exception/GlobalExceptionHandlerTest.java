package com.spacetime.common.exception;

import com.spacetime.common.result.R;
import org.junit.jupiter.api.Test;
import org.springframework.validation.BeanPropertyBindingResult;
import org.springframework.validation.BindException;
import org.springframework.validation.FieldError;
import org.springframework.web.method.annotation.MethodArgumentTypeMismatchException;

import static org.assertj.core.api.Assertions.assertThat;

class GlobalExceptionHandlerTest {
    private final GlobalExceptionHandler handler = new GlobalExceptionHandler();

    @Test
    void validationMessagesUseChineseFieldNames() {
        BeanPropertyBindingResult result = new BeanPropertyBindingResult(new Object(), "request");
        result.addError(new FieldError("request", "nickname", "不能为空"));

        R<Void> response = handler.handleBindException(new BindException(result));

        assertThat(response.getMsg()).isEqualTo("昵称：不能为空");
        assertThat(response.getMsg()).doesNotContain("nickname");
    }

    @Test
    void typeMismatchMessagesUseChineseFieldNames() {
        MethodArgumentTypeMismatchException exception = new MethodArgumentTypeMismatchException(
                "abc", Integer.class, "page", null, new NumberFormatException("abc"));

        R<Void> response = handler.handleMethodArgumentTypeMismatch(exception);

        assertThat(response.getMsg()).isEqualTo("页码：参数格式不正确");
        assertThat(response.getMsg()).doesNotContain("page");
    }

    @Test
    void unknownFieldsDoNotLeakInternalEnglishNames() {
        BeanPropertyBindingResult result = new BeanPropertyBindingResult(new Object(), "request");
        result.addError(new FieldError("request", "internalField", "格式错误"));

        R<Void> response = handler.handleBindException(new BindException(result));

        assertThat(response.getMsg()).isEqualTo("参数：格式错误");
        assertThat(response.getMsg()).doesNotContain("internalField");
    }
}
