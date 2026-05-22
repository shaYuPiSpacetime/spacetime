package com.spacetime.admin.service.impl;

import cn.hutool.core.util.IdUtil;
import cn.hutool.core.util.StrUtil;
import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.spacetime.admin.dto.request.PromotionAgentPageReq;
import com.spacetime.admin.dto.request.PromotionAgentSaveReq;
import com.spacetime.admin.dto.response.PromotionAgentCodeVO;
import com.spacetime.admin.dto.response.PromotionAgentVO;
import com.spacetime.admin.service.PromotionAgentAdminService;
import com.spacetime.common.dao.PromotionAgentCodeDao;
import com.spacetime.common.dao.PromotionAgentDao;
import com.spacetime.common.dao.PromotionAgentEventDao;
import com.spacetime.common.dao.PromotionAuditLogDao;
import com.spacetime.common.entity.PromotionAgent;
import com.spacetime.common.entity.PromotionAgentCode;
import com.spacetime.common.entity.PromotionAgentEvent;
import com.spacetime.common.entity.PromotionAuditLog;
import com.spacetime.common.enums.PromotionAgentStatusEnum;
import com.spacetime.common.exception.BusinessException;
import com.spacetime.common.util.DesensitizeUtil;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * 代理后台服务实现
 */
@Service
@RequiredArgsConstructor
public class PromotionAgentAdminServiceImpl implements PromotionAgentAdminService {
    private final PromotionAgentDao agentDao;
    private final PromotionAgentCodeDao agentCodeDao;
    private final PromotionAgentEventDao agentEventDao;
    private final PromotionAuditLogDao auditLogDao;

    @Override
    public Page<PromotionAgentVO> list(PromotionAgentPageReq req) {
        LambdaQueryWrapper<PromotionAgent> wrapper = new LambdaQueryWrapper<PromotionAgent>()
                .and(StrUtil.isNotBlank(req.getKeyword()), w -> w
                        .like(PromotionAgent::getAgentName, req.getKeyword())
                        .or()
                        .like(PromotionAgent::getContactName, req.getKeyword())
                        .or()
                        .like(PromotionAgent::getContactPhone, req.getKeyword()))
                .eq(StrUtil.isNotBlank(req.getSchool()), PromotionAgent::getSchool, req.getSchool())
                .eq(StrUtil.isNotBlank(req.getStatus()), PromotionAgent::getStatus, req.getStatus())
                .orderByDesc(PromotionAgent::getCreateTime);
        Page<PromotionAgent> page = agentDao.selectPage(new Page<>(req.getPage(), req.getSize()), wrapper);
        Page<PromotionAgentVO> result = new Page<>(page.getCurrent(), page.getSize(), page.getTotal());
        result.setRecords(page.getRecords().stream().map(this::toVO).toList());
        return result;
    }

    @Override
    public PromotionAgentVO detail(Long id) {
        return toVO(requireAgent(id));
    }

    private PromotionAgent requireAgent(Long id) {
        PromotionAgent agent = agentDao.selectById(id);
        if (agent == null) {
            throw new BusinessException("代理不存在");
        }
        return agent;
    }

    @Override
    @Transactional
    public Long create(PromotionAgentSaveReq req) {
        PromotionAgent agent = toEntity(req);
        if (StrUtil.isBlank(agent.getStatus())) {
            agent.setStatus(PromotionAgentStatusEnum.NORMAL.getCode());
        }
        if (StrUtil.isBlank(agent.getAgentGroup())) {
            agent.setAgentGroup("DEFAULT");
        }
        agentDao.insert(agent);
        audit("agent", agent.getId(), "create", null, agent.getAgentName());
        return agent.getId();
    }

    @Override
    @Transactional
    public void update(Long id, PromotionAgentSaveReq req) {
        PromotionAgent entity = requireAgent(id);
        PromotionAgent agent = toEntity(req);
        entity.setAgentName(agent.getAgentName());
        entity.setContactName(agent.getContactName());
        entity.setContactPhone(agent.getContactPhone());
        entity.setSchool(agent.getSchool());
        entity.setCampus(agent.getCampus());
        entity.setAgentGroup(agent.getAgentGroup());
        entity.setStatus(agent.getStatus());
        entity.setRemark(agent.getRemark());
        agentDao.updateById(entity);
        audit("agent", id, "update", null, entity.getAgentName());
    }

