# Data Retention and Deletion Policy

**Civic Voices, Inc.**
**Version:** 1.0
**Effective Date:** January 2025
**Last Reviewed:** January 2025
**Policy Owner:** Founder/CEO

---

## 1. Purpose

This policy establishes guidelines for the retention, archival, and deletion of data collected and processed by Civic Voices, with specific focus on aggregated social media content. The policy ensures compliance with privacy regulations (GDPR, CCPA), platform Terms of Service, and data minimization principles.

---

## 2. Scope

This policy applies to:
- Publicly available social media content aggregated from third-party platforms
- User-generated search queries and reports
- Customer account information
- System logs and operational data
- Analytics and usage data

---

## 3. Legal and Regulatory Framework

### 3.1 Applicable Regulations

| Regulation | Key Requirements |
|------------|------------------|
| **GDPR** | Data minimization, purpose limitation, storage limitation, right to erasure |
| **CCPA** | Right to know, right to delete, data disclosure requirements |
| **Platform ToS** | X, TikTok, YouTube, Reddit, Bluesky, Truth Social terms of service |

### 3.2 Legal Basis for Processing

| Data Type | Legal Basis | Justification |
|-----------|-------------|---------------|
| Customer account data | Contract performance | Required to provide service |
| Social media content | Legitimate interest | Public data analysis for research/insights |
| Payment data | Legal obligation | Financial record-keeping requirements |
| Usage analytics | Legitimate interest | Service improvement |

---

## 4. Data Categories and Retention Periods

### 4.1 Social Media Content

| Data Element | Source | Retention Period | Deletion Method |
|--------------|--------|------------------|-----------------|
| Post text/content | X, TikTok, YouTube, etc. | **90 days** | Automated purge |
| Author username/handle | Platform APIs | **90 days** | Automated purge |
| Author display name | Platform APIs | **90 days** | Automated purge |
| Author avatar URL | Platform APIs | **90 days** | Automated purge |
| Author bio | Platform APIs | **90 days** | Automated purge |
| Engagement metrics | Platform APIs | **90 days** | Automated purge |
| Post URL | Platform APIs | **90 days** | Automated purge |
| Post thumbnails | Platform APIs | **90 days** | Automated purge |
| Sentiment analysis | Derived | **90 days** | Automated purge |
| Credibility scores | Derived | **90 days** | Automated purge |

**Rationale:** 90-day retention balances analytical value with data minimization. Social media content is ephemeral by nature and loses relevance over time.

### 4.2 Search and Report Data

| Data Element | Retention Period | Deletion Method |
|--------------|------------------|-----------------|
| Search queries | **90 days** after last access | Automated purge |
| Search results (post references) | **90 days** | Cascading delete with posts |
| Generated reports | **1 year** | User-initiated or automated |
| Report insights/analysis | **1 year** | Cascading delete with report |
| Report share tokens | Until expiration or **30 days** | Automated purge |

### 4.3 Customer Account Data

| Data Element | Retention Period | Deletion Method |
|--------------|------------------|-----------------|
| Email address | Until account deletion + **30 days** | Manual upon request |
| Name | Until account deletion + **30 days** | Manual upon request |
| Password hash | Until account deletion | Immediate deletion |
| Subscription status | Until account deletion + **7 years** (financial) | Anonymization |
| Credit transactions | **7 years** (legal requirement) | Anonymization |

### 4.4 Operational Data

| Data Element | Retention Period | Deletion Method |
|--------------|------------------|-----------------|
| Application logs | **90 days** | Log rotation |
| Error logs | **90 days** | Log rotation |
| Security/audit logs | **1 year** | Log rotation |
| API request logs | **30 days** | Log rotation |

---

## 5. Automated Retention Enforcement

### 5.1 Database Cleanup Jobs

