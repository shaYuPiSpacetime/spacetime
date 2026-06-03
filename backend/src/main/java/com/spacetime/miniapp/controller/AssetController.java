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
import org.springframework.web.bind.annotation.*;

/**
 * 小程序用户资产控制器
 */
@RestController
@RequestMapping("/miniapp/asset")
@RequiredArgsConstructor
public class AssetController {
    private final AssetService assetService;

    /** 用户资产汇总 */
    @GetMapping("/summary")
    public R<AssetSummaryVO> getSummary() {
        return R.ok(assetService.getSummary(currentUserId()));
    }

    /** 批量解锁 */
    @PostMapping("/unlock")
    public R<UnlockVO> unlock(@Valid @RequestBody UnlockReq req) {
        return R.ok(assetService.unlock(currentUserId(), req));
    }

    /** 解锁记录 */
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
