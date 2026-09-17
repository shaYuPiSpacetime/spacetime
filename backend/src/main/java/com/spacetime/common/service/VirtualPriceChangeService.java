package com.spacetime.common.service;

import cn.hutool.core.util.StrUtil;
import com.spacetime.common.config.WechatVirtualPayProperties;
import com.spacetime.common.dao.CoinPackageDao;
import com.spacetime.common.dao.VipPackageDao;
import com.spacetime.common.dao.VirtualPriceChangeDao;
import com.spacetime.common.entity.CoinPackage;
import com.spacetime.common.entity.VipPackage;
import com.spacetime.common.entity.VirtualPriceChange;
import com.spacetime.common.exception.BusinessException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.Duration;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

/** 将报价与当前可支付价隔离，并串行推进微信商品发布。 */
@Service
@Slf4j
@RequiredArgsConstructor
public class VirtualPriceChangeService {
    private static final Duration EFFECTIVE_GRACE = Duration.ofMinutes(20);
    private static final Duration TASK_TIMEOUT = Duration.ofMinutes(30);
    private static final String DEFAULT_GOODS_IMAGE =
            "https://www.shikongxiehou.com/assets/shikongxiehou-logo.png";

    private final VirtualPriceChangeDao changeDao;
    private final VipPackageDao vipPackageDao;
    private final CoinPackageDao coinPackageDao;
    private final VirtualGoodsGateway goodsGateway;
    private final WechatVirtualPayProperties properties;

    public VirtualPriceChange latest(String packageType, Long packageId) {
        return changeDao.selectLatest(packageType, packageId);
    }

    /** 将待生效报价改回当前价时撤销；正在执行的微信任务仍须查询收尾。 */
    @Transactional
    public void cancelChange(String packageType, Long packageId) {
        lockPackage(packageType, packageId);
        VirtualPriceChange previous = changeDao.selectLatest(packageType, packageId);
        if (previous == null || !isUnfinished(previous.getStatus())) {
            return;
        }
        if ("UPLOADING".equals(previous.getStatus()) || "PUBLISHING".equals(previous.getStatus())) {
            VirtualPriceChange marker = new VirtualPriceChange();
            marker.setPackageType(packageType);
            marker.setPackageId(packageId);
            marker.setOldProductId(previous.getOldProductId());
            marker.setNewProductId(newProductId(packageType, packageId));
            marker.setTargetPrice(previous.getTargetPrice());
            marker.setStatus("CANCELLED");
            changeDao.insert(marker);
        } else {
            previous.setStatus("CANCELLED");
            changeDao.updateById(previous);
        }
    }

    /** 保存新报价，已有待处理报价被替换；套餐现价始终不在此处修改。 */
    @Transactional
    public VirtualPriceChange requestChange(String packageType, Long packageId,
                                            String activeProductId, BigDecimal targetPrice) {
        return requestChange(packageType, packageId, activeProductId, targetPrice, false);
    }

    @Transactional
    public VirtualPriceChange requestChange(String packageType, Long packageId,
                                            String activeProductId, BigDecimal targetPrice,
                                            boolean enableAfterPublish) {
        if (!"vip".equals(packageType) && !"coin".equals(packageType)) {
            throw new BusinessException("不支持的商品类型");
        }
        if (packageId == null || packageId <= 0 || targetPrice == null
                || targetPrice.signum() <= 0 || targetPrice.scale() > 2) {
            throw new BusinessException("商品价格必须是大于 0 且最多两位小数的金额");
        }
        lockPackage(packageType, packageId);
        VirtualPriceChange previous = changeDao.selectLatest(packageType, packageId);
        if (previous != null && isUnfinished(previous.getStatus())) {
            if (previous.getTargetPrice().compareTo(targetPrice) == 0
                    && Boolean.TRUE.equals(previous.getEnableAfterPublish()) == enableAfterPublish) {
                return previous;
            }
            // 微信环境级任务不可中途打断，上传/发布中的旧任务先完成，再处理新报价。
            if ("QUEUED".equals(previous.getStatus()) || "WAIT_EFFECTIVE".equals(previous.getStatus())) {
                previous.setStatus("SUPERSEDED");
                changeDao.updateById(previous);
            }
        }
        VirtualPriceChange change = new VirtualPriceChange();
        change.setPackageType(packageType);
        change.setPackageId(packageId);
        change.setOldProductId(activeProductId);
        change.setNewProductId(newProductId(packageType, packageId));
        change.setTargetPrice(targetPrice);
        change.setEnableAfterPublish(enableAfterPublish);
        change.setStatus("QUEUED");
        changeDao.insert(change);
        return change;
    }

