package com.spacetime.miniapp.service.impl;

import cn.hutool.core.util.IdUtil;
import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.spacetime.common.dao.AppMessageDeliveryOutboxDao;
import com.spacetime.common.dao.AppMessageConversationDao;
import com.spacetime.common.dao.AppMessageRecordDao;
import com.spacetime.common.dao.AppMessageRuleVersionDao;
import com.spacetime.common.dao.AppMessageRuntimeControlDao;
import com.spacetime.common.dao.AppMessageWhisperDao;
import com.spacetime.common.dao.AppRelationMatchDao;
import com.spacetime.common.dao.AppUserDao;
import com.spacetime.common.dao.AppUserRelationBlockDao;
import com.spacetime.common.dao.CoinSceneConfigDao;
import com.spacetime.common.dao.UserAssetDao;
import com.spacetime.common.dao.UserCoinLogDao;
import com.spacetime.common.dao.VipBenefitDao;
import com.spacetime.common.entity.AppMessageDeliveryOutbox;
import com.spacetime.common.entity.AppMessageConversation;
import com.spacetime.common.entity.AppMessageRecord;
import com.spacetime.common.entity.AppMessageRuleVersion;
import com.spacetime.common.entity.AppMessageRuntimeControl;
import com.spacetime.common.entity.AppMessageWhisper;
import com.spacetime.common.entity.AppUser;
import com.spacetime.common.entity.CoinSceneConfig;
import com.spacetime.common.entity.UserAsset;
import com.spacetime.common.entity.UserCoinLog;
import com.spacetime.common.entity.VipBenefit;
import com.spacetime.common.enums.BizSceneEnum;
import com.spacetime.common.enums.AccountStatusEnum;
import com.spacetime.common.enums.CommonStatusEnum;
import com.spacetime.common.enums.FlowTypeEnum;
import com.spacetime.common.enums.MessageDeliveryStatusEnum;
import com.spacetime.common.enums.MessageReliableStatusEnum;
import com.spacetime.common.enums.MessageSendStatusEnum;
import com.spacetime.common.enums.MessageReadStatusEnum;
import com.spacetime.common.enums.MessageTypeEnum;
import com.spacetime.common.enums.MessageWhisperStatusEnum;
import com.spacetime.common.enums.RelationBlockTypeEnum;
import com.spacetime.common.enums.VipStatusEnum;
import com.spacetime.common.exception.BusinessException;
import com.spacetime.common.service.RelationAccessProjectionService;
import com.spacetime.common.service.VerifiedSchoolPairService;
import com.spacetime.common.service.VerifiedSchoolPairService.VerifiedSchoolPairResult;
import com.spacetime.miniapp.dto.request.WhisperCreateReq;
import com.spacetime.miniapp.dto.request.WhisperPrecheckReq;
import com.spacetime.miniapp.dto.response.WhisperCreateVO;
import com.spacetime.miniapp.dto.response.WhisperPrecheckVO;
import com.spacetime.miniapp.service.WhisperQuoteStore;
import com.spacetime.miniapp.service.WhisperQuoteStore.WhisperQuoteSnapshot;
import com.spacetime.miniapp.service.WhisperService;
import lombok.RequiredArgsConstructor;
import org.springframework.dao.DuplicateKeyException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Duration;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.LinkedHashMap;
import java.util.Locale;
import java.util.Map;
import java.util.Objects;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/** 悄悄话报价、资产核销和可靠投递入队。 */
@Service
@RequiredArgsConstructor
public class WhisperServiceImpl implements WhisperService {
    private static final int PARAM_ERROR = 4001;
    private static final int ACCESS_RESTRICTED = 30001;
    private static final int RELATION_FORBIDDEN = 30002;
    private static final int DUPLICATE_PENDING = 30005;
    private static final int COOLDOWN_ACTIVE = 30006;
    private static final int ASSET_INSUFFICIENT = 30007;
    private static final int GLOBAL_SEND_DISABLED = 30015;
    private static final int IDEMPOTENCY_CONFLICT = 30020;
    private static final int QUOTE_CHANGED = 30021;
    private static final int INTERNAL_ERROR = 5001;
    private static final String EXISTING_PENDING = "EXISTING_PENDING";
    private static final String MATCHED_PRIVATE_CHAT = "MATCHED_PRIVATE_CHAT";
    private static final int CONTENT_MAX_LENGTH = 60;
    private static final int REQUEST_ID_MIN_LENGTH = 8;
    private static final int REQUEST_ID_MAX_LENGTH = 64;
    private static final Duration QUOTE_TTL = Duration.ofMinutes(10);
    private static final String RULE_SCOPE = "global";
    private static final String GLOBAL_SEND_KEY = "global_send_enabled";
    private static final String WHISPER_SCENE = "whisper";
    private static final String PAY_COIN = "coin";
    private static final String PAY_VIP_FREE = "vip_free";
    private static final String PAY_SCHOOL_FREE = "school_free";
    private static final Pattern USER_NO_PATTERN = Pattern.compile("^USR-(\\d{12})$");
    private static final List<String> SOURCE_SCENES = List.of(
            "recommendation", "profile", "community_post", "community_comment",
            "whisper_reverse");

