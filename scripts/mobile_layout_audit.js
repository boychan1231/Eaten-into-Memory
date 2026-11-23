import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..');

const MIME = {
    '.html': 'text/html; charset=utf-8',
    '.js': 'application/javascript; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.gif': 'image/gif',
    '.svg': 'image/svg+xml',
    '.woff2': 'font/woff2',
    '.ttf': 'font/ttf',
    '.mp3': 'audio/mpeg',
    '.wav': 'audio/wav',
    '.json': 'application/json'
};

function startStaticServer() {
    return new Promise((resolve) => {
        const server = http.createServer((req, res) => {
            const urlPath = (req.url || '/').split('?')[0];
            const rel = urlPath === '/' ? 'index.html' : urlPath.replace(/^\/+/, '');
            const fullPath = path.join(ROOT_DIR, rel);
            if (!fullPath.startsWith(ROOT_DIR) || !fs.existsSync(fullPath) || fs.statSync(fullPath).isDirectory()) {
                res.writeHead(404);
                res.end('Not Found');
                return;
            }
            const ext = path.extname(fullPath).toLowerCase();
            res.writeHead(200, { 'Content-Type': MIME[ext] || 'application/octet-stream' });
            fs.createReadStream(fullPath).pipe(res);
        });
        server.listen(0, '127.0.0.1', () => {
            const { port } = server.address();
            resolve({ server, baseUrl: `http://127.0.0.1:${port}` });
        });
    });
}

function launchChromium() {
    return new Promise((resolve, reject) => {
        const proc = spawn('/usr/bin/chromium', [
            '--headless=new',
            '--no-sandbox',
            '--disable-gpu',
            '--disable-dev-shm-usage',
            '--remote-debugging-port=0',
            'about:blank'
        ], { stdio: ['ignore', 'pipe', 'pipe'] });

        let stderr = '';
        const timer = setTimeout(() => {
            proc.kill('SIGKILL');
            reject(new Error(`Chromium 啟動逾時: ${stderr}`));
        }, 12000);

        proc.stderr.on('data', (chunk) => {
            stderr += chunk.toString();
            const m = stderr.match(/DevTools listening on (ws:\/\/[^\s]+)/);
            if (m) {
                clearTimeout(timer);
                resolve({ proc, wsUrl: m[1] });
            }
        });
        proc.on('error', (err) => {
            clearTimeout(timer);
            reject(err);
        });
    });
}

async function createCdpClient(wsUrl) {
    const ws = new WebSocket(wsUrl);
    await new Promise((resolve, reject) => {
        ws.addEventListener('open', resolve, { once: true });
        ws.addEventListener('error', reject, { once: true });
    });
    let nextId = 1;
    const pending = new Map();
    const listeners = new Map();

    ws.addEventListener('message', (evt) => {
        const msg = JSON.parse(evt.data.toString());
        if (msg.id && pending.has(msg.id)) {
            const { resolve, reject } = pending.get(msg.id);
            pending.delete(msg.id);
            if (msg.error) reject(new Error(msg.error.message));
            else resolve(msg.result);
        } else if (msg.method && listeners.has(msg.method)) {
            for (const fn of listeners.get(msg.method)) fn(msg.params);
        }
    });

    return {
        send(method, params = {}) {
            const id = nextId++;
            return new Promise((resolve, reject) => {
                pending.set(id, { resolve, reject });
                ws.send(JSON.stringify({ id, method, params }));
            });
        },
        on(method, fn) {
            if (!listeners.has(method)) listeners.set(method, []);
            listeners.get(method).push(fn);
        },
        close() {
            ws.close();
        }
    };
}

