# Information Security Policy

**Civic Voices, Inc.**
**Version:** 1.0
**Effective Date:** January 2025
**Last Reviewed:** January 2025
**Policy Owner:** Founder/CEO

---

## 1. Purpose and Scope

### 1.1 Purpose
This Information Security Policy establishes the security controls, practices, and responsibilities necessary to protect Civic Voices' information assets, customer data, and systems from unauthorized access, disclosure, modification, or destruction.

### 1.2 Scope
This policy applies to:
- All information systems, applications, and infrastructure operated by Civic Voices
- All data processed, stored, or transmitted by Civic Voices systems
- All personnel with access to Civic Voices systems (employees, contractors, service providers)
- All third-party services integrated with Civic Voices platforms

### 1.3 Data Classification
| Classification | Description | Examples |
|----------------|-------------|----------|
| **Confidential** | Sensitive business or customer data requiring strict access controls | API keys, customer PII, authentication tokens, payment data |
| **Internal** | Business information for internal use only | System logs, internal documentation, analytics |
| **Public** | Information approved for public disclosure | Marketing materials, public documentation |

---

## 2. Governance and Responsibilities

### 2.1 Security Governance Structure
As a solo-founder organization, security governance is centralized:

| Role | Responsibilities |
|------|------------------|
| **Founder/CEO** | Ultimate accountability for security program; policy approval; risk acceptance decisions |
| **Technical Operations** | Implementation of security controls; incident response; system administration |

### 2.2 Policy Review
- This policy shall be reviewed annually or upon significant changes to business operations, technology stack, or regulatory requirements
- All policy changes require documented approval from the Founder/CEO

---

## 3. Access Control

### 3.1 Authentication Requirements
- **Customer Authentication:** Supabase Auth with email/password; OAuth via Google where supported
- **Administrative Access:** Multi-factor authentication (MFA) required for all administrative accounts
- **API Authentication:** Bearer tokens with defined expiration periods
- **Session Management:** Sessions expire after inactivity; secure cookie configuration with HttpOnly and Secure flags

### 3.2 Authorization Principles
- **Least Privilege:** Access granted only as necessary to perform job functions
- **Role-Based Access Control (RBAC):** User permissions defined by subscription tier and role
- **Administrative Segregation:** Admin functions protected by email-based allowlist with database verification

### 3.3 Password Requirements
- Minimum 8 characters (enforced by Supabase Auth)
- Account lockout after repeated failed attempts
- Secure password reset via email verification

### 3.4 Access Review
- Customer access automatically expires with subscription cancellation
- Third-party service access reviewed quarterly
- API key rotation performed annually or upon suspected compromise

---

## 4. Data Protection

### 4.1 Data at Rest
- **Database:** PostgreSQL hosted on Supabase with encryption at rest (AES-256)
- **Backups:** Automated daily backups with 30-day retention; encrypted storage
- **Environment Variables:** Stored in Vercel's encrypted environment variable system

### 4.2 Data in Transit
- **TLS 1.2+:** All external communications encrypted via HTTPS
- **HSTS:** HTTP Strict Transport Security enabled with 1-year max-age
- **Internal Communications:** All service-to-service communication over encrypted channels

### 4.3 Data Minimization
- Collect only data necessary for service delivery
- No unnecessary PII collection (gender, pronouns, etc.)
- Aggregated/anonymized data preferred for analytics

### 4.4 Data Retention
| Data Type | Retention Period | Disposal Method |
|-----------|------------------|-----------------|
| User accounts | Until deletion request or 2 years of inactivity | Database deletion |
| Search results | 90 days | Automated purge |
| Reports | 1 year | Automated purge |
| System logs | 90 days | Log rotation |
| Payment records | 7 years (legal requirement) | Secure deletion after period |

### 4.5 Data Subject Rights
Customers may request:
- Access to their personal data
- Correction of inaccurate data
- Deletion of their account and associated data
- Export of their data in machine-readable format

Requests processed within 30 days via support@civicvoices.ai.

---

## 5. Infrastructure Security

### 5.1 Cloud Infrastructure
| Component | Provider | Security Controls |
|-----------|----------|-------------------|
| Application Hosting | Vercel | SOC 2 Type II certified; automatic HTTPS; DDoS protection |
| Database | Supabase (AWS) | SOC 2 certified; VPC isolation; encrypted storage |
| Authentication | Supabase Auth | Industry-standard OAuth 2.0; secure session management |
| Payments | Stripe | PCI DSS Level 1 certified; tokenized payment processing |

### 5.2 Application Security Controls
- **Security Headers:** HSTS, X-Frame-Options (DENY), X-Content-Type-Options, CSP, Referrer-Policy
- **Input Validation:** Server-side validation on all user inputs
- **Output Encoding:** Protection against XSS attacks
- **CSRF Protection:** Token-based protection on state-changing operations
- **Rate Limiting:** API rate limits to prevent abuse and DoS attacks

### 5.3 Network Security
- No direct database access from public internet
- Connection pooling with limited connections per instance
- Firewall rules managed by cloud providers

### 5.4 Vulnerability Management
- Dependency scanning via npm audit (weekly)
- Automated security updates for critical vulnerabilities
- Third-party penetration testing annually (when budget permits)

---

## 6. Third-Party Security

### 6.1 Vendor Assessment
Before integrating third-party services:
- Review vendor's security certifications (SOC 2, ISO 27001, etc.)
- Evaluate data handling practices
- Ensure contractual security requirements

