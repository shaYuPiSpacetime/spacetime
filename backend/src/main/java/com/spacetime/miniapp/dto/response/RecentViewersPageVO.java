package com.spacetime.miniapp.dto.response;

import lombok.Data;

import java.util.List;

/** 最近看过我的分页与统计结果。 */
@Data
public class RecentViewersPageVO {
    private Long current;
    private Long size;
    /** 最近 7 天有效访客去重人数，不受普通用户展示上限影响。 */
    private Long total;
    /** 当前普通/VIP规则下实际可分页人数。 */
    private Long visibleTotal;
    /** total 与 visibleTotal 的差值。 */
    private Long hiddenCount;
    private Long pages;
    private String accessMode;
    private Boolean hasMore;
    private Integer visibleDays;
    /** 历史累计主页访问 PV。 */
    private Long totalPv;
    private Long visitorUv7d;
    private Long visitorPv7d;
    private Long todayVisitorUv;
    private Long todayVisitPv;
    /** 自上次确认查看后新增的当日访客人数。 */
    private Long unreadCount;
    /** 本次响应覆盖的稳定访问事件快照，用于渲染成功后确认已读。 */
    private String readCursor;
    private List<RecentViewerItemVO> records;
}
