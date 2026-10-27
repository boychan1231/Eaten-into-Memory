// modern_intro.js
// 現代版開場動畫與整合式初始選單（PixiJS v7）
// 流程：純黑背景 + 靜止鐘擺 -> 點擊鐘擺 -> 鐘擺擺動 -> 齒輪浮現組成鐘面 -> 遊戲標題與初始選單登場
(function () {
    const PAL = {
        bg: 0x000000,
        gold: 0xffd27f,
        goldBright: 0xffeaa7,
        goldDim: 0x9c7c38,
        indigo: 0x7c8cff,
        indigoDeep: 0x3b4890,
        purple: 0xb06bff,
        white: 0xf5f7ff,
        darkHub: 0x040508
    };

    const ROMAN = ['XII', 'I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI'];
    const FONT_TITLE = '"Cinzel", Inter, "Noto Sans TC", serif';
    const FONT_UI = 'Inter, "Noto Sans TC", "Microsoft JhengHei", sans-serif';

    const easeOutCubic = x => 1 - Math.pow(1 - Math.max(0, Math.min(1, x)), 3);
    const easeInOutCubic = x => {
        const t = Math.max(0, Math.min(1, x));
        return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
    };
    const easeOutBack = x => {
        const t = Math.max(0, Math.min(1, x));
        const c1 = 1.70158, c3 = c1 + 1;
        return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
    };

    const Intro = {
        app: null,
        overlayEl: null,
        promptEl: null,
        uiEl: null,
        skipBtn: null,

        // 狀態機: 'IDLE' -> 'SWINGING' -> 'ASSEMBLING' -> 'MENU' -> 'ENTERING' -> 'DONE'
        state: 'IDLE',
        stateTime: 0,
        totalTime: 0,
        swingPhase: 0,
        swingAmp: 0.042,
        isHoveringBob: false,
        lastSinSign: 0,

        // Pixi 容器與物件
        scene: null,
        clockStage: null,
        bgGlowG: null,
        dustLayer: null,
        gearLayer: null,
        clockFaceLayer: null,
        pendulumLayer: null,
        fxLayer: null,

        pendulumPivot: null,
        pendulumArm: null,
        pendulumBob: null,
        bobCoreGlow: null,

        gears: [],
        clockSpots: [],
        clockRingsG: null,
        clockHands: null,
        dusts: [],
        ripples: [],
        trailParticles: [],

        // 選單狀態
        selectedMode: '5P',
        selectedRole5P: 'SM_1',
        selectedRole3P: '時針',

        init() {
            this.overlayEl = document.getElementById('modern-intro-overlay');
            const host = document.getElementById('intro-canvas-host');
            this.uiEl = document.getElementById('intro-ui-container');
            this.skipBtn = document.getElementById('intro-skip-btn');

            if (!this.overlayEl || !host || !window.PIXI) return;

            this.app = new PIXI.Application({
                resizeTo: host,
                backgroundColor: PAL.bg,
                backgroundAlpha: 1,
                antialias: true,
                resolution: Math.min(window.devicePixelRatio || 1, 2),
                autoDensity: true
            });
            host.appendChild(this.app.view);

            this.scene = new PIXI.Container();
            this.app.stage.addChild(this.scene);

            // 背景柔光與星塵
            this.bgGlowG = new PIXI.Graphics();
            this.bgGlowG.alpha = 0;
            this.scene.addChild(this.bgGlowG);

            this.dustLayer = new PIXI.Container();
            this.scene.addChild(this.dustLayer);

            // 時鐘主舞台（包含齒輪、鐘面、鐘擺，方便整體縮放與淡化）
            this.clockStage = new PIXI.Container();
            this.scene.addChild(this.clockStage);

            this.gearLayer = new PIXI.Container();
            this.clockFaceLayer = new PIXI.Container();
            this.pendulumLayer = new PIXI.Container();
            this.fxLayer = new PIXI.Container();

            this.clockStage.addChild(this.gearLayer);
            this.clockStage.addChild(this.clockFaceLayer);
            this.clockStage.addChild(this.pendulumLayer);
            this.clockStage.addChild(this.fxLayer);

            this.buildAmbientGlow();
            this.buildDust();
            this.buildGears();
            this.buildClockFace();
            this.buildPendulum();
            this.bindMenuEvents();

            this.app.ticker.add(dt => this.onTick(dt));
        },

        // ---------- 1. 背景氛圍與星塵 ----------
        buildAmbientGlow() {
            const g = this.bgGlowG;
            g.clear();
            for (let i = 8; i >= 1; i--) {
                const r = i * 42;
                g.beginFill(PAL.gold, 0.004 * (9 - i)).drawCircle(0, 0, r * 0.7).endFill();
            }
        },

        buildDust() {
            this.dusts = [];
            for (let i = 0; i < 48; i++) {
                const p = new PIXI.Graphics();
                const isGold = i % 3 === 0;
                const col = isGold ? PAL.gold : PAL.indigo;
                const rad = 1 + Math.random() * 2.2;
                p.beginFill(col, 0.25 + Math.random() * 0.55).drawCircle(0, 0, rad).endFill();
                const angle = Math.random() * Math.PI * 2;
                const dist = 40 + Math.random() * 420;
                p.x = Math.cos(angle) * dist;
                p.y = Math.sin(angle) * dist;
                this.dustLayer.addChild(p);
                this.dusts.push({
                    node: p,
                    angle,
                    dist,
                    speed: (0.0015 + Math.random() * 0.003) * (i % 2 === 0 ? 1 : -1),
                    driftY: -0.15 - Math.random() * 0.25,
                    phase: Math.random() * Math.PI * 2
                });
            }
        },

        // ---------- 2. 精密齒輪群 ----------
        drawGearGraphic(g, outerR, teeth, innerR, spokes, color, fillAlpha = 0.12) {
            const rootR = outerR - Math.max(5, outerR * 0.11);
            const step = (Math.PI * 2) / teeth;

            // 外圍光暈
            g.lineStyle(0);
            for (let i = 3; i >= 1; i--) {
                g.beginFill(color, 0.035 * (4 - i)).drawCircle(0, 0, outerR + i * 5).endFill();
            }

            // 齒形多邊形
            g.lineStyle(1.8, color, 0.82);
            g.beginFill(PAL.darkHub, fillAlpha + 0.55);
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

            // 內圈環與軸孔
            g.lineStyle(1.5, color, 0.55);
            g.drawCircle(0, 0, rootR * 0.84);
            g.lineStyle(1.2, color, 0.45);
            g.beginFill(PAL.bg, 0.65).drawCircle(0, 0, innerR).endFill();

            // 輪輻 (Spokes)
            if (spokes > 0) {
                g.lineStyle(2.2, color, 0.5);
                for (let s = 0; s < spokes; s++) {
                    const sa = (s * Math.PI * 2) / spokes;
                    g.moveTo(Math.cos(sa) * (innerR * 0.35), Math.sin(sa) * (innerR * 0.35));
                    g.lineTo(Math.cos(sa) * (rootR * 0.84), Math.sin(sa) * (rootR * 0.84));
                }
            }

            // 軸心圓環
            g.lineStyle(2, color, 0.85);
            g.beginFill(PAL.darkHub, 0.95).drawCircle(0, 0, Math.max(8, innerR * 0.35)).endFill();
            g.lineStyle(0);
            g.beginFill(color, 0.7).drawCircle(0, 0, 3.5).endFill();
        },

        buildGears() {
            this.gears = [];
            // 定義 8 個交錯咬合的機械齒輪配置
            const specs = [
                { x: 0,    y: 0,    r: 175, teeth: 36, inner: 118, spokes: 6, col: PAL.indigo, speed: 0.18,  dir: 1,  delay: 0.00 },
                { x: 0,    y: 0,    r: 112, teeth: 24, inner: 72,  spokes: 4, col: PAL.gold,   speed: 0.27,  dir: -1, delay: 0.12 },
                { x: -125, y: -88,  r: 76,  teeth: 18, inner: 44,  spokes: 5, col: PAL.gold,   speed: 0.36,  dir: 1,  delay: 0.20 },
                { x: 132,  y: -78,  r: 68,  teeth: 16, inner: 38,  spokes: 4, col: PAL.indigo, speed: 0.40,  dir: -1, delay: 0.28 },
                { x: 118,  y: 102,  r: 82,  teeth: 20, inner: 50,  spokes: 6, col: PAL.gold,   speed: 0.32,  dir: 1,  delay: 0.34 },
                { x: -122, y: 98,   r: 64,  teeth: 15, inner: 36,  spokes: 3, col: PAL.indigo, speed: 0.43,  dir: -1, delay: 0.40 },
                { x: 0,    y: -158, r: 52,  teeth: 12, inner: 28,  spokes: 4, col: PAL.gold,   speed: 0.54,  dir: 1,  delay: 0.46 },
                { x: 0,    y: 155,  r: 56,  teeth: 14, inner: 30,  spokes: 4, col: PAL.indigo, speed: 0.46,  dir: -1, delay: 0.52 }
            ];

            specs.forEach((sp, idx) => {
                const g = new PIXI.Graphics();
                this.drawGearGraphic(g, sp.r, sp.teeth, sp.inner, sp.spokes, sp.col, idx < 2 ? 0.08 : 0.16);
                // 起始位置從外圍遠處飛入
                const angle = Math.atan2(sp.y || (idx % 2 ? 1 : -1), sp.x || (idx < 1 ? 1 : -1));
                const startDist = 380 + idx * 35;
                const startX = sp.x + Math.cos(angle + idx * 0.7) * startDist;
                const startY = sp.y + Math.sin(angle + idx * 0.7) * startDist;

                g.position.set(startX, startY);
                g.scale.set(0.25);
                g.alpha = 0;

                this.gearLayer.addChild(g);
                this.gears.push({
                    node: g,
                    tx: sp.x,
                    ty: sp.y,
                    sx: startX,
                    sy: startY,
                    speed: sp.speed,
                    dir: sp.dir,
                    delay: sp.delay,
                    targetAlpha: idx < 2 ? 0.78 : 0.68
                });
            });
        },

        // ---------- 3. 星芒鐘面與 12 時辰格位 ----------
        buildClockFace() {
            const R = 235;
            const ringG = new PIXI.Graphics();

            // 外層雙星軌環
            ringG.lineStyle(2, PAL.gold, 0.55).drawCircle(0, 0, R + 34);
            ringG.lineStyle(1, PAL.indigo, 0.4).drawCircle(0, 0, R + 44);
            ringG.lineStyle(1.5, PAL.indigo, 0.45).drawCircle(0, 0, R - 34);

            // 60 格刻度
            for (let i = 0; i < 60; i++) {
                const isMajor = i % 5 === 0;
                const a = (i * 6 - 90) * Math.PI / 180;
                const rOuter = R + 34;
                const rInner = rOuter - (isMajor ? 14 : 6);
                ringG.lineStyle(isMajor ? 2.2 : 1, isMajor ? PAL.gold : PAL.white, isMajor ? 0.75 : 0.22);
                ringG.moveTo(Math.cos(a) * rOuter, Math.sin(a) * rOuter);
                ringG.lineTo(Math.cos(a) * rInner, Math.sin(a) * rInner);
            }

            // 內層幾何八角星芒紋
            ringG.lineStyle(1, PAL.gold, 0.22);
            for (let k = 0; k < 12; k++) {
                const a1 = (k * 30 - 90) * Math.PI / 180;
                const a2 = ((k + 5) * 30 - 90) * Math.PI / 180;
                ringG.moveTo(Math.cos(a1) * (R - 34), Math.sin(a1) * (R - 34));
                ringG.lineTo(Math.cos(a2) * (R - 34), Math.sin(a2) * (R - 34));
            }

            ringG.alpha = 0;
            ringG.scale.set(0.82);
            this.clockRingsG = ringG;
            this.clockFaceLayer.addChild(ringG);

            // 12 個時辰節點
            this.clockSpots = [];
            for (let i = 0; i < 12; i++) {
                const posNum = i === 0 ? 12 : i;
                const a = (i * 30 - 90) * Math.PI / 180;
                const tx = Math.cos(a) * R;
                const ty = Math.sin(a) * R;

                const c = new PIXI.Container();
                c.position.set(tx, ty);
                c.alpha = 0;
                c.scale.set(0.2);

                const g = new PIXI.Graphics();
                for (let k = 3; k >= 1; k--) {
                    g.beginFill(PAL.gold, 0.06 * (4 - k)).drawCircle(0, 0, 24 + k * 4).endFill();
                }
                g.lineStyle(1.8, PAL.gold, 0.85)
                 .beginFill(PAL.darkHub, 0.9)
                 .drawCircle(0, 0, 23)
                 .endFill();
                g.lineStyle(1, PAL.indigo, 0.45).drawCircle(0, 0, 19);
                c.addChild(g);

                const romanText = new PIXI.Text(ROMAN[i], {
                    fontFamily: FONT_TITLE,
                    fontSize: 13,
                    fill: PAL.gold,
                    fontWeight: '700'
                });
                romanText.anchor.set(0.5);
                romanText.y = -4;
                c.addChild(romanText);

                const numText = new PIXI.Text(String(posNum), {
                    fontFamily: FONT_UI,
                    fontSize: 9,
                    fill: PAL.indigo,
                    fontWeight: '600'
                });
                numText.anchor.set(0.5);
                numText.y = 10;
                c.addChild(numText);

                this.clockFaceLayer.addChild(c);
                this.clockSpots.push({
                    node: c,
                    tx,
                    ty,
                    index: i,
                    sparked: false
                });
            }

            // 中央指針（時針與分針，於鐘面組合時浮現）
            const hands = new PIXI.Container();
            hands.alpha = 0;

            const hourHand = new PIXI.Graphics();
            hourHand.lineStyle(3, PAL.gold, 0.9).beginFill(PAL.gold, 0.3);
            hourHand.moveTo(0, 18).lineTo(-6, -30).lineTo(0, -115).lineTo(6, -30).closePath().endFill();

            const minHand = new PIXI.Graphics();
            minHand.lineStyle(2, PAL.indigo, 0.9).beginFill(PAL.indigo, 0.3);
            minHand.moveTo(0, 24).lineTo(-4, -40).lineTo(0, -165).lineTo(4, -40).closePath().endFill();

            const centerCap = new PIXI.Graphics();
            centerCap.lineStyle(2, PAL.gold, 1).beginFill(PAL.darkHub, 1).drawCircle(0, 0, 10).endFill();
            centerCap.beginFill(PAL.gold, 1).drawCircle(0, 0, 4).endFill();

            hands.addChild(minHand, hourHand, centerCap);
            this.clockFaceLayer.addChild(hands);
            this.clockHands = { container: hands, hour: hourHand, min: minHand };
        },

        // ---------- 4. 鐘擺（主角：與主畫面鐘面鐘擺統一形狀） ----------
        buildPendulum() {
            const pivotY = -210;
            const rodLen = 355; // 擺錘中心在 y = -210 + 355 = +145（與鐘面背景鐘擺完全一致）
            this.pendulumPivotY = pivotY;
            this.pendulumRodLen = rodLen;

            // 擺臂容器（以頂部樞軸為旋轉中心）
            const arm = new PIXI.Container();
            arm.position.set(0, pivotY);

            // 雙細軌與中央主軸（與鐘面鐘擺相同）
            const rod = new PIXI.Graphics();
            rod.lineStyle(1.4, PAL.gold, 0.65);
            rod.moveTo(-3, 8).lineTo(-3, rodLen - 34);
            rod.moveTo(3, 8).lineTo(3, rodLen - 34);
            rod.lineStyle(2, PAL.goldBright, 0.85);
            rod.moveTo(0, 6).lineTo(0, rodLen - 30);
            arm.addChild(rod);

            // 底部鐘擺錘 (Pendulum Bob)
            const bob = new PIXI.Container();
            bob.position.set(0, rodLen);

            // 擺錘呼吸光暈層
            const coreGlow = new PIXI.Graphics();
            for (let i = 5; i >= 1; i--) {
                coreGlow.beginFill(PAL.gold, 0.05 * (6 - i)).drawCircle(0, 0, 28 + i * 9).endFill();
                coreGlow.beginFill(PAL.indigo, 0.035 * (6 - i)).drawCircle(0, 0, 20 + i * 6).endFill();
            }
            bob.addChild(coreGlow);
            this.bobCoreGlow = coreGlow;

            // 擺錘主體幾何（與 modern_board.js 的 buildBackgroundPendulum 完全一致）
            const bobG = new PIXI.Graphics();
            bobG.lineStyle(1.8, PAL.gold, 0.85).beginFill(PAL.darkHub, 0.9);
            bobG.drawPolygon([-7, 30, 0, 54, 7, 30]);
            bobG.endFill();
            bobG.lineStyle(2, PAL.gold, 0.9).beginFill(PAL.darkHub, 0.9).drawCircle(0, 0, 32).endFill();
            bobG.lineStyle(1, PAL.indigo, 0.6).drawCircle(0, 0, 25);

            bobG.lineStyle(0);
            for (let i = 0; i < 8; i++) {
                const a = (i * 45) * Math.PI / 180;
                const rOut = i % 2 === 0 ? 30 : 21;
                bobG.beginFill(i % 2 === 0 ? PAL.gold : PAL.indigo, 0.25);
                bobG.drawPolygon([
                    Math.cos(a - 0.2) * 10, Math.sin(a - 0.2) * 10,
                    Math.cos(a) * rOut, Math.sin(a) * rOut,
                    Math.cos(a + 0.2) * 10, Math.sin(a + 0.2) * 10
                ]);
                bobG.endFill();
            }
            bobG.lineStyle(1.5, PAL.goldBright, 0.9).beginFill(PAL.gold, 0.85).drawCircle(0, 0, 7).endFill();

            bob.addChild(bobG);
            arm.addChild(bob);

            this.pendulumLayer.addChild(arm);
            this.pendulumArm = arm;
            this.pendulumBob = bob;

            // 設定點擊與懸停互動區
            arm.eventMode = 'static';
            arm.cursor = 'pointer';
            arm.hitArea = new PIXI.Circle(0, rodLen, 75);

            arm.on('pointerover', () => {
                if (this.state === 'IDLE') {
                    this.isHoveringBob = true;
                    bob.scale.set(1.08);
                    this.spawnShockwave(0, pivotY + rodLen, PAL.gold, 85, 0.65);
                }
            });
            arm.on('pointerout', () => {
                if (this.state === 'IDLE') {
                    this.isHoveringBob = false;
                    bob.scale.set(1.0);
                }
            });
            arm.on('pointertap', () => {
                if (this.state === 'IDLE') {
                    this.triggerPendulumStart();
                }
            });
        },

        // ---------- 5. 特效：波紋與星塵軌跡 ----------
        spawnShockwave(x, y, color = PAL.gold, maxR = 260, duration = 1.1) {
            const g = new PIXI.Graphics();
            g.position.set(x, y);
            this.fxLayer.addChild(g);
            this.ripples.push({ node: g, color, maxR, duration, elapsed: 0 });
        },

        spawnTrailParticle(x, y) {
            const p = new PIXI.Graphics();
            const isGold = Math.random() > 0.35;
            p.beginFill(isGold ? PAL.gold : PAL.indigo, 0.85).drawCircle(0, 0, 1.5 + Math.random() * 2).endFill();
            p.position.set(x + (Math.random() - 0.5) * 18, y + (Math.random() - 0.5) * 18);
            this.fxLayer.addChild(p);
            this.trailParticles.push({
                node: p,
                vx: (Math.random() - 0.5) * 1.2,
                vy: -0.4 - Math.random() * 1.0,
                life: 1.0
            });
        },

        // ---------- 6. 狀態切換邏輯 ----------
        triggerPendulumStart() {
            if (this.state !== 'IDLE') return;
            this.state = 'SWINGING';
            this.stateTime = 0;
            this.isHoveringBob = false;
            this.pendulumBob.scale.set(1.0);
            this.pendulumArm.cursor = 'default';

            // 預先套用預設 5P 模式啟動引擎，待齒輪鐘面組合動畫完成後直接無縫進入牌桌
            this.selectedMode = '5P';
            this.selectedRole5P = 'SM_1';
            this.applySelectionToEngine();

            // 播放鐘聲與背景音樂（自動平滑淡入）
            if (window.gameAudio) {
                if (typeof window.gameAudio.playChime === 'function') window.gameAudio.playChime();
                if (typeof window.gameAudio.playBGM === 'function') window.gameAudio.playBGM();
            }

            // 在擺錘當前位置爆發雙層能量波紋並展開擺動與齒輪聚合動畫
            const rodLen = this.pendulumRodLen || 355;
            const pivotY = this.pendulumPivotY || -210;
            const bobWorldX = -Math.sin(this.pendulumArm.rotation) * rodLen;
            const bobWorldY = pivotY + Math.cos(this.pendulumArm.rotation) * rodLen;
            this.spawnShockwave(bobWorldX, bobWorldY, PAL.gold, 260, 0.9);
            this.spawnShockwave(bobWorldX, bobWorldY, PAL.indigo, 180, 0.75);
            for (let i = 0; i < 18; i++) {
                this.spawnTrailParticle(bobWorldX, bobWorldY);
            }
        },

        skipToMenu() {
            if (this.state === 'ENTERING' || this.state === 'DONE') return;
            this.selectedMode = '5P';
            this.selectedRole5P = 'SM_1';
            this.applySelectionToEngine();
            if (window.gameAudio && typeof window.gameAudio.playBGM === 'function') {
                window.gameAudio.playBGM();
            }
            if (this.skipBtn) this.skipBtn.classList.add('is-hidden');
            this.closeIntroOverlay();
        },

        enterMenuState() {
            // 齒輪鐘面組合完成後，直接轉場進入 5P 遊戲主畫面
            if (this.skipBtn) this.skipBtn.classList.add('is-hidden');
            this.closeIntroOverlay();
        },

        // ---------- 7. 每幀動畫更新 ----------
        onTick(dt) {
            if (this.state === 'DONE') return;
            const deltaSec = dt / 60;
            this.totalTime += deltaSec;
            this.stateTime += deltaSec;

            // 響應式置中與等比縮放
            const sw = this.app.screen.width;
            const sh = this.app.screen.height;
            const baseScale = Math.min(sw, sh) / 760;
            this.scene.position.set(sw / 2, sh / 2);
            this.scene.scale.set(baseScale);

            // 星塵粒子漂浮
            this.dusts.forEach(d => {
                const speedMult = this.state === 'IDLE' ? 0.35 : 1.4;
                d.angle += d.speed * speedMult * dt;
                d.node.x = Math.cos(d.angle) * d.dist;
                d.node.y = Math.sin(d.angle) * d.dist + Math.sin(this.totalTime * 1.5 + d.phase) * 8;
                d.node.alpha = 0.25 + 0.35 * Math.sin(this.totalTime * 2 + d.phase);
            });

            // 階段 1：IDLE（鐘擺微微搖晃 + 核心呼吸，吸引玩家點擊）
            const rodLen = this.pendulumRodLen || 355;
            const pivotY = this.pendulumPivotY || -210;

            if (this.state === 'IDLE') {
                const targetIdleAmp = this.isHoveringBob ? 0.072 : 0.042;
                this.swingAmp += (targetIdleAmp - this.swingAmp) * 0.08;
                this.swingPhase += deltaSec * 2.15;
                this.pendulumArm.rotation = Math.sin(this.swingPhase) * this.swingAmp;

                const pulse = 0.72 + 0.28 * Math.sin(this.totalTime * 3.2);
                this.bobCoreGlow.alpha = this.isHoveringBob ? 1.0 : pulse;

                // 偶爾從微晃的擺錘飄出零星微光粒子
                if (Math.random() < (this.isHoveringBob ? 0.22 : 0.06)) {
                    const bobWorldX = -Math.sin(this.pendulumArm.rotation) * rodLen;
                    const bobWorldY = pivotY + Math.cos(this.pendulumArm.rotation) * rodLen;
                    this.spawnTrailParticle(bobWorldX, bobWorldY);
                }
            }

            // 階段 2 & 之後：點擊後鐘擺無縫銜接並大幅擺動
            if (this.state !== 'IDLE') {
                this.swingPhase += deltaSec * 2.65;
                this.swingAmp = Math.min(0.42, this.swingAmp + deltaSec * 0.45);
                const sinVal = Math.sin(this.swingPhase);
                this.pendulumArm.rotation = sinVal * this.swingAmp;

                // 計算擺錘世界座標並產生星塵尾跡
                const bobWorldX = -Math.sin(this.pendulumArm.rotation) * rodLen;
                const bobWorldY = pivotY + Math.cos(this.pendulumArm.rotation) * rodLen;
                if (Math.random() < 0.45) {
                    this.spawnTrailParticle(bobWorldX, bobWorldY);
                }

                // 經過最低點時觸發微弱光波
                const sign = sinVal >= 0 ? 1 : -1;
                if (this.lastSinSign !== 0 && sign !== this.lastSinSign && this.state === 'SWINGING') {
                    this.spawnShockwave(0, pivotY + rodLen, PAL.indigo, 110, 0.65);
                }
                this.lastSinSign = sign;
            }

            // 階段 2 -> 階段 3 轉移（擺動 1.15 秒後喚醒齒輪）
            if (this.state === 'SWINGING') {
                this.bgGlowG.alpha = Math.min(0.5, this.stateTime * 0.4);
                if (this.stateTime >= 1.15) {
                    this.state = 'ASSEMBLING';
                    this.stateTime = 0;
                }
            }

            // 階段 3：齒輪浮現並組合成鐘面
            if (this.state === 'ASSEMBLING') {
                const t = this.stateTime;
                this.bgGlowG.alpha = Math.min(1, 0.5 + t * 0.3);

                // A. 齒輪飛入咬合與旋轉
                this.gears.forEach(gr => {
                    const localT = Math.max(0, (t - gr.delay) / 1.25);
                    const p = easeOutCubic(localT);
                    gr.node.x = gr.sx + (gr.tx - gr.sx) * p;
                    gr.node.y = gr.sy + (gr.ty - gr.sy) * p;
                    gr.node.scale.set(0.25 + 0.75 * p);
                    gr.node.alpha = gr.targetAlpha * p;
                    gr.node.rotation += gr.speed * gr.dir * deltaSec;
                });

                // B. 鐘面外環與刻度浮現 (t: 0.6s ~ 1.8s)
                if (t > 0.6) {
                    const rp = easeOutCubic((t - 0.6) / 1.2);
                    this.clockRingsG.alpha = rp;
                    this.clockRingsG.scale.set(0.84 + 0.16 * rp);
                }

                // C. 12 個時辰格位順時針依序點亮 (t: 0.75s ~ 2.15s)
                this.clockSpots.forEach(sp => {
                    const spotDelay = 0.75 + sp.index * 0.105;
                    if (t >= spotDelay) {
                        const spProg = easeOutBack((t - spotDelay) / 0.42);
                        sp.node.alpha = Math.min(1, (t - spotDelay) / 0.25);
                        sp.node.scale.set(spProg);
                        if (!sp.sparked) {
                            sp.sparked = true;
                            this.spawnShockwave(sp.tx, sp.ty, PAL.gold, 48, 0.45);
                        }
                    }
                });

                // D. 中央指針浮現並歸位 (t: 1.4s ~ 2.3s)
                if (t > 1.4) {
                    const hp = easeInOutCubic((t - 1.4) / 0.9);
                    this.clockHands.container.alpha = hp * 0.9;
                    this.clockHands.hour.rotation = (1 - hp) * -Math.PI * 1.2 + 0.52;
                    this.clockHands.min.rotation = (1 - hp) * Math.PI * 2.0 - 0.45;
                }

                // E. 組合完成，綻放金色共鳴波並進入選單階段
                if (t >= 2.55) {
                    this.spawnShockwave(0, 0, PAL.gold, 380, 1.1);
                    if (window.gameAudio && typeof window.gameAudio.playConfirm === 'function') {
                        window.gameAudio.playConfirm();
                    }
                    this.enterMenuState();
                }
            }

            // 階段 4：選單登場，背景鐘面持續運轉並微縮退後
            if (this.state === 'MENU') {
                const mp = easeOutCubic(this.stateTime / 1.0);
                this.clockStage.scale.set(1 - 0.14 * mp);
                this.clockStage.alpha = 1 - 0.55 * mp;

                this.gears.forEach(gr => {
                    gr.node.rotation += gr.speed * gr.dir * deltaSec;
                });
                this.clockHands.min.rotation += 0.08 * deltaSec;
                this.clockHands.hour.rotation += 0.007 * deltaSec;
            }

            // 階段 5：齒輪鐘面組合完成後的無縫轉場
            if (this.state === 'ENTERING') {
                const ep = easeInOutCubic(this.stateTime / 0.68);
                this.clockStage.scale.set(1.0 + ep * 0.12);
                this.clockStage.alpha = Math.max(0, 1.0 - ep);
                this.gears.forEach(gr => {
                    gr.node.rotation += gr.speed * gr.dir * deltaSec * (1 + ep * 4);
                });
            }

            // 更新波紋特效
            for (let i = this.ripples.length - 1; i >= 0; i--) {
                const rp = this.ripples[i];
                rp.elapsed += deltaSec;
                const p = rp.elapsed / rp.duration;
                if (p >= 1) {
                    rp.node.destroy();
                    this.ripples.splice(i, 1);
                } else {
                    const r = easeOutCubic(p) * rp.maxR;
                    const alpha = (1 - p) * 0.75;
                    rp.node.clear();
                    rp.node.lineStyle(2.2 * (1 - p * 0.5), rp.color, alpha).drawCircle(0, 0, r);
                }
            }

            // 更新尾跡粒子
            for (let i = this.trailParticles.length - 1; i >= 0; i--) {
                const tp = this.trailParticles[i];
                tp.life -= deltaSec * 1.4;
                if (tp.life <= 0) {
                    tp.node.destroy();
                    this.trailParticles.splice(i, 1);
                } else {
                    tp.node.x += tp.vx;
                    tp.node.y += tp.vy;
                    tp.node.alpha = tp.life;
                    tp.node.scale.set(tp.life);
                }
            }
        },

        // ---------- 8. 整合式初始選單事件與遊戲啟動 ----------
        updateDrawerSummary() {
            const summaryEl = document.getElementById('intro-drawer-summary');
            const startBtn = document.getElementById('intro-enter-game-btn');
            const roleMap5P = { 'SM_1': '時魔', 'sin': '時之惡', 'SCZ': '受詛者' };
            const roleLabel = this.selectedMode === '5P'
                ? (roleMap5P[this.selectedRole5P] || '時魔')
                : this.selectedRole3P;

            if (summaryEl) {
                summaryEl.textContent = `⚙ 變更模式、角色與輔助選項（當前：${this.selectedMode} · ${roleLabel}）`;
            }
            if (startBtn) {
                startBtn.textContent = `開始遊戲 (${this.selectedMode} · ${roleLabel})`;
            }
        },

        applySelectionToEngine() {
            const pickHiddenOption = (groupName, value) => {
                const btn = document.querySelector(`[data-selection-group="${groupName}"] .selection-btn[data-value="${value}"]`);
                if (btn) btn.click();
            };

            pickHiddenOption('start-game-mode', this.selectedMode);
            if (this.selectedMode === '5P') {
                pickHiddenOption('start-five-player-role', this.selectedRole5P);
            } else {
                pickHiddenOption('start-time-demon-role', this.selectedRole3P);
            }

            const modeConfirmBtn = document.getElementById('game-mode-confirm');
            const roleConfirmBtn = document.getElementById('role-choice-confirm');
            if (modeConfirmBtn) modeConfirmBtn.click();
            if (roleConfirmBtn) roleConfirmBtn.click();
        },

        bindMenuEvents() {
            if (this.skipBtn) {
                this.skipBtn.addEventListener('click', () => this.skipToMenu());
            }

            // 模式切換按鈕 (5P / 3P)
            const modeBtns = document.querySelectorAll('.intro-mode-btn');
            const roleGroup5P = document.getElementById('intro-roles-5p');
            const roleGroup3P = document.getElementById('intro-roles-3p');

            modeBtns.forEach(btn => {
                btn.addEventListener('click', () => {
                    const mode = btn.getAttribute('data-mode') || '5P';
                    this.selectedMode = mode;
                    modeBtns.forEach(b => b.classList.toggle('active', b === btn));
                    if (roleGroup5P) roleGroup5P.classList.toggle('is-hidden', mode !== '5P');
                    if (roleGroup3P) roleGroup3P.classList.toggle('is-hidden', mode !== '3P');
                    this.updateDrawerSummary();
                    if (window.gameAudio && typeof window.gameAudio.playClick === 'function') {
                        window.gameAudio.playClick();
                    }
                });
            });

            // 5P 角色選擇卡片
            const roleCards5P = document.querySelectorAll('#intro-roles-5p .intro-role-card');
            roleCards5P.forEach(card => {
                card.addEventListener('click', () => {
                    this.selectedRole5P = card.getAttribute('data-role') || 'SM_1';
                    roleCards5P.forEach(c => c.classList.toggle('active', c === card));
                    this.updateDrawerSummary();
                    if (window.gameAudio && typeof window.gameAudio.playClick === 'function') {
                        window.gameAudio.playClick();
                    }
                });
            });

            // 3P 角色選擇卡片
            const roleCards3P = document.querySelectorAll('#intro-roles-3p .intro-role-card');
            roleCards3P.forEach(card => {
                card.addEventListener('click', () => {
                    this.selectedRole3P = card.getAttribute('data-role') || '時針';
                    roleCards3P.forEach(c => c.classList.toggle('active', c === card));
                    this.updateDrawerSummary();
                    if (window.gameAudio && typeof window.gameAudio.playClick === 'function') {
                        window.gameAudio.playClick();
                    }
                });
            });

            // 同步設定開關初始狀態
            const introAbilityChk = document.getElementById('intro-ability-chk');
            const introTutorialChk = document.getElementById('intro-tutorial-chk');
            const mainAbilityChk = document.getElementById('ability-toggle');
            const mainTutorialChk = document.getElementById('tutorial-toggle');

            if (introAbilityChk && mainAbilityChk) {
                introAbilityChk.checked = mainAbilityChk.checked;
                introAbilityChk.addEventListener('change', () => {
                    mainAbilityChk.checked = introAbilityChk.checked;
                    mainAbilityChk.dispatchEvent(new Event('change'));
                });
            }
            if (introTutorialChk && mainTutorialChk) {
                introTutorialChk.checked = mainTutorialChk.checked;
                introTutorialChk.addEventListener('change', () => {
                    mainTutorialChk.checked = introTutorialChk.checked;
                    mainTutorialChk.dispatchEvent(new Event('change'));
                });
            }

            // 「踏入時鐘（開始遊戲）」主按鈕
            const startBtn = document.getElementById('intro-enter-game-btn');
            if (startBtn) {
                startBtn.addEventListener('click', () => this.launchGameFromIntro());
            }

            // 「查閱規則」按鈕
            const rulesBtn = document.getElementById('intro-view-rules-btn');
            if (rulesBtn) {
                rulesBtn.addEventListener('click', () => {
                    this.closeIntroOverlay(() => {
                        const rulesTabBtn = document.querySelector('.tab-btn[data-target="rules-content"]');
                        if (rulesTabBtn) rulesTabBtn.click();
                    });
                });
            }

            // 點擊外部自動收合「版本切換」下拉選單
            const versionDetails = document.querySelector('.version-switch-details');
            if (versionDetails) {
                document.addEventListener('click', (e) => {
                    if (versionDetails.open && !versionDetails.contains(e.target)) {
                        versionDetails.open = false;
                    }
                });
            }
        },

        launchGameFromIntro() {
            if (this.state === 'ENTERING' || this.state === 'DONE') return;

            // 1. 將開場選單的選項同步至原本的隱藏選擇器並啟動遊戲
            const pickHiddenOption = (groupName, value) => {
                const btn = document.querySelector(`[data-selection-group="${groupName}"] .selection-btn[data-value="${value}"]`);
                if (btn) btn.click();
            };

            pickHiddenOption('start-game-mode', this.selectedMode);
            if (this.selectedMode === '5P') {
                pickHiddenOption('start-five-player-role', this.selectedRole5P);
            } else {
                pickHiddenOption('start-time-demon-role', this.selectedRole3P);
            }

            // 觸發原有確認流程（自動完成 applyStartConfig -> startWithRole -> doInitialize -> updateUI）
            const modeConfirmBtn = document.getElementById('game-mode-confirm');
            const roleConfirmBtn = document.getElementById('role-choice-confirm');
            if (modeConfirmBtn) modeConfirmBtn.click();
            if (roleConfirmBtn) roleConfirmBtn.click();

            // 2. 播放確認音效並執行開場淡出轉場
            if (window.gameAudio) {
                if (typeof window.gameAudio.playConfirm === 'function') window.gameAudio.playConfirm();
                if (typeof window.gameAudio.playBGM === 'function') window.gameAudio.playBGM();
            }

            this.closeIntroOverlay();
        },

        closeIntroOverlay(onComplete) {
            this.state = 'ENTERING';
            this.stateTime = 0;

            if (this.uiEl) this.uiEl.classList.remove('is-visible');
            if (this.overlayEl) this.overlayEl.classList.add('is-leaving');

            setTimeout(() => {
                this.state = 'DONE';
                if (this.app && this.app.ticker) this.app.ticker.stop();
                if (this.overlayEl) {
                    this.overlayEl.style.display = 'none';
                    this.overlayEl.classList.remove('is-leaving');
                }
                if (typeof onComplete === 'function') onComplete();
                // 進場動畫完全結束後，觸發教學引導顯示
                if (window.TutorialModeManager && typeof window.TutorialModeManager.updateTutorialPointers === 'function' && window.globalGameState) {
                    window.TutorialModeManager.updateTutorialPointers(window.globalGameState);
                }
            }, 680);
        },

        replayIntro() {
            if (!this.overlayEl || !this.app) return;

            // 重置狀態機與視覺元件
            this.state = 'IDLE';
            this.stateTime = 0;
            this.swingPhase = 0;
            this.swingAmp = 0.042;
            this.isHoveringBob = false;
            this.lastSinSign = 0;

            this.bgGlowG.alpha = 0;
            this.clockStage.scale.set(1);
            this.clockStage.alpha = 1;
            this.pendulumArm.rotation = 0;
            this.pendulumArm.cursor = 'pointer';
            this.pendulumBob.scale.set(1);

            this.gears.forEach(gr => {
                gr.node.position.set(gr.sx, gr.sy);
                gr.node.scale.set(0.25);
                gr.node.alpha = 0;
            });
            this.clockRingsG.alpha = 0;
            this.clockRingsG.scale.set(0.82);
            this.clockSpots.forEach(sp => {
                sp.node.alpha = 0;
                sp.node.scale.set(0.2);
                sp.sparked = false;
            });
            this.clockHands.container.alpha = 0;

            if (this.skipBtn) this.skipBtn.classList.remove('is-hidden');
            if (this.uiEl) {
                this.uiEl.classList.remove('is-visible');
                this.uiEl.classList.add('is-hidden');
            }

            this.overlayEl.style.display = 'flex';
            this.app.ticker.start();
        }
    };

    window.ModernIntro = Intro;

    document.addEventListener('DOMContentLoaded', () => {
        Intro.init();
    });
})();
