"""Serialize both GPU runs under the shared advisory GPU lock."""
import fcntl, os, subprocess, sys
from pathlib import Path
root = Path(__file__).resolve().parents[2]
runtime = Path('/root/projects/LoopTransformer-vllm')
out = root / 'work/terminal-demo-16k-512'
out.mkdir(parents=True, exist_ok=True)
env = os.environ.copy()
env.update(PYTHONDONTWRITEBYTECODE='1', PYTHONPATH=f'{runtime}/src:{runtime}/plugins/loop_vllm/src:{runtime}/scripts', HF_HOME=str(out/'cache/hf'), HF_HUB_CACHE=str(runtime/'local-data/cache/huggingface/hub'), HF_MODULES_CACHE=str(out/'cache/modules'), HF_HUB_OFFLINE='1', VLLM_CACHE_ROOT=str(out/'cache/vllm'), TRITON_CACHE_DIR=str(out/'cache/triton'), TORCHINDUCTOR_CACHE_DIR=str(out/'cache/inductor'), TORCH_EXTENSIONS_DIR=str(out/'cache/extensions'), CUDA_VISIBLE_DEVICES='0', OMP_NUM_THREADS='4', CUDA_HOME=str(runtime/'local-data/toolkit/cuda-12.8'))
with open(runtime/'local-data/gpu-locks/gpu-0.lock', 'r') as lock:
    fcntl.flock(lock, fcntl.LOCK_EX | fcntl.LOCK_NB)
    used = int(subprocess.check_output(['nvidia-smi','--query-gpu=memory.used','--format=csv,noheader,nounits'], text=True).strip())
    if used > 512:
        raise RuntimeError(f'GPU is occupied ({used} MiB); recording was not started')
    for method in ['bf16','residual']:
        with open(out/f'{method}.log','w') as log:
            subprocess.run([str(runtime/'.venv/bin/python'),'-u',str(root/'scripts/demo/capture_decode.py'),'--method',method,'--output',str(out)], env=env, stdout=log, stderr=subprocess.STDOUT, check=True)
        print(f'{method} complete', flush=True)
