package com.spacetime.common.provider;

import com.spacetime.miniapp.dto.response.SongOptionVO;

import java.util.List;

/** 歌曲搜索 Provider，后续可替换为真实音乐三方。 */
public interface SongSearchProvider {
    List<SongOptionVO> search(String keyword, int limit);
}
