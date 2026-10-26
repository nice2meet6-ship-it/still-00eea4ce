/* Still — 필름 카메라 웹앱 (필카 모드 + 디카 모드) */
(() => {
const $ = s => document.querySelector(s);
const $$ = s => [...document.querySelectorAll(s)];
const app = $('.app'), vf = $('.vf'), scene = $('#scene'), grainEl = $('#grain'), vigEl = $('.vig'), gridEl = $('.grid');
const sleep = ms => new Promise(r => setTimeout(r, ms));
const DIAG = location.search.includes('diag');
/* 필카 앱 / 디카 앱 분리: 페이지가 window.STILL_APP 으로 지정 */
const BUILD = '20261026e';
const APP = window.STILL_APP === 'digital' ? 'digital' : 'film';
const SRC = (document.currentScript && document.currentScript.src) || location.href;

/* ═════════ 필름 정의 (실제 필름의 분위기를 참고한 근사값 — 미리보기 CSS와 저장 픽셀 처리가 같은 값을 씀) ═════════ */
const FILMS = [
  { id: 'portra400', mk: 'KODAK', n: 'PORTRA 400', iso: 400, col: '#e8b923', d: '부드러운 파스텔 · 따뜻한 인물 톤',
    gray: 0, sat: .9, con: .96, sep: .14, hue: -3, bri: 1.05, fa: .05, fc: [255, 238, 220], g: .2, v: .25 },
  { id: 'gold200', mk: 'KODAK', n: 'GOLD 200', iso: 200, col: '#f2c200', d: '노란빛 따뜻함 · 추억의 일상 색',
    gray: 0, sat: 1.12, con: 1.06, sep: .32, hue: -10, bri: 1.05, fa: .04, fc: [255, 225, 160], g: .32, v: .35 },
  { id: 'ektar100', mk: 'KODAK', n: 'EKTAR 100', iso: 100, col: '#d9262c', d: '쨍한 채도 · 고운 입자의 풍경용',
    gray: 0, sat: 1.38, con: 1.16, sep: .04, hue: 0, bri: 1.02, fa: 0, fc: [0, 0, 0], g: .08, v: .25 },
  { id: 'trix400', mk: 'KODAK', n: 'TRI-X 400', iso: 400, col: '#3a3a3a', d: '거칠고 진한 흑백 · 다큐 감성',
    gray: 1, sat: 1, con: 1.32, sep: 0, hue: 0, bri: 1.02, fa: .04, fc: [235, 235, 235], g: .65, v: .45 },
  { id: 'superia400', mk: 'KODAK', n: 'ULTRAMAX 400', iso: 400, col: '#2e9b4f', d: '초록·청록이 도는 시원한 일상 스냅 색',
    gray: 0, sat: 1.15, con: 1.1, sep: 0, hue: 7, bri: 1, fa: .05, fc: [190, 235, 215], g: .36, v: .35 },
  { id: 'velvia50', mk: 'KODAK', n: 'EKTACHROME E100', iso: 100, col: '#7a3b8f', d: '극강 채도 · 선명한 대비의 슬라이드',
    gray: 0, sat: 1.55, con: 1.22, sep: 0, hue: -2, bri: .98, fa: 0, fc: [0, 0, 0], g: .06, v: .3 },
  { id: 'hp5', mk: 'ILFORD', n: 'HP5 PLUS 400', iso: 400, col: '#cfcfcf', d: '부드러운 계조의 클래식 흑백',
    gray: 1, sat: 1, con: 1.1, sep: 0, hue: 0, bri: 1.03, fa: .06, fc: [225, 225, 225], g: .5, v: .4 },
  { id: 'cs800t', mk: 'CINESTILL', n: '800T', iso: 800, col: '#2b6e86', d: '청록 그림자 · 야간 시네마 색',
    gray: 0, sat: 1.05, con: 1.15, sep: 0, hue: 16, bri: .95, fa: .1, fc: [25, 70, 95], g: .5, v: .5 },
  { id: 'lomo800', mk: 'LOMOGRAPHY', n: 'COLOR NEG 800', iso: 800, col: '#e6542b', d: '과감한 비네팅 · 장난기 있는 진한 색',
    gray: 0, sat: 1.25, con: 1.22, sep: .15, hue: -8, bri: 1, fa: 0, fc: [0, 0, 0], g: .55, v: .65 },
];
const byId = id => FILMS.find(f => f.id === id) || FILMS[0];
const RATIOS = [{ l: '3:2', a: 2 / 3 }, { l: '4:3', a: 3 / 4 }, { l: '1:1', a: 1 }, { l: '16:9', a: 9 / 16 }];
const ZOOMS = [1, 2, 4];
const SKINS = [
  { id: 'pfun', n: '일회용 카메라' }, { id: 'pzbr', n: '블랙 SLR' },
];
/* 보류/제외된 스킨 → 현재 스킨으로 대체 */
const HOLD = { chrome: 'pzbr', black: 'pzbr', m3: 'pzbr', px700: 'pzbr', pzs: 'pzbr', pzb: 'pzbr', pslr: 'pzbr', px700r: 'pzbr', pzsr: 'pzbr', pslrr: 'pzbr', databack: 'pzbr', classic: 'pzbr', xclassic: 'pzbr', kodak: 'pfun', pfun2: 'pfun' };
const DEV_OPTS = [{ l: '즉시', ms: 0 }, { l: '1시간', ms: 36e5 }, { l: '6시간', ms: 216e5 }, { l: '24시간', ms: 864e5 }];

/* ═════════ 저장되는 설정 ═════════ */
const LS = 'still.' + APP;
const readLS = k => { try { return JSON.parse(localStorage.getItem(k) || 'null'); } catch { return null; } };
const cfg = Object.assign({ mode: null, sound: true, dev: 0, roll: null, seq: 1, skin: 'classic', rot: 'auto', stamp: true, leak: APP === 'film' ? 1 : 0, dust: APP === 'film' ? 1 : 0 }, readLS(LS) || readLS('still.v2') || {});
cfg.mode = APP;
if (!['left', 'right'].includes(cfg.rot)) cfg.rot = 'left';
const save = () => { try { localStorage.setItem(LS, JSON.stringify(cfg)); } catch {} };
const st = { facing: 'environment', zoom: 1, ev: 0, ratio: 0, f: 0, timer: 0, grid: true, torch: false };
if (APP === 'digital') { const i = FILMS.findIndex(f => f.id === cfg.lastFilm); if (i >= 0) st.f = i; }
let stream = null, pending = 0, jobs = Promise.resolve();

const cssFilter = (f, ev) =>
  `grayscale(${f.gray}) saturate(${f.sat}) contrast(${f.con}) sepia(${f.sep}) hue-rotate(${f.hue}deg) brightness(${(f.bri * 2 ** ev).toFixed(3)})`;

/* ═════════ 소리 (WebAudio 합성) ═════════ */
let ac;
const AC = () => ac || (ac = new (window.AudioContext || window.webkitAudioContext)());
const unlock = () => { try { AC().resume(); } catch {} };
['pointerdown', 'touchstart', 'click'].forEach(ev => document.addEventListener(ev, unlock, { passive: true }));
function burst(t, dur, freq, q, gain) {
  if (!cfg.sound) return;
  try {
    const c = AC(), n = Math.max(1, Math.floor(c.sampleRate * dur)), buf = c.createBuffer(1, n, c.sampleRate), d = buf.getChannelData(0);
    for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / n, 2);
    const s = c.createBufferSource(); s.buffer = buf;
    const f = c.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = freq; f.Q.value = q;
    const g = c.createGain(); g.gain.value = gain;
    s.connect(f); f.connect(g); g.connect(c.destination); s.start(c.currentTime + t);
  } catch {}
}
function thump(t, freq, dur, gain) {
  if (!cfg.sound) return;
  try {
    const c = AC(), o = c.createOscillator(), g = c.createGain();
    o.frequency.setValueAtTime(freq, c.currentTime + t); o.frequency.exponentialRampToValueAtTime(freq * .5, c.currentTime + t + dur);
    g.gain.setValueAtTime(gain, c.currentTime + t); g.gain.exponentialRampToValueAtTime(.001, c.currentTime + t + dur);
    o.connect(g); g.connect(c.destination); o.start(c.currentTime + t); o.stop(c.currentTime + t + dur);
  } catch {}
}
const sKodakShutter = () => { burst(0, .035, 2200, 1.2, .9); thump(0, 140, .06, .5); burst(.075, .05, 1300, 1, .75); thump(.075, 100, .07, .4); };
const sKodakTick = () => { burst(0, .007, 6000, 6, .5); burst(.003, .012, 3300, 4, .28); };
/* 클래식: 부드러운 금속 셔터 + 레버 한 번 '끼릭' */
const sClassicShutter = () => { burst(0, .05, 1100, .9, .8); thump(0, 90, .09, .6); burst(.045, .07, 700, .8, .55); thump(.05, 70, .1, .45); };
const sKkirik = () => { burst(0, .012, 4300, 4, .5); thump(0, 320, .03, .16); burst(.085, .024, 2700, 3, .65); thump(.085, 220, .04, .2); burst(.15, .012, 5200, 5, .3); };
const sKodakWindEnd = () => { burst(0, .04, 1400, 2, .7); thump(0, 260, .06, .4); burst(.07, .012, 5200, 5, .5); burst(.1, .02, 2600, 3, .4); };

if (HOLD[cfg.skin]) cfg.skin = HOLD[cfg.skin];
const isKodak = () => cfg.skin === 'pfun' || cfg.skin === 'pfun2';
const sShut = () => (isKodak() ? sKodakShutter : sClassicShutter)();
const sWindDone = () => (isKodak() ? sKodakWindEnd : sKkirik)();
const sTick = sKodakTick;

/* ═════════ DOM 보강 ═════════ */
const video = document.createElement('video');
video.id = 'cam2'; video.setAttribute('playsinline', ''); video.muted = true; video.autoplay = true;
Object.assign(video.style, { position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', display: 'none', transition: 'filter .2s' });
vf.insertBefore(video, vf.firstChild);

const fadeEl = document.createElement('div'); fadeEl.className = 'fadeov'; vf.insertBefore(fadeEl, grainEl);

const bars = ['T', 'B', 'L', 'R'].map(() => { const b = document.createElement('div'); b.className = 'bar'; vf.appendChild(b); return b; });
const [barT, barB, barL, barR] = bars;
Object.assign(barT.style, { top: 0, left: 0, right: 0 }); Object.assign(barB.style, { bottom: 0, left: 0, right: 0 });
Object.assign(barL.style, { left: 0, top: 0, bottom: 0 }); Object.assign(barR.style, { right: 0, top: 0, bottom: 0 });
const aspectNow = () => { const a = RATIOS[st.ratio].a; return vf.clientWidth > vf.clientHeight ? 1 / a : a; };

const toastEl = document.createElement('div'); toastEl.className = 'toast'; app.appendChild(toastEl);
const msgEl = document.createElement('div'); msgEl.className = 'msg'; app.appendChild(msgEl);
const flashEl = document.createElement('div'); flashEl.className = 'shotflash'; app.appendChild(flashEl);
const cdEl = document.createElement('div'); cdEl.className = 'countdown'; app.appendChild(cdEl);
$('.dial .ticks').insertAdjacentHTML('beforeend', '<div class="mk"></div>');
const mk = $('.dial .mk');
const readout = $('.readout');
let toastT;
function toast(t, ms = 1800) { toastEl.textContent = t; toastEl.classList.add('on'); clearTimeout(toastT); toastT = setTimeout(() => toastEl.classList.remove('on'), ms); }

/* 공용 모달 */
function modal(html, buttons) {
  return new Promise(res => {
    const m = document.createElement('div'); m.className = 'mdl';
    m.innerHTML = `<div class="mbox">${html}<div class="mbtn ${buttons.length > 2 ? "col" : ""}">${buttons.map((b, i) => `<button data-i="${i}" class="${b.cls || ''}">${b.t}</button>`).join('')}</div></div>`;
    m.addEventListener('click', e => { const b = e.target.closest('button'); if (b) { m.remove(); res(+b.dataset.i); } });
    app.appendChild(m);
  });
}

/* ═════════ 필름 카메라 UI 생성 ═════════ */
const filmEl = document.createElement('div'); filmEl.className = 'film';
filmEl.innerHTML = `
  <div class="shell">
    <div class="cambody">
    <div class="plate2">
      <span class="pt">STILL</span>
      <div class="cnt"><b id="fcount">--</b><small>EXP</small></div>
      <div class="eye"><div class="vfwin" id="vfwin"><div class="vfframe"></div></div></div>
      <div class="onsw"><i></i><small>ON</small></div>
    </div>
    <div class="memo"><div class="mwin"><div class="lbl" id="mlbl">
      <div class="lt"><small id="mmk">MOCHI</small><em id="mkind">COLOR NEGATIVE FILM</em></div>
      <div class="lm"><b id="mnm">PEACH</b><i id="miso">400</i></div>
      <div class="lb"><span>PROFESSIONAL</span><span id="mex">24 EXP</span></div>
    </div></div><div class="cart35" id="cart35"></div><div class="strip35" id="strip35"></div></div>
    <div class="deco"><span>휠을 오른쪽으로 굴려 감기</span><span>셔터 누르기</span><span>필름 끝나면 현상</span></div>
    <div class="lvz" id="lvz"><div class="groove"></div><div class="armw"><div class="armp"><div class="arm" id="arm"><svg viewBox="0 0 140 48" xmlns="http://www.w3.org/2000/svg"><defs><linearGradient id="lvA" x1="0" y1="0" x2="0" y2="1"><stop offset="0" style="stop-color:var(--pd1)"/><stop offset=".45" style="stop-color:var(--pd2)"/><stop offset="1" style="stop-color:var(--pd3)"/></linearGradient><linearGradient id="lvP" x1="0" y1="0" x2="0" y2="1"><stop offset="0" style="stop-color:var(--tb1)"/><stop offset="1" style="stop-color:var(--tb2)"/></linearGradient></defs><path d="M24 8 L118 11 Q134 12.5 134 24 Q134 35.5 118 37 L24 40 Z" fill="url(#lvA)" stroke="#050505" stroke-width="1.6" stroke-linejoin="round"/><path d="M30 11 L116 13.5" fill="none" stroke="#fff" stroke-opacity=".38" stroke-width="1.4" stroke-linecap="round"/><path d="M98 11.6 L118 11.2 Q132 12.5 132 24 Q132 35.5 118 36.8 L98 36.4 Z" fill="url(#lvP)" stroke="#050505" stroke-opacity=".5" stroke-width="1"/><g stroke="#000" stroke-opacity=".45" stroke-width="1.2"><path d="M106 14V34M112 13.5V34.5M118 13V35M124 13.6V34.4"/></g><g stroke="#fff" stroke-opacity=".22" stroke-width=".9"><path d="M107.4 14V34M113.4 13.5V34.5M119.4 13V35M125.4 13.6V34.4"/></g></svg></div></div></div><div class="pivot" id="pivot"><svg viewBox="0 0 70 70" xmlns="http://www.w3.org/2000/svg"><defs><radialGradient id="lvH" cx=".35" cy=".3" r=".85"><stop offset="0" style="stop-color:var(--ar1)"/><stop offset=".6" style="stop-color:var(--ar2)"/><stop offset="1" style="stop-color:var(--ar3)"/></radialGradient></defs><circle cx="35" cy="35" r="33" fill="url(#lvH)" stroke="#0a0a0a" stroke-width="1.6"/><circle cx="35" cy="35" r="27" fill="none" stroke="#000" stroke-opacity=".35"/><circle cx="35" cy="35" r="21.5" fill="url(#lvH)" stroke="#0a0a0a" stroke-width="1.3" stroke-dasharray="2.2 1.6"/><circle cx="35" cy="35" r="13" fill="url(#lvH)" stroke="#000" stroke-opacity=".6"/><rect x="24" y="33.6" width="22" height="2.8" rx="1" fill="#1a1a1a" transform="rotate(-32 35 35)"/></svg></div><span class="wst" id="wst2"></span></div>
    <div class="wslot" id="wslot"><span class="tk"></span><div class="lever" id="lever"><b>WIND</b></div><div class="rw" id="rw"><div class="rid"></div></div><span class="wst" id="wst">WIND</span></div>
    <div class="fshut" id="fshut" role="button" aria-label="셔터"><b></b></div>
    </div>
    <button class="screw" id="bsec" aria-label="뒷덮개"></button>
  </div>`;
app.appendChild(filmEl);
const vfwin = $('#vfwin');
/* 뷰파인더 창(vfwin)은 크기·모양 고정. 실제 촬영 화면은 그 안의 vfview에 방향대로(가로 3:2 / 세로 2:3) 들어간다 */
const vfview = document.createElement('div'); vfview.className = 'vfview'; vfwin.appendChild(vfview); vfview.appendChild($('#vfwin .vfframe'));

/* ═════════ 화면 갱신 ═════════ */
const isFilm = () => cfg.mode === 'film';
function render() {
  if (isFilm()) { video.style.filter = ''; return; }
  const f = FILMS[st.f];
  if (cfg.lastFilm !== f.id) { cfg.lastFilm = f.id; save(); }
  const css = cssFilter(f, st.ev);
  scene.style.filter = css; video.style.filter = css;
  fadeEl.style.background = `rgba(${f.fc[0]},${f.fc[1]},${f.fc[2]},${f.fa})`;
  grainEl.style.opacity = f.g;
  vigEl.style.background = `radial-gradient(ellipse at center,transparent 55%,rgba(0,0,0,${f.v}))`;
  gridEl.style.display = st.grid ? '' : 'none';
  const mir = st.facing === 'user' ? -1 : 1;
  video.style.transform = `scale(${mir * st.zoom},${st.zoom})`;
  scene.style.transform = `scale(${st.zoom})`;
  const r = RATIOS[st.ratio];
  $('.ratio').textContent = r.l;
  const A = aspectNow(), VW = vf.clientWidth, VH = vf.clientHeight;
  let hy = 0, hx = 0;
  if (A > VW / VH) hy = (VH - VW / A) / 2; else hx = (VW - VH * A) / 2;
  barT.style.height = barB.style.height = Math.max(0, hy) + 'px';
  barL.style.width = barR.style.width = Math.max(0, hx) + 'px';
  readout.innerHTML = `<span>${f.n}</span><span>EV <b>${(st.ev >= 0 ? '+' : '') + st.ev.toFixed(1)}</b></span><span>${st.zoom}×</span><span>${r.l}</span>`;
  mk.style.left = ((st.ev + 2) / 4 * 100) + '%';
  $$('.filters [data-i]').forEach(d => d.classList.toggle('on', +d.dataset.i === st.f));
  $('.zoom').innerHTML = ZOOMS.map(z => `<span class="${z === st.zoom ? 'on' : ''}" data-z="${z}">${z}${z === 1 ? '×' : ''}</span>`).join('');
  const ics = $$('.top .ic');
  ics[1].dataset.v = st.torch ? 'ON' : '';
  ics[2].dataset.v = st.timer ? st.timer + 's' : '';
  ics[0].dataset.v = st.grid ? '' : 'OFF';
  if (typeof syncCards === 'function') syncCards();
}

function applyMode() {
  app.classList.toggle('m-film', isFilm());
  if (isFilm()) layoutFilm();
  else { app.classList.remove('portrait'); vf.insertBefore(video, vf.firstChild); vf.insertBefore(scene, fadeEl); }
  video.play && video.play().catch(() => {});
  if (isFilm()) { st.zoom = 1; st.ev = 0; }
  render(); filmRender();
}

/* 필름 모드 레이아웃: 스킨은 항상 가로 무대(852×393) 하나. 화면에 맞춰 크기만 조절하고,
   폰을 세로로 들면 뷰파인더 창만 세로 모양으로 바뀐다 (폰 카메라 화면이 뷰파인더 안으로 축소되는 방식) */
const vfHost = () => (isFilm() ? vfview : vf);
/* 스킨 완전 고정: 센서·화면 각도 추측을 쓰지 않는다.
   iPhone '세로 방향 잠금'을 켜 두면 화면이 절대 돌아가지 않으므로, 스킨을 항상 같은 각도(오른손 +90° / 왼손 -90°)로만 그린다.
   잠금이 꺼져 화면이 가로로 돌아가 있으면 안내를 띄운다(원하면 '그냥 쓰기'). */
const pageLandscape = () => innerWidth > innerHeight;
let allowLandscape = false;
const stageRot = () => (pageLandscape() ? 0 : (cfg.rot === 'right' ? -90 : 90));
const lockMsg = document.createElement('div'); lockMsg.className = 'msg lockmsg'; lockMsg.style.zIndex = 70;
lockMsg.innerHTML = '<p><b>📱 화면 방향 잠금이 필요해요</b><br><br>① 폰을 <b>세로로 든 상태</b>에서<br>② 제어센터에서 방향 잠금(자물쇠 ↻)을 켠 뒤<br>③ 폰을 가로로 눕혀 주세요<br><br>그러면 스킨이 절대 움직이지 않고 고정돼요.</p><button id="lmok">그냥 쓰기</button>';
app.appendChild(lockMsg);
lockMsg.querySelector('#lmok').onclick = () => { allowLandscape = true; layoutFilm(); };

function layoutFilm() {
  if (!isFilm()) { app.classList.remove('portrait'); lockMsg.classList.remove('on'); return; }
  const vw = innerWidth, vh = innerHeight, rot = stageRot(), sideways = Math.abs(rot) === 90;
  app.classList.toggle('portrait', !sideways && vh > vw);
  lockMsg.classList.toggle('on', pageLandscape() && !allowLandscape);
  const s = sideways ? Math.min(vw / 393, vh / 852) : Math.min(vw / 852, vh / 393);
  app.style.setProperty('--ss', s.toFixed(4)); app.style.setProperty('--sr', rot + 'deg');
  app.style.setProperty('--sy', (vh / 2 - 196.5).toFixed(1) + 'px');
  app.style.setProperty('--vfa', '3/2');
  if (video.parentNode !== vfview) vfview.insertBefore(video, vfview.firstChild);
  if (scene.parentNode !== vfview) vfview.insertBefore(scene, video.nextSibling);
  /* 영상은 늘 똑바로(스킨이 돌아가 있어도 영상은 돌아가지 않게 반대로 상쇄) */
  if (rot) Object.assign(video.style, { inset: 'auto', left: '50%', top: '50%',
    width: (sideways ? vfview.clientHeight : vfview.clientWidth) + 'px', height: (sideways ? vfview.clientWidth : vfview.clientHeight) + 'px',
    transform: `translate(-50%,-50%) rotate(${-rot}deg)` });
  else Object.assign(video.style, { inset: '0', left: '0px', top: '0px', width: '100%', height: '100%', transform: '' });
  video.play && video.play().catch(() => {});
}

/* ═════════ 필름 카메라: 롤 상태 · 카운터 · 와인딩 레버 ═════════ */
/* 스킨(무대)이 90° 돌아가 있어도 손가락 움직임을 '스킨 기준 좌→우'로 변환 */
const innerScale = () => { const cb = filmEl.querySelector('.cambody'); if (!cb) return 1; const m = getComputedStyle(cb).transform; if (!m || m === 'none') return 1; try { return new DOMMatrix(m).a || 1; } catch { return 1; } };
const stageVec = (dx, dy) => {
  const th = (parseFloat(app.style.getPropertyValue('--sr')) || 0) * Math.PI / 180, sc = (parseFloat(app.style.getPropertyValue('--ss')) || 1) * innerScale();
  return { x: (dx * Math.cos(th) + dy * Math.sin(th)) / sc, y: (-dx * Math.sin(th) + dy * Math.cos(th)) / sc };
};

/* 필름 카트리지 + 필름 스트립 창 (레인지파인더 스킨 3종의 '필름 보는 창') */
function cartSvg(f, total) {
  const n = parseInt(f.col.slice(1), 16), lum = (.299 * (n >> 16) + .587 * ((n >> 8) & 255) + .114 * (n & 255)) / 255;
  const tc = lum > .62 ? '#141414' : '#fff', bw = f.gray === 1;
  const name = f.n.replace(/\s*E?\d+$/, '').replace('PLUS', '+').trim();
  const nm = name.length > 9 ? name.slice(0, 9) : name;
  const base = bw ? '#4a4a48' : '#8a4a16', hole = '#0b0a08';
  const tints = bw ? ['#d6d6d0', '#b9b9b3', '#e4e4de'] : ['#6e9bc2', f.col, '#b08a5a'];
  let holes = '', frames = '';
  for (let i = 0; i < 8; i++) holes += `<rect x="${194 + i * 15}" y="64" width="8" height="5" rx="1.2" fill="${hole}"/><rect x="${194 + i * 15}" y="97" width="8" height="5" rx="1.2" fill="${hole}"/>`;
  for (let i = 0; i < 3; i++) frames += `<rect x="${196 + i * 40}" y="72" width="36" height="24" rx="2" fill="${tints[i]}" opacity=".9"/><path d="M${196 + i * 40} 96 L${210 + i * 40} 82 L${220 + i * 40} 90 L${232 + i * 40} 84 L${232 + i * 40} 96Z" fill="#000" opacity=".28"/>`;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 340 160" width="340" height="160">
<defs>
 <linearGradient id="cm" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#f6f5f0"/><stop offset=".2" stop-color="#d4d2cb"/><stop offset=".5" stop-color="#8d8b84"/><stop offset=".7" stop-color="#c9c7c0"/><stop offset="1" stop-color="#6c6a64"/></linearGradient>
 <linearGradient id="cl" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff" stop-opacity=".45"/><stop offset=".3" stop-color="#fff" stop-opacity="0"/><stop offset=".75" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".5"/></linearGradient>
 <linearGradient id="bgw" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#17140f"/><stop offset="1" stop-color="#050504"/></linearGradient>
 <linearGradient id="gl" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fff" stop-opacity=".2"/><stop offset=".4" stop-color="#fff" stop-opacity="0"/></linearGradient>
 <linearGradient id="fs" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${base}"/><stop offset=".5" stop-color="${base}" stop-opacity=".82"/><stop offset="1" stop-color="#000" stop-opacity=".35"/></linearGradient>
</defs>
<rect x="2" y="2" width="336" height="156" rx="12" fill="#06060a" stroke="#000" stroke-width="3"/>
<rect x="3.5" y="3.5" width="333" height="153" rx="11" fill="none" stroke="#d4d3cc" stroke-width="3.5"/>
<rect x="10" y="10" width="320" height="140" rx="7" fill="url(#bgw)"/>
<ellipse cx="108" cy="132" rx="82" ry="8" fill="#000" opacity=".6"/>
<path d="M176 66 H312 L324 82 L312 98 H176Z" fill="url(#fs)"/>
<path d="M176 66 H312 L324 82 L312 98 H176Z" fill="none" stroke="#000" stroke-opacity=".5"/>
${holes}${frames}
<rect x="40" y="40" width="22" height="84" rx="5" fill="url(#cm)" stroke="#000" stroke-width="1.4"/>
<rect x="58" y="34" width="124" height="96" rx="8" fill="url(#cm)" stroke="#000" stroke-width="1.6"/>
<rect x="82" y="34" width="76" height="96" fill="${f.col}"/>
<rect x="82" y="34" width="76" height="96" fill="url(#cl)"/>
<rect x="82" y="34" width="76" height="9" fill="#000" opacity=".28"/><rect x="82" y="121" width="76" height="9" fill="#000" opacity=".28"/>
<text x="120" y="55" text-anchor="middle" font-family="Arial,sans-serif" font-weight="800" font-size="9.5" letter-spacing="1.6" fill="${tc}" opacity=".92">${f.mk}</text>
<text x="120" y="82" text-anchor="middle" font-family="Arial Black,Impact,Arial,sans-serif" font-weight="900" font-size="${nm.length > 6 ? 13.5 : 17}" fill="${tc}">${nm}</text>
<text x="120" y="108" text-anchor="middle" font-family="Arial Black,Impact,Arial,sans-serif" font-weight="900" font-size="22" fill="${tc}">${f.iso}</text>
<text x="120" y="123" text-anchor="middle" font-family="Arial,sans-serif" font-weight="700" font-size="7.5" letter-spacing="1" fill="${tc}" opacity=".85">${total} EXP · 135</text>
<rect x="58" y="34" width="124" height="96" rx="8" fill="url(#cl)" opacity=".55"/>
<rect x="176" y="52" width="12" height="60" rx="3" fill="url(#cm)" stroke="#000" stroke-width="1.2"/>
<rect x="66" y="22" width="14" height="14" rx="3" fill="url(#cm)" stroke="#000" stroke-width="1.2"/>
<rect x="10" y="10" width="320" height="140" rx="7" fill="url(#gl)"/>
</svg>`;
}

/* 필름 컷 스트립 창: 스프로킷 구멍이 있는 필름에 컷 4장 */
function stripSvg(f, total) {
  const bw = f.gray === 1, base = bw ? '#3d3d3b' : '#7a3f12', print = bw ? '#d9d9d3' : '#f0a23a';
  const name = f.n.replace(/\s*E?\d+$/, '').replace('PLUS', '+').trim();
  const frames = [
    `<rect width="80" height="58" fill="url(#s1)"/><circle cx="40" cy="38" r="12" fill="#fff3c4"/><path d="M0 46 Q20 34 40 44 T80 40 V58 H0Z" fill="#2a1d33"/>`,
    `<rect width="80" height="58" fill="url(#s2)"/><ellipse cx="22" cy="14" rx="14" ry="5" fill="#fff" opacity=".85"/><path d="M0 44 L24 18 L44 40 L58 26 L80 46 V58 H0Z" fill="#4c6a58"/><rect y="48" width="80" height="10" fill="#2f6f8f"/>`,
    `<rect width="80" height="58" fill="url(#s3)"/><rect x="6" y="20" width="16" height="38" fill="#222a3a"/><rect x="26" y="10" width="20" height="48" fill="#2b3346"/><rect x="50" y="24" width="14" height="34" fill="#1e2534"/><rect x="66" y="16" width="12" height="42" fill="#2a3144"/><g fill="#ffd36a"><rect x="30" y="16" width="4" height="4"/><rect x="38" y="24" width="4" height="4"/><rect x="30" y="32" width="4" height="4"/><rect x="10" y="30" width="3" height="3"/><rect x="54" y="34" width="3" height="3"/></g>`,
    `<rect width="80" height="58" fill="url(#s4)"/><circle cx="40" cy="24" r="11" fill="#3a2a22"/><path d="M14 58 Q16 38 40 36 Q64 38 66 58Z" fill="#3a2a22"/>`
  ];
  let svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 150" width="400" height="150"><defs>
<linearGradient id="s1" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffb36b"/><stop offset=".6" stop-color="#ff6b4a"/><stop offset="1" stop-color="#5a3a62"/></linearGradient>
<linearGradient id="s2" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#4f9bd8"/><stop offset="1" stop-color="#cfe6f4"/></linearGradient>
<linearGradient id="s3" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#2c3b66"/><stop offset="1" stop-color="#e48b5a"/></linearGradient>
<linearGradient id="s4" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#e8b98a"/><stop offset="1" stop-color="#c9774c"/></linearGradient>
<linearGradient id="bgs" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#18140f"/><stop offset="1" stop-color="#050504"/></linearGradient>
<linearGradient id="gls" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fff" stop-opacity=".22"/><stop offset=".4" stop-color="#fff" stop-opacity="0"/></linearGradient>
<linearGradient id="fb" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${base}"/><stop offset=".5" stop-color="${base}" stop-opacity=".85"/><stop offset="1" stop-color="#000" stop-opacity=".3"/></linearGradient>
<filter id="gs"><feColorMatrix type="saturate" values="0"/></filter></defs>
<rect x="2" y="2" width="396" height="146" rx="12" fill="#06060a" stroke="#000" stroke-width="3"/>
<rect x="3.5" y="3.5" width="393" height="143" rx="11" fill="none" stroke="#4a4a48" stroke-width="3.5"/>
<rect x="10" y="10" width="380" height="130" rx="7" fill="url(#bgs)"/>
<g transform="rotate(-2.2 200 75)"><rect x="-10" y="22" width="420" height="106" fill="url(#fb)"/>`;
  for (let i = 0; i < 27; i++) svg += `<rect x="${-6 + i * 16}" y="27" width="8" height="6" rx="1.4" fill="#0b0a08"/><rect x="${-6 + i * 16}" y="117" width="8" height="6" rx="1.4" fill="#0b0a08"/>`;
  for (let i = 0; i < 4; i++) svg += `<g transform="translate(${18 + i * 92} 38)" ${bw ? 'filter="url(#gs)"' : ''}>${frames[i]}<rect width="80" height="58" fill="${f.col}" opacity="${bw ? 0 : .12}"/></g>`;
  svg += `<text x="22" y="115" font-family="Arial,sans-serif" font-weight="700" font-size="7.5" letter-spacing=".8" fill="${print}" opacity=".92">▶ 14   ${f.mk} ${name} ${f.iso}   ▷ 14A   ▶ 15   ${f.mk} ${name} ${f.iso}</text></g>
<rect x="10" y="10" width="380" height="130" rx="7" fill="url(#gls)"/></svg>`;
  return svg;
}
/* 스킨 이미지 미리 로드(전환 지연 제거) */
['fun3','pzbr'].forEach(n => { const i = new Image(); i.decoding = 'async'; i.src = new URL('skins/' + n + '.jpg', SRC).href; });
let wasArmed = false;
const kindOf = f => f.gray ? 'BLACK & WHITE FILM' : f.id === 'velvia50' ? 'COLOR REVERSAL FILM' : 'COLOR NEGATIVE FILM';
function filmRender() {
  const r = cfg.roll;
  const f = r ? byId(r.film) : FILMS[0];
  const left = r ? r.total - r.shot : '--';
  const c = $('#fcount'); c.textContent = r ? String(left).padStart(2, '0') : '--';
  c.classList.toggle('low', !!r && left <= 3);
  const isR = /^(px700|pzs|pzb|pslr)r$/.test(cfg.skin), baseSkin = isR ? cfg.skin.slice(0, -1) : cfg.skin;
  ['chrome','black','m3','px700','pzs','pzb','pslr','pfun','pfun2'].forEach(id => filmEl.classList.toggle('sk-' + id, id === baseSkin));
  filmEl.classList.toggle('sk-r', isR);
  filmEl.classList.toggle('sk-kodak', isKodak());   // m3는 크롬 스킨을 바탕으로 덧그림
  $('.memo').dataset.tag = f.n;
  const words = f.n.split(' '), iso = f.iso;
  $('#mlbl').style.setProperty('--c', f.col);
  const lum = (() => { const n = parseInt(f.col.slice(1), 16); return (.299 * (n >> 16) + .587 * ((n >> 8) & 255) + .114 * (n & 255)) / 255; })();
  $('#mlbl').style.setProperty('--ct', lum > .6 ? '#111' : '#fff');
  $('#mmk').textContent = f.mk; $('#mkind').textContent = kindOf(f);
  $('#mnm').textContent = f.n.replace(/\s*E?\d+$/, '') || f.n;
  $('#miso').textContent = iso;
  $('#mex').textContent = r ? `${r.total} EXP` : '-- EXP';
  { const key = f.id + '|' + (r ? r.total : 24), cs = $('#cart35'); if (cs.dataset.k !== key) { cs.dataset.k = key; cs.innerHTML = cartSvg(f, r ? r.total : 24); $('#strip35').innerHTML = stripSvg(f, r ? r.total : 24); } }
  const armed = !!r && r.armed && !r.ended;
  $('#fshut').classList.toggle('lock', !armed);
  $('#fshut').classList.toggle('armed', armed);
  filmEl.classList.toggle('is-armed', armed);
  vfwin.dataset.msg = !r ? '' : r.ended ? 'FILM END' : armed ? '' : 'WIND ▸';
  if (armed && !wasArmed) { const f = $('#fshut'); f.classList.remove('pop'); void f.offsetWidth; f.classList.add('pop'); }
  wasArmed = armed;
  const w = $('#wst'); w.textContent = !r ? '' : r.ended ? 'END' : armed ? 'READY' : (isKodak() ? 'WIND ▶▶' : 'WIND ▸▸');
  w.dataset.s = !r ? '' : r.ended ? 'end' : armed ? 'ok' : 'no';
  const w2 = $('#wst2'); w2.textContent = !r ? '' : r.ended ? 'END' : armed ? 'READY' : 'WIND  ▸'; w2.dataset.s = w.dataset.s;
}

let drag = null;
const lever = $('#lever'), wslot = $('#wslot');
const maxTravel = () => Math.max(1, wslot.clientWidth - lever.offsetWidth - 8);
function setP(p = 0) { lever.style.left = (4 + p * maxTravel()) + 'px'; wslot.style.setProperty('--p', p.toFixed(3)); }
let kkDone = false;
lever.addEventListener('pointerdown', e => {
  unlock(); const r = cfg.roll;
  if (!r || r.ended) { toast(r ? '필름을 다 썼어요' : '필름이 없어요'); return; }
  lever.setPointerCapture(e.pointerId); lever.classList.add('drag');
  drag = { x: e.clientX, y: e.clientY, p: 0 }; kkDone = false;
});
lever.addEventListener('pointermove', e => {
  if (!drag) return;
  let p = Math.min(1, Math.max(0, stageVec(e.clientX - drag.x, e.clientY - drag.y).x / maxTravel()));
  if (cfg.roll.armed) p = Math.min(p, .06);
  drag.p = p; setP(p);
  if (!cfg.roll.armed && p >= .9 && !kkDone) { kkDone = true; completeLever(); }
});
function completeLever() {
  const r = cfg.roll; sKkirik(); r.armed = true; save();
  lever.classList.remove('kk'); void lever.offsetWidth; lever.classList.add('kk');
  filmRender();
}
const endDrag = () => {
  if (!drag) return;
  const { p } = drag; drag = null; lever.classList.remove('drag');
  const r = cfg.roll;
  if (r.armed && !kkDone && p > .04) toast('이미 감겨 있어요. 셔터를 눌러 주세요');
  setP(0);
};
lever.addEventListener('pointerup', endDrag); lever.addEventListener('pointercancel', endDrag);

/* 클래식 와인딩 레버: 암을 왼쪽에서 오른쪽으로 당기기 (호를 그리며 회전) */
const arm = $('#arm'), pivot = $('#pivot'), lvz = $('#lvz');
let adrag = false, adone = false;
const setArm = (deg, anim) => { arm.style.transition = anim ? 'transform .55s cubic-bezier(.3,1.45,.4,1)' : 'none'; arm.style.transform = `rotate(${deg}deg)`; };
/* 레버는 윗판 위(수평면)에서 시계방향으로 180°(왼쪽) → 315°(앞-오른쪽)까지 135° 돈다.
   뒤에서 비스듬히 보면 타원 궤적이라 손가락의 좌→우 이동만으로 각도를 구한다 */
const SWEEP = 135;
function armProg(x) {
  const b = pivot.getBoundingClientRect(), cx = b.left + b.width / 2;
  const L = parseFloat(getComputedStyle(lvz).getPropertyValue('--L')) || 70;
  const cc = Math.max(-1, Math.min(.7071, (x - cx) / L));
  const th = 360 - Math.acos(cc) * 180 / Math.PI;      // 180(왼쪽) ~ 315(앞-오른쪽)
  return Math.max(0, Math.min(1, (th - 180) / SWEEP));
}
lvz.addEventListener('pointerdown', e => {
  unlock(); const r = cfg.roll;
  if (isKodak()) return;
  if (!r || r.ended) { toast(r ? '필름을 다 썼어요' : '필름이 없어요'); return; }
  lvz.setPointerCapture(e.pointerId); adrag = true; adone = false; burst(0, .01, 3800, 3, .25);
});
lvz.addEventListener('pointermove', e => {
  if (!adrag) return;
  let p = armProg(e.clientX);
  if (cfg.roll.armed) p = Math.min(p, .08);
  setArm(180 + p * SWEEP, false);
  if (!cfg.roll.armed && p >= .96 && !adone) {
    adone = true; const r = cfg.roll; sKkirik(); r.armed = true; save(); filmRender();
    setTimeout(() => setArm(180, true), 60);
  }
});
const endArm = () => { if (!adrag) return; adrag = false; if (!adone) { if (cfg.roll.armed) toast('이미 감겨 있어요. 셔터를 눌러 주세요'); setArm(180, true); } };
lvz.addEventListener('pointerup', endArm); lvz.addEventListener('pointercancel', endArm);
setArm(180, false);

/* 일회용: 롤 휠을 좌→우로 2~3초 굴려야 장전 */
const rw = $('#rw'), RW_DIST = 126, WIND_MS = 1250;
let rprog = 0, rdrag = null;
const setRw = () => { wslot.style.setProperty('--rp', (rprog * RW_DIST).toFixed(1)); };
rw.addEventListener('pointerdown', e => {
  unlock(); const r = cfg.roll;
  if (!r || r.ended) { toast(r ? '필름을 다 썼어요' : '필름이 없어요'); return; }
  rw.setPointerCapture(e.pointerId);
  rdrag = { x: e.clientX, y: e.clientY, t: performance.now(), tick: Math.floor(rprog * RW_DIST / 7), warned: false };
});
rw.addEventListener('pointermove', e => {
  if (!rdrag) return;
  const now = performance.now(), dt = Math.min(50, now - rdrag.t), dx = stageVec(e.clientX - rdrag.x, e.clientY - rdrag.y).x; rdrag.t = now; rdrag.x = e.clientX; rdrag.y = e.clientY;
  const r = cfg.roll;
  if (r.armed) { if (dx > 4 && !rdrag.warned) { rdrag.warned = true; toast('이미 감겨 있어요. 셔터를 눌러 주세요'); } return; }
  if (dx <= 0) return;
  rprog = Math.min(1, rprog + Math.min(dx / RW_DIST, dt / WIND_MS)); setRw();
  const t = Math.floor(rprog * RW_DIST / 7); if (t > rdrag.tick) { for (let k = 0; k < Math.min(4, t - rdrag.tick); k++) setTimeout(sKodakTick, k * 9); rdrag.tick = t; }
  const w = $('#wst'); w.textContent = `WIND ${Math.round(rprog * 100)}%`; w.dataset.s = 'no';
  if (rprog >= 1) { sKodakWindEnd(); r.armed = true; save(); rprog = 0; rdrag.tick = 0; setRw(); filmRender(); }
});
const endRw = () => { rdrag = null; };
rw.addEventListener('pointerup', endRw); rw.addEventListener('pointercancel', endRw);
function wiggle() { const t = isKodak() ? rw : lvz; t.classList.remove('wig'); void t.offsetWidth; t.classList.add('wig'); }

/* 뒷덮개(설정 나사): 현상 · 앨범 · 설정 */
const IC = {
  roll: '<svg viewBox="0 0 24 24"><rect x="6" y="5" width="12" height="15" rx="2"/><path d="M9 5V3h6v2M6 9h12M6 16h12"/></svg>',
  strip: '<svg viewBox="0 0 24 24"><rect x="3" y="5" width="18" height="14" rx="1"/><path d="M7 5v14M17 5v14M3 9h4M3 15h4M17 9h4M17 15h4"/></svg>',
  cam: '<svg viewBox="0 0 24 24"><rect x="3" y="7" width="18" height="12" rx="2"/><circle cx="12" cy="13" r="3.5"/><path d="M8 7l1.5-2h5L16 7"/></svg>',
};
function openBackDoor() {
  const r = cfg.roll, f = r && byId(r.film);
  modal(`<h3>뒷덮개</h3><p>${r ? `${f.mk} ${f.n}<br>${r.shot} / ${r.total}컷 촬영` : '장전된 필름이 없어요'}<br><small style="color:#6f6b62">빌드 ${BUILD}<br>화면 ${innerWidth}×${innerHeight} · 스킨 ${stageRot()}° · ${cfg.rot === 'right' ? '왼손' : '오른손'}</small></p>`,
    [{ t: IC.roll + '현상하기' }, { t: IC.strip + '앨범 보기' }, { t: IC.cam + '카메라 설정' }, { t: '닫기', cls: 'ghost' }])
    .then(i => {
      if (i === 0) develop(false); else if (i === 1) openAlbums(); else if (i === 2) openSettings();
    });
}
const bsecEl = $('#bsec'); bsecEl.innerHTML = '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>'; bsecEl.setAttribute('aria-label', '설정'); if (!cfg.menuSeen) bsecEl.classList.add('pulse');
bsecEl.addEventListener('click', () => { cfg.menuSeen = true; save(); bsecEl.classList.remove('pulse'); openBackDoor(); });


/* ═════════ 카메라 ═════════ */
let camSeq = 0;
const camConstraints = big => ({ video: big ? { facingMode: { ideal: st.facing }, width: { ideal: 4032 }, height: { ideal: 3024 } } : { facingMode: { ideal: st.facing } }, audio: false });
async function attachCam(s) { stream = s; video.srcObject = s; video.style.display = 'block'; scene.style.display = 'none'; await video.play().catch(() => {}); }
async function startCam() {
  const my = ++camSeq; // 연속 호출되면 마지막 호출만 유효
  stopCam(); msgEl.classList.remove('on');
  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
    showMsg('카메라를 쓰려면 https 주소로 열어야 해요.\n지금은 샘플 화면만 보여요.'); return;
  }
  try {
    let s = await navigator.mediaDevices.getUserMedia(camConstraints(true));
    if (my !== camSeq) { s.getTracks().forEach(t => t.stop()); return; }
    await attachCam(s);
    // 아이폰에서 카메라를 껐다 켰을 때 화면이 검게 멈추는 경우가 있어, 첫 화면이 안 나오면 단순한 조건으로 한 번 더 켠다
    await sleep(1000);
    if (my === camSeq && (!video.videoWidth || video.readyState < 2)) {
      stopCam(); await sleep(350);
      if (my !== camSeq) return;
      s = await navigator.mediaDevices.getUserMedia(camConstraints(false));
      if (my !== camSeq) { s.getTracks().forEach(t => t.stop()); return; }
      await attachCam(s);
    }
    st.torch = false; render();
    if (DIAG) {
      const tr = stream.getVideoTracks()[0];
      const info = { settings: tr.getSettings(), capabilities: tr.getCapabilities ? tr.getCapabilities() : null, supported: navigator.mediaDevices.getSupportedConstraints() };
      showMsg('<pre style="text-align:left;font:10px monospace;white-space:pre-wrap;max-height:70vh;overflow:auto">' + JSON.stringify(info, null, 1) + '</pre>', false, true);
    }
  } catch (e) {
    video.style.display = 'none'; scene.style.display = '';
    showMsg(e && e.name === 'NotAllowedError'
      ? '카메라 권한이 꺼져 있어요.\n설정 > Safari > 카메라에서 허용해 주세요.'
      : '카메라를 켤 수 없어요. (' + (e && e.name) + ')', true);
  }
}
function stopCam() { if (stream) stream.getTracks().forEach(t => t.stop()); stream = null; video.srcObject = null; }
function showMsg(t, retry, closable) {
  msgEl.innerHTML = `<p>${t.startsWith('<') ? t : t.replace(/\n/g, '<br>')}</p>` + (retry ? '<button id="retry">다시 시도</button>' : '') + (closable ? '<button id="mclose">닫기</button>' : '');
  msgEl.classList.add('on');
  const b = $('#retry'); if (b) b.onclick = startCam;
  const c = $('#mclose'); if (c) c.onclick = () => msgEl.classList.remove('on');
}

/* ═════════ 촬영 · 픽셀 처리 ═════════ */
async function countdown(s) {
  for (let i = s; i > 0; i--) { cdEl.textContent = i; cdEl.classList.add('on'); await sleep(1000); }
  cdEl.classList.remove('on');
}
function mul(a, b) {
  const o = [];
  for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) o.push(a[i * 3] * b[j] + a[i * 3 + 1] * b[3 + j] + a[i * 3 + 2] * b[6 + j]);
  return o;
}
function mats(f, ev) {
  const gA = 1 - f.gray, s = f.sat, sp = 1 - f.sep, th = f.hue * Math.PI / 180, c = Math.cos(th), n = Math.sin(th);
  const G = [.2126 + .7874 * gA, .7152 - .7152 * gA, .0722 - .0722 * gA, .2126 - .2126 * gA, .7152 + .2848 * gA, .0722 - .0722 * gA, .2126 - .2126 * gA, .7152 - .7152 * gA, .0722 + .9278 * gA];
  const S = [.213 + .787 * s, .715 - .715 * s, .072 - .072 * s, .213 - .213 * s, .715 + .285 * s, .072 - .072 * s, .213 - .213 * s, .715 - .715 * s, .072 + .928 * s];
  const P = [.393 + .607 * sp, .769 - .769 * sp, .189 - .189 * sp, .349 - .349 * sp, .686 + .314 * sp, .168 - .168 * sp, .272 - .272 * sp, .534 - .534 * sp, .131 + .869 * sp];
  const H = [.213 + c * .787 - n * .213, .715 - c * .715 - n * .715, .072 - c * .072 + n * .928,
    .213 - c * .213 + n * .143, .715 + c * .285 + n * .140, .072 - c * .072 - n * .283,
    .213 - c * .213 - n * .787, .715 - c * .715 + n * .715, .072 + c * .928 + n * .072];
  const k = f.bri * 2 ** ev;
  return [mul(S, G), mul(H, P).map(v => v * k)];
}
function processPixels(img, f, ev) {
  const { data, width: w, height: h } = img;
  const [M1, M2] = mats(f, ev), con = f.con;
  const gAmp = f.g * 70, vAmt = f.v, cx = w / 2, cy = h / 2, maxD = Math.sqrt(cx * cx + cy * cy);
  const fa = f.fa, fr = f.fc[0] / 255 * fa, fg = f.fc[1] / 255 * fa, fb = f.fc[2] / 255 * fa, fk = 1 - fa;
  for (let y = 0; y < h; y++) {
    const dy = y - cy;
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4;
      let r = data[i] / 255, g = data[i + 1] / 255, b = data[i + 2] / 255;
      let r1 = M1[0] * r + M1[1] * g + M1[2] * b, g1 = M1[3] * r + M1[4] * g + M1[5] * b, b1 = M1[6] * r + M1[7] * g + M1[8] * b;
      r1 = (Math.min(1, Math.max(0, r1)) - .5) * con + .5; g1 = (Math.min(1, Math.max(0, g1)) - .5) * con + .5; b1 = (Math.min(1, Math.max(0, b1)) - .5) * con + .5;
      r = M2[0] * r1 + M2[1] * g1 + M2[2] * b1; g = M2[3] * r1 + M2[4] * g1 + M2[5] * b1; b = M2[6] * r1 + M2[7] * g1 + M2[8] * b1;
      r = Math.min(1, Math.max(0, r)) * fk + fr; g = Math.min(1, Math.max(0, g)) * fk + fg; b = Math.min(1, Math.max(0, b)) * fk + fb;
      const dx = x - cx, d = Math.sqrt(dx * dx + dy * dy) / maxD;
      const vig = 1 - vAmt * (d > .55 ? (d - .55) / .45 : 0);
      const nz = (Math.random() - .5) * gAmp;
      data[i] = r * vig * 255 + nz; data[i + 1] = g * vig * 255 + nz; data[i + 2] = b * vig * 255 + nz;
    }
  }
}
/* ═════════ 필름 효과: 날짜 각인 · 빛샘 · 먼지/스크래치 (저장할 때 사진에 합성, 이미 찍은 사진에는 적용 안 됨) ═════════ */
function applyFx(cv, cx, ts) {
  const W = cv.width, H = cv.height, S = Math.max(W, H) / 3000, rnd = (a, b) => a + Math.random() * (b - a);
  const leak = cfg.leak | 0, dust = cfg.dust | 0;
  if (leak) { // 빛샘: 가장자리에서 번지는 주황·붉은 빛 (screen 합성)
    cx.save(); cx.globalCompositeOperation = 'screen';
    const COLS = [[255, 110, 40], [255, 70, 60], [255, 170, 60], [255, 90, 140]];
    for (let i = 0, n = leak === 2 ? 2 : 1; i < n; i++) {
      const [r, g, b] = COLS[Math.floor(Math.random() * COLS.length)], a = leak === 2 ? rnd(.55, .85) : rnd(.28, .5);
      const edge = Math.floor(Math.random() * 4), t = rnd(.1, .9);
      const x = edge === 0 ? 0 : edge === 1 ? W : t * W, y = edge === 2 ? 0 : edge === 3 ? H : t * H;
      const rad = Math.max(W, H) * rnd(.28, .55), gr = cx.createRadialGradient(x, y, 0, x, y, rad);
      gr.addColorStop(0, `rgba(${r},${g},${b},${a})`); gr.addColorStop(.45, `rgba(${r},${g},${b},${a * .38})`); gr.addColorStop(1, `rgba(${r},${g},${b},0)`);
      cx.fillStyle = gr; cx.fillRect(0, 0, W, H);
    }
    cx.restore();
  }
  if (dust) { // 먼지 알갱이 + 머리카락/세로 스크래치
    cx.save();
    for (let i = 0, n = dust === 2 ? 90 : 36; i < n; i++) {
      const rr = Math.max(.8, rnd(.6, 2.4) * S);
      cx.globalAlpha = rnd(.25, .7); cx.fillStyle = Math.random() < .7 ? '#fff' : '#000';
      cx.beginPath(); cx.ellipse(rnd(0, W), rnd(0, H), rr * rnd(.7, 1.5), rr, rnd(0, Math.PI), 0, Math.PI * 2); cx.fill();
    }
    cx.strokeStyle = '#fff'; cx.lineCap = 'round';
    for (let i = 0, n = dust === 2 ? 4 : 2; i < n; i++) {
      cx.globalAlpha = rnd(.22, .5); cx.lineWidth = Math.max(.8, rnd(.7, 1.6) * S); cx.beginPath();
      if (Math.random() < .5) { const x = rnd(0, W); cx.moveTo(x, 0); cx.lineTo(x + rnd(-8, 8) * S, H); }
      else { const x = rnd(.1, .9) * W, y = rnd(.1, .9) * H, l = rnd(40, 110) * S; cx.moveTo(x, y); cx.bezierCurveTo(x + l * .5, y - l * rnd(.2, .8), x + l * rnd(.5, .9), y + l * rnd(.2, .8), x + l, y + rnd(-.3, .3) * l); }
      cx.stroke();
    }
    cx.restore();
  }
  if (cfg.stamp) { // 날짜 각인: 데이트백 느낌의 주황 숫자 (우하단)
    const d = new Date(ts), txt = `'${String(d.getFullYear()).slice(2)} ${d.getMonth() + 1} ${d.getDate()}`, fs = Math.round(Math.max(W, H) * .032);
    cx.save(); cx.font = `700 ${fs}px "Courier New", ui-monospace, monospace`; cx.textAlign = 'right'; cx.textBaseline = 'alphabetic';
    const x = W - fs * .9, y = H - fs * .8;
    cx.shadowColor = 'rgba(255,110,0,.9)'; cx.shadowBlur = fs * .4; cx.fillStyle = '#ff8c1a'; cx.fillText(txt, x, y);
    cx.shadowBlur = 0; cx.fillStyle = '#ffb347'; cx.globalAlpha = .85; cx.fillText(txt, x, y);
    cx.restore();
  }
}
async function finishPhoto(img, cv, cx, F, ev, meta) {
  processPixels(img, F, ev);
  cx.putImageData(img, 0, 0);
  applyFx(cv, cx, meta.ts);
  const blob = await new Promise(r => cv.toBlob(r, 'image/jpeg', .93));
  const k = 240 / Math.max(cv.width, cv.height), th = document.createElement('canvas');
  th.width = Math.round(cv.width * k); th.height = Math.round(cv.height * k);
  th.getContext('2d').drawImage(cv, 0, 0, th.width, th.height);
  meta.th = await new Promise(r => th.toBlob(r, 'image/jpeg', .8));
  await DB.addPhoto(meta, blob);
}
async function shoot() {
  const film = isFilm();
  const vw = video.videoWidth, vh = video.videoHeight;
  if (!stream || !vw) { toast('카메라가 아직 준비되지 않았어요'); return; }
  if (film) {
    const r = cfg.roll;
    if (!r || r.ended) { toast(r ? '필름을 다 썼어요. 현상해 주세요' : '필름을 먼저 장전해 주세요'); return; }
    if (!r.armed) { wiggle(); toast('필름을 오른쪽으로 밀어 감아 주세요'); return; }
  }
  if (pending >= 3) { toast('저장 중이에요. 잠시만요'); return; }
  if (!film && st.timer) await countdown(st.timer);
  sShut();
  flashEl.classList.add('on'); setTimeout(() => flashEl.classList.remove('on'), 110);

  /* 화면에 보이는 영역(cover) → 비율 맞춰 자르기 → 줌 */
  const el = film ? vfHost() : vf;
  const VA = el.clientWidth / el.clientHeight, zoom = film ? 1 : st.zoom;
  /* 필름 모드: 뷰파인더 창은 고정이고 영상은 늘 창을 가득 채운다. 저장 사진은 폰을 든 방향 그대로(가로 3:2 / 세로 2:3) */
  /* 필름: 프레임은 화면 방향 기준이라, 폰을 든 각도와 화면 각도의 차이만큼 돌려야 세상이 똑바로 선다 */
  const rot = film ? stageRot() : 0, sw = Math.abs(rot) === 90;
  const A = film ? 3 / 2 : aspectNow();
  let rw, rh;
  if (film) { rw = sw ? vh : vw; rh = sw ? vw : vh; }
  else if (vw / vh > VA) { rh = vh; rw = vh * VA; } else { rw = vw; rh = vw / VA; }
  let cw = rw, ch = cw / A;
  if (ch > rh) { ch = rh; cw = ch * A; }
  cw /= zoom; ch /= zoom;
  const sx = (vw - cw) / 2, sy = (vh - ch) / 2;
  const cv = document.createElement('canvas');
  cv.width = Math.round(cw); cv.height = Math.round(ch);
  const cx = cv.getContext('2d', { willReadFrequently: true });
  if (film && rot) { cx.save(); cx.translate(cv.width / 2, cv.height / 2); cx.rotate(-rot * Math.PI / 180); cx.drawImage(video, -vw / 2, -vh / 2, vw, vh); cx.restore(); }
  else cx.drawImage(video, sx, sy, cw, ch, 0, 0, cv.width, cv.height);
  const img = cx.getImageData(0, 0, cv.width, cv.height);

  const F = film ? byId(cfg.roll.film) : FILMS[st.f], ev = film ? 0 : st.ev;
  const meta = { ts: Date.now(), f: F.id, roll: film ? cfg.roll.id : null };
  if (film) {
    const r = cfg.roll; r.shot++; r.armed = false; if (r.shot >= r.total) r.ended = true; save(); filmRender();
    if (r.ended) setTimeout(showEnd, 700);
  } else toast('저장 중…', 1200);
  pending++;
  jobs = jobs.then(() => finishPhoto(img, cv, cx, F, ev, meta)).catch(e => toast('저장 실패: ' + (e && e.message)))
    .then(() => { pending--; if (!film) { refreshThumb(); toast('찍었어요'); } });
}

