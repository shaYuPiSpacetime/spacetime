package com.spacetime.miniapp.dto.request;

import lombok.Data;

/**
 * 开放性文字提交请求。
 */
@Data
public class OpenTextSubmitReq {
    /** 字段类型：ABOUT_ME、HOPE_THEY_KNOW、PROFILE_QA。 */
    private String fieldName;

    /** 用户输入的开放性文字内容。 */
    private String contentText;
}