    private final AppMessageWhisperDao whisperDao;
    private final AppMessageConversationDao conversationDao;
    private final AppMessageRecordDao recordDao;
    private final AppMessageDeliveryOutboxDao outboxDao;
    private final AppUserDao appUserDao;
    private final UserAssetDao userAssetDao;
    private final CoinSceneConfigDao sceneConfigDao;
    private final UserCoinLogDao coinLogDao;
    private final VipBenefitDao vipBenefitDao;
    private final AppRelationMatchDao matchDao;
    private final AppUserRelationBlockDao relationBlockDao;
    private final AppMessageRuleVersionDao ruleVersionDao;
    private final AppMessageRuntimeControlDao runtimeControlDao;
    private final RelationAccessProjectionService accessProjectionService;
    private final VerifiedSchoolPairService verifiedSchoolPairService;
    private final WhisperQuoteStore quoteStore;
    private final ObjectMapper objectMapper;

    @Override
    public WhisperPrecheckVO precheck(Long senderUserId, WhisperPrecheckReq req) {
        if (req == null) {
            throw new BusinessException(PARAM_ERROR, "预检查请求不能为空");
        }
        LocalDateTime now = LocalDateTime.now();
        SourceContext source = sourceContext(req.getSourceScene(), req.getSourceBizNo());
        requireGlobalSendEnabled();
        WhisperTarget target = resolveTarget(senderUserId, req.getTargetUserNo());
        long low = Math.min(senderUserId, target.receiver().getId());
        long high = Math.max(senderUserId, target.receiver().getId());
        if (matchDao.selectActivePair(low, high) != null) {
            AppMessageConversation conversation = conversationDao.selectActivePair(low, high);
            return blockedPrecheck(senderUserId, req.getTargetUserNo(), target,
                    MATCHED_PRIVATE_CHAT, "双方已经匹配，请直接发送私信", null,
                    conversation == null ? null : conversation.getConversationNo());
        }
        AppMessageWhisper active = whisperDao.selectActivePair(low, high);
        if (active != null) {
            return blockedPrecheck(senderUserId, req.getTargetUserNo(), target,
                    EXISTING_PENDING, "双方已有悄悄话待回复", active.getWhisperNo(), null);
        }
        AppMessageWhisper latest = whisperDao.selectLatestPair(low, high);
        if (latest != null && Objects.equals(senderUserId, latest.getSenderUserId())
                && MessageWhisperStatusEnum.EXPIRED.getCode().equals(latest.getStatus())
                && latest.getCooldownUntil() != null && latest.getCooldownUntil().isAfter(now)) {
            throw new BusinessException(COOLDOWN_ACTIVE, "悄悄话仍在冷却期，请稍后再试");
        }
        AppMessageRuleVersion rule = requireCurrentRule();
        VerifiedSchoolPairResult schoolPair = verifiedSchoolPairService.resolve(
                target.sender(), target.receiver());
        UserAsset asset = schoolPair.sameSchool() ? null : userAssetDao.selectByUserId(senderUserId);
        PaymentChoice payment = schoolPair.sameSchool()
                ? schoolPayment(schoolPair)
                : resolveLegacyPayment(senderUserId, asset, enabledWhisperScene().getUnitPrice(), now);
        boolean canSend = !PAY_COIN.equals(payment.payType())
                || coinBalance(asset) >= payment.coinAmount();
        LocalDateTime quoteExpireAt = now.plus(QUOTE_TTL);
        String quoteToken = canSend ? quoteStore.issue(new WhisperQuoteSnapshot(
                senderUserId, target.receiver().getId(), req.getTargetUserNo(),
                source.scene(), source.bizNo(), payment.payType(),
                payment.coinAmount(), payment.freeRemain(), rule.getVersionNo(),
                requirePositive(rule.getWhisperExpireDays(), "悄悄话有效期配置不可用"),
                requirePositive(rule.getWhisperCooldownDays(), "悄悄话冷却期配置不可用"),
                quoteExpireAt, payment.canonicalSchoolCode(),
                payment.qualificationFingerprint())) : null;

        WhisperPrecheckVO result = new WhisperPrecheckVO();
        result.setCanSend(canSend);
        result.setReasonCode(canSend ? null : "INSUFFICIENT_COIN");
        result.setReasonText(canSend ? null : "千寻币余额不足");
        result.setContentMaxLength(CONTENT_MAX_LENGTH);
        result.setPayType(payment.payType());
        result.setCoinAmount(payment.coinAmount());
        result.setFree(!PAY_COIN.equals(payment.payType()));
        result.setCoinBalance(coinBalance(asset));
        result.setFreeWhisperRemain(payment.freeRemain());
        result.setFreeWhisperDailyQuota(PAY_SCHOOL_FREE.equals(payment.payType())
                ? 0 : payment.quotaSnapshot() > 0
                ? payment.quotaSnapshot() : configuredDailyFreeQuota());
        boolean freeExhausted = PAY_COIN.equals(payment.payType())
                && payment.quotaSnapshot() > 0 && payment.freeRemain() == 0;
        result.setFreeWhisperExhausted(freeExhausted);
        result.setQuoteToken(quoteToken);
        result.setQuoteExpireTime(canSend ? quoteExpireAt : null);
        result.setWhisperExpireDays(rule.getWhisperExpireDays());
        result.setCooldownDays(rule.getWhisperCooldownDays());
        result.setConfirmText(switch (payment.payType()) {
            case PAY_SCHOOL_FREE -> "同校免费，本次不消耗千寻币和会员免费次数";
            case PAY_VIP_FREE -> "本次使用会员今日免费悄悄话";
            default -> freeExhausted
                    ? "今日免费次数已用完（" + payment.quotaSnapshot() + "/"
                            + payment.quotaSnapshot() + "），本次消耗 "
                            + payment.coinAmount() + " 千寻币"
                    : "确认消耗 " + payment.coinAmount() + " 千寻币发送悄悄话";
        });
        result.setTargetUserNo(req.getTargetUserNo());
        result.setTargetNickname(target.receiver().getNickname());
        return result;
    }