/* ═════════ 저장소 (IndexedDB) ═════════ */
const DB = (() => {
  let db;
  const open = () => db ? Promise.resolve(db) : new Promise((res, rej) => {
    const q = indexedDB.open('still', 2);
    q.onupgradeneeded = () => {
      const d = q.result;
      if (!d.objectStoreNames.contains('p')) d.createObjectStore('p', { keyPath: 'id', autoIncrement: true });
      if (!d.objectStoreNames.contains('b')) d.createObjectStore('b');
      if (!d.objectStoreNames.contains('rolls')) d.createObjectStore('rolls', { keyPath: 'id' });
    };
    q.onsuccess = () => { db = q.result; res(db); }; q.onerror = () => rej(q.error);
  });
  const run = async (stores, mode, fn) => { const d = await open(); return new Promise((res, rej) => { const t = d.transaction(stores, mode); let out; fn(t, v => { out = v; }); t.oncomplete = () => res(out); t.onerror = () => rej(t.error); }); };
  const req = (r, set) => { r.onsuccess = () => set(r.result); };
  return {
    addPhoto: (meta, blob) => run(['p', 'b'], 'readwrite', (t, set) => { const r = t.objectStore('p').add(meta); r.onsuccess = () => { t.objectStore('b').put(blob, r.result); set(r.result); }; }),
    photos: () => run(['p'], 'readonly', (t, set) => req(t.objectStore('p').getAll(), set)),
    blob: id => run(['p', 'b'], 'readonly', (t, set) => { const r = t.objectStore('b').get(id); r.onsuccess = () => { if (r.result) set(r.result); else t.objectStore('p').get(id).onsuccess = e => set(e.target.result && e.target.result.blob); }; }),
    del: id => run(['p', 'b'], 'readwrite', t => { t.objectStore('p').delete(id); t.objectStore('b').delete(id); }),
    delRoll: id => run(['rolls'], 'readwrite', t => { t.objectStore('rolls').delete(id); }),
    putRoll: r => run(['rolls'], 'readwrite', t => { t.objectStore('rolls').put(r); }),
    rolls: () => run(['rolls'], 'readonly', (t, set) => req(t.objectStore('rolls').getAll(), set)),
  };
})();
const thumbBlob = m => m.th || m.blob;
let thumbUrl;
async function refreshThumb() {
  const all = (await DB.photos().catch(() => [])).filter(p => !p.roll);
  const t = $('.thumb');
  if (thumbUrl) { URL.revokeObjectURL(thumbUrl); thumbUrl = null; }
  if (all.length) { thumbUrl = URL.createObjectURL(thumbBlob(all[all.length - 1])); t.style.background = `url(${thumbUrl}) center/cover`; }
}
try { navigator.storage && navigator.storage.persist && navigator.storage.persist(); } catch {}

