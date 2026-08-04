package com.spacetime.common.community;

import java.util.List;

/**
 * 微信内容安全的领域端口。
 */
public interface CommunityContentSecurityPort {
    CommunitySecurityResult checkText(String openId, String content, String scene);

    CommunitySecurityResult checkImages(String openId, List<String> imageUrls, String scene);

    default CommunitySecurityResult checkPost(String openId, String content, List<String> imageUrls, String scene) {
        CommunitySecurityResult textResult = checkText(openId, content, scene);
        if (textResult.conclusion() != CommunitySecurityConclusion.PASS) {
            return textResult;
        }
        if (imageUrls == null || imageUrls.isEmpty()) {
            return textResult;
        }
        return checkImages(openId, imageUrls, scene);
    }
}
