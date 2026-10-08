"""Render captured token events at their actual elapsed times (1x playback)."""
import bisect, json, math, subprocess, textwrap
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont
root = Path(__file__).resolve().parents[2]
data = root / 'work/terminal-demo-16k-512'
rows = [json.loads((data/f'{m}.json').read_text()) for m in ['bf16','residual']]
assert rows[0]['prompt_sha256'] == rows[1]['prompt_sha256']
assert all(r['context_tokens']==16384 and r['output_tokens']==512 and r.get('cuda_graph')=='FULL_DECODE_ONLY' and r['gpu_memory_utilization']==.90 for r in rows)
out = root / 'public/projects/residualquant'
out.mkdir(parents=True, exist_ok=True)
W,H,FPS = 1600,900,24
font_path = '/usr/share/fonts/truetype/dejavu/DejaVuSansMono.ttf'
def font(n): return ImageFont.truetype(font_path,n)
fonts = {n:font(n) for n in [16,18,20,22,26,32,42]}
colors=['#b9c9dd','#59d8c3']
times = [[e['seconds'] for e in r['events']] for r in rows]
duration = max(r['seconds'] for r in rows)+4
ratio = rows[0]['seconds']/rows[1]['seconds']
def frame(t):
    im = Image.new('RGB',(W,H),'#0b111b'); d=ImageDraw.Draw(im)
    d.text((60,42),'ResidualQuant | Decode in real time',font=fonts[32],fill='#f3f7fc')
    d.text((60,100),'Ouro-1.4B / RTX 5090 / 16,384 input tokens / 512 output tokens',font=fonts[20],fill='#a5b4c7')
    for j,r in enumerate(rows):
        x=60+j*760; y=165; c=colors[j]
        d.rounded_rectangle((x,y,x+720,770),radius=18,fill='#111c2b',outline='#2b3b50',width=2)
        for k,col in enumerate(['#ed6a64','#eac05c','#63c889']): d.ellipse((x+22+k*23,y+22,x+34+k*23,y+34),fill=col)
        label = 'vLLM / BF16' if j==0 else 'ResidualQuant / INT2 + INT4'
        d.text((x+25,y+66),label,font=fonts[26],fill=c)
        d.text((x+25,y+115),f'$ python capture_decode.py --method {r["method"]}',font=fonts[18],fill='#91a5bf')
        index=max(0,bisect.bisect_right(times[j],t)-1); event=r['events'][index]
        elapsed=min(t,r['seconds']); count=event['tokens']; done=t>=r['seconds']
        d.text((x+25,y+166),f'{count:3d} / 512 tokens',font=fonts[32],fill='#f3f7fc')
        d.rounded_rectangle((x+25,y+218,x+695,y+232),radius=7,fill='#273548')
        d.rounded_rectangle((x+25,y+218,x+25+670*count/512,y+232),radius=7,fill=c)
        rate=(count-1)/elapsed if elapsed>0 else 0
        d.text((x+25,y+258),f'{elapsed:6.2f} s     {rate:6.2f} tokens/s',font=fonts[22],fill=c)
        d.text((x+25,y+308),'GENERATED OUTPUT',font=fonts[16],fill='#6f849f')
        # The output shown is taken directly from the captured request.
        lines=[]
        for line in event['text'].replace('\t','  ').splitlines():
            lines.extend(textwrap.wrap(line,width=54) or [''])
        for k,line in enumerate(lines[-7:]):
            d.text((x+25,y+342+k*27),line,font=fonts[18],fill='#cfdae8')
        d.text((x+25,y+558),'COMPLETE' if done else 'DECODING ...',font=fonts[20],fill=c)
    footer='Batch 1 | CUDA Graph decode | Prefill excluded | Recorded separately; aligned at first token'
    d.text((60,798),footer,font=fonts[16],fill='#90a1b7')
    note=f'Measured decode speed: {ratio:.2f}x BF16' if ratio>=1 else f'Measured decode speed: {ratio:.2f}x BF16 (this configuration)'
    d.text((60,840),note if t>=max(r['seconds'] for r in rows) else '1x playback / actual token timestamps / INT2 G16 residuals + INT4 G32 anchor',font=fonts[18],fill='#c5d3e5')
    return im
poster=frame(max(r['seconds'] for r in rows))
poster.save(out/'terminal-decode-16k-512-poster.png')
cmd=['ffmpeg','-y','-loglevel','error','-f','rawvideo','-pix_fmt','rgb24','-s',f'{W}x{H}','-r',str(FPS),'-i','-','-an','-c:v','libx264','-preset','fast','-crf','22','-pix_fmt','yuv420p','-movflags','+faststart',str(out/'terminal-decode-16k-512.mp4')]
proc=subprocess.Popen(cmd,stdin=subprocess.PIPE)
for i in range(math.ceil(duration*FPS)):
    proc.stdin.write(frame(i/FPS).tobytes())
proc.stdin.close()
if proc.wait(): raise RuntimeError('ffmpeg failed')
summary={k:v for k,v in rows[0].items() if k not in ['events','config','method','seconds','tokens_per_second','precision']}
summary['methods']=[{k:r[k] for k in ['method','precision','seconds','tokens_per_second']} for r in rows]
summary['residual_to_bf16_speed_ratio']=ratio
summary['playback']='1x actual timestamps, aligned after first output; separate runs on one GPU'
(out/'terminal-decode-16k-512.json').write_text(json.dumps(summary,indent=2)+'\n')
print(json.dumps(summary,indent=2))
