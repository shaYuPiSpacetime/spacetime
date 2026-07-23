package com.spacetime.miniapp.dto.response;

import lombok.Data;

import java.time.LocalDateTime;
import java.util.List;

/** 最近访客列表项。 */
@Data
public class RecentViewerItemVO {
    /** 最近一条访客展示窗口编号，解锁时作为来源业务编号。 */
    private String recordNo;
    /** 对方用户ID；是否允许清晰展示由 displayStatus 控制。 */
    private Long userId;
    private String displayStatus;
    /** 用户基础资料在 blur/clear 两种展示态均返回。 */
    private String nickname;
    private String avatar;
    private Integer age;
    private String school;
    private String onlineStatus;
    private LocalDateTime lastActiveTime;
    private String onlineText;
    private String identityCode;
    private String identityLabel;
    private String industryCode;
    private String industryLabel;
    private String occupationCode;
    private String occupationLabel;
    private String company;
    private String annualIncomeCode;
    private String annualIncomeLabel;
    private List<String> weakTags;
    /** 最近一条访客展示窗口的首次访问来源。 */
    private String sourceScene;
    /** today、yesterday、recent7d。 */
    private String groupKey;
    private Integer visitCount;
    private LocalDateTime firstVisitTime;
    private LocalDateTime lastVisitTime;
    /** 单条解锁生效时间；VIP清晰但未单条解锁时为空。 */
    private LocalDateTime unlockTime;
    private Boolean mutualLike;
    private List<String> relationBadges;
}