    /**
     * 构造不可新建但可继续已有关系的预检查结果，避免前端只能收到 Toast 而丢失历史入口。
     *
     * @param senderUserId 当前用户 ID
     * @param targetUserNo 目标用户编号
     * @param target 已完成准入校验的目标用户
     * @param reasonCode 分流原因
     * @param reasonText 分流提示
     * @param existingWhisperNo 已有悄悄话编号
     * @param existingConversationNo 已有私信会话编号
     * @return 可供前端分流的预检查结果
     */
    private WhisperPrecheckVO blockedPrecheck(Long senderUserId, String targetUserNo,
                                               WhisperTarget target, String reasonCode,
                                               String reasonText, String existingWhisperNo,
                                               String existingConversationNo) {
        UserAsset asset = userAssetDao.selectByUserId(senderUserId);
        WhisperPrecheckVO result = new WhisperPrecheckVO();
        result.setCanSend(false);
        result.setReasonCode(reasonCode);
        result.setReasonText(reasonText);
        result.setContentMaxLength(CONTENT_MAX_LENGTH);
        result.setPayType(PAY_COIN);
        result.setCoinAmount(0);
        result.setFree(false);
        result.setCoinBalance(coinBalance(asset));
        result.setFreeWhisperRemain(0);
        result.setFreeWhisperDailyQuota(configuredDailyFreeQuota());
        result.setFreeWhisperExhausted(false);
        result.setQuoteToken(null);
        result.setQuoteExpireTime(null);
        result.setWhisperExpireDays(0);
        result.setCooldownDays(0);
        result.setConfirmText(reasonText);
        result.setTargetUserNo(targetUserNo);
        result.setTargetNickname(target.receiver().getNickname());
        result.setExistingWhisperNo(existingWhisperNo);
        result.setExistingConversationNo(existingConversationNo);
        return result;
    }

