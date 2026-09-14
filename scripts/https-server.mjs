#!/usr/bin/env node
// HTTPS server with TLS support
import { createServer as createHttpServer } from 'node:http';
import { createServer as createHttpsServer } from 'node:https';
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

// TLS configuration
const TLS_CONFIG = {
  cert: process.env.TLS_CERT_PATH || join(process.cwd(), 'certs', 'cert.pem'),
  key: process.env.TLS_KEY_PATH || join(process.cwd(), 'certs', 'key.pem'),
  ca: process.env.TLS_CA_PATH || join(process.cwd(), 'certs', 'ca.pem')
};

// Create HTTP or HTTPS server
export function createSecureServer(handler, options = {}) {
  const {
    port = process.env.PORT || 3000,
    host = process.env.HOST || '0.0.0.0',
    useHttps = process.env.USE_HTTPS === 'true' || false,
    trustProxy = process.env.TRUST_PROXY === 'true' || false
  } = options;

  // Add proxy headers support
  const wrappedHandler = (req, res) => {
    if (trustProxy) {
      req.headers['x-forwarded-for'] = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
      req.headers['x-forwarded-proto'] = req.headers['x-forwarded-proto'] || (useHttps ? 'https' : 'http');
      req.headers['x-forwarded-host'] = req.headers['x-forwarded-host'] || req.headers.host;
    }
    return handler(req, res);
  };

  let server;

  if (useHttps) {
    // Check if TLS certificates exist
    if (!existsSync(TLS_CONFIG.cert) || !existsSync(TLS_CONFIG.key)) {
      console.warn('TLS certificates not found, falling back to HTTP');
      server = createHttpServer(wrappedHandler);
    } else {
      const tlsOptions = {
        cert: readFileSync(TLS_CONFIG.cert),
        key: readFileSync(TLS_CONFIG.key)
      };

      if (existsSync(TLS_CONFIG.ca)) {
        tlsOptions.ca = readFileSync(TLS_CONFIG.ca);
      }

      // TLS configuration for security
      tlsOptions.minVersion = 'TLSv1.2';
      tlsOptions.ciphers = [
        'ECDHE-ECDSA-AES128-GCM-SHA256',
        'ECDHE-RSA-AES128-GCM-SHA256',
        'ECDHE-ECDSA-AES256-GCM-SHA384',
        'ECDHE-RSA-AES256-GCM-SHA384',
        'DHE-RSA-AES128-GCM-SHA256',
        'DHE-RSA-AES256-GCM-SHA384'
      ].join(':');

      server = createHttpsServer(tlsOptions, wrappedHandler);
    }
  } else {
    server = createHttpServer(wrappedHandler);
  }

  // Graceful shutdown
  const shutdown = async () => {
    console.log('Shutting down server...');
    server.close(() => {
      console.log('Server closed');
      process.exit(0);
    });

    // Force close after 10 seconds
    setTimeout(() => {
      console.error('Forced shutdown');
      process.exit(1);
    }, 10000);
  };

  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);

  // Start server
  server.listen(port, host, () => {
    console.log(`Server running on ${useHttps ? 'https' : 'http'}://${host}:${port}`);
    if (useHttps) {
      console.log('TLS enabled');
    }
  });

  return server;
}

// Generate self-signed certificates for development
export function generateSelfSignedCert() {
  const { execSync } = require('child_process');
  const fs = require('fs');
  const path = require('path');

  const certsDir = join(process.cwd(), 'certs');

  if (!fs.existsSync(certsDir)) {
    fs.mkdirSync(certsDir, { recursive: true });
  }

  // Generate CA key
  execSync(`openssl genrsa -out ${join(certsDir, 'ca-key.pem')} 2048`);

  // Generate CA certificate
  execSync(`openssl req -new -x509 -days 365 -key ${join(certsDir, 'ca-key.pem')} -out ${join(certsDir, 'ca.pem')} -subj "/CN=AntiSlop CA"`);

  // Generate server key
  execSync(`openssl genrsa -out ${join(certsDir, 'key.pem')} 2048`);

  // Generate server CSR
  execSync(`openssl req -new -key ${join(certsDir, 'key.pem')} -out ${join(certsDir, 'server.csr')} -subj "/CN=localhost"`);

  // Sign server certificate
  execSync(`openssl x509 -req -days 365 -in ${join(certsDir, 'server.csr')} -CA ${join(certsDir, 'ca.pem')} -CAkey ${join(certsDir, 'ca-key.pem')} -CAcreateserial -out ${join(certsDir, 'cert.pem')}`);

  // Clean up
  fs.unlinkSync(join(certsDir, 'server.csr'));

  console.log('Certificates generated in', certsDir);
  return {
    cert: join(certsDir, 'cert.pem'),
    key: join(certsDir, 'key.pem'),
    ca: join(certsDir, 'ca.pem')
  };
}

// CLI
if (process.argv[1] === import.meta.url) {
  const command = process.argv[2];

  switch (command) {
    case 'generate-certs':
      generateSelfSignedCert();
      break;

    case 'start':
      const handler = (req, res) => {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ status: 'ok' }));
      };
      createSecureServer(handler);
      break;

    default:
      console.log('HTTPS Server');
      console.log('');
      console.log('Commands:');
      console.log('  generate-certs  Generate self-signed certificates');
      console.log('  start           Start HTTPS server');
  }
}
