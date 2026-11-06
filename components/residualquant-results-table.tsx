import { Fragment } from 'react';
import data from '@/lib/residualquant-benchmarks.json';

type Row = { method: string; cells: { value: string; bold: boolean }[] };

function ResultRow({ row }: { row: Row }) {
  const full = row.method === 'Residual quantization + OptR-H';
  return (
    <tr className={full ? 'rq-results-full' : row.method === 'Residual quantization' ? 'rq-results-residual' : undefined}>
      <th scope="row">{row.method}</th>
      {row.cells.map((cell, index) => (
        <td key={index}>{cell.bold ? <strong>{cell.value}</strong> : cell.value}</td>
      ))}
    </tr>
  );
}

export function ResidualQuantResultsTable() {
  return (
    <figure className="rq-results">
      <figcaption><strong>Downstream performance</strong><span>Accuracy (%) · higher is better</span></figcaption>
      <div className="rq-results-scroll" tabIndex={0} role="region" aria-label="Main benchmark results; scroll horizontally to compare all benchmarks">
        <table>
          <thead>
            <tr><th rowSpan={2} scope="col">Method</th><th colSpan={4} scope="colgroup">Ouro-1.4B <small>4 loops</small></th><th colSpan={4} scope="colgroup">Huginn-3.5B <small>32 loops</small></th><th rowSpan={2} scope="col">Avg.</th></tr>
            <tr>{['GSM8K', 'MATH500', 'HumanEval', 'MBPP', 'GSM8K', 'MATH500', 'HumanEval', 'MBPP'].map((name, index) => <th key={index} scope="col">{name}</th>)}</tr>
          </thead>
          <tbody>
            <ResultRow row={data.baseline} />
            {data.groups.map((group) => <Fragment key={`${group.label}-${group.groupSize}`}>
              <tr className="rq-results-group"><th colSpan={10} scope="rowgroup">{group.label}<span>g = {group.groupSize} · b<sub>eff</sub> = {group.bits}</span></th></tr>
              {group.rows.map((row) => <ResultRow key={row.method} row={row} />)}
            </Fragment>)}
          </tbody>
        </table>
      </div>
      <p className="rq-results-note">Values and bold highlights reproduce the paper’s main table. Teal rows are ResidualQuant (residual quantization + OptR-H). Residual variants use the final-loop anchor and least-squares scaling. b<sub>eff</sub> = effective bits per KV value (Direct and OptR-H); mixed INT2/4 uses g = 32 for INT4. Avg. is the mean of all eight benchmark scores.</p>
    </figure>
  );
}
