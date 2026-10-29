// modern_board.js
// 現代化星芒機械鐘面渲染層（PixiJS v7）
// 結合階段三的精密咬合齒輪群、微擺暗金鐘擺、十二星芒陣、羅馬時辰環與平滑棋子動畫
(function () {
    const D = 640;                       // 設計座標系 640x640，等比縮放
    const CX = 320, CY = 320, R = 222;   // 鐘面中心與時辰環半徑
    const TOKEN_R = R - 58;              // 棋子所在的內圈半徑
    const ROMAN = ['XII', 'I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI'];

    const PAL = {
        glow: 0x7c8cff,
        gold: 0xffd27f,
        goldBright: 0xffeaa7,
        text: 0xf1f2f6,
        dim: 0x8a90b8,
        danger: 0xff4757,
        orange: 0xff9f43,
        shell: 0x050609,
        darkHub: 0x030306,
        cardLight: 0xeef1f8,
        cardGold: 0xffd27f
    };

    const FONT_UI = 'Inter, "Noto Sans TC", "Microsoft JhengHei", sans-serif';
    const FONT_ROMAN = '"Cinzel", Inter, "Noto Sans TC", serif';

    const hexOf = (key, fallback = 0xffffff) => {
        const s = (window.UI_CONFIG && window.UI_CONFIG.ROLE_COLORS || {})[key];
        return s ? parseInt(s.slice(1), 16) : fallback;
    };
    // 角色顏色鍵：幼體時魔歸到「時魔」，進化後用「時針/分針/秒針」
    const tokenKey = p => (p.type === '時魔' && !String(p.roleCard).includes('幼')) ? p.roleCard : p.type;
    const labelOf = p => p.type === '時之惡' ? '惡'
        : p.type === '受詛者' ? '詛'
        : (String(p.roleCard).includes('幼') ? '幼' : String(p.roleCard).charAt(0));

    // 棋子標籤顯示名稱：玩家顯示「我」，其他角色顯示完整身分（時魔、時之惡、受詛者、時針、分針、秒針）
    const roleDisplayNameOf = (p, isHuman) => {
        if (isHuman) return '我';
        if (p.type === '時之惡') return '時之惡';
        if (p.type === '受詛者') return '受詛者';
        if (p.roleCard === '時針') return '時針';
        if (p.roleCard === '分針') return '分針';
        if (p.roleCard === '秒針') return '秒針';
        if (p.type === '時魔' || String(p.roleCard).includes('幼') || String(p.roleCard).includes('時魔')) return '時魔';
        return p.roleCard || p.type || '時魔';
    };

    const Board = {
        app: null,
        stage: null,
        L: {},
        lineG: null,
        tokens: new Map(),
        pulses: [],
        sinPairs: [],
        gears: [],
        dusts: [],
        pendulumArm: null,
        hands: null,
        targetHandAngle: 0,
        targetHourAngle: 0,
        gearBoost: 1,
        lastRoundKey: '',
        t: 0,
        textures: {},
        texturesLoaded: false,

        // ---------- 鐘面視角自由拖拉平移 (Pan / Drag) ----------
        pan: {
            x: 0,
            y: 0,
            targetX: 0,
            targetY: 0,
            isDragging: false,
            startX: 0,
            startY: 0,
            startPanX: 0,
            startPanY: 0,
            hasMoved: false,
            movedCooldown: 0
        },

        recenter() {
            this.pan.targetX = 0;
            this.pan.targetY = 0;
            this.updateRecenterBtn();
        },

        updateRecenterBtn() {
            const btn = document.getElementById('clock-recenter-btn');
            if (!btn) return;
            const isOffset = Math.hypot(this.pan.targetX, this.pan.targetY) > 18;
            btn.classList.toggle('hidden', !isOffset);
        },

        isPanActive() {
            return this.pan.isDragging || (this.pan.hasMoved && Date.now() < this.pan.movedCooldown);
        },

        getClockCenter() {
            if (!this.app || !this.app.view) {
                return { x: window.innerWidth / 2, y: window.innerHeight / 2, radius: 360 };
            }
            const rect = this.app.view.getBoundingClientRect();
            const baseDiameter = Math.min(920, this.app.screen.height * 0.94, this.app.screen.width * 0.92);
            const targetDiameter = baseDiameter * 1.2;
            const s = targetDiameter / D;
            const cx = rect.left + (this.app.screen.width) / 2 + this.pan.x;
            const cy = rect.top + (this.app.screen.height) / 2 + this.pan.y;
            return { x: cx, y: cy, radius: (D * s) / 2 };
        },

        isInsideClock(clientX, clientY) {
            const c = this.getClockCenter();
            return Math.hypot(clientX - c.x, clientY - c.y) <= c.radius;
        },

        bindPanEvents(host) {
            host.addEventListener('pointerdown', (e) => {
                // 僅接受主要點擊（滑鼠左鍵或觸控單指）
                if (e.button !== 0 && e.pointerType === 'mouse') return;
                // 若正在拖出手牌（避免衝突），不平移鐘面
                if (window.isDraggingCard) return;

                this.pan.isPotentialPan = true;
                this.pan.isDragging = false;
                this.pan.startX = e.clientX;
                this.pan.startY = e.clientY;
                this.pan.startPanX = this.pan.targetX;
                this.pan.startPanY = this.pan.targetY;
                this.pan.hasMoved = false;
                // 注意：絕不能在 pointerdown 強行 capture，否則會吞掉 PixiJS 畫布內部的點擊事件！
            });

            host.addEventListener('pointermove', (e) => {
                if (!this.pan.isPotentialPan) return;
                const dx = e.clientX - this.pan.startX;
                const dy = e.clientY - this.pan.startY;
                const dist = Math.hypot(dx, dy);

                // 位移超過 8px 才認定為拖曳鐘面
                if (dist > 8) {
                    if (!this.pan.isDragging) {
                        this.pan.isDragging = true;
                        this.pan.hasMoved = true;
                        host.classList.add('is-panning');
                        try { host.setPointerCapture(e.pointerId); } catch (_) {}
                    }

                    // 平移邊界限制：允許鐘面最多移動至視野 85%
                    const maxPanX = Math.max(300, (this.app?.screen?.width || 800) * 0.85);
                    const maxPanY = Math.max(300, (this.app?.screen?.height || 800) * 0.85);

                    this.pan.targetX = Math.max(-maxPanX, Math.min(maxPanX, this.pan.startPanX + dx));
                    this.pan.targetY = Math.max(-maxPanY, Math.min(maxPanY, this.pan.startPanY + dy));
                }
            });

            const onPanEnd = (e) => {
                if (this.pan.isDragging) {
                    this.pan.isDragging = false;
                    host.classList.remove('is-panning');
                    try { host.releasePointerCapture(e.pointerId); } catch (_) {}
                    this.pan.movedCooldown = Date.now() + 80;
                    this.updateRecenterBtn();
                }
                this.pan.isPotentialPan = false;
                setTimeout(() => {
                    this.pan.hasMoved = false;
                }, 50);
            };

            host.addEventListener('pointerup', onPanEnd);
            host.addEventListener('pointercancel', onPanEnd);

            // 雙擊空白處平滑置中鐘面
            host.addEventListener('dblclick', (e) => {
                e.preventDefault();
                this.recenter();
            });
        },

        // ---------- 載入各角色靈魂圖案貼圖 ----------
        async loadTextures() {
            const map = {
                // NPC 角色靈魂圖案
                'demon': 'assets/soul_demon.png',
                'sin': 'assets/soul_sin.png',
                'scz': 'assets/soul_scz.png',
                'hour': 'assets/soul_hour.png',
                'min': 'assets/soul_min.png',
                'sec': 'assets/soul_sec.png',
                // 玩家專屬靈魂圖案
                'p_demon': 'assets/player/p_soul_demon.png',
                'p_sin': 'assets/player/P_soul_sin.png',
                'p_scz': 'assets/player/p_soul_scz.png',
                'p_hour': 'assets/player/p_soul_hour.png',
                'p_min': 'assets/player/p_soul_min.png',
                'p_sec': 'assets/player/p_soul_sec.png'
            };

            const base64Map = window.ROLE_SOUL_BASE64 || {};

            const entries = Object.entries(map);

            // 零延遲三重保證：優先使用內嵌 Base64 DataURI 直接同步建立 Texture，徹底免除本機跨域或延遲問題
            await Promise.all(entries.map(([k, path]) => {
                return new Promise(resolve => {
                    const src = base64Map[k] || path;
                    if (window.PIXI && PIXI.Texture && typeof PIXI.Texture.from === 'function') {
                        try {
                            const tex = PIXI.Texture.from(src);
                            if (tex) {
                                this.textures[k] = tex;
                                resolve();
                                return;
                            }
                        } catch (_) {}
                    }
                    if (typeof Image !== 'undefined') {
                        const img = new Image();
                        img.crossOrigin = 'anonymous';
                        img.onload = () => {
                            try {
                                if (window.PIXI && PIXI.Texture && typeof PIXI.Texture.from === 'function') {
                                    this.textures[k] = PIXI.Texture.from(img);
                                }
                            } catch (_) {}
                            resolve();
                        };
                        img.onerror = async () => {
                            if (window.PIXI && PIXI.Assets && typeof PIXI.Assets.load === 'function') {
                                try {
                                    this.textures[k] = await PIXI.Assets.load(path);
                                } catch (_) {}
                            }
                            resolve();
                        };
                        img.src = src;
                    } else {
                        resolve();
                    }
                });
            }));

            this.texturesLoaded = true;
            // 貼圖就緒後強制重新建立所有棋子精靈節點，無縫替換為角色圖形
            if (window.globalGameState) {
                const humanId = (window.getEffectiveHumanPlayerId && window.getEffectiveHumanPlayerId()) || 'SM_1';
                this.syncTokens(window.globalGameState, humanId, true);
            }
        },

        // ---------- 初始化 ----------
        init(host) {
            if (this.app || !window.PIXI) return;
            this.app = new PIXI.Application({
                resizeTo: host,
                backgroundAlpha: 0,
                antialias: true,
                resolution: Math.min(window.devicePixelRatio || 1, 2),
                autoDensity: true
            });
            host.appendChild(this.app.view);

            this.stage = new PIXI.Container();
            this.app.stage.addChild(this.stage);

            // 分層架構：背景柔光 -> 星塵 -> 咬合齒輪群 -> 背景鐘擺 -> 星芒鐘面與指針 -> 牽引線 -> 12時辰格 -> 中央核心 -> 玩家棋子
            ['bg', 'dust', 'gears', 'pendulum', 'rings', 'hands', 'lines', 'spots', 'center', 'tokens'].forEach(k => {
                this.L[k] = new PIXI.Container();
                this.stage.addChild(this.L[k]);
            });
            this.L.tokens.sortableChildren = true;

            this.lineG = new PIXI.Graphics();
            this.L.lines.addChild(this.lineG);

            this.loadTextures();
            this.buildAmbientAndDust();
            this.buildClockworkGears();
            this.buildBackgroundPendulum();
            this.buildAstralClockRings();
            this.buildClockHands();

            // 鐘面自由拖拉平移視角綁定
            this.bindPanEvents(host);

            const recenterBtn = document.getElementById('clock-recenter-btn');
            if (recenterBtn && !recenterBtn._bound) {
                recenterBtn._bound = true;
                recenterBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    this.recenter();
                });
            }

            this.app.ticker.add(dt => this.onTick(dt));
        },

        // ---------- 1. 背景微光與微塵（與純黑網頁背景無縫融合） ----------
        buildAmbientAndDust() {
            const g = new PIXI.Graphics();
            for (let i = 8; i >= 1; i--) {
                const rad = i * 28;
                g.beginFill(PAL.gold, 0.0035 * (9 - i)).drawCircle(CX, CY, rad * 0.7).endFill();
            }
            this.L.bg.addChild(g);

            this.dusts = [];
            for (let i = 0; i < 28; i++) {
                const p = new PIXI.Graphics();
                const col = i % 3 === 0 ? PAL.gold : PAL.glow;
                p.beginFill(col, 0.3 + Math.random() * 0.4).drawCircle(0, 0, 1 + Math.random() * 1.6).endFill();
                const angle = Math.random() * Math.PI * 2;
                const dist = 50 + Math.random() * 250;
                p.position.set(CX + Math.cos(angle) * dist, CY + Math.sin(angle) * dist);
                this.L.dust.addChild(p);
                this.dusts.push({
                    node: p,
                    angle,
                    dist,
                    speed: (0.0015 + Math.random() * 0.0025) * (i % 2 === 0 ? 1 : -1),
                    phase: Math.random() * Math.PI * 2
                });
            }
        },

        // ---------- 2. 階段三同款：精密咬合機械齒輪群（直接就緒並動態運轉） ----------
        drawGearGraphic(g, outerR, teeth, innerR, spokes, color, fillAlpha = 0.1) {
            const rootR = outerR - Math.max(4.5, outerR * 0.1);
            const step = (Math.PI * 2) / teeth;

            g.lineStyle(1.5, color, 0.65);
            g.beginFill(PAL.darkHub, fillAlpha + 0.45);
            for (let i = 0; i < teeth; i++) {
                const a0 = i * step;
                const a1 = a0 + step * 0.18;
                const a2 = a0 + step * 0.32;
                const a3 = a0 + step * 0.68;
                const a4 = a0 + step * 0.82;

                const x0 = Math.cos(a0) * rootR, y0 = Math.sin(a0) * rootR;
                const x1 = Math.cos(a1) * rootR, y1 = Math.sin(a1) * rootR;
                const x2 = Math.cos(a2) * outerR, y2 = Math.sin(a2) * outerR;
                const x3 = Math.cos(a3) * outerR, y3 = Math.sin(a3) * outerR;
                const x4 = Math.cos(a4) * rootR, y4 = Math.sin(a4) * rootR;

                if (i === 0) g.moveTo(x0, y0);
                else g.lineTo(x0, y0);
                g.lineTo(x1, y1);
                g.lineTo(x2, y2);
                g.lineTo(x3, y3);
                g.lineTo(x4, y4);
            }
            g.closePath();
            g.endFill();

            // 內環與輪輻
            g.lineStyle(1.2, color, 0.45).drawCircle(0, 0, rootR * 0.84);
            g.lineStyle(1, color, 0.35).beginFill(PAL.darkHub, 0.5).drawCircle(0, 0, innerR).endFill();

            if (spokes > 0) {
                g.lineStyle(1.8, color, 0.4);
                for (let s = 0; s < spokes; s++) {
                    const sa = (s * Math.PI * 2) / spokes;
                    g.moveTo(Math.cos(sa) * (innerR * 0.32), Math.sin(sa) * (innerR * 0.32));
                    g.lineTo(Math.cos(sa) * (rootR * 0.84), Math.sin(sa) * (rootR * 0.84));
                }
            }

            // 軸心
            g.lineStyle(1.5, color, 0.7).beginFill(PAL.darkHub, 0.9).drawCircle(0, 0, Math.max(7, innerR * 0.32)).endFill();
            g.lineStyle(0).beginFill(color, 0.6).drawCircle(0, 0, 3).endFill();
        },

        buildClockworkGears() {
            this.gears = [];
            const specs = [
                { x: 0,    y: 0,    r: 168, teeth: 36, inner: 114, spokes: 6, col: PAL.glow, speed: 0.14, dir: 1,  alpha: 0.28 },
                { x: 0,    y: 0,    r: 110, teeth: 24, inner: 70,  spokes: 4, col: PAL.gold, speed: 0.22, dir: -1, alpha: 0.26 },
                { x: -116, y: -82,  r: 72,  teeth: 18, inner: 42,  spokes: 5, col: PAL.gold, speed: 0.30, dir: 1,  alpha: 0.24 },
                { x: 122,  y: -74,  r: 64,  teeth: 16, inner: 36,  spokes: 4, col: PAL.glow, speed: 0.34, dir: -1, alpha: 0.24 },
                { x: 110,  y: 96,   r: 76,  teeth: 20, inner: 46,  spokes: 6, col: PAL.gold, speed: 0.27, dir: 1,  alpha: 0.24 },
                { x: -114, y: 92,   r: 60,  teeth: 15, inner: 34,  spokes: 3, col: PAL.glow, speed: 0.36, dir: -1, alpha: 0.24 },
                { x: 0,    y: -148, r: 48,  teeth: 12, inner: 26,  spokes: 4, col: PAL.gold, speed: 0.45, dir: 1,  alpha: 0.22 },
                { x: 0,    y: 146,  r: 52,  teeth: 14, inner: 28,  spokes: 4, col: PAL.glow, speed: 0.38, dir: -1, alpha: 0.22 }
            ];

            specs.forEach(sp => {
                const g = new PIXI.Graphics();
                this.drawGearGraphic(g, sp.r, sp.teeth, sp.inner, sp.spokes, sp.col);
                g.position.set(CX + sp.x, CY + sp.y);
                g.alpha = sp.alpha;
                this.L.gears.addChild(g);
                this.gears.push({ node: g, speed: sp.speed, dir: sp.dir });
            });
        },

        // ---------- 3. 背景微擺暗金鐘擺 ----------
        buildBackgroundPendulum() {
            const pivotY = CY - 210;
            const rodLen = 355;

            const arm = new PIXI.Container();
            arm.position.set(CX, pivotY);
            arm.alpha = 0.26;

            const rod = new PIXI.Graphics();
            rod.lineStyle(1.4, PAL.gold, 0.65);
            rod.moveTo(-3, 8).lineTo(-3, rodLen - 34);
            rod.moveTo(3, 8).lineTo(3, rodLen - 34);
            rod.lineStyle(2, PAL.goldBright, 0.85);
            rod.moveTo(0, 6).lineTo(0, rodLen - 30);
            arm.addChild(rod);

            const bob = new PIXI.Graphics();
            bob.position.set(0, rodLen);
            bob.lineStyle(1.8, PAL.gold, 0.85).beginFill(PAL.darkHub, 0.9);
            bob.drawPolygon([-7, 30, 0, 54, 7, 30]);
            bob.endFill();
            bob.lineStyle(2, PAL.gold, 0.9).beginFill(PAL.darkHub, 0.9).drawCircle(0, 0, 32).endFill();
            bob.lineStyle(1, PAL.glow, 0.6).drawCircle(0, 0, 25);

            for (let i = 0; i < 8; i++) {
                const a = (i * 45) * Math.PI / 180;
                const rOut = i % 2 === 0 ? 30 : 21;
                bob.beginFill(i % 2 === 0 ? PAL.gold : PAL.glow, 0.25);
                bob.drawPolygon([
                    Math.cos(a - 0.2) * 10, Math.sin(a - 0.2) * 10,
                    Math.cos(a) * rOut, Math.sin(a) * rOut,
                    Math.cos(a + 0.2) * 10, Math.sin(a + 0.2) * 10
                ]);
                bob.endFill();
            }
            bob.lineStyle(1.5, PAL.goldBright, 0.9).beginFill(PAL.gold, 0.85).drawCircle(0, 0, 7).endFill();
            arm.addChild(bob);

            this.L.pendulum.addChild(arm);
            this.pendulumArm = arm;
        },

        // ---------- 4. 雙層星軌環、60 格刻度、十二星芒陣與羅馬時辰外環 ----------
        buildAstralClockRings() {
            const g = new PIXI.Graphics();

            // 外圍雙星軌環
            g.lineStyle(2, PAL.gold, 0.42).drawCircle(CX, CY, R + 34);
            g.lineStyle(1, PAL.glow, 0.28).drawCircle(CX, CY, R + 44);
            // 棋子軌道內環
            g.lineStyle(1.5, PAL.glow, 0.32).drawCircle(CX, CY, TOKEN_R);
            g.lineStyle(1, PAL.gold, 0.2).drawCircle(CX, CY, TOKEN_R - 22);

            // 60 格精密刻度
            for (let i = 0; i < 60; i++) {
                const major = i % 5 === 0;
                const a = (i * 6 - 90) * Math.PI / 180;
                const r1 = R + 34, r2 = r1 - (major ? 12 : 5);
                g.lineStyle(major ? 2 : 1, major ? PAL.gold : 0xffffff, major ? 0.65 : 0.18);
                g.moveTo(CX + r1 * Math.cos(a), CY + r1 * Math.sin(a));
                g.lineTo(CX + r2 * Math.cos(a), CY + r2 * Math.sin(a));
            }

            // 內層十二星芒幾何連線
            g.lineStyle(1, PAL.gold, 0.16);
            for (let k = 0; k < 12; k++) {
                const a1 = (k * 30 - 90) * Math.PI / 180;
                const a2 = ((k + 5) * 30 - 90) * Math.PI / 180;
                const sr = R - 32;
                g.moveTo(CX + Math.cos(a1) * sr, CY + Math.sin(a1) * sr);
                g.lineTo(CX + Math.cos(a2) * sr, CY + Math.sin(a2) * sr);
            }

            this.L.rings.addChild(g);

            // 外圍 12 羅馬數字銘文
            for (let i = 0; i < 12; i++) {
                const pos = i === 0 ? 12 : i;
                const p = this.polar(pos, R + 56);
                const rt = new PIXI.Text(ROMAN[i], {
                    fontFamily: FONT_ROMAN,
                    fontSize: 11,
                    fill: PAL.gold,
                    fontWeight: '700'
                });
                rt.alpha = 0.55;
                rt.anchor.set(0.5);
                rt.position.set(p.x, p.y);
                this.L.rings.addChild(rt);
            }
        },

        // ---------- 5. 中央動態時鐘指針（顯示實際時間：時針、分針與秒針） ----------
        buildClockHands() {
            const container = new PIXI.Container();
            container.position.set(CX, CY);

            // 時針（顯示實際小時與分鐘平滑過渡）
            const hourHand = new PIXI.Graphics();
            hourHand.lineStyle(2.5, PAL.gold, 0.85).beginFill(PAL.gold, 0.28);
            hourHand.moveTo(0, 16).lineTo(-5, -26).lineTo(0, -118).lineTo(5, -26).closePath().endFill();

            // 分針（顯示實際分鐘與秒鐘平滑過渡）
            const minHand = new PIXI.Graphics();
            minHand.lineStyle(2, PAL.glow, 0.9).beginFill(PAL.glow, 0.32);
            minHand.moveTo(0, 20).lineTo(-3.5, -34).lineTo(0, -165).lineTo(3.5, -34).closePath().endFill();

            // 秒針（細長暗金色動態秒針，精準指向真實秒數）
            const secHand = new PIXI.Graphics();
            secHand.lineStyle(1.2, PAL.goldBright, 0.92);
            secHand.moveTo(0, 28).lineTo(0, -195);
            secHand.lineStyle(0).beginFill(PAL.goldBright, 0.95).drawCircle(0, 0, 3.5).endFill();

            container.addChild(hourHand, minHand, secHand);
            this.L.hands.addChild(container);
            this.hands = { hour: hourHand, min: minHand, sec: secHand };
        },

        // ---------- 工具函式 ----------
        polar(pos, r = R) {
            const a = (pos * 30 - 90) * Math.PI / 180;
            return { x: CX + r * Math.cos(a), y: CY + r * Math.sin(a) };
        },
        text(str, size, fill, weight = '600', family = FONT_UI) {
            const t = new PIXI.Text(String(str), { fontFamily: family, fontSize: size, fill, fontWeight: weight });
            t.anchor.set(0.5);
            return t;
        },
        glowCircle(g, x, y, r, color, alpha, layers = 4) {
            g.lineStyle(0);
            for (let i = layers; i >= 1; i--) {
                g.beginFill(color, alpha * (1 - i / (layers + 1))).drawCircle(x, y, r + i * 4).endFill();
            }
        },
        glowRect(g, w, h, color, alpha) {
            g.lineStyle(0);
            for (let i = 4; i >= 1; i--) {
                g.beginFill(color, alpha * (1 - i / 5))
                 .drawRoundedRect(-w / 2 - i * 3, -h / 2 - i * 3, w + i * 6, h + i * 6, 12 + i * 3)
                 .endFill();
            }
        },
        clear(layer) {
            layer.children.slice().forEach(c => c.destroy({ children: true }));
        },

        // ---------- 主渲染入口（每次 updateUI 調用） ----------
        render(gs) {
            if (!this.app || !gs) return;
            this.gs = gs;
            window.globalGameState = gs;
            const humanId = (window.getEffectiveHumanPlayerId && window.getEffectiveHumanPlayerId()) || 'SM_1';
            const drawn = gs.currentDrawnHourCards || [];
            const waitingHour = !!gs.waitingHourChoice && gs.waitingHourChoicePlayerId === humanId;

            // 回合或局數推進時觸發齒輪短暫加速運轉
            const roundKey = `${gs.gameRound}-${gs.roundMarker}-${drawn.length}`;
            if (roundKey !== this.lastRoundKey) {
                this.lastRoundKey = roundKey;
                this.gearBoost = 4.2;
            }

            this.drawSpots(gs, waitingHour ? drawn : []);
            this.drawCenter(gs, drawn, waitingHour);
            this.updatePenaltyBadge(gs);
            this.syncTokens(gs, humanId);
            this.computeSinPairs(gs);
        },

        // ---------- 頂部狀態膠囊內的受罰規則標示 ----------
        updatePenaltyBadge(gs) {
            const el = document.getElementById('round-penalty-display');
            if (!el || !gs) return;
            el.classList.remove('hidden');
            const is3P = gs.gameMode === '3P';
            const sinMode = gs.sinTargetingMode === 'sin' && !is3P;
            if (is3P) {
                el.dataset.penaltyMode = 'none';
                el.innerHTML = `<span class="hud-penalty-icon">🛡️</span><span class="hud-penalty-text">3P 模式：無受罰</span>`;
            } else if (sinMode) {
                el.dataset.penaltyMode = 'sin';
                el.innerHTML = `<span class="hud-penalty-icon">🔥</span><span class="hud-penalty-text">受罰：距離時之惡最近</span>`;
            } else {
                el.dataset.penaltyMode = 'time';
                el.innerHTML = `<span class="hud-penalty-icon">⚠️</span><span class="hud-penalty-text">受罰：最高小時值</span>`;
            }
        },

        // ---------- 12 個時辰格位 ----------
        drawSpots(gs, targets) {
            this.clear(this.L.spots);
            this.pulses = [];
            const roundMarker = gs.roundMarker || 12;

            (gs.clockFace || []).forEach(spot => {
                const isTarget = targets.some(c => c.number === spot.position);
                const isCurrentRoundSpot = spot.position === roundMarker;
                const p = this.polar(spot.position);
                const node = new PIXI.Container();
                node.position.set(p.x, p.y);

                const g = new PIXI.Graphics();
                const accent = isTarget ? PAL.gold : (isCurrentRoundSpot ? PAL.glow : PAL.gold);
                this.glowCircle(g, 0, 0, 27, accent, isTarget ? 0.42 : (isCurrentRoundSpot ? 0.2 : 0.08));

                // 雙環星芒格位框
                g.lineStyle(isTarget ? 2.4 : 1.6, isTarget ? PAL.gold : PAL.gold, isTarget ? 1.0 : 0.42)
                 .beginFill(PAL.shell, 0.9)
                 .drawCircle(0, 0, 27)
                 .endFill();
                g.lineStyle(1, isTarget ? PAL.goldBright : PAL.glow, isTarget ? 0.8 : 0.3)
                 .drawCircle(0, 0, 22);
                node.addChild(g);

                const top = spot.cards[spot.cards.length - 1];
                const num = this.text(spot.position, 19, isTarget ? PAL.gold : PAL.text, '800');
                num.y = top ? -5 : 0;
                node.addChild(num);

                if (top) {
                    const tag = this.text(top.isPrecious ? '★' : (top.ageGroup || ''), 10,
                        top.isPrecious ? PAL.gold : PAL.dim, '600');
                    tag.y = 13;
                    node.addChild(tag);
                    if (top.isLocked) {
                        const lock = this.text('🔒', 9, 0xffffff, '400');
                        lock.position.set(-18, -16);
                        node.addChild(lock);
                    }
                    if (spot.cards.length > 1) {
                        const badge = this.text(`×${spot.cards.length}`, 10, PAL.gold, '700');
                        badge.position.set(18, -18);
                        node.addChild(badge);
                    }
                }

                if (isTarget) {
                    node.eventMode = 'static';
                    node.cursor = 'pointer';
                    let downX = 0, downY = 0;
                    node.on('pointerdown', (e) => {
                        downX = e.global.x;
                        downY = e.global.y;
                    });
                    const triggerSpotChoice = () => {
                        if (this.isPanActive()) return;
                        const gsNow = this.gs || window.globalGameState || (typeof gameState !== 'undefined' ? gameState : null);
                        const cards = (gsNow && gsNow.currentDrawnHourCards) || [];
                        const idx = cards.findIndex(c => c.number === spot.position);
                        if (idx >= 0) {
                            const fn = (typeof window.handleHumanHourCardChoice === 'function')
                                ? window.handleHumanHourCardChoice
                                : (typeof handleHumanHourCardChoice === 'function' ? handleHumanHourCardChoice : null);
                            if (fn && gsNow) fn(gsNow, idx);
                        }
                    };
                    node.on('pointertap', triggerSpotChoice);
                    node.on('click', triggerSpotChoice);
                    node.on('pointerup', (e) => {
                        const dist = Math.hypot(e.global.x - downX, e.global.y - downY);
                        if (dist < 10) triggerSpotChoice();
                    });
                    node.on('pointerover', () => { if (!this.pan.isDragging) node.scale.set(1.1); });
                    node.on('pointerout', () => node.scale.set(1));
                    this.pulses.push(g);
                }
                this.L.spots.addChild(node);
            });
        },

        // ---------- 中央軸心：當前翻開的小時卡（局次與受罰標示已移至頂部膠囊） ----------
        drawCenter(gs, drawn, waitingHour) {
            this.clear(this.L.center);
            const L = this.L.center;

            const hub = new PIXI.Graphics();
            const isDropActive = !!this.dropHighlightActive;
            if (isDropActive) {
                this.glowCircle(hub, CX, CY, 88, PAL.gold, 0.42, 5);
            }
            hub.lineStyle(isDropActive ? 3 : 2, isDropActive ? PAL.goldBright : PAL.gold, isDropActive ? 0.92 : 0.38)
               .beginFill(0x050916, isDropActive ? 0.88 : 0.78)
               .drawCircle(CX, CY, 84)
               .endFill();
            hub.lineStyle(1.2, isDropActive ? PAL.gold : PAL.glow, isDropActive ? 0.65 : 0.25).drawCircle(CX, CY, 76);
            L.addChild(hub);

            const W = 48, H = 68, GAP = 10, n = drawn.length;
            drawn.forEach((card, i) => {
                const c = new PIXI.Container();
                c.position.set(CX + (i - (n - 1) / 2) * (W + GAP), CY);

                const g = new PIXI.Graphics();
                if (waitingHour) this.glowRect(g, W, H, PAL.gold, 0.38);
                g.lineStyle(card.isPrecious ? 2 : 1.2, card.isPrecious ? PAL.gold : 0xffffff,
                        card.isPrecious ? 0.95 : 0.3)
                 .beginFill(card.isPrecious ? PAL.cardGold : PAL.cardLight)
                 .drawRoundedRect(-W / 2, -H / 2, W, H, 9).endFill();
                c.addChild(g);

                const num = this.text(card.number, 21, 0x1a1f36, '800'); num.y = -9; c.addChild(num);
                const age = this.text(card.ageGroup || '', 9.5, 0x4a5170, '600'); age.y = 15; c.addChild(age);
                if (card.isPrecious) { const st = this.text('★', 11, 0x7a5a00, '700'); st.y = 28; c.addChild(st); }

                if (waitingHour) {
                    c.eventMode = 'static';
                    c.cursor = 'pointer';
                    let downX = 0, downY = 0;
                    c.on('pointerdown', (e) => {
                        downX = e.global.x;
                        downY = e.global.y;
                    });
                    const triggerCardChoice = () => {
                        if (this.isPanActive()) return;
                        const gsNow = this.gs || window.globalGameState || (typeof gameState !== 'undefined' ? gameState : null);
                        const fn = (typeof window.handleHumanHourCardChoice === 'function')
                            ? window.handleHumanHourCardChoice
                            : (typeof handleHumanHourCardChoice === 'function' ? handleHumanHourCardChoice : null);
                        if (fn && gsNow) fn(gsNow, i);
                    };
                    c.on('pointertap', triggerCardChoice);
                    c.on('click', triggerCardChoice);
                    c.on('pointerup', (e) => {
                        const dist = Math.hypot(e.global.x - downX, e.global.y - downY);
                        if (dist < 10) triggerCardChoice();
                    });
                    c.on('pointerover', () => { if (!this.pan.isDragging) c.scale.set(1.07); });
                    c.on('pointerout', () => c.scale.set(1));
                }
                L.addChild(c);
            });

            if (waitingHour) {
                const hint = this.text('請點選小時卡', 11.5, PAL.gold, '700');
                hint.position.set(CX, CY + 54);
                L.addChild(hint);
            } else if (this.dropHighlightActive) {
                const dropHint = this.text('⚡ 放開以出牌', 12, PAL.goldBright, '800');
                dropHint.position.set(CX, CY + 54);
                L.addChild(dropHint);
            }
        },

        // ---------- 拖曳分鐘卡靠近鐘面時的接收高亮回饋 ----------
        setDropHighlight(active) {
            const next = !!active;
            if (this.dropHighlightActive === next) return;
            this.dropHighlightActive = next;
            if (window.globalGameState) {
                const humanId = (window.getEffectiveHumanPlayerId && window.getEffectiveHumanPlayerId()) || 'SM_1';
                const drawn = window.globalGameState.currentDrawnHourCards || [];
                const waitingHour = !!window.globalGameState.waitingHourChoice && window.globalGameState.waitingHourChoicePlayerId === humanId;
                this.drawCenter(window.globalGameState, drawn, waitingHour);
            }
        },

        // ---------- 棋子（同格錯開排列，專屬角色靈魂圖案與星芒光環特效） ----------
        makeToken(p, isHuman, key) {
            const col = hexOf(tokenKey(p), 0xffffff);
            const c = new PIXI.Container();

            // 外層微光光環（包含柔和擴散層）
            const auraG = new PIXI.Graphics();
            this.glowCircle(auraG, 0, 0, 18, col, isHuman ? 0.55 : 0.38, 4);
            auraG.lineStyle(isHuman ? 2.6 : 1.6, isHuman ? 0xffffff : col, isHuman ? 0.95 : 0.75)
                 .beginFill(PAL.shell, 0.92)
                 .drawCircle(0, 0, 16)
                 .endFill();
            // 內圈細緻金色/角色色微光環
            auraG.lineStyle(1, isHuman ? PAL.goldBright : col, isHuman ? 0.8 : 0.45)
                 .drawCircle(0, 0, 14);
            c.addChild(auraG);

            // 取得角色專屬貼圖 key
            let texKey = isHuman ? 'p_demon' : 'demon';
            if (p.type === '時之惡') texKey = isHuman ? 'p_sin' : 'sin';
            else if (p.type === '受詛者') texKey = isHuman ? 'p_scz' : 'scz';
            else if (p.roleCard === '時針') texKey = isHuman ? 'p_hour' : 'hour';
            else if (p.roleCard === '分針') texKey = isHuman ? 'p_min' : 'min';
            else if (p.roleCard === '秒針') texKey = isHuman ? 'p_sec' : 'sec';

            const tex = this.textures[texKey];
            let sprite = null;
            let baseScale = 1;
            if (tex) {
                sprite = new PIXI.Sprite(tex);
                sprite.anchor.set(0.5);
                // 縮小至原來的 90% (28px * 0.9 = 25.2px)
                const origW = (tex.orig && tex.orig.width) || tex.width || 90;
                baseScale = 25.2 / Math.max(1, origW);
                sprite.scale.set(baseScale);
                c.addChild(sprite);
            } else {
                // 後備方案：文字符號標記
                const fallbackTxt = this.text(labelOf(p), 12, col, '800');
                c.addChild(fallbackTxt);
            }

            // 角色身分標籤：文字統一使用金色；player 顯示「我」，其他角色顯示對應身分（時魔、時之惡、受詛者、時針、分針、秒針）
            const roleNameText = roleDisplayNameOf(p, isHuman);
            const tagColor = isHuman ? PAL.goldBright : PAL.gold;
            const youTag = this.text(isHuman ? '★我' : roleNameText, 8.5, tagColor, '800');
            youTag.y = -23;
            c.addChild(youTag);

            c.zIndex = isHuman ? 10 : 1;

            return {
                c,
                auraG,
                sprite,
                youTag,
                isHuman,
                key,
                baseScale,
                targetScale: 1,
                currentScale: 1,
                tx: 0,
                ty: 0,
                phase: Math.random() * Math.PI * 2
            };
        },

        // ---------- 同格多角色佈局與自適應縮放計算 ----------
        calculateTokenOffset(idx, n, angle) {
            // angle: (pos * 30 - 90) * PI / 180 (從圓心指向時辰格的弧度)
            const cos = Math.cos(angle);
            const sin = Math.sin(angle);
            const dirOutX = cos, dirOutY = sin;
            const dirTanX = -sin, dirTanY = cos;

            if (n <= 1) {
                return { dx: 0, dy: 0, scale: 1.0 };
            }
            if (n === 2) {
                // 2 名角色：縮小至 80%，沿切線微距對稱並排 (相距 30px)
                const off = (idx === 0 ? -1 : 1) * 15;
                return {
                    dx: dirTanX * off,
                    dy: dirTanY * off,
                    scale: 0.80
                };
            }
            if (n === 3) {
                // 3 名角色：縮小至 68%，呈等邊三角形分佈
                if (idx === 0) {
                    return {
                        dx: dirOutX * 14,
                        dy: dirOutY * 14,
                        scale: 0.68
                    };
                } else if (idx === 1) {
                    return {
                        dx: -dirOutX * 9 - dirTanX * 15,
                        dy: -dirOutY * 9 - dirTanY * 15,
                        scale: 0.68
                    };
                } else {
                    return {
                        dx: -dirOutX * 9 + dirTanX * 15,
                        dy: -dirOutY * 9 + dirTanY * 15,
                        scale: 0.68
                    };
                }
            }
            if (n === 4) {
                // 4 名角色：縮小至 58%，呈四角星/菱形陣列
                const tanSign = (idx % 2 === 0) ? -1 : 1;
                const outSign = (idx < 2) ? 1 : -1;
                return {
                    dx: dirTanX * tanSign * 15 + dirOutX * outSign * 12,
                    dy: dirTanY * tanSign * 15 + dirOutY * outSign * 12,
                    scale: 0.58
                };
            }
            // n >= 5: 縮小至 52%，均勻星環分佈
            const rot = (idx / n) * Math.PI * 2;
            const r = 18;
            return {
                dx: Math.cos(rot) * r,
                dy: Math.sin(rot) * r,
                scale: 0.52
            };
        },

        syncTokens(gs, humanId, forceRebuild = false) {
            const alive = new Set();
            const groups = {};
            (gs.players || []).forEach(p => {
                if (p.isEjected || typeof p.currentClockPosition !== 'number') return;
                (groups[p.currentClockPosition] = groups[p.currentClockPosition] || []).push(p);
            });

            Object.keys(groups).forEach(pos => {
                const list = groups[pos], n = list.length;
                list.forEach((p, idx) => {
                    alive.add(p.id);
                    const a = (Number(pos) * 30 - 90) * Math.PI / 180;
                    const base = this.polar(Number(pos), TOKEN_R);
                    const layout = this.calculateTokenOffset(idx, n, a);
                    const tx = base.x + layout.dx;
                    const ty = base.y + layout.dy;

                    const isHuman = p.id === humanId;
                    const key = `${tokenKey(p)}|${p.roleCard}|${isHuman}|${this.texturesLoaded ? 'tex' : 'notex'}`;
                    let node = this.tokens.get(p.id);
                    if (forceRebuild || !node || node.key !== key) {
                        if (node) node.c.destroy({ children: true });
                        node = this.makeToken(p, isHuman, key);
                        node.c.position.set(tx, ty);
                        node.currentScale = layout.scale;
                        node.c.scale.set(layout.scale);
                        this.L.tokens.addChild(node.c);
                        this.tokens.set(p.id, node);
                    }
                    node.tx = tx;
                    node.ty = ty;
                    node.targetScale = layout.scale;
                });
            });

            this.tokens.forEach((node, id) => {
                if (!alive.has(id)) {
                    node.c.destroy({ children: true });
                    this.tokens.delete(id);
                }
            });
        },

        // ---------- 時之惡牽引線 ----------
        computeSinPairs(gs) {
            this.sinPairs = [];
            if (gs.sinTargetingMode !== 'sin' || gs.gameMode === '3P') return;
            const sin = (gs.players || []).find(p => p.type === '時之惡' && !p.isEjected);
            if (!sin || typeof sin.currentClockPosition !== 'number') return;
            const targets = gs.players.filter(p =>
                (p.type === '時魔' || p.type === '受詛者') && !p.isEjected && typeof p.currentClockPosition === 'number');
            if (!targets.length) return;

            const dist = (a, b) => { const d = Math.abs(a - b); return Math.min(d, 12 - d); };
            const minD = Math.min(...targets.map(t => dist(t.currentClockPosition, sin.currentClockPosition)));
            const A = this.polar(sin.currentClockPosition, TOKEN_R);
            targets
                .filter(t => dist(t.currentClockPosition, sin.currentClockPosition) === minD)
                .forEach(t => this.sinPairs.push([A, this.polar(t.currentClockPosition, TOKEN_R)]));
        },

        drawSinLines() {
            const g = this.lineG;
            g.clear();
            const N = 10, off = (this.t * 0.4) % 1;
            this.sinPairs.forEach(([a, b]) => {
                g.lineStyle(2, PAL.danger, 0.5);
                g.moveTo(a.x, a.y).lineTo(b.x, b.y);
                for (let k = 0; k < N; k++) {
                    const u = ((k / N) + off) % 1;
                    g.lineStyle(0);
                    g.beginFill(PAL.danger, 0.9).drawCircle(a.x + (b.x - a.x) * u, a.y + (b.y - a.y) * u, 2.5).endFill();
                }
            });
        },

        // ---------- 每幀：自適應縮放、齒輪旋轉、鐘擺微擺、指針與棋子補間 ----------
        onTick(dt) {
            const deltaSec = dt / 60;
            this.t += deltaSec;

            // 鐘面平移平滑插值 (Lerp)
            this.pan.x += (this.pan.targetX - this.pan.x) * 0.22;
            this.pan.y += (this.pan.targetY - this.pan.y) * 0.22;
            if (Math.abs(this.pan.targetX - this.pan.x) < 0.15) this.pan.x = this.pan.targetX;
            if (Math.abs(this.pan.targetY - this.pan.y) < 0.15) this.pan.y = this.pan.targetY;

            const app = this.app;
            const baseDiameter = Math.min(920, app.screen.height * 0.94, app.screen.width * 0.92);
            const targetDiameter = baseDiameter * 1.2;
            const s = targetDiameter / D;
            this.stage.scale.set(s);
            this.stage.position.set(
                (app.screen.width - D * s) / 2 + this.pan.x,
                (app.screen.height - D * s) / 2 + this.pan.y
            );

            // 1. 齒輪動態咬合旋轉（回合推進時帶有加速脈衝）
            this.gearBoost += (1 - this.gearBoost) * 0.06;
            this.gears.forEach(gr => {
                gr.node.rotation += gr.speed * gr.dir * deltaSec * this.gearBoost;
            });

            // 2. 背景鐘擺簡諧擺動
            if (this.pendulumArm) {
                this.pendulumArm.rotation = Math.sin(this.t * 2.1) * 0.24;
            }

            // 3. 中央時鐘指針精準顯示真實世界時間（時、分、秒連續平滑轉動）
            if (this.hands) {
                const now = new Date();
                const ms = now.getMilliseconds();
                const s = now.getSeconds() + ms / 1000;
                const m = now.getMinutes() + s / 60;
                const h = (now.getHours() % 12) + m / 60;

                const targetSec = (s / 60) * Math.PI * 2;
                const targetMin = (m / 60) * Math.PI * 2;
                const targetHour = (h / 12) * Math.PI * 2;

                if (this.hands.sec) {
                    this.hands.sec.rotation = targetSec;
                }
                const diffMin = Math.atan2(Math.sin(targetMin - this.hands.min.rotation), Math.cos(targetMin - this.hands.min.rotation));
                const diffHour = Math.atan2(Math.sin(targetHour - this.hands.hour.rotation), Math.cos(targetHour - this.hands.hour.rotation));
                this.hands.min.rotation += diffMin * 0.15;
                this.hands.hour.rotation += diffHour * 0.1;
            }

            // 4. 星塵緩慢漂浮
            this.dusts.forEach(d => {
                d.angle += d.speed * dt;
                d.node.x = CX + Math.cos(d.angle) * d.dist;
                d.node.y = CY + Math.sin(d.angle) * d.dist;
                d.node.alpha = 0.2 + 0.3 * Math.sin(this.t * 2 + d.phase);
            });

            // 5. 棋子平滑移動補間、同格多角色自適應縮放與靈魂微光浮動特效
            this.tokens.forEach(n => {
                n.c.x += (n.tx - n.c.x) * 0.16;
                n.c.y += (n.ty - n.c.y) * 0.16;

                // 同格多角色自適應縮放補間
                n.currentScale = n.currentScale || 1;
                n.currentScale += ((n.targetScale || 1) - n.currentScale) * 0.18;
                n.c.scale.set(n.currentScale);

                // 靈魂微浮動與呼吸脈動特效（乘以 baseScale，鎖定標準 25.2px 基準尺寸）
                if (n.sprite) {
                    const breath = 1 + 0.045 * Math.sin(this.t * 2.8 + n.phase);
                    n.sprite.scale.set((n.baseScale || 1) * breath);
                    // 微幅上下浮動 1.2px
                    n.sprite.y = Math.sin(this.t * 2.2 + n.phase) * 1.2;
                }
                if (n.auraG) {
                    // 光環微透光度呼吸 (0.85 ~ 1.0)
                    n.auraG.alpha = 0.88 + 0.12 * Math.sin(this.t * 3.2 + n.phase);
                }
                if (n.youTag) {
                    // 棋子標籤隨呼吸輕微上下浮動
                    n.youTag.y = -23 + Math.sin(this.t * 3.5 + n.phase) * 0.8;
                }
            });

            // 6. 可選時辰格脈動與時之惡牽引線
            const pulse = 0.75 + 0.25 * Math.sin(this.t * 4);
            this.pulses.forEach(g => { g.alpha = pulse; });

            this.drawSinLines();
        }
    };

    window.ModernBoard = Board;

    // 包裝 updateUI：原有邏輯照常執行，最後再由 Pixi 重繪
    function hookUpdateUI() {
        if (typeof window.updateUI === 'function' && !window.updateUI._hookedByModern) {
            const prevUpdateUI = window.updateUI;
            const wrappedUpdateUI = function (gs) {
                if (gs && gs.waitingMinuteHandChoice) {
                    const evoDetails = document.getElementById('evo-panel-details');
                    if (evoDetails && !evoDetails.open) evoDetails.open = true;
                }
                if (typeof prevUpdateUI === 'function') prevUpdateUI(gs);
                Board.render(gs);
            };
            wrappedUpdateUI._hookedByModern = true;
            window.updateUI = wrappedUpdateUI;
            try { updateUI = wrappedUpdateUI; } catch (_) {}
        }
    }

    // 左側懸浮抽屜手風琴互斥：僅在使用者點擊某個抽屜標題即將展開時，才收合其他抽屜（不使用非同步 toggle 事件以免誤關）
    function initLeftDrawerAccordion() {
        const leftDrawers = Array.from(document.querySelectorAll('.hud-drawer-left > details.hud-drawer'));
        if (!leftDrawers.length) return;
        leftDrawers.forEach(drawer => {
            if (drawer._accordionBound) return;
            drawer._accordionBound = true;
            const summary = drawer.querySelector(':scope > summary');
            if (!summary) return;
            summary.addEventListener('click', () => {
                // 點擊前若為收合狀態，代表即將展開 -> 預先收合左側其他已展開的抽屜
                if (!drawer.open) {
                    leftDrawers.forEach(other => {
                        if (other !== drawer && other.open) other.open = false;
                    });
                }
            });
        });
    }

    document.addEventListener('DOMContentLoaded', () => {
        const host = document.getElementById('modern-board');
        if (!host) return;
        Board.init(host);
        hookUpdateUI();
        initLeftDrawerAccordion();

        if (window.globalGameState) {
            Board.render(window.globalGameState);
        }
    });

    window.Board = Board;
    hookUpdateUI();
})();
