package com.spacetime.miniapp.dto.response;

import lombok.Data;

import java.util.List;

/** 最近二十次理想型筛选记录游标页。 */
@Data
public class IdealSearchRecordPageVO {
    private List<IdealSearchRecordVO> items;
    private String nextCursor;
    private Long total;
}