async function auditViewport(baseUrl, cdpPortUrl, viewport) {
    // 透過 browser target 開新分頁
    const listRes = await fetch(`${cdpPortUrl}/json/new?${encodeURIComponent(baseUrl + '/index.html')}`, { method: 'PUT' })
        .catch(() => fetch(`${cdpPortUrl}/json/new?${encodeURIComponent(baseUrl + '/index.html')}`));
    const target = await listRes.json();
    const cdp = await createCdpClient(target.webSocketDebuggerUrl);

    const jsErrors = [];
    cdp.on('Runtime.exceptionThrown', (params) => {
        jsErrors.push(params?.exceptionDetails?.text || 'Unknown JS Exception');
    });

    await cdp.send('Page.enable');
    await cdp.send('Runtime.enable');
    await cdp.send('Emulation.setDeviceMetricsOverride', {
        width: viewport.width,
        height: viewport.height,
        deviceScaleFactor: 2,
        mobile: true
    });

    await cdp.send('Page.navigate', { url: `${baseUrl}/index.html` });
    await new Promise(r => setTimeout(r, 1500));

    // 若開場動畫存在則直接關閉進入遊戲主畫面並觸發一次開始遊戲，以便實測手牌與 HUD
    const evalRes = await cdp.send('Runtime.evaluate', {
        awaitPromise: true,
        returnByValue: true,
        expression: `(async () => {
            const intro = document.getElementById('modern-intro-overlay');
            if (intro) intro.style.display = 'none';
            const startBtn = document.getElementById('start-game-btn');
            if (startBtn && typeof startBtn.click === 'function') {
                startBtn.click();
            }
            await new Promise(r => setTimeout(r, 350));
            const readyBtn = document.getElementById('btn-start-next-round');
            if (readyBtn && readyBtn.offsetParent !== null) {
                readyBtn.click();
                await new Promise(r => setTimeout(r, 350));
            }
            const tutorialModal = document.getElementById('tutorial-tooltip');
            if (tutorialModal) tutorialModal.style.display = 'none';

            const vw = window.innerWidth;
            const vh = window.innerHeight;
            const overflowX = document.documentElement.scrollWidth - vw;

            const rectOf = (sel) => {
                const el = document.querySelector(sel);
                if (!el) return null;
                const st = getComputedStyle(el);
                if (st.display === 'none' || st.visibility === 'hidden') return null;
                const r = el.getBoundingClientRect();
                return { x: Math.round(r.left), y: Math.round(r.top), w: Math.round(r.width), h: Math.round(r.height), right: Math.round(r.right), bottom: Math.round(r.bottom) };
            };

            const leftDrawer = rectOf('.hud-drawer-left');
            const rightDrawer = rectOf('.hud-drawer-right');
            const handDock = rectOf('#human-hand');
            const nextBtn = rectOf('#next-step-btn');
            const handCardCount = document.querySelectorAll('#human-hand > *').length;
            const handHasFan = document.getElementById('human-hand')?.classList.contains('fan-hand-active') || false;

            const overlap = (a, b) => {
                if (!a || !b || a.w <= 0 || a.h <= 0 || b.w <= 0 || b.h <= 0) return false;
                return !(a.right <= b.x || b.right <= a.x || a.bottom <= b.y || b.bottom <= a.y);
            };

            return {
                vw, vh, overflowX,
                leftDrawer, rightDrawer,
                drawersOverlap: overlap(leftDrawer, rightDrawer),
                handDock, handCardCount, handHasFan,
                handOutOfBottom: handDock ? (handDock.bottom > vh + 8) : false,
                handOverlapsDrawers: overlap(handDock, leftDrawer) || overlap(handDock, rightDrawer),
                nextBtn,
                nextBtnVisible: nextBtn ? (nextBtn.w >= 32 && nextBtn.h >= 24 && nextBtn.right <= vw + 4 && nextBtn.bottom <= vh + 4) : false
            };
        })()`
    });

    await cdp.close();
    await fetch(`${cdpPortUrl}/json/close/${target.id}`).catch(() => {});

    return { viewport, metrics: evalRes?.result?.value, jsErrors };
}

async function main() {
    const { server, baseUrl } = await startStaticServer();
    const { proc, wsUrl } = await launchChromium();
    const portMatch = wsUrl.match(/ws:\/\/(127\.0\.0\.1:\d+)/);
    const cdpPortUrl = `http://${portMatch[1]}`;

    const viewports = [
        { name: 'iPhone SE 直屏', width: 375, height: 667 },
        { name: 'iPhone 14 直屏', width: 390, height: 844 },
        { name: '行動裝置橫屏', width: 844, height: 390 }
    ];

    console.log('=== 《蝕入記憶》(Eaten into Memory) 行動裝置小螢幕無頭實測 ===');
    let hasIssue = false;

    try {
        for (const vp of viewports) {
            const { metrics, jsErrors } = await auditViewport(baseUrl, cdpPortUrl, vp);
            console.log(`\n[${vp.name} ${vp.width}x${vp.height}]`);
            console.log(`  水平溢出: ${metrics.overflowX}px | 左右抽屜重疊: ${metrics.drawersOverlap} | 扇形啟用: ${metrics.handHasFan} | 手牌數: ${metrics.handCardCount}`);
            console.log(`  手牌區: ${JSON.stringify(metrics.handDock)} (超出底部: ${metrics.handOutOfBottom}, 與抽屜重疊: ${metrics.handOverlapsDrawers})`);
            console.log(`  左抽屜: ${JSON.stringify(metrics.leftDrawer)} | 右抽屜: ${JSON.stringify(metrics.rightDrawer)}`);
            console.log(`  下一回合鈕: ${JSON.stringify(metrics.nextBtn)} (可視合格: ${metrics.nextBtnVisible}) | JS 錯誤數: ${jsErrors.length}`);
            if (jsErrors.length > 0) console.log('  JS Errors:', jsErrors);
            if (metrics.overflowX > 4 || metrics.drawersOverlap || metrics.handOutOfBottom || metrics.handOverlapsDrawers || !metrics.nextBtnVisible || jsErrors.length > 0) {
                hasIssue = true;
            }
        }
    } finally {
        proc.kill('SIGTERM');
        server.close();
    }

    if (hasIssue) {
        console.log('\n[WARN] 偵測到部分小螢幕版面需要微調，請檢視上方量測數據。');
        process.exitCode = 1;
    } else {
        console.log('\n[PASS] 所有行動裝置視口版面量測合格，0 JS 錯誤！');
    }
}

main().catch((err) => {
    console.error('[FAIL] 行動裝置實測失敗：', err);
    process.exit(1);
});
