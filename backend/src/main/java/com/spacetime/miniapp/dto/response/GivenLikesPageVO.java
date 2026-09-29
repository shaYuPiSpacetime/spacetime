package com.spacetime.miniapp.dto.response;

import lombok.Data;

import java.util.List;

/** 当前用户主动喜欢的用户分页结果。 */
@Data
public class GivenLikesPageVO {
    private Long current;
    private Long size;
    private Long total;
    private Long pages;
    private Boolean hasMore;
    private List<GivenLikeItemVO> records;
}
