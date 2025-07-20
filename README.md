# Carty H5 项目

## 1. 项目基本描述
Carty H5 是一个基于 Firebase 的加密内容展示与交互平台，支持多环境部署，具备密钥加解密、前端安全控制、Firebase 实时数据同步等功能。

## 2. 项目架构
- 前端：原生 JS + HTML + CSS，无框架依赖，适配移动端
- 配置：`config/environments.js`（生产环境请用 `.gitignore` 忽略，示例见 `environments.example.js`）
- 构建：`build.js` 负责 HTML 优化与静态资源处理
- 部署：Firebase Hosting，支持多环境（development/production/github-pages）
- 测试：内置多种测试页面与脚本，覆盖主要功能

## 3. 如何快速启动
1. 克隆仓库：
   ```bash
   git clone <仓库地址>
   cd carty_h5
   ```
2. 安装依赖：
   ```bash
   npm install
   ```
3. 配置环境：
   - 复制 `config/environments.example.js` 为 `config/environments.js`，并填写对应密钥与配置。
4. 本地开发预览：
   ```bash
   npm run dev
   ```
5. 构建生产包：
   ```bash
   npm run build
   ```
6. 部署到 Firebase：
   ```bash
   npm run deploy
   ```

## 4. 如何开发
- 主要源码位于 `public/` 目录，支持直接修改 JS/CSS/HTML 文件。
- 修改配置时请勿提交真实密钥，仅提交 `environments.example.js`。
- 构建流程由 `build.js` 自动处理资源优化与注入。
- 测试用例与调试页面见 `public/` 下的 `test-*.html`。
- 详细部署与 CI/CD 流程见 `docs/DEPLOYMENT.md` 与 `.github/workflows/`。

如有问题请查阅 README 或联系维护者。