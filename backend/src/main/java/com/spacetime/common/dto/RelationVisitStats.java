package com.spacetime.common.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

/** 最近七天访客精确统计。 */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class RelationVisitStats {

    private Long uv;
    private Long pv;
}
