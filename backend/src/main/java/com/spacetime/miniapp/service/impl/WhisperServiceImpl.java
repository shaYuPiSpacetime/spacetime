package com.spacetime.miniapp.service.impl;

import cn.hutool.core.util.IdUtil;
import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.spacetime.common.dao.AppUserDao;
import com.spacetime.common.dao.AppWhisperDao;
import com.spacetime.common.dao.CoinSceneConfigDao;
import com.spacetime.common.dao.CommunityPostDao;
import com.spacetime.common.dao.UserAssetDao;
import com.spacetime.common.dao.UserCoinLogDao;
import com.spacetime.common.entity.AppUser;
import com.spacetime.common.entity.AppWhisper;
import com.spacetime.common.entity.CoinSceneConfig;
import com.spacetime.common.entity.CommunityPost;
import com.spacetime.common.entity.UserAsset;
import com.spacetime.common.entity.UserCoinLog;
import com.spacetime.common.enums.BizSceneEnum;
import com.spacetime.common.enums.CommonStatusEnum;
import com.spacetime.common.enums.FlowTypeEnum;
import com.spacetime.common.exception.BusinessException;
import com.spacetime.common.provider.ProviderCheckResult;
import com.spacetime.common.provider.TextSafetyProvider;
import com.spacetime.common.service.RelationAccessProjectionService;
import com.spacetime.miniapp.dto.request.WhisperCreateReq;
import com.spacetime.miniapp.dto.request.WhisperPrecheckReq;
import com.spacetime.miniapp.dto.response.WhisperCreateVO;
import com.spacetime.miniapp.dto.response.WhisperPrecheckVO;
import com.spacetime.miniapp.service.WhisperService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Locale;
import java.util.Objects;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/** 动态详情悄悄话的资格校验、幂等落单和资产事务实现。 */
@Service
@RequiredArgsConstructor
public class WhisperServiceImpl implements WhisperService {
    private static final int PARAM_ERROR = 4001;
    private static final int BUSINESS_ERROR = 5001;
    private static final int CONTENT_MAX_LENGTH = 60;
    private static final int IDEMPOTENCY_KEY_MAX_LENGTH = 128;
    private static final String WHISPER_SCENE = "whisper";
    private static final String SOURCE_SCENE = "community_post";
    private static final String STATUS_PENDING = "pending";
    private static final String PAYMENT_COIN = "coin";
    private static final String PAYMENT_FREE_QUOTA = "free_quota";
    private static final Pattern USER_NO_PATTERN = Pattern.compile("^USR-(\\d{12})$");

    private final AppWhisperDao whisperDao;
    private final AppUserDao appUserDao;
    private final CommunityPostDao communityPostDao;
    private final UserAssetDao userAssetDao;
    private final CoinSceneConfigDao sceneConfigDao;
    private final UserCoinLogDao coinLogDao;
    private final RelationAccessProjectionService accessProjectionService;
    private final TextSafetyProvider textSafetyProvider;

    @Override
    public WhisperPrecheckVO precheck(Long senderUserId, WhisperPrecheckReq req) {
        if (req == null) {
            throw new BusinessException(PARAM_ERROR, "预检查请求不能为空");
        }
        WhisperTarget target = requireTarget(senderUserId, req.getTargetUserNo(),
                req.getSourcePostNo(), req.getScene());
        CoinSceneConfig config = enabledWhisperScene();
        UserAsset asset = userAssetDao.selectByUserId(senderUserId);
        int balance = coinBalance(asset);
        int freeRemain = freeWhisperRemain(asset);
        boolean free = freeRemain > 0;
        boolean allowed = free || balance >= config.getUnitPrice();

        WhisperPrecheckVO result = new WhisperPrecheckVO();
        result.setAllowed(allowed);
        result.setReasonCode(allowed ? null : "INSUFFICIENT_COIN");
        result.setReasonText(allowed ? null : "千寻币余额不足");
        result.setContentMaxLength(CONTENT_MAX_LENGTH);
        result.setCoinAmount(config.getUnitPrice());
        result.setFree(free);
        result.setCoinBalance(balance);
        result.setFreeWhisperRemain(freeRemain);
        result.setTargetUserNo(req.getTargetUserNo());
        result.setTargetNickname(target.receiver().getNickname());
        return result;
    }

