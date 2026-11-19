// logger.js - 可切換的全域 Logger
(function initLogger() {
    const config = window.UI_CONFIG || {};
    const logToConsoleEnabled = config.LOG_TO_CONSOLE ?? true;
    const logToUIEnabled = config.LOG_TO_UI ?? true;
    const pendingUiLogs = [];
    let uiSink = null;

    function safeStringify(value) {
        if (typeof value !== 'object' || value === null) return String(value);
        try {
            return JSON.stringify(value);
        } catch (error) {
            return `[Unserializable: ${error?.message || 'unknown error'}]`;
        }
    }

    function emitToConsole(args) {
        if (!logToConsoleEnabled) return;
        console.log(...args);
    }

    function emitToUI(args) {
        if (!logToUIEnabled) return;
        if (typeof uiSink === 'function') {
            uiSink(args);
            return;
        }
        pendingUiLogs.push(args);
    }

    function log(...args) {
        emitToConsole(args);
        emitToUI(args);
    }

    function logToConsole(...args) {
        emitToConsole(args);
    }

    function logToUI(...args) {
        emitToUI(args);
    }

    function setUiSink(sink) {
        uiSink = sink;
        if (typeof uiSink === 'function' && pendingUiLogs.length > 0) {
            const queued = pendingUiLogs.splice(0, pendingUiLogs.length);
            queued.forEach(args => uiSink(args));
        }
    }

    window.appLogger = {
        log,
        logToConsole,
        logToUI,
        setUiSink,
        safeStringify
    };
})();
