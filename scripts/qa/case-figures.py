"""Recompute every figure in the Case Vault's cases.

Each case listed in MODELS below has a model: its assumptions, stated once,
and the arithmetic that turns them into the exhibits. The script rebuilds
every modelled exhibit from those assumptions and compares it, cell by cell,
with the case file. It then reads every piece of text in the case (narrative,
industry context, notes, options, questions, guidance, debrief, method) and
checks that every figure written there is one the model accounts for: an
input, a result, or a cell of an exhibit, at the precision shown. A figure the
model cannot account for fails the check, so a number cannot drift away from
the evidence it claims to come from.

What is not treated as a figure: years (1900 to 2039), day-and-month dates,
exhibit numbers, page references, word counts, the titles of further reading (which name
subtopics), and bare whole numbers from 0 to 12 used as counts (a figure with
a currency, a decimal point or a per cent sign is always checked). The
constants 365 and 100 are always accounted for.

Rounding is half away from zero, to the decimals shown.

Usage:
    python3 -I scripts/qa/case-figures.py             check every case
    python3 -I scripts/qa/case-figures.py ID [ID...]  check some cases
    python3 -I scripts/qa/case-figures.py --emit ID   print a case's modelled exhibit rows as YAML

The three cases written before the vault (atelier-barro, halden-distribution,
marigold-kitchens) are recomputed by tests/unit/cases.test.ts instead; any
other case without a model here fails. Requires PyYAML.
"""
from __future__ import annotations

import re
import sys
from decimal import ROUND_HALF_UP, Decimal
from pathlib import Path

import yaml

ROOT = Path(__file__).resolve().parents[2]
CASES = ROOT / 'src' / 'content' / 'cases'
VERIFIED_ELSEWHERE = {'atelier-barro', 'halden-distribution', 'marigold-kitchens'}


def rhu(value: float, decimals: int = 0) -> float:
    """Round half away from zero."""
    q = Decimal(1).scaleb(-decimals)
    return float(Decimal(repr(value)).quantize(q, rounding=ROUND_HALF_UP))


def money(value: float, decimals: int = 0) -> str:
    """1,234 or 1,234.50, with the typographic minus for negatives."""
    s = f'{abs(rhu(value, decimals)):,.{decimals}f}'
    return f'−{s}' if value < 0 and rhu(value, decimals) != 0 else s


# ---------------------------------------------------------------------------
# The checker
# ---------------------------------------------------------------------------

MONTHS = 'January|February|March|April|May|June|July|August|September|October|November|December'
SKIP_KEYS = {
    'id', 'href', 'evidence', 'exhibits', 'syllabus', 'subtopics', 'terms', 'tool', 'topics', 'tools', 'concepts',
    'keyConcepts', 'calculations', 'questions', 'sources', 'updated', 'option', 'commandTerm', 'ao', 'level', 'paper',
    'fit', 'kind', 'format', 'provenance', 'industry', 'functions', 'difficulty', 'qualifications', 'caseType',
    'dataStatus', 'decisionRoom', 'numeric', 'footerIsSum', 'code', 'symbol',
}
# Text removed before figures are read: references and dates rather than data.
NOT_FIGURES = [
    re.compile(r'\bExhibits?\s+\d+(?:(?:,\s*|\s+and\s+|\s+to\s+)\d+)*'),
    re.compile(r'\bpp?\.\s*\d+(?:\s+to\s+\d+)?'),
    re.compile(rf'\b\d{{1,2}}\s+(?:{MONTHS})\b'),
    re.compile(rf'\b(?:{MONTHS})\s+\d{{1,2}}\b(?!,\d)'),
    re.compile(r'\bsubtopics?\s+\d\.\d\b'),
    re.compile(r'\bunits?\s+\d\b', re.I),
    re.compile(r'\b\d+\s+words\b'),
]
CURRENCY = r'(?:A\$|C\$|US\$|MX\$|KSh\s?|R(?=\d)|£|€|₹|\$)'
TOKEN = re.compile(
    rf'(?<![\w.,])(?P<neg>[−-])?(?P<cur>{CURRENCY})?(?P<num>\d{{1,3}}(?:,\d{{3}})+(?:\.\d+)?|\d+(?:\.\d+)?)'
    r'(?P<suf>\s?(?:bn|m|k|million|billion|thousand)\b)?(?P<pct>\s?%| per cent)?'
)
SCALE = {'k': 1e3, 'thousand': 1e3, 'm': 1e6, 'million': 1e6, 'bn': 1e9, 'billion': 1e9}


