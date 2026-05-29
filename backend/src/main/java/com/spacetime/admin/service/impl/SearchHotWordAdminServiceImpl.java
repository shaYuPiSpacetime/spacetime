package com.spacetime.admin.service.impl;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.spacetime.admin.dto.request.SearchHotWordPageReq;
import com.spacetime.admin.dto.request.SearchHotWordSaveReq;
import com.spacetime.admin.dto.request.StatusUpdateReq;
import com.spacetime.admin.dto.response.SearchHotWordVO;
import com.spacetime.admin.service.SearchHotWordAdminService;
import com.spacetime.common.dao.ContentOperationLogDao;
import com.spacetime.common.dao.SearchHotWordDao;
import com.spacetime.common.entity.ContentOperationLog;
import com.spacetime.common.entity.SearchHotWord;
import com.spacetime.common.enums.CommonStatusEnum;
import com.spacetime.common.exception.BusinessException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import java.time.format.DateTimeFormatter;

/**
 * 搜索热词管理服务实现
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class SearchHotWordAdminServiceImpl implements SearchHotWordAdminService {

    private final SearchHotWordDao searchHotWordDao;
    private final ContentOperationLogDao contentOperationLogDao;

    private static final DateTimeFormatter FMT = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss");

    @Override
    public Page<SearchHotWordVO> list(SearchHotWordPageReq req) {
        LambdaQueryWrapper<SearchHotWord> wrapper = new LambdaQueryWrapper<>();
        wrapper.like(StringUtils.hasText(req.getWord()), SearchHotWord::getWord, req.getWord());
        wrapper.eq(StringUtils.hasText(req.getScene()), SearchHotWord::getScene, req.getScene());
        wrapper.eq(StringUtils.hasText(req.getStatus()), SearchHotWord::getStatus, req.getStatus());
        wrapper.orderByAsc(SearchHotWord::getSort).orderByDesc(SearchHotWord::getCreateTime);

        Page<SearchHotWord> page = new Page<>(req.getPage(), req.getSize());
        Page<SearchHotWord> result = searchHotWordDao.selectPage(page, wrapper);

        Page<SearchHotWordVO> voPage = new Page<>(result.getCurrent(), result.getSize(), result.getTotal());
        voPage.setRecords(result.getRecords().stream().map(this::toVO).toList());
        return voPage;
    }

    @Override
    @Transactional
    public Long create(SearchHotWordSaveReq req) {
        validateReq(req);
        validateEnabledUniqueness(req, null);
        SearchHotWord entity = new SearchHotWord();
        fillEntity(entity, req);
        searchHotWordDao.insert(entity);
        writeLog("HOT_WORD", entity.getId(), "CREATE", null, entity.getWord());
        log.info("search hot word created: id={}, word={}", entity.getId(), req.getWord());
        return entity.getId();
    }

    @Override
    @Transactional
    public void update(Long id, SearchHotWordSaveReq req) {
        SearchHotWord entity = searchHotWordDao.selectById(id);
        if (entity == null) {
            throw new BusinessException("热词不存在");
        }
        validateReq(req);
        validateEnabledUniqueness(req, id);
        String beforeWord = entity.getWord();
        fillEntity(entity, req);
        searchHotWordDao.updateById(entity);
        writeLog("HOT_WORD", id, "UPDATE", beforeWord, entity.getWord());
        log.info("search hot word updated: id={}", id);
    }

    @Override
    @Transactional
    public void updateStatus(Long id, StatusUpdateReq req) {
        SearchHotWord entity = searchHotWordDao.selectById(id);
        if (entity == null) {
            throw new BusinessException("热词不存在");
        }
        if (!isEnabledOrDisabled(req.getStatus())) {
            throw new BusinessException("不支持的热词状态: " + req.getStatus());
        }
        if (CommonStatusEnum.ENABLED.getCode().equals(req.getStatus())) {
            validateUniqueness(entity.getScene(), entity.getWord(), id);
        }
        String beforeStatus = entity.getStatus();
        entity.setStatus(req.getStatus());
        searchHotWordDao.updateById(entity);
        writeLog("HOT_WORD", id, "STATUS_CHANGE", beforeStatus, req.getStatus());
        log.info("search hot word status changed: id={}, status={}", id, req.getStatus());
    }

    @Override
    @Transactional
    public void delete(Long id) {
        SearchHotWord entity = searchHotWordDao.selectById(id);
        if (entity == null) {
            throw new BusinessException("热词不存在");
        }
        searchHotWordDao.deleteById(id);
        writeLog("HOT_WORD", id, "DELETE", entity.getWord(), null);
        log.info("search hot word deleted: id={}", id);
    }

    private void validateReq(SearchHotWordSaveReq req) {
        if (!isEnabledOrDisabled(req.getStatus())) {
            throw new BusinessException("不支持的热词状态: " + req.getStatus());
        }
    }

    private void validateEnabledUniqueness(SearchHotWordSaveReq req, Long excludeId) {
        if (CommonStatusEnum.ENABLED.getCode().equals(req.getStatus())) {
            validateUniqueness(normalizeScene(req.getScene()), req.getWord(), excludeId);
        }
    }

    /** 校验 scene + word 在启用状态下的唯一性 */
    private void validateUniqueness(String scene, String word, Long excludeId) {
        SearchHotWord existing = searchHotWordDao.selectBySceneAndWord(scene, word);
        if (existing != null && !existing.getId().equals(excludeId)) {
            throw new BusinessException("该场景下已存在相同热词: " + word);
        }
    }

    private void fillEntity(SearchHotWord entity, SearchHotWordSaveReq req) {
        entity.setWord(req.getWord());
        entity.setScene(normalizeScene(req.getScene()));
        entity.setSort(req.getSort() != null ? req.getSort() : 0);
        entity.setStatus(req.getStatus());
    }

    private String normalizeScene(String scene) {
        return StringUtils.hasText(scene) ? scene.trim() : "GLOBAL";
    }

    private boolean isEnabledOrDisabled(String status) {
        return CommonStatusEnum.ENABLED.getCode().equals(status) || CommonStatusEnum.DISABLED.getCode().equals(status);
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

    private SearchHotWordVO toVO(SearchHotWord entity) {
        SearchHotWordVO vo = new SearchHotWordVO();
        vo.setId(entity.getId());
        vo.setWord(entity.getWord());
        vo.setScene(entity.getScene());
        vo.setSort(entity.getSort());
        vo.setStatus(entity.getStatus());
        vo.setCreateTime(entity.getCreateTime() != null ? entity.getCreateTime().format(FMT) : null);
        return vo;
    }
}
