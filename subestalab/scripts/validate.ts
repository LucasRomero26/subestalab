/* Valida con el motor eléctrico que todos los pasos de todos los escenarios sean seguros.
   Uso: npx tsx scripts/validate.ts */
import { CONFIGS } from '../src/data/configs';
import { initialState, solve } from '../src/lib/engine';
import { apply, evaluate } from '../src/lib/actions';

let problems = 0;
for (const c of CONFIGS) {
  const m = c.build();
  const ids = new Set([...m.switches.map(s => s.id), ...m.buses.map(b => b.id), ...m.sources.map(s => s.id), ...m.loads.map(l => l.id)]);
  for (const sc of c.scenarios) {
    const st = initialState(m);
    const sol0 = solve(m, st);
    const notServed0 = m.loads.filter(l => !sol0.served[l.id]).map(l => l.id);
    if (notServed0.length) { console.log(`✗ ${c.slug}: cargas sin servicio en estado normal: ${notServed0}`); problems++; }
    sc.steps.forEach((step, i) => {
      if (step.focus && !ids.has(step.focus)) { console.log(`✗ ${c.slug} ${sc.key}#${i + 1}: focus desconocido ${step.focus}`); problems++; }
      for (const a of step.acts) {
        for (const id of ('id' in a ? [a.id] : 'ids' in a ? a.ids : 'to' in a ? [a.to] : [])) {
          if (!ids.has(id)) { console.log(`✗ ${c.slug} ${sc.key}#${i + 1}: equipo desconocido ${id}`); problems++; }
        }
        if (step.kind !== 'event') {
          const v = evaluate(m, st, a);
          if (v.level !== 'ok') { console.log(`✗ ${c.slug} ${sc.key}#${i + 1} ${step.title}: ${v.level} — ${'msg' in v ? v.msg : ''}`); problems++; }
        }
        apply(m, st, a);
      }
    });
    const sol = solve(m, st);
    const lost = m.loads.filter(l => !sol.served[l.id]).map(l => l.id);
    console.log(`✓ ${c.n}. ${c.slug} [${sc.key}] ${sc.steps.length} pasos · sin servicio al final: ${lost.join(', ') || 'ninguna'}`);
  }
}
console.log(problems ? `\n${problems} problema(s)` : '\nTodos los escenarios son seguros.');
process.exit(problems ? 1 : 0);
