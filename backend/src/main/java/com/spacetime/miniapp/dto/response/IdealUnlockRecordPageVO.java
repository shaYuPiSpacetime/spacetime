package com.spacetime.miniapp.dto.response;

import lombok.Data;

import java.util.List;

/** 理想型解锁历史游标页。 */
@Data
public class IdealUnlockRecordPageVO {
    private List<IdealUnlockRecordVO> items;
    private String nextCursor;
    private Long total;
}
