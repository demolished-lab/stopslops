# Deployment Patterns

Comprehensive guide to deploying Universal Anti-Slop.

---

## Table of Contents

- [Deployment Options](#deployment-options)
- [Local Development](#local-development)
- [CI/CD Integration](#cicd-integration)
- [API Service](#api-service)
- [Enterprise Deployment](#enterprise-deployment)
- [Kubernetes](#kubernetes)
- [Docker](#docker)
- [Serverless](#serverless)

---

## Deployment Options

| Pattern | Use Case | Complexity | Scale |
|---------|----------|------------|-------|
| **CLI Tool** | Local development | Low | 1 user |
| **npm Package** | Project integration | Low | 1 project |
| **CI/CD Plugin** | Pipeline integration | Medium | 1 team |
| **API Service** | Enterprise deployment | Medium | 100+ users |
| **Multi-Tenant SaaS** | Platform | High | 1000+ users |
| **On-Premise** | Enterprise | High | Org-wide |

---

## Local Development

### Install Globally

```bash
npm install -g universal-antislop
```

### Use in Project

```bash
# Check codebase
antislop-check

# Judge specific file
antislop-judge --category general-code --file src/index.ts

# Run health check
antislop-health
```

### Add to package.json

```json
{
  "scripts": {
    "check": "antislop-check",
    "judge": "antislop-judge",
    "quality": "antislop-check && antislop-test"
  }
}
```

---

## CI/CD Integration

### GitHub Actions

```yaml
# .github/workflows/ci.yml
name: CI

on: [push, pull_request]

jobs:
  quality:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
        with:
          version: 9
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'pnpm'
      - run: pnpm install --frozen-lockfile
      - run: pnpm check
      - run: pnpm test
```

### GitLab CI

```yaml
# .gitlab-ci.yml
quality:
  stage: test
  script:
    - pnpm install
    - pnpm check
    - pnpm test
  only:
    - merge_requests
    - main
```

### CircleCI

```yaml
# .circleci/config.yml
version: 2.1
jobs:
  quality:
    docker:
      - image: cimg/node:20.0
    steps:
      - checkout
      - run: pnpm install
      - run: pnpm check
      - run: pnpm test
workflows:
  quality:
    jobs:
      - quality
```

---

## API Service

### Start Server

```bash
# Default port 3000
node scripts/api.mjs

# Custom port
node scripts/api.mjs --port 8080
```

### Endpoints

```bash
# Health check
GET /health

# Run checkers
POST /check
{
  "path": "/path/to/project"
}

# Run judge
POST /judge
{
  "category": "general-code",
  "file": "/path/to/file.ts"
}

# Tenant management
POST /tenants
{
  "name": "Acme Corp"
}

GET /tenants
GET /tenants/:id

# Metrics
GET /metrics

# Version info
GET /version
```

### Multi-Tenant

```bash
# Create tenant
curl -X POST http://localhost:3000/tenants \
  -H "Content-Type: application/json" \
  -d '{"name": "Acme Corp"}'

# Use tenant
curl -H "X-Tenant-ID: tenant_abc123" http://localhost:3000/check
```

---

## Enterprise Deployment

### Single Server

```bash
# Install
npm install -g universal-antislop

# Start services
node scripts/api.mjs --port 3000 &
node scripts/health.mjs --port 3001 &

# Configure reverse proxy
# nginx.conf
server {
    listen 80;
    server_name antislop.example.com;
    
    location /api {
        proxy_pass http://localhost:3000;
    }
    
    location /health {
        proxy_pass http://localhost:3001;
    }
}
```

### Load Balancer

```nginx
# nginx.conf
upstream antislop {
    server antislop-1:3000;
    server antislop-2:3000;
    server antislop-3:3000;
}

server {
    listen 80;
    server_name antislop.example.com;
    
    location / {
        proxy_pass http://antislop;
    }
}
```

---

## Kubernetes

### Deployment

```yaml
# k8s/deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: universal-antislop
spec:
  replicas: 3
  selector:
    matchLabels:
      app: universal-antislop
  template:
    metadata:
      labels:
        app: universal-antislop
    spec:
      containers:
      - name: api
        image: universal-antislop:latest
        ports:
        - containerPort: 3000
        env:
        - name: NODE_ENV
          value: production
        livenessProbe:
          httpGet:
            path: /live
            port: 3000
          initialDelaySeconds: 30
          periodSeconds: 10
        readinessProbe:
          httpGet:
            path: /ready
            port: 3000
          initialDelaySeconds: 5
          periodSeconds: 5
        resources:
          requests:
            memory: "256Mi"
            cpu: "250m"
          limits:
            memory: "512Mi"
            cpu: "500m"
```

### Service

```yaml
# k8s/service.yaml
apiVersion: v1
kind: Service
metadata:
  name: universal-antislop
spec:
  selector:
    app: universal-antislop
  ports:
  - port: 80
    targetPort: 3000
  type: LoadBalancer
```

### Ingress

```yaml
# k8s/ingress.yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: universal-antislop
  annotations:
    nginx.ingress.kubernetes.io/rewrite-target: /
spec:
  rules:
  - host: antislop.example.com
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: universal-antislop
            port:
              number: 80
```

---

## Docker

### Dockerfile

```dockerfile
# Dockerfile
FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm install --production

COPY . .

EXPOSE 3000

CMD ["node", "scripts/api.mjs"]
```

### Docker Compose

```yaml
# docker-compose.yml
version: '3.8'

services:
  api:
    build: .
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3000/health"]
      interval: 30s
      timeout: 10s
      retries: 3
    
  redis:
    image: redis:alpine
    ports:
      - "6379:6379"
```

---

## Serverless

### AWS Lambda

```javascript
// lambda/handler.mjs
import { createServer } from '@vendia/serverless-express';
import app from './api.mjs';

export const handler = createServer({ app });
```

### Cloudflare Workers

```javascript
// workers/index.mjs
export default {
  async fetch(request) {
    // Handle request
    return new Response('Hello from Anti-Slop!');
  }
};
```

---

## Environment Variables

```bash
# Server
PORT=3000
NODE_ENV=production

# API Keys (for LLM judge)
BYNARA_API_KEY=your-key
OPENAI_API_KEY=your-key

# Logging
LOG_LEVEL=info

# Security
ANTISLOP_ROOT=/path/to/project
```

---

## Monitoring

### Health Checks

```bash
# Full health status
curl http://localhost:3000/health

# Kubernetes probes
livenessProbe: httpGet: /live
readinessProbe: httpGet: /ready
```

### Metrics

```bash
# System metrics
curl http://localhost:3000/metrics
```

### Logging

```bash
# Structured logging
LOG_LEVEL=debug node scripts/api.mjs
```

---

## Backup & Recovery

### Backup

```bash
# Backup audit logs
aws s3 sync ./audit-logs s3://backups/audit-logs

# Backup tenant configs
aws s3 sync ./tenants s3://backups/tenants
```

### Recovery

```bash
# Restore from backup
aws s3 sync s3://backups/audit-logs ./audit-logs
aws s3 sync s3://backups/tenants ./tenants
```

---

## Security

### TLS/SSL

```nginx
# nginx.conf
server {
    listen 443 ssl;
    server_name antislop.example.com;
    
    ssl_certificate /path/to/cert.pem;
    ssl_certificate_key /path/to/key.pem;
    
    location / {
        proxy_pass http://localhost:3000;
    }
}
```

### Authentication

```bash
# API key authentication
curl -H "Authorization: Bearer your-api-key" http://localhost:3000/check
```

---

## Performance Tuning

### Node.js

```bash
# Increase memory limit
node --max-old-space-size=4096 scripts/api.mjs

# Enable clustering
node -r cluster scripts/api.mjs
```

### Caching

```bash
# Enable caching
CACHE_ENABLED=true node scripts/api.mjs
```

---

**Pick your deployment pattern. Deploy with confidence.**
