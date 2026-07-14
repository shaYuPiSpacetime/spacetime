package com.spacetime.miniapp.service.impl;

import cn.hutool.core.util.StrUtil;
import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.spacetime.common.dao.AppUserAuditRecordDao;
import com.spacetime.common.dao.ExternalProviderTaskDao;
import com.spacetime.common.entity.AppUserAuditRecord;
import com.spacetime.common.entity.ExternalProviderTask;
import com.spacetime.common.enums.AppUserAuditStatusEnum;
import com.spacetime.common.enums.AppUserAuditTypeEnum;
import com.spacetime.common.enums.AuditSourceEnum;
import com.spacetime.common.enums.OpenTextFieldEnum;
import com.spacetime.common.exception.BusinessException;
import com.spacetime.common.provider.ProviderCheckResult;
import com.spacetime.common.provider.TextSafetyProvider;
import com.spacetime.common.service.AppUserAuditService;
import com.spacetime.common.service.Prd01RuntimeConfigResolver;
import com.spacetime.miniapp.dto.request.AboutMeAnswerSubmitReq;
import com.spacetime.miniapp.dto.request.IntroductionSubmitReq;
import com.spacetime.miniapp.dto.response.AboutMeDetailVO;
import com.spacetime.miniapp.dto.response.AboutMeQuestionVO;
import com.spacetime.miniapp.dto.response.IntroductionDetailVO;
import com.spacetime.miniapp.dto.response.OpenTextAuditVO;
import com.spacetime.miniapp.service.OpenTextAuditService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.List;

/**
 * 开放性文字审核服务实现。
 * 开放文字统一写入 app_user_audit_record；语音介绍不进入这里。
 */
@Service
@RequiredArgsConstructor
public class OpenTextAuditServiceImpl implements OpenTextAuditService {

    private static final DateTimeFormatter DISPLAY_TIME_FORMATTER = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss");
    private static final String NOT_SUBMITTED = "NOT_SUBMITTED";
    private static final List<AboutQuestion> ABOUT_QUESTIONS = List.of(
            new AboutQuestion("interests", "兴趣爱好", "聊聊你的日常吧"),
            new AboutQuestion("idealWeekend", "理想的另一半", "说出你对另一半的期待"),
            new AboutQuestion("loveView", "爱情观", "你期待什么样的爱情"),
            new AboutQuestion("dailyLife", "喜欢的见面活动", "说说你想和另一半见面做的活动"),
            new AboutQuestion("lifeSituation", "住房情况", "说说你的住房情况"),
            new AboutQuestion("moreStory", "补充更多关于我的故事", "补充你的经历、性格或生活片段")
    );

    private final AppUserAuditRecordDao auditRecordDao;
    private final ExternalProviderTaskDao externalProviderTaskDao;
    private final TextSafetyProvider textSafetyProvider;
    private final AppUserAuditService auditService;
    private final Prd01RuntimeConfigResolver runtimeConfigResolver;

    /** 查询自我介绍页回显信息；本人看最新提交，对外展示仍以最近已通过内容为准。 */
    @Override
    public IntroductionDetailVO getIntroductionDetail(Long userId) {
        AppUserAuditRecord latest = auditService.latestRecord(userId, AppUserAuditTypeEnum.ABOUT_ME);
        AppUserAuditRecord effective = auditService.latestEffectiveRecord(userId, AppUserAuditTypeEnum.ABOUT_ME);
        IntroductionDetailVO vo = new IntroductionDetailVO();
        vo.setLatestContent(latest == null ? null : latest.getContentText());
        vo.setEffectiveContent(effective == null ? null : effective.getContentText());
        vo.setAuditStatus(latest == null ? NOT_SUBMITTED : latest.getStatus());
        vo.setAuditSource(latest == null ? null : latest.getAuditSource());
        vo.setRejectReason(reason(latest));
        vo.setSubmitTime(formatTime(latest == null ? null : latest.getSubmitTime()));
        vo.setCanSubmit(latest == null || !AppUserAuditStatusEnum.isPendingLike(latest.getStatus()));
        return vo;
    }

