package com.spacetime.admin.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import lombok.Data;

/**
 * 代理保存请求
 */
@Data
public class PromotionAgentSaveReq {
    /** 代理名称 */
    @NotBlank(message = "代理名称不能为空")
    @Size(max = 100, message = "代理名称长度不能超过100个字符")
    private String agentName;
    /** 联系人 */
    @Size(max = 50, message = "联系人长度不能超过50个字符")
    private String contactName;
    /** 联系电话 */
    @Size(max = 30, message = "联系电话长度不能超过30个字符")
    @Pattern(regexp = "^$|^1[3-9]\\d{9}$", message = "联系电话格式不正确")
    private String contactPhone;
    /** 学校 */
    @NotBlank(message = "学校不能为空")
    @Size(max = 100, message = "学校长度不能超过100个字符")
    private String school;
    /** 校区 */
    @NotBlank(message = "校区不能为空")
    @Size(max = 100, message = "校区长度不能超过100个字符")
    private String campus;
    /** 备注 */
    @Size(max = 500, message = "备注长度不能超过500个字符")
    private String remark;
}
