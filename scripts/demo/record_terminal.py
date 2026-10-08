"""Capture actual xterm pixels while each GPU batch runs, then join the takes."""
import fcntl, json, os, signal, subprocess, time
from pathlib import Path
root=Path(__file__).resolve().parents[2]
runtime=Path('/root/projects/LoopTransformer-vllm')
out=root/'work/terminal-live-16k-512'; out.mkdir(parents=True,exist_ok=True)
env=os.environ.copy()
cache=root/'work/terminal-demo-16k-512/cache'
env.update(PYTHONDONTWRITEBYTECODE='1',PYTHONPATH=f'{runtime}/src:{runtime}/plugins/loop_vllm/src:{runtime}/scripts',HF_HOME=str(cache/'hf'),HF_HUB_CACHE=str(runtime/'local-data/cache/huggingface/hub'),HF_MODULES_CACHE=str(cache/'modules'),HF_HUB_OFFLINE='1',VLLM_CACHE_ROOT=str(cache/'vllm'),TRITON_CACHE_DIR=str(cache/'triton'),TORCHINDUCTOR_CACHE_DIR=str(cache/'inductor'),TORCH_EXTENSIONS_DIR=str(cache/'extensions'),CUDA_VISIBLE_DEVICES='0',OMP_NUM_THREADS='4',CUDA_HOME=str(runtime/'local-data/toolkit/cuda-12.8'),DISPLAY=':91')
with open(runtime/'local-data/gpu-locks/gpu-0.lock','r') as lock:
    fcntl.flock(lock,fcntl.LOCK_EX|fcntl.LOCK_NB)
    used=int(subprocess.check_output(['nvidia-smi','--query-gpu=memory.used','--format=csv,noheader,nounits'],text=True).strip())
    if used>512: raise RuntimeError(f'GPU occupied: {used} MiB')
    display=subprocess.Popen(['Xvfb',':91','-screen','0','960x1080x24','-nolisten','tcp'],stdout=open(out/'xvfb.log','w'),stderr=subprocess.STDOUT)
    try:
        time.sleep(.5)
        if display.poll() is not None: raise RuntimeError('Xvfb failed')
        subprocess.run(['xsetroot','-solid','#080c12'],env=env,check=True)
        for method,batch in [('bf16',2),('residual',4)]:
            for suffix in ['ready','go','done','failed']: (out/f'{method}.{suffix}').unlink(missing_ok=True)
            window=subprocess.Popen(['xterm','-fa','DejaVu Sans Mono','-fs','13','-geometry','94x50+0+0','-b','12','-bg','#080c12','-fg','#d9e2ed','-cr','#080c12','-title',f'{method} B{batch}','-e',str(runtime/'.venv/bin/python'),'-u',str(root/'scripts/demo/live_decode.py'),'--method',method,'--batch',str(batch),'--output',str(out)],env=env,stdout=open(out/f'{method}-xterm.log','w'),stderr=subprocess.STDOUT)
            recording=None
            try:
                deadline=time.monotonic()+300
                while not (out/f'{method}.ready').exists():
                    if (out/f'{method}.failed').exists(): raise RuntimeError((out/f'{method}.failed').read_text())
                    if window.poll() is not None or time.monotonic()>deadline: raise RuntimeError(f'{method} did not become ready')
                    time.sleep(.2)
                progress=out/f'{method}.progress'; progress.unlink(missing_ok=True)
                recording=subprocess.Popen(['ffmpeg','-y','-loglevel','error','-f','x11grab','-draw_mouse','0','-framerate','20','-video_size','960x1080','-i',':91.0+0,0','-an','-c:v','libx264','-preset','veryfast','-tune','zerolatency','-crf','20','-pix_fmt','yuv420p','-progress',str(progress),'-stats_period','0.1',str(out/f'{method}-screen.mp4')],stdin=subprocess.PIPE,stdout=open(out/f'{method}-ffmpeg.log','w'),stderr=subprocess.STDOUT)
                while not progress.exists() or 'frame=' not in progress.read_text():
                    if recording.poll() is not None: raise RuntimeError('Screen capture failed')
                    time.sleep(.02)
                value=[line.split('=')[1] for line in progress.read_text().splitlines() if line.startswith('out_time_us=')]
                offset=int(value[-1])/1e6 if value else 0
                (out/f'{method}.capture.json').write_text(json.dumps({'decode_video_offset_seconds':offset,'screen':'960x1080','terminal':'xterm','capture':'ffmpeg x11grab','fps':20}))
                (out/f'{method}.go').write_text('start decode')
                deadline=time.monotonic()+180
                while not (out/f'{method}.done').exists():
                    if (out/f'{method}.failed').exists(): raise RuntimeError((out/f'{method}.failed').read_text())
                    if window.poll() is not None or time.monotonic()>deadline: raise RuntimeError(f'{method} recording failed')
                    time.sleep(.1)
                time.sleep(2)
                recording.stdin.write(b'q\n'); recording.stdin.flush(); recording.wait(timeout=15)
                if recording.returncode: raise RuntimeError('Screen capture encoding failed')
                print(method, 'B'+str(batch), 'recorded', flush=True)
            finally:
                if recording and recording.poll() is None:
                    recording.terminate(); recording.wait(timeout=15)
                if window.poll() is None: window.terminate()
                window.wait(timeout=15)
                # Wait for the child GPU process to release allocations.
                for _ in range(100):
                    used=int(subprocess.check_output(['nvidia-smi','--query-gpu=memory.used','--format=csv,noheader,nounits'],text=True).strip())
                    if used<512: break
                    time.sleep(.1)
    finally:
        display.terminate(); display.wait(timeout=10)
