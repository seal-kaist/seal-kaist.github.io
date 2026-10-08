"""Run real batched inference and print live text to a real terminal.

Prefill requests individually, park them with KV retained, then decode together.
Only terminal drawing is throttled; model outputs and timestamps are not replayed.
"""
import argparse, hashlib, json, os, textwrap, time
from pathlib import Path
p = argparse.ArgumentParser()
p.add_argument('--method', choices=['bf16','residual'], required=True)
p.add_argument('--batch', type=int, required=True)
p.add_argument('--output', type=Path, required=True)
a = p.parse_args()
a.output.mkdir(parents=True, exist_ok=True)
runtime = Path('/root/projects/LoopTransformer-vllm')
tty = os.fdopen(os.dup(1), 'w', buffering=1)
log = open(a.output / f'{a.method}-engine.log', 'w')
os.dup2(log.fileno(), 1); os.dup2(log.fileno(), 2)
os.environ.update(VLLM_PLUGINS='register_loop_vllm', VLLM_ENABLE_V1_MULTIPROCESSING='0', OURO_SHARED_KV_CACHE='0', OURO_FUSED_ROPE_CACHE='0', TOKENIZERS_PARALLELISM='false')
config = runtime/'local-data/calibrated/2224_g16/config.json'
if a.method == 'residual': os.environ['LOOPTRANSFORMER_SERVER_CONFIG'] = str(config)
else: os.environ.pop('LOOPTRANSFORMER_SERVER_CONFIG', None)
color = '\033[38;5;81m' if a.method=='bf16' else '\033[38;5;85m'
reset = '\033[0m'
label = 'vLLM / BF16' if a.method=='bf16' else 'ResidualQuant / INT2 + INT4'
def message(text):
    tty.write('\033[2J\033[H\033[?25l'+color+label+reset+'\n\n'+text+'\n'); tty.flush()