/* 저장/공유 (한 번에 최대 10장씩 묶음) */
async function shareDialog(files) {
  const CH = 10, groups = []; for (let i = 0; i < files.length; i += CH) groups.push(files.slice(i, i + CH));
  const canShare = navigator.canShare && navigator.canShare({ files: [files[0]] });
  const m = document.createElement('div'); m.className = 'mdl';
  m.innerHTML = `<div class="mbox"><h3>${files.length}장 저장</h3><p>${canShare ? '아래 버튼을 눌러 "이미지 저장"을 선택하세요.<br>한 번에 10장씩 나눠서 저장해요.' : '이 브라우저는 공유 시트가 없어 파일로 내려받아요.'}</p><div class="mbtn col">${groups.map((g, i) => `<button data-i="${i}">${groups.length > 1 ? `${i + 1}/${groups.length} · ` : ''}${g.length}장 저장</button>`).join('')}<button class="ghost" data-x="1">닫기</button></div></div>`;
  m.addEventListener('click', async e => {
    const b = e.target.closest('button'); if (!b) return;
    if (b.dataset.x) { m.remove(); return; }
    const g = groups[+b.dataset.i];
    if (canShare) { try { await navigator.share({ files: g }); b.textContent = '✓ ' + b.textContent; b.disabled = true; } catch (err) { if (err.name !== 'AbortError') toast('공유 실패'); } }
    else { for (const f of g) { const a = document.createElement('a'); a.href = URL.createObjectURL(f); a.download = f.name; a.click(); await sleep(250); } b.textContent = '✓ ' + b.textContent; b.disabled = true; }
  });
  app.appendChild(m);
}
const toFile = (blob, m) => new File([blob], `still-${m.f}-${m.ts}.jpg`, { type: 'image/jpeg' });

