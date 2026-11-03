/**
 * Option appraisal and memo in the browser: criteria, options and steps to add
 * and remove; headlines from the other tools' saved work; the memo copied or
 * printed on its own.
 */
import { mount } from './controller';
import { store } from '../ix';
import { LIMITS, blank, editorHtml, fileName, headline, memoText, newCriterion, newOption, newStep, normalize, outputsHtml, toCsvText, toText, type AppraisalState } from '../../lib/strategy/appraisal';

let tools: Array<{ slug: string; title: string }> = [];

mount<AppraisalState>({
  tool: 'option-appraisal',
  normalize,
  blank,
  editorHtml,
  outputsHtml,
  headline,
  toText,
  toCsvText,
  fileName,
  afterInput(_s, path) {
    // Names and weights also appear in the score matrix and the list of options to recommend.
    if ((path[0] === 'criteria' && path[2] !== undefined) || (path[0] === 'options' && path[2] === 'name')) return { redraw: true };
    return undefined;
  },
  action(s, act, data, uid) {
    if (act === 'add-criterion' && s.criteria.length < LIMITS.criteria) {
      const c = newCriterion(s);
      s.criteria.push(c);
      return { focus: `${uid}-${c.id}-label`, say: `Criterion ${s.criteria.length} added, with every option scored 3 on it.` };
    }
    if (act === 'add-option' && s.options.length < LIMITS.options) {
      const o = newOption(s);
      s.options.push(o);
      return { focus: `${uid}-${o.id}-name`, say: `Option ${String.fromCharCode(64 + s.options.length)} added, scored 3 on every criterion.` };
    }
    if (act === 'add-step' && s.memo.steps.length < LIMITS.steps) {
      const st = newStep(s);
      s.memo.steps.push(st);
      return { focus: `${uid}-${st.id}-action`, say: `Step ${s.memo.steps.length} added.` };
    }
    if (act === 'remove-criterion' && data.id) {
      s.criteria = s.criteria.filter((c) => c.id !== data.id);
      for (const o of s.options) delete o.scores[data.id];
      return { focus: '[data-act="add-criterion"]', say: 'Criterion removed.' };
    }
    if (act === 'remove-option' && data.id) {
      s.options = s.options.filter((o) => o.id !== data.id);
      if (s.memo.recommend === data.id) s.memo.recommend = '';
      return { focus: '[data-act="add-option"]', say: 'Option removed.' };
    }
    if (act === 'remove-step' && data.id) {
      s.memo.steps = s.memo.steps.filter((x) => x.id !== data.id);
      return { focus: '[data-act="add-step"]', say: 'Step removed.' };
    }
    if (act === 'import-evidence') {
      const lines = tools
        .map((t) => {
          const saved = store.get<{ headline?: string } | null>(`strategy:${t.slug}`, null);
          return saved?.headline ? `${t.title}: ${saved.headline}` : '';
        })
        .filter(Boolean);
      if (!lines.length) return { focus: '[data-act="import-evidence"]', say: 'No saved work from the other tools was found in this browser. Work through a tool and its headline can be added here.' };
      const have = new Set(s.memo.evidence.split('\n').map((l) => l.trim()));
      const fresh = lines.filter((l) => !have.has(l));
      s.memo.evidence = [s.memo.evidence.trim(), ...fresh].filter(Boolean).join('\n').slice(0, 2500);
      return { focus: `${uid}-evidence`, say: fresh.length ? `Added ${fresh.length} ${fresh.length === 1 ? 'headline' : 'headlines'} from your saved tools to the evidence.` : 'The headlines from your saved tools are already in the evidence.' };
    }
    return null;
  },
  init(root, api) {
    tools = (api.config.tools as Array<{ slug: string; title: string }> | undefined) ?? [];
    root.addEventListener('click', async (e) => {
      const b = (e.target as HTMLElement).closest<HTMLButtonElement>('[data-memo-act]');
      if (!b) return;
      if (b.dataset.memoAct === 'print') {
        document.documentElement.classList.add('sx-print-memo');
        const done = () => document.documentElement.classList.remove('sx-print-memo');
        window.addEventListener('afterprint', done, { once: true });
        window.print();
        window.setTimeout(done, 1000);
        return;
      }
      const text = memoText(api.state());
      try {
        if (!navigator.clipboard) throw new Error('no clipboard');
        await navigator.clipboard.writeText(text);
        api.say('The memo is copied as plain text.');
      } catch {
        const box = root.querySelector<HTMLElement>('[data-copy-fallback]');
        const area = box?.querySelector<HTMLTextAreaElement>('textarea');
        if (box && area) {
          box.hidden = false;
          area.value = text;
          area.focus();
          area.select();
        }
        api.say('This browser blocked copying. The memo is selected in the box under the export buttons: copy it from there.');
      }
    });
  },
});