    /** 微信批量任务是环境级最新任务，因此一次只处理一项。 */
    @Transactional
    public void advanceOne() {
        if (!properties.isEnabled() || properties.getEnv() != 0) {
            return;
        }
        List<VirtualPriceChange> pending = changeDao.selectPending(1);
        if (pending.isEmpty()) {
            return;
        }
        VirtualPriceChange change = pending.get(0);
        try {
            switch (change.getStatus()) {
                case "QUEUED" -> upload(change);
                case "UPLOADING" -> checkUpload(change);
                case "PUBLISHING" -> checkPublish(change);
                case "WAIT_EFFECTIVE" -> activateIfReady(change);
                default -> { }
            }
        } catch (Exception ex) {
            log.warn("微信商品改价任务失败: id={}, productId={}", change.getId(), change.getNewProductId(), ex);
            if ("WAIT_EFFECTIVE".equals(change.getStatus())) {
                // 套餐价格与任务状态必须在同一事务提交；激活失败时整体回滚。
                throw ex instanceof RuntimeException runtime ? runtime : new IllegalStateException(ex);
            }
            if (("UPLOADING".equals(change.getStatus()) || "PUBLISHING".equals(change.getStatus()))
                    && ex.getMessage() != null && ex.getMessage().contains("结果未知")) {
                // 请求可能已被微信受理，下一轮查询同一商品任务，不立即重试上传/发布。
                return;
            }
            change.setStatus("FAILED");
            change.setLastError(StrUtil.maxLength(ex.getMessage(), 500));
            changeDao.updateById(change);
        }
    }

    private void upload(VirtualPriceChange change) {
        String name = packageName(change);
        if (StrUtil.isBlank(name)) {
            throw new BusinessException("套餐名称为空，无法上传微信商品");
        }
        String goodsName = name.codePointCount(0, name.length()) > 20
                ? name.substring(0, name.offsetByCodePoints(0, 20)) : name;
        String imageUrl = StrUtil.blankToDefault(properties.getGoodsImageUrl(), DEFAULT_GOODS_IMAGE);
        change.setStatus("UPLOADING");
        changeDao.updateById(change);
        goodsGateway.upload(change.getNewProductId(), goodsName,
                toFen(change.getTargetPrice()), name, imageUrl);
    }

    private void checkUpload(VirtualPriceChange change) {
        VirtualGoodsGateway.GoodsTaskSnapshot result = goodsGateway.queryUpload(change.getNewProductId());
        if (result.taskState() == VirtualGoodsGateway.TaskState.FAILED
                || result.itemState() == VirtualGoodsGateway.ItemState.FAILED) {
            throw new BusinessException("微信商品上传失败：" + result.errorMessage());
        }
        if (result.taskState() != VirtualGoodsGateway.TaskState.SUCCEEDED) {
            failIfTimedOut(change);
            return;
        }
        if (result.itemState() == VirtualGoodsGateway.ItemState.MISSING) {
            throw new BusinessException("微信上传任务已被其他商品任务覆盖");
        }
        if (!change.getNewProductId().equals(result.productId())
                || result.priceFen() == null || result.priceFen() != toFen(change.getTargetPrice())) {
            throw new BusinessException("微信上传商品的 ID 或价格与待生效报价不一致");
        }
        if (result.itemState() != VirtualGoodsGateway.ItemState.SUCCEEDED) {
            throw new BusinessException("微信商品上传未成功：" + result.errorMessage());
        }
        change.setStatus("PUBLISHING");
        changeDao.updateById(change);
        goodsGateway.publish(change.getNewProductId());
    }

    private void checkPublish(VirtualPriceChange change) {
        VirtualGoodsGateway.GoodsTaskSnapshot result = goodsGateway.queryPublish(change.getNewProductId());
        if (result.taskState() == VirtualGoodsGateway.TaskState.FAILED
                || result.itemState() == VirtualGoodsGateway.ItemState.FAILED) {
            throw new BusinessException("微信商品发布失败：" + result.errorMessage());
        }
        if (result.taskState() != VirtualGoodsGateway.TaskState.SUCCEEDED) {
            failIfTimedOut(change);
            return;
        }
        if (result.itemState() == VirtualGoodsGateway.ItemState.MISSING) {
            throw new BusinessException("微信发布任务已被其他商品任务覆盖");
        }
        if (!change.getNewProductId().equals(result.productId())
                || result.itemState() != VirtualGoodsGateway.ItemState.SUCCEEDED) {
            throw new BusinessException("微信发布任务不是当前待生效商品");
        }
        change.setPublishedAt(LocalDateTime.now());
        VirtualPriceChange latest = changeDao.selectLatest(change.getPackageType(), change.getPackageId());
        change.setStatus(latest != null && !change.getId().equals(latest.getId())
                ? "SUPERSEDED" : "WAIT_EFFECTIVE");
        changeDao.updateById(change);
    }

