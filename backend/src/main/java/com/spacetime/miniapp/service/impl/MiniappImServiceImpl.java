package com.spacetime.miniapp.service.impl;

import com.spacetime.common.dao.AppUserDao;
import com.spacetime.common.entity.AppUser;
import com.spacetime.common.enums.AccountStatusEnum;
import com.spacetime.common.exception.BusinessException;
import com.spacetime.common.provider.ImAccountCredential;
import com.spacetime.common.provider.InstantMessageAccountProvider;
import com.spacetime.common.provider.InstantMessageException;
import com.spacetime.miniapp.dto.response.AccessStatusVO;
import com.spacetime.miniapp.dto.response.ImCredentialVO;
import com.spacetime.miniapp.service.MiniappImService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.time.ZoneId;
import java.time.format.DateTimeFormatter;

/** 校验准入后同步 TIM 账号并签发 24 小时 UserSig。 */
@Service
@RequiredArgsConstructor
public class MiniappImServiceImpl implements MiniappImService {
    private static final ZoneId BUSINESS_ZONE = ZoneId.of("Asia/Shanghai");
    private static final DateTimeFormatter TIME_FORMATTER =
            DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss");

    private final AppUserDao userDao;
    private final Prd01AccessEvaluator accessEvaluator;
    private final InstantMessageAccountProvider accountProvider;

    @Override
    public ImCredentialVO credentials(Long userId) {
        AppUser user = userDao.selectById(userId);
        if (user == null || !AccountStatusEnum.NORMAL.getCode().equals(user.getAccountStatus())) {
            throw new BusinessException(30001, "当前账号不可使用私信功能");
        }
        AccessStatusVO access = accessEvaluator.evaluate(user);
        if (!Boolean.TRUE.equals(access.getCanMessage())) {
            throw new BusinessException(30001, "请完成核心准入后使用私信功能");
        }
        try {
            ImAccountCredential credential = accountProvider.issueCredential(
                    userId, user.getNickname(), null);
            ImCredentialVO result = new ImCredentialVO();
            result.setSdkAppId(credential.sdkAppId());
            result.setImUserId(credential.imUserId());
            result.setUserSig(credential.userSig());
            result.setExpireAt(TIME_FORMATTER.format(
                    credential.expireAt().atZone(BUSINESS_ZONE).toLocalDateTime()));
            result.setProtocolVersion(credential.protocolVersion());
            return result;
        } catch (InstantMessageException ex) {
            throw new BusinessException(30023, "IM 登录凭证暂不可用，请稍后重试");
        }
    }
}
