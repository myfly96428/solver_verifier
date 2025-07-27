// Vercel API 端点：获取日志信息

// 简化的日志类，直接在这里定义以避免模块导入问题
class SimpleLogger {
    constructor() {
        this.logs = [];
        this.maxLogs = 1000;
    }

    addLog(logEntry) {
        this.logs.push(logEntry);
        if (this.logs.length > this.maxLogs) {
            this.logs = this.logs.slice(-this.maxLogs);
        }
    }

    getLogStats() {
        const apiLogs = this.logs.filter(log => log.type === 'api');
        return {
            totalCalls: apiLogs.length,
            successCalls: apiLogs.filter(log => log.success).length,
            errorCalls: apiLogs.filter(log => !log.success).length,
            totalInputChars: apiLogs.reduce((sum, log) => sum + (log.inputLength || 0), 0),
            totalOutputChars: apiLogs.reduce((sum, log) => sum + (log.outputLength || 0), 0),
            cognitoCalls: apiLogs.filter(log => log.role === 'cognito').length,
            museCalls: apiLogs.filter(log => log.role === 'muse').length
        };
    }

    getRecentLogs(type = 'all', count = 10) {
        let filteredLogs = this.logs;
        if (type !== 'all') {
            filteredLogs = this.logs.filter(log => log.type === type);
        }
        return filteredLogs.slice(-count).reverse();
    }

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

    cleanOldLogs() {
        const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
        const initialCount = this.logs.length;
        
        this.logs = this.logs.filter(log => 
            new Date(log.timestamp) > oneHourAgo
        );
        
        const cleaned = initialCount - this.logs.length;
        return cleaned;
    }
}

// 全局日志实例
let globalLogger = null;

function getLogger() {
    if (!globalLogger) {
        globalLogger = new SimpleLogger();
    }
    return globalLogger;
}

module.exports = function handler(req, res) {
    // 设置 CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }

    const logger = getLogger();
    const { action, type, count, keyword, format } = req.query;

    try {
        switch (action) {
            case 'stats':
                const stats = logger.getLogStats();
                res.status(200).json({
                    success: true,
                    data: stats
                });
                break;

            case 'recent':
                const recentLogs = logger.getRecentLogs(type || 'all', parseInt(count) || 10);
                res.status(200).json({
                    success: true,
                    data: recentLogs
                });
                break;

            case 'search':
                if (!keyword) {
                    res.status(400).json({
                        success: false,
                        error: 'Keyword is required for search'
                    });
                    return;
                }
                const searchResults = logger.searchLogs(keyword, type || 'all');
                res.status(200).json({
                    success: true,
                    data: searchResults
                });
                break;

            case 'export':
                const exportData = logger.exportLogs(format || 'json');
                const contentType = format === 'csv' ? 'text/csv' : 'application/json';
                const filename = `logs-${new Date().toISOString().split('T')[0]}.${format || 'json'}`;
                
                res.setHeader('Content-Type', contentType);
                res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
                res.status(200).send(exportData);
                break;

            case 'clean':
                logger.cleanOldLogs();
                res.status(200).json({
                    success: true,
                    message: 'Old logs cleaned from memory'
                });
                break;

            default:
                // 默认返回概览信息
                const overview = {
                    stats: logger.getLogStats(),
                    recentLogs: logger.getRecentLogs('all', 5),
                    errors: logger.getRecentLogs('error', 5)
                };
                res.status(200).json({
                    success: true,
                    data: overview
                });
        }
    } catch (error) {
        console.error('Logs API error:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
}

// 导出 logger 实例供其他模块使用
module.exports.getLogger = getLogger;