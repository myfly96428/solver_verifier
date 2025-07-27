# 🔒 安全配置指南

## API Key 安全管理

### ⚠️ 重要安全提示

1. **永远不要在代码中硬编码 API Key**
2. **不要将 API Key 提交到版本控制系统**
3. **定期轮换 API Key**
4. **使用环境变量管理敏感信息**

### 🏠 本地开发环境

1. **创建 .env 文件**：
   ```bash
   cp .env.example .env
   ```

2. **填入你的 API Key**：
   ```env
   OPENAI_API_KEY=your_actual_api_key_here
   OPENAI_BASE_URL=https://api.openai.com/v1
   ```

3. **确保 .env 文件在 .gitignore 中**（已配置）

### 🌐 生产环境（Vercel）

#### 方法 1: 通过 Vercel Dashboard 设置

1. 访问 [Vercel Dashboard](https://vercel.com/dashboard)
2. 选择你的项目
3. 进入 Settings → Environment Variables
4. 添加以下变量：
   - `OPENAI_API_KEY`: 你的 API Key
   - `OPENAI_BASE_URL`: API 基础 URL

#### 方法 2: 通过 Vercel CLI 设置

```bash
# 添加生产环境变量
vercel env add OPENAI_API_KEY production

# 添加开发环境变量
vercel env add OPENAI_API_KEY development

# 查看环境变量
vercel env ls
```

### 🔐 前端安全措施

#### 当前实现的安全特性：

1. **本地存储**：API Key 仅在浏览器本地存储，不上传到服务器
2. **密码输入框**：API Key 输入框使用 `type="password"` 隐藏内容
3. **格式验证**：基本的 API Key 格式检查
4. **安全提示**：用户界面显示安全提醒

#### 代码示例：

```javascript
// API Key 验证
if (!apiKey.startsWith('sk-') && !apiKey.startsWith('gsk_')) {
    if (!confirm('API Key格式可能不正确，是否继续？')) {
        return;
    }
}

// 本地存储（自动保存配置）
localStorage.setItem('apiKey', apiKey);
```

### 🛡️ 最佳实践

#### 1. API Key 管理
- 使用专门的 API Key 管理服务
- 设置 API Key 的使用限制和配额
- 监控 API Key 的使用情况

#### 2. 网络安全
- 使用 HTTPS 传输
- 验证 API 端点的 SSL 证书
- 避免在不安全的网络环境下使用

#### 3. 访问控制
- 限制 API Key 的权限范围
- 使用 IP 白名单（如果支持）
- 设置合理的速率限制

### 🚨 安全事件响应

#### 如果 API Key 泄露：

1. **立即撤销**：在 API 提供商处立即撤销泄露的 Key
2. **生成新 Key**：创建新的 API Key
3. **更新配置**：在所有环境中更新新的 Key
4. **检查使用记录**：查看是否有异常使用
5. **加强监控**：增加对 API 使用的监控

### 📋 安全检查清单

- [ ] API Key 不在代码中硬编码
- [ ] .env 文件在 .gitignore 中
- [ ] 生产环境使用环境变量
- [ ] API Key 格式验证已实现
- [ ] 用户界面有安全提示
- [ ] 定期轮换 API Key
- [ ] 监控 API 使用情况
- [ ] 使用 HTTPS 传输

### 🔗 相关资源

- [OpenAI API 安全最佳实践](https://platform.openai.com/docs/guides/safety-best-practices)
- [Vercel 环境变量文档](https://vercel.com/docs/concepts/projects/environment-variables)
- [Node.js 安全最佳实践](https://nodejs.org/en/docs/guides/security/)

### 📞 报告安全问题

如果发现安全漏洞，请通过以下方式报告：
- 创建 GitHub Issue（标记为 Security）
- 发送邮件到项目维护者

---

**记住：安全是一个持续的过程，不是一次性的任务！**