/* ═════════ 사진 뷰어 (좌우 스와이프) ═════════ */
async function openViewer(list, idx, onChange) {
  const ov = document.createElement('div'); ov.className = 'viewer';
  ov.innerHTML = '<div class="vs"></div><div class="vbar"><span id="vcnt"></span><div><button id="vsave">저장 / 공유</button><button id="vdel" class="del">삭제</button><button id="vclose" class="ghost">닫기</button></div></div>';
  app.appendChild(ov);
  const vs = ov.querySelector('.vs'); let cur = idx; const urls = {}, blobs = {};
  const build = () => { vs.innerHTML = list.map((m, i) => `<div class="sl" data-i="${i}"><img alt=""></div>`).join(''); };
  async function ensure(i) {
    if (i < 0 || i >= list.length || urls[i]) return;
    const b = await DB.blob(list[i].id); if (!b) return; blobs[i] = b; urls[i] = URL.createObjectURL(b);
    const im = vs.querySelector(`.sl[data-i="${i}"] img`); if (im) im.src = urls[i];
  }
  function drop(keep) { Object.keys(urls).forEach(k => { if (!keep.includes(+k)) { URL.revokeObjectURL(urls[k]); delete urls[k]; delete blobs[k]; const im = vs.querySelector(`.sl[data-i="${k}"] img`); if (im) im.removeAttribute('src'); } }); }
  async function show(i) { cur = i; $('#vcnt').textContent = `${i + 1} / ${list.length}`; drop([i - 1, i, i + 1]); await Promise.all([ensure(i), ensure(i + 1), ensure(i - 1)]); }
  build(); vs.scrollLeft = idx * vs.clientWidth; await show(idx);
  let sT; vs.addEventListener('scroll', () => { clearTimeout(sT); sT = setTimeout(() => { const i = Math.round(vs.scrollLeft / vs.clientWidth); if (i !== cur && i >= 0 && i < list.length) show(i); }, 70); });
  const close = () => { Object.values(urls).forEach(u => URL.revokeObjectURL(u)); ov.remove(); onChange && onChange(); };
  $('#vclose').onclick = close;
  $('#vsave').onclick = async () => { await ensure(cur); if (blobs[cur]) shareDialog([toFile(blobs[cur], list[cur])]); };
  $('#vdel').onclick = async () => {
    if ((await modal('<h3>이 사진을 삭제할까요?</h3><p>삭제하면 되돌릴 수 없어요.</p>', [{ t: '삭제', cls: 'del' }, { t: '취소', cls: 'ghost' }])) !== 0) return;
    await DB.del(list[cur].id); list.splice(cur, 1);
    if (!list.length) { close(); return; }
    Object.values(urls).forEach(u => URL.revokeObjectURL(u)); Object.keys(urls).forEach(k => delete urls[k]);
    build(); cur = Math.min(cur, list.length - 1); vs.scrollLeft = cur * vs.clientWidth; await show(cur);
  };
}

