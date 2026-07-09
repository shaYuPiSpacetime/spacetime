package com.spacetime.admin.service.impl;

import cn.hutool.core.util.StrUtil;
import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.spacetime.admin.dto.request.ModerationAuditReq;
import com.spacetime.admin.dto.request.VerificationPageReq;
import com.spacetime.admin.dto.response.FieldEntry;
import com.spacetime.admin.dto.response.VerificationAuditDetailVO;
import com.spacetime.admin.dto.response.VerificationVO;
import com.spacetime.admin.service.VerificationAdminService;
import com.spacetime.common.dao.AppUserAuditRecordDao;
import com.spacetime.common.dao.AppUserDao;
import com.spacetime.common.entity.AppUser;
import com.spacetime.common.entity.AppUserAuditRecord;
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
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

/**
 * 管理后台认证审核服务实现。
 * 列表、详情和审核操作统一读取 app_user_audit_record，不再以认证汇总快照表作为事实来源。
 */
@Service
@RequiredArgsConstructor
public class VerificationAdminServiceImpl implements VerificationAdminService {

    private static final DateTimeFormatter FMT = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss");

    private final AppUserAuditRecordDao auditRecordDao;
    private final AppUserAuditService auditService;
    private final AppUserDao appUserDao;

    @Override
    public Page<VerificationVO> getRealNamePage(VerificationPageReq req) {
        return queryPage(req, AppUserAuditTypeEnum.REAL_NAME);
    }

    @Override
    public Page<VerificationVO> getEducationPage(VerificationPageReq req) {
        return queryPage(req, AppUserAuditTypeEnum.EDUCATION);
    }

    @Override
    public Page<VerificationVO> getAvatarPage(VerificationPageReq req) {
        return queryPage(req, AppUserAuditTypeEnum.AVATAR);
    }

    private Page<VerificationVO> queryPage(VerificationPageReq req, AppUserAuditTypeEnum type) {
        LambdaQueryWrapper<AppUserAuditRecord> wrapper = new LambdaQueryWrapper<AppUserAuditRecord>()
                .eq(AppUserAuditRecord::getAuditType, type.getCode())
                .eq(req.getUserId() != null, AppUserAuditRecord::getUserId, req.getUserId())
                .eq(StrUtil.isNotBlank(req.getStatus()), AppUserAuditRecord::getStatus, req.getStatus())
                .eq(StrUtil.isNotBlank(req.getAuditSource()), AppUserAuditRecord::getAuditSource, req.getAuditSource())
                .eq(type == AppUserAuditTypeEnum.EDUCATION && StrUtil.isNotBlank(req.getEducationMethod()),
                        AppUserAuditRecord::getEducationMethod, req.getEducationMethod())
                .orderByDesc(AppUserAuditRecord::getSubmitTime)
                .orderByDesc(AppUserAuditRecord::getId);
        applyKeyword(req, wrapper);
        applySubmitTimeFilter(wrapper, req.getSubmitTime());
        if (type == AppUserAuditTypeEnum.AVATAR && "FAILED".equals(req.getFaceRecognition())) {
            wrapper.isNotNull(AppUserAuditRecord::getRejectReason);
        }
        Page<AppUserAuditRecord> page = auditRecordDao.selectPage(new Page<>(req.getPage(), req.getSize()), wrapper);
        return toPage(page, type);
    }

