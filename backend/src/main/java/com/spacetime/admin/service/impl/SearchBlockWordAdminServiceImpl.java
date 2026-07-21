package com.spacetime.admin.service.impl;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.spacetime.admin.dto.request.SearchBlockWordPageReq;
import com.spacetime.admin.dto.request.SearchBlockWordSaveReq;
import com.spacetime.admin.dto.request.StatusUpdateReq;
import com.spacetime.admin.dto.response.SearchBlockWordVO;
import com.spacetime.admin.service.SearchBlockWordAdminService;
import com.spacetime.common.dao.ContentOperationLogDao;
import com.spacetime.common.dao.DictDataDao;
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
import java.util.LinkedHashMap;
import java.util.Map;

/**
 * 搜索屏蔽词管理服务实现
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class SearchBlockWordAdminServiceImpl implements SearchBlockWordAdminService {

    private final SearchBlockWordDao searchBlockWordDao;
    private final ContentOperationLogDao contentOperationLogDao;
    private final DictDataDao dictDataDao;
    private final ObjectMapper objectMapper;

    private static final DateTimeFormatter FMT = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss");

    @Override
    public Page<SearchBlockWordVO> list(SearchBlockWordPageReq req) {
        LambdaQueryWrapper<SearchBlockWord> wrapper = new LambdaQueryWrapper<>();
        wrapper.like(StringUtils.hasText(req.getWord()), SearchBlockWord::getWord, req.getWord());
        wrapper.eq(StringUtils.hasText(req.getBlockType()), SearchBlockWord::getBlockType, req.getBlockType());
        wrapper.eq(StringUtils.hasText(req.getMatchType()), SearchBlockWord::getMatchType, req.getMatchType());
        wrapper.eq(StringUtils.hasText(req.getReasonCode()), SearchBlockWord::getReasonCode, req.getReasonCode());
        wrapper.eq(StringUtils.hasText(req.getStatus()), SearchBlockWord::getStatus, req.getStatus());
        wrapper.orderByDesc(SearchBlockWord::getUpdateTime).orderByDesc(SearchBlockWord::getId);

        Page<SearchBlockWord> page = new Page<>(req.getPage(), req.getSize());
        Page<SearchBlockWord> result = searchBlockWordDao.selectPage(page, wrapper);

        Page<SearchBlockWordVO> voPage = new Page<>(result.getCurrent(), result.getSize(), result.getTotal());
        voPage.setRecords(result.getRecords().stream().map(this::toVO).toList());
        return voPage;
    }

    @Override
    @Transactional
    public Long create(SearchBlockWordSaveReq req) {
        normalize(req);
        validateReq(req);
        validateUniqueness(req.getWord(), req.getMatchType(), null);
        SearchBlockWord entity = new SearchBlockWord();
        fillEntity(entity, req);
        searchBlockWordDao.insert(entity);
        writeLog("BLOCK_WORD", entity.getId(), "CREATE", null, auditValue(entity));
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
        normalize(req);
        validateReq(req);
        validateUniqueness(req.getWord(), req.getMatchType(), id);
        String beforeValue = auditValue(entity);
        fillEntity(entity, req);
        searchBlockWordDao.updateById(entity);
        writeLog("BLOCK_WORD", id, "UPDATE", beforeValue, auditValue(entity));
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
        validateUniqueness(entity.getWord(), entity.getMatchType(), id);
        String beforeValue = auditValue(entity);
        entity.setStatus(req.getStatus());
        searchBlockWordDao.updateById(entity);
        writeLog("BLOCK_WORD", id, "STATUS_CHANGE", beforeValue, auditValue(entity));
        log.info("search block word status changed: id={}, status={}", id, req.getStatus());
    }

    @Override
    @Transactional
    public void delete(Long id) {
        SearchBlockWord entity = searchBlockWordDao.selectById(id);
        if (entity == null) {
            throw new BusinessException("屏蔽词不存在");
        }
        searchBlockWordDao.deleteById(id);
        writeLog("BLOCK_WORD", id, "DELETE", auditValue(entity), null);
        log.info("search block word deleted: id={}", id);
    }

    private void validateReq(SearchBlockWordSaveReq req) {
        if (SearchBlockTypeEnum.getByCode(req.getBlockType()) == null) {
            throw new BusinessException("不支持的屏蔽类型: " + req.getBlockType());
        }
        if (!MatchTypeEnum.EXACT.getCode().equals(req.getMatchType())
                && !MatchTypeEnum.FUZZY.getCode().equals(req.getMatchType())) {
            throw new BusinessException("匹配类型只支持 EXACT 或 FUZZY");
        }
        if (!isEnabledOrDisabled(req.getStatus())) {
            throw new BusinessException("不支持的屏蔽词状态: " + req.getStatus());
        }
        if (dictDataDao.selectEnabledByTypeAndValue("search_block_reason", req.getReasonCode()) == null) {
            throw new BusinessException("屏蔽原因必须来自启用的 search_block_reason 字典");
        }
    }

    private boolean isEnabledOrDisabled(String status) {
        return CommonStatusEnum.ENABLED.getCode().equals(status) || CommonStatusEnum.DISABLED.getCode().equals(status);
    }

    /** 校验 word + matchType 在全部状态下的唯一性。 */
    private void validateUniqueness(String word, String matchType, Long excludeId) {
        SearchBlockWord existing = searchBlockWordDao.selectByWordAndMatchType(word, matchType);
        if (existing != null && !existing.getId().equals(excludeId)) {
            throw new BusinessException("该屏蔽词和匹配方式已存在: " + word);
        }
    }

    private void normalize(SearchBlockWordSaveReq req) {
        req.setWord(req.getWord().trim());
        req.setReasonCode(req.getReasonCode().trim());
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

    private String auditValue(SearchBlockWord entity) {
        Map<String, Object> value = new LinkedHashMap<>();
        value.put("word", entity.getWord());
        value.put("blockType", entity.getBlockType());
        value.put("matchType", entity.getMatchType());
        value.put("reasonCode", entity.getReasonCode());
        value.put("status", entity.getStatus());
        try {
            return objectMapper.writeValueAsString(value);
        } catch (JsonProcessingException e) {
            throw new BusinessException("搜索屏蔽词审计序列化失败");
        }
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
        vo.setUpdateTime(entity.getUpdateTime() != null ? entity.getUpdateTime().format(FMT) : null);
        vo.setUpdatedBy(entity.getUpdatedBy());
        return vo;
    }
}
