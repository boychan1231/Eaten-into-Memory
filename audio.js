// audio.js - 音效與背景音樂管理器

const AudioConfig = {
    BGM_PATH: 'SFX/BGM.mp3', 
	BGM_STORY_YOUTH_DEFAULT: 'SFX/BGM_story.mp3',       
    BGM_STORY_YOUNG_DEFAULT: 'SFX/BGM_story.mp3',       
    BGM_STORY_MIDDLE_DEFAULT: 'SFX/BGM_story.mp3',     
    BGM_STORY_PRECIOUS: 'SFX/BGM_emotional.mp3',
	
    SFX_CLICK_PATH: 'SFX/sfx_click.wav', 		// 按鈕點擊聲
    SFX_CONFIRM_PATH: 'SFX/sfx_confirm.wav', 	// 確認/成功聲（e.g. 出牌確認）
	SFX_EVOLVE_PATH: 'SFX/sfx_evolve.wav',  	 // 進化/升級音效
    SFX_ABILITY_PATH: 'SFX/sfx_spell.mp3',  	 // 特殊能力發動音效
    SFX_CHIME_PATH: 'SFX/sfx_chime.mp3',    	 // 遊戲輪開始/鐘聲
    SFX_WIN_PATH: 'SFX/sfx_win.mp3',        	 // 勝利音效
    SFX_LOSE_PATH: 'SFX/sfx_lose.mp3'       	 // 失敗/被逐出音效
};

// --- 新增 (Add)：精確到每張卡的 BGM 設定表 ---
// 你可以在這裡自由新增或修改！如果某張卡沒寫在這裡，就會播放上方的 Default 音樂
const StoryBgmMap = {
    '少年': {
        4: 'BGM_emotional.mp3',  // 少年 4 號專屬音樂
    },
    '青年': {
        // 12: 'bgm_young_12.mp3'
    },
    '中年': {
        // 3: 'bgm_middle_3.mp3'
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
        
        this.updateVolume();
    }
	
    // 更新所有音軌的音量
    updateVolume() {
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
        // 如果取消靜音且音樂暫停中，嘗試播放 (因為這是使用者點擊觸發的，瀏覽器允許)
        if (!muted && this.bgm.paused) {
            this.playBGM();
        }
    }

    // 設定音效靜音
    setSFXMuted(muted) {
        this.isSFXMuted = muted;
        this.updateVolume();
    }

    // 播放背景音樂 (需由使用者操作觸發)
    playBGM() {
        // 防止重複播放
        if (this.bgm.paused) {
            this.bgm.play().catch(e => {
                console.warn("瀏覽器阻擋自動播放，等待使用者互動:", e);
            });
        }
    }

    stopBGM() {
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
    
    playGameOver(isWin) {
        // 停止背景音樂，營造結算氛圍
        this.stopBGM();
        if (isWin) this._playSfx(this.sfxWin);
        else this._playSfx(this.sfxLose);
    }
	
	switchBGM(type) {
        if (this.currentBgmType === type) return;  // 如果已經是這首音樂，就不用重新播放

        // 記錄切換前是否正在播放
        const wasPlaying = !this.bgm.paused;
        
        // 先暫停目前的音樂
        this.bgm.pause();

        // 根據傳入的 type 切換音檔來源
        if (type === 'story') {
            this.bgm.src = AudioConfig.BGM_STORY_PATH;
            this.currentBgmType = 'story';
        } else {
            // 預設切回主遊戲音樂
            this.bgm.src = AudioConfig.BGM_PATH;
            this.currentBgmType = 'main';
        }

        this.bgm.load(); // 載入新音檔

        // 如果原本音樂有在播放，且 BGM 沒有被靜音，就自動播放新曲目
        if (wasPlaying && !this.isBGMMuted) {
            this.bgm.play().catch(e => console.warn("切換 BGM 播放失敗:", e));
        }
    }
	
}

// 建立全域實例
const gameAudio = new AudioManager();

// 掛載到 window 以便除錯或從其他檔案呼叫
window.gameAudio = gameAudio;