    @Override
    @Transactional
    public WhisperCreateVO create(Long senderUserId, String idempotencyKey, WhisperCreateReq req) {
        if (req == null) {
            throw new BusinessException(PARAM_ERROR, "创建悄悄话请求不能为空");
        }
        String normalizedKey = normalizeIdempotencyKey(idempotencyKey);
        String content = normalizeContent(req.getContent());

        AppWhisper existing = whisperDao.selectBySenderAndIdempotencyKey(senderUserId, normalizedKey);
        if (existing != null) {
            requireSamePayload(existing, senderUserId, req, content);
            return createResult(existing, coinBalance(userAssetDao.selectByUserId(senderUserId)), false);
        }

        WhisperTarget target = requireTarget(senderUserId, req.getTargetUserNo(),
                req.getSourcePostNo(), req.getScene());
        requireSafeContent(content);
        CoinSceneConfig config = enabledWhisperScene();

        UserAsset before = userAssetDao.selectByUserIdForUpdate(senderUserId);
        if (before == null) {
            throw new BusinessException(BUSINESS_ERROR, "用户资产不存在");
        }

        // 等待资产锁期间可能已有同键事务提交，扣权益前必须再次检查。
        AppWhisper concurrentExisting = whisperDao
                .selectBySenderAndIdempotencyKeyForUpdate(senderUserId, normalizedKey);
        if (concurrentExisting != null) {
            requireSamePayload(concurrentExisting, senderUserId, req, content);
            return createResult(concurrentExisting, coinBalance(before), false);
        }

        int balanceBefore = coinBalance(before);
        int balanceAfter = balanceBefore;
        int coinCost = 0;
        String paymentMethod;
        boolean charged = false;
        if (freeWhisperRemain(before) > 0) {
            if (userAssetDao.consumeFreeWhisper(senderUserId) != 1) {
                throw new BusinessException(BUSINESS_ERROR, "免费次数消费失败，请重试");
            }
            paymentMethod = PAYMENT_FREE_QUOTA;
        } else {
            int price = config.getUnitPrice();
            if (balanceBefore < price || userAssetDao.updateCoinBalance(senderUserId, -price) != 1) {
                throw new BusinessException(BUSINESS_ERROR, "千寻币余额不足");
            }
            coinCost = price;
            balanceAfter = balanceBefore - price;
            paymentMethod = PAYMENT_COIN;
            charged = true;
        }

        LocalDateTime now = LocalDateTime.now();
        AppWhisper whisper = new AppWhisper();
        whisper.setWhisperNo("WSP-" + IdUtil.getSnowflakeNextIdStr());
        whisper.setSenderUserId(senderUserId);
        whisper.setReceiverUserId(target.receiver().getId());
        whisper.setSourcePostNo(req.getSourcePostNo());
        whisper.setScene(req.getScene());
        whisper.setContent(content);
        whisper.setCoinCost(coinCost);
        whisper.setPaymentMethod(paymentMethod);
        whisper.setIdempotencyKey(normalizedKey);
        whisper.setStatus(STATUS_PENDING);
        whisper.setExpireTime(expireTime(config, now));
        whisperDao.insert(whisper);

        if (charged) {
            writeCoinLog(whisper, balanceBefore, balanceAfter);
        }
        if (userAssetDao.updateLastConsumeTime(senderUserId, now) != 1) {
            throw new BusinessException(BUSINESS_ERROR, "资产消费时间更新失败");
        }
        if (whisper.getCreateTime() == null) {
            whisper.setCreateTime(now);
        }
        return createResult(whisper, balanceAfter, charged);
    }

