package com.spacetime.miniapp.dto.request;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

/** 匹配成功弹窗用户动作回执。 */
@Data
public class MatchPopupReadReq {
    /** later、close、profile、chat、system_back。 */
    @NotBlank(message = "弹窗动作不能为空")
    private String action;
}
