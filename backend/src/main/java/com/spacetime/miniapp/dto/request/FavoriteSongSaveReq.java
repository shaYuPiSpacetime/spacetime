package com.spacetime.miniapp.dto.request;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

/** 爱听歌曲保存请求。 */
@Data
public class FavoriteSongSaveReq {
    /** 三方歌曲 ID。 */
    @NotBlank(message = "歌曲ID不能为空")
    private String songId;
    /** 歌曲名称。 */
    @NotBlank(message = "歌曲名称不能为空")
    private String songName;
    /** 歌手名称。 */
    private String artistName;
    /** 歌曲封面 URL。 */
    private String coverUrl;
}
