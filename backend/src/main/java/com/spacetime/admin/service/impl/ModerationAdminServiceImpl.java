package com.spacetime.admin.service.impl;

import cn.hutool.core.util.StrUtil;
import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.spacetime.admin.dto.request.ModerationAuditReq;
import com.spacetime.admin.dto.request.VerificationPageReq;
import com.spacetime.admin.dto.response.AuditHistoryVO;
import com.spacetime.admin.dto.response.ModerationDetailVO;
import com.spacetime.admin.dto.response.ModerationVO;
import com.spacetime.admin.dto.response.VerificationStatsVO;
import com.spacetime.admin.service.ModerationAdminService;
import com.spacetime.common.dao.AppUserAuditHistoryDao;
import com.spacetime.common.dao.AppUserAuditRecordDao;
import com.spacetime.common.dao.AppUserDao;
import com.spacetime.common.entity.AppUser;
import com.spacetime.common.entity.AppUserAuditHistory;
import com.spacetime.common.entity.AppUserAuditRecord;
import com.spacetime.common.enums.AppUserAuditStatusEnum;
import com.spacetime.common.enums.AppUserAuditTypeEnum;
import com.spacetime.common.exception.BusinessException;
import com.spacetime.common.interceptor.UserContext;
import com.spacetime.common.interceptor.UserContextHolder;
import com.spacetime.common.service.AppUserAuditService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;

/**
 * 管理后台内容审核服务实现。
 * 资料图片和开放性文字统一读取 app_user_audit_record，并通过审核历史表展示完整操作链路。
 */
@Service
@RequiredArgsConstructor
public class ModerationAdminServiceImpl implements ModerationAdminService {

    private static final DateTimeFormatter FMT = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss");

    private final AppUserAuditRecordDao auditRecordDao;
    private final AppUserAuditHistoryDao historyDao;
    private final AppUserAuditService auditService;
    private final AppUserDao appUserDao;

    @Override
    public Page<ModerationVO> getPhotoPage(VerificationPageReq req) {
        return toPage(queryPage(req, photoTypes(req.getImageType())), true);
    }

    @Override
    public Page<ModerationVO> getTextPage(VerificationPageReq req) {
        return toPage(queryPage(req, textTypes(req.getTextType())), false);
    }

    @Override
    public VerificationStatsVO getPhotoStats() {
        return statsOf(photoTypes(null));
    }

    @Override
    public VerificationStatsVO getTextStats() {
        return statsOf(textTypes(null));
    }

    private VerificationStatsVO statsOf(List<String> types) {
        VerificationStatsVO vo = new VerificationStatsVO();
        vo.setPendingCount(countByStatus(types, AppUserAuditStatusEnum.PENDING.getCode(), null));
        vo.setReviewingCount(countByStatus(types, AppUserAuditStatusEnum.REVIEWING.getCode(), null));
        vo.setApprovedTodayCount(countByStatus(types, AppUserAuditStatusEnum.APPROVED.getCode(), "TODAY"));
        vo.setRejectedTodayCount(countByStatus(types, AppUserAuditStatusEnum.REJECTED.getCode(), "TODAY"));
        vo.setExpiredCount(countByStatus(types, AppUserAuditStatusEnum.EXPIRED.getCode(), null));
        return vo;
    }

    private Long countByStatus(List<String> types, String status, String submitTime) {
        LambdaQueryWrapper<AppUserAuditRecord> wrapper = new LambdaQueryWrapper<AppUserAuditRecord>()
                .in(AppUserAuditRecord::getAuditType, types)
                .eq(AppUserAuditRecord::getStatus, status);
        if ("TODAY".equals(submitTime)) {
            wrapper.ge(AppUserAuditRecord::getAuditTime, LocalDateTime.now().toLocalDate().atStartOfDay());
        }
        return auditRecordDao.count(wrapper);
    }

