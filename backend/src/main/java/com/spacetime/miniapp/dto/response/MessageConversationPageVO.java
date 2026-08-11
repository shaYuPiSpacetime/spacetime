package com.spacetime.miniapp.dto.response;

import lombok.Data;

import java.util.List;

/** 私信会话游标分页。 */
@Data
public class MessageConversationPageVO {
    private List<MessageConversationItemVO> list;
    private String nextCursor;
    private Boolean hasMore;
}
