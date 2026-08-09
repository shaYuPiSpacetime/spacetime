package com.spacetime.miniapp.dto.request;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import lombok.Data;

/**
 * 首登五步资料提交请求。
 *
 * 这里只接收首次登录流程字段；昵称、身高、职业、家乡等后续资料统一走资料修改接口。
 */
@Data
public class ProfileInitStepReq {
    /** 当前步骤号：1性别、2年龄、3身份、4学历、5地址。 */
    @NotNull(message = "步骤不能为空")
    private Integer step;

    /** 性别，取值 MALE/FEMALE。 */
    private String gender;

    /** 出生日期，格式 yyyy-MM-dd。 */
    @Pattern(regexp = "^\\d{4}-\\d{2}-\\d{2}$", message = "出生日期格式必须为yyyy-MM-dd")
    private String birthday;

    /** 身份字典 code，如 STUDENT/WORKER。 */
    private String identity;

    /** 学历字典 code，如 BACHELOR/MASTER。 */
    private String educationLevel;

    /** 现居省。 */
    private String locationProvince;

    /** 现居市。 */
    private String locationCity;

    /** 历史客户端兼容字段；首登已固定为省市两级，服务端忽略该值。 */
    private String locationDistrict;
}
