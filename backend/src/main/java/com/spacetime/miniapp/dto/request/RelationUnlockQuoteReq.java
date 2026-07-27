package com.spacetime.miniapp.dto.request;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

/** 喜欢或访客单条解锁报价请求。 */
@Data
public class RelationUnlockQuoteReq {
    /** likes_unlock_one 或 viewers_unlock_one。 */
    @NotBlank(message = "解锁场景不能为空")
    private String scene;
    /** like-喜欢记录，visit-访客记录。 */
    @NotBlank(message = "目标业务类型不能为空")
    private String targetBizType;
    /** LIK-* 或 VIS-* 关系业务编号。 */
    @NotBlank(message = "目标业务编号不能为空")
    private String targetBizNo;
}
