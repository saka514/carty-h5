#!/usr/bin/env node

/**
 * Build script for H5 Encrypted Display Page
 * Optimizes and minifies code for production deployment
 */

import fs from 'fs';
import path from 'path';
import { getConfig, validateConfig } from './config/environments.js';
const pkg = JSON.parse(fs.readFileSync(new URL('./package.json', import.meta.url), 'utf8'));

class BuildOptimizer {
  constructor() {
    this.sourceDir = 'public';
    this.buildDir = 'dist';
    this.environment = process.env.NODE_ENV || 'development';
    this.deployTarget = process.env.DEPLOY_TARGET || 'firebase';
    this.jsFiles = [
      'parameter-parser.js',
      'decryption-service.js',
      'display-controller.js',
      'click-handler.js',
      'firebase-service.js',
      'error-handler.js',
      'app.js'
    ];
  }

  /**
   * Run the complete build process
   */
  async build() {
    console.log(`🚀 Starting ${this.environment} build for ${this.deployTarget}...`);
    try {
      // Create build directory
      this.ensureBuildDir();
      // Copy and optimize HTML
      await this.optimizeHTML();
      // Bundle and minify JavaScript
      await this.bundleAndMinifyJS();
      // Optimize CSS
      await this.optimizeCSS();
      // Write environment config
      const envConfig = this.generateEnvironmentConfig();
      fs.writeFileSync(
        path.join(this.buildDir, 'env-config.js'),
        `window.ENV_CONFIG = ${JSON.stringify(envConfig, null, 2)};\n`
      );
      // Generate cache manifest
      await this.generateCacheManifest();
      // Copy additional assets (test html files)
      await this.copyAssets();
      // Generate deployment-specific files
      await this.generateDeploymentFiles();
      console.log('✅ Build complete!');
    } catch (error) {
      console.error('❌ Build failed:', error);
      process.exit(1);
    }
  }

  /**
   * Ensure build directory exists
   */
  ensureBuildDir() {
    if (!fs.existsSync(this.buildDir)) {
      fs.mkdirSync(this.buildDir, { recursive: true });
    }
  }