    @Override
    @Transactional
    public WhisperCreateVO create(Long senderUserId, String idempotencyKey, WhisperCreateReq req) {
        if (req == null) {
            throw new BusinessException(PARAM_ERROR, "创建悄悄话请求不能为空");
        }
        String requestId = normalizeRequestId(idempotencyKey);
        String content = normalizeContent(req.getContent());
        SourceContext source = sourceContext(req.getSourceScene(), req.getSourceBizNo());
        AppMessageWhisper existing = whisperDao.selectBySenderRequestId(senderUserId, requestId);
        if (existing != null) {
            return existingResult(existing, req.getTargetUserNo(), content, source, senderUserId);
        }

        WhisperQuoteSnapshot quote = quoteStore.read(req.getQuoteToken());
        LocalDateTime now = LocalDateTime.now();
        requireQuoteIdentity(quote, senderUserId, req.getTargetUserNo(), source, now);
        requireGlobalSendEnabled();
        WhisperTarget target = requireEligiblePair(senderUserId, req.getTargetUserNo(), now);
        if (!Objects.equals(target.receiver().getId(), quote.receiverUserId())) {
            throw new BusinessException(QUOTE_CHANGED, "悄悄话对象已变化，请重新预检");
        }

        // 创建前再次读取所有可变事实；同校免费不锁资产、不消费会员额度。
        requireGlobalSendEnabled();
        target = requireEligiblePair(senderUserId, req.getTargetUserNo(), now);
        AppMessageRuleVersion rule = requireCurrentRule();
        VerifiedSchoolPairResult schoolPair = verifiedSchoolPairService.resolve(
                target.sender(), target.receiver());
        UserAsset asset;
        PaymentChoice payment;
        if (PAY_SCHOOL_FREE.equals(quote.payType())) {
            if (!schoolPair.sameSchool()) {
                throw new BusinessException(QUOTE_CHANGED, "同校免费资格已变化，请重新预检");
            }
            asset = null;
            payment = schoolPayment(schoolPair);
        } else {
            asset = userAssetDao.selectByUserIdForUpdate(senderUserId);
            if (asset == null) {
                throw new BusinessException(ASSET_INSUFFICIENT, "用户资产不存在");
            }
            payment = schoolPair.sameSchool()
                    ? schoolPayment(schoolPair)
                    : resolveLegacyPayment(senderUserId, asset,
                            enabledWhisperScene().getUnitPrice(), now);
        }
        requireSameQuote(quote, payment, rule);

        AppMessageWhisper concurrent = whisperDao.selectBySenderRequestId(senderUserId, requestId);
        if (concurrent != null) {
            return existingResult(concurrent, req.getTargetUserNo(), content, source, senderUserId);
        }

        int balanceBefore = coinBalance(asset);
        int balanceAfter = balanceBefore;
        boolean charged = false;
        String consumeFlowNo = null;
        if (PAY_COIN.equals(payment.payType())) {
            if (balanceBefore < payment.coinAmount()
                    || userAssetDao.updateCoinBalance(senderUserId, -payment.coinAmount()) != 1) {
                throw new BusinessException(ASSET_INSUFFICIENT, "千寻币余额不足");
            }
            balanceAfter -= payment.coinAmount();
            charged = true;
            consumeFlowNo = businessNo("CF");
        }

        String whisperNo = businessNo("WSP");
        AppMessageRecord message = createRequestMessage(
                senderUserId, target.receiver().getId(), requestId, whisperNo, content, now);
        recordDao.insert(message);
        if (message.getId() == null) {
            throw new BusinessException(INTERNAL_ERROR, "悄悄话消息主表写入失败");
        }

        AppMessageWhisper whisper = createWhisper(senderUserId, target.receiver().getId(),
                requestId, whisperNo, message.getId(), source, payment, rule, consumeFlowNo, now);
        try {
            whisperDao.insert(whisper);
        } catch (DuplicateKeyException ex) {
            throw new BusinessException(DUPLICATE_PENDING, "双方已有悄悄话待回复");
        }
        if (whisper.getId() == null) {
            throw new BusinessException(INTERNAL_ERROR, "悄悄话业务记录写入失败");
        }

        if (charged) {
            writeCoinLog(whisper, requestId, consumeFlowNo, balanceBefore, balanceAfter);
        } else if (PAY_VIP_FREE.equals(payment.payType())
                && userAssetDao.updateFreeWhisperProjection(
                senderUserId, Math.max(0, payment.freeRemain() - 1)) != 1) {
            throw new BusinessException(INTERNAL_ERROR, "会员免费次数投影更新失败");
        }

        AppMessageDeliveryOutbox outbox = createRequestOutbox(whisper, message, requestId);
        outboxDao.insert(outbox);
        if (outbox.getId() == null) {
            throw new BusinessException(INTERNAL_ERROR, "悄悄话投递任务写入失败");
        }
        if (!PAY_SCHOOL_FREE.equals(payment.payType())
                && userAssetDao.updateLastConsumeTime(senderUserId, now) != 1) {
            throw new BusinessException(INTERNAL_ERROR, "资产消费时间更新失败");
        }
        return createResult(whisper, balanceAfter, charged);
    }

