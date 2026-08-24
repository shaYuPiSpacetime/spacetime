package com.spacetime.common.community;

import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Component;

import java.util.List;

/** 内容安全明确关闭时的保守适配器。 */
@Component
@ConditionalOnProperty(name = "community.content-security.provider", havingValue = "unavailable")
public class UnavailableCommunityContentSecurityAdapter implements CommunityContentSecurityPort {
    public CommunitySecurityResult checkText(String openId, String content, String scene) {
        return CommunitySecurityResult.unavailable("provider_disabled");
    }

    public CommunitySecurityResult checkImages(String openId, List<String> imageUrls, String scene) {
        return CommunitySecurityResult.unavailable("provider_disabled");
    }

    public CommunitySecurityResult checkAudio(String openId, String audioUrl, String scene) {
        return CommunitySecurityResult.unavailable("provider_disabled");
    }
}
