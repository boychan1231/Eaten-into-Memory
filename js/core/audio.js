// audio.js - 音效與背景音樂管理器

const AudioConfig = {
    BGM_PATH: 'SFX/BGM.mp3', 
    BGM_STORY_PATH: 'SFX/BGM_story.mp3',       
	BGM_STORY_YOUTH_DEFAULT: 'SFX/BGM_story.mp3',       
    BGM_STORY_YOUNG_DEFAULT: 'SFX/BGM_story.mp3',       
    BGM_STORY_MIDDLE_DEFAULT: 'SFX/BGM_story.mp3',     
    BGM_STORY_PRECIOUS: 'SFX/BGM_emotional.mp3',
	
    SFX_CLICK_PATH: 'SFX/sfx_click.wav', 		// 按鈕點擊聲
    SFX_CONFIRM_PATH: 'SFX/sfx_confirm.wav', 	// 確認/成功聲（e.g. 出牌確認）
	SFX_EVOLVE_PATH: 'SFX/sfx_chime.wav',  	 // 進化/升級音效（暫以鐘聲提供反饋）
    SFX_ABILITY_PATH: 'SFX/sfx_confirm.wav',  	 // 特殊能力發動音效（暫以確認音提供反饋）
    SFX_CHIME_PATH: 'SFX/sfx_chime.wav',    	 // 遊戲輪開始/鐘聲
    SFX_WIN_PATH: 'SFX/sfx_chime.wav',        	 // 勝利音效（暫以鐘聲提供反饋）
    SFX_LOSE_PATH: 'SFX/sfx_Lose.mp3'       	 // 失敗/被吞噬音效
};

// --- 新增 (Add)：精確到每張卡的 BGM 設定表 ---
// 你可以在這裡自由新增或修改！如果某張卡沒寫在這裡，就會播放上方的 Default 音樂
const StoryBgmMap = {
    '幼年': {
        4: 'SFX/BGM_emotional.mp3',  // 幼年 4 號專屬音樂
    },
    '少年': {
        4: 'SFX/BGM_emotional.mp3',  // 保留相容
    },
    '青年': {
        // 12: 'SFX/bgm_young_12.mp3'
    },
    '中年': {
        // 3: 'SFX/bgm_middle_3.mp3'
    },
    '死亡': {
        // 12: 'SFX/bgm_death_12.mp3'
    }
};

class AudioManager {
    constructor() {
        this.bgm = new Audio(AudioConfig.BGM_PATH);
        this.bgm.loop = true; // 設定 BGM 循環播放
        this.currentBgmType = 'main'; // --- 新增：紀錄目前正在播放哪一首 BGM ---
        this.sfxClick = new Audio(AudioConfig.SFX_CLICK_PATH);
        this.sfxConfirm = new Audio(AudioConfig.SFX_CONFIRM_PATH);
		this.sfxEvolve = new Audio(AudioConfig.SFX_EVOLVE_PATH);
        this.sfxAbility = new Audio(AudioConfig.SFX_ABILITY_PATH);
        this.sfxChime = new Audio(AudioConfig.SFX_CHIME_PATH);
        this.sfxWin = new Audio(AudioConfig.SFX_WIN_PATH);
        this.sfxLose = new Audio(AudioConfig.SFX_LOSE_PATH);
		
		this.bgmVolume = 0.5; // BGM 獨立音量
        this.sfxVolume = 0.5; // SFX 獨立音量
		
		this.isBGMMuted = false; // 背景音樂靜音狀態
        this.isSFXMuted = false; // 音效靜音狀態
        this._bgmFadeTimer = null; // BGM 淡入/淡出計時器
        this._fadeResolve = null; // BGM 淡入/淡出 Promise 解析函式
        this._bgmSwitchToken = 0; // BGM 切換序號（防止快速連點或反覆切換造成非同步競態）
        
        this.updateVolume();
    }

