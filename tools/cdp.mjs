#!/usr/bin/env node
// Minimal CDP driver for the persistent headless Chrome on --remote-debugging-port.
// Usage: node cdp.mjs <steps.json|json> [--port 9222] [--target <id>]
// Ops: goto, wait, eval, text, shot, shotfull, url, focus, type, keypress, clickx, clicktext, clear
import fs from 'node:fs';
import path from 'node:path';

const args = process.argv.slice(2);
let stepsRaw = null, port = 9222, targetId = null;
for (let i = 0; i < args.length; i++) {
  if (args[i] === '--port') port = Number(args[++i]);
  else if (args[i] === '--target') targetId = args[++i];
  else if (stepsRaw === null) stepsRaw = args[i];
}
if (!stepsRaw) { console.error('no steps'); process.exit(2); }
const steps = (stepsRaw.endsWith('.json') && fs.existsSync(stepsRaw))
  ? JSON.parse(fs.readFileSync(stepsRaw, 'utf8'))
  : JSON.parse(stepsRaw);

const list = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json();
let page = targetId
  ? list.find(t => t.id === targetId)
  : list.find(t => t.type === 'page' && /^https?:/.test(String(t.url)));
if (!page) {
  const created = await fetch(`http://127.0.0.1:${port}/json/new?about:blank`, { method: 'PUT' });
  page = await created.json();
  console.log('NEW_TARGET', page.id);
}
if (!page) { console.error('no page target'); process.exit(3); }

const ws = new WebSocket(page.webSocketDebuggerUrl);
let id = 0;
const pending = new Map();
ws.addEventListener('message', ev => {
  const msg = JSON.parse(ev.data);
  if (msg.id && pending.has(msg.id)) {
    const { resolve, reject } = pending.get(msg.id);
    pending.delete(msg.id);
    msg.error ? reject(new Error(JSON.stringify(msg.error))) : resolve(msg.result);
  }
});
await new Promise((res, rej) => {
  ws.addEventListener('open', res, { once: true });
  ws.addEventListener('error', rej, { once: true });
});

function send(method, params = {}) {
  const mid = ++id;
  ws.send(JSON.stringify({ id: mid, method, params }));
  return new Promise((resolve, reject) => pending.set(mid, { resolve, reject }));
}
const sleep = ms => new Promise(r => setTimeout(r, ms));

async function evaluate(expression) {
  const r = await send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true, userGesture: true });
  if (r.exceptionDetails) return { error: r.exceptionDetails.text + ' ' + (r.exceptionDetails.exception?.description || '') };
  return { value: r.result?.value };
}

const rectOf = sel => `(() => {
  const el = document.querySelector(${JSON.stringify(sel)});
  if (!el) return null;
  el.scrollIntoView({ block: 'center', inline: 'center' });
  const r = el.getBoundingClientRect();
  if (!r.width || !r.height) return null;
  return { x: r.left + r.width / 2, y: r.top + r.height / 2, w: r.width, h: r.height };
})()`;

async function realClick(rect) {
  const base = { x: rect.x, y: rect.y, button: 'left', clickCount: 1, pointerType: 'mouse' };
  await send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: rect.x, y: rect.y });
  await send('Input.dispatchMouseEvent', { type: 'mousePressed', ...base });
  await sleep(60);
  await send('Input.dispatchMouseEvent', { type: 'mouseReleased', ...base });
}

await send('Page.enable');
await send('Runtime.enable');

