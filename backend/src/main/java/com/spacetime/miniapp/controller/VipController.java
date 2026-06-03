package com.spacetime.miniapp.controller;

import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.spacetime.common.dto.PageReq;
import com.spacetime.common.exception.BusinessException;
import com.spacetime.common.interceptor.UserContext;
import com.spacetime.common.interceptor.UserContextHolder;
import com.spacetime.common.result.R;
import com.spacetime.miniapp.dto.response.VipBenefitVO;
import com.spacetime.miniapp.dto.response.VipOrderVO;
import com.spacetime.miniapp.dto.response.VipPackageVO;
import com.spacetime.miniapp.dto.response.VipStatusVO;
import com.spacetime.miniapp.service.VipService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * 小程序 VIP 控制器
 */
@RestController
@RequestMapping("/miniapp/vip")
@RequiredArgsConstructor
public class VipController {

    /** VIP 服务 */
    private final VipService vipService;

    /**
     * 查询已启用VIP套餐列表
     *
     * @return VIP套餐列表
     */
    @GetMapping("/packages")
    public R<List<VipPackageVO>> getPackages() {
        return R.ok(vipService.getPackages());
    }

    /**
     * 查询已启用VIP权益列表
     *
     * @return VIP权益列表
     */
    @GetMapping("/benefits")
    public R<List<VipBenefitVO>> getBenefits() {
        return R.ok(vipService.getBenefits());
    }

    /**
     * 查询当前用户VIP状态
     *
     * @return 用户VIP状态信息（VIP状态、到期时间等）
     */
    @GetMapping("/status")
    public R<VipStatusVO> getStatus() {
        return R.ok(vipService.getStatus(currentUserId()));
    }

    /**
     * 分页查询当前用户VIP订单记录
     *
     * @param page 页码，默认1
     * @param size 每页条数，默认10
     * @return VIP订单分页列表
     */
    @GetMapping("/orders")
    public R<Page<VipOrderVO>> getOrders(@RequestParam(defaultValue = "1") int page,
                                          @RequestParam(defaultValue = "10") int size) {
        PageReq req = new PageReq();
        req.setPage(page);
        req.setSize(size);
        return R.ok(vipService.getOrders(currentUserId(), req));
    }

    private Long currentUserId() {
        UserContext ctx = UserContextHolder.get();
        if (ctx == null) {
            throw new BusinessException(401, "未登录或登录已过期");
        }
        return ctx.getId();
    }
}
