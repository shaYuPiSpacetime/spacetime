# 推荐默认城市邻接数据

- 来源：[阿里云 DataV GeoAtlas](https://datav.aliyun.com/portal/school/atlas/area_selector)，使用 `https://geo.datav.aliyun.com/areas_v3/bound/` 全国与省级公开行政区划 GeoJSON。
- 生成时间：2026-10-07；更新命令：`node scripts/generate-neighbor-city-map.mjs`。
- 规则：两个城市行政边界存在共同线段才建立双向邻接；坐标统一到小数四位（约十米）兼容省际边界导出舍入差异。不把仅接触一点、同省全部城市或用户 GPS 距离当作邻接。邻接内部按城市中心距离排序。
- 使用：推荐精确目标城市不足时才补邻接城市；不放宽年龄和有效高级条件；理想型不扩城。
- 运营覆盖：`prd08.recommend.neighbor-city-map` 中指定城市的数组覆盖默认邻接；显式空数组关闭该城市扩展，空对象使用默认数据。
- 原始边界不进入运行包，不展示地图；运行时仅携带城市 code 到相邻 code 的关系表。行政区划变化时重新生成并审核发布。
