import { summarize, weaken, type Force } from '../lib/force-field';
import { announce, each, readConfig, store } from './ix';

interface Config {
  uid: string;
  driving: Force[];
  restraining: Force[];
}

each('[data-ix="force-field"]', (root) => {
  const cfg = readConfig<Config>(root);
  const status = root.querySelector<HTMLElement>('[data-status]');
  const fb = root.querySelector<HTMLElement>('[data-weaken-feedback]');
  const note = root.querySelector<HTMLTextAreaElement>('[data-note]');
  const key = `ff:${cfg.uid}`;
  const saved = store.get<{ driving?: number[]; restraining?: number[]; weaken?: string; note?: string }>(key, {});

  const read = (side: 'driving' | 'restraining'): Force[] =>
    cfg[side].map((f, k) => {
      const el = root.querySelector<HTMLInputElement>(`input[data-side="${side}"][data-index="${k}"]`);
      return { label: f.label, strength: el ? Number(el.value) : f.strength };
    });

  const persist = () =>
    store.set(key, {
      driving: read('driving').map((f) => f.strength),
      restraining: read('restraining').map((f) => f.strength),
      weaken: root.querySelector<HTMLInputElement>(`input[name="${cfg.uid}-weaken"]:checked`)?.value,
      note: note?.value ?? '',
    });

  const showWeaken = () => {
    const picked = root.querySelector<HTMLInputElement>(`input[name="${cfg.uid}-weaken"]:checked`);
    if (!picked || !fb) return;
    const d = read('driving');
    const r = read('restraining');
    const idx = Number(picked.value);
    const w = weaken(d, r, idx);
    const force = r[idx];
    if (!force) return;
    fb.hidden = false;
    fb.className = 'feedback feedback--partial';
    const tipped = w.before.balance !== 'driving' && w.after.balance === 'driving';
    fb.innerHTML = '';
    const p1 = document.createElement('p');
    p1.textContent =
      w.from === w.to
        ? `“${force.label}” is already at the lowest strength on your weighting.`
        : `If “${force.label}” fell from ${w.from} to ${w.to}, the restraining total would fall from ${w.before.restraining} to ${w.after.restraining}, against ${w.after.driving} driving.${tipped ? ' That would tip the balance towards the change.' : ''}`;
    const p2 = document.createElement('p');
    p2.className = 'muted';
    p2.textContent = 'The useful question is how: what would it take to weaken this force, who would do it, and what would it cost?';
    fb.append(p1, p2);
  };

  const render = (say: boolean) => {
    (['driving', 'restraining'] as const).forEach((side) => {
      read(side).forEach((f, k) => {
        const out = root.querySelector<HTMLOutputElement>(`[data-out="${side}-${k}"]`);
        const bar = root.querySelector<HTMLElement>(`[data-bar="${side}-${k}"]`);
        const input = root.querySelector<HTMLInputElement>(`input[data-side="${side}"][data-index="${k}"]`);
        if (out) out.value = String(f.strength);
        if (bar) bar.style.setProperty('--w', `${f.strength * 20}%`);
        input?.setAttribute('aria-valuetext', `Strength ${f.strength} of 5`);
      });
    });
    const s = summarize(read('driving'), read('restraining'));
    const dt = root.querySelector<HTMLElement>('[data-total="driving"]');
    const rt = root.querySelector<HTMLElement>('[data-total="restraining"]');
    if (dt) dt.textContent = String(s.driving);
    if (rt) rt.textContent = String(s.restraining);
    const bal = root.querySelector<HTMLElement>('[data-balance]');
    if (bal) {
      bal.textContent = s.sentence;
      bal.dataset.balance = s.balance;
    }
    showWeaken();
    if (say) announce(status, `Driving ${s.driving}, restraining ${s.restraining}.`);
  };

  // Restore this learner's earlier weighting, if any.
  (['driving', 'restraining'] as const).forEach((side) =>
    saved[side]?.forEach((v, k) => {
      const el = root.querySelector<HTMLInputElement>(`input[data-side="${side}"][data-index="${k}"]`);
      if (el && v >= 1 && v <= 5) el.value = String(v);
    }),
  );
  if (saved.weaken) {
    const el = root.querySelector<HTMLInputElement>(`input[name="${cfg.uid}-weaken"][value="${saved.weaken}"]`);
    if (el) el.checked = true;
  }
  if (note && saved.note) note.value = saved.note;
  render(false);

  let timer = 0;
  root.addEventListener('input', (e) => {
    const t = e.target as HTMLElement;
    if (t instanceof HTMLInputElement && t.type === 'range') {
      render(false);
      window.clearTimeout(timer);
      timer = window.setTimeout(() => render(true), 500);
    }
    persist();
  });
  root.addEventListener('change', (e) => {
    const t = e.target as HTMLInputElement;
    if (t.name === `${cfg.uid}-weaken`) {
      showWeaken();
      announce(status, fb?.textContent ?? '');
    }
    persist();
  });
});
