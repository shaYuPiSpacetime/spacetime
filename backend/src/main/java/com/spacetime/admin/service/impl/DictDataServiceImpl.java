package com.spacetime.admin.service.impl;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.spacetime.admin.dto.request.DictDataCreateReq;
import com.spacetime.admin.dto.request.DictDataUpdateReq;
import com.spacetime.admin.dto.response.DictDataVO;
import com.spacetime.admin.service.DictDataService;
import com.spacetime.common.dao.DictDataDao;
import com.spacetime.common.dao.DictTypeDao;
import com.spacetime.common.entity.SysDictData;
import com.spacetime.common.enums.CommonStatusEnum;
import com.spacetime.common.enums.ResultCodeEnum;
import com.spacetime.common.exception.BusinessException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Set;

/**
 * 字典数据服务实现
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class DictDataServiceImpl implements DictDataService {

    private final DictDataDao dictDataDao;
    private final DictTypeDao dictTypeDao;

    @Override
    public List<DictDataVO> children(String dictType, Long parentId) {
        Long normalizedParentId = parentId == null ? 0L : parentId;
        return dictDataDao.selectChildren(dictType, normalizedParentId, false)
                .stream()
                .map(this::toVO)
                .toList();
    }

    @Override
    @Transactional
    public Long create(DictDataCreateReq req) {
        validateDictType(req.getDictType());
        Long parentId = normalizeParentId(req.getParentId());
        validateParent(parentId, req.getDictType(), null);
        SysDictData entity = new SysDictData();
        entity.setDictType(req.getDictType());
        entity.setParentId(parentId);
        entity.setDictLabel(req.getDictLabel());
        entity.setDictValue(req.getDictValue());
        entity.setDictSort(req.getDictSort() != null ? req.getDictSort() : 0);
        entity.setStatus(req.getStatus() != null ? req.getStatus() : CommonStatusEnum.ENABLED.getCode());
        entity.setRemark(req.getRemark());
        dictDataDao.insert(entity);
        log.info("dict data created: id={}, dictLabel={}, dictType={}", entity.getId(), entity.getDictLabel(), entity.getDictType());
        return entity.getId();
    }

    @Override
    @Transactional
    public void update(DictDataUpdateReq req) {
        SysDictData entity = dictDataDao.selectById(req.getId());
        if (entity == null) {
            throw new BusinessException(ResultCodeEnum.BUSINESS_ERROR.getCode(), "字典数据不存在");
        }
        validateDictType(req.getDictType());
        if (!entity.getDictType().equals(req.getDictType())) {
            throw new BusinessException(ResultCodeEnum.BUSINESS_ERROR.getCode(), "不能修改字典数据所属类型");
        }
        Long parentId = normalizeParentId(req.getParentId());
        validateParent(parentId, req.getDictType(), req.getId());
        entity.setParentId(parentId);
        entity.setDictLabel(req.getDictLabel());
        entity.setDictValue(req.getDictValue());
        entity.setDictSort(req.getDictSort() != null ? req.getDictSort() : 0);
        entity.setStatus(req.getStatus());
        entity.setRemark(req.getRemark());
        dictDataDao.updateById(entity);
        log.info("dict data updated: id={}, dictLabel={}", entity.getId(), entity.getDictLabel());
    }

    @Override
    @Transactional
    public void delete(Long id) {
        SysDictData entity = dictDataDao.selectById(id);
        if (entity == null) {
            throw new BusinessException(ResultCodeEnum.BUSINESS_ERROR.getCode(), "字典数据不存在");
        }
        List<SysDictData> all = dictDataDao.selectList(
                new LambdaQueryWrapper<SysDictData>()
                        .eq(SysDictData::getDictType, entity.getDictType())
                        .orderByAsc(SysDictData::getDictSort));
        List<Long> idsToDelete = collectChildIds(all, id);
        for (Long did : idsToDelete) {
            dictDataDao.deleteById(did);
        }
        log.info("dict data deleted: id={}, cascadeCount={}", id, idsToDelete.size());
    }

    /** 收集子孙节点 ID（含自身），并避免脏数据导致无限递归。 */
    private List<Long> collectChildIds(List<SysDictData> all, Long rootId) {
        List<Long> result = new ArrayList<>();
        Set<Long> visited = new HashSet<>();
        List<Long> pending = new ArrayList<>();
        pending.add(rootId);
        while (!pending.isEmpty()) {
            Long currentId = pending.remove(pending.size() - 1);
            if (!visited.add(currentId)) {
                continue;
            }
            result.add(currentId);
            for (SysDictData data : all) {
                if (currentId.equals(data.getParentId())) {
                    pending.add(data.getId());
                }
            }
        }
        return result;
    }

    private Long normalizeParentId(Long parentId) {
        return parentId == null ? 0L : parentId;
    }

    private void validateDictType(String dictType) {
        if (dictTypeDao.selectByCode(dictType) == null) {
            throw new BusinessException(ResultCodeEnum.BUSINESS_ERROR.getCode(), "字典类型不存在");
        }
    }

    private void validateParent(Long parentId, String dictType, Long currentId) {
        if (parentId == null || parentId == 0L) {
            return;
        }
        Set<Long> visited = new HashSet<>();
        Long ancestorId = parentId;
        while (ancestorId != null && ancestorId > 0) {
            if (ancestorId.equals(currentId)) {
                throw new BusinessException(ResultCodeEnum.BUSINESS_ERROR.getCode(), "上级字典不能是自身或子节点");
            }
            if (!visited.add(ancestorId)) {
                throw new BusinessException(ResultCodeEnum.BUSINESS_ERROR.getCode(), "字典层级存在循环引用");
            }
            SysDictData ancestor = dictDataDao.selectById(ancestorId);
            if (ancestor == null) {
                throw new BusinessException(ResultCodeEnum.BUSINESS_ERROR.getCode(), "上级字典不存在");
            }
            if (!dictType.equals(ancestor.getDictType())) {
                throw new BusinessException(ResultCodeEnum.BUSINESS_ERROR.getCode(), "上级字典必须属于同一字典类型");
            }
            ancestorId = ancestor.getParentId();
        }
    }

    private DictDataVO toVO(SysDictData entity) {
        DictDataVO vo = new DictDataVO();
        vo.setId(entity.getId());
        vo.setDictType(entity.getDictType());
        vo.setParentId(entity.getParentId());
        vo.setDictLabel(entity.getDictLabel());
        vo.setDictValue(entity.getDictValue());
        vo.setDictSort(entity.getDictSort());
        vo.setStatus(entity.getStatus());
        vo.setRemark(entity.getRemark());
        vo.setCreateTime(entity.getCreateTime());
        vo.setHasChildren(Boolean.TRUE.equals(entity.getHasChildren()));
        return vo;
    }
}
