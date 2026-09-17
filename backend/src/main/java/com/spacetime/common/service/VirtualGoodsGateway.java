package com.spacetime.common.service;

/**
 * 微信虚拟商品上传、发布任务网关。微信按环境维护任务，不返回任务 ID。
 */
public interface VirtualGoodsGateway {

    /** 启动一个商品的上传任务；图片必须是公网可访问的 PNG/JPG。 */
    void upload(String productId, String name, int priceFen, String remark, String imageUrl);

    /** 查询当前环境上传任务，并仅匹配指定商品。 */
    GoodsTaskSnapshot queryUpload(String expectedProductId);

    /** 启动一个商品的发布任务。 */
    void publish(String productId);

    /** 查询当前环境发布任务，并仅匹配指定商品。 */
    GoodsTaskSnapshot queryPublish(String expectedProductId);

    enum TaskState { NONE, RUNNING, FAILED, SUCCEEDED }

    enum ItemState { MISSING, RUNNING, ALREADY_EXISTS, SUCCEEDED, FAILED }

    /**
     * 查询仅证明上传或发布任务结果，发布成功不代表支付渠道已立即生效。
     */
    record GoodsTaskSnapshot(TaskState taskState, ItemState itemState,
                             String productId, Integer priceFen, String errorMessage) {
        public boolean successful() {
            return taskState == TaskState.SUCCEEDED && itemState == ItemState.SUCCEEDED;
        }
    }
}
