package com.spacetime.admin.dto.request;

import jakarta.validation.constraints.AssertTrue;
import lombok.Data;
import org.springframework.util.StringUtils;

/**
 * 注销申请备注/阻断请求
 */
@Data
public class CancelRequestRemarkReq {
    /** 后台备注 */
    private String remark;
    /** 阻断原因（填写后将阻断注销） */
    private String blockReason;

    /** 备注和阻断原因不能同时为空 */
    @AssertTrue(message = "备注和阻断原因不能同时为空")
    public boolean isValid() {
        return StringUtils.hasText(remark) || StringUtils.hasText(blockReason);
    }
}
