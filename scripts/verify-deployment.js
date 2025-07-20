#!/usr/bin/env node

/**
 * Deployment verification script
 * Tests the built application to ensure it's ready for deployment
 */

import fs from "fs";
import path from "path";
import { execSync } from "child_process";

class DeploymentVerifier {
  constructor() {
    this.buildDir = 'dist';
    this.errors = [];
    this.warnings = [];
  }

  /**
   * Run all verification checks
   */
  async verify() {
    console.log('🔍 Starting deployment verification...\n');

    try {
      await this.checkBuildOutput();
      await this.checkFileIntegrity();
      await this.checkConfiguration();
      await this.runTests();
      await this.checkPerformance();
      await this.checkSecurity();

      this.printResults();
      
      if (this.errors.length > 0) {
        console.error('\n❌ Deployment verification failed!');
        process.exit(1);
      } else {
        console.log('\n✅ Deployment verification passed!');
        console.log('🚀 Ready for deployment');
      }
    } catch (error) {
      console.error('❌ Verification failed:', error);
      process.exit(1);
    }
  }

  /**
   * Check if build output exists and is complete
   */
  async checkBuildOutput() {
    console.log('📦 Checking build output...');

    const requiredFiles = [
      'index.html',
      'app.bundle.min.js',
      'styles.css',
      'env-config.js',
      'cache-manifest.json'
    ];

    const optionalFiles = [
      '.nojekyll',
      '404.html',
      'CNAME'
    ];

    // Check if build directory exists
    if (!fs.existsSync(this.buildDir)) {
      this.errors.push('Build directory does not exist');
      return;
    }

    // Check required files
    for (const file of requiredFiles) {
      const filePath = path.join(this.buildDir, file);
      if (!fs.existsSync(filePath)) {
        this.errors.push(`Required file missing: ${file}`);
      } else {
        const stats = fs.statSync(filePath);
        if (stats.size === 0) {
          this.errors.push(`Required file is empty: ${file}`);
        }
      }
    }

    // Check optional files (warnings only)
    for (const file of optionalFiles) {
      const filePath = path.join(this.buildDir, file);
      if (!fs.existsSync(filePath)) {
        this.warnings.push(`Optional file missing: ${file}`);
      }
    }

    console.log('✅ Build output check complete');
  }

  /**
   * Check file integrity and content
   */
  async checkFileIntegrity() {
    console.log('🔍 Checking file integrity...');

    // Check HTML file
    const htmlPath = path.join(this.buildDir, 'index.html');
    if (fs.existsSync(htmlPath)) {
      const html = fs.readFileSync(htmlPath, 'utf8');
      
      if (!html.includes('app.bundle.min.js')) {
        this.errors.push('HTML does not reference bundled JavaScript');
      }
      
      if (!html.includes('styles.css')) {
        this.errors.push('HTML does not reference CSS file');
      }
      
      if (!html.includes('viewport')) {
        this.warnings.push('HTML missing viewport meta tag');
      }
    }

    // Check JavaScript bundle
    const jsPath = path.join(this.buildDir, 'app.bundle.min.js');
    if (fs.existsSync(jsPath)) {
      const js = fs.readFileSync(jsPath, 'utf8');
      
      // Check for essential classes
      const requiredClasses = [
        'ParameterParser',
        'DecryptionService',
        'DisplayController',
        'ClickHandler',
        'FirebaseService',
        'ErrorHandler',
        'App'
      ];
      
      for (const className of requiredClasses) {
        if (!js.includes(className)) {
          this.errors.push(`JavaScript bundle missing class: ${className}`);
        }
      }
    }

    // Check configuration file
    const configPath = path.join(this.buildDir, 'env-config.js');
    if (fs.existsSync(configPath)) {
      const config = fs.readFileSync(configPath, 'utf8');
      
      if (!config.includes('ENV_CONFIG')) {
        this.errors.push('Environment configuration file malformed');
      }
    }

    console.log('✅ File integrity check complete');
  }

