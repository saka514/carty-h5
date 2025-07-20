# Deployment Guide

This document provides comprehensive instructions for deploying the H5 Encrypted Display Page to GitHub Pages.

## Table of Contents

- [Prerequisites](#prerequisites)
- [GitHub Pages Setup](#github-pages-setup)
- [Automated Deployment](#automated-deployment)
- [Manual Deployment](#manual-deployment)
- [Environment Configuration](#environment-configuration)
- [Verification](#verification)
- [Troubleshooting](#troubleshooting)
- [Performance Optimization](#performance-optimization)

## Prerequisites

Before deploying, ensure you have:

1. **Node.js** (version 16 or higher)
2. **npm** (comes with Node.js)
3. **Git** repository hosted on GitHub
4. **GitHub Pages** enabled for your repository

### Required Dependencies

```bash
npm install
```

### Environment Variables

Set the following environment variables for production deployment:

```bash
# Optional: Custom domain for GitHub Pages
export CUSTOM_DOMAIN="your-domain.com"

# Optional: Path prefix for subdirectory deployment
export PATH_PREFIX="/your-repo-name"

# Firebase configuration (optional - defaults are provided)
export FIREBASE_API_KEY="your-api-key"
export FIREBASE_PROJECT_ID="your-project-id"
export FIREBASE_AUTH_DOMAIN="your-project.firebaseapp.com"
export FIREBASE_STORAGE_BUCKET="your-project.firebasestorage.app"
export FIREBASE_MESSAGING_SENDER_ID="your-sender-id"
export FIREBASE_APP_ID="your-app-id"
export FIREBASE_MEASUREMENT_ID="your-measurement-id"
```

### Firebase Configuration

Firebase configuration is managed through the environment configuration system:

**Configuration Location**: `config/environments.js`

The Firebase configuration is automatically applied based on the deployment target:
- **Development**: Firebase disabled by default
- **Production**: Uses environment variables or fallback defaults
- **GitHub Pages**: Uses pre-configured Firebase settings

**Current Firebase Configuration**:
```javascript
{
  apiKey: "AIzaSyBXsbQ3OFMgUQ_gkl6vuOBqj_l-2dGRGNQ",
  authDomain: "cartyx-2a8d7.firebaseapp.com",
  projectId: "cartyx-2a8d7",
  storageBucket: "cartyx-2a8d7.firebasestorage.app",
  messagingSenderId: "749812601413",
  appId: "1:749812601413:web:377f65252fdca57d93092c",
  measurementId: "G-RFH82JV18N"
}
```

**Testing Firebase Integration**:
- Visit `/test-firebase.html` after deployment
- Check browser console for initialization messages
- Test analytics and performance tracking buttons

## GitHub Pages Setup

### 1. Enable GitHub Pages

1. Go to your repository on GitHub
2. Navigate to **Settings** → **Pages**
3. Under **Source**, select **GitHub Actions**
4. Save the configuration

### 2. Repository Settings

Ensure your repository has the following settings:

- **Visibility**: Public (required for GitHub Pages on free accounts)
- **Actions**: Enabled
- **Pages**: Enabled with GitHub Actions as source

### 3. Branch Protection (Optional)

For production repositories, consider setting up branch protection rules:

1. Go to **Settings** → **Branches**
2. Add rule for `main` branch
3. Enable "Require status checks to pass before merging"
4. Select the deployment workflow as a required check

## Automated Deployment

The project uses GitHub Actions for automated deployment. The workflow is triggered on:

- **Push to main branch**: Deploys to production
- **Pull requests**: Runs tests and builds (no deployment)
- **Manual trigger**: Can be triggered manually from GitHub Actions tab

### Workflow Overview

```mermaid
graph TD
    A[Push to main] --> B[Run Tests]
    B --> C[Build for Production]
    C --> D[Verify Build]
    D --> E[Deploy to GitHub Pages]
    E --> F[Verify Deployment]
```

### Deployment Steps

1. **Test Phase**:
   - Install dependencies
   - Run unit tests
   - Run performance tests

2. **Build Phase**:
   - Build optimized production bundle
   - Generate environment configuration
   - Create deployment-specific files
   - Verify build integrity

3. **Deploy Phase**:
   - Upload build artifacts
   - Deploy to GitHub Pages
   - Verify deployment success

## Manual Deployment

For manual deployment or testing:

### Local Build and Test

```bash
# Build for GitHub Pages
npm run build:github-pages

# Verify build
npm run verify

# Analyze build
npm run build:analyze
```

### Deploy to GitHub Pages

```bash
# Build and deploy
npm run deploy:github-pages

# Or manually push dist folder to gh-pages branch
git subtree push --prefix dist origin gh-pages
```

## Environment Configuration

The application supports multiple deployment environments:

### Development

```bash
NODE_ENV=development npm run build:dev
```

Features:
- Debug mode enabled
- Source maps included
- Analytics disabled
- Detailed error messages

### Production (GitHub Pages)

```bash
NODE_ENV=production DEPLOY_TARGET=github-pages npm run build:github-pages
```

Features:
- Optimized and minified code
- Analytics enabled
- Error reporting enabled
- Security headers configured

### Configuration Files

- `config/environments.js`: Environment-specific settings
- `dist/env-config.js`: Runtime configuration (generated during build)

## Verification

### Automated Verification

The deployment process includes automated verification:

```bash
npm run verify
```

Checks performed:
- ✅ Build output completeness
- ✅ File integrity
- ✅ Configuration validity
- ✅ Test execution
- ✅ Performance metrics
- ✅ Security considerations

### Manual Verification

After deployment, verify the following:

1. **Accessibility**: Visit your GitHub Pages URL
2. **Functionality**: Test with sample encrypted parameters
3. **Performance**: Check loading times and responsiveness
4. **Analytics**: Verify Firebase integration (if enabled)
5. **Cross-browser**: Test on different browsers and devices

### Health Check URLs

- **Main page**: `https://zweite.github.io/seeme/`
- **Test page**: `https://zweite.github.io/seeme/test-auto-click.html`
- **Firebase test**: `https://zweite.github.io/seeme/test-firebase.html`

## Troubleshooting

### Common Issues

#### 1. Build Failures

**Symptom**: GitHub Actions workflow fails during build

**Solutions**:
```bash
# Check build locally
npm run build:github-pages

# Check for syntax errors
npm test

# Verify dependencies
npm ci
```

#### 2. Missing Files After Deployment

**Symptom**: 404 errors for CSS/JS files

**Solutions**:
- Check build output: `ls -la dist/`
- Verify file references in HTML
- Check GitHub Pages settings

#### 3. Firebase Integration Issues

**Symptom**: Analytics not working

**Solutions**:
- Verify Firebase configuration in `config/environments.js`
- Check browser console for errors
- Test with `test-firebase.html`

#### 4. Custom Domain Issues

**Symptom**: Custom domain not working

**Solutions**:
- Verify CNAME file is generated: `cat dist/CNAME`
- Check DNS settings for your domain
- Ensure CUSTOM_DOMAIN environment variable is set

#### 5. Performance Issues

**Symptom**: Slow loading times

**Solutions**:
```bash
# Analyze bundle size
npm run build:analyze

# Run performance tests
npm run test:perf

# Check network tab in browser dev tools
```

### Debug Mode

Enable debug mode for troubleshooting:

```bash
NODE_ENV=development npm run build:dev
```

This enables:
- Detailed console logging
- Source maps for debugging
- Unminified code
- Additional error information

### Log Analysis

Check the following logs:

1. **GitHub Actions**: Repository → Actions tab
2. **Browser Console**: F12 → Console tab
3. **Network Tab**: F12 → Network tab
4. **Firebase Console**: Firebase project dashboard

### Getting Help

If you encounter issues:

1. Check this troubleshooting guide
2. Review GitHub Actions logs
3. Test locally with debug mode
4. Check browser console for errors
5. Verify all prerequisites are met

## Performance Optimization

### Build Optimization

The build process includes several optimizations:

- **JavaScript bundling and minification**
- **CSS optimization and compression**
- **HTML minification**
- **Asset optimization**
- **Cache manifest generation**

### Runtime Optimization

- **Lazy loading** for images
- **Service worker** for caching (if enabled)
- **Performance monitoring** with Firebase
- **Efficient DOM manipulation**

### Monitoring

Monitor performance using:

- **Firebase Performance**: Real user metrics
- **Browser DevTools**: Local performance analysis
- **GitHub Actions**: Build performance metrics
- **Lighthouse**: Automated audits

### Best Practices

1. **Keep bundle size small**: Monitor with `npm run build:analyze`
2. **Optimize images**: Use appropriate formats and sizes
3. **Enable caching**: Leverage browser and CDN caching
4. **Monitor performance**: Set up alerts for performance regressions
5. **Test regularly**: Run performance tests in CI/CD

## Security Considerations

### Content Security Policy

The application implements CSP headers for security:

```html
<meta http-equiv="Content-Security-Policy" content="default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline';">
```

### HTTPS Enforcement

GitHub Pages automatically enforces HTTPS. Ensure all external resources use HTTPS.

### Input Validation

All URL parameters and decrypted data are validated before use.

### Error Handling

Production builds limit error information exposure to prevent information leakage.

---

## Quick Reference

### Commands

```bash
# Development
npm run build:dev          # Development build
npm start                  # Local development server

# Production
npm run build:github-pages # Production build for GitHub Pages
npm run verify            # Verify build
npm run deploy:github-pages # Deploy to GitHub Pages

# Testing
npm test                  # Run all tests
npm run test:perf        # Performance tests
npm run benchmark        # Benchmark tests
```

### URLs

- **Repository**: `https://github.com/zweite/seeme`
- **GitHub Pages**: `https://zweite.github.io/seeme/`
- **Actions**: `https://github.com/zweite/seeme/actions`

### Support

For additional support:
- Check GitHub Issues
- Review GitHub Actions logs
- Test locally with debug mode
- Consult Firebase documentation for analytics issues