package com.spacetime.common.dao;

import com.spacetime.common.entity.VirtualPriceChange;

import java.util.List;

/** 微信虚拟商品改价任务数据访问接口。 */
public interface VirtualPriceChangeDao {
    VirtualPriceChange selectLatest(String packageType, Long packageId);
    List<VirtualPriceChange> selectPending(int limit);
    void insert(VirtualPriceChange entity);
    void updateById(VirtualPriceChange entity);
}
