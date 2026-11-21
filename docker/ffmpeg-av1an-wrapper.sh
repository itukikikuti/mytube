#!/bin/sh
# Av1an 0.6 は画質測定の ffmpeg に、ffmpeg 9 では入力オプションとして使えなくなった
# -thread_queue_size を渡して失敗するため、取り除いてから本物の ffmpeg を呼ぶ
skip=0
for arg; do
  shift
  if [ "$skip" = 1 ]; then skip=0; continue; fi
  if [ "$arg" = "-thread_queue_size" ]; then skip=1; continue; fi
  set -- "$@" "$arg"
done
exec /usr/bin/ffmpeg "$@"
