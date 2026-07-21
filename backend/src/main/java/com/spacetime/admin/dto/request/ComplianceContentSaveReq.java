package com.spacetime.admin.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Data;

/**
 * 公告与协议预置内容受控编辑请求。
 */
@Data
public class ComplianceContentSaveReq {
    /** 标题。 */
    @NotBlank(message = "标题不能为空")
    @Size(max = 40, message = "标题长度不能超过40个字符")
    private String title;
    /** H5 地址。 */
    @NotBlank(message = "H5地址不能为空")
    private String contentUrl;
    /** 启停状态。 */
    @NotBlank(message = "状态不能为空")
    private String status;
}
