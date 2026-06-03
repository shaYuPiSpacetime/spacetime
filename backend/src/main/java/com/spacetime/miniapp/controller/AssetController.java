package com.spacetime.miniapp.controller;

import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.spacetime.common.dto.PageReq;
import com.spacetime.common.exception.BusinessException;
import com.spacetime.common.interceptor.UserContext;
import com.spacetime.common.interceptor.UserContextHolder;
import com.spacetime.common.result.R;
import com.spacetime.miniapp.dto.request.UnlockReq;
import com.spacetime.miniapp.dto.response.AssetSummaryVO;
import com.spacetime.miniapp.dto.response.UnlockRecordVO;
import com.spacetime.miniapp.dto.response.UnlockVO;
import com.spacetime.miniapp.service.AssetService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.web.bind.annotation.*;

/**
 * 小程序用户资产控制器
 */
@Slf4j
@RestController
@RequestMapping("/miniapp/asset")
@RequiredArgsConstructor
public class AssetController {

    /** 用户资产服务 */
    private final AssetService assetService;

    /**
     * 查询当前用户资产汇总
     *
     * @return 用户资产汇总信息（VIP状态、成家币余额、今日免费用量等）
     */
    @GetMapping("/summary")
    public R<AssetSummaryVO> getSummary() {
        return R.ok(assetService.getSummary(currentUserId()));
    }

    /**
     * 批量解锁用户（谁喜欢我/谁看过我/理想型/精选推荐）
     *
     * @param req 解锁请求（场景 + 目标用户ID列表）
     * @return 解锁结果（解锁人数、消耗成家币）
     */
    @PostMapping("/unlock")
    public R<UnlockVO> unlock(@Valid @RequestBody UnlockReq req) {
        Long userId = currentUserId();
        log.info("解锁操作: userId={}, scene={}, count={}", userId, req.getUnlockScene(),
                req.getTargetUserIds() != null ? req.getTargetUserIds().size() : 0);
        return R.ok(assetService.unlock(userId, req));
    }

    /**
     * 分页查询当前用户解锁记录
     *
     * @param page 页码，默认1
     * @param size 每页条数，默认10
     * @return 解锁记录分页列表
     */
    @GetMapping("/unlock-records")
    public R<Page<UnlockRecordVO>> getRecords(@RequestParam(defaultValue = "1") int page,
                                               @RequestParam(defaultValue = "10") int size) {
        PageReq req = new PageReq();
        req.setPage(page);
        req.setSize(size);
        return R.ok(assetService.getRecords(currentUserId(), req));
    }

    private Long currentUserId() {
        UserContext ctx = UserContextHolder.get();
        if (ctx == null) {
            throw new BusinessException(401, "未登录或登录已过期");
        }
        return ctx.getId();
    }
}
