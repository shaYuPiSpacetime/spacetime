package com.spacetime.miniapp.dto.response;

import lombok.Data;

import java.util.List;

/** 最近三天推荐回看。 */
@Data
public class RecommendReplayPageVO {
    private List<RecommendReplayItemVO> items;
    private String nextCursor;
}
