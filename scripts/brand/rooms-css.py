"""Writes src/styles/rooms.css: each room's accent and motif (inline SVG)."""
import sys, urllib.parse
out = sys.argv[1]

def uri(svg):
    svg = ' '.join(svg.split())
    return 'url("data:image/svg+xml,' + urllib.parse.quote(svg, safe=" =:/,.'-()") + '")'

G = '#b39350'  # gold on ivory
N = '#0b1a33'

def finance(a):
    cells = ''.join(f"<line x1='{x}' y1='0' x2='{x}' y2='300' />" for x in range(0, 421, 35)) + ''.join(f"<line x1='0' y1='{y}' x2='420' y2='{y}' />" for y in range(0, 301, 25))
    pts = '20,250 70,232 110,240 150,200 195,212 240,170 285,180 330,128 375,140 410,92'
    candles = ''.join(f"<rect x='{x-5}' y='{y}' width='10' height='{h}' />" for x, y, h in [(70,225,18),(150,190,26),(240,160,30),(330,118,26),(410,82,22)])
    return f"""<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 420 300'><g stroke='{N}' stroke-opacity='.07' stroke-width='1'>{cells}</g><g fill='{a}' fill-opacity='.22'>{candles}</g><polyline points='{pts}' fill='none' stroke='{a}' stroke-opacity='.75' stroke-width='2.4' stroke-linejoin='round'/><circle cx='410' cy='92' r='5' fill='{a}'/><g fill='{N}' fill-opacity='.25' font-family='Inter,sans-serif' font-size='11'><text x='12' y='18'>REVENUE</text><text x='12' y='292'>Q1</text><text x='392' y='292'>Q4</text></g></svg>"""

def strategy(a):
    return f"""<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 420 300'><g fill='none' stroke='{N}' stroke-opacity='.18'><rect x='60' y='30' width='300' height='240'/><line x1='210' y1='30' x2='210' y2='270'/><line x1='60' y1='150' x2='360' y2='150'/></g><g fill='none' stroke='{a}' stroke-width='2' stroke-opacity='.7'><path d='M40 290 L60 270 M380 10 L360 30'/><circle cx='285' cy='88' r='34'/><circle cx='140' cy='205' r='18'/><path d='M140 205 Q200 140 285 88' stroke-dasharray='5 6'/></g><g fill='{a}'><circle cx='285' cy='88' r='5'/><circle cx='140' cy='205' r='4'/><circle cx='305' cy='214' r='4' fill-opacity='.5'/><circle cx='118' cy='96' r='4' fill-opacity='.5'/></g><g fill='{N}' fill-opacity='.3' font-family='Inter,sans-serif' font-size='10' letter-spacing='1.5'><text x='64' y='22'>OPTIONS</text><text x='300' y='290'>RISK</text></g></svg>"""

def market(a):
    dots = [(120,90,14),(170,140,9),(260,70,20),(300,190,11),(90,210,8),(230,220,16),(330,120,7)]
    d = ''.join(f"<circle cx='{x}' cy='{y}' r='{r}' />" for x, y, r in dots)
    return f"""<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 420 300'><g stroke='{N}' stroke-opacity='.22' fill='none'><line x1='30' y1='150' x2='390' y2='150'/><line x1='210' y1='20' x2='210' y2='280'/><circle cx='260' cy='70' r='46' stroke='{a}' stroke-opacity='.55' stroke-dasharray='3 5'/><circle cx='260' cy='70' r='76' stroke='{a}' stroke-opacity='.3' stroke-dasharray='3 5'/></g><g fill='{a}' fill-opacity='.26' stroke='{a}' stroke-opacity='.7'>{d}</g><g fill='{N}' fill-opacity='.3' font-family='Inter,sans-serif' font-size='10' letter-spacing='1.5'><text x='336' y='142'>PRICE</text><text x='216' y='30'>QUALITY</text></g></svg>"""

def people(a):
    nodes = [(210,60),(110,150),(210,150),(310,150),(60,240),(150,240),(250,240),(350,240)]
    lines = "M210 60 L110 150 M210 60 L210 150 M210 60 L310 150 M110 150 L60 240 M110 150 L150 240 M210 150 L250 240 M310 150 L350 240 M110 150 L210 150 M210 150 L310 150"
    n = ''.join(f"<circle cx='{x}' cy='{y}' r='{14 if i == 0 else 10}' />" for i, (x, y) in enumerate(nodes))
    return f"""<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 420 300'><g fill='none' stroke='{a}' stroke-opacity='.35'><circle cx='210' cy='150' r='128' stroke-dasharray='2 6'/><circle cx='210' cy='150' r='92' stroke-dasharray='2 6'/></g><path d='{lines}' fill='none' stroke='{N}' stroke-opacity='.25' stroke-width='1.4'/><g fill='#fbf8f1' stroke='{a}' stroke-width='2' stroke-opacity='.8'>{n}</g><circle cx='210' cy='60' r='5' fill='{a}'/></svg>"""