    private WhisperTarget requireEligiblePair(Long senderUserId, String targetUserNo,
                                               LocalDateTime now) {
        WhisperTarget target = resolveTarget(senderUserId, targetUserNo);
        long low = Math.min(senderUserId, target.receiver().getId());
        long high = Math.max(senderUserId, target.receiver().getId());
        if (matchDao.selectActivePair(low, high) != null) {
            throw new BusinessException(RELATION_FORBIDDEN, "双方已经匹配，请直接发送私信");
        }
        if (whisperDao.selectActivePair(low, high) != null) {
            throw new BusinessException(DUPLICATE_PENDING, "双方已有悄悄话待回复");
        }
        AppMessageWhisper latest = whisperDao.selectLatestPair(low, high);
        if (latest != null && Objects.equals(senderUserId, latest.getSenderUserId())
                && MessageWhisperStatusEnum.EXPIRED.getCode().equals(latest.getStatus())
                && latest.getCooldownUntil() != null && latest.getCooldownUntil().isAfter(now)) {
            throw new BusinessException(COOLDOWN_ACTIVE, "悄悄话仍在冷却期，请稍后再试");
        }
        return target;
    }

    private WhisperTarget resolveTarget(Long senderUserId, String targetUserNo) {
        if (senderUserId == null) {
            throw new BusinessException(401, "未登录或登录已过期");
        }
        Long receiverUserId = parseTargetUserId(targetUserNo);
        if (Objects.equals(senderUserId, receiverUserId)) {
            throw new BusinessException(PARAM_ERROR, "不能给自己发送悄悄话");
        }
        AppUser sender = requireOpenUser(senderUserId, "发送方关系准入未开放");
        AppUser receiver = requireNormalReceiver(receiverUserId);
        String blacklist = RelationBlockTypeEnum.BLACKLIST.getCode();
        if (relationBlockDao.selectActive(senderUserId, receiverUserId, blacklist) != null
                || relationBlockDao.selectActive(receiverUserId, senderUserId, blacklist) != null) {
            throw new BusinessException(RELATION_FORBIDDEN, "双方当前不可发送悄悄话");
        }
        return new WhisperTarget(sender, receiver);
    }

    private AppUser requireOpenUser(Long userId, String message) {
        AppUser user = appUserDao.selectById(userId);
        if (user == null || !"OPEN".equals(accessProjectionService.project(user))) {
            throw new BusinessException(ACCESS_RESTRICTED, message);
        }
        return user;
    }

    /** 接收方只要求账号正常；三重认证是发送方准入条件，不能对接收方对称校验。 */
    private AppUser requireNormalReceiver(Long userId) {
        AppUser user = appUserDao.selectById(userId);
        if (user == null || !AccountStatusEnum.NORMAL.getCode().equals(user.getAccountStatus())) {
            throw new BusinessException(ACCESS_RESTRICTED, "接收方账号状态异常");
        }
        return user;
    }

    private void requireGlobalSendEnabled() {
        AppMessageRuntimeControl control = runtimeControlDao.selectByControlKey(GLOBAL_SEND_KEY);
        if (control == null || !Integer.valueOf(1).equals(control.getEnabled())) {
            throw new BusinessException(GLOBAL_SEND_DISABLED, "平台消息发送暂时暂停");
        }
    }

    private AppMessageRuleVersion requireCurrentRule() {
        AppMessageRuleVersion rule = ruleVersionDao.selectCurrent(RULE_SCOPE);
        if (rule == null || rule.getVersionNo() == null || rule.getVersionNo().isBlank()) {
            throw new BusinessException(INTERNAL_ERROR, "消息规则尚未发布");
        }
        requirePositive(rule.getWhisperExpireDays(), "悄悄话有效期配置不可用");
        requirePositive(rule.getWhisperCooldownDays(), "悄悄话冷却期配置不可用");
        return rule;
    }

    private CoinSceneConfig enabledWhisperScene() {
        Page<CoinSceneConfig> page = sceneConfigDao.selectPage(new Page<>(1, 1),
                new LambdaQueryWrapper<CoinSceneConfig>()
                        .eq(CoinSceneConfig::getSceneCode, WHISPER_SCENE)
                        .eq(CoinSceneConfig::getStatus, CommonStatusEnum.ENABLED.getCode()));
        CoinSceneConfig config = first(page);
        if (config == null || config.getUnitPrice() == null || config.getUnitPrice() <= 0) {
            throw new BusinessException(INTERNAL_ERROR, "悄悄话消费场景暂不可用");
        }
        return config;
    }