### 6.2 Approved Third-Party Services
| Service | Purpose | Security Certification |
|---------|---------|----------------------|
| Vercel | Application hosting | SOC 2 Type II |
| Supabase | Database & Auth | SOC 2 Type II |
| Stripe | Payment processing | PCI DSS Level 1 |
| Anthropic | AI analysis | SOC 2 Type II |
| OpenAI | AI analysis | SOC 2 Type II |
| Resend | Transactional email | SOC 2 Type II |
| Loops | Marketing email | SOC 2 Type II |

### 6.3 API Security
- All API keys stored as encrypted environment variables
- Keys never logged or exposed in client-side code
- Separate API keys for development and production
- Webhook signatures verified for all incoming webhooks (Stripe)

---

## 7. Incident Response

### 7.1 Incident Classification
| Severity | Description | Response Time |
|----------|-------------|---------------|
| **Critical** | Active breach, data exfiltration, service unavailable | Immediate (< 1 hour) |
| **High** | Potential breach, security vulnerability exploited | < 4 hours |
| **Medium** | Suspicious activity, failed attack attempts | < 24 hours |
| **Low** | Minor security issues, policy violations | < 72 hours |

### 7.2 Incident Response Procedure
1. **Detection:** Identify and confirm the incident
2. **Containment:** Isolate affected systems; revoke compromised credentials
3. **Eradication:** Remove threat; patch vulnerabilities
4. **Recovery:** Restore services; verify integrity
5. **Post-Incident:** Document lessons learned; update controls

### 7.3 Breach Notification
- Affected customers notified within 72 hours of confirmed breach
- Regulatory authorities notified as required by applicable law
- Public disclosure if legally required or in customer interest

### 7.4 Incident Documentation
All security incidents documented with:
- Date/time of detection and resolution
- Systems and data affected
- Root cause analysis
- Remediation actions taken
- Preventive measures implemented

---

## 8. Business Continuity

### 8.1 Availability Targets
- **Target Uptime:** 99.9% monthly availability
- **Recovery Time Objective (RTO):** 4 hours for critical services
- **Recovery Point Objective (RPO):** 24 hours (daily backups)

### 8.2 Backup Strategy
- Automated daily database backups via Supabase
- Point-in-time recovery capability
- Backups stored in geographically separate region
- Monthly backup restoration tests

### 8.3 Disaster Recovery
- Serverless architecture enables rapid redeployment
- Infrastructure-as-code via Vercel configuration
- Database can be restored from Supabase backups
- No single point of failure for critical services

---

## 9. Secure Development

### 9.1 Development Practices
- Version control via Git with code review for main branch
- Separate development and production environments
- No production data in development environments
- Secrets never committed to version control

### 9.2 Deployment Security
- Automated deployments via Vercel CI/CD
- Production deployments require passing build checks
- Rollback capability for all deployments
- Environment variables managed separately per environment

### 9.3 Dependency Management
- Regular dependency updates (monthly minimum)
- Automated vulnerability scanning
- Critical security patches applied within 48 hours

---

## 10. Logging and Monitoring

### 10.1 Audit Logging
Events logged include:
- Authentication attempts (success/failure)
- Administrative actions
- Data access and modifications
- Security-relevant system events

### 10.2 Log Protection
- PII masked in logs (emails, IPs) to prevent exposure
- Logs stored in provider-managed systems
- Log retention: 90 days

### 10.3 Monitoring
- Vercel Analytics for application performance
- Error tracking for application failures
- Database query performance monitoring
- Uptime monitoring via external service

---

## 11. Acceptable Use

### 11.1 Prohibited Activities
Users shall not:
- Attempt to access data of other users
- Circumvent security controls
- Use the service for illegal purposes
- Conduct security testing without authorization
- Share account credentials

### 11.2 Enforcement
Violations may result in:
- Account suspension or termination
- Reporting to law enforcement if applicable
- Legal action for damages

---

## 12. Compliance

### 12.1 Regulatory Compliance
- **GDPR:** Data subject rights; lawful basis for processing; data minimization
- **CCPA:** California consumer privacy rights; opt-out mechanisms
- **SOC 2:** Controls aligned with Trust Service Criteria

### 12.2 Contractual Obligations
- Terms of Service define customer obligations
- Privacy Policy discloses data handling practices
- DPA available for enterprise customers upon request

---

## 13. Policy Exceptions

### 13.1 Exception Process
Exceptions to this policy require:
1. Documented business justification
2. Risk assessment
3. Compensating controls identified
4. Founder/CEO approval
5. Time-limited duration with review date

### 13.2 Exception Register
All approved exceptions maintained in a register including:
- Exception description
- Approval date and approver
- Expiration date
- Compensating controls
- Review status

---

## 14. Training and Awareness

### 14.1 Security Awareness
- Annual security best practices review
- Incident response procedures documented
- Security considerations in development documented in CLAUDE.md

### 14.2 Onboarding
New team members (when applicable) receive:
- Access to security policies
- Overview of security responsibilities
- Access provisioning per least privilege

---

## 15. Contact Information

**Security Inquiries:** security@civicvoices.ai
**Privacy Inquiries:** privacy@civicvoices.ai
**General Support:** support@civicvoices.ai

**Report a Vulnerability:** security@civicvoices.ai
We appreciate responsible disclosure and will acknowledge receipt within 48 hours.

---

## Document History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | January 2025 | Founder/CEO | Initial policy |

---

*This policy is reviewed annually and updated as needed to reflect changes in business operations, technology, or regulatory requirements.*
