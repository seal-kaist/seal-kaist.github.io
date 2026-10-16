# ResidualQuant 터미널 영상 재생성

배포 대상은 `/projects/ResidualQuant-tmp/`입니다. 현재 영상은 BF16 batch 2와
ResidualQuant batch 8을 같은 RTX 5090에서 따로 실행하면서 실제 xterm 화면을
ffmpeg x11grab으로 녹화했습니다. 왼쪽 1/3에는 요청 2개, 오른쪽 2/3에는 요청
8개를 배치합니다. tokens/s와 처리량 배율 자막은 저장한 실제 토큰 시간에 따라
변합니다. 가운데 `4× BATCH`는 요청 수가 2에서 8로 늘어난다는 뜻입니다.

## 같은 원본 영상으로 다시 만들기 — GPU 불필요

저장소 루트에서 실행합니다. 원본 녹화, 모든 토큰의 시간·텍스트, 시작 시점,
글꼴 및 라이선스를 저장소에 포함했습니다. 외부 체크아웃이나 모델 다운로드가
필요하지 않습니다.

```bash
# Ubuntu/Debian: ffmpeg에 drawtext와 ass 필터가 필요합니다.
sudo apt-get install ffmpeg
python3 -m venv work/video-venv
work/video-venv/bin/pip install -r scripts/demo/requirements.txt
work/video-venv/bin/python scripts/demo/verify_bundle.py
work/video-venv/bin/python scripts/demo/join_terminal.py
```

결과는 `public/projects/residualquant/terminal-live-b2-b8-final-align`의
`.mp4`, `.webm`, `-poster.png`, `.json`입니다. 다른 출력 폴더도 가능합니다.

```bash
work/video-venv/bin/python scripts/demo/join_terminal.py --output work/video-export
```

FFmpeg 버전이나 인코더에 따라 파일의 바이트는 달라질 수 있습니다. 원본 화면,
1배속 시간축, 자막 계산과 배치는 동일하게 재생성합니다. 제작 환경은 Pillow
12.3.0, FFmpeg 6.1.1입니다. 글꼴은 `fonts/`에서 직접 로드합니다.

## GPU에서 새로 추론하고 녹화하기

아래는 새 측정입니다. 처리량은 하드웨어·환경에 따라 달라집니다. 기존 원본은
덮어쓰지 않고 `work/terminal-demo-new/`에 새 녹화를 저장합니다.

1. `https://github.com/heejunkim00/LoopTransformer`를 준비하고
   `65f48af8d1d31f1cc57bc3dc431c0331104345b9`로 체크아웃합니다.
   해당 저장소의 `uv sync --locked --python 3.11` 및 환경 설정 지침으로
   `.venv`를 구성합니다. 당시 lockfile도 `data/residualquant-terminal/runtime-uv.lock`에
   보존했습니다. 새 환경에서 CUDA 확장 빌드와 모델 다운로드가 필요할 수 있습니다.
2. xterm, Xvfb, x11-utils, x11-xserver-utils, fonts-dejavu-core, ffmpeg를 설치합니다.
3. `LOOPTRANSFORMER_RUNTIME`을 해당 체크아웃의 절대 경로로 설정합니다.

```bash
export LOOPTRANSFORMER_RUNTIME=/absolute/path/to/LoopTransformer
export RQ_VIDEO_TAKES="$PWD/work/terminal-demo-new"
export HF_HOME="$LOOPTRANSFORMER_RUNTIME/local-data/cache/huggingface"
export TOKENIZERS_PARALLELISM=false
export OMP_NUM_THREADS=4
"$LOOPTRANSFORMER_RUNTIME/.venv/bin/python" scripts/demo/record_terminal.py
work/video-venv/bin/python scripts/demo/join_terminal.py \
  --takes "$RQ_VIDEO_TAKES" --output work/new-video-export
```

GPU 0과 X display `:92`를 사용합니다. GPU가 비어 있는지 확인하고 잠금을 잡습니다.
드라이버의 EGL 충돌을 피하기 위해 Xvfb의 GLX는 끕니다. 녹화 환경이 바뀌면
xterm 글자 크기와 창 크기를 확인하십시오.

추론 조건: Ouro-1.4B revision `e3b1e0993b1231a51d6069a870476dda4162c00a`,
16,384 입력 / 512 출력 토큰, util 0.90, CUDA Graph FULL_DECODE_ONLY,
32토큰 warmup 1회, 실제 측정 1회입니다. BF16은 4096토큰 chunked prefill,
ResidualQuant는 INT2/2/2/4 G32, LS last-loop anchor, OptR-H 회전과 prefill
CPU offloading을 사용합니다. 설정과 회전 행렬은 `data/residualquant-terminal/configs/`에
포함했습니다. 모델 가중치는 포함하지 않으며 지정 revision에서 내려받습니다.

prefill 및 첫 출력은 decode 측정에서 제외됩니다. 실시간 터미널 출력 비용은
측정에 포함됩니다. 최종값은 BF16 35.5658139384 tokens/s, ResidualQuant
190.0293097261 tokens/s, 처리량 비율 5.3430327802배입니다.

## 파일 구성

- `join_terminal.py`: 원본 화면 합성, 실시간 자막, 최종 디자인.
- `live_terminal.py`: 실제 추론 및 ANSI 터미널 출력.
- `record_terminal.py`: Xvfb/xterm 실행과 실제 화면 녹화.
- `data/residualquant-terminal/b2-b8-16k/`: 양쪽 원본 MP4, 토큰 이벤트 JSON,
  녹화 오프셋, 당시 로그와 자막 자료.
- `manifest.json`: 파일별 SHA-256; `verify_bundle.py`로 검증.

원형 코드는 이 웹사이트 저장소의 `0943912` 커밋에서 복원했습니다. 추론·녹화
코드는 현재 런타임과 batch 8에 맞게 수정했습니다. 디자인 참고:
[Linear](https://linear.app/now/how-we-redesigned-the-linear-ui),
[Vercel Geist](https://vercel.com/geist/introduction).