    // 清除進行中的 BGM 淡入/淡出計時器並喚醒等待中的 Promise
    _clearFadeTimer() {
        if (this._bgmFadeTimer) {
            clearInterval(this._bgmFadeTimer);
            this._bgmFadeTimer = null;
        }
        if (this._fadeResolve) {
            const resolve = this._fadeResolve;
            this._fadeResolve = null;
            resolve();
        }
    }
	
    // 更新所有音軌的音量
    updateVolume() {
        this._clearFadeTimer();
		const bgmVol = this.isBGMMuted ? 0 : this.bgmVolume;
        const sfxVol = this.isSFXMuted ? 0 : this.sfxVolume;

        this.bgm.volume = bgmVol;
        
        this.sfxClick.volume = sfxVol;
        this.sfxConfirm.volume = sfxVol;
        this.sfxEvolve.volume = sfxVol;
        this.sfxAbility.volume = sfxVol;
        this.sfxChime.volume = sfxVol;
        this.sfxWin.volume = sfxVol;
        this.sfxLose.volume = sfxVol;
    }

	setBGMVolume(value) {
        this.bgmVolume = Math.max(0, Math.min(1, value));
        this.updateVolume();
    }
	
	setSFXVolume(value) {
        this.sfxVolume = Math.max(0, Math.min(1, value));
        this.updateVolume();
    }

    setBGMMuted(muted) {
        this.isBGMMuted = muted;
        this.updateVolume();
        // 如果取消靜音且音樂暫停中，嘗試播放並平滑淡入 (因為這是使用者點擊觸發的，瀏覽器允許)
        if (!muted && this.bgm.paused) {
            this.playBGM(2400);
        }
    }

    // 設定音效靜音
    setSFXMuted(muted) {
        this.isSFXMuted = muted;
        this.updateVolume();
    }

    // 播放背景音樂並支援平滑淡入效果 (預設淡入 2800ms)
    playBGM(fadeInMs = 2800) {
        // 防止重複播放
        if (!this.bgm.paused) return;

        const targetVol = this.isBGMMuted ? 0 : this.bgmVolume;
        this._clearFadeTimer();

        if (fadeInMs > 0 && targetVol > 0) {
            this.bgm.volume = 0;
        } else {
            this.bgm.volume = targetVol;
        }

        this.bgm.play().then(() => {
            if (fadeInMs > 0 && !this.isBGMMuted && this.bgmVolume > 0) {
                this.fadeInBGM(fadeInMs);
            }
        }).catch(e => {
            console.warn("瀏覽器阻擋自動播放，等待使用者互動:", e);
        });
    }

    // BGM 音量由目前音量平滑淡入至設定音量 (預設淡入 2000ms)
    fadeInBGM(durationMs = 2000) {
        return new Promise((resolve) => {
            this._clearFadeTimer();
            if (this.isBGMMuted || this.bgmVolume <= 0 || this.bgm.paused) {
                if (this.isBGMMuted) this.bgm.volume = 0;
                resolve();
                return;
            }

            const startVol = Math.max(0, this.bgm.volume);
            const targetVol = this.bgmVolume;
            if (startVol >= targetVol) {
                this.bgm.volume = targetVol;
                resolve();
                return;
            }

            const stepMs = 30;
            const totalSteps = Math.max(1, Math.round(durationMs / stepMs));
            let currentStep = 0;

            this._fadeResolve = () => {
                if (!this.isBGMMuted && !this.bgm.paused) {
                    this.bgm.volume = targetVol;
                }
                resolve();
            };

            this._bgmFadeTimer = setInterval(() => {
                if (this.isBGMMuted || this.bgm.paused) {
                    this._clearFadeTimer();
                    if (this.isBGMMuted) this.bgm.volume = 0;
                    return;
                }
                currentStep++;
                const progress = Math.min(1, currentStep / totalSteps);
                // 平滑漸強曲線 (easeInOutQuad)
                const eased = progress < 0.5
                    ? 2 * progress * progress
                    : 1 - Math.pow(-2 * progress + 2, 2) / 2;
                this.bgm.volume = Math.max(0, Math.min(1, startVol + (targetVol - startVol) * eased));

                if (progress >= 1) {
                    this._clearFadeTimer();
                }
            }, stepMs);
        });
    }