    /** 强引导自我介绍只允许提交 ABOUT_ME，避免客户端传错开放文本类型。 */
    @Override
    @Transactional
    public OpenTextAuditVO submitIntroduction(Long userId, IntroductionSubmitReq req) {
        if (req == null || StrUtil.isBlank(req.getAboutMe())
                || req.getAboutMe().length() < 20 || req.getAboutMe().length() > 300) {
            throw new BusinessException("自我介绍需20-300个字");
        }
        return submitAuditedText(userId, OpenTextFieldEnum.ABOUT_ME, req.getAboutMe());
    }

    @Override
    public AboutMeDetailVO getAboutMeDetail(Long userId) {
        List<AppUserAuditRecord> records = auditRecordDao.selectList(new LambdaQueryWrapper<AppUserAuditRecord>()
                .eq(AppUserAuditRecord::getUserId, userId)
                .eq(AppUserAuditRecord::getAuditType, AppUserAuditTypeEnum.PROFILE_QA.getCode())
                .orderByDesc(AppUserAuditRecord::getSubmitTime)
                .orderByDesc(AppUserAuditRecord::getId));
        AboutMeDetailVO vo = new AboutMeDetailVO();
        vo.setQuestions(ABOUT_QUESTIONS.stream()
                .map(question -> toQuestionVO(question, records))
                .toList());
        return vo;
    }

    @Override
    @Transactional
    public OpenTextAuditVO submitAboutMeAnswer(Long userId, AboutMeAnswerSubmitReq req) {
        AboutQuestion question = requireQuestion(req == null ? null : req.getQuestionKey());
        if (StrUtil.isBlank(req.getContentText())
                || req.getContentText().length() < 2
                || req.getContentText().length() > 500) {
            throw new BusinessException("关于我回答需2-500个字");
        }
        Prd01RuntimeConfigResolver.RuntimeConfigSnapshot configSnapshot = runtimeConfigResolver.snapshot();
        validateFieldEnabled(OpenTextFieldEnum.PROFILE_QA, configSnapshot);
        AppUserAuditRecord latest = latestQuestionRecord(userId, question.key());
        if (latest != null && AppUserAuditStatusEnum.isPendingLike(latest.getStatus())) {
            throw new BusinessException("关于我回答审核中，请勿重复提交");
        }

        AppUserAuditRecord record = new AppUserAuditRecord();
        record.setUserId(userId);
        record.setAuditType(AppUserAuditTypeEnum.PROFILE_QA.getCode());
        record.setAuditSource(AuditSourceEnum.MACHINE.getCode());
        record.setStatus(AppUserAuditStatusEnum.PENDING.getCode());
        record.setContentText(req.getContentText());
        record.setContentHash(sha256(req.getContentText()));
        record.setMaterialJson("{\"questionKey\":\"" + json(question.key()) + "\",\"questionTitle\":\""
                + json(question.title()) + "\"}");
        auditService.submit(record);
        reviewText(userId, record, OpenTextFieldEnum.PROFILE_QA, configSnapshot);
        return toVo(auditService.latestRecord(userId, AppUserAuditTypeEnum.PROFILE_QA));
    }