    private void applyKeyword(VerificationPageReq req, LambdaQueryWrapper<AppUserAuditRecord> wrapper) {
        if (StrUtil.isBlank(req.getKeyword())) {
            return;
        }
        List<Long> userIds = appUserDao.selectList(new LambdaQueryWrapper<AppUser>()
                .like(AppUser::getNickname, req.getKeyword()))
                .stream().map(AppUser::getId).toList();
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

    private Page<VerificationVO> toPage(Page<AppUserAuditRecord> page, AppUserAuditTypeEnum type) {
        List<AppUserAuditRecord> records = page.getRecords();
        Map<Long, AppUser> userMap = records.isEmpty() ? Map.of() : appUserDao.selectList(
                new LambdaQueryWrapper<AppUser>().in(AppUser::getId,
                        records.stream().map(AppUserAuditRecord::getUserId).toList()))
                .stream().collect(Collectors.toMap(AppUser::getId, u -> u, (a, b) -> a));

        List<VerificationVO> vos = new ArrayList<>();
        for (AppUserAuditRecord record : records) {
            AppUser user = userMap.get(record.getUserId());
            VerificationVO vo = baseRow(record, user);
            if (type == AppUserAuditTypeEnum.REAL_NAME) {
                vo.setPhone(maskPhone(record.getBoundPhone()));
                vo.setRealName(maskRealName(record.getRealName()));
                vo.setIdCard(maskIdCard(record.getIdCard()));
            } else if (type == AppUserAuditTypeEnum.EDUCATION) {
                vo.setEducationIdentity(StrUtil.blankToDefault(record.getEducationLevel(),
                        user == null ? null : user.getEducationLevel()));
                vo.setEducationMaterialSummary(StrUtil.blankToDefault(record.getEducationMethod(), "未填方式")
                        + (StrUtil.isBlank(record.getSchoolName()) ? "" : " / " + record.getSchoolName()));
            } else if (type == AppUserAuditTypeEnum.AVATAR) {
                vo.setAvatarUrl(StrUtil.blankToDefault(record.getMediaUrl(), user == null ? null : user.getAvatar()));
            }
            vos.add(vo);
        }
        Page<VerificationVO> result = new Page<>(page.getCurrent(), page.getSize(), page.getTotal());
        result.setRecords(vos);
        return result;
    }

    private VerificationVO baseRow(AppUserAuditRecord record, AppUser user) {
        VerificationVO vo = new VerificationVO();
        vo.setId(record.getId());
        vo.setUserId(record.getUserId());
        vo.setAvatar(user == null ? null : user.getAvatar());
        vo.setNickname(user == null ? null : user.getNickname());
        vo.setStatus(record.getStatus());
        vo.setAuditSource(record.getAuditSource());
        vo.setRejectReason(reason(record));
        vo.setSubmitTime(format(record.getSubmitTime()));
        vo.setResultTime(format(record.getAuditTime()));
        return vo;
    }

    @Override
    public VerificationAuditDetailVO getRealNameDetail(Long id) {
        AppUserAuditRecord record = requireRecord(id, AppUserAuditTypeEnum.REAL_NAME);
        AppUser user = appUserDao.selectById(record.getUserId());
        VerificationAuditDetailVO vo = baseDetail(record, user);
        vo.setFields(List.of(
                new FieldEntry("真实姓名", maskRealName(record.getRealName())),
                new FieldEntry("身份证号", maskIdCard(record.getIdCard())),
                new FieldEntry("实名提交手机号", maskPhone(record.getBoundPhone()))
        ));
        return vo;
    }

    @Override
    public VerificationAuditDetailVO getEducationDetail(Long id) {
        AppUserAuditRecord record = requireRecord(id, AppUserAuditTypeEnum.EDUCATION);
        AppUser user = appUserDao.selectById(record.getUserId());
        VerificationAuditDetailVO vo = baseDetail(record, user);
        vo.setFields(List.of(
                new FieldEntry("学校", StrUtil.blankToDefault(record.getSchoolName(), user == null ? null : user.getSchool())),
                new FieldEntry("学历", StrUtil.blankToDefault(record.getEducationLevel(), user == null ? null : user.getEducationLevel())),
                new FieldEntry("认证方式", record.getEducationMethod()),
                new FieldEntry("材料", record.getMaterialJson())
        ));
        return vo;
    }

    @Override
    public VerificationAuditDetailVO getAvatarDetail(Long id) {
        AppUserAuditRecord record = requireRecord(id, AppUserAuditTypeEnum.AVATAR);
        AppUser user = appUserDao.selectById(record.getUserId());
        VerificationAuditDetailVO vo = baseDetail(record, user);
        vo.setFields(List.of(
                new FieldEntry("头像图片", StrUtil.blankToDefault(record.getMediaUrl(), user == null ? null : user.getAvatar())),
                new FieldEntry("媒体ID", record.getObjectId() == null ? null : String.valueOf(record.getObjectId()))
        ));
        return vo;
    }

    private VerificationAuditDetailVO baseDetail(AppUserAuditRecord record, AppUser user) {
        VerificationAuditDetailVO vo = new VerificationAuditDetailVO();
        vo.setId(record.getId());
        vo.setUserId(record.getUserId());
        vo.setNickname(user == null ? null : user.getNickname());
        vo.setAvatar(user == null ? null : user.getAvatar());
        vo.setVerifyLevel(auditService.certificationApprovedCount(record.getUserId()));
        vo.setSubmitTime(format(record.getSubmitTime()));
        vo.setResultTime(format(record.getAuditTime()));
        vo.setRejectReason(reason(record));
        vo.setStatus(record.getStatus());
        vo.setAuditSource(record.getAuditSource());
        return vo;
    }

    @Override
    @Transactional
    public void auditRealName(Long id, ModerationAuditReq req) {
        requireRecord(id, AppUserAuditTypeEnum.REAL_NAME);
        audit(id, req);
    }

    @Override
    @Transactional
    public void auditEducation(Long id, ModerationAuditReq req) {
        requireRecord(id, AppUserAuditTypeEnum.EDUCATION);
        audit(id, req);
    }

    @Override
    @Transactional
    public void auditAvatar(Long id, ModerationAuditReq req) {
        requireRecord(id, AppUserAuditTypeEnum.AVATAR);
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

    private AppUserAuditRecord requireRecord(Long id, AppUserAuditTypeEnum type) {
        AppUserAuditRecord record = auditRecordDao.selectById(id);
        if (record == null || !type.getCode().equals(record.getAuditType())) {
            throw new BusinessException("审核记录不存在");
        }
        return record;
    }

    private String reason(AppUserAuditRecord record) {
        return record.getRejectReason() != null ? record.getRejectReason() : record.getExpiredReason();
    }

    private String format(LocalDateTime time) {
        return time == null ? null : time.format(FMT);
    }

    private String maskPhone(String phone) {
        if (StrUtil.isBlank(phone) || phone.length() < 7) return phone;
        return phone.substring(0, 3) + "****" + phone.substring(phone.length() - 4);
    }

    private String maskRealName(String name) {
        if (StrUtil.isBlank(name) || name.length() <= 1) return name;
        return name.charAt(0) + "*".repeat(name.length() - 1);
    }

    private String maskIdCard(String idCard) {
        if (StrUtil.isBlank(idCard) || idCard.length() < 8) return idCard;
        return idCard.substring(0, 4) + "**********" + idCard.substring(idCard.length() - 4);
    }
}
