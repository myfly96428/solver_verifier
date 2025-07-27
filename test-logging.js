// 测试日志记录系统
const APILogger = require('./src/logger');

console.log('=== 测试日志记录系统 ===\n');

// 创建日志实例
const logger = new APILogger();

// 测试API调用日志
console.log('1. 测试API调用日志记录...');
const testCallId = 'test-call-123';
const testInput = '这是一个测试输入，用于验证日志记录功能。包含系统提示词和用户输入。';
const testOutput = '这是一个测试输出，模拟AI的响应内容。包含详细的解决方案和分析。';

logger.logAPICall(
    testCallId,
    'cognito',
    'gpt-4',
    testInput,
    testOutput,
    2500, // 2.5秒
    null // 无错误
);

// 测试错误日志
console.log('2. 测试错误日志记录...');
const testError = new Error('测试错误：API调用超时');
logger.logAPICall(
    'test-error-456',
    'muse',
    'gpt-3.5-turbo',
    testInput,
    '',
    5000, // 5秒
    testError
);

logger.logError(testError, '测试上下文：模拟API调用失败');

// 测试辩论流程日志
console.log('3. 测试辩论流程日志记录...');
logger.logDebateFlow('DEBATE_START', {
    question: '如何优化网站性能？',
    cognitoModel: 'gpt-4',
    museModel: 'gpt-3.5-turbo',
    timestamp: new Date().toISOString()
});

logger.logDebateFlow('AI_CALL_START', {
    callId: testCallId,
    role: 'cognito',
    model: 'gpt-4',
    messageId: 'msg-123',
    inputLength: testInput.length
});

logger.logDebateFlow('AI_CALL_SUCCESS', {
    callId: testCallId,
    role: 'cognito',
    duration: 2500,
    outputLength: testOutput.length
});

logger.logDebateFlow('SOLUTION_INTEGRATION_START', {
    cycle: 1,
    oldVersion: '1.0',
    newVersion: '1.1',
    debateHistoryLength: 3
});

logger.logDebateFlow('SOLUTION_INTEGRATION_COMPLETE', {
    cycle: 1,
    version: '1.1',
    solutionLength: 1500
});

logger.logDebateFlow('DEBATE_COMPLETE', {
    finalSolutionVersion: '1.3',
    totalCycles: 2,
    totalRounds: 6,
    timestamp: new Date().toISOString()
});

// 测试日志统计
console.log('4. 测试日志统计功能...');
const stats = logger.getLogStats();
console.log('今日统计:', stats);

console.log('\n=== 日志记录测试完成 ===');
console.log('请检查 logs/ 目录下的日志文件：');
console.log('- api-[日期].log - API调用详细日志');
console.log('- debate-flow-[日期].log - 辩论流程日志');
console.log('- error-[日期].log - 错误日志');

console.log('\n使用日志查看工具查看结果：');
console.log('node log-viewer.js all');