package com.spacetime.miniapp.dto.response;

import lombok.Data;

import java.time.LocalDateTime;
import java.util.List;

/** 喜欢我的列表项。 */
@Data
public class LikesMeItemVO {
    private String recordNo;
    /** 对方用户ID；是否允许清晰展示由 displayStatus 控制。 */
    private Long userId;
    private String displayStatus;
    /** 用户基础资料在 blur/clear 两种展示态均返回。 */
    private String nickname;
    private String avatar;
    private Integer age;
    private String school;
    /** 在线状态在 blur/clear 两种展示态均返回。 */
    private String onlineStatus;
    private LocalDateTime lastActiveTime;
    private String onlineText;
    /** 资料字段在 blur/clear 两种展示态均返回。 */
    private String identityCode;
    private String identityLabel;
    private String industryCode;
    private String industryLabel;
    private String occupationCode;
    private String occupationLabel;
    private String company;
    /** 年收入区间在 blur/clear 两种展示态均返回。 */
    private String annualIncomeCode;
    private String annualIncomeLabel;
    private List<String> weakTags;
    private String sourceScene;
    /** 是否属于本次查询快照中的新喜欢。 */
    private Boolean isNew;
    /** new、earlier_unlocked、earlier_locked。 */
    private String groupKey;
    private Boolean mutualLike;
    private LocalDateTime likedTime;
    /** 单条解锁生效时间，仅已单条解锁时返回。 */
    private LocalDateTime unlockTime;
    private String likeActionCopy;
}
