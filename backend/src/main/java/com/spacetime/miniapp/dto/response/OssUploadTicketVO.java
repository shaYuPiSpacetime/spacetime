package com.spacetime.miniapp.dto.response;

import lombok.AllArgsConstructor;
import lombok.Data;

import java.util.Map;

/** 小程序直传 OSS 短时表单凭证。 */
@Data
@AllArgsConstructor
public class OssUploadTicketVO {
    private String uploadUrl;
    private String key;
    private Map<String, String> formData;
    private Long expiresAt;
    private String fileUrl;
    private Boolean protectedFile;
}
