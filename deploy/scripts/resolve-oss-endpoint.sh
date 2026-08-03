#!/usr/bin/env bash

# 将历史 OSS 配置迁移到项目当前统一存储；未知 Bucket 保留显式配置。
normalize_oss_config() {
  case "${OSS_BUCKET_NAME:-}" in
    spacetime)
      OSS_BUCKET_NAME='shikongxiehou'
      OSS_ENDPOINT='https://oss-cn-shanghai.aliyuncs.com'
      ;;
    shikongxiehou)
      OSS_ENDPOINT='https://oss-cn-shanghai.aliyuncs.com'
      ;;
  esac

  export OSS_BUCKET_NAME OSS_ENDPOINT
}