def operations(a):
    boxes = ''.join(f"<rect x='{x}' y='118' width='56' height='44' rx='2' />" for x in (30, 130, 230, 330))
    arrows = ''.join(f"<path d='M{x+56} 140 h40 m-8 -6 l8 6 l-8 6' />" for x in (30, 130, 230))
    return f"""<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 420 300'><g fill='none' stroke='{N}' stroke-opacity='.25' stroke-width='1.5'>{boxes}</g><g fill='none' stroke='{a}' stroke-width='2' stroke-opacity='.8'>{arrows}</g><g fill='none' stroke='{N}' stroke-opacity='.14'><line x1='20' y1='220' x2='400' y2='220'/><line x1='20' y1='232' x2='400' y2='232'/></g><g fill='{a}' fill-opacity='.35'>{''.join(f"<rect x='{x}' y='206' width='18' height='14' />" for x in range(40, 400, 52))}</g><g fill='none' stroke='{a}' stroke-opacity='.5'><circle cx='358' cy='60' r='26'/><circle cx='358' cy='60' r='8'/></g></svg>"""

def enterprise(a):
    grid = ''.join(f"<line x1='{x}' y1='0' x2='{x}' y2='300' />" for x in range(0, 421, 20)) + ''.join(f"<line x1='0' y1='{y}' x2='420' y2='{y}' />" for y in range(0, 301, 20))
    canvas = "<rect x='40' y='40' width='340' height='220'/><line x1='108' y1='40' x2='108' y2='200'/><line x1='176' y1='40' x2='176' y2='200'/><line x1='244' y1='40' x2='244' y2='200'/><line x1='312' y1='40' x2='312' y2='200'/><line x1='40' y1='200' x2='380' y2='200'/><line x1='210' y1='200' x2='210' y2='260'/><line x1='108' y1='120' x2='176' y2='120'/><line x1='244' y1='120' x2='312' y2='120'/>"
    return f"""<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 420 300'><g stroke='{a}' stroke-opacity='.1'>{grid}</g><g fill='none' stroke='{N}' stroke-opacity='.3' stroke-width='1.5'>{canvas}</g><g fill='{a}' fill-opacity='.5'><rect x='190' y='70' width='26' height='18'/><rect x='56' y='150' width='20' height='14'/><rect x='330' y='92' width='22' height='16'/></g></svg>"""

def boardroom(a):
    chairs = ''.join(f"<rect x='{x}' y='62' width='26' height='14' rx='3'/><rect x='{x}' y='224' width='26' height='14' rx='3'/>" for x in range(90, 331, 48))
    return f"""<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 420 300'><rect x='70' y='90' width='280' height='120' rx='60' fill='none' stroke='{a}' stroke-opacity='.7' stroke-width='2'/><rect x='92' y='110' width='236' height='80' rx='40' fill='none' stroke='{N}' stroke-opacity='.15'/><g fill='{N}' fill-opacity='.18'>{chairs}<rect x='30' y='138' width='14' height='26' rx='3'/><rect x='376' y='138' width='14' height='26' rx='3'/></g><polyline points='140,170 175,158 205,164 240,140 280,130' fill='none' stroke='{a}' stroke-width='2'/></svg>"""

def cases(a):
    cols = ''
    for cx in (40, 160, 280):
        cols += f"<rect x='{cx}' y='70' width='100' height='8' />" + ''.join(f"<rect x='{cx}' y='{y}' width='{100 if (y // 14) % 4 else 72}' height='3' />" for y in range(92, 270, 14))
    return f"""<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 420 300'><rect x='40' y='28' width='340' height='22' fill='{a}' fill-opacity='.7'/><g fill='{N}' fill-opacity='.16'>{cols}</g><line x1='150' y1='62' x2='150' y2='280' stroke='{N}' stroke-opacity='.15'/><line x1='270' y1='62' x2='270' y2='280' stroke='{N}' stroke-opacity='.15'/></svg>"""

def assessment(a):
    rules = ''.join(f"<line x1='40' y1='{y}' x2='390' y2='{y}' />" for y in range(60, 291, 24))
    return f"""<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 420 300'><g stroke='{N}' stroke-opacity='.12'>{rules}</g><line x1='80' y1='20' x2='80' y2='300' stroke='{a}' stroke-opacity='.5'/><path d='M300 120 l22 22 l46 -58' fill='none' stroke='{a}' stroke-width='4' stroke-linecap='round' stroke-linejoin='round' stroke-opacity='.75'/><g fill='{N}' fill-opacity='.3' font-family='Inter,sans-serif' font-size='11'><text x='48' y='54'>[10]</text><text x='48' y='126'>[4]</text></g></svg>"""

