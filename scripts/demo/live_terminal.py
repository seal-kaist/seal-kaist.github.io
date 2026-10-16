"""Run actual inference in xterm; adapted from historical live_decode.py."""
import argparse
import hashlib
import json
import os
from pathlib import Path
import subprocess
import sys
import time
import textwrap

REPO = Path(__file__).resolve().parents[2]
ROOT = Path(os.environ.get('LOOPTRANSFORMER_RUNTIME', str(REPO.parent / 'LoopTransformer')))
OUT = Path(os.environ.get('RQ_VIDEO_TAKES', str(REPO / 'work/terminal-demo-new')))
p = argparse.ArgumentParser()
p.add_argument('--method', choices=['bf16', 'residual'], required=True)
p.add_argument('--gpu', default='0')
a = p.parse_args()
OUT.mkdir(parents=True, exist_ok=True)
tty = os.fdopen(os.dup(1), 'w', buffering=1)
engine_log = open(OUT / f'{a.method}-engine.log', 'w')
os.dup2(engine_log.fileno(), 1)
os.dup2(engine_log.fileno(), 2)
def failure(kind, value, tb):
    import traceback
    (OUT / f'{a.method}.failed').write_text(''.join(traceback.format_exception(kind, value, tb)))
    sys.__excepthook__(kind, value, tb)
sys.excepthook = failure
tty.write('\033[2J\033[H\033[?25lPreparing model, CUDA Graph and prompts...\n')
tty.flush()
os.environ.update(CUDA_VISIBLE_DEVICES=a.gpu,
    VLLM_PLUGINS='register_looped_transformers' + (',register_residual_quantization' if a.method == 'residual' else ''),
    VLLM_ENABLE_V1_MULTIPROCESSING='0', TOKENIZERS_PARALLELISM='false', OMP_NUM_THREADS='4')
sys.path.insert(0, str(ROOT / 'scripts'))
from evaluation.server_client import serving_config
import torch
from transformers import AutoTokenizer
from vllm import LLM, SamplingParams