/* ═════════ 사진 격자 + 선택 저장 ═════════ */
async function openGrid({ title, fetch, sub }) {
  const ov = document.createElement('div'); ov.className = 'pg';
  ov.innerHTML = `<div class="pgh"><button id="gb">◂ 뒤로</button><div><b>${title}</b><small>${sub || ''}</small></div><button id="gs">선택</button></div><div class="pgg"></div><div class="pgf"><button id="gall" class="ghost">전체</button><button id="gdel" class="del">삭제</button><button id="gsave">저장 (0)</button></div>`;
  app.appendChild(ov);
  let list = [], sel = new Set(), selecting = false, urls = [];
  const grid = ov.querySelector('.pgg');
  const upd = () => { $('#gsave').textContent = `저장 (${sel.size})`; $('#gsave').disabled = $('#gdel').disabled = !sel.size; };
  async function load() {
    urls.forEach(u => URL.revokeObjectURL(u)); urls = [];
    list = await fetch();
    grid.innerHTML = list.length ? '' : '<p class="empty">사진이 없어요</p>';
    list.forEach((m, i) => {
      const u = URL.createObjectURL(thumbBlob(m)); urls.push(u);
      const c = document.createElement('div'); c.className = 'cell'; c.innerHTML = `<img src="${u}" alt=""><i class="chk"></i>`;
      c.classList.toggle('sel', sel.has(m.id));
      c.onclick = () => {
        if (selecting) { sel.has(m.id) ? sel.delete(m.id) : sel.add(m.id); c.classList.toggle('sel'); upd(); }
        else openViewer(list.slice(), i, load);
      };
      grid.appendChild(c);
    });
    grid.scrollTop = grid.scrollHeight; upd();
  }
  $('#gb').onclick = () => { urls.forEach(u => URL.revokeObjectURL(u)); ov.remove(); };
  $('#gs').onclick = () => { selecting = !selecting; sel.clear(); ov.classList.toggle('selecting', selecting); $('#gs').textContent = selecting ? '완료' : '선택'; $$('.pg .cell').forEach(c => c.classList.remove('sel')); upd(); };
  $('#gall').onclick = () => { const all = sel.size === list.length; sel = new Set(all ? [] : list.map(m => m.id)); $$('.pg .cell').forEach((c, i) => c.classList.toggle('sel', sel.has(list[i].id))); upd(); };
  $('#gsave').onclick = async () => {
    const files = []; toast('준비 중…', 4000);
    for (const m of list) if (sel.has(m.id)) { const b = await DB.blob(m.id); if (b) files.push(toFile(b, m)); }
    toastEl.classList.remove('on'); if (files.length) shareDialog(files);
  };
  $('#gdel').onclick = async () => {
    if ((await modal(`<h3>${sel.size}장을 삭제할까요?</h3><p>삭제하면 되돌릴 수 없어요.</p>`, [{ t: '삭제', cls: 'del' }, { t: '취소', cls: 'ghost' }])) !== 0) return;
    for (const id of sel) await DB.del(id); sel.clear(); await load(); refreshThumb();
  };
  await load();
}