    private PaymentChoice resolveLegacyPayment(Long senderUserId, UserAsset asset, int coinPrice,
                                               LocalDateTime now) {
        int quota = dailyVipFreeQuota(asset, now);
        if (quota > 0) {
            LocalDate benefitDate = now.toLocalDate();
            long used = whisperDao.countPaidVipFree(senderUserId, benefitDate);
            int remain = Math.max(0, quota - Math.toIntExact(Math.min(used, Integer.MAX_VALUE)));
            if (remain > 0) {
                return new PaymentChoice(PAY_VIP_FREE, 0, remain, quota, benefitDate,
                        null, null);
            }
        }
        return new PaymentChoice(PAY_COIN, coinPrice, 0, quota, null, null, null);
    }

    private PaymentChoice schoolPayment(VerifiedSchoolPairResult schoolPair) {
        return new PaymentChoice(PAY_SCHOOL_FREE, 0, 0, 0, null,
                schoolPair.canonicalSchoolCode(), schoolPair.qualificationFingerprint());
    }

    private int dailyVipFreeQuota(UserAsset asset, LocalDateTime now) {
        boolean active = asset != null && VipStatusEnum.ACTIVE.getCode().equals(asset.getVipStatus())
                && (asset.getVipExpireTime() == null || asset.getVipExpireTime().isAfter(now));
        if (!active) {
            return 0;
        }
        return configuredDailyFreeQuota();
    }

    private int configuredDailyFreeQuota() {
        Page<VipBenefit> page = vipBenefitDao.selectPage(new Page<>(1, 1),
                new LambdaQueryWrapper<VipBenefit>()
                        .eq(VipBenefit::getBenefitCode, "free_whisper")
                        .eq(VipBenefit::getStatus, CommonStatusEnum.ENABLED.getCode()));
        VipBenefit benefit = first(page);
        return benefit == null || benefit.getBenefitValue() == null
                ? 0 : Math.max(0, benefit.getBenefitValue());
    }

    private void requireQuoteIdentity(WhisperQuoteSnapshot quote, Long senderUserId,
                                      String targetUserNo, SourceContext source,
                                      LocalDateTime now) {
        if (quote == null || quote.expireAt() == null || !quote.expireAt().isAfter(now)
                || !Objects.equals(senderUserId, quote.senderUserId())
                || !Objects.equals(targetUserNo, quote.targetUserNo())
                || !Objects.equals(source.scene(), quote.sourceScene())
                || !Objects.equals(source.bizNo(), quote.sourceBizNo())) {
            throw new BusinessException(QUOTE_CHANGED, "悄悄话报价已过期，请重新预检");
        }
    }

    private void requireSameQuote(WhisperQuoteSnapshot quote, PaymentChoice payment,
                                  AppMessageRuleVersion rule) {
        boolean same = Objects.equals(quote.payType(), payment.payType())
                && Objects.equals(quote.coinAmount(), payment.coinAmount())
                && Objects.equals(quote.freeRemain(), payment.freeRemain())
                && Objects.equals(quote.configVersion(), rule.getVersionNo())
                && Objects.equals(quote.expireDays(), rule.getWhisperExpireDays())
                && Objects.equals(quote.cooldownDays(), rule.getWhisperCooldownDays())
                && Objects.equals(quote.canonicalSchoolCode(), payment.canonicalSchoolCode())
                && Objects.equals(quote.qualificationFingerprint(),
                        payment.qualificationFingerprint());
        if (!same) {
            throw new BusinessException(QUOTE_CHANGED, "悄悄话价格已变化，请重新预检");
        }
    }

    private AppMessageRecord createRequestMessage(Long senderUserId, Long receiverUserId,
                                                   String requestId, String whisperNo,
                                                   String content, LocalDateTime now) {
        AppMessageRecord message = new AppMessageRecord();
        message.setMessageNo(businessNo("MSG"));
        message.setClientMsgId(requestId);
        message.setSenderType("user");
        message.setSenderUserId(senderUserId);
        message.setReceiverUserId(receiverUserId);
        message.setMessageType(MessageTypeEnum.WHISPER.getCode());
        message.setContentText(content);
        message.setSendStatus(MessageSendStatusEnum.QUEUED.getCode());
        message.setReceiverReadStatus(MessageReadStatusEnum.NOT_APPLICABLE.getCode());
        message.setSourceBizType("whisper");
        message.setSourceBizNo(whisperNo);
        message.setVersion(0);
        message.setCreateTime(now);
        return message;
    }