    private Page<AppUserAuditRecord> queryPage(VerificationPageReq req, List<String> types) {
        LambdaQueryWrapper<AppUserAuditRecord> wrapper = new LambdaQueryWrapper<AppUserAuditRecord>()
                .in(AppUserAuditRecord::getAuditType, types)
                .eq(req.getUserId() != null, AppUserAuditRecord::getUserId, req.getUserId())
                .eq(StrUtil.isNotBlank(req.getStatus()), AppUserAuditRecord::getStatus, req.getStatus())
                .eq(StrUtil.isNotBlank(req.getAuditSource()), AppUserAuditRecord::getAuditSource, req.getAuditSource())
                .orderByDesc(AppUserAuditRecord::getSubmitTime)
                .orderByDesc(AppUserAuditRecord::getId);
        applyKeyword(req, wrapper);
        applySubmitTimeFilter(wrapper, req.getSubmitTime());
        return auditRecordDao.selectPage(new Page<>(req.getPage(), req.getSize()), wrapper);
    }

    /**
     * 用户搜索需要覆盖昵称、手机号、标签、实名、身份证和用户ID。
     */
    private void applyKeyword(VerificationPageReq req, LambdaQueryWrapper<AppUserAuditRecord> wrapper) {
        if (StrUtil.isBlank(req.getKeyword())) {
            return;
        }
        String keyword = req.getKeyword().trim();
        Set<Long> userIds = new LinkedHashSet<>();
        if (keyword.matches("\\d+")) {
            userIds.add(Long.parseLong(keyword));
        }
        userIds.addAll(appUserDao.selectList(new LambdaQueryWrapper<AppUser>()
                        .like(AppUser::getNickname, keyword)
                        .or()
                        .like(AppUser::getPhone, keyword)
                        .or()
                        .like(AppUser::getTags, keyword))
                .stream().map(AppUser::getId).toList());
        userIds.addAll(auditRecordDao.selectList(new LambdaQueryWrapper<AppUserAuditRecord>()
                        .eq(AppUserAuditRecord::getAuditType, AppUserAuditTypeEnum.REAL_NAME.getCode())
                        .and(q -> q.like(AppUserAuditRecord::getRealName, keyword)
                                .or()
                                .like(AppUserAuditRecord::getIdCard, keyword)))
                .stream().map(AppUserAuditRecord::getUserId).toList());
        if (userIds.isEmpty()) {
            wrapper.eq(AppUserAuditRecord::getUserId, -1L);
        } else {
            wrapper.in(AppUserAuditRecord::getUserId, userIds);
        }
    }

    private void applySubmitTimeFilter(LambdaQueryWrapper<AppUserAuditRecord> wrapper, String submitTime) {
        if ("TODAY".equals(submitTime)) {
            wrapper.ge(AppUserAuditRecord::getSubmitTime, LocalDateTime.now().toLocalDate().atStartOfDay());
        } else if ("LAST_7_DAYS".equals(submitTime)) {
            wrapper.ge(AppUserAuditRecord::getSubmitTime, LocalDateTime.now().minusDays(7));
        }
    }

    private Page<ModerationVO> toPage(Page<AppUserAuditRecord> page, boolean photo) {
        List<AppUserAuditRecord> records = page.getRecords();
        Map<Long, AppUser> userMap = records.isEmpty() ? Map.of() : appUserDao.selectList(
                        new LambdaQueryWrapper<AppUser>().in(AppUser::getId,
                                records.stream().map(AppUserAuditRecord::getUserId).toList()))
                .stream().collect(Collectors.toMap(AppUser::getId, u -> u, (a, b) -> a));

        List<ModerationVO> vos = new ArrayList<>();
        for (AppUserAuditRecord record : records) {
            AppUser user = userMap.get(record.getUserId());
            ModerationVO vo = baseRow(record, user);
            if (photo) {
                vo.setContentType("照片");
                vo.setImageType(photoTypeLabel(record.getAuditType()));
                vo.setImageUrl(record.getMediaUrl());
                vo.setContentPreview(record.getMediaUrl());
            } else {
                vo.setContentType("文字");
                vo.setTextType(textTypeLabel(record.getAuditType()));
                vo.setTextSummary(StrUtil.isBlank(record.getContentText()) ? null : StrUtil.maxLength(record.getContentText(), 24));
                vo.setContentPreview(vo.getTextSummary());
            }
            vos.add(vo);
        }
        Page<ModerationVO> result = new Page<>(page.getCurrent(), page.getSize(), page.getTotal());
        result.setRecords(vos);
        return result;
    }