/* 디카 모드 보관함: 썸네일 → 최신 사진에서 바로 좌우로 넘기기, 격자 버튼으로 선택 저장 */
async function openDigitalLibrary() {
  // 카메라는 끄지 않고 위에 보관함만 덮는다 — 아이폰에서 카메라를 껐다 켜면 화면이 검게 멈추는 문제 방지
  const fetch = async () => (await DB.photos()).filter(p => !p.roll).sort((a, b) => a.ts - b.ts);
  const list = await fetch();
  const done = () => { refreshThumb(); if (stream && video.srcObject) video.play().catch(() => {}); else startCam(); };
  if (!list.length) { toast('아직 사진이 없어요'); return; }
  const ov = document.createElement('div'); ov.className = 'backbar';
  ov.innerHTML = '<button id="lgrid">▦ 전체 · 선택 저장</button><button id="lback">◂ 카메라로</button>';
  app.appendChild(ov);
  $('#lback').onclick = () => { ov.remove(); $$('.viewer,.pg').forEach(x => x.remove()); done(); };
  $('#lgrid').onclick = () => openGrid({ title: '보관함', fetch, sub: '디지털' });
  // 사진 보기의 '닫기'(또는 마지막 사진 삭제) = 카메라로 완전히 복귀 (보관함 막대·격자까지 정리)
  openViewer(list.slice(), list.length - 1, () => { ov.remove(); $$('.viewer,.pg').forEach(x => x.remove()); done(); });
}

