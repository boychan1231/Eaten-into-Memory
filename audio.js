// audio.js - 音效與背景音樂管理器

const AudioConfig = {
    // 請將您的音樂檔案放入專案資料夾，並在此替換檔名
    BGM_PATH: 'BGM.mp3', // 建議找一段低沉的環境音 Loop
    SFX_CLICK_PATH: 'sfx_click.mp3', // 按鈕點擊聲
    SFX_CONFIRM_PATH: 'sfx_confirm.mp3' // 確認/成功聲
};

class AudioManager {
    constructor() {
        this.bgm = new Audio(AudioConfig.BGM_PATH);
        this.bgm.loop = true; // 設定 BGM 循環播放
        
        this.sfxClick = new Audio(AudioConfig.SFX_CLICK_PATH);
        this.sfxConfirm = new Audio(AudioConfig.SFX_CONFIRM_PATH);

        this.masterVolume = 0.5; // 預設音量 50%
        this.isMuted = false;
        
        this.updateVolume();
    }

    // 更新所有音軌的音量
    updateVolume() {
        const effectiveVolume = this.isMuted ? 0 : this.masterVolume;
        this.bgm.volume = effectiveVolume;
        this.sfxClick.volume = effectiveVolume;
        this.sfxConfirm.volume = effectiveVolume;
    }

    setVolume(value) {
        // value 介於 0.0 ~ 1.0
        this.masterVolume = Math.max(0, Math.min(1, value));
        this.updateVolume();
    }

    toggleMute() {
        this.isMuted = !this.isMuted;
        this.updateVolume();
        return this.isMuted;
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
}

// 建立全域實例
const gameAudio = new AudioManager();

// 掛載到 window 以便除錯或從其他檔案呼叫
window.gameAudio = gameAudio;