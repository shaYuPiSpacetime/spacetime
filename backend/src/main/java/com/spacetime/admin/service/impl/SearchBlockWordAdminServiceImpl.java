package com.spacetime.admin.service.impl;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.spacetime.admin.dto.request.SearchBlockWordPageReq;
import com.spacetime.admin.dto.request.SearchBlockWordSaveReq;
import com.spacetime.admin.dto.request.StatusUpdateReq;
import com.spacetime.admin.dto.response.SearchBlockWordVO;
import com.spacetime.admin.service.SearchBlockWordAdminService;
import com.spacetime.common.dao.ContentOperationLogDao;
import com.spacetime.common.dao.SearchBlockWordDao;
import com.spacetime.common.entity.ContentOperationLog;
import com.spacetime.common.entity.SearchBlockWord;
import com.spacetime.common.enums.CommonStatusEnum;
import com.spacetime.common.enums.MatchTypeEnum;
import com.spacetime.common.enums.SearchBlockTypeEnum;
import com.spacetime.common.exception.BusinessException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import java.time.format.DateTimeFormatter;

/**
 * 搜索屏蔽词管理服务实现
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class SearchBlockWordAdminServiceImpl implements SearchBlockWordAdminService {

    private final SearchBlockWordDao searchBlockWordDao;
    private final ContentOperationLogDao contentOperationLogDao;

    private static final DateTimeFormatter FMT = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss");

    @Override
    public Page<SearchBlockWordVO> list(SearchBlockWordPageReq req) {
        LambdaQueryWrapper<SearchBlockWord> wrapper = new LambdaQueryWrapper<>();
        wrapper.like(StringUtils.hasText(req.getWord()), SearchBlockWord::getWord, req.getWord());
        wrapper.eq(StringUtils.hasText(req.getBlockType()), SearchBlockWord::getBlockType, req.getBlockType());
        wrapper.eq(StringUtils.hasText(req.getStatus()), SearchBlockWord::getStatus, req.getStatus());
        wrapper.orderByDesc(SearchBlockWord::getCreateTime);

        Page<SearchBlockWord> page = new Page<>(req.getPage(), req.getSize());
        Page<SearchBlockWord> result = searchBlockWordDao.selectPage(page, wrapper);

        Page<SearchBlockWordVO> voPage = new Page<>(result.getCurrent(), result.getSize(), result.getTotal());
        voPage.setRecords(result.getRecords().stream().map(this::toVO).toList());
        return voPage;
    }

    @Override
    @Transactional
    public Long create(SearchBlockWordSaveReq req) {
        validateReq(req);
        validateEnabledUniqueness(req, null);
        SearchBlockWord entity = new SearchBlockWord();
        fillEntity(entity, req);
        searchBlockWordDao.insert(entity);
        writeLog("BLOCK_WORD", entity.getId(), "CREATE", null, req.getWord());
        log.info("search block word created: id={}, word={}", entity.getId(), req.getWord());
        return entity.getId();
    }

    @Override
    @Transactional
    public void update(Long id, SearchBlockWordSaveReq req) {
        SearchBlockWord entity = searchBlockWordDao.selectById(id);
        if (entity == null) {
            throw new BusinessException("屏蔽词不存在");
        }
        validateReq(req);
        validateEnabledUniqueness(req, id);
        String beforeWord = entity.getWord();
        fillEntity(entity, req);
        searchBlockWordDao.updateById(entity);
        writeLog("BLOCK_WORD", id, "UPDATE", beforeWord, req.getWord());
        log.info("search block word updated: id={}", id);
    }

    @Override
    @Transactional
    public void updateStatus(Long id, StatusUpdateReq req) {
        SearchBlockWord entity = searchBlockWordDao.selectById(id);
        if (entity == null) {
            throw new BusinessException("屏蔽词不存在");
        }
        if (!isEnabledOrDisabled(req.getStatus())) {
            throw new BusinessException("不支持的屏蔽词状态: " + req.getStatus());
        }
        if (CommonStatusEnum.ENABLED.getCode().equals(req.getStatus())) {
            validateUniqueness(entity.getBlockType(), entity.getWord(), id);
        }
        String beforeStatus = entity.getStatus();
        entity.setStatus(req.getStatus());
        searchBlockWordDao.updateById(entity);
        writeLog("BLOCK_WORD", id, "STATUS_CHANGE", beforeStatus, req.getStatus());
        log.info("search block word status changed: id={}, {} -> {}", id, beforeStatus, req.getStatus());
    }

    @Override
    @Transactional
    public void delete(Long id) {
        SearchBlockWord entity = searchBlockWordDao.selectById(id);
        if (entity == null) {
            throw new BusinessException("屏蔽词不存在");
        }
        searchBlockWordDao.deleteById(id);
        writeLog("BLOCK_WORD", id, "DELETE", entity.getWord(), null);
        log.info("search block word deleted: id={}", id);
    }

    private void validateReq(SearchBlockWordSaveReq req) {
        if (SearchBlockTypeEnum.getByCode(req.getBlockType()) == null) {
            throw new BusinessException("不支持的屏蔽类型: " + req.getBlockType());
        }
        if (MatchTypeEnum.getByCode(req.getMatchType()) == null) {
            throw new BusinessException("不支持的匹配类型: " + req.getMatchType());
        }
        if (!isEnabledOrDisabled(req.getStatus())) {
            throw new BusinessException("不支持的屏蔽词状态: " + req.getStatus());
        }
    }

    private void validateEnabledUniqueness(SearchBlockWordSaveReq req, Long excludeId) {
        if (CommonStatusEnum.ENABLED.getCode().equals(req.getStatus())) {
            validateUniqueness(req.getBlockType(), req.getWord(), excludeId);
        }
    }

    private boolean isEnabledOrDisabled(String status) {
        return CommonStatusEnum.ENABLED.getCode().equals(status) || CommonStatusEnum.DISABLED.getCode().equals(status);
    }

    /** 校验 blockType + word 在启用状态下的唯一性 */
    private void validateUniqueness(String blockType, String word, Long excludeId) {
        SearchBlockWord existing = searchBlockWordDao.selectByTypeAndWord(blockType, word);
        if (existing != null && !existing.getId().equals(excludeId)) {
            throw new BusinessException("该类型下已存在相同屏蔽词: " + word);
        }
    }

    private void fillEntity(SearchBlockWord entity, SearchBlockWordSaveReq req) {
        entity.setWord(req.getWord());
        entity.setBlockType(req.getBlockType());
        entity.setMatchType(req.getMatchType());
        entity.setReasonCode(req.getReasonCode());
        entity.setHitMessage(req.getHitMessage());
        entity.setStatus(req.getStatus());
        entity.setRemark(req.getRemark());
    }

    private void writeLog(String bizType, Long bizId, String action, String beforeValue, String afterValue) {
        ContentOperationLog log = new ContentOperationLog();
        log.setBizType(bizType);
        log.setBizId(bizId);
        log.setAction(action);
        log.setBeforeValue(beforeValue);
        log.setAfterValue(afterValue);
        contentOperationLogDao.insert(log);
    }

    private SearchBlockWordVO toVO(SearchBlockWord entity) {
        SearchBlockWordVO vo = new SearchBlockWordVO();
        vo.setId(entity.getId());
        vo.setWord(entity.getWord());
        vo.setBlockType(entity.getBlockType());
        vo.setMatchType(entity.getMatchType());
        vo.setReasonCode(entity.getReasonCode());
        vo.setHitMessage(entity.getHitMessage());
        vo.setStatus(entity.getStatus());
        vo.setRemark(entity.getRemark());
        vo.setCreateTime(entity.getCreateTime() != null ? entity.getCreateTime().format(FMT) : null);
        return vo;
    }
}
