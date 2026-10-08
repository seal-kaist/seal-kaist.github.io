"""Export a fixed real BF16 trace slice through CPU calibration reconstruction.

Read-only source inputs; output belongs to the project-page checkout. This is
an illustrative re-quantization of one held-out trace, not serving performance
or benchmark accuracy. Use the calibration workspace's Python environment.
"""
import argparse
import hashlib
import json
from pathlib import Path
import sys

p = argparse.ArgumentParser()
p.add_argument('--workspace', type=Path, required=True)
p.add_argument('--trace', type=Path, required=True)
p.add_argument('--output', type=Path, required=True)
p.add_argument('--layer', type=int, default=11, help='Zero-based physical layer')
p.add_argument('--head', type=int, default=0, help='Zero-based KV head')
p.add_argument('--start', type=int, default=64)
p.add_argument('--rows', type=int, default=24)
a = p.parse_args()
sys.path.insert(0, str(a.workspace / 'scripts'))
import torch
from calibration.quantization import affine_qdq, quantization_target, CLIP_BY_BITS
from calibration.rotation_math import rotate

torch.set_num_threads(2)
def sha(path):
    with path.open('rb') as f: return hashlib.file_digest(f, 'sha256').hexdigest()
trace_hash = sha(a.trace)
checksum = a.trace.with_suffix('.sha256')
if checksum.exists() and checksum.read_text().strip() != trace_hash:
    raise ValueError('Trace checksum mismatch')
trace = torch.load(a.trace, map_location='cpu', weights_only=True)
artifacts = {}
for name in ('2222_g16', '2224_g16'):
    path = a.workspace / 'local-data/calibrated' / name / 'rotations.pt'
    artifacts[name] = torch.load(path, map_location='cpu', weights_only=True)

sliced = [{kind: loop[kind][a.start:a.start+a.rows, a.head:a.head+1, :].clone() for kind in ('k', 'v')} for loop in trace['batch'][a.layer]]
assert sliced[0]['k'].shape == (a.rows, 1, 128)
identity = torch.eye(128).unsqueeze(0)
result = {'provenance': {
    'model': trace['contract']['model'], 'revision': trace['contract']['revision'],
    'dataset': trace['contract']['dataset'], 'sample': trace['ordinal'],
    'split': 'calibration holdout' if trace['ordinal'] >= 128 else 'calibration fit',
    'layer': a.layer + 1, 'head': a.head + 1, 'tokenStart': a.start, 'tokenEnd': a.start+a.rows-1,
    'rows': a.rows, 'channels': 128, 'traceSha256': trace_hash,
    'traceDtype': 'BF16', 'rotation': 'calibrated OptR-H', 'int2Group': 16, 'int4Group': 32,
    'scope': 'CPU post-training calibration reconstruction of a fixed BF16 trace slice; not a serving-cache dump or a new benchmark result.',
    'arithmetic': 'Original calibration affine_qdq: INT2 clipping 0.9, FP8 scale/offset, adopted rounding, BF16 predictor and reconstruction.',
    'artifacts': {name: sha(a.workspace / 'local-data/calibrated' / name / 'rotations.pt') for name in artifacts},
    'sourceHashes': {name: sha(a.workspace / 'scripts/calibration' / name) for name in ('quantization.py','rotation_math.py')},
}, 'kinds': {}}

