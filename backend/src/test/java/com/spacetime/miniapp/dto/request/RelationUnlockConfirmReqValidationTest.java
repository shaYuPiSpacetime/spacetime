package com.spacetime.miniapp.dto.request;

import jakarta.validation.Validation;
import jakarta.validation.ValidatorFactory;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

/** 解锁确认入参必须先拦截超出数据库字段长度的幂等键。 */
class RelationUnlockConfirmReqValidationTest {
    @Test
    void rejectsOversizedRequestIdBeforePersistence() {
        RelationUnlockConfirmReq req = new RelationUnlockConfirmReq();
        req.setRequestId("x".repeat(66));
        req.setQuoteToken("uq_" + "a".repeat(32));

        try (ValidatorFactory factory = Validation.buildDefaultValidatorFactory()) {
            assertThat(factory.getValidator().validate(req))
                    .anySatisfy(violation -> assertThat(violation.getPropertyPath().toString())
                            .isEqualTo("requestId"));
        }
    }
}
