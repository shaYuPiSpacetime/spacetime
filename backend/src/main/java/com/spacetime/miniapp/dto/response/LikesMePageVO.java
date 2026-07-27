package com.spacetime.miniapp.dto.response;

import lombok.Data;

import java.util.List;

/** 喜欢我的分页结果。 */
@Data
public class LikesMePageVO {
    private Long current;
    private Long size;
    /** 当前全部有效入向喜欢真实数量。 */
    private Long total;
    /** 当前快照中尚未确认查看的有效喜欢真实数量。 */
    private Long newCount;
    /** 按会员和单条解锁规则实际可分页数量。 */
    private Long visibleTotal;
    /** 当前有效但普通用户列表不可见的未解锁数量。 */
    private Long hiddenCount;
    private Long pages;
    /** 当前查询快照；后续分页原样回传，首屏渲染成功后用于确认已读。 */
    private String readCursor;
    private List<LikesMeAvatarPreviewVO> newLikePreviewAvatars;
    /** BLUR_LIMIT、MIXED、VIP_ALL_CLEAR。 */
    private String accessMode;
    private Boolean hasMore;
    private List<LikesMeItemVO> records;
}