class Check:
    def __init__(self, case_id: str, emit: bool = False):
        self.id = case_id
        self.emit = emit
        path = CASES / f'{case_id}.yaml'
        # --emit can run before the case file exists, to print the exhibits it will hold.
        self.data = yaml.safe_load(path.read_text(encoding='utf-8')) if path.exists() else {'exhibits': []}
        self.allowed: set[float] = set()
        self.problems: list[str] = []
        # The unit the case's figures are kept in: a figure written as "A$2.4m" in a case kept in thousands matches 2,400.
        unit = str((self.data.get('currency') or {}).get('unit', '')).lower()
        self.scale = 1e6 if 'million' in unit else 1e3 if 'thousand' in unit else 1.0
        self.modelled: set[str] = set()
        # Constants of the formulas themselves: days in a year (the guide's efficiency ratios) and per cent.
        self.allow(365, 100)
        for e in self.data.get('exhibits', []):
            for row in e.get('rows') or []:
                self.allow(*[c for c in row if isinstance(c, (int, float))])
            self.allow(*[c for c in e.get('footer') or [] if isinstance(c, (int, float))])
        for q in self.data.get('analysisQuestions', []):
            self.allow(q['marks'])
        if self.data.get('exercise'):
            self.allow(self.data['exercise']['minutes'])

    # -- recording ----------------------------------------------------------
    def allow(self, *values: float) -> None:
        for v in values:
            if isinstance(v, (int, float)):
                self.allowed.add(float(v))

    def fail(self, message: str) -> None:
        self.problems.append(message)

    # -- exhibits -----------------------------------------------------------
    def exhibit(self, ex_id: str) -> dict:
        for e in self.data['exhibits']:
            if e['id'] == ex_id:
                return e
        raise KeyError(f'{self.id}: no exhibit {ex_id}')

    def table(self, ex_id: str, rows: list[list], footer: list | None = None) -> None:
        """The exhibit's rows must equal the model's, cell by cell."""
        self.modelled.add(ex_id)
        for r in rows:
            self.allow(*[c for c in r if isinstance(c, (int, float))])
        if footer:
            self.allow(*[c for c in footer if isinstance(c, (int, float))])
        if self.emit:
            print(f'# {ex_id}')
            print('    rows:')
            for r in rows:
                print('      - [' + ', '.join(yaml_cell(c) for c in r) + ']')
            if footer:
                print('    footer: [' + ', '.join(yaml_cell(c) for c in footer) + ']')
            return
        e = self.exhibit(ex_id)
        got = e.get('rows') or []
        if len(got) != len(rows):
            self.fail(f'{ex_id}: {len(got)} rows in the case, {len(rows)} in the model')
        for i, (g, m) in enumerate(zip(got, rows)):
            if len(g) != len(m):
                self.fail(f'{ex_id} row {i + 1}: {len(g)} cells in the case, {len(m)} in the model')
                continue
            for j, (gc, mc) in enumerate(zip(g, m)):
                if not same(gc, mc):
                    self.fail(f'{ex_id} row {i + 1} ({g[0]}), column {j + 1}: case has {gc!r}, model gives {mc!r}')
        if footer is not None:
            gf = e.get('footer') or []
            if len(gf) != len(footer) or any(not same(a, b) for a, b in zip(gf, footer)):
                self.fail(f'{ex_id} footer: case has {gf!r}, model gives {footer!r}')

    def items(self, ex_id: str, expected: dict[str, str]) -> None:
        """A KPI exhibit's values must read exactly as the model writes them."""
        self.modelled.add(ex_id)
        if self.emit:
            print(f'# {ex_id}')
            for k, v in expected.items():
                print(f"      - {{ label: {k}, value: '{v}' }}")
            return
        got = {i['label']: i['value'] for i in self.exhibit(ex_id).get('items') or []}
        for label, value in expected.items():
            if got.get(label) != value:
                self.fail(f'{ex_id} item "{label}": case has {got.get(label)!r}, model gives {value!r}')
        for label in got:
            if label not in expected:
                self.fail(f'{ex_id} item "{label}" is not in the model')

    def says(self, where: str, needle: str) -> None:
        """A stated result must appear, exactly, in the named part of the case."""
        text = self.text_at(where)
        if needle not in text:
            self.fail(f'{where} should say "{needle}"')

    def text_at(self, where: str) -> str:
        node = self.data
        for part in re.findall(r'[^.\[\]]+|\[\d+\]', where):
            node = node[int(part[1:-1])] if part.startswith('[') else node[part]
        return node if isinstance(node, str) else yaml.safe_dump(node, allow_unicode=True)

    # -- every figure in the text ------------------------------------------
    def strings(self, node=None, path: str = '') -> list[tuple[str, str]]:
        node = self.data if node is None else node
        out: list[tuple[str, str]] = []
        if isinstance(node, dict):
            in_reading = path.startswith('furtherReading')
            for k, v in node.items():
                if k in SKIP_KEYS or (in_reading and k in {'source', 'location', 'title'}):
                    continue
                out += self.strings(v, f'{path}.{k}' if path else k)
        elif isinstance(node, list):
            for i, v in enumerate(node):
                out += self.strings(v, f'{path}[{i}]')
        elif isinstance(node, str):
            out.append((path, node))
        return out

    def accounted(self, value: float, decimals: int, scale: float, percent: bool) -> bool:
        base = value * scale
        step = (10 ** -decimals) * scale
        factors = (1.0,) if percent else tuple({1.0, self.scale})
        for a in self.allowed:
            for f in factors:
                r = rhu(a * f / step) * step
                if abs(r - base) <= step * 1e-6 or abs(abs(r) - base) <= step * 1e-6:
                    return True
        return False

    def scan(self) -> None:
        for path, text in self.strings():
            clean = text
            for pat in NOT_FIGURES:
                clean = pat.sub(' ', clean)
            for m in TOKEN.finditer(clean):
                raw = m.group('num')
                value = float(raw.replace(',', ''))
                decimals = len(raw.split('.')[1]) if '.' in raw else 0
                cur, suf, pct = m.group('cur'), (m.group('suf') or '').strip(), bool(m.group('pct'))
                if not cur and not suf and not pct and decimals == 0:
                    if 1900 <= value <= 2039 or value <= 12:
                        continue
                if self.accounted(value, decimals, SCALE.get(suf, 1.0), pct):
                    continue
                at = max(0, m.start() - 40)
                self.fail(f'{path}: the figure "{m.group(0).strip()}" is not accounted for by the model, near "{clean[at:m.end() + 30].strip()}"')

    def report(self) -> int:
        if self.emit:
            return 0
        # A table with figures must be rebuilt; a table of words is read by the scan below like any other text.
        tables = [e['id'] for e in self.data['exhibits'] if e.get('kind') == 'table' and any(c.get('numeric') for c in e.get('columns') or [])]
        for ex_id in tables:
            if ex_id not in self.modelled:
                self.fail(f'{ex_id}: a table exhibit the model does not rebuild')
        self.scan()
        if self.problems:
            print(f'{self.id}: {len(self.problems)} problem(s)')
            for p in self.problems:
                print(f'  {p}')
            return 1
        print(f'{self.id}: every figure accounted for ({len(self.modelled)} exhibits rebuilt, {len(self.allowed)} figures in the model)')
        return 0


