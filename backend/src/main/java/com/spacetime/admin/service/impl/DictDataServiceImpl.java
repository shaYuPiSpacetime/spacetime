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
import java.util.List;

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
    public List<DictDataVO> tree(String dictType) {
        List<SysDictData> all = dictDataDao.selectList(
                new LambdaQueryWrapper<SysDictData>()
                        .eq(SysDictData::getDictType, dictType)
                        .orderByAsc(SysDictData::getDictSort));
        return buildTree(all, 0L);
    }

    @Override
    @Transactional
    public Long create(DictDataCreateReq req) {
        SysDictData entity = new SysDictData();
        entity.setDictType(req.getDictType());
        entity.setParentId(req.getParentId() != null ? req.getParentId() : 0L);
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
        entity.setDictType(req.getDictType());
        entity.setParentId(req.getParentId() != null ? req.getParentId() : 0L);
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
        List<SysDictData> all = dictDataDao.selectList(
                new LambdaQueryWrapper<SysDictData>().orderByAsc(SysDictData::getDictSort));
        List<Long> idsToDelete = new ArrayList<>();
        idsToDelete.add(id);
        collectChildIds(all, id, idsToDelete);
        for (Long did : idsToDelete) {
            dictDataDao.deleteById(did);
        }
        log.info("dict data deleted: id={}, cascadeCount={}", id, idsToDelete.size());
    }

    /** 构建树形结构 */
    private List<DictDataVO> buildTree(List<SysDictData> all, Long parentId) {
        List<DictDataVO> tree = new ArrayList<>();
        for (SysDictData entity : all) {
            if (entity.getParentId().equals(parentId)) {
                DictDataVO vo = toVO(entity);
                vo.setChildren(buildTree(all, entity.getId()));
                tree.add(vo);
            }
        }
        return tree;
    }

    /** 递归收集子孙节点 ID（含自身） */
    private void collectChildIds(List<SysDictData> all, Long parentId, List<Long> result) {
        for (SysDictData entity : all) {
            if (entity.getParentId().equals(parentId)) {
                result.add(entity.getId());
                collectChildIds(all, entity.getId(), result);
            }
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
        return vo;
    }
}