    // BGM 音量由目前音量平滑淡出至 0 (預設淡出 800ms)
    fadeOutBGM(durationMs = 800) {
        return new Promise((resolve) => {
            this._clearFadeTimer();

            // 若目前已暫停、靜音或音量已為 0，直接完成
            if (this.bgm.paused || this.isBGMMuted || this.bgm.volume <= 0) {
                this.bgm.volume = 0;
                resolve();
                return;
            }

            const startVol = this.bgm.volume;
            const stepMs = 30;
            const totalSteps = Math.max(1, Math.round(durationMs / stepMs));
            let currentStep = 0;

            this._fadeResolve = () => {
                this.bgm.volume = 0;
                resolve();
            };

            this._bgmFadeTimer = setInterval(() => {
                if (this.isBGMMuted || this.bgm.paused) {
                    this._clearFadeTimer();
                    return;
                }
                currentStep++;
                const progress = Math.min(1, currentStep / totalSteps);
                // 平滑漸弱曲線 (easeInOutQuad)
                const eased = progress < 0.5
                    ? 2 * progress * progress
                    : 1 - Math.pow(-2 * progress + 2, 2) / 2;
                this.bgm.volume = Math.max(0, startVol * (1 - eased));

                if (progress >= 1) {
                    this._clearFadeTimer();
                }
            }, stepMs);
        });
    }

    stopBGM() {
        this._bgmSwitchToken++;
        this._clearFadeTimer();
        this.bgm.pause();
        this.bgm.currentTime = 0;
    }

    // 播放點擊音效
    playClick() {
        // 為了支援快速連點，重置播放時間
        if (this.sfxClick.paused || this.sfxClick.currentTime > 0) {
            this.sfxClick.currentTime = 0;
        }
        this.sfxClick.play().catch(() => {});
    }

    playConfirm() {
        this.sfxConfirm.currentTime = 0;
        this.sfxConfirm.play().catch(() => {});
    }
	
	// 播放通用音效的輔助函式
    _playSfx(audioObj) {
        if (!audioObj) return;
        // 如果音效還沒載入好，可能 readyState 不夠，加個 catch 防止報錯
        try {
            audioObj.currentTime = 0;
            audioObj.play().catch(e => console.warn("音效播放失敗(可能檔案損毀或格式不支援):", e));
        } catch (e) {
            console.warn("音效物件錯誤:", e);
        }
    }
	
	playEvolve() { this._playSfx(this.sfxEvolve); }
    playAbility() { this._playSfx(this.sfxAbility); }
    playChime() { this._playSfx(this.sfxChime); }
    playDamage() { this._playSfx(this.sfxClick); }
    
    playGameOver(isWin) {
        // 停止背景音樂，營造結算氛圍
        this.stopBGM();
        if (isWin) this._playSfx(this.sfxWin);
        else this._playSfx(this.sfxLose);
    }
	
