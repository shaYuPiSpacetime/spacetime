package com.spacetime.common.service.impl;

import com.spacetime.common.dao.AppMessageRuleVersionDao;
import com.spacetime.common.entity.AppMessageConversation;
import com.spacetime.common.entity.AppMessageRuleVersion;
import com.spacetime.common.service.MessageFemaleProtectionService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

/** 零天保护立即放行已有会话，保留创建时的配置及截止时间。 */
@Service
@RequiredArgsConstructor
public class MessageFemaleProtectionServiceImpl implements MessageFemaleProtectionService {
    private final AppMessageRuleVersionDao ruleDao;

    @Override
    public boolean isEnabled(AppMessageConversation conversation) {
        if (!Integer.valueOf(1).equals(conversation.getProtectionEnabled())) {
            return false;
        }
        AppMessageRuleVersion current = ruleDao.selectCurrent("global");
        return current == null || !Integer.valueOf(0).equals(current.getFemaleProtectionDays());
    }
}
