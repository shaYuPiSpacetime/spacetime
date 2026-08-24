package com.spacetime.common.entity;

import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;
import lombok.EqualsAndHashCode;

@Data
@EqualsAndHashCode(callSuper = true)
@TableName("external_provider_task")
public class ExternalProviderTask extends BaseEntity {
    private String providerType;
    private String providerCode;
    private String externalTaskId;
    private Long userId;
    private String requestPayloadJson;
    private String responsePayloadJson;
    private String taskStatus;
    private Integer mocked;
    private String errorMessage;
}