def matrix(t): return [[round(v, 6) for v in row] for row in t[:, 0].float().tolist()]
def integer_codes(z, rotation, bits, group_size, mean):
    centered = z.float() if mean is None else z.float() - mean.float()
    values = rotate(centered, rotation)
    groups = values.reshape(*values.shape[:-1], values.shape[-1] // group_size, group_size)
    low, high = groups.amin(-1, keepdim=True), groups.amax(-1, keepdim=True)
    center = (high + low) * .5
    radius = (high - low) * .5 * CLIP_BY_BITS[bits]
    offset = (center - radius).clamp(-448, 448).to(torch.float8_e4m3fn).float()
    scale = (2 * radius / (2 ** bits - 1)).clamp_max(448).to(torch.float8_e4m3fn).float()
    normalized = (groups - offset) / torch.where(scale > 0, scale, torch.ones_like(scale))
    floor = normalized.floor()
    return (floor + (normalized - floor > .5)).clamp(0, 2 ** bits - 1).reshape_as(values)

def summarize(t):
    t = t.float()
    return {'rms': float(t.square().mean().sqrt()), 'maxAbs': float(t.abs().max()), 'peakToRms': float(t.abs().max()/t.square().mean().sqrt().clamp_min(1e-12))}

with torch.inference_mode():
 for kind in ('k','v'):
    originals = [loop[kind] for loop in sliced]
    frames = []
    for stage in range(6):
        artifact = artifacts['2224_g16' if stage == 5 else '2222_g16']
        r = artifact['key_rotations' if kind == 'k' else 'value_rotations'][a.layer,a.head:a.head+1].float() if stage >= 4 else identity
        means = [artifact['key_means'][i,a.layer,a.head:a.head+1].float() if kind == 'k' and stage >= 4 else None for i in range(4)]
        bits = [16]*4 if stage == 0 else [2,2,2,4] if stage == 5 else [2]*4
        groups = [32 if b == 4 else 16 for b in bits]
        anchor = originals[3] if stage == 0 else affine_qdq(originals[3],r,bits[3],groups[3],means[3])
        loops = []
        for loop in range(4):
            x = originals[loop]
            alpha = None
            if stage == 0:
                z = x; prediction = torch.zeros_like(x); decoded = x.float(); restored = x.float()
            elif stage == 1 or loop == 3:
                z = x; prediction = torch.zeros_like(x)
                decoded = affine_qdq(z,r,bits[loop],groups[loop],means[loop]); restored = decoded
            else:
                if stage == 2:
                    prediction = anchor.bfloat16(); z = (x.float()-prediction.float()).bfloat16()
                else:
                    z, prediction, alpha = quantization_target(x,anchor)
                decoded = affine_qdq(z,r,bits[loop],groups[loop],means[loop])
                restored = (prediction.float()+decoded.float()).bfloat16().float()
            transformed = rotate(z.float() if means[loop] is None else z.float()-means[loop],r) if stage >= 4 else z.float()
            error = restored.float()-x.float()
            loops.append({'anchor': matrix(anchor), 'prediction': matrix(prediction), 'residual': matrix(z),
                          'codes': None if stage == 0 else matrix(integer_codes(z,r,bits[loop],groups[loop],means[loop])),
                          'transformed': matrix(restored if stage == 1 else transformed),
                          'reconstructed': matrix(restored), 'error': matrix(error),
                          'stats': {'original': summarize(x), 'transformed': summarize(transformed),
                                    'errorRmse': float(error.square().mean().sqrt()),
                                    'alphaMean': None if alpha is None else float(alpha.float().mean())}})
        # FP8 scale + offset per group; one BF16 LS coefficient on each residual loop.
        effective = [16. if stage == 0 else bits[i]+16/groups[i]+(16/128 if stage >= 3 and i<3 else 0) for i in range(4)]
        frames.append({'loops':loops,'bits':bits,'groups':groups,'effectiveBits':effective,'storagePercent':sum(effective)/64*100})
    all_matrices = [v for m in originals for row in matrix(m) for v in row]
    # One exact shared bound for original/transformed/reconstruction/error across every stage.
    bound = max(abs(v) for v in all_matrices)
    for frame in frames:
        for loop in frame['loops']:
            for name in ('transformed','reconstructed','error'):
                bound = max(bound,max(abs(v) for row in loop[name] for v in row))
    result['kinds'][kind] = {'bound':bound,'originals':[matrix(m) for m in originals],'frames':frames}
a.output.parent.mkdir(parents=True,exist_ok=True)
a.output.write_text(json.dumps(result,separators=(',',':'),allow_nan=False)+'\n')
for kind,d in result['kinds'].items():
 print(kind,'bound',d['bound'],'loop1 RMSE',[round(f['loops'][0]['stats']['errorRmse'],5) for f in d['frames']])
print('output',a.output,'bytes',a.output.stat().st_size)
