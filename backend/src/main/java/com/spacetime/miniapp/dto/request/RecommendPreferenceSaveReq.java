package com.spacetime.miniapp.dto.request;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.Data;

import java.util.List;

/** 保存推荐与理想型共享偏好请求。 */
@Data
public class RecommendPreferenceSaveReq {
    @NotNull(message = "偏好版本不能为空")
    @Min(value = 0, message = "偏好版本不能小于 0")
    private Integer version;
    @NotEmpty(message = "至少选择一个目标城市")
    @Size(max = 3, message = "最多选择 3 个目标城市")
    private List<String> targetCityCodes;
    @NotNull(message = "周边城市开关不能为空")
    private Boolean allowNeighborCity;
    @NotNull(message = "最小年龄不能为空")
    @Min(value = 18, message = "最小年龄不能小于 18 岁")
    @Max(value = 60, message = "最小年龄不能大于 60 岁")
    private Integer minAge;
    @NotNull(message = "最大年龄不能为空")
    @Min(value = 18, message = "最大年龄不能小于 18 岁")
    @Max(value = 60, message = "最大年龄不能大于 60 岁")
    private Integer maxAge;
    private Integer minHeight;
    private Integer maxHeight;
    private Integer minWeight;
    private Integer maxWeight;
    private List<String> educationCodes;
    private List<String> hometowns;
    @Size(max = 10, message = "最多选择 10 所学校")
    private List<String> schoolCodes;
    @Size(max = 10, message = "最多选择 10 个专业")
    private List<String> majorNames;
}
