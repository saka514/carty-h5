#!/usr/bin/env node

/**
 * CI/CD verification script
 * Runs comprehensive tests including browser-specific functionality
 */

import { execSync } from "child_process";
import DeploymentVerifier from "./verify-deployment.js";

class CIVerifier extends DeploymentVerifier {
  constructor() {
    super();
    this.isCI = process.env.CI === 'true' || process.env.GITHUB_ACTIONS === 'true';
  }

  /**
   * Run tests appropriate for CI environment
   */
  async runTests() {
    console.log('🧪 Running CI tests...');

    if (!this.isCI) {
      console.log('⚠️  Not in CI environment, running basic tests only');
      return;
    }

    try {
      // Run unit tests with proper environment setup
      console.log('Running unit tests...');
      execSync('npm test', { 
        stdio: 'inherit',
        env: { 
          ...process.env, 
          NODE_ENV: 'test',
          VITEST_ENVIRONMENT: 'jsdom'
        }
      });
      console.log('✅ Unit tests passed');
      
    } catch (error) {
      // In CI, test failures should be treated as errors
      this.errors.push(`CI tests failed: ${error.message}`);
    }
  }

  /**
   * Additional CI-specific checks
   */
  async checkCIEnvironment() {
    console.log('🔧 Checking CI environment...');

    // Check for required environment variables
    const requiredEnvVars = ['NODE_ENV', 'DEPLOY_TARGET'];
    for (const envVar of requiredEnvVars) {
      if (!process.env[envVar]) {
        this.warnings.push(`Environment variable not set: ${envVar}`);
      }
    }

    // Check GitHub Actions specific variables
    if (this.isCI) {
      const githubVars = ['GITHUB_REPOSITORY', 'GITHUB_REF'];
      for (const envVar of githubVars) {
        if (!process.env[envVar]) {
          this.warnings.push(`GitHub Actions variable not set: ${envVar}`);
        }
      }
    }

    console.log('✅ CI environment check complete');
  }

  /**
   * Run CI verification
   */
  async verify() {
    console.log('🔍 Starting CI verification...\n');

    try {
      await this.checkBuildOutput();
      await this.checkFileIntegrity();
      await this.checkConfiguration();
      await this.checkCIEnvironment();
      await this.runTests();
      await this.checkPerformance();
      await this.checkSecurity();

      this.printResults();
      
      if (this.errors.length > 0) {
        console.error('\n❌ CI verification failed!');
        process.exit(1);
      } else {
        console.log('\n✅ CI verification passed!');
        console.log('🚀 Ready for deployment');
      }
    } catch (error) {
      console.error('❌ CI verification failed:', error);
      process.exit(1);
    }
  }
}

// Run CI verification if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const verifier = new CIVerifier();
  verifier.verify();
}

export default CIVerifier;