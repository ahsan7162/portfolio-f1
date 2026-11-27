// A small Chrome DevTools driver for the playground checks: headless Chrome, a tab, evaluate, screenshot, and the
// sessions of out-of-process frames (the sandboxed canvas is one), so their logs and requests can be read too.
import { spawn } from 'node:child_process';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
export const sleep = ms => new Promise(r => setTimeout(r, ms));

export async function chrome(port = 9355, extra = []) {
  const proc = spawn(CHROME, ['--headless=new', `--remote-debugging-port=${port}`, '--disable-gpu', '--hide-scrollbars', ...extra,
    `--user-data-dir=${mkdtempSync(join(tmpdir(), 'cdp-'))}`, 'about:blank'], { stdio: 'ignore' });
  for (let i = 0; ; i++) {
    try { await fetch(`http://127.0.0.1:${port}/json/version`); break; } catch { if (i > 60) throw new Error('Chrome did not start'); await sleep(200); }
  }
  async function tab(url, { width = 1440, height = 900 } = {}) {
    const target = await (await fetch(`http://127.0.0.1:${port}/json/new?about:blank`, { method: 'PUT' })).json();
    const ws = new WebSocket(target.webSocketDebuggerUrl);
    await new Promise((ok, no) => { ws.onopen = ok; ws.onerror = no; });
    let id = 0;
    const waiting = new Map();
    const events = [];
    ws.onmessage = e => {
      const m = JSON.parse(e.data);
      if (m.id && waiting.has(m.id)) { waiting.get(m.id)(m); waiting.delete(m.id); } else if (m.method) events.push(m);
    };
    const send = (method, params = {}, sessionId) => new Promise((ok, no) => {
      const n = ++id;
      waiting.set(n, m => (m.error ? no(new Error(`${method}: ${m.error.message}`)) : ok(m.result)));
      ws.send(JSON.stringify({ id: n, method, params, ...(sessionId ? { sessionId } : {}) }));
    });
    // out-of-process frames (a sandboxed canvas is one) come in as sessions: watch their logs and network too
    const sessions = [];
    const prevOnMessage = ws.onmessage;
    ws.onmessage = e => {
      prevOnMessage(e);
      const m = JSON.parse(e.data);
      if (m.method === 'Target.attachedToTarget') {
        const sid = m.params.sessionId;
        sessions.push({ sid, url: m.params.targetInfo.url });
        for (const d of ['Network.enable', 'Log.enable', 'Runtime.enable']) send(d, {}, sid).catch(() => {});
        send('Target.setAutoAttach', { autoAttach: true, waitForDebuggerOnStart: false, flatten: true }, sid).catch(() => {});
      }
    };
    await send('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: 1, mobile: false });
    await send('Page.enable');
    await send('Runtime.enable');
    await send('Log.enable');
    await send('Network.enable');
    await send('Target.setAutoAttach', { autoAttach: true, waitForDebuggerOnStart: false, flatten: true });
    if (url) await send('Page.navigate', { url });
    const evaluate = async (expression, sessionId) => {
      const r = await send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true }, sessionId);
      if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description ?? r.exceptionDetails.text);
      return r.result.value;
    };
    const shot = async (file, clip) => {
      const { writeFileSync } = await import('node:fs');
      const s = await send('Page.captureScreenshot', { format: 'png', ...(clip ? { clip: { ...clip, scale: 1 } } : {}) });
      writeFileSync(file, Buffer.from(s.data, 'base64'));
    };
    const close = async () => { ws.close(); await fetch(`http://127.0.0.1:${port}/json/close/${target.id}`); };
    return { send, evaluate, events, shot, close, sessions };
  }
  return { tab, kill: () => proc.kill() };
}
