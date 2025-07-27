const fs = require('fs');
const path = require('path');

class APILogger {
    constructor() {
        this.logDir = path.join(__dirname, '../logs');
        this.ensureLogDirectory();
    }

    ensureLogDirectory() {
        if (!fs.existsSync(this.logDir)) {
            fs.mkdirSync(this.logDir, { recursive: true });
        }
    }

    formatTimestamp() {
        return new Date().toISOString();
    }

    getLogFileName(type = 'api') {
        const date = new Date().toISOString().split('T')[0];
        return path.join(this.logDir, `${type}-${date}.log`);
    }

    // 记录 API 调用
    logAPICall(callId, role, model, input, output, duration, error = null) {
        const logEntry = {
            timestamp: this.formatTimestamp(),
            callId: callId,
            role: role,
            model: model,
            duration: duration,
            inputLength: input.length,
            outputLength: output ? output.length : 0,
            success: !error,
            error: error ? error.message : null,
            input: input,
            output: output || '',
            separator: '================================================================================'
        };

        const logText = `
${logEntry.separator}
时间: ${logEntry.timestamp}
调用ID: ${logEntry.callId}
角色: ${logEntry.role}
模型: ${logEntry.model}
持续时间: ${logEntry.duration}ms
成功: ${logEntry.success}
${error ? `错误: ${logEntry.error}` : ''}

输入长度: ${logEntry.inputLength} 字符
输入内容:
${logEntry.input}

输出长度: ${logEntry.outputLength} 字符
输出内容:
${logEntry.output}
${logEntry.separator}

`;

        // 写入日志文件
        const logFile = this.getLogFileName('api');
        fs.appendFileSync(logFile, logText, 'utf8');

        // 同时输出到控制台（简化版）
        console.log(`[API日志] ${logEntry.timestamp} | ${role}(${model}) | ${logEntry.success ? '成功' : '失败'} | ${duration}ms | 输入:${logEntry.inputLength}字符 输出:${logEntry.outputLength}字符`);

        if (error) {
            console.error(`[API错误] ${error.message}`);
        }
    }

    // 记录辩论流程
    logDebateFlow(event, data) {
        const logEntry = {
            timestamp: this.formatTimestamp(),
            event: event,
            data: JSON.stringify(data, null, 2)
        };

        const logText = `[${logEntry.timestamp}] ${event}: ${logEntry.data}\n`;

        const logFile = this.getLogFileName('debate-flow');
        fs.appendFileSync(logFile, logText, 'utf8');

        console.log(`[辩论流程] ${event}:`, data);
    }

    // 记录错误
    logError(error, context = '') {
        const logEntry = {
            timestamp: this.formatTimestamp(),
            error: error.message,
            stack: error.stack,
            context: context
        };

        const logText = `
[错误] ${logEntry.timestamp}
上下文: ${logEntry.context}
错误信息: ${logEntry.error}
堆栈跟踪:
${logEntry.stack}
==================================================

`;

        const logFile = this.getLogFileName('error');
        fs.appendFileSync(logFile, logText, 'utf8');

        console.error(`[错误日志] ${logEntry.timestamp} | ${logEntry.context} | ${logEntry.error}`);
    }

    // 获取日志统计
    getLogStats() {
        const today = new Date().toISOString().split('T')[0];
        const apiLogFile = path.join(this.logDir, `api-${today}.log`);

        if (!fs.existsSync(apiLogFile)) {
            return {
                totalCalls: 0,
                successCalls: 0,
                errorCalls: 0,
                totalInputChars: 0,
                totalOutputChars: 0
            };
        }

        const logContent = fs.readFileSync(apiLogFile, 'utf8');
        const separator = '================================================================================';
        const calls = logContent.split(separator).filter(entry => entry.trim());

        let stats = {
            totalCalls: calls.length,
            successCalls: 0,
            errorCalls: 0,
            totalInputChars: 0,
            totalOutputChars: 0,
            cognitoCalls: 0,
            museCalls: 0
        };

        calls.forEach(call => {
            if (call.includes('成功: true')) stats.successCalls++;
            if (call.includes('成功: false')) stats.errorCalls++;
            if (call.includes('角色: cognito')) stats.cognitoCalls++;
            if (call.includes('角色: muse')) stats.museCalls++;

            try {
                const inputMatch = call.match(/输入长度:\s*(\d+)/);
                const outputMatch = call.match(/输出长度:\s*(\d+)/);

                if (inputMatch && inputMatch[1]) stats.totalInputChars += parseInt(inputMatch[1]);
                if (outputMatch && outputMatch[1]) stats.totalOutputChars += parseInt(outputMatch[1]);
            } catch (error) {
                console.error('正则表达式匹配错误:', error.message);
            }
        });

        return stats;
    }

    // 清理旧日志（保留最近7天）
    cleanOldLogs() {
        const files = fs.readdirSync(this.logDir);
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - 7);

        files.forEach(file => {
            const filePath = path.join(this.logDir, file);
            const stats = fs.statSync(filePath);

            if (stats.mtime < cutoffDate) {
                fs.unlinkSync(filePath);
                console.log(`[日志清理] 删除旧日志文件: ${file}`);
            }
        });
    }
}

module.exports = APILogger;