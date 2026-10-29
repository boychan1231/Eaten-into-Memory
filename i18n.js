// i18n.js - 輕量多國語言在地化引擎
(function () {
    const STORAGE_KEY = 'eaten_into_memory_lang';
    const DEFAULT_LANG = 'zh-TW';

    const i18n = {
        currentLang: DEFAULT_LANG,
        locales: {},

        init() {
            this.locales = window.I18N_LOCALES || {};
            // 讀取玩家儲存的偏好語系
            try {
                const saved = localStorage.getItem(STORAGE_KEY);
                if (saved && this.locales[saved]) {
                    this.currentLang = saved;
                }
            } catch (_) {}

            if (typeof document !== 'undefined' && typeof document.addEventListener === 'function') {
                if (document.readyState === 'loading') {
                    document.addEventListener('DOMContentLoaded', () => {
                        this.applyDOM();
                    });
                } else {
                    this.applyDOM();
                }
            }
        },

        setLanguage(lang) {
            if (!this.locales[lang]) {
                console.warn(`[i18n] 語系 ${lang} 尚未載入，維持當前語系 ${this.currentLang}`);
                return false;
            }
            this.currentLang = lang;
            try {
                localStorage.setItem(STORAGE_KEY, lang);
            } catch (_) {}

            this.applyDOM();
            if (typeof window.dispatchEvent === 'function' && typeof CustomEvent !== 'undefined') {
                window.dispatchEvent(new CustomEvent('languageChange', { detail: { lang } }));
            }
            if (window.globalGameState && typeof window.updateUI === 'function') {
                window.updateUI(window.globalGameState);
            }
            return true;
        },

        getLanguage() {
            return this.currentLang;
        },

        // 核心文字解析函式：支援點號路徑與 {param} 插值
        t(keyPath, params = {}) {
            if (!keyPath || typeof keyPath !== 'string') return '';
            const dict = this.locales[this.currentLang] || this.locales[DEFAULT_LANG] || {};
            const fallbackDict = this.locales[DEFAULT_LANG] || {};

            let val = this._resolveKey(dict, keyPath);
            if (val === undefined || val === null) {
                val = this._resolveKey(fallbackDict, keyPath);
            }
            if (val === undefined || val === null) {
                return keyPath; // 找不到時退回 keyPath
            }

            if (typeof val === 'string' && params && typeof params === 'object') {
                return val.replace(/\{(\w+)\}/g, (match, p1) => {
                    return params[p1] !== undefined ? params[p1] : match;
                });
            }
            return String(val);
        },

        _resolveKey(obj, path) {
            const parts = path.split('.');
            let curr = obj;
            for (let i = 0; i < parts.length; i++) {
                if (curr === null || typeof curr !== 'object') return undefined;
                curr = curr[parts[i]];
            }
            return curr;
        },

        // 自動掃描並翻譯 DOM 中的 [data-i18n] 標記
        applyDOM(root = document) {
            if (!root || typeof root.querySelectorAll !== 'function') return;
            const elements = root.querySelectorAll('[data-i18n]');
            elements.forEach(el => {
                const key = el.getAttribute('data-i18n');
                if (!key) return;
                const attr = el.getAttribute('data-i18n-attr');
                const translated = this.t(key);
                if (attr) {
                    el.setAttribute(attr, translated);
                } else {
                    el.textContent = translated;
                }
            });

            // 支援富文本 HTML 注入 [data-i18n-html]
            const htmlElements = root.querySelectorAll('[data-i18n-html]');
            htmlElements.forEach(el => {
                const key = el.getAttribute('data-i18n-html');
                if (!key) return;
                const translated = this.t(key);
                if (translated && translated !== key) {
                    el.innerHTML = translated;
                }
            });
        },

        // 角色與身分多語系轉換輔助
        getRoleName(roleOrType) {
            if (!roleOrType) return '';
            const normalized = String(roleOrType).trim().toLowerCase();
            const keyMap = {
                '時針': 'hour',
                '分針': 'min',
                '秒針': 'sec',
                '時魔': 'demon',
                '時之惡': 'sin',
                '受詛者': 'scz',
                '幼體時魔': 'young_demon',
                '時魔幼體': 'young_demon',
                'hour': 'hour',
                'min': 'min',
                'sec': 'sec',
                'demon': 'demon',
                'sin': 'sin',
                'scz': 'scz',
                'young_demon': 'young_demon'
            };
            const mappedKey = keyMap[roleOrType] || keyMap[normalized] || normalized;
            const fullKey = `roles.${mappedKey}`;
            const translated = this.t(fullKey);
            return (translated && translated !== fullKey) ? translated : roleOrType;
        },

        getAgeGroupName(ageGroup) {
            if (!ageGroup) return '';
            const keyMap = {
                '少年': 'youth',
                '青年': 'adult',
                '中年': 'middle',
                'youth': 'youth',
                'adult': 'adult',
                'middle': 'middle'
            };
            const mappedKey = keyMap[ageGroup] || ageGroup;
            return this.t(`age_groups.${mappedKey}`) || ageGroup;
        }
    };

    window.i18n = i18n;
    i18n.init();
})();
