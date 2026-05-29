package com.spacetime.miniapp.dto.response;

import lombok.Data;

import java.util.List;

@Data
public class MiniappSearchResultPageVO {
    private String keyword;
    private String type;
    private List<String> tabs;
    private List<MiniappSearchResultItemVO> items;
    private Boolean hasMore;
    private Long totalCount;
    private Boolean violation;
    private String message;
}