    private WhisperTarget requireTarget(Long senderUserId, String targetUserNo,
                                        String sourcePostNo, String scene) {
        if (senderUserId == null) {
            throw new BusinessException(401, "未登录或登录已过期");
        }
        if (!SOURCE_SCENE.equals(scene)) {
            throw new BusinessException(PARAM_ERROR, "悄悄话场景不支持");
        }
        if (sourcePostNo == null || sourcePostNo.isBlank()) {
            throw new BusinessException(PARAM_ERROR, "来源动态编号不能为空");
        }
        Long receiverUserId = parseTargetUserId(targetUserNo);
        if (Objects.equals(senderUserId, receiverUserId)) {
            throw new BusinessException(PARAM_ERROR, "不能给自己发送悄悄话");
        }
        AppUser sender = requireOpenUser(senderUserId, "发送方关系准入未开放");
        AppUser receiver = requireOpenUser(receiverUserId, "接收方关系准入未开放");
        CommunityPost post = requireSourcePost(sourcePostNo);
        if (!Objects.equals(post.getAuthorId(), receiverUserId)) {
            throw new BusinessException(PARAM_ERROR, "来源动态作者与目标用户不一致");
        }
        return new WhisperTarget(sender, receiver, post);
    }

    private AppUser requireOpenUser(Long userId, String message) {
        AppUser user = appUserDao.selectById(userId);
        if (user == null || !"OPEN".equals(accessProjectionService.project(user))) {
            throw new BusinessException(BUSINESS_ERROR, message);
        }
        return user;
    }

    private CommunityPost requireSourcePost(String sourcePostNo) {
        List<CommunityPost> records = communityPostDao.selectList(new LambdaQueryWrapper<CommunityPost>()
                .eq(CommunityPost::getPostNo, sourcePostNo)
                .eq(CommunityPost::getStatus, "published")
                .last("LIMIT 1"));
        if (records == null || records.isEmpty()) {
            throw new BusinessException(PARAM_ERROR, "来源动态不存在或不可用");
        }
        return records.get(0);
    }

    private Long parseTargetUserId(String targetUserNo) {
        Matcher matcher = targetUserNo == null ? null : USER_NO_PATTERN.matcher(targetUserNo);
        if (matcher == null || !matcher.matches()) {
            throw new BusinessException(PARAM_ERROR, "目标用户编号格式不正确");
        }
        return Long.valueOf(matcher.group(1));
    }

    private CoinSceneConfig enabledWhisperScene() {
        Page<CoinSceneConfig> page = sceneConfigDao.selectPage(new Page<>(1, 1),
                new LambdaQueryWrapper<CoinSceneConfig>()
                        .eq(CoinSceneConfig::getSceneCode, WHISPER_SCENE)
                        .eq(CoinSceneConfig::getStatus, CommonStatusEnum.ENABLED.getCode()));
        CoinSceneConfig config = page == null || page.getRecords() == null || page.getRecords().isEmpty()
                ? null : page.getRecords().get(0);
        if (config == null || config.getUnitPrice() == null || config.getUnitPrice() <= 0) {
            throw new BusinessException(BUSINESS_ERROR, "悄悄话场景暂不可用");
        }
        return config;
    }

    private void requireSafeContent(String content) {
        ProviderCheckResult result;
        try {
            result = textSafetyProvider.check(WHISPER_SCENE, content);
        } catch (RuntimeException ex) {
            throw new BusinessException(BUSINESS_ERROR, "内容安全检查失败，请稍后重试");
        }
        if (result == null || !Boolean.TRUE.equals(result.getSafe())) {
            throw new BusinessException(PARAM_ERROR, "内容安全检查未通过");
        }
    }

