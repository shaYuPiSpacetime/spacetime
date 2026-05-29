package com.spacetime.miniapp.dto.response;

import lombok.Data;

/**
 * 小程序搜索热词视图对象
 */
@Data
public class MiniappHotWordVO {
    /** 热词内容 */
    private String word;
    /** 适用场景 */
    private String scene;
}
