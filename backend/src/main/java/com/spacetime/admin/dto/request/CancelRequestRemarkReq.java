package com.spacetime.admin.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Data;

/**
 * 注销申请追加备注请求。
 */
@Data
public class CancelRequestRemarkReq {
    /** 后台备注，只允许追加。 */
    @NotBlank(message = "备注不能为空")
    @Size(max = 500, message = "备注不能超过500个字符")
    private String remark;
}