    private ModerationVO baseRow(AppUserAuditRecord record, AppUser user) {
        ModerationVO vo = new ModerationVO();
        vo.setId(record.getId());
        vo.setUserId(record.getUserId());
        vo.setAvatar(user == null ? null : user.getAvatar());
        vo.setNickname(user == null ? null : user.getNickname());
        vo.setStatus(record.getStatus());
        vo.setAuditSource(record.getAuditSource());
        vo.setRejectReason(reason(record));
        vo.setSubmitTime(format(record.getSubmitTime()));
        return vo;
    }

    @Override
    public ModerationDetailVO getPhotoDetail(Long id) {
        return getPhotoDetail(id, 1, 5);
    }

    @Override
    public ModerationDetailVO getPhotoDetail(Long id, int historyPage, int historySize) {
        AppUserAuditRecord record = requireRecord(id, photoTypes(null));
        AppUser user = appUserDao.selectById(record.getUserId());
        ModerationDetailVO vo = baseDetail(record, user, historyPage, historySize);
        vo.setContentType("照片");
        vo.setImageType(photoTypeLabel(record.getAuditType()));
        vo.setContentFull(record.getMediaUrl());
        return vo;
    }

    @Override
    public ModerationDetailVO getTextDetail(Long id) {
        return getTextDetail(id, 1, 5);
    }

    @Override
    public ModerationDetailVO getTextDetail(Long id, int historyPage, int historySize) {
        AppUserAuditRecord record = requireRecord(id, textTypes(null));
        AppUser user = appUserDao.selectById(record.getUserId());
        ModerationDetailVO vo = baseDetail(record, user, historyPage, historySize);
        vo.setContentType("文字");
        vo.setContentField(textTypeLabel(record.getAuditType()));
        vo.setContentFull(record.getContentText());
        return vo;
    }

    private ModerationDetailVO baseDetail(AppUserAuditRecord record, AppUser user, int historyPage, int historySize) {
        ModerationDetailVO vo = new ModerationDetailVO();
        vo.setId(record.getId());
        vo.setUserId(record.getUserId());
        vo.setNickname(user == null ? null : user.getNickname());
        vo.setAvatar(user == null ? null : user.getAvatar());
        vo.setSubmitTime(format(record.getSubmitTime()));
        vo.setStatus(record.getStatus());
        vo.setAuditSource(record.getAuditSource());
        vo.setRejectReason(reason(record));
        vo.setHistoryPage(historyPage(record.getId(), historyPage, historySize));
        return vo;
    }

    private Page<AuditHistoryVO> historyPage(Long recordId, int page, int size) {
        int safePage = Math.max(1, page);
        int safeSize = Math.min(Math.max(1, size), 50);
        Page<AppUserAuditHistory> raw = historyDao.selectPage(new Page<>(safePage, safeSize),
                new LambdaQueryWrapper<AppUserAuditHistory>()
                        .eq(AppUserAuditHistory::getAuditRecordId, recordId)
                        .orderByDesc(AppUserAuditHistory::getCreateTime)
                        .orderByDesc(AppUserAuditHistory::getId));
        Page<AuditHistoryVO> result = new Page<>(raw.getCurrent(), raw.getSize(), raw.getTotal());
        result.setRecords(raw.getRecords().stream().map(this::toHistoryVO).toList());
        return result;
    }

    private AuditHistoryVO toHistoryVO(AppUserAuditHistory history) {
        AuditHistoryVO vo = new AuditHistoryVO();
        vo.setId(history.getId());
        vo.setAuditRecordId(history.getAuditRecordId());
        vo.setFromStatus(history.getFromStatus());
        vo.setToStatus(history.getToStatus());
        vo.setAuditSource(history.getAuditSource());
        vo.setAction(history.getAction());
        vo.setReason(history.getReason());
        vo.setOperatorType(history.getOperatorType());
        vo.setOperatorName(history.getOperatorName());
        vo.setProviderTaskId(history.getProviderTaskId());
        vo.setCreateTime(format(history.getCreateTime()));
        return vo;
    }