```sql
-- Automated cleanup for social media posts older than 90 days
-- Runs daily via scheduled cron job

DELETE FROM search_posts
WHERE "savedAt" < NOW() - INTERVAL '90 days';

-- Cleanup orphaned searches (no associated report, older than 90 days)
DELETE FROM searches
WHERE "reportId" IS NULL
AND "createdAt" < NOW() - INTERVAL '90 days';

-- Cleanup expired share tokens
UPDATE research_jobs
SET "shareToken" = NULL,
    "shareTokenExpiresAt" = NULL
WHERE "shareTokenExpiresAt" < NOW();
```

### 5.2 Implementation Schedule

| Job | Frequency | Timing |
|-----|-----------|--------|
| Post cleanup | Daily | 03:00 UTC |
| Search cleanup | Daily | 03:30 UTC |
| Token cleanup | Daily | 04:00 UTC |
| Log rotation | Daily | 05:00 UTC |

### 5.3 Cron Configuration

```json
// vercel.json
{
  "crons": [
    {
      "path": "/api/cron/data-cleanup",
      "schedule": "0 3 * * *"
    }
  ]
}
```

---

## 6. Data Deletion Procedures

### 6.1 Automated Deletion

Data automatically deleted per retention schedule:
- No user action required
- Deletion logged for audit purposes
- Cascading deletes handle related records

### 6.2 User-Initiated Deletion

**Delete Individual Report:**
1. User navigates to report
2. User clicks "Delete Report"
3. System deletes report and all associated data
4. Confirmation displayed

**Delete Search History:**
1. User navigates to Search History
2. User selects searches to delete
3. System deletes selected searches and posts
4. Confirmation displayed

**Delete Account:**
1. User requests account deletion via settings
2. System schedules deletion for 30 days (grace period)
3. User receives confirmation email
4. After 30 days, account and all data permanently deleted
5. Financial records anonymized (not deleted) per legal requirements

### 6.3 Data Subject Requests (GDPR/CCPA)

**Right to Erasure Process:**

1. **Request Receipt**
   - User submits request via privacy@civicvoices.ai
   - Request logged with timestamp

2. **Identity Verification**
   - Verify requester owns the account
   - Request confirmation from registered email

3. **Scope Determination**
   - Identify all data associated with user
   - Document any legal retention requirements

4. **Execution**
   - Delete personal data within 30 days
   - Anonymize data required for legal retention
   - Document deletion actions

5. **Confirmation**
   - Send confirmation to user
   - Retain deletion record for compliance

**Response Timeline:** 30 days (extendable to 60 days for complex requests)

---

## 7. Third-Party Social Media Author Data

### 7.1 Nature of Data

Civic Voices aggregates **publicly available** social media content. We do not:
- Create accounts on behalf of social media users
- Store private/protected content
- Collect data beyond what is publicly displayed

### 7.2 Social Media Author Rights

Social media authors whose public posts appear in our aggregations may:
- Request information about how their content was used
- Request removal of their content from our database

**Removal Request Process:**
1. Author contacts privacy@civicvoices.ai
2. Provides proof of account ownership (e.g., platform username)
3. We remove all posts from that author within 7 days
4. Author added to exclusion list to prevent re-aggregation

### 7.3 Exclusion List

Maintain list of social media accounts that have opted out:
- Check exclusion list before storing new posts
- Exclude posts from opted-out authors
- Retain exclusion list indefinitely

---

## 8. Data Export (Portability)

### 8.1 User Data Export

Users may request export of their data:
- Account information
- Search history
- Generated reports
- Saved topics/alerts

**Export Format:** JSON or CSV
**Timeline:** Within 30 days of request
**Request Method:** settings page or privacy@civicvoices.ai

### 8.2 Export Contents

```json
{
  "account": {
    "email": "user@example.com",
    "name": "User Name",
    "createdAt": "2025-01-01T00:00:00Z"
  },
  "searches": [
    {
      "query": "search term",
      "createdAt": "2025-01-15T00:00:00Z",
      "resultCount": 150
    }
  ],
  "reports": [
    {
      "id": "report_id",
      "query": "search term",
      "createdAt": "2025-01-15T00:00:00Z",
      "status": "COMPLETED"
    }
  ],
  "alerts": [
    {
      "searchQuery": "topic",
      "frequency": "DAILY",
      "isActive": true
    }
  ]
}
```

