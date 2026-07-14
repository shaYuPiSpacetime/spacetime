package com.spacetime.miniapp.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

/** 小程序直传 OSS 凭证请求。 */
@Data
public class OssUploadTicketReq {
    @NotBlank(message = "文件名不能为空")
    private String fileName;
    @NotNull(message = "文件大小不能为空")
    private Long fileSizeBytes;
}