message('Preparing Ouro-1.4B, CUDA Graph and 16k prompts...')
try:
    import torch
    import vllm
    from transformers import AutoTokenizer
    from vllm import LLM, SamplingParams
    torch.set_num_threads(4)
    torch.backends.cuda.preferred_blas_library('default')
    model='ByteDance/Ouro-1.4B'; revision='e3b1e0993b1231a51d6069a870476dda4162c00a'
    tokenizer=AutoTokenizer.from_pretrained(model,revision=revision,trust_remote_code=True)
    questions=[
        'Explain how to solve quadratic equations. Give definitions and several worked examples.',
        'Explain conditional probability and Bayes theorem. Give several worked examples.',
        'Explain derivatives and their applications. Give several worked examples.',
        'Explain geometric series and convergence. Give several worked examples.',
    ]
    # Shared reference document; distinct suffixes. Identical first two prompts
    # are used in both methods. Each tokenized input is exactly 16,384 tokens.
    body=tokenizer.encode('Mathematics study notes. Define each symbol, show the steps, and verify the result with an example.\n',add_special_tokens=False)
    prompts=[]
    for q in questions[:a.batch]:
        suffix=tokenizer.encode('\nQuestion: '+q+'\nAnswer:\n',add_special_tokens=False)
        prompts.append((body*(16384//len(body)+1))[:16384-len(suffix)]+suffix)
    kwargs=dict(model=model,revision=revision,trust_remote_code=True,dtype='bfloat16',hf_overrides={'total_ut_steps':4},tensor_parallel_size=1,seed=0,max_model_len=16896,max_num_seqs=a.batch,gpu_memory_utilization=.90,enable_prefix_caching=False,enforce_eager=False,compilation_config={'level':0,'cudagraph_mode':'FULL_DECODE_ONLY','cudagraph_capture_sizes':[a.batch]},max_num_batched_tokens=4096 if a.method=='bf16' else 16896,enable_chunked_prefill=a.method=='bf16')
    workspace=0
    if a.method=='residual':
        kwargs['scheduler_cls']='kv_runtime.scheduler.FullPromptScheduler'
        from vllm.v1.worker.gpu_worker import Worker
        original=Worker.determine_available_memory
        workspace=8*1024**3
        def reserve(self): return original(self)-workspace
        Worker.determine_available_memory=reserve
    llm=LLM(**kwargs); engine=llm.llm_engine
    scheduler=engine.engine_core.engine_core.scheduler
    manager=scheduler.kv_cache_manager
    block_size=manager.kv_cache_config.kv_cache_groups[0].kv_cache_spec.block_size
    required=a.batch*((16896+block_size-1)//block_size)
    free=manager.block_pool.get_num_free_blocks()
    if required>free: raise RuntimeError(f'Batch will not fit: required {required} blocks, available {free}')
    original_free=manager.free
    def free_finished_only(request):
        assert request.is_finished(), 'Preemption invalidates a fixed-batch comparison'
        return original_free(request)
    manager.free=free_finished_only
    def prepare(prefix,length):
        assert not scheduler.running and not scheduler.waiting
        params=SamplingParams(temperature=0,min_tokens=length,max_tokens=length,ignore_eos=True)
        parked=[]; states={}
        for i,prompt in enumerate(prompts):
            rid=f'{prefix}-{i}'
            engine.add_request(rid,{'prompt_token_ids':prompt},params)
            while True:
                outputs=engine.step()
                if not outputs: continue
                assert len(outputs)==1 and outputs[0].request_id==rid
                output=outputs[0].outputs[0]
                assert len(output.token_ids)==1
                request=scheduler.running.pop()
                assert request.request_id==rid and request.num_computed_tokens==16384
                parked.append(request)
                states[rid]={'tokens':1,'text':output.text}
                break
        scheduler.running.extend(parked)
        return states
    message('Warming up the actual batch; prefill is outside the recording...')
    warm=prepare('warm',32)
    while engine.has_unfinished_requests(): engine.step()
    message('Preparing the recorded batch; each request has 16,384 input tokens...')
    states=prepare('record',512)
    def draw(elapsed,done=False):
        total=sum(s['tokens']-1 for s in states.values())
        rate=total/elapsed if elapsed else 0
        lines=[color+label+reset, f'RTX 5090 | Ouro-1.4B | Batch {a.batch}', '16,384 input / 512 output tokens per request', 'CUDA Graph decode | util 0.90 | real screen capture', 'Prefill completed before decode timing', '']
        for i,state in enumerate(states.values()):
            n=state['tokens']; width=32; full=int(width*n/512)
            lines += [color+f'Request {i+1}  [{"#"*full}{"."*(width-full)}] {n:3d}/512'+reset]
            # Actual decoded output, with terminal control characters removed.
            text=''.join(ch if ch=='\n' or ch.isprintable() else ' ' for ch in state['text'])
            wrapped=[]
            for line in text.splitlines(): wrapped.extend(textwrap.wrap(line,width=82) or [''])
            tail=wrapped[-6:]
            lines += tail+['']*(6-len(tail))+['']
        lines += ['-'*82, color+f'TOTAL  {rate:7.2f} tokens/s    ELAPSED  {elapsed:6.2f} s'+reset, f'OUTPUT {sum(s["tokens"] for s in states.values())}/{a.batch*512} tokens   '+('COMPLETE' if done else 'DECODING'), 'Recorded separately on one GPU | Playback 1x']
        tty.write('\033[H'+'\n'.join(line+'\033[K' for line in lines)+'\033[J'); tty.flush()
    draw(0)
    (a.output/f'{a.method}.ready').write_text('ready')
    gate=a.output/f'{a.method}.go'
    while not gate.exists(): time.sleep(.02)
    torch.cuda.synchronize(); start=time.perf_counter(); wall=time.time(); last_draw=start
    events=[]
    for count in range(2,513):
        outputs=engine.step()
        assert len(outputs)==a.batch and {o.request_id for o in outputs}==set(states)
        for output in outputs:
            value=output.outputs[0]
            assert len(value.token_ids)==count and output.finished==(count==512)
            states[output.request_id]={'tokens':count,'text':value.text}
        if count==512: torch.cuda.synchronize()
        now=time.perf_counter(); elapsed=now-start
        events.append({'seconds':elapsed,'requests':{k:dict(v) for k,v in states.items()}})
        if now-last_draw>=.08 or count==512:
            draw(elapsed,count==512); last_draw=now
    assert not engine.has_unfinished_requests()
    result=dict(method=a.method,batch=a.batch,model=model,revision=revision,gpu=torch.cuda.get_device_name(),vllm=vllm.__version__,context_tokens=16384,output_tokens_per_request=512,decode_steps=511,gpu_memory_utilization=.9,cuda_graph='FULL_DECODE_ONLY',prefill_workspace_bytes=workspace,prefill_policy='individually prepared, KV retained; simultaneous fixed-batch decode',native_prefill_chunk_tokens=4096 if a.method=='bf16' else None,seconds=elapsed,tokens_per_second=a.batch*511/elapsed,recording_started_wall=wall,prompt_sha256=[hashlib.sha256(json.dumps(p).encode()).hexdigest() for p in prompts],questions=questions[:a.batch],events=events,timing_scope='first output to last output; prefill excluded; includes live terminal output overhead',capture='Actual xterm window captured with ffmpeg x11grab during inference; no event replay')
    (a.output/f'{a.method}.json').write_text(json.dumps(result,indent=2)+'\n')
    (a.output/f'{a.method}.done').write_text('done')
    time.sleep(6)
except BaseException as error:
    import traceback
    traceback.print_exc()
    (a.output/f'{a.method}.failed').write_text(str(error))
    message('RUN FAILED: '+str(error))
    time.sleep(2)
    raise
