# Risk Assessment Policy

**Civic Voices, Inc.**
**Version:** 1.0
**Effective Date:** January 2025
**Last Reviewed:** January 2025
**Policy Owner:** Founder/CEO

---

## 1. Purpose

This policy establishes a framework for identifying, assessing, and managing risks to Civic Voices' information assets, systems, and operations. Regular risk assessment ensures appropriate security controls are implemented and resources are allocated effectively.

---

## 2. Scope

This policy covers risks related to:
- Information security and data protection
- System availability and business continuity
- Regulatory and legal compliance
- Third-party and vendor relationships
- Operational processes

---

## 3. Risk Assessment Framework

### 3.1 Risk Assessment Schedule

| Assessment Type | Frequency | Trigger Events |
|-----------------|-----------|----------------|
| **Annual Review** | Yearly (January) | Scheduled |
| **Ad-Hoc Assessment** | As needed | New system, major change, incident, new regulation |
| **Vendor Assessment** | Before onboarding | New third-party integration |

### 3.2 Risk Identification Sources

- Security incident reports
- Vulnerability scan results
- Industry threat intelligence
- Regulatory changes
- Business changes
- Customer feedback
- Third-party audits

---

## 4. Risk Scoring Methodology

### 4.1 Likelihood Scale

| Score | Likelihood | Description |
|-------|------------|-------------|
| 1 | Rare | May occur only in exceptional circumstances (< 5% annually) |
| 2 | Unlikely | Could occur but not expected (5-25% annually) |
| 3 | Possible | Might occur at some time (25-50% annually) |
| 4 | Likely | Will probably occur (50-80% annually) |
| 5 | Almost Certain | Expected to occur (> 80% annually) |

### 4.2 Impact Scale

| Score | Impact | Description |
|-------|--------|-------------|
| 1 | Negligible | Minor inconvenience, no data loss, < $1k impact |
| 2 | Minor | Limited impact, no sensitive data, $1k-$10k impact |
| 3 | Moderate | Significant disruption, limited data exposure, $10k-$50k impact |
| 4 | Major | Serious impact, sensitive data breach, $50k-$250k impact |
| 5 | Catastrophic | Business-threatening, major breach, regulatory action, > $250k impact |

### 4.3 Risk Rating Matrix

```
                    IMPACT
              1    2    3    4    5
         ┌────┬────┬────┬────┬────┐
       5 │ 5  │ 10 │ 15 │ 20 │ 25 │
         ├────┼────┼────┼────┼────┤
       4 │ 4  │ 8  │ 12 │ 16 │ 20 │
L        ├────┼────┼────┼────┼────┤
I      3 │ 3  │ 6  │ 9  │ 12 │ 15 │
K        ├────┼────┼────┼────┼────┤
E      2 │ 2  │ 4  │ 6  │ 8  │ 10 │
L        ├────┼────┼────┼────┼────┤
I      1 │ 1  │ 2  │ 3  │ 4  │ 5  │
H        └────┴────┴────┴────┴────┘
O
O        Risk Score = Likelihood × Impact
D
```

### 4.4 Risk Rating Categories

| Score | Rating | Response Required |
|-------|--------|-------------------|
| 1-4 | **Low** | Accept or monitor; address during normal operations |
| 5-9 | **Medium** | Implement controls within 90 days |
| 10-15 | **High** | Implement controls within 30 days |
| 16-25 | **Critical** | Immediate action required; escalate to Founder/CEO |

---

## 5. Risk Treatment Options

| Option | Description | When to Use |
|--------|-------------|-------------|
| **Mitigate** | Implement controls to reduce likelihood or impact | Most common for medium/high risks |
| **Accept** | Acknowledge and monitor without additional controls | Low risks where cost > benefit |
| **Transfer** | Share risk via insurance or contracts | Financial risks, liability risks |
| **Avoid** | Eliminate the risk by stopping the activity | Unacceptable risks with no viable controls |

---

## 6. Current Risk Register

*Last Updated: January 2025*

### 6.1 Critical and High Risks

| ID | Risk Description | L | I | Score | Treatment | Controls | Owner | Status |
|----|------------------|---|---|-------|-----------|----------|-------|--------|
| R-001 | Unauthorized access to customer data | 2 | 5 | 10 | Mitigate | Auth controls, encryption, access logging | CEO | Active |
| R-002 | API key exposure in logs/code | 2 | 4 | 8 | Mitigate | PII masking, secret scanning, env vars | CEO | Active |
| R-003 | Third-party API breach affecting our data | 2 | 4 | 8 | Transfer/Mitigate | Vendor SOC 2 requirements, data minimization | CEO | Active |
| R-004 | Service unavailability (DDoS, outage) | 3 | 3 | 9 | Mitigate | Vercel DDoS protection, rate limiting | CEO | Active |
| R-005 | Database data loss | 1 | 5 | 5 | Mitigate | Daily backups, point-in-time recovery | CEO | Active |

### 6.2 Medium Risks

