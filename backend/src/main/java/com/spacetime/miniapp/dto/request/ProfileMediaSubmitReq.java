package com.spacetime.miniapp.dto.request;

import lombok.Data;
import jakarta.validation.constraints.NotNull;

/**
 * 资料媒体提交请求。
 */
@Data
public class ProfileMediaSubmitReq {
    /** 媒体类型：ALBUM、PROFILE_BG；头像和学历材料走各自专用提交接口。 */
    private String mediaType;
    /** 原图或原始文件 URL。 */
    private String mediaUrl;
    /** 缩略图 URL，可为空。 */
    private String thumbUrl;
    /** 文件大小，单位 byte；用于按后台上传限制做二次校验。 */
    @NotNull(message = "文件大小不能为空")
    private Long fileSizeBytes;
    /** 展示顺序。 */
    private Integer sortOrder;
}
