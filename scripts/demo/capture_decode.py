"""Record actual per-token decode timestamps without changing the runtime checkout."""
import argparse, hashlib, json, os, time
from pathlib import Path
p = argparse.ArgumentParser()
p.add_argument('--method', choices=['bf16', 'residual'], required=True)
p.add_argument('--output', type=Path, required=True)
a = p.parse_args()
runtime = Path('/root/projects/LoopTransformer-vllm')
a.output.mkdir(parents=True, exist_ok=True)
os.environ.update(VLLM_PLUGINS='register_loop_vllm', VLLM_ENABLE_V1_MULTIPROCESSING='0', OURO_SHARED_KV_CACHE='0', OURO_FUSED_ROPE_CACHE='0', TOKENIZERS_PARALLELISM='false')
config = runtime / 'local-data/calibrated/2224_g16/config.json'
if a.method == 'residual':
    os.environ['LOOPTRANSFORMER_SERVER_CONFIG'] = str(config)
else:
    os.environ.pop('LOOPTRANSFORMER_SERVER_CONFIG', None)
import torch
from transformers import AutoTokenizer
from vllm import LLM, SamplingParams
torch.set_num_threads(4)
torch.backends.cuda.preferred_blas_library('default')
model = 'ByteDance/Ouro-1.4B'
revision = 'e3b1e0993b1231a51d6069a870476dda4162c00a'
tokenizer = AutoTokenizer.from_pretrained(model, revision=revision, trust_remote_code=True)
body = tokenizer.encode('A study note: explain mathematical reasoning step by step, including definitions, examples, and verification.\n', add_special_tokens=False)
end = tokenizer.encode('\nWrite a detailed tutorial about solving quadratic equations, with many worked examples.\nAnswer:\n', add_special_tokens=False)
prompt = (body * (16384 // len(body) + 1))[:16384-len(end)] + end
kwargs = dict(model=model, revision=revision, trust_remote_code=True, dtype='bfloat16', hf_overrides={'total_ut_steps':4}, tensor_parallel_size=1, seed=0, max_model_len=16896, max_num_seqs=1, max_num_batched_tokens=16896, gpu_memory_utilization=.90, enable_prefix_caching=False, enable_chunked_prefill=False, enforce_eager=False, compilation_config={'level':0, 'cudagraph_mode':'FULL_DECODE_ONLY', 'cudagraph_capture_sizes':[1]})
if a.method == 'residual':
    kwargs['scheduler_cls'] = 'kv_runtime.scheduler.FullPromptScheduler'
# vLLM's dummy profile omits the live four-loop full-prompt staging buffers.
# Keep utilization=.90 while reserving workspace within that budget, identically
# for both methods. This changes cache capacity, not the measured decode path.
from vllm.v1.worker.gpu_worker import Worker
original_memory_profile = Worker.determine_available_memory
def reserve_prefill_workspace(self):
    available = original_memory_profile(self)
    workspace = 8 * 1024**3
    if available <= workspace:
        raise RuntimeError('Insufficient memory for full-prompt workspace')
    print(f'Reserving {workspace} bytes inside the 0.90 budget for 16k prefill', flush=True)
    return available - workspace
Worker.determine_available_memory = reserve_prefill_workspace
llm = LLM(**kwargs)
engine = llm.llm_engine

def run(name, length):
    params = SamplingParams(temperature=0, min_tokens=length, max_tokens=length, ignore_eos=True)
    engine.add_request(name, {'prompt_token_ids':prompt}, params)
    events = []
    start = None
    while engine.has_unfinished_requests():
        outputs = engine.step()
        for output in outputs:
            if output.request_id != name or not output.outputs:
                continue
            tokens = list(output.outputs[0].token_ids)
            if start is None:
                torch.cuda.synchronize()
                start = time.perf_counter()
            if output.finished:
                torch.cuda.synchronize()
            events.append({'seconds':time.perf_counter()-start, 'tokens':len(tokens), 'text':output.outputs[0].text})
    assert events[-1]['tokens'] == length, events[-1]
    return events
print('Warming up the full 16k context', flush=True)
run('warmup', 32)
print('Recording 512 output tokens', flush=True)
events = run('capture', 512)
result = dict(method=a.method, model=model, revision=revision, gpu=torch.cuda.get_device_name(), context_tokens=len(prompt), output_tokens=512, batch=1, gpu_memory_utilization=.90, prefill_workspace_bytes=8*1024**3, eager=False, cuda_graph='FULL_DECODE_ONLY', warmup_tokens=32, precision='BF16' if a.method=='bf16' else 'INT2 G16 residuals / INT4 G32 anchor', timing_scope='511 decode steps after first token; prefill excluded', prompt_sha256=hashlib.sha256(json.dumps(prompt).encode()).hexdigest(), config=json.loads(config.read_text()) if a.method=='residual' else None, events=events, seconds=events[-1]['seconds'], tokens_per_second=511/events[-1]['seconds'])
(a.output / f'{a.method}.json').write_text(json.dumps(result, indent=2)+'\n')
print(json.dumps({k:result[k] for k in ['method','seconds','tokens_per_second']}), flush=True)
