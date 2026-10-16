"""Join real xterm takes at 1x; adapted from historical join_terminal_takes.py."""
import argparse
import tempfile
import bisect
import json
import math
from pathlib import Path
import subprocess

ROOT=Path(__file__).resolve().parents[2]
p=argparse.ArgumentParser(description=__doc__)
p.add_argument('--takes',type=Path,default=ROOT/'data/residualquant-terminal/b2-b8-16k')
p.add_argument('--output',type=Path,default=ROOT/'public/projects/residualquant')
args=p.parse_args()
DATA=args.takes.resolve()
OUT=args.output.resolve()
OUT.mkdir(parents=True,exist_ok=True)
_workspace=tempfile.TemporaryDirectory(prefix='rq-video-')
WORK=Path(_workspace.name)
base=OUT/'terminal-live-b2-b8-final-align'
rows=[json.loads((DATA/f'{m}.json').read_text()) for m in ['bf16','residual']]
assert [r['batch'] for r in rows]==[2,8]
assert rows[0]['prompt_sha256']==rows[1]['prompt_sha256'][:2]
assert rows[0]['gpu_uuid']==rows[1]['gpu_uuid']
assert all(r['context_tokens']==16384 and r['output_tokens']==512 and r['captured_cuda_graph_count']>0 for r in rows)
duration=max(r['seconds'] for r in rows)+2
inputs=[]; filters=[]
for i,r in enumerate(rows):
    inputs+=['-i',str(DATA/f'{r["method"]}-screen.mp4')]
    offset=json.loads((DATA/f'{r["method"]}.capture.json').read_text())['decode_video_offset_seconds']
    filters.append(f'[{i}:v]trim=start={offset},setpts=PTS-STARTPTS,crop=iw:930:0:30,pad=iw:950:0:10:color=0x080c12,tpad=stop_mode=clone:stop_duration={duration},trim=duration={duration},setsar=1[v{i}]')
# Remove only the redundant top title/setup line; retain every request and live
# metric pixel. Method labels are supplied by the editorial captions below.
filters.append('[v0][v1]hstack=inputs=2,pad=1920:1240:0:0:color=0x080c12,drawbox=x=638:y=0:w=3:h=950:color=0x26313f:t=fill,drawbox=x=36:y=950:w=1848:h=1:color=0x26313f:t=fill[canvas]')
bold=str(ROOT/'scripts/demo/fonts/DejaVuSans-Bold.ttf')
regular=str(ROOT/'scripts/demo/fonts/DejaVuSans.ttf')
ratio=rows[1]['tokens_per_second']/rows[0]['tokens_per_second']
subtitles=[]
def title(text,center,y,size,color,font=bold):
    path=WORK/f'subtitle-{len(subtitles)}.txt';path.write_text(text)
    subtitles.append(f'drawtext=fontfile={font}:textfile={path}:x={center}-text_w/2:y={y}:fontsize={size}:fontcolor={color}')
for i,r in enumerate(rows):
    center=320 if i==0 else 1280
    color='0xe1e8f0' if i==0 else '0x65e7b4'
    title('vLLM · BF16' if i==0 else 'ResidualQuant',center,978,40,color)
    title(f'BATCH {r["batch"]}',center,1042,42,color)
# Editorial type: Geist Medium multiplier with a restrained caption.
geist=str(ROOT/'scripts/demo/fonts/Geist-Light.ttf')
geist_medium=str(ROOT/'scripts/demo/fonts/Geist-Medium.ttf')
from PIL import ImageFont
# Center the entire mixed-size text group over the arrow's actual midpoint.
multiplier_size=64
multiplier_font=ImageFont.truetype(geist_medium,multiplier_size)
label_font=ImageFont.truetype(geist_medium,26)
multiplier_width=multiplier_font.getlength('4×')
label_width=label_font.getlength('BATCH')
text_gap=18
arrow_start,arrow_end=520,1108
arrow_center=(arrow_start+arrow_end)/2
group_left=arrow_center-(multiplier_width+text_gap+label_width)/2
multiplier_y=990
# drawtext anchors the top of the full text ink; match the multiplication sign's
# own visible center, rather than the full numeral's center or font baseline.
full_box=multiplier_font.getbbox('4×')
times_box=multiplier_font.getbbox('×')
label_box=label_font.getbbox('BATCH')
times_center_y=multiplier_y+(times_box[1]+times_box[3])/2-full_box[1]
label_y=times_center_y-(label_box[3]-label_box[1])/2-2.5
# 2.5px ink correction measured from the encoded frame, including antialiasing.
title('4×',group_left+multiplier_width/2,multiplier_y,multiplier_size,'0x86f2c4',geist_medium)
title('BATCH',group_left+multiplier_width+text_gap+label_width/2,label_y,26,'0xc1f7df',geist_medium)
title('16,384 INPUT TOKENS  /  512 OUTPUT TOKENS PER REQUEST',960,1210,16,'0x98a8bb',regular)

# The large comparison and small tokens/s captions follow the measured token
# events on the same 1x timeline as the captured terminal screens.
times=[[e['seconds'] for e in r['events']] for r in rows]
def live_rate(method, second):
    r=rows[method]
    e=r['events'][max(0,bisect.bisect_right(times[method],min(second,r['seconds']))-1)]
    return sum(s['tokens']-1 for s in e['requests'])/e['seconds'] if e['seconds']>0 else 0.