    @Override
    @Transactional
    public void auditPhoto(Long id, ModerationAuditReq req) {
        requireRecord(id, photoTypes(null));
        audit(id, req);
    }

    @Override
    @Transactional
    public void auditText(Long id, ModerationAuditReq req) {
        requireRecord(id, textTypes(null));
        audit(id, req);
    }

    private void audit(Long id, ModerationAuditReq req) {
        validateAuditReq(req);
        UserContext ctx = UserContextHolder.get();
        auditService.manualAudit(id, req.getAction(), req.getRejectReason(),
                ctx == null ? null : ctx.getId(), ctx == null ? "管理员" : ctx.getNickname());
    }

    private void validateAuditReq(ModerationAuditReq req) {
        if (!"APPROVE".equals(req.getAction()) && !"REJECT".equals(req.getAction()) && !"EXPIRE".equals(req.getAction())) {
            throw new BusinessException("不支持的审核动作");
        }
        if (!req.isRejectReasonValid()) {
            throw new BusinessException("驳回或失效时必须填写原因");
        }
    }

    private AppUserAuditRecord requireRecord(Long id, List<String> types) {
        AppUserAuditRecord record = auditRecordDao.selectById(id);
        if (record == null || !types.contains(record.getAuditType())) {
            throw new BusinessException("审核记录不存在");
        }
        return record;
    }

    private List<String> photoTypes(String imageType) {
        if ("BACKGROUND".equals(imageType) || "PROFILE_BG".equals(imageType)) {
            return List.of(AppUserAuditTypeEnum.PROFILE_BG.getCode());
        }
        if ("ALBUM".equals(imageType) || "ALBUM_PHOTO".equals(imageType)) {
            return List.of(AppUserAuditTypeEnum.ALBUM_PHOTO.getCode());
        }
        return List.of(AppUserAuditTypeEnum.ALBUM_PHOTO.getCode(), AppUserAuditTypeEnum.PROFILE_BG.getCode());
    }

    private List<String> textTypes(String textType) {
        if (StrUtil.isNotBlank(textType)) {
            AppUserAuditTypeEnum type = AppUserAuditTypeEnum.getByCode(textType);
            if (type != null && List.of(AppUserAuditTypeEnum.ABOUT_ME, AppUserAuditTypeEnum.HOPE_THEY_KNOW,
                    AppUserAuditTypeEnum.PROFILE_QA).contains(type)) {
                return List.of(type.getCode());
            }
        }
        return List.of(AppUserAuditTypeEnum.ABOUT_ME.getCode(),
                AppUserAuditTypeEnum.HOPE_THEY_KNOW.getCode(),
                AppUserAuditTypeEnum.PROFILE_QA.getCode());
    }

    private String photoTypeLabel(String type) {
        if (AppUserAuditTypeEnum.PROFILE_BG.getCode().equals(type)) {
            return "资料背景图";
        }
        if (AppUserAuditTypeEnum.ALBUM_PHOTO.getCode().equals(type)) {
            return "相册图片";
        }
        return type;
    }

    private String textTypeLabel(String type) {
        if (AppUserAuditTypeEnum.ABOUT_ME.getCode().equals(type)) {
            return "关于我";
        }
        if (AppUserAuditTypeEnum.HOPE_THEY_KNOW.getCode().equals(type)) {
            return "希望 TA 了解";
        }
        if (AppUserAuditTypeEnum.PROFILE_QA.getCode().equals(type)) {
            return "资料问答";
        }
        return type;
    }

    private String reason(AppUserAuditRecord record) {
        return record.getRejectReason() != null ? record.getRejectReason() : record.getExpiredReason();
    }

    private String format(LocalDateTime time) {
        return time == null ? null : time.format(FMT);
    }
}