    private AppMessageWhisper createWhisper(Long senderUserId, Long receiverUserId,
                                             String requestId, String whisperNo,
                                             Long messageId, SourceContext source,
                                             PaymentChoice payment,
                                             AppMessageRuleVersion rule, String consumeFlowNo,
                                             LocalDateTime now) {
        AppMessageWhisper whisper = new AppMessageWhisper();
        whisper.setWhisperNo(whisperNo);
        whisper.setSendRequestId(requestId);
        whisper.setSenderUserId(senderUserId);
        whisper.setReceiverUserId(receiverUserId);
        whisper.setUserLowId(Math.min(senderUserId, receiverUserId));
        whisper.setUserHighId(Math.max(senderUserId, receiverUserId));
        whisper.setSourceScene(source.scene());
        whisper.setSourceBizNo(source.bizNo());
        whisper.setStatus(MessageWhisperStatusEnum.PENDING.getCode());
        whisper.setActiveMarker(1);
        whisper.setVersion(0);
        whisper.setPayType(payment.payType());
        whisper.setPaymentStatus("paid");
        whisper.setCoinAmount(payment.coinAmount());
        whisper.setBenefitDate(payment.benefitDate());
        whisper.setQuotaSnapshot(PAY_VIP_FREE.equals(payment.payType())
                ? payment.quotaSnapshot() : null);
        whisper.setSchoolCodeSnapshot(payment.canonicalSchoolCode());
        whisper.setAssetConsumeFlowNo(consumeFlowNo);
        whisper.setDeliveryStatus(MessageDeliveryStatusEnum.QUEUED.getCode());
        whisper.setConfigVersion(rule.getVersionNo());
        whisper.setExpireDaysSnapshot(rule.getWhisperExpireDays());
        whisper.setCooldownDaysSnapshot(rule.getWhisperCooldownDays());
        whisper.setExpiresAt(now.plusDays(rule.getWhisperExpireDays()));
        whisper.setCooldownUntil(whisper.getExpiresAt().plusDays(rule.getWhisperCooldownDays()));
        whisper.setRequestMessageId(messageId);
        whisper.setCreateTime(now);
        return whisper;
    }

    private AppMessageDeliveryOutbox createRequestOutbox(AppMessageWhisper whisper,
                                                           AppMessageRecord message,
                                                           String requestId) {
        AppMessageDeliveryOutbox outbox = new AppMessageDeliveryOutbox();
        outbox.setOutboxNo(businessNo("OBX"));
        outbox.setEventKey("message:" + message.getMessageNo() + ":tim");
        outbox.setAggregateType("message");
        outbox.setAggregateId(message.getId());
        outbox.setAggregateNo(message.getMessageNo());
        outbox.setSenderUserId(whisper.getSenderUserId());
        outbox.setReceiverUserId(whisper.getReceiverUserId());
        outbox.setChannel("tencent_im");
        outbox.setEventType("whisper_request");
        Map<String, Object> metadata = new LinkedHashMap<>();
        metadata.put("whisperNo", whisper.getWhisperNo());
        metadata.put("messageType", "whisper_request");
        metadata.put("requestId", requestId);
        metadata.put("sourceScene", whisper.getSourceScene());
        if (whisper.getSourceBizNo() != null) {
            metadata.put("sourceBizNo", whisper.getSourceBizNo());
        }
        metadata.put("sendMsgControl", List.of("NoUnread", "NoLastMsg", "NoMsgCheck"));
        outbox.setPayloadJson(writeMetadata(metadata));
        outbox.setProtocolVersion(1);
        outbox.setStatus(MessageReliableStatusEnum.PENDING.getCode());
        outbox.setRetryCount(0);
        return outbox;
    }

    private WhisperCreateVO existingResult(AppMessageWhisper whisper, String targetUserNo,
                                            String content, SourceContext source,
                                            Long senderUserId) {
        Long expectedReceiver = parseTargetUserId(targetUserNo);
        AppMessageRecord message = whisper.getRequestMessageId() == null
                ? null : recordDao.selectById(whisper.getRequestMessageId());
        boolean same = Objects.equals(senderUserId, whisper.getSenderUserId())
                && Objects.equals(expectedReceiver, whisper.getReceiverUserId())
                && Objects.equals(source.scene(), whisper.getSourceScene())
                && Objects.equals(source.bizNo(), whisper.getSourceBizNo())
                && message != null
                && MessageTypeEnum.WHISPER.getCode().equals(message.getMessageType())
                && Objects.equals(content, message.getContentText());
        if (!same) {
            throw new BusinessException(IDEMPOTENCY_CONFLICT, "幂等键已被不同请求占用");
        }
        return createResult(whisper, coinBalance(userAssetDao.selectByUserId(senderUserId)), false);
    }

