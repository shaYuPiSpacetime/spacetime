package com.spacetime.admin.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.Size;
import lombok.Data;

import java.util.List;

/** 家园话题新增/编辑请求。 */
@Data
public class CommunityTopicSaveReq {
    @NotBlank @Size(max = 12) private String topicName;
    @Size(max = 40) private String description;
    @NotBlank private String coverUrl;
    @NotEmpty private List<String> displayScenes;
    @NotNull private Boolean recommended;
    @NotNull @Min(1) @Max(999) private Integer sort;
    @NotBlank private String status;
    private Integer version;
    private String remark;
}
