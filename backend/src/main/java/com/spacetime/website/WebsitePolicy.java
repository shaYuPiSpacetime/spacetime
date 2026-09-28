package com.spacetime.website;

import com.spacetime.common.community.CommunitySecurityConclusion;
import com.spacetime.common.community.CommunitySecurityResult;
import com.spacetime.common.exception.BusinessException;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

/** 官网活动业务的公开约束。 */
public final class WebsitePolicy {
    private WebsitePolicy() {}

    public static void validateActivity(String title, String content, LocalDateTime startTime,
                                        String location, BigDecimal estimatedCost, List<Long> imageIds) {
        if (title == null || title.isBlank() || title.length() > 100
                || content == null || content.isBlank() || content.length() > 3000) {
            throw new BusinessException("请填写活动标题和内容");
        }
        if (startTime == null || !startTime.isAfter(LocalDateTime.now())) {
            throw new BusinessException("活动时间必须晚于当前时间");
        }
        if (location == null || location.isBlank() || location.length() > 200) {
            throw new BusinessException("请填写活动地点");
        }
        if (estimatedCost == null || estimatedCost.signum() < 0 || estimatedCost.scale() > 2) {
            throw new BusinessException("线下预计费用格式不正确");
        }
        if (imageIds == null || imageIds.isEmpty() || imageIds.size() > 9 || imageIds.stream().anyMatch(id -> id == null || id <= 0)) {
            throw new BusinessException("请上传1至9张活动图片");
        }
    }

    public static void requireSafeText(CommunitySecurityResult result) {
        if (result == null || result.conclusion() != CommunitySecurityConclusion.PASS) {
            throw new BusinessException("内容审核未通过，请修改后重试");
        }
    }

    public static boolean canChat(Long senderId, Long receiverId, Long authorId,
                                  boolean senderRegistered, boolean receiverRegistered) {
        if (senderId == null || receiverId == null || senderId.equals(receiverId)) return false;
        if (receiverId.equals(authorId)) return true;
        if (senderId.equals(authorId)) return receiverRegistered;
        return senderRegistered && receiverRegistered;
    }
}