    private void writeCoinLog(AppMessageWhisper whisper, String requestId, String flowNo,
                              int balanceBefore, int balanceAfter) {
        UserCoinLog log = new UserCoinLog();
        log.setFlowNo(flowNo);
        log.setUserId(whisper.getSenderUserId());
        log.setFlowType(FlowTypeEnum.CONSUME.getCode());
        log.setChangeAmount(-whisper.getCoinAmount());
        log.setBalanceBefore(balanceBefore);
        log.setBalanceAfter(balanceAfter);
        log.setBizScene(BizSceneEnum.WHISPER.getCode());
        log.setBizDesc("发送悄悄话 " + whisper.getWhisperNo());
        log.setRefId(whisper.getId());
        log.setRefType("app_message_whisper");
        log.setBizIdempotencyKey("whisper:send:" + whisper.getSenderUserId() + ":" + requestId);
        coinLogDao.insert(log);
    }

    private WhisperCreateVO createResult(AppMessageWhisper whisper, int balance, boolean charged) {
        WhisperCreateVO result = new WhisperCreateVO();
        result.setWhisperNo(whisper.getWhisperNo());
        result.setSendStatus(switch (String.valueOf(whisper.getDeliveryStatus())) {
            case "sent" -> "sent";
            case "failed" -> "failed";
            default -> "sending";
        });
        result.setWhisperStatus(MessageDeliveryStatusEnum.SENT.getCode().equals(whisper.getDeliveryStatus())
                ? whisper.getStatus() : null);
        result.setPaymentStatus(whisper.getPaymentStatus());
        result.setTargetUserNo(userNo(whisper.getReceiverUserId()));
        result.setPayType(whisper.getPayType());
        result.setCoinAmount(whisper.getCoinAmount());
        result.setCoinBalance(balance);
        result.setCharged(charged);
        result.setCreatedTime(whisper.getCreateTime());
        result.setExpireTime(whisper.getExpiresAt());
        return result;
    }

    private String normalizeRequestId(String requestId) {
        String normalized = requestId == null ? "" : requestId.trim();
        if (normalized.length() < REQUEST_ID_MIN_LENGTH || normalized.length() > REQUEST_ID_MAX_LENGTH) {
            throw new BusinessException(PARAM_ERROR, "Idempotency-Key 幂等键长度应为8到64个字符");
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

    private SourceContext sourceContext(String sourceScene, String sourceBizNo) {
        String scene = sourceScene == null ? "" : sourceScene.trim();
        if (!SOURCE_SCENES.contains(scene)) {
            throw new BusinessException(PARAM_ERROR, "来源场景不支持");
        }
        String bizNo = sourceBizNo == null || sourceBizNo.isBlank() ? null : sourceBizNo.trim();
        if (("community_post".equals(scene) || "community_comment".equals(scene)
                || "whisper_reverse".equals(scene)) && bizNo == null) {
            throw new BusinessException(PARAM_ERROR, "当前来源场景必须提供来源业务编号");
        }
        if (bizNo != null && bizNo.length() > 64) {
            throw new BusinessException(PARAM_ERROR, "来源业务编号不能超过64个字符");
        }
        return new SourceContext(scene, bizNo);
    }

    private Long parseTargetUserId(String targetUserNo) {
        Matcher matcher = targetUserNo == null ? null : USER_NO_PATTERN.matcher(targetUserNo);
        if (matcher == null || !matcher.matches()) {
            throw new BusinessException(PARAM_ERROR, "目标用户编号格式不正确");
        }
        return Long.valueOf(matcher.group(1));
    }

    private int requirePositive(Integer value, String message) {
        if (value == null || value <= 0) {
            throw new BusinessException(INTERNAL_ERROR, message);
        }
        return value;
    }

    private String writeMetadata(Map<String, Object> metadata) {
        try {
            return objectMapper.writeValueAsString(metadata);
        } catch (JsonProcessingException ex) {
            throw new BusinessException(INTERNAL_ERROR, "悄悄话投递元数据生成失败");
        }
    }

    private <T> T first(Page<T> page) {
        return page == null || page.getRecords() == null || page.getRecords().isEmpty()
                ? null : page.getRecords().get(0);
    }

    private String businessNo(String prefix) {
        return prefix + "-" + IdUtil.fastSimpleUUID().toUpperCase(Locale.ROOT);
    }

    private String userNo(Long userId) {
        return userId == null ? null : "USR-" + String.format(Locale.ROOT, "%012d", userId);
    }

    private int coinBalance(UserAsset asset) {
        return asset == null || asset.getCoinBalance() == null ? 0 : asset.getCoinBalance();
    }

    private record WhisperTarget(AppUser sender, AppUser receiver) {
    }

    private record PaymentChoice(String payType, Integer coinAmount, Integer freeRemain,
                                 Integer quotaSnapshot, LocalDate benefitDate,
                                 String canonicalSchoolCode,
                                 String qualificationFingerprint) {
    }

    private record SourceContext(String scene, String bizNo) {
    }
}