def same(a, b) -> bool:
    if isinstance(a, (int, float)) and isinstance(b, (int, float)):
        return abs(float(a) - float(b)) < 1e-9
    return a == b


def yaml_cell(c) -> str:
    if isinstance(c, (int, float)):
        return str(int(c)) if float(c).is_integer() else repr(c)
    s = str(c)
    looks_numeric = re.fullmatch(r'[-+]?\d[\d_.,]*', s) is not None
    if s == '' or looks_numeric or re.search(r"[:,#\[\]{}&*!|>'\"%@`]", s) or s.strip() != s:
        return "'" + s.replace("'", "''") + "'"
    return s


MODELS: dict = {}


def case(case_id: str):
    def register(fn):
        MODELS[case_id] = fn
        return fn

    return register


# ---------------------------------------------------------------------------
# The models, one per case
# ---------------------------------------------------------------------------

@case('bellbird-home-and-garden')
def bellbird(k: Check) -> None:
    """A$000. Statements in the guide's layout; a six-month cash flow forecast; four ways to fix the overdraft."""
    years = {
        2025: dict(sales=18400, cos=11960, exp=5520, interest=120, tax=240, div=200, ppe=6800, dep=2100, cash=420, debtors=610, stock=3150, od=0, cred=1980, stl=640, ltb=1500, sc=1000),
        2026: dict(sales=21300, cos=14271, exp=6603, interest=186, tax=72, div=100, ppe=9200, dep=2642, cash=0, debtors=790, stock=4880, od=None, cred=2960, stl=640, ltb=2600, sc=1000),
    }
    stock_2024 = 2900
    pl, fp = {}, {}
    re_prev = None
    for y, s in years.items():
        gp = s['sales'] - s['cos']
        pbit = gp - s['exp']
        pbt = pbit - s['interest']
        pfp = pbt - s['tax']
        ret = pfp - s['div']
        pl[y] = [s['sales'], s['cos'], gp, s['exp'], pbit, s['interest'], pbt, s['tax'], pfp, s['div'], ret]
        nca = s['ppe'] - s['dep']
        ca = s['cash'] + s['debtors'] + s['stock']
        if y == 2025:
            cl = s['od'] + s['cred'] + s['stl']
            equity = nca + ca - cl - s['ltb']
            re = equity - s['sc']
        else:
            re = re_prev + ret  # retained earnings link the two years
            equity = s['sc'] + re
            s['od'] = nca + ca - s['cred'] - s['stl'] - s['ltb'] - equity  # the overdraft balances the statement
            cl = s['od'] + s['cred'] + s['stl']
        re_prev = re
        ta = nca + ca
        tl = cl + s['ltb']
        assert ta - tl == equity
        fp[y] = [s['ppe'], s['dep'], nca, s['cash'], s['debtors'], s['stock'], ca, ta, s['od'], s['cred'], s['stl'], cl, s['ltb'], s['ltb'], tl, ta - tl, s['sc'], re, equity]
        ce = s['ltb'] + equity
        opening = stock_2024 if y == 2025 else years[2025]['stock']
        avg = (opening + s['stock']) / 2
        k.allow(
            rhu(gp / s['sales'] * 100, 1), rhu(pbit / s['sales'] * 100, 1), rhu(pbit / ce * 100, 1), ce,
            rhu(ca / cl, 2), rhu((ca - s['stock']) / cl, 2), ca - s['stock'],
            avg, rhu(s['cos'] / avg, 2), rhu(avg / s['cos'] * 365, 1),
            rhu(s['debtors'] / s['sales'] * 365, 1), rhu(s['cred'] / s['cos'] * 365, 1), rhu(s['ltb'] / ce * 100, 1),
        )
    labels_pl = ['Sales revenue', 'Cost of sales', 'Gross profit', 'Expenses', 'Profit before interest and tax', 'Interest', 'Profit before tax', 'Tax', 'Profit for the period', 'Dividends', 'Retained profit']
    k.table('ex-1', [[lab, pl[2025][i], pl[2026][i]] for i, lab in enumerate(labels_pl)])
    labels_fp = ['Property, plant and equipment', 'Less accumulated depreciation', 'Non-current assets', 'Cash', 'Debtors', 'Stock', 'Current assets', 'Total assets',
                 'Bank overdraft', 'Trade creditors', 'Other short-term loans', 'Current liabilities', 'Long-term borrowings', 'Non-current liabilities', 'Total liabilities',
                 'Net assets', 'Share capital', 'Retained earnings', 'Total equity']
    k.table('ex-2', [[lab, fp[2025][i], fp[2026][i]] for i, lab in enumerate(labels_fp)])
    k.allow(stock_2024, years[2026]['sales'] - years[2025]['sales'], rhu((21300 / 18400 - 1) * 100, 1), years[2026]['dep'] - years[2025]['dep'], years[2026]['ppe'] - years[2025]['ppe'])

    # The cash flow forecast, July to December 2026.
    months = ['July', 'August', 'September', 'October', 'November', 'December']
    limit = 1500
    sales = [1320, 1410, 1860, 2240, 2380, 2610]
    trade = [260, 240, 270, 300, 330, 340]
    suppliers = [1180, 1330, 2190, 1580, 1480, 1630]
    wages = [330, 330, 330, 330, 330, 380]
    rent = [185] * 6
    loans = [65] * 6
    inflow = [a + b for a, b in zip(sales, trade)]
    outflow = [a + b + c + d for a, b, c, d in zip(suppliers, wages, rent, loans)]
    net = [i - o for i, o in zip(inflow, outflow)]

    def run(opening: int, nets: list[float]) -> tuple[list[float], list[float]]:
        opens, closes, bal = [], [], opening
        for n in nets:
            opens.append(bal)
            bal = bal + n
            closes.append(bal)
        return opens, closes

    opens, closes = run(-fp[2026][8], net)
    assert closes == [-1380, -1640, -2280, -1900, -1250, -560]
    k.table('ex-3', [
        ['Opening balance', *opens], ['Cash and card sales', *sales], ['Receipts from trade customers', *trade], ['Total cash inflows', *inflow],
        ['Payments to suppliers', *suppliers], ['Wages', *wages], ['Rent and other expenses', *rent], ['Loan repayments and interest', *loans],
        ['Total cash outflows', *outflow], ['Net cash flow', *net], ['Closing balance', *closes],
    ])
    k.allow(limit, sum(sales), sum(trade), sum(suppliers), sum(inflow), sum(outflow))
    over = lambda cl: sum(1 for x in cl if x < -limit)  # noqa: E731
    k.allow(*[-x - limit for x in closes if x < -limit])  # the amount each month is over the limit

    # The stores.
    stores = [
        ['Mount Gravatt', '1994', 4600, 640, 600], ['Capalaba', '2001', 3700, 470, 560], ['Indooroopilly', '2006', 3400, 420, 520],
        ['Springwood', '2011', 3100, 350, 500], ['Kedron', '2016', 2800, 290, 480], ['Coralwood', 'August 2025', 2040, -307, 420],
        ['North Lakes', 'October 2025', 1660, 63, 470],
    ]
    foot = ['Total', '', sum(r[2] for r in stores), sum(r[3] for r in stores), sum(r[4] for r in stores)]
    assert foot[2] == years[2026]['sales']
    central = foot[3] - pl[2026][4]
    warehouse = years[2026]['stock'] - foot[4]
    k.table('ex-4', stores, foot)
    k.allow(central, warehouse)
    # Coralwood's own figures for its first year.
    cw = dict(sales=2040, gp=612, wages=480, rent=324, dep=115)
    assert cw['gp'] - cw['wages'] - cw['rent'] - cw['dep'] == -307
    k.allow(*cw.values(), rhu(cw['gp'] / cw['sales'] * 100, 1), cw['sales'] - cw['gp'])

    # Stock by age.
    ages = [['Up to 90 days', 2900], ['91 to 180 days', 980], ['Over 180 days', 1000]]
    rows = [[a, v, rhu(v / years[2026]['stock'] * 100, 1)] for a, v in ages]
    k.table('ex-5', rows, ['Total', sum(r[1] for r in rows), rhu(sum(r[2] for r in rows), 1)])
    k.allow(91, 180, 90)

    # Four ways to fix the overdraft: the closing balance each month.
    leaseback = dict(price=2400, rent=216, dep_saved=60)
    package = dict(clear_aug=500, clear_sep=300, clear_cost=1000, defer=600)
    closure = dict(cost=240, sales=170, suppliers=119, wages=40, rent=27, stock=420, stock_months=3)
    equity_new = dict(cash=1500, share=20)
    assert closure['suppliers'] == rhu((cw['sales'] - cw['gp']) / 12) and closure['wages'] == cw['wages'] / 12 and closure['rent'] == cw['rent'] / 12
    monthly_saving = -closure['sales'] + closure['suppliers'] + closure['wages'] + closure['rent']
    stock_relief = closure['stock'] / closure['stock_months']
    effects = {
        'No action': [0] * 6,
        'Sale and leaseback': [0, 0, leaseback['price'], -leaseback['rent'] / 12, -leaseback['rent'] / 12, -leaseback['rent'] / 12],
        'Working capital package': [0, package['clear_aug'], package['clear_sep'] + package['defer'], 0, -package['defer'] / 2, -package['defer'] / 2],
        'Close Coralwood': [0, -closure['cost'], monthly_saving + stock_relief, monthly_saving + stock_relief, monthly_saving + stock_relief, monthly_saving],
        'New share capital': [0, 0, equity_new['cash'], 0, 0, 0],
    }
    profit = {
        'No action': 0,
        'Sale and leaseback': -leaseback['rent'] + leaseback['dep_saved'],
        'Working capital package': -(package['clear_cost'] - package['clear_aug'] - package['clear_sep']),
        'Close Coralwood': 307,
        'New share capital': 0,
    }
    rows = []
    for name, eff in effects.items():
        _, cl = run(-fp[2026][8], [n + e for n, e in zip(net, eff)])
        rows.append([name, *[rhu(x) for x in cl], profit[name]])
        low = min(cl)
        k.allow(low, over(cl), sum(eff[:3]), -low - limit if low < -limit else 0)
    k.table('ex-6', rows)
    k.allow(*leaseback.values(), *package.values(), *closure.values(), *equity_new.values(), monthly_saving, stock_relief, leaseback['rent'] / 12,
            package['clear_cost'] - package['clear_aug'] - package['clear_sep'], package['clear_aug'] + package['clear_sep'], package['defer'] / 2, 9, 60, 30)
    k.allow(rhu(leaseback['price'] * 0.09), 216)
    # Givens and simple results quoted in the text.
    k.allow(186, 24, 15, 1.5, 4180 - 2620, 5670 - 4800, 4880 - 3150, cw['gp'] - cw['wages'] - cw['rent'], sum(r[3] for r in stores[:5]), 2600 - 1500, 30, 542)


