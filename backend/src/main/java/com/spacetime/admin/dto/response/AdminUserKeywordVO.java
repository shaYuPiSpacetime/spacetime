package com.spacetime.admin.dto.response;

import lombok.Data;

@Data
public class AdminUserKeywordVO {
    private Long id;
    private Long userId;
    private String keyword;
    private String status;
    private String createTime;
}
