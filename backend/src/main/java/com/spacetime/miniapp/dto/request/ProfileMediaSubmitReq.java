package com.spacetime.miniapp.dto.request;

import lombok.Data;

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
    /** 展示顺序。 */
    private Integer sortOrder;
}