# The guide's discount factors (p. 66), as printed.
DISCOUNT = {
    4: [0.9615, 0.9246, 0.8890, 0.8548, 0.8219, 0.7903, 0.7599, 0.7307, 0.7026, 0.6756],
    6: [0.9434, 0.8900, 0.8396, 0.7921, 0.7473, 0.7050, 0.6651, 0.6271, 0.5919, 0.5584],
    8: [0.9259, 0.8573, 0.7938, 0.7350, 0.6806, 0.6302, 0.5835, 0.5403, 0.5002, 0.4632],
    10: [0.9091, 0.8264, 0.7513, 0.6830, 0.6209, 0.5645, 0.5132, 0.4665, 0.4241, 0.3855],
    20: [0.8333, 0.6944, 0.5787, 0.4823, 0.4019, 0.3349, 0.2791, 0.2326, 0.1938, 0.1615],
}


def payback(cost: float, returns: list[float]) -> tuple[float, int, float]:
    """Years (as a decimal), whole years and months, assuming each year's cash arrives evenly."""
    cum = -cost
    for t, r in enumerate(returns, 1):
        if cum + r >= 0:
            share = -cum / r
            return t - 1 + share, t - 1, share * 12
        cum += r
    raise ValueError('not paid back')


def arr(cost: float, returns: list[float]) -> float:
    return (sum(returns) - cost) / len(returns) / cost * 100


