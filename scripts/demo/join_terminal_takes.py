"""Join actual screen recordings at 1x speed; freeze a completed take at its end."""
import json, subprocess
from pathlib import Path
root=Path(__file__).resolve().parents[2]
data=root/'work/terminal-live-16k-512'
public=root/'public/projects/residualquant'
base=public/'terminal-live-16k-b2-b4'
rows=[json.loads((data/f'{m}.json').read_text()) for m in ['bf16','residual']]
assert [r['batch'] for r in rows]==[2,4]
assert rows[0]['prompt_sha256']==rows[1]['prompt_sha256'][:2]
assert all(r['context_tokens']==16384 and r['output_tokens_per_request']==512 for r in rows)
duration=max(r['seconds'] for r in rows)+2
inputs=[]; filters=[]
for i,r in enumerate(rows):
    method=r['method']; inputs+=['-i',str(data/f'{method}-screen.mp4')]
    offset=json.loads((data/f'{method}.capture.json').read_text())['decode_video_offset_seconds']
    filters.append(f'[{i}:v]trim=start={offset},setpts=PTS-STARTPTS,tpad=stop_mode=clone:stop_duration={duration},trim=duration={duration},setsar=1[v{i}]')
# Keep actual terminal pixels and place editorial subtitles below them.
# The crop removes only the unused bottom margin, not generated text.
filters.extend(['[v0]crop=960:950:0:0[left]', '[v1]crop=960:950:0:0[right]', '[left][right]hstack=inputs=2,pad=1920:1280:0:0:color=0x080c12,drawbox=x=958:y=0:w=4:h=ih:color=0x26313f:t=fill,drawbox=x=36:y=950:w=1848:h=1:color=0x26313f:t=fill[canvas]'])
bold='/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf'
italic='/usr/share/fonts/truetype/freefont/FreeSansBoldOblique.ttf'
regular='/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf'
ratio=rows[1]['tokens_per_second']/rows[0]['tokens_per_second']
subtitles=[]
def title(text,center,y,size,color,font=bold):
    # Text files avoid filter-grammar escaping for subtitles.
    path=data/f'subtitle-{len(subtitles)}.txt'
    path.write_text(text)
    subtitles.append(f"drawtext=fontfile={font}:textfile={path}:x={center}-text_w/2:y={y}:fontsize={size}:fontcolor={color}")
for i,r in enumerate(rows):
    center=480+i*960
    color='0xe1e8f0' if i==0 else '0x65e7b4'
    title('vLLM · BF16' if i==0 else 'ResidualQuant',center,983,40,color)
    title(f"{r['tokens_per_second']:.2f} TOKENS/S",center,1046,82,color,italic)
    title('Baseline · Batch 2' if i==0 else f'{ratio:.2f}× throughput · Batch 4',center,1148,34,color)
    title('2 concurrent requests' if i==0 else '4 concurrent requests',center,1200,25,'0x98a8bb',regular)
title('MEASURED DECODE THROUGHPUT  ·  16k input / 512 output per request  ·  1× playback',960,1250,19,'0x98a8bb',regular)
filters.append('[canvas]'+','.join(subtitles)+'[out]')
subprocess.run(['ffmpeg','-y','-loglevel','error',*inputs,'-filter_complex',';'.join(filters),'-map','[out]','-an','-c:v','libx264','-preset','fast','-crf','20','-pix_fmt','yuv420p','-movflags','+faststart',str(base)+'.mp4'],check=True)
subprocess.run(['ffmpeg','-y','-loglevel','error','-i',str(base)+'.mp4','-c:v','libvpx-vp9','-b:v','0','-crf','32','-row-mt','1','-an',str(base)+'.webm'],check=True)
subprocess.run(['ffmpeg','-y','-loglevel','error','-ss','6','-i',str(base)+'.mp4','-frames:v','1',str(base)+'-poster.png'],check=True)
summary=dict(model=rows[0]['model'],gpu=rows[0]['gpu'],vllm=rows[0]['vllm'],context_tokens_per_request=16384,output_tokens_per_request=512,gpu_memory_utilization=.9,cuda_graph='FULL_DECODE_ONLY',capture='Actual xterm windows captured with ffmpeg x11grab during two separate GPU runs. Videos joined at 1x; completed pane remains on its final screen. Editorial method and measured-throughput subtitles added below the terminal pixels.',comparison='BF16 batch 2 versus ResidualQuant batch 4; aggregate decode throughput, not an equal-batch comparison',timing_scope=rows[0]['timing_scope'],trials_per_method=1,methods=[{k:r[k] for k in ['method','batch','seconds','tokens_per_second','prefill_workspace_bytes','native_prefill_chunk_tokens','prefill_policy','prompt_sha256']} for r in rows],throughput_ratio=rows[1]['tokens_per_second']/rows[0]['tokens_per_second'])
Path(str(base)+'.json').write_text(json.dumps(summary,indent=2)+'\n')
print(json.dumps(summary,indent=2))
