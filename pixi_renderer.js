// pixi_renderer.js - PixiJS 鐘面與棋子動態畫布渲染器

(function () {
    const PixiClockRenderer = {
        app: null,
        container: null,
        isInitialized: false,
        lastStateSignature: '',
        tokenSprites: {}, // 存儲各玩家的 Sprite 及補間資訊

        // 鐘面配置常數
        BASE_SIZE: 600, // 畫布標準虛擬尺寸
        RADIUS: 215,    // 12 個時鐘格圓半徑
        CENTER_X: 300,
        CENTER_Y: 300,

        // 紋理緩存
        textures: {},

        // 初始化 Pixi 應用程式
        async init(mountElement) {
            if (this.isInitialized) return;
            if (!window.PIXI) {
                console.warn('[PixiRenderer] PIXI 全域物件尚未載入');
                return;
            }

            const host = mountElement || document.getElementById('pixi-clock-container');
            if (!host) {
                console.warn('[PixiRenderer] 找不到掛載容器 #pixi-clock-container');
                return;
            }

            // 建立 Pixi Application (相容 PixiJS v7)
            const app = new PIXI.Application({
                width: this.BASE_SIZE,
                height: this.BASE_SIZE,
                backgroundAlpha: 0,
                antialias: true,
                resolution: Math.min(window.devicePixelRatio || 1, 2),
                autoDensity: true
            });

            this.app = app;
            app.view.className = 'pixi-canvas';
            host.appendChild(app.view);

            // 主舞臺容器
            this.stageContainer = new PIXI.Container();
            app.stage.addChild(this.stageContainer);

            // 分層容器
            this.bgLayer = new PIXI.Container();
            this.spotsLayer = new PIXI.Container();
            this.linesLayer = new PIXI.Graphics();
            this.drawnCardsLayer = new PIXI.Container();
            this.tokensLayer = new PIXI.Container();
            this.uiLayer = new PIXI.Container();

            this.stageContainer.addChild(this.bgLayer);
            this.stageContainer.addChild(this.linesLayer);
            this.stageContainer.addChild(this.spotsLayer);
            this.stageContainer.addChild(this.drawnCardsLayer);
            this.stageContainer.addChild(this.tokensLayer);
            this.stageContainer.addChild(this.uiLayer);

            // 預載貼圖資源
            await this.loadTextures();

            // 繪製靜態背景與裝飾環
            this.buildClockBackground();

            // 監聽畫布大小動態縮放
            this.setupResponsiveResize(host);

            // 動畫循環 (用於補間插值與呼吸燈)
            app.ticker.add((delta) => this.onTick(delta));

            this.isInitialized = true;
            console.log('✅ [PixiRenderer] PixiJS 鐘面畫布初始化完成');

            // 如果目前已有遊戲狀態，立刻繪製
            if (window.globalGameState) {
                this.render(window.globalGameState);
            }
        },

        // 載入貼圖
        async loadTextures() {
            const textureMap = {
                'clock_bg': 'clock-bg.png',
                // NPC 靈魂
                'demon': 'assets/soul_demon.png',
                'sin': 'assets/soul_sin.png',
                'scz': 'assets/soul_scz.png',
                'hour': 'assets/soul_hour.png',
                'min': 'assets/soul_min.png',
                'sec': 'assets/soul_sec.png',
                // 玩家專屬靈魂
                'p_demon': 'assets/player/p_soul_demon.png',
                'p_sin': 'assets/player/P_soul_sin.png',
                'p_scz': 'assets/player/p_soul_scz.png',
                'p_hour': 'assets/player/p_soul_hour.png',
                'p_min': 'assets/player/p_soul_min.png',
                'p_sec': 'assets/player/p_soul_sec.png'
            };

            for (const [key, path] of Object.entries(textureMap)) {
                try {
                    this.textures[key] = await PIXI.Assets.load(path);
                } catch (e) {
                    console.warn(`[PixiRenderer] 貼圖載入失敗: ${path}`, e);
                }
            }
        },

        // 建立外圈裝飾底圖
        buildClockBackground() {
            this.bgLayer.removeChildren();

            // 背景鐘盤圖
            if (this.textures['clock_bg']) {
                const bgSprite = new PIXI.Sprite(this.textures['clock_bg']);
                bgSprite.anchor.set(0.5);
                bgSprite.x = this.CENTER_X;
                bgSprite.y = this.CENTER_Y;
                bgSprite.width = this.BASE_SIZE * 0.94;
                bgSprite.height = this.BASE_SIZE * 0.94;
                bgSprite.alpha = 0.88;
                this.bgLayer.addChild(bgSprite);
            }

            // 外圍科技感光環
            const ring = new PIXI.Graphics();
            ring.lineStyle(3, 0xe94560, 0.4);
            ring.drawCircle(this.CENTER_X, this.CENTER_Y, this.RADIUS + 38);
            ring.lineStyle(1.5, 0x48dbfb, 0.25);
            ring.drawCircle(this.CENTER_X, this.CENTER_Y, this.RADIUS - 38);
            this.bgLayer.addChild(ring);
        },

        // 自適應容器大小
        setupResponsiveResize(host) {
            const onResize = () => {
                const rect = host.getBoundingClientRect();
                const minDimension = Math.min(rect.width || this.BASE_SIZE, rect.height || this.BASE_SIZE);
                if (minDimension > 0 && this.app && this.app.view) {
                    const scale = minDimension / this.BASE_SIZE;
                    this.stageContainer.scale.set(scale);
                    this.app.renderer.resize(minDimension, minDimension);
                }
            };
            window.addEventListener('resize', onResize);
            // 延遲初次縮放確保佈局穩定
            setTimeout(onResize, 100);
        },

        // 計算 1~12 鐘點的座標
        getSpotCoord(position) {
            const angleDeg = position * 30 - 90;
            const angleRad = angleDeg * (Math.PI / 180);
            return {
                x: this.CENTER_X + this.RADIUS * Math.cos(angleRad),
                y: this.CENTER_Y + this.RADIUS * Math.sin(angleRad),
                angleRad
            };
        },

        // 主要渲染入口 (每次 gameState 更新時呼叫)
        render(gameState) {
            if (!this.isInitialized || !gameState) return;

            const humanId = (typeof window.getEffectiveHumanPlayerId === 'function')
                ? window.getEffectiveHumanPlayerId()
                : 'SM_1';

            const isWaitingHour = !!gameState.waitingHourChoice && gameState.waitingHourChoicePlayerId === humanId;
            const drawnNumbers = (isWaitingHour && gameState.currentDrawnHourCards)
                ? gameState.currentDrawnHourCards.map(c => c.number)
                : [];

            // 1. 繪製 12 個小時格
            this.renderClockSpots(gameState, drawnNumbers);

            // 2. 繪製中央小時卡
            this.renderDrawnCards(gameState, isWaitingHour);

            // 3. 更新/補間玩家與 NPC 棋子
            this.renderTokens(gameState, humanId);

            // 4. 連線特效（例如時之惡牽引線）
            this.renderSinLines(gameState);
        },

        // 渲染 12 個時鐘格位
        renderClockSpots(gameState, drawnNumbers) {
            this.spotsLayer.removeChildren();

            const spots = gameState.clockFace || [];
            spots.forEach(spot => {
                const coord = this.getSpotCoord(spot.position);
                const spotContainer = new PIXI.Container();
                spotContainer.x = coord.x;
                spotContainer.y = coord.y;

                const isTarget = drawnNumbers.includes(spot.position);

                // 格子底色圓形
                const circle = new PIXI.Graphics();
                if (isTarget) {
                    // 可選格：金色高亮發光
                    circle.lineStyle(3, 0xffd27f, 0.95);
                    circle.beginFill(0x1a2639, 0.9);
                    circle.drawCircle(0, 0, 28);
                    circle.endFill();

                    // 外圈呼吸光圈
                    circle.lineStyle(1.5, 0xe94560, 0.7);
                    circle.drawCircle(0, 0, 34);
                } else {
                    circle.lineStyle(2, 0xffffff, 0.25);
                    circle.beginFill(0x0f172a, 0.7);
                    circle.drawCircle(0, 0, 24);
                    circle.endFill();
                }
                spotContainer.addChild(circle);

                // 鐘點數字
                const numText = new PIXI.Text(String(spot.position), {
                    fontFamily: 'Segoe UI, Arial, sans-serif',
                    fontSize: isTarget ? 18 : 15,
                    fontWeight: 'bold',
                    fill: isTarget ? 0xffd27f : 0xf1f2f6,
                    align: 'center'
                });
                numText.anchor.set(0.5);
                numText.y = spot.cards && spot.cards.length > 0 ? -10 : 0;
                spotContainer.addChild(numText);

                // 若該格有堆疊的小時卡，顯示縮圖
                if (spot.cards && spot.cards.length > 0) {
                    const topCard = spot.cards[spot.cards.length - 1];
                    const count = spot.cards.length;

                    const stackText = new PIXI.Text(`🎴${count}`, {
                        fontFamily: 'Segoe UI, Arial, sans-serif',
                        fontSize: 11,
                        fill: topCard.isPrecious ? 0xffd27f : 0x48dbfb,
                        fontWeight: '600'
                    });
                    stackText.anchor.set(0.5);
                    stackText.y = 10;
                    spotContainer.addChild(stackText);
                }

                // 若為可選目標，設定互動點擊
                if (isTarget) {
                    spotContainer.eventMode = 'static';
                    spotContainer.cursor = 'pointer';
                    spotContainer.on('pointertap', () => {
                        const cardIndex = gameState.currentDrawnHourCards?.findIndex(c => c.number === spot.position);
                        if (cardIndex !== undefined && cardIndex !== -1) {
                            if (typeof window.handleHumanHourCardChoice === 'function') {
                                window.handleHumanHourCardChoice(gameState, cardIndex);
                            }
                        }
                    });
                }

                this.spotsLayer.addChild(spotContainer);
            });
        },

        // 渲染中央抽出的小時卡
        renderDrawnCards(gameState, isWaitingHour) {
            this.drawnCardsLayer.removeChildren();
            const cards = gameState.currentDrawnHourCards || [];
            if (cards.length === 0) return;

            const cardWidth = 50;
            const cardHeight = 72;
            const totalWidth = cards.length * (cardWidth + 12) - 12;
            const startX = this.CENTER_X - totalWidth / 2;
            const centerY = this.CENTER_Y;

            cards.forEach((card, idx) => {
                const cardContainer = new PIXI.Container();
                cardContainer.x = startX + idx * (cardWidth + 12);
                cardContainer.y = centerY - cardHeight / 2;

                // 卡牌底框
                const bg = new PIXI.Graphics();
                if (card.isPrecious) {
                    bg.lineStyle(2.5, 0xffd27f, 1);
                    bg.beginFill(0x2d1f04, 0.95);
                } else {
                    bg.lineStyle(1.5, 0xe94560, 0.8);
                    bg.beginFill(0x1a1a2e, 0.95);
                }
                bg.drawRoundedRect(0, 0, cardWidth, cardHeight, 6);
                bg.endFill();
                cardContainer.addChild(bg);

                // 卡牌號碼
                const numText = new PIXI.Text(String(card.number), {
                    fontFamily: 'Segoe UI, Arial, sans-serif',
                    fontSize: 20,
                    fontWeight: 'bold',
                    fill: card.isPrecious ? 0xffd27f : 0xffffff
                });
                numText.anchor.set(0.5);
                numText.x = cardWidth / 2;
                numText.y = 22;
                cardContainer.addChild(numText);

                // 年齡層
                if (card.ageGroup) {
                    const ageText = new PIXI.Text(card.ageGroup, {
                        fontFamily: 'Segoe UI, Arial, sans-serif',
                        fontSize: 10,
                        fill: 0xcccccc
                    });
                    ageText.anchor.set(0.5);
                    ageText.x = cardWidth / 2;
                    ageText.y = 42;
                    cardContainer.addChild(ageText);
                }

                // 珍貴星星
                if (card.isPrecious) {
                    const starText = new PIXI.Text('★', {
                        fontSize: 14,
                        fill: 0xffd27f
                    });
                    starText.anchor.set(0.5);
                    starText.x = cardWidth / 2;
                    starText.y = 58;
                    cardContainer.addChild(starText);
                }

                // 點擊選擇卡片
                if (isWaitingHour) {
                    cardContainer.eventMode = 'static';
                    cardContainer.cursor = 'pointer';
                    cardContainer.on('pointertap', () => {
                        if (typeof window.handleHumanHourCardChoice === 'function') {
                            window.handleHumanHourCardChoice(gameState, idx);
                        }
                    });
                }

                this.drawnCardsLayer.addChild(cardContainer);
            });
        },

        // 渲染棋子（支援平滑位移補間）
        renderTokens(gameState, humanId) {
            const players = gameState.players || [];
            const activePlayerIds = new Set();

            // 統計每個位置上的玩家數量以微調群集偏移
            const spotGroups = {};
            players.forEach(p => {
                if (p.isEjected || typeof p.currentClockPosition !== 'number') return;
                const pos = p.currentClockPosition;
                spotGroups[pos] = spotGroups[pos] || [];
                spotGroups[pos].push(p);
            });

            players.forEach(player => {
                if (player.isEjected || typeof player.currentClockPosition !== 'number') {
                    // 移除被逐出的玩家精靈
                    if (this.tokenSprites[player.id]) {
                        this.tokensLayer.removeChild(this.tokenSprites[player.id].container);
                        delete this.tokenSprites[player.id];
                    }
                    return;
                }

                activePlayerIds.add(player.id);
                const isHuman = (player.id === humanId);
                const pos = player.currentClockPosition;
                const coord = this.getSpotCoord(pos);

                // 計算多棋子同一格時的位移偏移量
                const group = spotGroups[pos] || [];
                const idxInGroup = group.indexOf(player);
                const countInGroup = group.length;
                let offsetX = 0;
                let offsetY = 28; // 預設飄在格子正下方

                if (countInGroup > 1) {
                    const span = (countInGroup - 1) * 20;
                    offsetX = -span / 2 + idxInGroup * 20;
                }

                const targetX = coord.x + offsetX;
                const targetY = coord.y + offsetY;

                // 若該玩家精靈尚不存在，初始化建立
                if (!this.tokenSprites[player.id]) {
                    const tokenContainer = new PIXI.Container();
                    tokenContainer.x = targetX;
                    tokenContainer.y = targetY;

                    // 取得貼圖 key
                    let texKey = isHuman ? 'p_demon' : 'demon';
                    if (player.type === '時之惡') texKey = isHuman ? 'p_sin' : 'sin';
                    else if (player.type === '受詛者') texKey = isHuman ? 'p_scz' : 'scz';
                    else if (player.roleCard === '時針') texKey = isHuman ? 'p_hour' : 'hour';
                    else if (player.roleCard === '分針') texKey = isHuman ? 'p_min' : 'min';
                    else if (player.roleCard === '秒針') texKey = isHuman ? 'p_sec' : 'sec';

                    const tex = this.textures[texKey] || PIXI.Texture.WHITE;
                    const sprite = new PIXI.Sprite(tex);
                    sprite.anchor.set(0.5);
                    sprite.width = 38;
                    sprite.height = 38;

                    // 玩家身份光圈 (受詛者/時針/分針/秒針等色彩光環)
                    const aura = new PIXI.Graphics();
                    const colorMap = window.UI_CONFIG?.ROLE_COLORS || {};
                    const roleColorHex = parseInt((colorMap[player.roleCard] || colorMap[player.type] || '#ffffff').replace('#', ''), 16);
                    aura.lineStyle(1.8, roleColorHex, 0.7);
                    aura.drawCircle(0, 0, 20);

                    tokenContainer.addChild(aura);
                    tokenContainer.addChild(sprite);

                    // 玩家名稱微縮標籤
                    const nameTag = new PIXI.Text(isHuman ? `★${player.name}` : player.name, {
                        fontSize: 9,
                        fill: isHuman ? 0xffd27f : 0xcccccc,
                        fontWeight: isHuman ? 'bold' : 'normal'
                    });
                    nameTag.anchor.set(0.5);
                    nameTag.y = 22;
                    tokenContainer.addChild(nameTag);

                    this.tokensLayer.addChild(tokenContainer);

                    this.tokenSprites[player.id] = {
                        container: tokenContainer,
                        targetX,
                        targetY,
                        texKey
                    };
                } else {
                    // 更新目標座標供補間動畫插值
                    const item = this.tokenSprites[player.id];
                    item.targetX = targetX;
                    item.targetY = targetY;
                }
            });

            // 清理不在場上的精靈
            for (const id in this.tokenSprites) {
                if (!activePlayerIds.has(id)) {
                    this.tokensLayer.removeChild(this.tokenSprites[id].container);
                    delete this.tokenSprites[id];
                }
            }
        },

        // 繪製時之惡牽引紅線
        renderSinLines(gameState) {
            this.linesLayer.clear();
            if (gameState.sinTargetingMode !== 'sin' || gameState.gameMode === '3P') return;

            const sinPlayer = gameState.players.find(p => p.type === '時之惡' && !p.isEjected);
            if (!sinPlayer || typeof sinPlayer.currentClockPosition !== 'number') return;

            const sinCoord = this.getSpotCoord(sinPlayer.currentClockPosition);

            // 尋找目標玩家 (受詛者/時魔)
            const targets = gameState.players.filter(p =>
                (p.type === '時魔' || p.type === '受詛者') &&
                !p.isEjected &&
                typeof p.currentClockPosition === 'number'
            );

            this.linesLayer.lineStyle(2, 0xff4757, 0.6);
            targets.forEach(t => {
                const targetCoord = this.getSpotCoord(t.currentClockPosition);
                this.linesLayer.moveTo(sinCoord.x, sinCoord.y);
                this.linesLayer.lineTo(targetCoord.x, targetCoord.y);
            });
        },

        // 每幀循環 (平滑補間插值)
        onTick(delta) {
            for (const id in this.tokenSprites) {
                const item = this.tokenSprites[id];
                // 簡易線性內插平滑移動 (Lerp)
                item.container.x += (item.targetX - item.container.x) * 0.18;
                item.container.y += (item.targetY - item.container.y) * 0.18;
            }
        }
    };

    window.PixiClockRenderer = PixiClockRenderer;
})();
