package com.spacetime.miniapp.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import lombok.Data;

import java.util.List;

/**
 * 解锁请求
 */
@Data
public class UnlockReq {
    /** 解锁场景 @see com.spacetime.common.enums.UnlockSceneEnum */
    @NotBlank(message = "解锁场景不能为空")
    private String unlockScene;
    /** 目标用户 ID 列表 */
    @NotEmpty(message = "目标用户列表不能为空")
    private List<Long> targetUserIds;
}