torch.set_num_threads(4)
torch.backends.cuda.preferred_blas_library('default')
batch = 2 if a.method == 'bf16' else 8
context, length = 16384, 512
model, revision = 'ByteDance/Ouro-1.4B', 'e3b1e0993b1231a51d6069a870476dda4162c00a'
config_path = (REPO / 'data/residualquant-terminal/configs') / ('bf16.json' if a.method == 'bf16' else 'residualquant.json')
cfg = json.loads(config_path.read_text())
tokenizer = AutoTokenizer.from_pretrained(model, revision=revision, trust_remote_code=True)
questions = [
    'Explain how to solve quadratic equations. Give definitions and several worked examples.',
    'Explain conditional probability and Bayes theorem. Give several worked examples.',
    'Explain derivatives and their applications. Give several worked examples.',
    'Explain geometric series and convergence. Give several worked examples.',
    'Explain how to multiply matrices. Give several worked examples.',
    'Explain the Pythagorean theorem. Give several worked examples.',
    'Explain integration by parts. Give several worked examples.',
    'Explain prime factorization. Give several worked examples.',
]
body = tokenizer.encode('Mathematics study notes. Define each symbol, show the steps, and verify the result with an example.\n', add_special_tokens=False)
prompts = []
for q in questions[:batch]:
    suffix = tokenizer.encode('\nQuestion: ' + q + '\nAnswer:\n', add_special_tokens=False)
    prompts.append((body * (context // len(body) + 1))[:context-len(suffix)] + suffix)
assert all(len(ids) == context for ids in prompts)
llm = LLM(model=model, revision=revision, trust_remote_code=True,
    dtype='bfloat16', tensor_parallel_size=1, block_size=32,
    max_model_len=context+length, max_num_seqs=batch,
    max_num_batched_tokens=4096 if a.method == 'bf16' else context+length,
    enable_chunked_prefill=a.method == 'bf16', gpu_memory_utilization=.90,
    enable_prefix_caching=False, seed=0,
    additional_config=serving_config(cfg, config_path),
    load_format='auto' if a.method == 'bf16' else 'residual_quantization',
    compilation_config={'level': 0, 'cudagraph_mode': 'FULL_DECODE_ONLY', 'cudagraph_capture_sizes': [batch]})
engine = llm.llm_engine
core = engine.engine_core.engine_core
scheduler = core.scheduler
manager = scheduler.kv_cache_manager
runner = core.model_executor.driver_worker.worker.model_runner
entries = getattr(runner.model, 'concrete_cudagraph_entries', {})
graphs = sum(entry.cudagraph is not None for entry in entries.values())
assert graphs > 0, 'CUDA graph was not captured'
block_size = manager.kv_cache_config.kv_cache_groups[0].kv_cache_spec.block_size
required = batch * ((context + length + block_size - 1) // block_size)
free = manager.block_pool.get_num_free_blocks()
assert required <= free, f'KV capacity insufficient: {required} > {free}'
original_free = manager.free
def free_finished_only(request):
    assert request.is_finished(), 'Preemption invalidates fixed-batch decode'
    return original_free(request)
manager.free = free_finished_only

def prepare(prefix, output_length):
    assert not scheduler.running and not scheduler.waiting
    params = SamplingParams(temperature=0, min_tokens=output_length,
        max_tokens=output_length, ignore_eos=True, stop=[])
    parked, states = [], {}
    for i, prompt in enumerate(prompts):
        rid = f'{prefix}-{i}'
        engine.add_request(rid, {'prompt_token_ids': prompt}, params)
        while True:
            outputs = engine.step()
            if not outputs:
                continue
            assert len(outputs) == 1 and outputs[0].request_id == rid
            value = outputs[0].outputs[0]
            assert len(value.token_ids) == 1
            request = scheduler.running.pop()
            assert request.request_id == rid and request.num_computed_tokens == context
            parked.append(request)
            states[rid] = {'tokens': 1, 'text': value.text}
            break
    scheduler.running.extend(parked)
    return states

print('Warmup: staged prefill and 32-token fixed-batch decode', flush=True)
prepare('warm', 32)
while engine.has_unfinished_requests():
    engine.step()
print('Preparing recorded requests', flush=True)
states = prepare('record', length)
events = [{'seconds': 0., 'requests': list(states.values())}]

color = '\033[38;5;81m' if a.method == 'bf16' else '\033[38;5;85m'
reset = '\033[0m'
label = 'vLLM / BF16' if a.method == 'bf16' else 'ResidualQuant / INT2 + INT4 G32'
def draw(elapsed, done=False):
    def at(row, col, text, tint=None):
        return f'\033[{row};{col}H' + ((tint or '') + text + (reset if tint else ''))
    pieces = [at(1,1,label,color), at(2,1,f'RTX 5090 | Ouro-1.4B | Batch {batch}'),
        at(3,1,'16,384 input / 512 output tokens per request'),
        at(4,1,'CUDA Graph ON | Prefill excluded from decode timing')]
    for i,state in enumerate(states.values()):
        row = 7 + i*18 if batch == 2 else 7 + (i//2)*9
        col = 1 if batch == 2 else 1 + (i%2)*64
        n=state['tokens']; bar=int(29*n/512)
        pieces += [at(row,col,f'Request {i+1}  {n:3d} / 512 tokens'.ljust(61),color),
            at(row+1,col,('['+'#'*bar+'.'*(29-bar)+']').ljust(61),color)]
        text=''.join(ch if ch=='\n' or ch.isprintable() else ' ' for ch in state['text']).replace('\t','  ')
        lines=[]
        for line in text.splitlines():
            lines.extend(textwrap.wrap(line,width=60) or [''])
        keep=12 if batch==2 else 5
        tail=lines[-keep:]
        for k in range(keep):
            pieces.append(at(row+3+k,col,(tail[k] if k<len(tail) else '').ljust(61)))
    total=sum(s['tokens']-1 for s in states.values())
    rate=total/elapsed if elapsed else 0
    pieces += [at(44,1,'-'*(61 if batch==2 else 125)),
        at(45,1,f'TOTAL {rate:7.2f} tokens/s   ELAPSED {elapsed:6.2f} s'.ljust(61),color),
        at(46,1,('COMPLETE' if done else 'DECODING ...').ljust(61),color)]
    tty.write(''.join(pieces)); tty.flush()
tty.write('\033[2J\033[H')
draw(0)
(OUT / f'{a.method}.ready').write_text('ready')
while not (OUT / f'{a.method}.go').exists():
    time.sleep(.02)

torch.cuda.synchronize()
start = time.perf_counter()
last_draw = start
for count in range(2, length+1):
    outputs = engine.step()
    assert len(outputs) == batch and {o.request_id for o in outputs} == set(states)
    for output in outputs:
        value = output.outputs[0]
        assert len(value.token_ids) == count and output.finished == (count == length)
        states[output.request_id] = {'tokens': count, 'text': value.text}
    if count == length:
        torch.cuda.synchronize()
    elapsed = time.perf_counter() - start
    events.append({'seconds': elapsed, 'requests': list(states.values())})
    if time.perf_counter()-last_draw >= .08 or count == length:
        draw(elapsed, count == length)
        last_draw = time.perf_counter()
assert not engine.has_unfinished_requests()
result = dict(method=a.method, batch=batch, model=model, revision=revision,
    gpu=torch.cuda.get_device_name(), physical_gpu=a.gpu,
    gpu_uuid=subprocess.check_output(['nvidia-smi', '-i', a.gpu, '--query-gpu=uuid', '--format=csv,noheader'], text=True).strip(),
    context_tokens=context, output_tokens=length, decode_steps=length-1,
    seconds=elapsed, tokens_per_second=batch*(length-1)/elapsed,
    config=cfg, gpu_memory_utilization=.9, cuda_graph='FULL_DECODE_ONLY',
    captured_cuda_graph_count=graphs, cuda_graph_keys=[str(k) for k in entries],
    free_blocks=free, required_blocks=required, questions=questions[:batch],
    prompt_sha256=[hashlib.sha256(json.dumps(ids).encode()).hexdigest() for ids in prompts],
    runtime_git=subprocess.check_output(['git','-C',str(ROOT),'rev-parse','HEAD'],text=True).strip(),
    script_sha256=hashlib.sha256(Path(__file__).read_bytes()).hexdigest(),
    capture='Actual xterm pixels recorded with ffmpeg x11grab during inference; no event replay',
    timing_scope='First output to last output; staged prefill excluded; includes live terminal drawing and event collection overhead',
    vllm=__import__('vllm').__version__, torch=torch.__version__, events=events)
(OUT / f'{a.method}.json').write_text(json.dumps(result, indent=2)+'\n')
print(json.dumps({k: result[k] for k in ['method','batch','seconds','tokens_per_second','captured_cuda_graph_count']}), flush=True)

(OUT / f'{a.method}.done').write_text('done')
time.sleep(8)
