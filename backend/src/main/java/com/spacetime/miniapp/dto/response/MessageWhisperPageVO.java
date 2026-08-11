package com.spacetime.miniapp.dto.response;

import lombok.Data;

import java.util.List;

/** 待处理悄悄话游标分页。 */
@Data
public class MessageWhisperPageVO {
    private List<MessageWhisperItemVO> list;
    private String nextCursor;
    private Boolean hasMore;
}