# accent: rules and marks; text: an AA-safe shade of it on ivory (checked by scripts/qa/contrast.mjs)
ROOMS = [
  ('finance', '#2f6f5e', '#2b6a59', finance, 'Finance Desk: a spreadsheet grid and a market line'),
  ('strategy', '#2f55e4', '#2448d0', strategy, 'Strategy Studio: a matrix of options and the path between them'),
  ('market', '#6b4c8a', '#5f4380', market, 'Market Studio: a positioning map with a target segment'),
  ('people', '#9a5b3f', '#8a4f35', people, 'People and Culture: an organization of connected people'),
  ('operations', '#3b6f8f', '#33617d', operations, 'Operations Floor: a process line and a conveyor'),
  ('enterprise', '#b8862f', '#76591f', enterprise, 'Entrepreneurship Lab: a blueprint and a canvas'),
  ('boardroom', '#b39350', '#76591f', boardroom, 'Boardroom: the table and the trend on it'),
  ('cases', '#7a2e2e', '#7a2e2e', cases, 'Case Vault: an editorial page of columns'),
  ('assessment', '#1d3cb4', '#1d3cb4', assessment, 'Assessment Centre: a ruled answer page'),
]

css = ["""/*
  Room identities. Each learning environment sets data-room on the body
  (BaseLayout's room prop). A room keeps the platform's palette, type and
  components, and adds its own accent and motif, so moving between rooms
  feels like moving between the departments of one institution rather than
  between copies of one template.

  --room-accent       the room's signature colour, for rules, markers and figures
  --room-accent-text  a shade of it that passes WCAG AA as text on ivory
  --room-motif        the room's drawing, behind the page intro (decorative)

  Generated by scripts/brand/rooms-css.py; edit the script, not this file.
*/
body[data-room] {
  --room-accent: var(--gold-500);
  --room-accent-text: var(--brass-text);
  --room-motif: none;
}
"""]
for rid, accent, text, fn, note in ROOMS:
    css.append(f"/* {note} */\nbody[data-room=\"{rid}\"] {{\n  --room-accent: {accent};\n  --room-accent-text: {text};\n  --room-motif: {uri(fn(accent))};\n}}\n")

css.append("""/* A hairline in the room's colour under the header says where you are. */
body[data-room] .site-header {
  border-bottom-color: transparent;
  box-shadow: inset 0 -2px 0 var(--room-accent);
}

/* The page intro (and a room's own intro) carries the room's drawing on its right, and its colour on the kicker. */
body[data-room] .page-intro,
body[data-room] .room-intro {
  position: relative;
  isolation: isolate;
}

body[data-room] .page-intro::after,
body[data-room] .room-intro::after {
  content: "";
  position: absolute;
  top: 50%;
  right: 0;
  z-index: -1;
  width: min(42%, 30rem);
  aspect-ratio: 7 / 5;
  background: var(--room-motif) no-repeat center / contain;
  transform: translateY(-46%);
  pointer-events: none;
}

body[data-room] .page-intro h1,
body[data-room] .page-intro__lead,
body[data-room] .room-intro__text {
  max-width: min(36rem, 58%);
}

body[data-room] .page-intro__kicker {
  display: inline-flex;
  align-items: center;
  gap: 0.55rem;
  color: var(--room-accent-text);
}

body[data-room] .page-intro__kicker::before {
  content: "";
  width: 0.6rem;
  height: 0.6rem;
  background: var(--room-accent);
}

/* Section heads in a room take its colour on their opening rule and number. */
body[data-room] .sec-head::before {
  background: var(--room-accent);
}

body[data-room] .sec-head__no {
  color: var(--room-accent-text);
}

body[data-room] .band--ink .sec-head::before {
  background: var(--gold-400);
}

body[data-room] .band--ink .sec-head__no {
  color: var(--gold-400);
}

@media (max-width: 52rem) {
  /* On narrow screens the drawing would sit behind the text: the colour carries the identity instead. */
  body[data-room] .page-intro::after,
  body[data-room] .room-intro::after {
    display: none;
  }

  body[data-room] .page-intro h1,
  body[data-room] .page-intro__lead,
  body[data-room] .room-intro__text {
    max-width: none;
  }
}

@media print {
  body[data-room] .page-intro::after,
  body[data-room] .room-intro::after {
    display: none;
  }
}
""")
open(out, 'w').write('\n'.join(css))
print('wrote', out)