def stamp(second):
    cs=round(second*100)
    return f'{cs//360000}:{cs//6000%60:02d}:{cs//100%60:02d}.{cs%100:02d}'
ass=['[Script Info]','ScriptType: v4.00+','PlayResX: 1920','PlayResY: 1240','ScaledBorderAndShadow: yes','',
    '[V4+ Styles]',
    'Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding',
    'Style: BF16,DejaVu Sans,24,&H00F0E8E1,&H00F0E8E1,&H00000000,&H00000000,0,0,0,0,100,100,0,0,1,0,0,2,0,0,0,1',
    'Style: RQ,DejaVu Sans,24,&H00B4E765,&H00B4E765,&H00000000,&H00000000,0,0,0,0,100,100,0,0,1,0,0,2,0,0,0,1','',
    '[Events]','Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text']
# Direct BATCH 2 -> BATCH 8 arrow, with 4x BATCH above its center.
ass.append(rf'Dialogue: 0,0:00:00.00,{stamp(duration)},RQ,,0,0,0,,{{\an7\pos(0,0)\p1\bord0\shad0\1c&H9BD677&}}m 520 1056 l 1094 1056 l 1094 1049 l 1108 1058 l 1094 1067 l 1094 1060 l 520 1060')
caption_samples=[]
for frame in range(math.ceil(duration*24)):
    second=frame/24; end=min((frame+1)/24,duration)
    rates=[live_rate(i,second) for i in range(2)]
    relative=rates[1]/rates[0] if rates[0] else 0.
    for i,(center,style) in enumerate([(320,'BF16'),(1280,'RQ')]):
        multiplier='1.00×' if i==0 else (f'{relative:.2f}×' if rates[0] else '—')
        perf=rf'{{\pos({center},1146)\b1\fs31.2}}THROUGHPUT {{\fs60}}{multiplier}'
        rate=rf'{{\pos({center},1182)\b0\fs28.8}}{rates[i]:.2f} tokens/s'
        for text in [perf,rate]:
            ass.append(f'Dialogue: 0,{stamp(second)},{stamp(end)},{style},,0,0,0,,{text}')
    caption_samples.append(dict(seconds=second,bf16_tokens_per_second=rates[0],residual_tokens_per_second=rates[1],throughput_ratio=relative))
ass_path=OUT/'live-captions.ass'
ass_path.write_text('\n'.join(ass)+'\n')
(OUT/'live-caption-samples.json').write_text(json.dumps(caption_samples,indent=2)+'\n')
filters.append('[canvas]'+','.join(subtitles)+f',ass={ass_path}:fontsdir={ROOT / "scripts/demo/fonts"}[out]')
subprocess.run(['ffmpeg','-y','-loglevel','error',*inputs,'-filter_complex',';'.join(filters),'-map','[out]','-an','-c:v','libx264','-preset','fast','-crf','19','-pix_fmt','yuv420p','-movflags','+faststart',str(base)+'.mp4'],check=True)
subprocess.run(['ffmpeg','-y','-loglevel','error','-i',str(base)+'.mp4','-c:v','libvpx-vp9','-b:v','0','-crf','31','-deadline','good','-cpu-used','4','-row-mt','1','-an',str(base)+'.webm'],check=True)
for name,second in [('-poster.png',6),('-final.png',duration-1)]:
    subprocess.run(['ffmpeg','-y','-loglevel','error','-ss',str(second),'-i',str(base)+'.mp4','-frames:v','1',str(base)+name],check=True)
summary=dict(model=rows[0]['model'],gpu=rows[0]['gpu'],gpu_uuid=rows[0]['gpu_uuid'],
    context_tokens_per_request=16384,output_tokens_per_request=512,
    capture='Actual xterm windows captured with ffmpeg x11grab during fresh inference. No token-event replay or synthetic terminal rendering.',
    layout='Left 1/3 BF16 batch 2 vertically; right 2/3 ResidualQuant batch 8 in 2 columns x 4 rows',
    playback='Separate runs on same GPU joined at 1x; aligned at decode start; completed take freezes at end',
    captions='Original 1240px style: 40px method, 42px batch, 26/50px throughput, 24px live tokens/s; BATCH 2 to BATCH 8 horizontal arrow; 64px Geist Medium 4x with multiplication-sign ink center aligned to 26px BATCH ink center; caption centered over arrow x520..1108; arrow aligned at y1058; references: Linear UI redesign and Vercel Geist; live values computed from measured token timestamps',
    duration_seconds=duration,throughput_ratio=ratio,trials_per_method=1,
    methods=[{k:r[k] for k in ['method','batch','seconds','tokens_per_second','config','captured_cuda_graph_count','cuda_graph','prompt_sha256','runtime_git','script_sha256','timing_scope','vllm','torch']} for r in rows])
Path(str(base)+'.json').write_text(json.dumps(summary,indent=2)+'\n')
print(json.dumps({k:summary[k] for k in ['throughput_ratio','duration_seconds','capture']}),flush=True)