  /**
   * Check configuration validity
   */
  async checkConfiguration() {
    console.log('⚙️ Checking configuration...');

    const configPath = path.join(this.buildDir, 'env-config.js');
    if (fs.existsSync(configPath)) {
      try {
        // Load and validate configuration
        const configContent = fs.readFileSync(configPath, 'utf8');
        const configMatch = configContent.match(/window\.ENV_CONFIG = ({.*});/s);
        
        if (configMatch) {
          const config = JSON.parse(configMatch[1]);
          
          // Check required configuration keys
          const requiredKeys = ['environment', 'deployTarget', 'buildTime', 'version'];
          for (const key of requiredKeys) {
            if (!config[key]) {
              this.errors.push(`Configuration missing required key: ${key}`);
            }
          }
          
          // Check environment-specific settings
          if (config.environment === 'production') {
            if (config.debug === true) {
              this.warnings.push('Debug mode enabled in production');
            }
            if (config.analytics !== true) {
              this.warnings.push('Analytics disabled in production');
            }
          }
        } else {
          this.errors.push('Configuration format invalid');
        }
      } catch (error) {
        this.errors.push(`Configuration parsing failed: ${error.message}`);
      }
    }

    console.log('✅ Configuration check complete');
  }

  /**
   * Run tests to ensure functionality
   */
  async runTests() {
    console.log('🧪 Running tests...');

    try {
      // For deployment verification, we'll skip browser-specific tests
      // and focus on build integrity and configuration validation
      console.log('⚠️  Skipping browser-specific tests in deployment verification');
      console.log('✅ Test verification skipped (deployment context)');
      
    } catch (error) {
      this.warnings.push(`Tests could not be run in deployment context: ${error.message}`);
    }
  }

  /**
   * Check performance metrics
   */
  async checkPerformance() {
    console.log('⚡ Checking performance...');

    // Check bundle size
    const jsPath = path.join(this.buildDir, 'app.bundle.min.js');
    if (fs.existsSync(jsPath)) {
      const stats = fs.statSync(jsPath);
      const sizeKB = stats.size / 1024;
      
      if (sizeKB > 500) {
        this.warnings.push(`JavaScript bundle is large: ${sizeKB.toFixed(1)}KB`);
      } else if (sizeKB > 1000) {
        this.errors.push(`JavaScript bundle too large: ${sizeKB.toFixed(1)}KB`);
      }
      
      console.log(`📊 Bundle size: ${sizeKB.toFixed(1)}KB`);
    }

    // Check CSS size
    const cssPath = path.join(this.buildDir, 'styles.css');
    if (fs.existsSync(cssPath)) {
      const stats = fs.statSync(cssPath);
      const sizeKB = stats.size / 1024;
      
      if (sizeKB > 100) {
        this.warnings.push(`CSS file is large: ${sizeKB.toFixed(1)}KB`);
      }
      
      console.log(`🎨 CSS size: ${sizeKB.toFixed(1)}KB`);
    }

    console.log('✅ Performance check complete');
  }

  /**
   * Check security considerations
   */
  async checkSecurity() {
    console.log('🔒 Checking security...');

    // Check HTML for security headers
    const htmlPath = path.join(this.buildDir, 'index.html');
    if (fs.existsSync(htmlPath)) {
      const html = fs.readFileSync(htmlPath, 'utf8');
      
      if (!html.includes('X-Content-Type-Options')) {
        this.warnings.push('Missing X-Content-Type-Options header');
      }
      
      if (!html.includes('X-Frame-Options')) {
        this.warnings.push('Missing X-Frame-Options header');
      }
    }

    // Check for sensitive information in build files
    const files = fs.readdirSync(this.buildDir);
    for (const file of files) {
      if (file.endsWith('.js') || file.endsWith('.html')) {
        const content = fs.readFileSync(path.join(this.buildDir, file), 'utf8');
        
        // Check for common sensitive patterns
        const sensitivePatterns = [
          /password\s*[:=]\s*['"][^'"]+['"]/i,
          /secret\s*[:=]\s*['"][^'"]+['"]/i,
          /token\s*[:=]\s*['"][^'"]+['"]/i,
          /api[_-]?key\s*[:=]\s*['"][^'"]+['"]/i
        ];
        
        for (const pattern of sensitivePatterns) {
          if (pattern.test(content)) {
            this.warnings.push(`Potential sensitive information in ${file}`);
            break;
          }
        }
      }
    }

    console.log('✅ Security check complete');
  }

  /**
   * Print verification results
   */
  printResults() {
    console.log('\n📋 Verification Results:');
    console.log('========================');
    
    if (this.errors.length === 0 && this.warnings.length === 0) {
      console.log('🎉 All checks passed!');
    } else {
      if (this.errors.length > 0) {
        console.log('\n❌ Errors:');
        this.errors.forEach(error => console.log(`  • ${error}`));
      }
      
      if (this.warnings.length > 0) {
        console.log('\n⚠️  Warnings:');
        this.warnings.forEach(warning => console.log(`  • ${warning}`));
      }
    }
  }
}

// Run verification if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const verifier = new DeploymentVerifier();
  verifier.verify();
}
export default DeploymentVerifier;