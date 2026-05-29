package com.spacetime.admin.dto.response;

import lombok.Data;

import java.util.List;

@Data
public class AdminFeedbackVO {
    private Long id;
    private Long userId;
    private String nickname;
    private String feedbackType;
    private String content;
    private List<String> imageUrls;
    private String contact;
    private String status;
    private String handleRemark;
    private Long handledBy;
    private String handledTime;
    private String createTime;
}