for (const step of steps) {
  try {
    switch (step.op) {
      case 'goto': {
        await send('Page.navigate', { url: step.url });
        for (let i = 0; i < 160; i++) {
          await sleep(250);
          const r = await evaluate('document.readyState');
          if (r.value === 'complete') break;
        }
        await sleep(step.settle ?? 1200);
        break;
      }
      case 'wait': await sleep(step.ms || 1000); break;
      case 'eval': {
        const r = await evaluate(step.expr);
        console.log('EVAL', step.label ? `[${step.label}]` : '', JSON.stringify(r).slice(0, step.max || 8000));
        break;
      }
      case 'text': {
        const r = await evaluate('document.body.innerText');
        console.log('TEXT', JSON.stringify((r.value || '').slice(0, step.max || 6000)));
        break;
      }
      case 'url': {
        const r = await evaluate('location.href');
        console.log('URL', r.value);
        break;
      }
      case 'shot': {
        const r = await send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false });
        fs.mkdirSync(path.dirname(step.path), { recursive: true });
        fs.writeFileSync(step.path, Buffer.from(r.data, 'base64'));
        console.log('SHOT', step.path);
        break;
      }
      case 'shotfull': {
        const m = await send('Page.getLayoutMetrics');
        const w = Math.ceil(m.cssContentSize.width), h = Math.ceil(m.cssContentSize.height);
        const r = await send('Page.captureScreenshot', {
          format: 'png', captureBeyondViewport: true,
          clip: { x: 0, y: 0, width: w, height: Math.min(h, 8000), scale: 1 },
        });
        fs.mkdirSync(path.dirname(step.path), { recursive: true });
        fs.writeFileSync(step.path, Buffer.from(r.data, 'base64'));
        console.log('SHOTFULL', step.path, w + 'x' + h);
        break;
      }
      case 'focus': {
        const r = await evaluate(`(() => { const el = document.querySelector(${JSON.stringify(step.sel)}); if (!el) return 'NF'; el.scrollIntoView({block:'center'}); el.focus(); return 'OK'; })()`);
        if (r.value === 'NF' && !step.optional) throw new Error('focus not found: ' + step.sel);
        break;
      }
      case 'clear': {
        await evaluate(`(() => { const el = document.querySelector(${JSON.stringify(step.sel)}); if (!el) return 'NF'; el.focus(); el.select && el.select(); return 'OK'; })()`);
        await send('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Backspace', code: 'Backspace', windowsVirtualKeyCode: 8, nativeVirtualKeyCode: 8 });
        await send('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Backspace', code: 'Backspace', windowsVirtualKeyCode: 8, nativeVirtualKeyCode: 8 });
        break;
      }
      case 'type': {
        const r = await evaluate(`(() => { const el = document.querySelector(${JSON.stringify(step.sel)}); if (!el) return 'NF'; el.scrollIntoView({block:'center'}); el.focus(); return 'OK'; })()`);
        if (r.value === 'NF') throw new Error('type: not found ' + step.sel);
        await sleep(120);
        await send('Input.insertText', { text: step.text });
        await sleep(150);
        console.log('TYPE', step.sel, '->', step.text);
        break;
      }
      case 'keypress': {
        const key = step.key || 'Enter';
        const code = key === 'Enter' ? 13 : (key === 'Tab' ? 9 : 0);
        await send('Input.dispatchKeyEvent', { type: 'rawKeyDown', key, code: key, windowsVirtualKeyCode: code, nativeVirtualKeyCode: code });
        await send('Input.dispatchKeyEvent', { type: 'char', key, text: key === 'Enter' ? '\r' : key, windowsVirtualKeyCode: code });
        await send('Input.dispatchKeyEvent', { type: 'keyUp', key, code: key, windowsVirtualKeyCode: code, nativeVirtualKeyCode: code });
        console.log('KEY', key, 'on', step.sel || '(focused)');
        break;
      }
      case 'clickx': {
        const r = await evaluate(rectOf(step.sel));
        if (!r.value) { if (step.optional) { console.log('CLICKX_SKIP', step.sel); break; } throw new Error('clickx: not visible ' + step.sel); }
        await realClick(r.value);
        break;
      }
      case 'clicktext': {
        const expr = `(() => {
          const want = ${JSON.stringify(step.text)};
          const nodes = [...document.querySelectorAll('div,button,span,a')];
          const exact = nodes.filter(e => e.innerText && e.innerText.trim() === want);
          const target = exact.length ? exact[exact.length - 1] : nodes.find(e => e.innerText && e.innerText.trim().startsWith(want));
          if (!target) return null;
          target.scrollIntoView({ block: 'center' });
          const r = target.getBoundingClientRect();
          if (!r.width || !r.height) return null;
          return { x: r.left + r.width / 2, y: r.top + r.height / 2, w: r.width, h: r.height };
        })()`;
        const r = await evaluate(expr);
        if (!r.value) { if (step.optional) { console.log('CLICKTEXT_SKIP', step.text); break; } throw new Error('clicktext: not found ' + step.text); }
        await realClick(r.value);
        break;
      }
      case 'ua': {
    await send('Emulation.setUserAgentOverride', {
      userAgent: step.value || 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/157.0.0.0 Safari/537.36',
      acceptLanguage: 'es-MX,es;q=0.9,en;q=0.8',
      platform: 'Win32',
    });
    break;
  }  case 'viewport': {
        await send('Emulation.setDeviceMetricsOverride', { width: step.width || 1440, height: step.height || 900, deviceScaleFactor: 1, mobile: false });
        break;
      }
      case 'netstart': {
        await send('Network.enable');
        await send('Log.enable');
        globalThis.__evts = [];
        console.log('NET_START');
        break;
      }
      case 'netdump': {
        const evts = globalThis.__evts || [];
        const reqs = new Map();
        for (const e of evts) {
          if (e.method === 'Network.requestWillBeSent') {
            reqs.set(e.params.requestId, { url: e.params.request.url, method: e.params.request.method, type: e.params.type, status: null, err: null });
          } else if (e.method === 'Network.responseReceived') {
            const r = reqs.get(e.params.requestId); if (r) { r.status = e.params.response.status; }
          } else if (e.method === 'Network.loadingFailed') {
            const r = reqs.get(e.params.requestId); if (r) { r.err = e.params.errorText; }
          } else if (e.method === 'Runtime.consoleAPICalled') {
            console.log('CONSOLE', e.params.type, JSON.stringify(e.params.args.map(a => a.value ?? a.description ?? a.type)).slice(0, 400));
          } else if (e.method === 'Log.entryAdded') {
            console.log('LOGENTRY', e.params.entry.level, String(e.params.entry.text).slice(0, 300));
          }
        }
        for (const r of reqs.values()) {
          if (/kyteapp|firebase|googleapis|identitytoolkit|cloudfunctions|run\.app/.test(r.url)) {
            console.log('NET', r.method, r.status ?? r.err ?? '-', r.type, r.url.slice(0, 180));
          }
        }
        break;
      }
      case 'clickjs': {
        const r = await evaluate(step.expr);
        if (!r.value) { if (step.optional) { console.log('CLICKJS_SKIP'); break; } throw new Error('clickjs: no rect'); }
        await realClick(r.value);
        console.log('CLICKJS', JSON.stringify(r.value));
        break;
      }
      case 'typejs': {
        const r = await evaluate(step.expr);
        if (!r.value) throw new Error('typejs: focus failed');
        await sleep(120);
        await send('Input.insertText', { text: step.text });
        await sleep(150);
        console.log('TYPEJS ->', step.text);
        break;
      }
      case 'wheel': {
        await send('Input.dispatchMouseEvent', { type: 'mouseWheel', x: step.x || 700, y: step.y || 500, deltaX: 0, deltaY: step.dy || 500 });
        await sleep(400);
        break;
      }
      case 'nocache': {
        await send('Network.enable');
        await send('Network.setCacheDisabled', { cacheDisabled: true });
        console.log('NOCACHE');
        break;
      }
      case 'reload': {
        await send('Page.reload', { ignoreCache: true });
        await sleep(step.ms || 2500);
        break;
      }
      case 'installcheck': {
        try {
          const r1 = await send('Page.getInstallabilityErrors', {});
          console.log('INSTALL_ERRORS', JSON.stringify(r1));
        } catch (e) { console.log('INSTALL_ERRORS_FAIL', String(e && e.message)); }
        try {
          const r2 = await send('Page.getAppManifest', {});
          console.log('MANIFEST', JSON.stringify({ url: r2.url, errors: r2.errors, hasData:!!r2.data }).slice(0, 800));
        } catch (e) { console.log('MANIFEST_FAIL', String(e && e.message)); }
        break;
      }      case 'setfile': {
        const doc = await send('DOM.getDocument', {});
        const q = await send('DOM.querySelector', { nodeId: doc.root.nodeId, selector: step.sel });
        if (!q.nodeId) { console.log('SETFILE no node'); break; }
        await send('DOM.setFileInputFiles', { nodeId: q.nodeId, files: step.files });
        console.log('SETFILE', JSON.stringify(step.files));
        break;
      }      case 'grantnotif': {
        try {
          await send('Browser.grantPermissions', { origin: step.origin || 'http://127.0.0.1:4321', permissions: ['notifications'] });
          console.log('GRANT ok');
        } catch (e) { console.log('GRANT fail', String(e && e.message)); }
        break;
      }      case 'log': console.log('LOG', step.msg ?? ''); break;
      default: console.error('unknown op', step.op);
    }
  } catch (e) {
    console.error('STEP_FAIL', JSON.stringify(step).slice(0, 200), String(e.message || e));
    if (step.fatal) process.exit(4);
  }
}
ws.close();

