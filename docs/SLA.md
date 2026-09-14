# Service Level Agreement (SLA)

## Universal Anti-Slop Quality Gate

### 1. Service Description

Universal Anti-Slop provides:
- **Quality Checking**: Parallel static analysis across 13 categories
- **LLM Judge**: AI-powered content evaluation with heuristic fallback
- **Health Monitoring**: Real-time system health status
- **Enterprise Features**: Multi-tenant isolation, audit logging, resilience

### 2. Service Levels

#### 2.1 Availability

| Tier | Uptime | Measurement | Exclusions |
|------|--------|-------------|------------|
| **Enterprise** | 99.99% | Monthly | Scheduled maintenance |
| **Business** | 99.9% | Monthly | Scheduled maintenance |
| **Standard** | 99.5% | Monthly | Scheduled maintenance |

**Scheduled Maintenance**: First Saturday of each month, 02:00-06:00 UTC

#### 2.2 Performance

| Metric | Enterprise | Business | Standard |
|--------|------------|----------|----------|
| **Response Time (P50)** | ≤100ms | ≤200ms | ≤500ms |
| **Response Time (P95)** | ≤500ms | ≤1000ms | ≤2000ms |
| **Response Time (P99)** | ≤1000ms | ≤2000ms | ≤5000ms |
| **Throughput** | ≥100 RPS | ≥50 RPS | ≥10 RPS |
| **Error Rate** | ≤0.1% | ≤1% | ≤5% |

#### 2.3 Durability

| Data Type | Retention | Backup | Recovery |
|-----------|-----------|--------|----------|
| **Audit Logs** | 7 years | Daily | ≤1 hour |
| **Check Results** | 90 days | Weekly | ≤4 hours |
| **Tenant Config** | Indefinite | Real-time | ≤15 minutes |
| **Cache** | 24 hours | None | Rebuild |

### 3. Support Levels

#### 3.1 Response Times

| Severity | Enterprise | Business | Standard |
|----------|------------|----------|----------|
| **Critical (P0)** | 15 minutes | 1 hour | 4 hours |
| **High (P1)** | 1 hour | 4 hours | 24 hours |
| **Medium (P2)** | 4 hours | 24 hours | 72 hours |
| **Low (P3)** | 24 hours | 72 hours | 1 week |

#### 3.2 Severity Definitions

- **Critical (P0)**: Service unavailable, data loss, security breach
- **High (P1)**: Major feature degraded, no workaround available
- **Medium (P2)**: Minor feature degraded, workaround available
- **Low (P3)**: Cosmetic issue, feature request

### 4. Monitoring & Reporting

#### 4.1 Health Endpoints

```bash
# Full health status
GET /health

# Kubernetes readiness probe
GET /ready

# Kubernetes liveness probe
GET /live

# System metrics
GET /metrics
```

#### 4.2 Metrics Collected

- Request count, success/failure rates
- Latency (min, max, avg, P50, P95, P99)
- Circuit breaker state
- Rate limiter status
- Tenant usage statistics

#### 4.3 Reporting

- **Real-time**: Health dashboard at `/health`
- **Daily**: Automated compliance reports
- **Monthly**: SLA compliance summary
- **Quarterly**: Performance review

### 5. Compliance

#### 5.1 Certifications

- **SOC 2 Type II**: Annual audit
- **ISO 27001**: Certified
- **GDPR**: Compliant
- **HIPAA**: BAA available
- **PCI DSS**: Level 1 (if applicable)

#### 5.2 Audit Logging

All actions are logged with:
- Timestamp (ISO 8601)
- User/tenant identification
- Action performed
- Result (success/failure)
- Request ID for tracing

### 6. Data Processing

#### 6.1 Location

- **Primary**: US-East (Virginia)
- **DR**: US-West (Oregon)
- **EU**: EU-West (Ireland) - Enterprise only

#### 6.2 Encryption

- **In Transit**: TLS 1.3
- **At Rest**: AES-256
- **Keys**: AWS KMS / HashiCorp Vault

#### 6.3 Data Isolation

- **Standard**: Shared infrastructure, logical isolation
- **Enterprise**: Dedicated infrastructure option available

### 7. Disaster Recovery

#### 7.1 RPO/RTO

| Tier | RPO | RTO | Backup Frequency |
|------|-----|-----|------------------|
| **Enterprise** | 1 hour | 15 minutes | Real-time |
| **Business** | 4 hours | 1 hour | Hourly |
| **Standard** | 24 hours | 4 hours | Daily |

#### 7.2 Failover

- **Automatic**: Health check failure triggers failover
- **Manual**: Admin console available
- **Testing**: Quarterly DR drills

### 8. Exclusions

This SLA does not cover:
- Issues caused by customer configuration
- Force majeure events
- Scheduled maintenance windows
- Third-party service outages
- Customer network issues

### 9. Credits

Service credits for SLA breaches:

| Uptime | Credit |
|--------|--------|
| 99.99% - 99.95% | 10% |
| 99.95% - 99.9% | 25% |
| 99.9% - 99.5% | 50% |
| < 99.5% | 100% |

### 10. Contact

- **Support**: support@universal-antislop.dev
- **Emergency**: +1-800-XXX-XXXX
- **Status Page**: https://status.universal-antislop.dev
- **Documentation**: https://docs.universal-antislop.dev

---

*Last updated: 2026-09-14*
*Version: 1.0.0*
