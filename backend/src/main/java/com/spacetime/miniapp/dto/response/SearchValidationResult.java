package com.spacetime.miniapp.dto.response;

import lombok.AllArgsConstructor;
import lombok.Data;

/**
 * 搜索关键词校验结果
 */
@Data
@AllArgsConstructor
public class SearchValidationResult {
    /** 是否命中屏蔽词 */
    private boolean violated;
    /** 提示信息 */
    private String message;
}