| ID | Risk Description | L | I | Score | Treatment | Controls | Owner | Status |
|----|------------------|---|---|-------|-----------|----------|-------|--------|
| R-006 | Dependency vulnerability (npm packages) | 3 | 3 | 9 | Mitigate | Weekly npm audit, automated updates | CEO | Active |
| R-007 | Social media API rate limiting/blocking | 3 | 2 | 6 | Accept | Multiple providers, graceful degradation | CEO | Monitored |
| R-008 | Stripe payment processing failure | 2 | 3 | 6 | Transfer | Stripe SLA, customer communication plan | CEO | Active |
| R-009 | Email deliverability issues | 3 | 2 | 6 | Mitigate | Transactional email service (Resend/Loops) | CEO | Active |
| R-010 | AI service unavailability | 2 | 2 | 4 | Mitigate | Multiple AI providers, graceful fallback | CEO | Active |

### 6.3 Low Risks (Accepted/Monitored)

| ID | Risk Description | L | I | Score | Treatment | Notes |
|----|------------------|---|---|-------|-----------|-------|
| R-011 | Founder unavailability | 1 | 3 | 3 | Accept | Document critical procedures |
| R-012 | Domain/SSL expiration | 1 | 3 | 3 | Mitigate | Auto-renewal enabled |
| R-013 | Vercel pricing changes | 1 | 2 | 2 | Accept | Monitor, migration plan if needed |

---

## 7. Risk Assessment Procedures

### 7.1 Annual Risk Assessment Process

**Timeline:** January each year

1. **Week 1: Information Gathering**
   - Review previous year's risk register
   - Collect incident reports
   - Review vulnerability scan results
   - Identify new assets and systems

2. **Week 2: Risk Identification**
   - Identify new risks
   - Review existing risk ratings
   - Document changes to threat landscape

3. **Week 3: Risk Evaluation**
   - Score likelihood and impact
   - Determine risk ratings
   - Prioritize risks for treatment

4. **Week 4: Treatment Planning**
   - Define treatment strategies
   - Assign owners and deadlines
   - Update risk register
   - Document in policy

### 7.2 Ad-Hoc Risk Assessment

Triggered by:
- Security incidents
- New system implementations
- Significant infrastructure changes
- New regulatory requirements
- Vendor security concerns

**Abbreviated Process:**
1. Identify specific risk(s)
2. Score and rate
3. Determine treatment
4. Update risk register
5. Implement controls as needed

### 7.3 Vendor Risk Assessment

Before integrating a new third-party service:

| Criterion | Assessment Question | Evidence Required |
|-----------|---------------------|-------------------|
| Security Certification | Does vendor have SOC 2 Type II? | SOC 2 report or equivalent |
| Data Handling | What data will vendor access? | Data flow documentation |
| Data Location | Where is data stored? | Privacy policy, terms |
| Incident Response | How does vendor handle breaches? | Incident response policy |
| Subprocessors | Who else processes the data? | Subprocessor list |
| Termination | Can we retrieve/delete data? | Terms of service |

---

## 8. Risk Monitoring

### 8.1 Ongoing Monitoring Activities

| Activity | Frequency | Owner |
|----------|-----------|-------|
| Review error logs | Daily | CEO |
| Check uptime monitoring | Daily | CEO |
| Review security advisories | Weekly | CEO |
| npm audit | Weekly | CEO |
| Review access logs | Monthly | CEO |
| Vendor security news | Ongoing | CEO |

### 8.2 Key Risk Indicators (KRIs)

| Indicator | Threshold | Action if Exceeded |
|-----------|-----------|-------------------|
| Failed login attempts | > 100/day | Investigate, consider blocking |
| Error rate | > 1% of requests | Investigate root cause |
| API rate limit hits | > 50/day | Review usage patterns |
| Dependency vulnerabilities | Any critical/high | Patch within 48 hours |
| Uptime | < 99.5% monthly | Root cause analysis |

---

## 9. Risk Acceptance

### 9.1 Acceptance Authority

| Risk Level | Acceptance Authority |
|------------|---------------------|
| Low (1-4) | Self-approved with documentation |
| Medium (5-9) | Founder/CEO approval required |
| High (10-15) | Founder/CEO approval with compensating controls |
| Critical (16-25) | Cannot be accepted; must be mitigated |

### 9.2 Risk Acceptance Documentation

Accepted risks must be documented with:
- Risk description and rating
- Business justification
- Compensating controls (if any)
- Acceptance date and approver
- Review date (maximum 1 year)

---

## 10. Reporting

### 10.1 Risk Reports

| Report | Frequency | Contents |
|--------|-----------|----------|
| Risk Register Update | Quarterly | Current risks, status, changes |
| Annual Risk Assessment | Annually | Full assessment, year-over-year comparison |
| Incident-Triggered | As needed | Specific risk analysis following incidents |

### 10.2 Escalation

Critical and high risks requiring immediate attention:
1. Document the risk immediately
2. Notify Founder/CEO
3. Implement temporary controls if possible
4. Develop remediation plan within 24 hours

---

## 11. Integration with Other Policies

This policy works in conjunction with:
- **Information Security Policy:** Implements controls for identified risks
- **Change Management Policy:** Assesses risks of proposed changes
- **Incident Response Plan:** Triggers risk reassessment after incidents
- **Business Continuity Plan:** Addresses availability risks

---

## 12. Policy Review

This policy and the risk register are reviewed:
- Annually (January)
- After significant security incidents
- After major business or technology changes
- When new regulations apply

---

## Document History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | January 2025 | Founder/CEO | Initial policy |
