package com.spacetime.miniapp.dto.response;

import lombok.Data;

import java.time.LocalDateTime;

/** 主页访问上报结果。 */
@Data
public class RelationVisitActionVO {
    private String visitNo;
    /** true 表示复用幂等事件或归并进 30 分钟展示记录。 */
    private Boolean deduplicated;
    private Integer visitCount;
    private LocalDateTime recordedTime;
}