---

## 9. Backup and Recovery Impact

### 9.1 Backup Retention

| Backup Type | Retention | Notes |
|-------------|-----------|-------|
| Daily database backup | 30 days | May contain data past retention period |
| Point-in-time recovery | 7 days | Supabase managed |

### 9.2 Deletion from Backups

- Backups automatically expire per retention schedule
- Data deleted from production will age out of backups naturally
- For urgent deletion (legal requirement), backups may be manually purged

### 9.3 Recovery Considerations

When restoring from backup:
- Run retention cleanup immediately after restore
- Verify no restored data exceeds retention periods
- Re-apply any pending deletion requests

---

## 10. Special Circumstances

### 10.1 Legal Hold

When litigation is anticipated or ongoing:
- Suspend automated deletion for relevant data
- Document scope of legal hold
- Resume deletion when hold lifted
- Legal hold overrides standard retention

### 10.2 Security Incident

If data breach occurs:
- Preserve relevant logs and evidence
- Extend log retention as needed for investigation
- Document any retention changes
- Resume normal retention after investigation

### 10.3 Platform ToS Changes

If social media platforms update terms:
- Review impact on data retention
- Adjust retention periods if required
- Delete data if platform requires
- Document changes

---

## 11. Data Anonymization

### 11.1 When Used

Anonymization instead of deletion for:
- Financial records (legal requirement)
- Aggregated analytics
- Research purposes (with consent)

### 11.2 Anonymization Standards

| Original Data | Anonymized Form |
|---------------|-----------------|
| Email | Hash or null |
| Name | "Deleted User" or null |
| IP Address | Null |
| User ID references | Preserved for analytics integrity |

### 11.3 Irreversibility

Anonymization must be irreversible:
- Remove all direct identifiers
- Ensure no re-identification possible
- Document anonymization process

---

## 12. Monitoring and Compliance

### 12.1 Retention Metrics

Track monthly:
- Volume of data deleted by automated jobs
- User deletion requests received/completed
- Third-party author removal requests
- Data export requests

### 12.2 Compliance Audits

Annually verify:
- Automated deletion jobs running correctly
- No data exceeds retention periods
- Deletion requests processed within SLA
- Exclusion list properly maintained

### 12.3 Exception Reporting

Document any exceptions:
- Data retained beyond standard period
- Deletion requests denied (with reason)
- Legal holds in effect

---

## 13. Roles and Responsibilities

| Role | Responsibilities |
|------|------------------|
| **Founder/CEO** | Policy approval; legal hold decisions; exception approval |
| **Technical Operations** | Implement automated deletion; process requests; maintain systems |

---

## 14. Policy Violations

Failure to comply with this policy may result in:
- Regulatory penalties (GDPR fines up to 4% of revenue)
- Legal liability
- Reputational damage
- Platform API access revocation

---

## 15. Related Policies

- Information Security Policy
- Privacy Policy (customer-facing)
- Terms of Service
- Incident Response Plan

---

## 16. Contact Information

**Data Deletion Requests:** privacy@civicvoices.ai
**General Inquiries:** support@civicvoices.ai

**Response SLA:**
- Acknowledgment: 48 hours
- Completion: 30 days

---

## Appendix A: Retention Schedule Summary

| Data Category | Retention | Trigger | Method |
|---------------|-----------|---------|--------|
| Social media posts | 90 days | From collection date | Automated |
| Searches | 90 days | From last access | Automated |
| Reports | 1 year | From creation | Automated |
| Share tokens | 30 days or expiry | From creation | Automated |
| Account data | Account deletion + 30 days | User request | Manual |
| Financial records | 7 years | From transaction | Anonymization |
| Application logs | 90 days | From log date | Log rotation |
| Security logs | 1 year | From log date | Log rotation |

---

## Document History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | January 2025 | Founder/CEO | Initial policy |
