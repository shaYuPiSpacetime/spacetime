package com.spacetime.common.enums;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.util.Arrays;
import java.util.Set;
import java.util.function.Function;
import java.util.stream.Collectors;

import static org.assertj.core.api.Assertions.assertThat;

/** PRD-02 关系领域枚举编码和中文说明契约测试。 */
@DisplayName("关系领域枚举契约")
class RelationEnumContractTest {

    @Test
    @DisplayName("状态和来源枚举编码应唯一且中文说明完整")
    void relationEnumsShouldExposeUniqueCodesAndChineseDescriptions() {
        assertEnum(RelationLikeStatusEnum.values(), RelationLikeStatusEnum::getCode, RelationLikeStatusEnum::getDesc);
        assertEnum(RelationVisitStatusEnum.values(), RelationVisitStatusEnum::getCode, RelationVisitStatusEnum::getDesc);
        assertEnum(RelationMatchStatusEnum.values(), RelationMatchStatusEnum::getCode, RelationMatchStatusEnum::getDesc);
        assertEnum(RelationMatchSourceTypeEnum.values(), RelationMatchSourceTypeEnum::getCode, RelationMatchSourceTypeEnum::getDesc);
        assertEnum(RelationMatchSourceStatusEnum.values(), RelationMatchSourceStatusEnum::getCode, RelationMatchSourceStatusEnum::getDesc);
        assertEnum(RelationMatchPopupStatusEnum.values(), RelationMatchPopupStatusEnum::getCode, RelationMatchPopupStatusEnum::getDesc);
        assertEnum(RelationMatchPopupActionEnum.values(), RelationMatchPopupActionEnum::getCode, RelationMatchPopupActionEnum::getDesc);
        assertEnum(RelationInvalidReasonEnum.values(), RelationInvalidReasonEnum::getCode, RelationInvalidReasonEnum::getDesc);
        assertEnum(RelationSourceSceneEnum.values(), RelationSourceSceneEnum::getCode, RelationSourceSceneEnum::getDesc);
        assertEnum(UnlockRecordStatusEnum.values(), UnlockRecordStatusEnum::getCode, UnlockRecordStatusEnum::getDesc);
    }

    @Test
    @DisplayName("确认过的关键编码应保持稳定")
    void confirmedCodesShouldRemainStable() {
        assertThat(RelationLikeStatusEnum.ACTIVE.getCode()).isEqualTo("active");
        assertThat(RelationVisitStatusEnum.EXPIRED_WINDOW.getCode()).isEqualTo("expired_window");
        assertThat(RelationMatchSourceTypeEnum.DOUBLE_LIKE.getDesc()).isEqualTo("双方互送爱心");
        assertThat(RelationMatchPopupActionEnum.SYSTEM_BACK.getDesc()).isEqualTo("系统返回");
        assertThat(RelationInvalidReasonEnum.CERTIFICATION_REVOKED.getDesc()).isEqualTo("认证失效");
        assertThat(UnlockRecordStatusEnum.REFUNDED.getDesc()).isEqualTo("已退款");
    }

    private <E> void assertEnum(E[] values, Function<E, String> code, Function<E, String> desc) {
        Set<String> codes = Arrays.stream(values).map(code).collect(Collectors.toSet());
        assertThat(codes).hasSize(values.length).allMatch(value -> value != null && !value.isBlank());
        assertThat(Arrays.stream(values).map(desc).toList())
                .allMatch(value -> value != null && value.matches(".*[\\u4e00-\\u9fa5].*"));
    }
}
