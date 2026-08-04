package com.spacetime.admin.dto.response;

import lombok.Data;

import java.util.Map;

/** 话题封面 OSS 直传票据。 */
@Data
public class CommunityOssTicketVO {
    private String uploadUrl;
    private String key;
    private Map<String, String> formData;
    private String expiresAt;
    private String fileUrl;
}
