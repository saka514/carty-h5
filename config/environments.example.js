/**
 * Example environment-specific configuration for H5 Encrypted Display Page
 * 复制为 environments.js 并根据实际情况填写密钥和生产参数
 */

const environments = {
  development: {
    debug: true,
    analytics: {
      enabled: false,
      googleAnalytics: {
        trackingId: 'GA_TRACKING_ID_DEV' // Development GA tracking ID
      }
    },
    errorReporting: false,
    performanceMonitoring: false,
    firebase: {
      enabled: false,
      config: {
        // Development Firebase config (if needed)
      }
    },
    security: {
      strictMode: false,
      csp: false
    },
    performance: {
      bundleAnalysis: true,
      sourceMap: true
    },
    decryption: {
      encryptionKey: 'your-dev-key-here',
      ALGORITHM: 'AES-GCM',
      KEY_LENGTH: 256,
      IV_LENGTH: 12,
      TAG_LENGTH: 16
    }
  },

  production: {
    debug: false,
    analytics: {
      enabled: true,
      googleAnalytics: {
        trackingId: process.env.GA_TRACKING_ID || 'G-XXXXXXXXXX' // Production GA tracking ID
      }
    },
    errorReporting: true,
    performanceMonitoring: true,
    firebase: {
      enabled: true,
      config: {
        // Production Firebase config - fallback to environment variables if available
        apiKey: process.env.FIREBASE_API_KEY || "your-prod-api-key",
        authDomain: process.env.FIREBASE_AUTH_DOMAIN || "your-prod-auth-domain",
        projectId: process.env.FIREBASE_PROJECT_ID || "your-prod-project-id",
        storageBucket: process.env.FIREBASE_STORAGE_BUCKET || "your-prod-storage-bucket",
        messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID || "your-prod-messaging-sender-id",
        appId: process.env.FIREBASE_APP_ID || "your-prod-app-id",
        measurementId: process.env.FIREBASE_MEASUREMENT_ID || "your-prod-measurement-id"
      }
    },
    security: {
      strictMode: true,
      csp: true
    },
    performance: {
      bundleAnalysis: false,
      sourceMap: false
    },
    decryption: {
      encryptionKey: process.env.DECRYPTION_KEY || 'your-prod-key-here',
      ALGORITHM: 'AES-GCM',
      KEY_LENGTH: 256,
      IV_LENGTH: 12,
      TAG_LENGTH: 16
    }
  },

  'github-pages': {
    debug: false,
    analytics: {
      enabled: true,
      googleAnalytics: {
        trackingId: 'G-QSZXBCRX8J' // GitHub Pages GA tracking ID
      }
    },
    errorReporting: true,
    performanceMonitoring: true,
    firebase: {
      enabled: true,
      config: {
        // GitHub Pages specific Firebase config
        apiKey: "your-ghp-api-key",
        authDomain: "your-ghp-auth-domain",
        projectId: "your-ghp-project-id",
        storageBucket: "your-ghp-storage-bucket",
        messagingSenderId: "your-ghp-messaging-sender-id",
        appId: "your-ghp-app-id",
        measurementId: "your-ghp-measurement-id"
      }
    },
    security: {
      strictMode: true,
      csp: true
    },
    performance: {
      bundleAnalysis: false,
      sourceMap: false
    },
    decryption: {
      encryptionKey: 'your-ghp-key-here',
      ALGORITHM: 'AES-GCM',
      KEY_LENGTH: 256,
      IV_LENGTH: 12,
      TAG_LENGTH: 16
    },
    deployment: {
      baseUrl: process.env.GITHUB_PAGES_URL || 'https://your-ghp-url',
      customDomain: process.env.CUSTOM_DOMAIN || null,
      pathPrefix: process.env.PATH_PREFIX || '/your-path-prefix'
    }
  }
};

// CommonJS -> ES Module
export { environments };