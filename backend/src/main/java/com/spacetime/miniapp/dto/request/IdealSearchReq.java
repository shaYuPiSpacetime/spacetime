package com.spacetime.miniapp.dto.request;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.Data;

import java.util.List;

/** 理想型筛选快照创建请求。 */
@Data
public class IdealSearchReq {
    @NotBlank(message = "请求幂等键不能为空")
    private String requestId;
    @NotNull(message = "偏好版本不能为空")
    @Min(value = 0, message = "偏好版本不能小于 0")
    private Integer preferenceVersion;
    @NotEmpty(message = "至少选择一个目标城市")
    @Size(max = 3, message = "最多选择 3 个目标城市")
    private List<String> targetCityCodes;
    @NotNull(message = "最小年龄不能为空")
    @Min(value = 18, message = "最小年龄不能小于 18 岁")
    @Max(value = 60, message = "最小年龄不能大于 60 岁")
    private Integer minAge;
    @NotNull(message = "最大年龄不能为空")
    @Min(value = 18, message = "最大年龄不能小于 18 岁")
    @Max(value = 60, message = "最大年龄不能大于 60 岁")
    private Integer maxAge;
    @Size(max = 17, message = "理想型条件数量不能超过 17 个")
    private List<String> conditionCodes;
}
