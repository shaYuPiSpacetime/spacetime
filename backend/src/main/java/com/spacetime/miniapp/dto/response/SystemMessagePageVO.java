package com.spacetime.miniapp.dto.response;

import lombok.Data;

import java.util.List;

/** 系统消息游标分页。 */
@Data
public class SystemMessagePageVO {
    private List<SystemMessageItemVO> list;
    private String nextCursor;
    private Boolean hasMore;
    private SystemMessageReadAckVO readAck;
}