/* ═════════ 앨범 (현상된 롤) ═════════ */
async function openAlbums() {
  const ov = document.createElement('div'); ov.className = 'albums';
  ov.innerHTML = '<div class="pgh"><button id="ab">◂ 뒤로</button><div><b>앨범</b><small>현상된 필름</small></div><button id="asel">선택</button></div><div class="alist"></div><div class="pgf alf"><button id="aall" class="ghost">전체</button><button id="adel" class="del">삭제 (0)</button></div>';
  app.appendChild(ov);
  const list = ov.querySelector('.alist');
  let selecting = false, sel = new Set(), rolls = [];
  const upd = () => { $('#adel').textContent = `삭제 (${sel.size})`; $('#adel').disabled = !sel.size; };
  async function load() {
    rolls = (await DB.rolls()).sort((a, b) => b.developedAt - a.developedAt);
    const photos = await DB.photos();
    const cur = cfg.roll;
    let html = '';
    if (cur) { const f = byId(cur.film); html += `<div class="ai now"><i style="background:${f.col}"></i><div><b>${f.mk} ${f.n}</b><small>촬영 중 · ${cur.shot}/${cur.total}컷 — 현상 버튼을 누르면 앨범이 돼요</small></div></div>`; }
    rolls.forEach(r => {
      const f = byId(r.film), ps = photos.filter(p => p.roll === r.id), wait = r.readyAt - Date.now(), d = new Date(r.developedAt);
      const date = `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`;
      const lockTxt = wait > 0 ? `현상 중 · ${Math.floor(wait / 36e5)}시간 ${Math.ceil((wait % 36e5) / 6e4)}분 뒤 열려요` : `${date} · ${ps.length}컷`;
      html += `<div class="ai ${wait > 0 ? 'lock' : ''} ${sel.has(r.id) ? 'sel' : ''}" data-r="${r.id}"><i class="chk"></i><i class="rc" style="background:${f.col}"></i><div><b>${f.mk} ${f.n}</b><small>${lockTxt}</small></div><span class="go">${wait > 0 ? '🔒' : '▸'}</span></div>`;
    });
    list.innerHTML = html || '<p class="empty">아직 현상된 필름이 없어요</p>';
    upd();
  }
  const close = () => { ov.remove(); if (isFilm() && !cfg.roll) showLoad(false); };
  $('#ab').onclick = close;
  $('#asel').onclick = () => { selecting = !selecting; sel.clear(); ov.classList.toggle('selecting', selecting); $('#asel').textContent = selecting ? '완료' : '선택'; load(); };
  $('#aall').onclick = () => { sel = sel.size === rolls.length ? new Set() : new Set(rolls.map(r => r.id)); load(); };
  $('#adel').onclick = async () => {
    const n = sel.size; if (!n) return;
    const total = (await DB.photos()).filter(p => sel.has(p.roll)).length;
    if ((await modal(`<h3>롤 ${n}개를 삭제할까요?</h3><p>사진 ${total}장이 함께 삭제되고 되돌릴 수 없어요.<br>필요한 사진은 먼저 저장해 두세요.</p>`, [{ t: '삭제', cls: 'del' }, { t: '취소', cls: 'ghost' }])) !== 0) return;
    const photos = await DB.photos();
    for (const p of photos) if (sel.has(p.roll)) await DB.del(p.id);
    for (const id of sel) await DB.delRoll(id);
    sel.clear(); toast('삭제했어요'); await load();
  };
  list.addEventListener('click', e => {
    const a = e.target.closest('.ai[data-r]'); if (!a) return;
    const id = +a.dataset.r;
    if (selecting) { sel.has(id) ? sel.delete(id) : sel.add(id); a.classList.toggle('sel'); upd(); return; }
    if (a.classList.contains('lock')) { toast('아직 현상 중이에요'); return; }
    const r = rolls.find(x => x.id === id), f = byId(r.film);
    openGrid({ title: `${f.mk} ${f.n}`, sub: `${r.total}컷 롤`, fetch: async () => (await DB.photos()).filter(p => p.roll === r.id).sort((x, y) => x.ts - y.ts) });
  });
  await load();
  return ov;
}

/* ═════════ 현상 ═════════ */
function showEnd() {
  if (!cfg.roll || !cfg.roll.ended) return;
  modal('<h3>필름 끝 🎞</h3><p>이번 롤을 다 썼어요.<br>지금 현상할까요?</p>', [{ t: '현상하기' }, { t: '나중에', cls: 'ghost' }])
    .then(i => { if (i === 0) develop(true); });
}
async function develop(skipAsk) {
  const r = cfg.roll;
  if (!r) { showLoad(false); return; }
  if (!r.shot) {
    if ((await modal('<h3>아직 한 장도 안 찍었어요</h3><p>필름을 다시 고를까요?</p>', [{ t: '필름 다시 고르기' }, { t: '취소', cls: 'ghost' }])) === 0) { cfg.roll = null; save(); filmRender(); showLoad(false); }
    return;
  }
  if (!skipAsk) {
    const left = r.total - r.shot;
    if ((await modal(`<h3>필름을 현상할까요?</h3><p>${r.shot}컷을 찍었어요${left ? ` (남은 ${left}컷은 버려져요)` : ''}.<br>${cfg.dev ? DEV_OPTS.find(o => o.ms === cfg.dev).l + ' 뒤에' : '바로'} 앨범에서 볼 수 있어요.</p>`, [{ t: '현상하기' }, { t: '취소', cls: 'ghost' }])) !== 0) return;
  }
  toast('현상 중…', 2500); await jobs;
  const now = Date.now();
  await DB.putRoll({ id: r.id, film: r.film, total: r.total, shot: r.shot, startedAt: r.startedAt, developedAt: now, readyAt: now + cfg.dev });
  cfg.roll = null; save(); filmRender();
  openAlbums();
}

/* ═════════ 필름 장전 화면 (첫 실행 · 새 롤) ═════════ */
function snapper(el, ratio, onIdx) {
  const size = () => { const W = el.clientWidth, fw = Math.round(W * ratio); el.style.setProperty('--fw', fw + 'px'); el.style.paddingLeft = el.style.paddingRight = (W - fw) / 2 + 'px'; return fw; };
  let t; el.addEventListener('scroll', () => { clearTimeout(t); t = setTimeout(() => { const fw = el.firstElementChild ? el.firstElementChild.offsetWidth : 1; onIdx(Math.min(el.children.length - 1, Math.max(0, Math.round(el.scrollLeft / fw)))); }, 60); });
  return { center(i, smooth) { const fw = size(); el.scrollTo({ left: i * fw, behavior: smooth ? 'smooth' : 'auto' }); }, size };
}
function showLoad(first) {
  $$('.load').forEach(x => x.remove());
  let mode = cfg.mode || 'film', idx = Math.max(0, FILMS.findIndex(f => f.id === (cfg.lastFilm || 'portra400'))), total = cfg.lastTotal || 24, skin = cfg.skin || 'classic';
  const ov = document.createElement('div'); ov.className = 'load';
  ov.innerHTML = `
    <div class="lh"><b>STILL <i>35</i></b><small>${first ? '처음 오셨네요. 카메라를 고르세요' : '새 필름을 장전하세요'}</small></div>
    <div class="seg" id="lmode"><button data-m="film">필름 카메라<small>필카</small></button><button data-m="digital">디지털<small>디카</small></button></div>
    <div class="lcards" id="lcards">${FILMS.map((f, i) => `<div class="lc" data-i="${i}"><div class="box" style="--c:${f.col}"><img src="${new URL('films/' + f.id + '.jpg', SRC).href}" alt="${f.mk} ${f.n}" onerror="this.remove()"><small>${f.mk}</small><b>${f.n}</b><em>ISO ${f.iso}</em></div><p>${f.d}</p></div>`).join('')}</div>
    <div class="lcnt" id="lskin"><small>카메라 스킨</small><div class="skg">${SKINS.map(k => `<button data-s="${k.id}">${k.n}</button>`).join('')}</div></div>
    <div class="lcnt" id="lcnt"><small>필름 컷 수</small><div class="seg s3">${[12, 24, 36].map(n => `<button data-n="${n}">${n}</button>`).join('')}</div></div>
    <p class="lnote" id="lnote"></p>
    <button class="go" id="lgo">장전하고 시작</button>`;
  app.appendChild(ov);
  $('#lmode').style.display = 'none';
  const cards = ov.querySelector('#lcards');
  const sn = snapper(cards, .56, i => { idx = i; upd(); });
  function upd() {
    if (!ov.isConnected) return;
    $$('#lmode button').forEach(b => b.classList.toggle('on', b.dataset.m === mode));
    $$('#lcnt button').forEach(b => b.classList.toggle('on', +b.dataset.n === total));
    $$('#lskin button').forEach(b => b.classList.toggle('on', b.dataset.s === skin));
    $('#lskin').style.display = mode === 'film' ? '' : 'none';
    $$('.lc').forEach(c => c.classList.toggle('on', +c.dataset.i === idx));
    $('#lcnt').style.display = mode === 'film' ? '' : 'none';
    $('#lnote').textContent = mode === 'film'
      ? '한 컷 찍을 때마다 필름이 줄어요. 찍은 사진은 "현상"을 눌러야 볼 수 있어요. 작은 뷰파인더로 구도만 확인해요.'
      : '찍은 사진을 바로 보관함에서 볼 수 있어요. 필름 색감은 자유롭게 바꿀 수 있어요.';
    $('#lgo').textContent = mode === 'film' ? '장전하고 시작' : '시작';
  }
  $('#lmode').onclick = e => { const b = e.target.closest('button'); if (b) { mode = b.dataset.m; upd(); } };
  $('#lskin').onclick = e => { const b = e.target.closest('button'); if (b) { skin = b.dataset.s; upd(); } };
  $('#lcnt').onclick = e => { const b = e.target.closest('button'); if (b) { total = +b.dataset.n; upd(); } };
  cards.addEventListener('click', e => { const c = e.target.closest('.lc'); if (c) { idx = +c.dataset.i; upd(); sn.center(idx, true); } });
  $('#lgo').onclick = async () => {
    cfg.mode = mode; cfg.skin = skin; cfg.lastFilm = FILMS[idx].id; cfg.lastTotal = total;
    if (mode === 'film') { cfg.roll = { id: Date.now(), film: FILMS[idx].id, total, shot: 0, startedAt: Date.now(), armed: true, ended: false }; }
    else st.f = idx;
    save(); ov.remove(); applyMode(); setP(0); filmRender();
    if (!stream) startCam();
    if (mode === 'film') toast('필름 장전 완료 · ' + FILMS[idx].mk + ' ' + FILMS[idx].n, 2200);
  };
  upd(); requestAnimationFrame(() => sn.center(idx, false));
}

/* ═════════ 설정 시트 ═════════ */
const SKIN_THUMB = { pfun: 'fun3.jpg', pzbr: 'pzbr.jpg' };
function openSettings() {
  const ov = document.createElement('div'); ov.className = 'mdl docked';
  /* 스킨 방향(회전)과 같은 방향으로 시트를 돌려서, 카메라 스킨의 '아래쪽'에 붙도록 한다 */
  const place = () => {
    const rot = isFilm() ? stageRot() : 0, vw = innerWidth, vh = innerHeight;
    if (Math.abs(rot) === 90) Object.assign(ov.style, { left: '50%', top: '50%', right: 'auto', bottom: 'auto', width: vh + 'px', height: vw + 'px', transform: `translate(-50%,-50%) rotate(${rot}deg)` });
    else Object.assign(ov.style, { left: '0', top: '0', right: '0', bottom: '0', width: '', height: '', transform: '' });
  };
  const LV = ['끔', '약', '강'];
  const row = (label, inner) => `<div class="srow"><span>${label}</span><div class="seg s3">${inner}</div></div>`;
  let sc = 0;
  const draw = () => {
    const old = ov.querySelector('.skstrip'); if (old) sc = old.scrollTop;
    const skinRow = APP === 'film' ? `<div class="skstrip">${SKINS.map((k, i) => `<button data-k="skin" data-v="${k.id}" class="sk ${cfg.skin === k.id ? 'on' : ''}"><img src="${new URL('skins/' + SKIN_THUMB[k.id], SRC).href}" alt=""><b>${i + 1}</b><span>${k.n}</span></button>`).join('')}</div>` : '';
    ov.innerHTML = `<div class="mbox sset dock"><div class="dh"><b>카메라 설정</b><button id="sdone" class="ghost">닫기</button></div>${skinRow}
      <div class="rows">${isFilm() ? row('쥐는 손', `<button data-k="rot" data-v="left" class="${cfg.rot === 'left' ? 'on' : ''}">오른손</button><button data-k="rot" data-v="right" class="${cfg.rot === 'right' ? 'on' : ''}">왼손</button>`) : ''}
      ${row('소리', `<button data-k="sound" data-v="1" class="${cfg.sound ? 'on' : ''}">켜짐</button><button data-k="sound" data-v="0" class="${!cfg.sound ? 'on' : ''}">꺼짐</button>`)}
      ${isFilm() ? row('현상 대기', DEV_OPTS.map(o => `<button data-k="dev" data-v="${o.ms}" class="${cfg.dev === o.ms ? 'on' : ''}">${o.l}</button>`).join('')) : ''}
      ${row('날짜 각인', `<button data-k="stamp" data-v="0" class="${!cfg.stamp ? 'on' : ''}">끔</button><button data-k="stamp" data-v="1" class="${cfg.stamp ? 'on' : ''}">켜짐</button>`)}
      ${row('빛샘', LV.map((l, i) => `<button data-k="leak" data-v="${i}" class="${(cfg.leak | 0) === i ? 'on' : ''}">${l}</button>`).join(''))}
      ${row('먼지·스크래치', LV.map((l, i) => `<button data-k="dust" data-v="${i}" class="${(cfg.dust | 0) === i ? 'on' : ''}">${l}</button>`).join(''))}</div>
      <p class="fxnote">날짜·빛샘·먼지는 앞으로 찍는 사진부터 적용돼요<br>빌드 ${BUILD}</p></div>`;
    const st = ov.querySelector('.skstrip'); if (st) { st.scrollTop = sc; if (!sc) { const on = st.querySelector('.on'); if (on) st.scrollTop = on.offsetTop - 12; } }
  };
  place(); draw(); app.appendChild(ov);
  ov.addEventListener('click', e => {
    if (e.target === ov || e.target.id === 'sdone') { ov.remove(); return; }
    const b = e.target.closest('button[data-k]'); if (!b) return;
    const k = b.dataset.k, v = b.dataset.v;
    if (k === 'skin') { cfg.skin = v; filmRender(); layoutFilm(); }
    if (k === 'rot') { cfg.rot = v; layoutFilm(); place(); }
    if (k === 'sound') cfg.sound = v === '1'; if (k === 'dev') cfg.dev = +v;
    if (k === 'stamp') cfg.stamp = v === '1'; if (k === 'leak') cfg.leak = +v; if (k === 'dust') cfg.dust = +v;
    save(); draw();
  });
}