  /**
   * Optimize HTML file(s)
   */
  async optimizeHTML() {
    console.log('📄 Optimizing HTML...');
    const htmlFiles = ['index.html', 'test-app.html'];
    for (const htmlFile of htmlFiles) {
      const htmlPath = path.join(this.sourceDir, htmlFile);
      if (!fs.existsSync(htmlPath)) continue;
      let html = fs.readFileSync(htmlPath, 'utf8');
      // 支持 build:replace-with-bundle 注释块替换
      const bundleBlockRegex = /<!-- build:replace-with-bundle -->([\s\S]*?)<!-- \/build:replace-with-bundle -->/;
      if (bundleBlockRegex.test(html)) {
        html = html.replace(bundleBlockRegex, '    <script src="app.bundle.min.js"></script>');
      } else {
        // 兼容旧的 scriptTags 替换逻辑
        const scriptTags = this.jsFiles.map(file => 
          `    <script src="${file}"></script>`
        ).join('\n');
        html = html.replace(scriptTags, '    <script src="app.bundle.min.js"></script>');
      }
      // Ensure env-config.js is loaded before其他脚本（index.html 和 test-app.html 都需要）
      // 优化：如果 head 内已存在 <script src="env-config.js"></script>，则不再插入，避免被注释块替换逻辑覆盖
      const hasEnvConfigScript = /<script\s+src=["']env-config\.js["']><\/script>/i.test(html);
      if ((htmlFile === 'index.html' || htmlFile === 'test-app.html') && !hasEnvConfigScript) {
        html = html.replace(
          '<script src="app.bundle.min.js"></script>',
          '<script src="env-config.js"></script>\n    <script src="app.bundle.min.js"></script>'
        );
      }
      // Add performance optimizations
      html = html.replace('<head>', `<head>\n    <!-- Performance optimizations -->\n    <link rel="preconnect" href="https://fonts.googleapis.com">\n    <link rel="dns-prefetch" href="//firebase.googleapis.com">\n    <meta http-equiv="Cache-Control" content="public, max-age=31536000">\n    <meta name="theme-color" content="#000000">`);
      // Minify HTML (basic minification)
      html = this.minifyHTML(html);
      fs.writeFileSync(path.join(this.buildDir, htmlFile), html);
    }
    console.log('✅ HTML optimized');
  }

  /**
   * Bundle and minify JavaScript files
   */
  async bundleAndMinifyJS() {
    console.log('📦 Bundling and minifying JavaScript with esbuild...');
    const esbuild = await import('esbuild');
    await esbuild.build({
      entryPoints: [path.join(this.sourceDir, 'app.js')],
      bundle: true,
      minify: true,
      outfile: path.join(this.buildDir, 'app.bundle.min.js'),
      format: 'iife',
      target: ['es2017'],
      platform: 'browser',
      define: { 'process.env.NODE_ENV': JSON.stringify(this.environment) },
      banner: {
        js: `// Performance monitoring\n(function() {\n  const startTime = performance.now();\n  window.addEventListener('load', function() {\n    const loadTime = performance.now() - startTime;\n    console.log('📊 Page load time:', loadTime.toFixed(2) + 'ms');\n    if (window.firebaseService) {\n      window.firebaseService.trackPerformance('page_load_time', loadTime);\n    }\n  });\n})();\n`
      }
    });
    console.log('✅ JavaScript bundled and minified with esbuild');
  }

  /**
   * Optimize CSS
   */
  async optimizeCSS() {
    console.log('🎨 Optimizing CSS...');
    const cssPath = path.join(this.sourceDir, 'styles.css');
    if (fs.existsSync(cssPath)) {
      let css = fs.readFileSync(cssPath, 'utf8');
      css = `/* Optimized CSS for production */\n${css}\n\n/* Performance optimizations */\n* {\n  -webkit-font-smoothing: antialiased;\n  -moz-osx-font-smoothing: grayscale;\n}\n\nimg {\n  image-rendering: -webkit-optimize-contrast;\n  image-rendering: crisp-edges;\n}\n\n/* GPU acceleration for animations */\n.loading-spinner {\n  will-change: transform;\n  transform: translateZ(0);\n}\n\n#display-image {\n  will-change: transform;\n  transform: translateZ(0);\n}`;
      const minifiedCSS = this.minifyCSS(css);
      fs.writeFileSync(path.join(this.buildDir, 'styles.css'), minifiedCSS);
      const compressionRatio = ((css.length - minifiedCSS.length) / css.length * 100).toFixed(1);
      console.log(`✅ CSS optimized (${compressionRatio}% reduction)`);
    }
    // 新增：拷贝 browser-compatibility.css
    const compatCssPath = path.join(this.sourceDir, 'browser-compatibility.css');
    if (fs.existsSync(compatCssPath)) {
      fs.copyFileSync(compatCssPath, path.join(this.buildDir, 'browser-compatibility.css'));
      console.log('✅ browser-compatibility.css copied');
    }
  }

  /**
   * Copy other assets
   */
  async copyAssets() {
    console.log('📁 Copying assets...');
    // 这里不再复制 test-app.html，避免覆盖 optimizeHTML 已处理的文件
    console.log('✅ Assets copied');
  }

  /**
   * Generate cache manifest for better caching
   */
  async generateCacheManifest() {
    console.log('📋 Generating cache manifest...');
    
    const manifest = {
      version: Date.now(),
      files: [
        'index.html',
        'app.bundle.min.js',
        'styles.css'
      ],
      cacheStrategy: {
        html: 'no-cache',
        js: 'max-age=31536000', // 1 year
        css: 'max-age=31536000'  // 1 year
      }
    };
    
    fs.writeFileSync(
      path.join(this.buildDir, 'cache-manifest.json'), 
      JSON.stringify(manifest, null, 2)
    );
    
    console.log('✅ Cache manifest generated');
  }

  /**
   * Basic HTML minification
   */
  minifyHTML(html) {
    return html
      .replace(/\s+/g, ' ')
      .replace(/>\s+</g, '><')
      .replace(/\s+>/g, '>')
      .replace(/<!--[\s\S]*?-->/g, '')
      .trim();
  }

  /**
   * Basic JavaScript minification
   */
  minifyJS(js) {
    return js
      .replace(/\/\*[\s\S]*?\*\//g, '') // Remove block comments
      .replace(/\/\/.*$/gm, '') // Remove line comments
      .replace(/\s+/g, ' ') // Collapse whitespace
      .replace(/;\s*}/g, '}') // Remove semicolons before closing braces
      .replace(/\s*{\s*/g, '{') // Clean up braces
      .replace(/\s*}\s*/g, '}')
      .replace(/\s*,\s*/g, ',') // Clean up commas
      .replace(/\s*;\s*/g, ';') // Clean up semicolons
      .trim();
  }

  /**
   * Basic CSS minification
   */
  minifyCSS(css) {
    return css
      .replace(/\/\*[\s\S]*?\*\//g, '') // Remove comments
      .replace(/\s+/g, ' ') // Collapse whitespace
      .replace(/\s*{\s*/g, '{') // Clean up braces
      .replace(/\s*}\s*/g, '}')
      .replace(/\s*:\s*/g, ':') // Clean up colons
      .replace(/\s*;\s*/g, ';') // Clean up semicolons
      .replace(/\s*,\s*/g, ',') // Clean up commas
      .trim();
  }

  /**
   * Generate deployment-specific files
   */
  async generateDeploymentFiles() {
    console.log('🔧 Generating deployment-specific files...');
    
    if (this.deployTarget === 'github-pages') {
      // Generate .nojekyll file for GitHub Pages
      fs.writeFileSync(path.join(this.buildDir, '.nojekyll'), '');
      
      // Generate CNAME file if custom domain is configured
      const customDomain = process.env.CUSTOM_DOMAIN;
      if (customDomain) {
        fs.writeFileSync(path.join(this.buildDir, 'CNAME'), customDomain);
      }
      
      // Generate 404.html for GitHub Pages SPA routing
      const html404 = this.generate404Page();
      fs.writeFileSync(path.join(this.buildDir, '404.html'), html404);
    }
    
    // Generate environment configuration
    const envConfig = this.generateEnvironmentConfig();
    fs.writeFileSync(
      path.join(this.buildDir, 'env-config.js'), 
      `window.ENV_CONFIG = ${JSON.stringify(envConfig, null, 2)};`
    );
    
    console.log('✅ Deployment-specific files generated');
  }

  /**
   * Generate 404 page for GitHub Pages SPA routing
   */
  generate404Page() {
    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>H5 Encrypted Display Page</title>
    <script>
        // GitHub Pages SPA redirect
        const path = window.location.pathname.slice(1);
        if (path) {
            window.location.replace(
                window.location.origin + '/#/' + path + window.location.search
            );
        } else {
            window.location.replace(window.location.origin);
        }
    </script>
</head>
<body>
    <div style="text-align: center; padding: 50px; font-family: Arial, sans-serif;">
        <h1>Redirecting...</h1>
        <p>If you are not redirected automatically, <a href="/">click here</a>.</p>
    </div>
</body>
</html>`;
  }

  /**
   * Generate environment-specific configuration
   */
  generateEnvironmentConfig() {
    const envConfig = getConfig(this.environment, this.deployTarget);
    const config = {
      ...envConfig,
      environment: this.environment,
      deployTarget: this.deployTarget,
      buildTime: new Date().toISOString(),
      version: pkg.version
    };
    // Validate configuration
    try {
      validateConfig(config);
    } catch (error) {
      console.error('❌ Configuration validation failed:', error.message);
      throw error;
    }
    return config;
  }
}

// Run build if called directly
if (import.meta.url === `file://${process.argv[1]}` || import.meta.url === process.argv[1]) {
  const optimizer = new BuildOptimizer();
  optimizer.build();
}

// Remove: module.exports = BuildOptimizer;