def npv(cost: float, returns: list[float], rate: int) -> float:
    return sum(r * DISCOUNT[rate][i] for i, r in enumerate(returns)) - cost


@case('quintanilla-autopartes')
def quintanilla(k: Check) -> None:
    """MX$ million. Three investment projects appraised by payback, ARR and NPV at the board's 10%."""
    pl = {2024: dict(sales=1240.0, cos=1004.4, exp=148.8, interest=9.6, div=20.0), 2025: dict(sales=1178.0, cos=978.0, exp=142.0, interest=9.6, div=15.0)}
    rows = {}
    for y, s in pl.items():
        gp = s['sales'] - s['cos']
        pbit = gp - s['exp']
        pbt = pbit - s['interest']
        tax = rhu(pbt * 0.3, 1)
        pfp = pbt - tax
        rows[y] = [rhu(x, 1) for x in (s['sales'], s['cos'], gp, s['exp'], pbit, s['interest'], pbt, tax, pfp, s['div'], pfp - s['div'])]
        k.allow(rhu(gp / s['sales'] * 100, 1), rhu(pbit / s['sales'] * 100, 1))
    labels = ['Sales revenue', 'Cost of sales', 'Gross profit', 'Expenses', 'Profit before interest and tax', 'Interest', 'Profit before tax', 'Tax', 'Profit for the period', 'Dividends', 'Retained profit']
    k.table('ex-1', [[lab, rows[2024][i], rows[2025][i]] for i, lab in enumerate(labels)])
    k.allow(rhu((1178 / 1240 - 1) * 100, 1), 30, rhu((58.0 / 86.8 - 1) * 100, 1))

    cash, loans, equity = 84.0, 96.0, 612.0
    ce = loans + equity
    k.table('ex-2', [['Cash', cash], ['Bank loans (non-current)', loans], ['Total equity', equity], ['Capital employed', ce]])
    pbit25 = rows[2025][4]
    k.allow(rhu(loans / ce * 100, 1), rhu(pbit25 / ce * 100, 1))

    # The projects: capital cost in year 0, then net cash flows.
    projects = {
        'A': (180.0, [12, 28, 42, 50, 54, 54, 50, 44], 120.0),
        'B': (90.0, [30, 28, 24, 19, 14, 8], 60.0),
        'C': (120.0, [14, 20, 24, 26, 26, 26, 26, 26], 80.0),
    }
    table = [['0 (2026)', *[-projects[p][0] for p in 'ABC']]]
    for t in range(1, 9):
        table.append([f'{t} ({2026 + t})', *[(projects[p][1][t - 1] if t <= len(projects[p][1]) else '') for p in 'ABC']])
    k.table('ex-3', table)
    k.allow(*DISCOUNT[10][:8])
    rate = 10
    for p, (cost, rets, loan) in projects.items():
        years, whole, months = payback(cost, rets)
        value = npv(cost, rets, rate)
        cum, c = [], -cost
        for r in rets:
            c += r
            cum.append(c)
        k.allow(cost, loan, cost - loan, sum(rets), rhu(years, 2), rhu(months, 1), rhu(arr(cost, rets), 1), rhu(value, 1), rhu(value + cost, 2), rhu(value + cost, 1),
                *cum, rhu((sum(rets) - cost) / len(rets), 2), sum(rets) - cost, rhu((loans + loan) / (ce + loan) * 100, 1))
    # Project A if every year's return is 30% lower, the shortfall at which its NPV is zero, and the expected NPV on the board's probabilities.
    cost_a, rets_a, _ = projects['A']
    low = [r * 0.7 for r in rets_a]
    pv_a = npv(cost_a, rets_a, rate) + cost_a
    k.allow(*[rhu(x, 1) for x in low], rhu(sum(low), 1), rhu(npv(cost_a, low, rate), 1), rhu(pv_a * 0.7, 2), rhu(pv_a * 0.7, 1), rhu(arr(cost_a, low), 1),
            rhu(payback(cost_a, low)[2], 1), 30, 70)
    shortfall = (1 - cost_a / pv_a) * 100
    k.allow(rhu(shortfall, 1), rhu(shortfall))
    expected = 0.6 * npv(cost_a, rets_a, rate) + 0.4 * npv(cost_a, low, rate)
    k.allow(rhu(expected, 1), 0.6, 0.4, 60, 40)

    sales = [
        ['Exhaust brackets and heat shields', 520, 505, 470, 430],
        ['Fuel-tank straps and fuel-line clips', 410, 400, 380, 350],
        ['Chassis and body stampings', 310, 330, 350, 360],
        ['Tooling and repairs', 30, 32, 40, 38],
    ]
    foot = ['Total', *[sum(r[i] for r in sales) for i in range(1, 5)]]
    assert foot[3] == 1240 and foot[4] == 1178
    k.table('ex-4', sales, foot)
    k.allow(rhu((430 + 350) / 1178 * 100, 1))
    index = [['2025', 100], ['2026', 94], ['2027', 85], ['2028', 74], ['2029', 62], ['2030', 50], ['2031', 40]]
    k.table('ex-6', index)
    # Givens quoted in the text.
    k.allow(420, 140, 6, 48, 20, 60, 35, 47, 6.5, 100, 18, 120, 55)


def main(argv: list[str]) -> int:
    emit = '--emit' in argv
    ids = [a for a in argv if not a.startswith('--')]
    if not ids:
        ids = sorted(p.stem for p in CASES.glob('*.yaml'))
    status = 0
    for cid in ids:
        if cid in VERIFIED_ELSEWHERE:
            print(f'{cid}: recomputed by tests/unit/cases.test.ts')
            continue
        if cid not in MODELS and not emit:
            print(f'{cid}: no model in scripts/qa/case-figures.py, so its figures are not checked')
            status = 1
            continue
        k = Check(cid, emit)
        MODELS[cid](k)
        status |= k.report()
    return status


if __name__ == '__main__':
    sys.exit(main(sys.argv[1:]))
