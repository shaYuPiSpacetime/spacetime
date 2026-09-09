package com.spacetime.admin.service.impl;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.spacetime.admin.dto.request.SensitiveWordSaveReq;
import com.spacetime.admin.dto.response.*;
import com.spacetime.admin.service.SensitiveWordService;
import com.spacetime.common.dao.SensitiveWordDao;
import com.spacetime.common.entity.ContentSensitiveWord;
import com.spacetime.common.enums.*;
import com.spacetime.common.exception.BusinessException;
import com.spacetime.common.service.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.BeanUtils;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.util.*;
/** 全局版本锁保护精确唯一性；词条及版本原子提交，之后只请求异步刷新。 */
@Service @RequiredArgsConstructor @Slf4j
public class SensitiveWordServiceImpl implements SensitiveWordService {
    private final SensitiveWordDao dao;
    private final LocalSensitiveWordService local;
    private final AfterCommitExecutor afterCommit;
    @Override public Page<SensitiveWordVO> page(int page,int size,String keyword,String categoryCode,String status){
        if(page<1||size<1||size>100||(keyword!=null&&keyword.length()>256))throw parameter();
        categoryCode=categoryCode==null||trim(categoryCode).isEmpty()?null:categoryCode;
        status=status==null||trim(status).isEmpty()?null:status;
        if(categoryCode!=null)category(categoryCode);if(status!=null)status(status);
        Page<ContentSensitiveWord> result=dao.page(page,size,keyword,categoryCode,status);
        Page<SensitiveWordVO> response=new Page<>(result.getCurrent(),result.getSize(),result.getTotal());
        response.setRecords(result.getRecords().stream().map(this::vo).toList());return response;
    }
    @Override public List<SensitiveWordCategoryVO> categories(){return Arrays.stream(SensitiveWordCategory.values()).map(c->new SensitiveWordCategoryVO(c.name(),c.getDisplayName())).toList();}
    @Override public SensitiveWordVO detail(Long id){id(id);return vo(required(dao.findById(id)));}
    @Override @Transactional(rollbackFor=Exception.class)
    public Long create(SensitiveWordSaveReq req){
        ContentSensitiveWord row=validated(req,true);lock();duplicate(row.getWord(),null);dao.insert(row);changed();return row.getId();
    }
    @Override @Transactional(rollbackFor=Exception.class)
    public void update(Long id,SensitiveWordSaveReq req){
        id(id);ContentSensitiveWord values=validated(req,false);lock();ContentSensitiveWord row=required(dao.findCurrent(id));
        duplicate(values.getWord(),id);row.setWord(values.getWord());row.setCategoryCode(values.getCategoryCode());
        row.setStatus(values.getStatus());row.setRemark(values.getRemark());dao.update(row);changed();
    }
    @Override @Transactional(rollbackFor=Exception.class)
    public void changeStatus(Long id,String status){
        id(id);status(status);lock();ContentSensitiveWord row=required(dao.findCurrent(id));
        if(status.equals(row.getStatus()))return;dao.updateStatus(id,status);changed();
    }
    @Override @Transactional(rollbackFor=Exception.class)
    public void delete(Long id){id(id);lock();required(dao.findCurrent(id));dao.delete(id);changed();}
    private void changed(){
        dao.bumpRevision();
        afterCommit.execute(()->{try{local.requestRefresh();}catch(Exception e){log.warn("Sensitive word refresh submission skipped: {}",e.getClass().getSimpleName());}});
    }
    private void lock(){Long revision=dao.lockRevision();if(revision==null||revision<1)throw new BusinessException("词库刷新标记缺失");}
    private void duplicate(String word,Long id){if(dao.findDuplicate(word,id)!=null)throw new BusinessException("该敏感词已存在");}
    private ContentSensitiveWord required(ContentSensitiveWord row){if(row==null)throw new BusinessException(ResultCodeEnum.NOT_FOUND);return row;}
    private void id(Long id){if(id==null||id<1)throw parameter();}
    private void category(String value){try{SensitiveWordCategory.valueOf(value);}catch(Exception e){throw parameter();}}
    private void status(String value){try{SensitiveWordStatus.valueOf(value);}catch(Exception e){throw parameter();}}
    private BusinessException parameter(){return new BusinessException(ResultCodeEnum.PARAM_ERROR);}
    private ContentSensitiveWord validated(SensitiveWordSaveReq req,boolean create){
        if(req==null||req.getWord()==null)throw parameter();String word=trim(req.getWord());
        if(word.isEmpty()||word.length()>256||(req.getRemark()!=null&&req.getRemark().length()>500))throw parameter();
        category(req.getCategoryCode());String state=create&&req.getStatus()==null?"ENABLED":req.getStatus();status(state);
        var row=new ContentSensitiveWord();row.setWord(word);row.setCategoryCode(req.getCategoryCode());row.setStatus(state);row.setRemark(req.getRemark());return row;
    }
    private String trim(String text){int begin=0,end=text.length();while(begin<end&&space(text.charAt(begin)))begin++;while(end>begin&&space(text.charAt(end-1)))end--;return text.substring(begin,end);}
    private boolean space(char c){return(c>=9&&c<=13)||(c>=0x1c&&c<=0x20)||c==0x85||c==0xa0||c==0x1680||(c>=0x2000&&c<=0x200a)||c==0x2028||c==0x2029||c==0x202f||c==0x205f||c==0x3000;}
    private SensitiveWordVO vo(ContentSensitiveWord row){var vo=new SensitiveWordVO();BeanUtils.copyProperties(row,vo);vo.setCategoryName(SensitiveWordCategory.valueOf(row.getCategoryCode()).getDisplayName());return vo;}
}
