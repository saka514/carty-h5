# 环境配置管理

本项目已将所有环境变量统一管理到 `config/environments.js` 文件中。

## 配置文件结构

### config/environments.js
这是主要的配置文件，包含三个环境的配置：
- `development`: 开发环境
- `production`: 生产环境  
- `github-pages`: GitHub Pages 部署环境

### public/env-config.js
这是一个自动生成的文件，**请勿手动编辑**。它会在构建过程中根据 `config/environments.js` 的配置自动生成。

## 配置项说明

### 基础配置
- `debug`: 调试模式开关
- `analytics`: Google Analytics 开关
- `errorReporting`: 错误报告开关
- `performanceMonitoring`: 性能监控开关

### Firebase 配置
- `firebase.enabled`: Firebase 服务开关
- `firebase.config`: Firebase 项目配置
  - `apiKey`: Firebase API 密钥
  - `authDomain`: Firebase 认证域名
  - `projectId`: Firebase 项目 ID
  - `storageBucket`: Firebase 存储桶
  - `messagingSenderId`: Firebase 消息发送者 ID
  - `appId`: Firebase 应用 ID
  - `measurementId`: Google Analytics 测量 ID

### 安全配置
- `security.strictMode`: 严格模式
- `security.csp`: 内容安全策略

### 性能配置
- `performance.bundleAnalysis`: 包分析
- `performance.sourceMap`: 源码映射

### 加密配置
- `decryption.encryptionKey`: 加密密钥
- `decryption.ALGORITHM`: 加密算法
- `decryption.KEY_LENGTH`: 密钥长度
- `decryption.IV_LENGTH`: 初始化向量长度
- `decryption.TAG_LENGTH`: 标签长度

## 如何修改配置

1. **修改环境配置**：直接编辑 `config/environments.js` 文件
2. **重新构建**：运行 `npm run build` 生成新的 `env-config.js`
3. **部署**：部署更新后的构建文件

## 环境变量支持

生产环境支持通过环境变量覆盖配置：

```bash
# Firebase 配置
FIREBASE_API_KEY=your_api_key
FIREBASE_AUTH_DOMAIN=your_auth_domain
FIREBASE_PROJECT_ID=your_project_id
FIREBASE_STORAGE_BUCKET=your_storage_bucket
FIREBASE_MESSAGING_SENDER_ID=your_sender_id
FIREBASE_APP_ID=your_app_id
FIREBASE_MEASUREMENT_ID=your_measurement_id

# 加密配置
DECRYPTION_KEY=your_encryption_key

# GitHub Pages 配置
GITHUB_PAGES_URL=your_github_pages_url
CUSTOM_DOMAIN=your_custom_domain
PATH_PREFIX=your_path_prefix
```

## 构建流程

1. 构建脚本 (`build.js`) 从 `config/environments.js` 读取配置
2. 根据 `NODE_ENV` 和 `DEPLOY_TARGET` 选择对应环境配置
3. 生成 `dist/env-config.js` 文件
4. 在 HTML 中自动注入配置脚本

## 注意事项

- ⚠️ **不要直接编辑** `public/env-config.js` 或 `dist/env-config.js`
- ✅ **只修改** `config/environments.js` 文件
- 🔄 **修改后必须重新构建** 才能生效
- 🔒 **敏感信息** 建议使用环境变量而非硬编码