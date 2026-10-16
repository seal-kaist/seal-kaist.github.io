"""Actual xterm capture; adapted from recovered scripts/demo/record_terminal.py."""
import sys
import argparse
import fcntl
import json
import os
from pathlib import Path
import subprocess
import time

ROOT=Path(__file__).resolve().parents[2]
RUNTIME=Path(os.environ.get('LOOPTRANSFORMER_RUNTIME', str(ROOT.parent/'LoopTransformer')))
PYTHON=str(RUNTIME/'.venv/bin/python')
p=argparse.ArgumentParser()
p.add_argument('--methods',nargs='+',choices=['bf16','residual'],default=['bf16','residual'])
args=p.parse_args()
OUT=Path(os.environ.get('RQ_VIDEO_TAKES', str(ROOT/'work/terminal-demo-new'))).resolve()
OUT.mkdir(parents=True,exist_ok=True)
env=os.environ.copy()
env['DISPLAY']=':92'
env['RQ_VIDEO_TAKES']=str(OUT)
def used():
    return int(subprocess.check_output(['nvidia-smi','-i','0','--query-gpu=memory.used','--format=csv,noheader,nounits'],text=True).strip())
with open(str(OUT/'gpu0.lock'),'w') as lock:
    fcntl.flock(lock,fcntl.LOCK_EX|fcntl.LOCK_NB)
    assert used()<512,'GPU 0 is occupied'
    display=subprocess.Popen(['Xvfb',':92','-screen','0','1280x960x24','-nolisten','tcp','-extension','GLX'],stdout=open(OUT/'xvfb.log','w'),stderr=subprocess.STDOUT)
    try:
        time.sleep(.5)
        assert display.poll() is None,'Xvfb failed'
        subprocess.run(['xsetroot','-solid','#080c12'],env=env,check=True)
        for method,batch,width,columns in [('bf16',2,640,61),('residual',8,1280,125)]:
            if method not in args.methods:continue
            for suffix in ['ready','go','done','failed','progress']:
                (OUT/f'{method}.{suffix}').unlink(missing_ok=True)
            window=subprocess.Popen(['xterm','-fa','DejaVu Sans Mono','-fs','12',
                '-geometry',f'{columns}x46+0+0','-b','10','-bg','#080c12','-fg','#d9e2ed','-cr','#080c12',
                '-title',f'{method} batch {batch}','-e',PYTHON,'-u',
                str(ROOT/'scripts/demo/live_terminal.py'),'--method',method,'--gpu','0'],env=env,
                stdout=open(OUT/f'{method}-xterm.log','w'),stderr=subprocess.STDOUT)
            recording=None
            try:
                deadline=time.monotonic()+360
                while not (OUT/f'{method}.ready').exists():
                    if (OUT/f'{method}.failed').exists(): raise RuntimeError((OUT/f'{method}.failed').read_text())
                    if window.poll() is not None or time.monotonic()>deadline: raise RuntimeError(f'{method} not ready')
                    time.sleep(.2)
                (OUT/f'{method}-window.txt').write_text(subprocess.check_output(['xwininfo','-root','-tree'],env=env,text=True))
                progress=OUT/f'{method}.progress'
                recording=subprocess.Popen(['ffmpeg','-y','-loglevel','error','-f','x11grab','-draw_mouse','0',
                    '-framerate','24','-video_size',f'{width}x960','-i',':92.0+0,0','-an','-c:v','libx264',
                    '-preset','veryfast','-tune','zerolatency','-crf','18','-pix_fmt','yuv420p',
                    '-progress',str(progress),'-stats_period','0.02',str(OUT/f'{method}-screen.mp4')],
                    stdin=subprocess.PIPE,stdout=open(OUT/f'{method}-ffmpeg.log','w'),stderr=subprocess.STDOUT)
                deadline=time.monotonic()+15
                while True:
                    text=progress.read_text() if progress.exists() else ''
                    values=[line.split('=')[1] for line in text.splitlines() if line.startswith('out_time_us=')]
                    if values and int(values[-1])>=500000: break
                    if recording.poll() is not None or time.monotonic()>deadline: raise RuntimeError('ffmpeg capture not ready')
                    time.sleep(.01)
                offset=int(values[-1])/1e6
                (OUT/f'{method}.capture.json').write_text(json.dumps(dict(decode_video_offset_seconds=offset,
                    screen=f'{width}x960',terminal='xterm',capture='ffmpeg x11grab during actual inference',fps=24)))
                (OUT/f'{method}.go').write_text('start live inference')
                deadline=time.monotonic()+180
                while not (OUT/f'{method}.done').exists():
                    if (OUT/f'{method}.failed').exists(): raise RuntimeError((OUT/f'{method}.failed').read_text())
                    if window.poll() is not None or time.monotonic()>deadline: raise RuntimeError(f'{method} recording failed')
                    time.sleep(.1)
                time.sleep(2)
                recording.stdin.write(b'q\n');recording.stdin.flush();recording.wait(timeout=20)
                assert recording.returncode==0,'ffmpeg failed'
                print(method,'actual terminal recorded',flush=True)
            finally:
                if recording and recording.poll() is None:recording.terminate();recording.wait(timeout=15)
                if window.poll() is None:window.terminate()
                window.wait(timeout=15)
                for _ in range(100):
                    if used()<512:break
                    time.sleep(.1)
    finally:
        display.terminate();display.wait(timeout=10)