    private void requireSamePayload(AppWhisper existing, Long senderUserId,
                                    WhisperCreateReq req, String normalizedContent) {
        Long receiverUserId = parseTargetUserId(req.getTargetUserNo());
        boolean same = Objects.equals(existing.getSenderUserId(), senderUserId)
                && Objects.equals(existing.getReceiverUserId(), receiverUserId)
                && Objects.equals(existing.getSourcePostNo(), req.getSourcePostNo())
                && Objects.equals(existing.getScene(), req.getScene())
                && Objects.equals(existing.getContent(), normalizedContent);
        if (!same) {
            throw new BusinessException(PARAM_ERROR, "幂等键已被不同请求占用");
        }
    }

    private String normalizeIdempotencyKey(String idempotencyKey) {
        if (idempotencyKey == null || idempotencyKey.isBlank()) {
            throw new BusinessException(PARAM_ERROR, "Idempotency-Key 幂等键不能为空");
        }
        String normalized = idempotencyKey.trim();
        if (normalized.length() > IDEMPOTENCY_KEY_MAX_LENGTH) {
            throw new BusinessException(PARAM_ERROR, "Idempotency-Key 幂等键不能超过128个字符");
        }
        return normalized;
    }

    private String normalizeContent(String content) {
        String normalized = content == null ? "" : content.trim();
        int length = normalized.codePointCount(0, normalized.length());
        if (length < 1 || length > CONTENT_MAX_LENGTH) {
            throw new BusinessException(PARAM_ERROR, "悄悄话内容长度必须为1至60字");
        }
        return normalized;
    }

    private LocalDateTime expireTime(CoinSceneConfig config, LocalDateTime now) {
        Integer retentionDays = config.getRetentionDays();
        return retentionDays == null || retentionDays <= 0 ? null : now.plusDays(retentionDays);
    }

    private void writeCoinLog(AppWhisper whisper, int balanceBefore, int balanceAfter) {
        UserCoinLog log = new UserCoinLog();
        log.setFlowNo("CF" + IdUtil.getSnowflakeNextIdStr());
        log.setUserId(whisper.getSenderUserId());
        log.setFlowType(FlowTypeEnum.CONSUME.getCode());
        log.setChangeAmount(-whisper.getCoinCost());
        log.setBalanceBefore(balanceBefore);
        log.setBalanceAfter(balanceAfter);
        log.setBizScene(BizSceneEnum.WHISPER.getCode());
        log.setBizDesc("发送悄悄话 " + whisper.getWhisperNo());
        log.setRefId(whisper.getId());
        log.setRefType("app_whisper");
        coinLogDao.insert(log);
    }

    private WhisperCreateVO createResult(AppWhisper whisper, int balance, boolean charged) {
        WhisperCreateVO result = new WhisperCreateVO();
        result.setWhisperNo(whisper.getWhisperNo());
        result.setStatus(whisper.getStatus());
        result.setTargetUserNo(userNo(whisper.getReceiverUserId()));
        result.setContent(whisper.getContent());
        result.setCoinCost(whisper.getCoinCost());
        result.setCoinBalance(balance);
        result.setCharged(charged);
        result.setPaymentMethod(whisper.getPaymentMethod());
        result.setCreateTime(whisper.getCreateTime());
        result.setExpireTime(whisper.getExpireTime());
        return result;
    }

    private String userNo(Long userId) {
        return userId == null ? null : "USR-" + String.format(Locale.ROOT, "%012d", userId);
    }

    private int coinBalance(UserAsset asset) {
        return asset == null || asset.getCoinBalance() == null ? 0 : asset.getCoinBalance();
    }

    private int freeWhisperRemain(UserAsset asset) {
        return asset == null || asset.getTodayFreeWhisperRemain() == null
                ? 0 : Math.max(0, asset.getTodayFreeWhisperRemain());
    }

    private record WhisperTarget(AppUser sender, AppUser receiver, CommunityPost post) {
    }
}
