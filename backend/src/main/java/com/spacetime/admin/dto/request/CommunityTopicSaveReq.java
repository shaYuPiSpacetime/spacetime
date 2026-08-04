package com.spacetime.admin.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.util.List;

/** 家园话题新增/编辑请求。 */
@Data
public class CommunityTopicSaveReq {
    @NotBlank private String topicName;
    private String description;
    @NotBlank private String coverUrl;
    private List<String> displayScenes;
    @NotNull private Boolean recommended;
    @NotNull private Integer sort;
    @NotBlank private String status;
    private Integer version;
    private String remark;
}