/* ═════════ 디카: 샘플 앱풍 CAMERA / LENS / FILM 카드 + 선택 시트 ═════════ */
const CAMS = [{ n: 'Standard', s: '3:2 · 기본', r: 0 }, { n: 'Half Frame', s: '4:3 · 세로 3:4', r: 1 }, { n: 'Square', s: '1:1 · 정사각', r: 2 }, { n: 'Cinema', s: '16:9 · 길쭉', r: 3 }];
const LENSES = [{ n: '26mm f1.8', s: '기본 화각', z: 1 }, { n: '35mm f2', s: '약간 좁게', z: 1.35 }, { n: '50mm f2', s: '표준 화각', z: 1.9 }, { n: '85mm f2.8', s: '인물용 망원', z: 3.2 }];
const ICO = {
  camera: '<svg viewBox="0 0 48 36"><rect x="4" y="9" width="40" height="23" rx="3"/><path d="M16 9l2-4h12l2 4"/><circle cx="24" cy="21" r="7"/><circle cx="24" cy="21" r="3"/><circle cx="38" cy="14" r="1.2"/></svg>',
  lens: '<svg viewBox="0 0 48 36"><circle cx="24" cy="18" r="14"/><circle cx="24" cy="18" r="9"/><circle cx="24" cy="18" r="4"/><path d="M6 18h4M38 18h4"/></svg>',
};
const filmImg = f => new URL('films/' + f.id + '.jpg', SRC).href;
const nearLens = z => LENSES.reduce((b, l) => Math.abs(l.z - z) < Math.abs(b.z - z) ? l : b);
function syncCards() {
  const box = $('#cards'); if (!box) return;
  const cam = CAMS[Math.min(st.ratio, CAMS.length - 1)], lens = nearLens(st.zoom), f = FILMS[st.f];
  const set = (k, t, ico) => { const c = box.querySelector(`[data-pick=${k}]`); c.querySelector('b').textContent = t; c.querySelector('i').innerHTML = ico; };
  set('camera', cam.n, ICO.camera); set('lens', lens.n, ICO.lens);
  set('film', f.n, `<img src="${filmImg(f)}" alt="" onerror="this.remove()">`);
}
function openPicker(kind) {
  let items, cur, title;
  if (kind === 'camera') { title = 'CAMERA'; cur = st.ratio; items = CAMS.map(c => ({ k: c.r, t: c.n, s: c.s, ico: ICO.camera })); }
  else if (kind === 'lens') { title = 'LENS'; cur = LENSES.indexOf(nearLens(st.zoom)); items = LENSES.map((l, i) => ({ k: i, t: l.n, s: l.s, ico: ICO.lens })); }
  else { title = 'FILM'; cur = st.f; items = FILMS.map((f, i) => ({ k: i, t: f.n, s: f.mk + ' · ISO ' + f.iso, img: filmImg(f) })); }
  $('#pickt').textContent = title;
  $('#pickg').innerHTML = items.map(it => `<button class="po ${it.k === cur ? 'on' : ''}" data-k="${it.k}">${it.img ? `<img src="${it.img}" alt="">` : `<span class="pi">${it.ico}</span>`}<b>${it.t}</b><small>${it.s}</small></button>`).join('');
  $('#pickov').dataset.kind = kind; $('#pickov').classList.add('on');
}
if ($('#cards')) {
  $('#cards').addEventListener('click', e => { const c = e.target.closest('[data-pick]'); if (c) openPicker(c.dataset.pick); });
  $('#pickov').addEventListener('click', e => {
    const ov = $('#pickov');
    if (e.target === ov || e.target.id === 'pickx') { ov.classList.remove('on'); return; }
    const b = e.target.closest('.po'); if (!b) return;
    const k = +b.dataset.k, kind = ov.dataset.kind;
    if (kind === 'camera') st.ratio = k; else if (kind === 'lens') st.zoom = LENSES[k].z; else st.f = k;
    render(); ov.classList.remove('on');
  });
}


/* 백그라운드에 오래 떠 있던 홈 화면 앱이 옛 코드를 계속 쓰지 않도록: 앱으로 돌아올 때마다 서버의 BUILD 를 확인해 다르면 새로고침 */
async function checkUpdate() {
  try {
    const t = await (await fetch(SRC.split('?')[0] + '?chk=' + Date.now(), { cache: 'no-store' })).text();
    const m = t.match(/const BUILD = '([^']+)'/);
    if (m && m[1] !== BUILD && !pending) location.reload();
  } catch {}
}
document.addEventListener('visibilitychange', () => { if (!document.hidden) checkUpdate(); });
checkUpdate();

/* ═════════ 입력 연결 ═════════ */
const fbar = $('.filters');
fbar.innerHTML = FILMS.map((x, i) => `<div data-i="${i}"><b>${x.n}</b><small>${x.mk} · ISO ${x.iso}</small><em>${x.d}</em></div>`).join('');
const fmark = document.createElement('div'); fmark.className = 'fmark'; vf.appendChild(fmark);
const fsn = snapper(fbar, .46, i => { if (i !== st.f && !isFilm()) { st.f = i; render(); } });
fbar.addEventListener('click', e => { const d = e.target.closest('[data-i]'); if (d) { st.f = +d.dataset.i; render(); fsn.center(st.f, true); e.stopPropagation(); } });
$('.zoom').addEventListener('click', e => { const d = e.target.closest('[data-z]'); if (d) { st.zoom = +d.dataset.z; render(); e.stopPropagation(); } });
$('.ratio').addEventListener('click', () => { st.ratio = (st.ratio + 1) % RATIOS.length; render(); });
const ics = $$('.top .ic');
ics[0].addEventListener('click', () => { st.grid = !st.grid; render(); toast(st.grid ? '격자선 켜짐' : '격자선 꺼짐'); });
ics[1].addEventListener('click', async () => {
  const tr = stream && stream.getVideoTracks()[0];
  const cap = tr && tr.getCapabilities && tr.getCapabilities();
  if (!cap || !cap.torch) { toast('이 기기·브라우저는 웹에서 플래시를 지원하지 않아요'); return; }
  st.torch = !st.torch; await tr.applyConstraints({ advanced: [{ torch: st.torch }] }).catch(() => {}); render();
});
ics[2].addEventListener('click', () => { st.timer = st.timer === 0 ? 3 : st.timer === 3 ? 10 : 0; render(); });
if (ics[3]) ics[3].addEventListener('click', openSettings); // 디카 버전: 상단 설정 아이콘
const flip = () => { st.facing = st.facing === 'environment' ? 'user' : 'environment'; startCam(); };
$('.flip').addEventListener('click', flip);
$('#shutter').addEventListener('click', shoot); $('#fshut').addEventListener('click', shoot);
$('.thumb').addEventListener('click', openDigitalLibrary);
vf.addEventListener('click', e => {
  if (e.target.closest('.msg')) return;
  const r = vf.getBoundingClientRect(), fc = $('.focus');
  fc.style.left = (e.clientX - r.left) + 'px'; fc.style.top = (e.clientY - r.top) + 'px';
  fc.animate([{ transform: 'scale(1.5)', opacity: .3 }, { transform: 'scale(1)', opacity: 1 }], { duration: 180 });
});
const dial = $('.dial'), ticks = $('.dial .ticks');
const setEv = x => { const r = ticks.getBoundingClientRect(); st.ev = Math.round((Math.min(1, Math.max(0, (x - r.left) / r.width)) * 4 - 2) * 3) / 3; render(); };
dial.addEventListener('pointerdown', e => { dial.setPointerCapture(e.pointerId); setEv(e.clientX); });
dial.addEventListener('pointermove', e => { if (dial.hasPointerCapture(e.pointerId)) setEv(e.clientX); });
dial.addEventListener('dblclick', () => { st.ev = 0; render(); });

const relayout = () => { layoutFilm(); render(); fsn.center(st.f, false); setP(0); };
window.addEventListener('resize', relayout);
window.addEventListener('orientationchange', () => setTimeout(relayout, 300));
document.addEventListener('visibilitychange', () => {
  if (document.hidden) stopCam();
  else if (!stream && !$('.pg,.viewer,.backbar,.load')) startCam();
});
/* 필름 화면에서는 손가락 이동으로 페이지가 끌려 내려가거나 새로고침되지 않게 막는다 */
document.addEventListener('touchmove', e => { if (isFilm() && e.target.closest && e.target.closest('.film') && !e.target.closest('.mdl,.pg,.albums,.viewer')) e.preventDefault(); }, { passive: false });
if ('serviceWorker' in navigator && location.protocol.startsWith('http')) navigator.serviceWorker.register(new URL('sw.js', SRC).href).catch(() => {});

const clock = () => { const d = new Date(); $('#clock').textContent = d.getHours() + ':' + String(d.getMinutes()).padStart(2, '0'); }; clock(); setInterval(clock, 20000);
if (location.search.includes('shot')) document.body.classList.add('shot');
if (location.search.includes('fix')) document.body.classList.add('fix');

/* ═════════ 시작 ═════════ */
const qs = location.search;
if (qs.includes('mode=digital')) { cfg.mode = 'digital'; }
{ const m = qs.match(/skin=(\w+)/); if (m && SKINS.some(k => k.id === m[1])) cfg.skin = m[1]; }
{ const a = qs.match(/armdeg=(\d+)/); if (a) setArm(+a[1], false); }
cfg.mode = APP;
if (qs.includes('mode=film')) cfg.mode = 'film';
if (qs.includes('mode=film') && !cfg.roll) { cfg.roll = { id: Date.now(), film: 'portra400', total: 24, shot: qs.includes('shots') ? 9 : 0, startedAt: Date.now(), armed: true, ended: false }; }
if (qs.includes('mode=film') && cfg.roll) cfg.roll.armed = !qs.includes('unwound');
applyMode(); refreshThumb(); startCam();
if (qs.includes('opensettings')) setTimeout(openSettings, 900);
requestAnimationFrame(() => { fsn.center(st.f, false); setP(0); });
if (!cfg.mode || (cfg.mode === 'film' && !cfg.roll && !qs.includes('noload'))) showLoad(!cfg.mode);
if (qs.includes('test')) window.__still = { st, cfg, shoot, develop, openAlbums, render, FILMS, DB, setStream: s => { stream = s; video.srcObject = s; video.style.display = 'block'; scene.style.display = 'none'; video.play(); }, jobs: () => jobs, process: processPixels };
})();
