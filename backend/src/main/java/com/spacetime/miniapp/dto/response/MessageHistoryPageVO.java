package com.spacetime.miniapp.dto.response;

import lombok.Data;

import java.util.List;

/** 小程序私信历史消息游标分页。 */
@Data
public class MessageHistoryPageVO {
    private List<MessageHistoryItemVO> list;
    private String nextCursor;
    private Boolean hasMore;
}