    private void activateIfReady(VirtualPriceChange change) {
        if (change.getPublishedAt() == null
                || LocalDateTime.now().isBefore(change.getPublishedAt().plus(EFFECTIVE_GRACE))) {
            return;
        }
        lockPackage(change.getPackageType(), change.getPackageId());
        VirtualPriceChange latest = changeDao.selectLatest(change.getPackageType(), change.getPackageId());
        if (latest == null || !change.getId().equals(latest.getId())
                || !"WAIT_EFFECTIVE".equals(latest.getStatus())) {
            return;
        }
        if ("vip".equals(change.getPackageType())) {
            VipPackage pkg = vipPackageDao.selectById(change.getPackageId());
            if (pkg == null || !java.util.Objects.equals(pkg.getWechatProductId(), change.getOldProductId())) {
                throw new BusinessException("会员套餐商品已变更，请重新提交报价");
            }
            pkg.setPrice(change.getTargetPrice());
            pkg.setWechatProductId(change.getNewProductId());
            if (Boolean.TRUE.equals(change.getEnableAfterPublish())) {
                pkg.setStatus("ENABLED");
            }
            vipPackageDao.updateById(pkg);
        } else {
            CoinPackage pkg = coinPackageDao.selectById(change.getPackageId());
            if (pkg == null || !java.util.Objects.equals(pkg.getWechatProductId(), change.getOldProductId())) {
                throw new BusinessException("千寻币套餐商品已变更，请重新提交报价");
            }
            pkg.setDiscountAmount(change.getTargetPrice());
            if (pkg.getAmount() == null || pkg.getAmount().compareTo(change.getTargetPrice()) < 0) {
                pkg.setAmount(change.getTargetPrice());
            }
            if (pkg.getOriginAmount() != null && pkg.getOriginAmount().compareTo(change.getTargetPrice()) < 0) {
                pkg.setOriginAmount(change.getTargetPrice());
            }
            pkg.setWechatProductId(change.getNewProductId());
            if (Boolean.TRUE.equals(change.getEnableAfterPublish())) {
                pkg.setStatus("ENABLED");
            }
            coinPackageDao.updateById(pkg);
        }
        change.setStatus("ACTIVE");
        change.setActiveAt(LocalDateTime.now());
        changeDao.updateById(change);
    }

    private String packageName(VirtualPriceChange change) {
        if ("vip".equals(change.getPackageType())) {
            VipPackage pkg = vipPackageDao.selectById(change.getPackageId());
            return pkg == null ? null : pkg.getPackageName();
        }
        CoinPackage pkg = coinPackageDao.selectById(change.getPackageId());
        return pkg == null ? null : pkg.getPackageName();
    }

    public String currentProductId(String type, Long id, String configuredId) {
        return StrUtil.blankToDefault(configuredId, type + "_" + id);
    }

    private boolean isUnfinished(String status) {
        return "QUEUED".equals(status) || "UPLOADING".equals(status)
                || "PUBLISHING".equals(status) || "WAIT_EFFECTIVE".equals(status);
    }

    private String newProductId(String type, Long packageId) {
        String prefix = ("vip".equals(type) ? "v" : "c") + Long.toString(packageId, 36) + "_";
        return prefix + UUID.randomUUID().toString().replace("-", "")
                .substring(0, Math.min(20 - prefix.length(), 15));
    }

    private int toFen(BigDecimal amount) {
        return amount.movePointRight(2).intValueExact();
    }

    private void lockPackage(String packageType, Long packageId) {
        if ("vip".equals(packageType)) {
            vipPackageDao.selectForUpdate(packageId);
        } else if ("coin".equals(packageType)) {
            coinPackageDao.selectForUpdate(packageId);
        }
    }

    private void failIfTimedOut(VirtualPriceChange change) {
        if (change.getUpdateTime() != null
                && LocalDateTime.now().isAfter(change.getUpdateTime().plus(TASK_TIMEOUT))) {
            throw new BusinessException("微信商品任务超过 30 分钟未完成，请人工核查");
        }
    }
}
