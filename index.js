const config = require('config');
const addon = require('./server.js');
const logger = require('./common/logger');
const os = require('os');
const https = require('https');
const http = require('http');
const fs = require('fs');

const PORT = config.get('port');
const HOSTNAME_CONFIG = config.get('hostname');

// Log environment variables and configuration on startup
logger.info('🔧 ============ ENVIRONMENT & CONFIGURATION ============');
logger.info(`📌 NODE_ENV: ${process.env.NODE_ENV || 'not set (using default)'}`);
logger.info(`📌 PORT (env): ${process.env.PORT || 'not set'} → Resolved: ${PORT}`);
logger.info(`📌 HOSTNAME: ${HOSTNAME_CONFIG}`);
logger.info(`📌 IS_PRODUCTION: ${config.get('isProduction')}`);
logger.info('');
logger.info('🌐 Torrentio Configuration:');
logger.info(`   TORRENTIO_BASE_URL (env): ${process.env.TORRENTIO_BASE_URL || 'not set'}`);
logger.info(`   → Resolved: ${config.get('torrentio.baseUrl')}`);
logger.info(`   Timeout: ${config.get('torrentio.timeout')}ms`);
logger.info('');
logger.info('📡 TorrServer Configuration:');
logger.info(`   TORRSERVER_URL (env): ${process.env.TORRSERVER_URL || 'not set'}`);
logger.info(`   → Resolved: ${config.get('torrserver.baseUrl')}`);
logger.info(`   TORRSERVER_ENABLED (env): ${process.env.TORRSERVER_ENABLED || 'not set'}`);
logger.info(`   → Resolved: ${config.get('torrserver.enabled')}`);
logger.info(`   TORRSERVER_PRELOAD (env): ${process.env.TORRSERVER_PRELOAD || 'not set'}`);
logger.info(`   → Resolved: ${config.get('torrserver.preload')}`);
logger.info('🔧 ======================================================');
logger.info('');

// Function to get the primary network IP address
const getNetworkIP = () => {
  const interfaces = os.networkInterfaces();
  
  // Priority order: Ethernet, WiFi, then others
  const priorityNames = ['Ethernet', 'Wi-Fi', 'WiFi', 'eth0', 'wlan0'];
  
  // First try priority interfaces
  for (const name of priorityNames) {
    const iface = interfaces[name];
    if (iface) {
      const ipv4 = iface.find(addr => addr.family === 'IPv4' && !addr.internal);
      if (ipv4) {
        return ipv4.address;
      }
    }
  }
  
  // Fallback: find any non-internal IPv4 address
  for (const name of Object.keys(interfaces)) {
    const iface = interfaces[name];
    const ipv4 = iface.find(addr => addr.family === 'IPv4' && !addr.internal);
    if (ipv4) {
      return ipv4.address;
    }
  }
  
  return '127.0.0.1'; // Ultimate fallback
};

// Determine hostname
const NETWORK_IP = getNetworkIP();
const HOSTNAME = HOSTNAME_CONFIG === 'auto' ? `https://${NETWORK_IP}` : HOSTNAME_CONFIG;

// Check if running in production
const isProduction = config.get('isProduction');

if (isProduction) {
  // Production: Use HTTP (SSL termination handled by platform)
  http.createServer(addon).listen(PORT, '0.0.0.0', function () {
    logger.debug(`Is production: ${isProduction}`);
    logger.info(`🌐 Network IP detected: ${NETWORK_IP}`);
    logger.info(`🌐 HTTP Server started`);
    logger.info(`🚀 Add-on Repository URL: ${HOSTNAME}/manifest.json`);
    logger.info(`📱 Production server running at: ${HOSTNAME}`);
  });
} else {
  // Development: Use HTTPS with local certificates
  const httpsOptions = {
    key: fs.readFileSync('./192.168.1.89+2-key.pem'),
    cert: fs.readFileSync('./192.168.1.89+2.pem')
  };

  https.createServer(httpsOptions, addon).listen(PORT, '0.0.0.0', function () {
    logger.debug(`Is production: ${isProduction}`);
    logger.info(`🌐 Network IP detected: ${NETWORK_IP}`);
    logger.info(`🔒 HTTPS Server started`);
    logger.info(`🚀 Add-on Repository URL: ${HOSTNAME}:${PORT}/manifest.json`);
    logger.info(`📱 Accessible from network devices at: ${HOSTNAME}:${PORT}`);
  });
}
