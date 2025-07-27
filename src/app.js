const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const DebateManager = require('./debate-manager');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '../public')));

// 健康检查端点
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    port: PORT 
  });
});

// 日志API端点
app.get('/api/logs', (req, res) => {
  try {
    const APILogger = require('./logger');
    const logger = new APILogger();
    const action = req.query.action || 'overview';
    
    switch (action) {
      case 'stats':
        const stats = logger.getLogStats();
        res.json({ success: true, data: stats });
        break;
        
      case 'recent':
        const count = parseInt(req.query.count) || 10;
        const type = req.query.type || 'api';
        const recentLogs = getRecentLogs(logger, type, count);
        res.json({ success: true, data: recentLogs });
        break;
        
      case 'search':
        const keyword = req.query.keyword;
        if (!keyword) {
          return res.json({ success: false, error: '请提供搜索关键词' });
        }
        const searchResults = searchLogs(logger, keyword);
        res.json({ success: true, data: searchResults });
        break;
        
      case 'export':
        const format = req.query.format || 'json';
        exportLogs(res, logger, format);
        break;
        
      case 'clean':
        logger.cleanOldLogs();
        res.json({ success: true, message: '日志已清理' });
        break;
        
      default:
        // 默认返回概览信息
        const overview = {
          stats: logger.getLogStats(),
          recentLogs: getRecentLogs(logger, 'api', 5)
        };
        res.json({ success: true, data: overview });
    }
  } catch (error) {
    console.error('日志API错误:', error);
    res.json({ 
      success: false, 
      error: `日志API错误: ${error.message}`,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

// 存储活跃的辩论会话
const activeSessions = new Map();

io.on('connection', (socket) => {
  console.log('用户连接:', socket.id);

  socket.on('start-debate', async (data) => {
    const { question, cognitoModel, museModel, apiConfig } = data;
    
    try {
      const debateManager = new DebateManager(apiConfig, socket);
      activeSessions.set(socket.id, debateManager);
      
      await debateManager.startDebate(question, cognitoModel, museModel);
    } catch (error) {
      socket.emit('error', { message: error.message });
    }
  });

  socket.on('stop-debate', () => {
    const debateManager = activeSessions.get(socket.id);
    if (debateManager) {
      debateManager.stopDebate();
    }
  });

  socket.on('force-end-debate', async () => {
    const debateManager = activeSessions.get(socket.id);
    if (debateManager) {
      await debateManager.forceEndDebate();
    }
  });

  socket.on('reset-debate', () => {
    const debateManager = activeSessions.get(socket.id);
    if (debateManager) {
      debateManager.resetDebate();
    }
  });

  socket.on('resume-debate', async () => {
    const debateManager = activeSessions.get(socket.id);
    if (debateManager) {
      try {
        await debateManager.resumeDebate();
      } catch (error) {
        socket.emit('error', { message: error.message });
      }
    }
  });

  socket.on('disconnect', () => {
    console.log('用户断开连接:', socket.id);
    activeSessions.delete(socket.id);
  });
});

// 日志辅助函数
function getRecentLogs(logger, type = 'api', count = 10) {
  const fs = require('fs');
  const today = new Date().toISOString().split('T')[0];
  const logFile = path.join(logger.logDir, `${type}-${today}.log`);
  
  if (!fs.existsSync(logFile)) {
    return [];
  }

  const logContent = fs.readFileSync(logFile, 'utf8');
  const logs = [];
  
  if (type === 'api') {
    const separator = '================================================================================';
    const entries = logContent.split(separator).filter(entry => entry.trim()).slice(-count);
    
    entries.forEach(entry => {
      const lines = entry.split('\n').filter(line => line.trim());
      const log = { type: 'api' };
      
      lines.forEach(line => {
        if (line.startsWith('时间:')) log.timestamp = line.replace('时间: ', '');
        if (line.startsWith('角色:')) log.role = line.replace('角色: ', '');
        if (line.startsWith('模型:')) log.model = line.replace('模型: ', '');
        if (line.startsWith('持续时间:')) {
          const durationStr = line.replace('持续时间: ', '').replace('ms', '').trim();
          log.duration = parseInt(durationStr) || 0;
        }
        if (line.startsWith('成功:')) log.success = line.replace('成功: ', '').trim() === 'true';
        if (line.startsWith('输入长度:')) {
          const inputStr = line.replace('输入长度: ', '').replace(' 字符', '').trim();
          log.inputLength = parseInt(inputStr) || 0;
        }
        if (line.startsWith('输出长度:')) {
          const outputStr = line.replace('输出长度: ', '').replace(' 字符', '').trim();
          log.outputLength = parseInt(outputStr) || 0;
        }
        if (line.startsWith('错误:')) log.error = line.replace('错误: ', '');
      });
      
      if (log.timestamp) logs.push(log);
    });
  } else if (type === 'error') {
    const separator = '==================================================';
    const entries = logContent.split(separator).filter(entry => entry.trim()).slice(-count);
    
    entries.forEach(entry => {
      const lines = entry.split('\n').filter(line => line.trim());
      const log = { type: 'error' };
      
      lines.forEach(line => {
        if (line.includes('[错误]')) {
          const match = line.match(/\[错误\]\s+(.+)/);
          if (match) log.timestamp = match[1];
        }
        if (line.startsWith('上下文:')) log.context = line.replace('上下文: ', '');
        if (line.startsWith('错误信息:')) log.error = line.replace('错误信息: ', '');
      });
      
      if (log.timestamp) logs.push(log);
    });
  }
  
  return logs.reverse(); // 最新的在前面
}

function searchLogs(logger, keyword) {
  const fs = require('fs');
  const today = new Date().toISOString().split('T')[0];
  const results = [];
  
  // 搜索API日志
  const apiLogFile = path.join(logger.logDir, `api-${today}.log`);
  if (fs.existsSync(apiLogFile)) {
    const content = fs.readFileSync(apiLogFile, 'utf8');
    const lines = content.split('\n');
    
    lines.forEach((line, index) => {
      if (line.toLowerCase().includes(keyword.toLowerCase())) {
        results.push({
          type: 'api',
          line: index + 1,
          content: line,
          timestamp: new Date().toISOString()
        });
      }
    });
  }
  
  // 搜索错误日志
  const errorLogFile = path.join(logger.logDir, `error-${today}.log`);
  if (fs.existsSync(errorLogFile)) {
    const content = fs.readFileSync(errorLogFile, 'utf8');
    const lines = content.split('\n');
    
    lines.forEach((line, index) => {
      if (line.toLowerCase().includes(keyword.toLowerCase())) {
        results.push({
          type: 'error',
          line: index + 1,
          content: line,
          timestamp: new Date().toISOString()
        });
      }
    });
  }
  
  return results.slice(0, 50); // 限制结果数量
}

function exportLogs(res, logger, format) {
  const fs = require('fs');
  const today = new Date().toISOString().split('T')[0];
  
  if (format === 'json') {
    const data = {
      date: today,
      stats: logger.getLogStats(),
      apiLogs: getRecentLogs(logger, 'api', 100),
      errorLogs: getRecentLogs(logger, 'error', 100)
    };
    
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename=logs-${today}.json`);
    res.send(JSON.stringify(data, null, 2));
  } else if (format === 'csv') {
    const apiLogs = getRecentLogs(logger, 'api', 100);
    let csv = 'Timestamp,Role,Model,Duration,Success,InputLength,OutputLength,Error\n';
    
    apiLogs.forEach(log => {
      csv += `"${log.timestamp}","${log.role}","${log.model}",${log.duration},${log.success},${log.inputLength},${log.outputLength},"${log.error || ''}"\n`;
    });
    
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename=logs-${today}.csv`);
    res.send(csv);
  }
}

const PORT = process.env.PORT || 3003;
server.listen(PORT, () => {
  console.log(`服务器运行在端口 ${PORT}`);
});