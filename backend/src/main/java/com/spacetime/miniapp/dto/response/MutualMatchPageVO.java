package com.spacetime.miniapp.dto.response;

import lombok.Data;

import java.util.List;

/** 相互喜欢分页结果。 */
@Data
public class MutualMatchPageVO {
    private Long current;
    private Long size;
    private Long total;
    private Long pages;
    private Boolean hasMore;
    private List<MutualMatchItemVO> records;
}