    @Override
    @Transactional
    public void updateStatus(Long id, String status) {
        PromotionAgent entity = requireAgent(id);
        String before = entity.getStatus();
        entity.setStatus(status);
        agentDao.updateById(entity);
        audit("agent", id, "status", before, status);
    }

    @Override
    @Transactional
    public PromotionAgentCodeVO regenerateCode(Long agentId) {
        requireAgent(agentId);
        PromotionAgentCode code = new PromotionAgentCode();
        code.setAgentId(agentId);
        code.setAgentCode("A" + IdUtil.fastSimpleUUID().substring(0, 15));
        code.setMiniappPath("/pages/index/index?agentCode=" + code.getAgentCode());
        code.setVersionNo(1);
        code.setStatus("enabled");
        agentCodeDao.insert(code);
        audit("agent_code", code.getId(), "create", null, code.getAgentCode());
        return toCodeVO(code);
    }

    @Override
    @Transactional
    public void disableCode(Long codeId) {
        PromotionAgentCode code = agentCodeDao.selectById(codeId);
        if (code == null) {
            throw new BusinessException("代理码不存在");
        }
        code.setStatus("disabled");
        agentCodeDao.updateById(code);
        audit("agent_code", codeId, "disable", "enabled", "disabled");
    }

    @Override
    public Page<PromotionAgentEvent> events(Long agentId, int page, int size, String eventType) {
        LambdaQueryWrapper<PromotionAgentEvent> wrapper = new LambdaQueryWrapper<PromotionAgentEvent>()
                .eq(PromotionAgentEvent::getAgentId, agentId)
                .eq(StrUtil.isNotBlank(eventType), PromotionAgentEvent::getEventType, eventType)
                .orderByDesc(PromotionAgentEvent::getEventTime);
        return agentEventDao.selectPage(new Page<>(page, Math.min(size, 100)), wrapper);
    }

    private void audit(String bizType, Long bizId, String action, String beforeValue, String afterValue) {
        PromotionAuditLog log = new PromotionAuditLog();
        log.setBizType(bizType);
        log.setBizId(bizId);
        log.setAction(action);
        log.setBeforeValue(beforeValue);
        log.setAfterValue(afterValue);
        auditLogDao.insert(log);
    }

    private PromotionAgent toEntity(PromotionAgentSaveReq req) {
        PromotionAgent agent = new PromotionAgent();
        agent.setAgentName(req.getAgentName());
        agent.setContactName(req.getContactName());
        agent.setContactPhone(req.getContactPhone());
        agent.setSchool(req.getSchool());
        agent.setCampus(req.getCampus());
        agent.setAgentGroup(req.getAgentGroup());
        agent.setStatus(req.getStatus());
        agent.setRemark(req.getRemark());
        return agent;
    }

    private PromotionAgentVO toVO(PromotionAgent entity) {
        PromotionAgentVO vo = new PromotionAgentVO();
        vo.setId(entity.getId());
        vo.setAgentName(entity.getAgentName());
        vo.setContactName(entity.getContactName());
        vo.setContactPhone(DesensitizeUtil.maskPhone(entity.getContactPhone()));
        vo.setSchool(entity.getSchool());
        vo.setCampus(entity.getCampus());
        vo.setAgentGroup(entity.getAgentGroup());
        vo.setStatus(entity.getStatus());
        vo.setRemark(entity.getRemark());
        vo.setCreateTime(entity.getCreateTime());
        return vo;
    }

    private PromotionAgentCodeVO toCodeVO(PromotionAgentCode entity) {
        PromotionAgentCodeVO vo = new PromotionAgentCodeVO();
        vo.setId(entity.getId());
        vo.setAgentId(entity.getAgentId());
        vo.setAgentCode(entity.getAgentCode());
        vo.setMiniappPath(entity.getMiniappPath());
        vo.setQrUrl(entity.getQrUrl());
        vo.setPosterUrl(entity.getPosterUrl());
        vo.setVersionNo(entity.getVersionNo());
        vo.setStatus(entity.getStatus());
        return vo;
    }
}
