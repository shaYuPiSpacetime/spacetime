package com.spacetime.admin.service;

import com.spacetime.admin.dto.request.ModerationAuditReq;
import com.spacetime.admin.dto.response.VerificationAuditDetailVO;
import com.spacetime.admin.service.impl.VerificationAdminServiceImpl;
import com.spacetime.common.dao.AppUserDao;
import com.spacetime.common.dao.AppUserVerificationDao;
import com.spacetime.common.entity.AppUser;
import com.spacetime.common.entity.AppUserVerification;
import com.spacetime.common.enums.VerificationStatusEnum;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.mockito.junit.jupiter.MockitoSettings;
import org.mockito.quality.Strictness;

import java.time.LocalDateTime;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.when;

/**
 * VerificationAdminService 单元测试
 * 验证实名/学历/头像三类认证的审核操作与详情查询（含脱敏/FieldEntry）
 */
@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
@DisplayName("VerificationAdminService L3 测试")
class VerificationAdminServiceTest {

    @Mock
    private AppUserVerificationDao verificationDao;
    @Mock
    private AppUserDao appUserDao;

    @InjectMocks
    private VerificationAdminServiceImpl verificationAdminService;

    private AppUserVerification verification;
    private AppUser user;

    @BeforeEach
    void setUp() {
        verification = new AppUserVerification();
        verification.setId(1L);
        verification.setUserId(1L);
        verification.setRealNameStatus(VerificationStatusEnum.PENDING.getCode());
        verification.setEducationStatus(VerificationStatusEnum.PENDING.getCode());
        verification.setAvatarVerifyStatus(VerificationStatusEnum.APPROVED.getCode());
        verification.setVerifyLevel(1);

        user = new AppUser();
        user.setId(1L);
        user.setNickname("测试用户");
        user.setAvatar("https://cdn.example.com/avatar.jpg");
    }

    // ==================== L3-21~22: 原有审计测试 ====================

    /**
     * L3-21 验证实名认证审核通过后状态变更为 APPROVED，认证等级 +1
     */
    @Test
    @DisplayName("L3-21 后台审核 — 实名认证通过")
    void shouldApproveRealNameVerification() {
        when(verificationDao.selectById(1L)).thenReturn(verification);

        ModerationAuditReq req = new ModerationAuditReq();
        req.setAction("APPROVE");

        verificationAdminService.auditRealName(1L, req);
        assertThat(verification.getRealNameStatus()).isEqualTo(VerificationStatusEnum.APPROVED.getCode());
        assertThat(verification.getVerifyLevel()).isEqualTo(2);
    }

    /**
     * L3-22 验证驳回时状态变更为 REJECTED，驳回原因已记录
     */
    @Test
    @DisplayName("L3-22 后台审核 — 驳回带原因")
    void shouldRejectWithReason() {
        when(verificationDao.selectById(1L)).thenReturn(verification);

        ModerationAuditReq req = new ModerationAuditReq();
        req.setAction("REJECT");
        req.setRejectReason("资料不完整");

        verificationAdminService.auditEducation(1L, req);
        assertThat(verification.getEducationStatus()).isEqualTo(VerificationStatusEnum.REJECTED.getCode());
        assertThat(verification.getEducationRejectReason()).isEqualTo("资料不完整");
    }

    // ==================== L3-26~28: 认证详情查询 ====================

    /**
     * L3-26 验证实名认证详情：fields 含脱敏姓名（张**）/脱敏身份证/核身状态，submitTime 非空
     */
    @Test
    @DisplayName("L3-26 后台认证详情 — 查询实名认证详情（含脱敏）")
    void shouldReturnRealNameDetailWithMaskedFields() {
        verification.setRealName("张三丰");
        verification.setIdCard("320102199001011234");
        verification.setRealNameSubmitTime(LocalDateTime.of(2026, 6, 1, 10, 0));
        when(verificationDao.selectById(1L)).thenReturn(verification);
        when(appUserDao.selectById(1L)).thenReturn(user);

        VerificationAuditDetailVO vo = verificationAdminService.getRealNameDetail(1L);

        assertThat(vo.getId()).isEqualTo(1L);
        assertThat(vo.getUserId()).isEqualTo(1L);
        assertThat(vo.getNickname()).isEqualTo("测试用户");
        assertThat(vo.getStatus()).isEqualTo(VerificationStatusEnum.PENDING.getCode());
        assertThat(vo.getFields()).hasSize(3);
        assertThat(vo.getFields().get(0).getLabel()).isEqualTo("真实姓名");
        assertThat(vo.getFields().get(0).getValue()).isEqualTo("张**");
        assertThat(vo.getFields().get(1).getLabel()).isEqualTo("身份证号");
        assertThat(vo.getFields().get(1).getValue()).isEqualTo("3201**********1234");
        assertThat(vo.getFields().get(2).getLabel()).isEqualTo("人脸核身状态");
        assertThat(vo.getSubmitTime()).isEqualTo("2026-06-01 10:00:00");
    }

    /**
     * L3-27 验证学历认证详情：fields 含学校/认证方式，submitTime 非空
     */
    @Test
    @DisplayName("L3-27 后台认证详情 — 查询学历认证详情")
    void shouldReturnEducationDetail() {
        user.setSchool("中山大学");
        verification.setEducationMethod("CHSI");
        verification.setEducationSubmitTime(LocalDateTime.of(2026, 5, 28, 14, 30));
        when(verificationDao.selectById(1L)).thenReturn(verification);
        when(appUserDao.selectById(1L)).thenReturn(user);

        VerificationAuditDetailVO vo = verificationAdminService.getEducationDetail(1L);

        assertThat(vo.getId()).isEqualTo(1L);
        assertThat(vo.getStatus()).isEqualTo(VerificationStatusEnum.PENDING.getCode());
        assertThat(vo.getFields()).hasSize(2);
        assertThat(vo.getFields().get(0).getLabel()).isEqualTo("学校");
        assertThat(vo.getFields().get(0).getValue()).isEqualTo("中山大学");
        assertThat(vo.getFields().get(1).getLabel()).isEqualTo("认证方式");
        assertThat(vo.getFields().get(1).getValue()).isEqualTo("CHSI");
        assertThat(vo.getSubmitTime()).isEqualTo("2026-05-28 14:30:00");
    }

    /**
     * L3-28 验证头像认证详情：fields 含头像URL/认证状态，submitTime 非空
     */
    @Test
    @DisplayName("L3-28 后台认证详情 — 查询头像认证详情")
    void shouldReturnAvatarDetail() {
        verification.setAvatarVerifySubmitTime(LocalDateTime.of(2026, 6, 3, 9, 15));
        when(verificationDao.selectById(1L)).thenReturn(verification);
        when(appUserDao.selectById(1L)).thenReturn(user);

        VerificationAuditDetailVO vo = verificationAdminService.getAvatarDetail(1L);

        assertThat(vo.getId()).isEqualTo(1L);
        assertThat(vo.getStatus()).isEqualTo(VerificationStatusEnum.APPROVED.getCode());
        assertThat(vo.getFields()).hasSize(2);
        assertThat(vo.getFields().get(0).getLabel()).isEqualTo("当前主头像");
        assertThat(vo.getFields().get(0).getValue()).isEqualTo("https://cdn.example.com/avatar.jpg");
        assertThat(vo.getFields().get(1).getLabel()).isEqualTo("认证状态");
        assertThat(vo.getFields().get(1).getValue()).isEqualTo(VerificationStatusEnum.APPROVED.getCode());
        assertThat(vo.getSubmitTime()).isEqualTo("2026-06-03 09:15:00");
    }
}