    /** 提交开放性文字并执行文本安全机审。 */
    @Transactional
    private OpenTextAuditVO submitAuditedText(Long userId, OpenTextFieldEnum field, String contentText) {
        validate(field, contentText);
        Prd01RuntimeConfigResolver.RuntimeConfigSnapshot configSnapshot = runtimeConfigResolver.snapshot();
        validateFieldEnabled(field, configSnapshot);
        AppUserAuditTypeEnum auditType = AppUserAuditTypeEnum.getByCode(field.getCode());
        AppUserAuditRecord latest = auditService.latestRecord(userId, auditType);
        if (latest != null && AppUserAuditStatusEnum.isPendingLike(latest.getStatus())) {
            throw new BusinessException(field.getDesc() + "审核中，请勿重复提交");
        }
        AppUserAuditRecord record = new AppUserAuditRecord();
        record.setUserId(userId);
        record.setAuditType(field.getCode());
        record.setAuditSource(AuditSourceEnum.MACHINE.getCode());
        record.setStatus(AppUserAuditStatusEnum.PENDING.getCode());
        record.setContentText(contentText);
        record.setContentHash(sha256(contentText));
        auditService.submit(record);

        try {
            ProviderCheckResult result = textSafetyProvider.check(field.getCode(), contentText);
            ExternalProviderTask task = providerTask(userId, result);
            externalProviderTaskDao.insert(task);
            if (Boolean.TRUE.equals(result.getSafe())) {
                auditService.machineApprove(record.getId(), task.getId(), result.getRawResponseJson());
            } else {
                auditService.machineReject(record.getId(), task.getId(), result.getRawResponseJson(),
                        StrUtil.blankToDefault(result.getRejectReason(), runtimeConfigResolver.copyText(
                                configSnapshot, "safety_text_failed", "文本内容安全未通过")));
            }
        } catch (Exception ignored) {
            // Provider 异常时保留 PENDING，后台可继续人工处理。
        }
        AppUserAuditRecord result = auditService.latestRecord(userId, auditType);
        return toVo(result);
    }

    /** 字段配置关闭后，服务端同步禁止提交，避免客户端绕过页面开关。 */
    private void validateFieldEnabled(
            OpenTextFieldEnum field,
            Prd01RuntimeConfigResolver.RuntimeConfigSnapshot configSnapshot) {
        String fieldId = switch (field) {
            case ABOUT_ME -> "aboutMe";
            case HOPE_THEY_KNOW -> "hopeTheyKnow";
            case PROFILE_QA -> "qaList";
        };
        if (!runtimeConfigResolver.fieldVisible(configSnapshot, fieldId, true)) {
            throw new BusinessException(field.getDesc() + "当前未启用");
        }
    }

    private void validate(OpenTextFieldEnum field, String contentText) {
        if (field == null) {
            throw new BusinessException("不支持的开放性文字字段");
        }
        int minLength = field == OpenTextFieldEnum.ABOUT_ME ? 20 : 2;
        int maxLength = field == OpenTextFieldEnum.ABOUT_ME ? 300 : 500;
        if (StrUtil.isBlank(contentText)
                || contentText.length() < minLength
                || contentText.length() > maxLength) {
            throw new BusinessException("开放性文字长度不符合要求");
        }
    }

    private void reviewText(
            Long userId,
            AppUserAuditRecord record,
            OpenTextFieldEnum field,
            Prd01RuntimeConfigResolver.RuntimeConfigSnapshot configSnapshot) {
        try {
            ProviderCheckResult result = textSafetyProvider.check(field.getCode(), record.getContentText());
            ExternalProviderTask task = providerTask(userId, result);
            externalProviderTaskDao.insert(task);
            if (Boolean.TRUE.equals(result.getSafe())) {
                auditService.machineApprove(record.getId(), task.getId(), result.getRawResponseJson());
            } else {
                auditService.machineReject(record.getId(), task.getId(), result.getRawResponseJson(),
                        StrUtil.blankToDefault(result.getRejectReason(), runtimeConfigResolver.copyText(
                                configSnapshot, "safety_text_failed", "文本内容安全审核未通过")));
            }
        } catch (Exception ignored) {
            // Provider 异常时保留 PENDING，后台可继续人工处理。
        }
    }

