package com.spacetime.miniapp.dto.response;

import lombok.Data;

/** 新喜欢顶部头像摘要；是否模糊展示由前端根据 displayStatus 控制。 */
@Data
public class LikesMeAvatarPreviewVO {
    private String recordNo;
    private String displayStatus;
    private String avatar;
    /** online-最近5分钟活跃，offline-当前不在线。 */
    private String onlineStatus;
}
