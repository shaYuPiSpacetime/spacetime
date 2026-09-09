package com.spacetime.common.dao.impl;
import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.core.conditions.update.LambdaUpdateWrapper;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.spacetime.common.dao.SensitiveWordDao;
import com.spacetime.common.entity.ContentSensitiveWord;
import com.spacetime.common.mapper.ContentSensitiveWordMapper;
import com.spacetime.common.interceptor.UserContextHolder;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Repository;
/** 主业务数据库的敏感词管理读写实现。 */
@Repository @RequiredArgsConstructor
public class SensitiveWordDaoImpl implements SensitiveWordDao {
    private final ContentSensitiveWordMapper mapper;
    @Override public Long lockRevision(){return mapper.lockRevision();}
    @Override public ContentSensitiveWord findCurrent(Long id){return mapper.findCurrent(id);}
    @Override public ContentSensitiveWord findDuplicate(String word,Long excludeId){return mapper.findDuplicate(word,excludeId);}
    @Override public ContentSensitiveWord findById(Long id){return mapper.selectById(id);}
    @Override public void insert(ContentSensitiveWord word){requireOne(mapper.insert(word));}
    @Override public void update(ContentSensitiveWord word){
        // Loaded entities carry old audit values; strictUpdateFill does not replace them.
        word.setUpdateTime(java.time.LocalDateTime.now());
        word.setUpdatedBy(operatorId());
        requireOne(mapper.updateById(word));
    }
    @Override public void delete(Long id){requireOne(mapper.deleteById(id));}
    @Override public void updateStatus(Long id,String status){
        // Explicit wrapper ensures remark/word/category fields cannot be overwritten by a status command.
        requireOne(mapper.update(null,new LambdaUpdateWrapper<ContentSensitiveWord>()
            .eq(ContentSensitiveWord::getId,id).set(ContentSensitiveWord::getStatus,status)
            .set(ContentSensitiveWord::getUpdateTime,java.time.LocalDateTime.now())
            .set(ContentSensitiveWord::getUpdatedBy,operatorId())));
    }
    @Override public void bumpRevision(){requireOne(mapper.bumpRevision(operatorId()));}
    @Override public Page<ContentSensitiveWord> page(int page,int size,String keyword,String categoryCode,String status){
        var query=new LambdaQueryWrapper<ContentSensitiveWord>();
        if(keyword!=null && !keyword.isEmpty()) {
            // Use explicit ! escape, avoiding dependence on the server NO_BACKSLASH_ESCAPES mode.
            String literal=keyword.replace("!","!!").replace("%","!%").replace("_","!_");
            query.apply("word LIKE {0} ESCAPE '!'", "%"+literal+"%");
        }
        query.eq(categoryCode!=null,ContentSensitiveWord::getCategoryCode,categoryCode)
             .eq(status!=null,ContentSensitiveWord::getStatus,status).orderByDesc(ContentSensitiveWord::getId);
        return mapper.selectPage(new Page<>(page,size),query);
    }
    private Long operatorId(){return UserContextHolder.get()==null?null:UserContextHolder.get().getId();}
    private void requireOne(int count){if(count!=1)throw new IllegalStateException("sensitive_word_write_conflict");}
}
