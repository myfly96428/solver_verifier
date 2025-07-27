// Vercel 适配的日志系统
class VercelLogger {
    constructor() {
        this.logs = [];
        this.maxLogs = 1000; // 内存中最多保存1000条日志
        this.isVercel = process.env.VERCEL || process.env.NODE_ENV === 'production';
    }

    formatTimestamp() {
        return new Date().toISOString();
    }

    // 记录 API 调用
    logAPICall(callId, role, model, input, output, duration, error = null) {
        const logEntry = {
            timestamp: this.formatTimestamp(),
            type: 'api',
            callId: callId,
            role: role,
            model: model,
            duration: duration,
            inputLength: input.length,
            outputLength: output ? output.length : 0,
            success: !error,
            error: error ? error.message : null,
            // 在生产环境中不保存完整的输入输出内容以节省内存
            input: this.isVercel ? input.substring(0, 200) + '...' : input,
            output: this.isVercel ? (output ? output.substring(0, 200) + '...' : '') : (output || '')
        };

        this.addLog(logEntry);

        // 控制台输出（Vercel 会捕获这些日志）
        console.log(`[API] ${logEntry.timestamp} | ${role}(${model}) | ${logEntry.success ? '✅' : '❌'} | ${duration}ms | In:${logEntry.inputLength} Out:${logEntry.outputLength}`);

        if (error) {
            console.error(`[API Error] ${error.message}`);
        }

        // 如果是 Vercel 环境，可以发送到外部日志服务
        if (this.isVercel) {
            this.sendToExternalLogger(logEntry);
        }
    }

    // 记录辩论流程
    logDebateFlow(event, data) {
        const logEntry = {
            timestamp: this.formatTimestamp(),
            type: 'debate-flow',
            event: event,
            data: data
        };

        this.addLog(logEntry);
        console.log(`[Flow] ${event}:`, data);

        if (this.isVercel) {
            this.sendToExternalLogger(logEntry);
        }
    }

    // 记录错误
    logError(error, context = '') {
        const logEntry = {
            timestamp: this.formatTimestamp(),
            type: 'error',
            error: error.message,
            stack: error.stack,
            context: context
        };

        this.addLog(logEntry);
        console.error(`[Error] ${logEntry.timestamp} | ${context} | ${error.message}`);

        if (this.isVercel) {
            this.sendToExternalLogger(logEntry);
        }
    }

    // 添加日志到内存
    addLog(logEntry) {
        this.logs.push(logEntry);
        
        // 保持日志数量在限制内
        if (this.logs.length > this.maxLogs) {
            this.logs = this.logs.slice(-this.maxLogs);
        }
    }

    // 获取日志统计
    getLogStats() {
        const apiLogs = this.logs.filter(log => log.type === 'api');
        
        const stats = {
            totalCalls: apiLogs.length,
            successCalls: apiLogs.filter(log => log.success).length,
            errorCalls: apiLogs.filter(log => !log.success).length,
            totalInputChars: apiLogs.reduce((sum, log) => sum + log.inputLength, 0),
            totalOutputChars: apiLogs.reduce((sum, log) => sum + log.outputLength, 0),
            cognitoCalls: apiLogs.filter(log => log.role === 'cognito').length,
            museCalls: apiLogs.filter(log => log.role === 'muse').length
        };

        return stats;
    }

    // 获取最近的日志
    getRecentLogs(type = 'all', count = 10) {
        let filteredLogs = this.logs;
        
        if (type !== 'all') {
            filteredLogs = this.logs.filter(log => log.type === type);
        }
        
        return filteredLogs.slice(-count).reverse();
    }

    // 搜索日志
    searchLogs(keyword, type = 'all') {
        let filteredLogs = this.logs;
        
        if (type !== 'all') {
            filteredLogs = this.logs.filter(log => log.type === type);
        }
        
        return filteredLogs.filter(log => {
            const searchText = JSON.stringify(log).toLowerCase();
            return searchText.includes(keyword.toLowerCase());
        });
    }

    // 发送到外部日志服务（可选）
    async sendToExternalLogger(logEntry) {
        // 这里可以集成外部日志服务，比如：
        // - Vercel Analytics
        // - LogRocket
        // - Sentry
        // - 自定义 webhook
        
        try {
            // 示例：发送到 webhook
            if (process.env.LOG_WEBHOOK_URL) {
                await fetch(process.env.LOG_WEBHOOK_URL, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify(logEntry)
                });
            }
        } catch (error) {
            // 静默处理外部日志服务的错误，不影响主要功能
            console.warn('External logger failed:', error.message);
        }
    }

    // 清理旧日志（在 Vercel 中主要是清理内存）
    cleanOldLogs() {
        const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
        const initialCount = this.logs.length;
        
        this.logs = this.logs.filter(log => 
            new Date(log.timestamp) > oneHourAgo
        );
        
        const cleaned = initialCount - this.logs.length;
        if (cleaned > 0) {
            console.log(`[Logger] Cleaned ${cleaned} old logs from memory`);
        }
    }

    // 导出日志（用于下载或发送）
    exportLogs(format = 'json') {
        if (format === 'json') {
            return JSON.stringify(this.logs, null, 2);
        } else if (format === 'csv') {
            const headers = ['timestamp', 'type', 'event', 'role', 'model', 'duration', 'success', 'error'];
            const csvRows = [headers.join(',')];
            
            this.logs.forEach(log => {
                const row = headers.map(header => {
                    const value = log[header] || '';
                    return typeof value === 'string' ? `"${value.replace(/"/g, '""')}"` : value;
                });
                csvRows.push(row.join(','));
            });
            
            return csvRows.join('\n');
        }
        
        return this.logs;
    }
}

module.exports = VercelLogger;