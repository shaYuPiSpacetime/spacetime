package com.spacetime.miniapp.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import lombok.Data;

/**
 * 添加头像请求。
 * 小程序完成拍照/相册选择、裁剪和文件上传后，将裁剪图地址提交到本接口。
 */
@Data
public class AvatarSubmitReq {

    /** 头像来源：CAMERA（拍照）、ALBUM（相册）。 */
    @NotBlank(message = "头像来源不能为空")
    private String avatarSource;

    /** 裁剪后的头像公网 URL。 */
    @NotBlank(message = "头像 URL 不能为空")
    @Pattern(regexp = "https?://.+", message = "头像 URL 格式不正确")
    private String avatarUrl;

    /** 头像缩略图 URL，可为空。 */
    @Pattern(regexp = "^$|https?://.+", message = "头像缩略图 URL 格式不正确")
    private String thumbUrl;
}
