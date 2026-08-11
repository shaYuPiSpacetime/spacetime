package com.spacetime.miniapp.dto.response;

import lombok.Data;

import java.util.List;

/** 官方助手游标分页。 */
@Data
public class AssistantMessagePageVO {
    private List<AssistantMessageItemVO> list;
    private String nextCursor;
    private Boolean hasMore;
}