    private AboutMeQuestionVO toQuestionVO(AboutQuestion question, List<AppUserAuditRecord> records) {
        AppUserAuditRecord latest = records.stream()
                .filter(record -> sameQuestion(record, question.key()))
                .findFirst()
                .orElse(null);
        AppUserAuditRecord effective = records.stream()
                .filter(record -> sameQuestion(record, question.key()))
                .filter(record -> AppUserAuditStatusEnum.APPROVED.getCode().equals(record.getStatus()))
                .findFirst()
                .orElse(null);
        AboutMeQuestionVO vo = new AboutMeQuestionVO();
        vo.setQuestionKey(question.key());
        vo.setTitle(question.title());
        vo.setPlaceholder(question.placeholder());
        vo.setLatestContent(latest == null ? null : latest.getContentText());
        vo.setEffectiveContent(effective == null ? null : effective.getContentText());
        vo.setAuditStatus(latest == null ? NOT_SUBMITTED : latest.getStatus());
        vo.setRejectReason(reason(latest));
        vo.setCanSubmit(latest == null || !AppUserAuditStatusEnum.isPendingLike(latest.getStatus()));
        return vo;
    }

    private AppUserAuditRecord latestQuestionRecord(Long userId, String questionKey) {
        return auditRecordDao.selectList(new LambdaQueryWrapper<AppUserAuditRecord>()
                        .eq(AppUserAuditRecord::getUserId, userId)
                        .eq(AppUserAuditRecord::getAuditType, AppUserAuditTypeEnum.PROFILE_QA.getCode())
                        .orderByDesc(AppUserAuditRecord::getSubmitTime)
                        .orderByDesc(AppUserAuditRecord::getId))
                .stream()
                .filter(record -> sameQuestion(record, questionKey))
                .findFirst()
                .orElse(null);
    }

    private boolean sameQuestion(AppUserAuditRecord record, String questionKey) {
        return record != null && record.getMaterialJson() != null
                && record.getMaterialJson().contains("\"questionKey\":\"" + json(questionKey) + "\"");
    }

    private AboutQuestion requireQuestion(String key) {
        return ABOUT_QUESTIONS.stream()
                .filter(item -> item.key().equals(key))
                .findFirst()
                .orElseThrow(() -> new BusinessException("关于我问题不存在"));
    }

    private ExternalProviderTask providerTask(Long userId, ProviderCheckResult result) {
        ExternalProviderTask task = new ExternalProviderTask();
        task.setProviderType("TEXT_SAFETY");
        task.setProviderCode(result.getProviderCode());
        task.setUserId(userId);
        task.setResponsePayloadJson(result.getRawResponseJson());
        task.setTaskStatus(Boolean.TRUE.equals(result.getSafe()) ? "SUCCESS" : "REJECTED");
        task.setMocked(Boolean.TRUE.equals(result.getMocked()) ? 1 : 0);
        task.setErrorMessage(result.getRejectReason());
        return task;
    }

    private OpenTextAuditVO toVo(AppUserAuditRecord record) {
        OpenTextAuditVO vo = new OpenTextAuditVO();
        vo.setFieldName(record.getAuditType());
        vo.setAuditStatus(record.getStatus());
        vo.setAuditSource(record.getAuditSource());
        vo.setRejectReason(record.getRejectReason());
        return vo;
    }

    private String reason(AppUserAuditRecord record) {
        if (record == null) {
            return null;
        }
        return StrUtil.blankToDefault(record.getRejectReason(), record.getExpiredReason());
    }

    private String formatTime(LocalDateTime time) {
        return time == null ? null : DISPLAY_TIME_FORMATTER.format(time);
    }

    private String sha256(String value) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            byte[] hash = digest.digest(value.getBytes(StandardCharsets.UTF_8));
            StringBuilder hex = new StringBuilder();
            for (byte b : hash) {
                hex.append(String.format("%02x", b));
            }
            return hex.toString();
        } catch (NoSuchAlgorithmException e) {
            throw new IllegalStateException("当前运行环境不支持 SHA-256", e);
        }
    }
    private String json(String value) {
        if (value == null) {
            return "";
        }
        return value.replace("\\", "\\\\").replace("\"", "\\\"");
    }

    private record AboutQuestion(String key, String title, String placeholder) {
    }
}
