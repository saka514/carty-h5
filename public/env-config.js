window.ENV_CONFIG = {
  "debug": true,
  "analytics": false,
  "errorReporting": false,
  "performanceMonitoring": false,
  "firebase": {
    "enabled": false,
    "config": {
      // Development Firebase config (disabled for local testing)
    }
  },
  "security": {
    "strictMode": false,
    "csp": false
  },
  "performance": {
    "bundleAnalysis": true,
    "sourceMap": true
  },
  "decryption": {
    "encryptionKey": "default-encryption-key-32-chars!!",
    "ALGORITHM": "AES-GCM",
    "KEY_LENGTH": 256,
    "IV_LENGTH": 12,
    "TAG_LENGTH": 16
  },
  "environment": "development",
  "deployTarget": "local",
  "buildTime": new Date().toISOString(),
  "version": "1.0.0"
};