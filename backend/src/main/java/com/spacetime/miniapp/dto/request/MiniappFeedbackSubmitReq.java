package com.spacetime.miniapp.dto.request;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

import java.util.List;

@Data
public class MiniappFeedbackSubmitReq {
    @NotBlank(message = "反馈类型不能为空")
    private String feedbackType;
    @NotBlank(message = "反馈内容不能为空")
    private String content;
    private List<String> imageUrls;
    private String contact;
}
