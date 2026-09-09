package com.spacetime.admin.service;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.spacetime.admin.dto.request.SensitiveWordSaveReq;
import com.spacetime.admin.dto.response.*;
import java.util.List;
/** 后台敏感词管理服务。 */
public interface SensitiveWordService {
    /** 稳定分页查询。 */ Page<SensitiveWordVO> page(int page,int size,String keyword,String categoryCode,String status);
    /** 固定十八类。 */ List<SensitiveWordCategoryVO> categories();
    /** 查看词条。 */ SensitiveWordVO detail(Long id);
    /** 新增词条。 */ Long create(SensitiveWordSaveReq req);
    /** 完整编辑，最后保存者生效。 */ void update(Long id,SensitiveWordSaveReq req);
    /** 只变更状态。 */ void changeStatus(Long id,String status);
    /** 逻辑删除。 */ void delete(Long id);
}
