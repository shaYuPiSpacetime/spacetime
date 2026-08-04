package com.spacetime.admin.dto.response;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.ArrayList;
import java.util.List;

/** 社区管理页统计卡。 */
@Data
public class CommunityStatsVO {
    private List<Card> cards = new ArrayList<>();

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class Card {
        private String code;
        private String label;
        private Object value;
        private String tone;
    }
}
