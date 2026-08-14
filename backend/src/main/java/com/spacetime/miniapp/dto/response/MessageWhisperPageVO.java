package com.spacetime.miniapp.dto.response;

import lombok.Data;

import java.util.List;

/** 悄悄话分组游标分页。 */
@Data
public class MessageWhisperPageVO {
    private String direction;
    private String bucket;
    private Long totalCount;
    private List<MessageWhisperItemVO> list;
    private String nextCursor;
    private Boolean hasMore;
}
