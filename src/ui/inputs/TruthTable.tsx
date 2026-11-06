import type { BoolFunction, CellValue } from '../../engine';

interface Props {
  fn: BoolFunction;
  names: string[];
  onCycle: (m: number) => void;
  onSet: (m: number, value: CellValue) => void;
}

export function TruthTable({ fn, names, onCycle, onSet }: Props) {
  return (
    <div className="truth-table-wrap">
      <table className="truth-table">
        <caption className="sr-only">Truth table. Activate an output to cycle it between 0, 1, and don't-care.</caption>
        <thead>
          <tr>
            <th scope="col" className="num">m</th>
            {names.map((nm) => (
              <th scope="col" key={nm}>{nm}</th>
            ))}
            <th scope="col" className="out">F</th>
          </tr>
        </thead>
        <tbody>
          {fn.values.map((v, m) => (
            <tr key={m}>
              <th scope="row" className="num">{m}</th>
              {names.map((nm, i) => (
                <td key={nm}>{(m >> (fn.n - 1 - i)) & 1}</td>
              ))}
              <td className="out">
                <button
                  type="button"
                  className={`tt-out v${v}`}
                  aria-label={`Output for minterm ${m}: ${v === 'x' ? "don't-care" : v}`}
                  onClick={() => onCycle(m)}
                  onKeyDown={(e) => {
                    if (e.key === '0') onSet(m, 0);
                    else if (e.key === '1') onSet(m, 1);
                    else if (e.key.toLowerCase() === 'x' || e.key.toLowerCase() === 'd') onSet(m, 'x');
                  }}
                >
                  {v === 'x' ? 'X' : v}
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