	async switchBGM(type, card = null, fadeOutMs = 800, fadeInMs = 1800) {
        let targetSrc = AudioConfig.BGM_PATH;
        let newType = 'main';

        if (type === 'story') {
            newType = 'story';
            targetSrc = AudioConfig.BGM_STORY_PATH;

            if (card) {
                const age = card.ageGroup;
                const num = card.number;
                if (card.isPrecious && AudioConfig.BGM_STORY_PRECIOUS) {
                    targetSrc = AudioConfig.BGM_STORY_PRECIOUS;
                } else if (age && num && StoryBgmMap[age] && StoryBgmMap[age][num]) {
                    targetSrc = StoryBgmMap[age][num];
                }
            }
        }

        const token = ++this._bgmSwitchToken;
        const isCurrentSrc = Boolean(this.bgm.src && this.bgm.src.endsWith(targetSrc));

        // 如果曲目與類型完全相同
        if (this.currentBgmType === newType && isCurrentSrc) {
            // 若正在播放但音量未達目標（可能先前正在淡出），則平滑淡入恢復滿音量
            if (!this.bgm.paused && !this.isBGMMuted && this.bgm.volume < this.bgmVolume) {
                this.fadeInBGM(fadeInMs);
            }
            return;
        }

        // 記錄切換前是否正在播放
        const wasPlaying = !this.bgm.paused;

        // 若舊 BGM 正在播放且未靜音，先將舊 BGM 以淡出效果平滑淡出
        if (wasPlaying && !this.isBGMMuted && this.bgm.volume > 0 && fadeOutMs > 0) {
            await this.fadeOutBGM(fadeOutMs);
        }

        // 若淡出期間有新的切換觸發或主動停止播放，則終止本次後續載入
        if (this._bgmSwitchToken !== token) {
            return;
        }

        // 淡出完成後暫停舊曲目並更換音軌
        this._clearFadeTimer();
        this.bgm.pause();

        this.bgm.src = targetSrc;
        this.currentBgmType = newType;
        this.bgm.load(); // 載入新音檔

        // 如果原本音樂有在播放，且 BGM 沒有被靜音，就自動播放新曲目並平滑淡入
        if (wasPlaying && !this.isBGMMuted) {
            this.bgm.volume = 0;
            try {
                await this.bgm.play();
                if (this._bgmSwitchToken === token) {
                    await this.fadeInBGM(fadeInMs);
                }
            } catch (e) {
                console.warn("切換 BGM 播放失敗:", e);
            }
        }
    }
	
}

// ==========================================
// 語音管理器 (Voice Manager - 多國語音版核心骨架)
// ==========================================
class VoiceManager {
    constructor() {
        this.currentAudio = null;
        this.voiceVolume = 0.8;
        this.isVoiceMuted = false;
        this.basePath = 'audio/voices';
    }

    // 取得當前語系代碼（對應 i18n）
    getLanguage() {
        if (window.i18n && typeof window.i18n.getLanguage === 'function') {
            return window.i18n.getLanguage();
        }
        return 'zh-TW';
    }

    setVoiceVolume(val) {
        this.voiceVolume = Math.max(0, Math.min(1, val));
        if (this.currentAudio) {
            this.currentAudio.volume = this.isVoiceMuted ? 0 : this.voiceVolume;
        }
    }

    setVoiceMuted(muted) {
        this.isVoiceMuted = muted;
        if (this.currentAudio) {
            this.currentAudio.volume = muted ? 0 : this.voiceVolume;
        }
    }

    stopVoice() {
        if (this.currentAudio) {
            this.currentAudio.pause();
            this.currentAudio.currentTime = 0;
            this.currentAudio = null;
        }
    }

    /**
     * 播放角色或系統語音
     * @param {string} category 類別（roles, system, story, clash）
     * @param {string} voiceKey 語音識別碼（例如 'hour_ability', 'clash_start'）
     * @param {object} options 可選參數 { onEnd: function }
     */
    playVoice(category, voiceKey, options = {}) {
        if (this.isVoiceMuted) return;

        this.stopVoice();

        const lang = this.getLanguage();
        // 檔案命名約定：audio/voices/{lang}/{category}/{voiceKey}.mp3
        const src = `${this.basePath}/${lang}/${category}/${voiceKey}.mp3`;

        const audio = new Audio(src);
        audio.volume = this.voiceVolume;

        audio.onended = () => {
            this.currentAudio = null;
            if (typeof options.onEnd === 'function') options.onEnd();
        };

        audio.onerror = () => {
            // 若當前語系沒有該音檔，安全靜默忽略，不中斷遊戲
            this.currentAudio = null;
        };

        this.currentAudio = audio;
        audio.play().catch(() => {
            this.currentAudio = null;
        });
    }
}

// 建立全域實例
const gameAudio = new AudioManager();
const gameVoice = new VoiceManager();

// 掛載到 window 以便除錯或從其他檔案呼叫
window.gameAudio = gameAudio;
window.gameVoice = gameVoice;
