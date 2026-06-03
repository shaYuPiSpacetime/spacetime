package com.spacetime.miniapp.dto.response;

import lombok.Data;

import java.util.List;

/**
 * 社区公共配置
 */
@Data
public class CommunityConfigVO {

    /** 交互门槛模式：login_only（仅登录）/ full_cert（三项认证） */
    private String interactionGateMode;
    /** 发帖最多图片数 */
    private Integer postMaxImages;
    /** 发帖最大正文长度 */
    private Integer postMaxTextLength;
    /** 发帖最多@用户数 */
    private Integer postMaxMentions;
    /** 诚意贴最小正文长度 */
    private Integer sincerePostMinTextLength;
    /** 是否允许留联系方式 */
    private Boolean contactInfoAllowed;
    /** 是否开启举报入口 */
    private Boolean reportEntryEnabled;
    /** 首页Tab列表 */
    private List<MiniappEntryConfigVO> homeTabs;
}
