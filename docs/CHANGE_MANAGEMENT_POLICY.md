# Change Management Policy

**Civic Voices, Inc.**
**Version:** 1.0
**Effective Date:** January 2025
**Last Reviewed:** January 2025
**Policy Owner:** Founder/CEO

---

## 1. Purpose

This policy establishes procedures for managing changes to Civic Voices' production systems, applications, and infrastructure to ensure changes are properly authorized, tested, and documented while minimizing risk to system availability and security.

---

## 2. Scope

This policy applies to all changes affecting:
- Production application code
- Database schema and configurations
- Infrastructure and hosting settings
- Third-party integrations and API configurations
- Security controls and access permissions
- Environment variables and secrets

---

## 3. Change Classification

| Category | Description | Examples | Approval Required |
|----------|-------------|----------|-------------------|
| **Standard** | Low-risk, routine changes following established procedures | Dependency updates, copy changes, bug fixes | Self-approved with code review |
| **Normal** | Changes requiring planning and testing | New features, API changes, schema migrations | Code review + testing |
| **Emergency** | Urgent changes to restore service or fix critical security issues | Security patches, production outages | Post-implementation review |

---

## 4. Change Management Process

### 4.1 Standard Change Workflow

```
1. Development
   └── Create feature branch from master
   └── Implement changes locally
   └── Write/update tests as needed

2. Code Review
   └── Create Pull Request
   └── Automated checks run (build, lint, type-check)
   └── Self-review for solo developer
   └── Document changes in PR description

3. Testing
   └── Verify locally in development environment
   └── Run automated tests (npm run test)
   └── Manual testing of affected features

4. Deployment
   └── Merge to master branch
   └── Vercel automatically deploys to production
   └── Monitor for errors post-deployment

5. Verification
   └── Verify production deployment successful
   └── Check error monitoring for issues
   └── Rollback if critical issues detected
```

### 4.2 Pull Request Requirements

Every PR must include:
- [ ] Clear description of changes
- [ ] Reason for the change
- [ ] Testing performed
- [ ] Breaking changes noted (if any)
- [ ] Database migration steps (if applicable)

### 4.3 Deployment Process

| Environment | Branch | Deployment Method | URL |
|-------------|--------|-------------------|-----|
| Production | master | Automatic via Vercel | civicvoices.ai |
| Preview | feature branches | Automatic via Vercel | *.vercel.app |

---

## 5. Database Changes

### 5.1 Schema Migration Process

1. **Create Migration**
   ```bash
   npx prisma migrate dev --name descriptive_name
   ```

2. **Review Migration SQL**
   - Check generated SQL in `prisma/migrations/`
   - Verify no data loss
   - Consider rollback strategy

3. **Test Migration**
   - Apply to development database
   - Verify application works correctly
   - Test rollback if possible

4. **Deploy Migration**
   ```bash
   npx prisma migrate deploy
   ```

5. **Verify Production**
   - Confirm migration applied successfully
   - Monitor for errors

### 5.2 High-Risk Database Changes

The following require additional caution:
- Dropping columns or tables
- Changing column types
- Adding NOT NULL constraints to existing columns
- Large data migrations

**Procedure for high-risk changes:**
1. Create backup before migration
2. Schedule during low-traffic period
3. Have rollback plan ready
4. Monitor closely after deployment

---

## 6. Emergency Changes

### 6.1 Definition

Emergency changes are required when:
- Production service is down or severely degraded
- Active security incident requires immediate patching
- Critical bug affecting customer data

### 6.2 Emergency Change Process

1. **Identify and Confirm**
   - Verify the issue requires emergency response
   - Document the incident

2. **Implement Fix**
   - Create minimal fix addressing the issue
   - Skip formal review if necessary
   - Deploy directly to production

3. **Post-Implementation Review**
   - Within 24 hours, document:
     - What caused the issue
     - What fix was applied
     - Why normal process was bypassed
     - Preventive measures for future

4. **Follow-Up**
   - Create proper PR with full changes
   - Update tests to catch similar issues
   - Update monitoring if needed

---

## 7. Rollback Procedures

### 7.1 Application Rollback

**Via Vercel Dashboard:**
1. Go to Vercel Dashboard → Deployments
2. Find last known good deployment
3. Click "..." → "Promote to Production"

**Via Git:**
```bash
git revert <commit-hash>
git push origin master
```

### 7.2 Database Rollback

**Prisma Migration Rollback:**
```bash
npx prisma migrate resolve --rolled-back <migration_name>
```

**Point-in-Time Recovery (if needed):**
- Contact Supabase support
- Restore from daily backup
- RPO: 24 hours maximum data loss

---

## 8. Environment Variables

### 8.1 Adding/Changing Environment Variables

1. Add to `.env.example` (without actual values)
2. Add to Vercel project settings
3. Document purpose in code comments
4. Redeploy application

### 8.2 Secret Rotation

| Secret Type | Rotation Frequency | Procedure |
|-------------|-------------------|-----------|
| API keys | Annually or on compromise | Generate new key, update Vercel, revoke old |
| Database password | Annually or on compromise | Update in Supabase, update DATABASE_URL |
| Webhook secrets | Annually or on compromise | Regenerate in provider, update Vercel |

---

## 9. Third-Party Integration Changes

### 9.1 Adding New Integrations

Before adding a new third-party service:
1. Review vendor security (SOC 2, privacy policy)
2. Document data shared with vendor
3. Add to vendor list in Information Security Policy
4. Configure with least-privilege access

### 9.2 Updating Integrations

- Review changelog for breaking changes
- Test in development environment
- Update API versions incrementally
- Monitor after deployment

---

## 10. Change Documentation

### 10.1 Required Documentation

All changes documented via:
- Git commit messages (conventional commits format)
- Pull Request descriptions
- CHANGELOG.md for significant releases

### 10.2 Commit Message Format

```
type(scope): description

Types: feat, fix, docs, style, refactor, test, chore, security
```

Examples:
- `feat(search): add TikTok platform support`
- `fix(auth): resolve session expiration bug`
- `security: update dependencies for CVE-2025-XXXX`

---

## 11. Change Freeze Periods

### 11.1 Scheduled Freezes

No production changes during:
- Major holidays (unless emergency)
- Scheduled maintenance windows
- During active incidents

### 11.2 Exceptions

Emergency changes may proceed during freeze periods with:
- Documentation of business justification
- Post-implementation review

---

## 12. Monitoring and Verification

### 12.1 Post-Deployment Checks

After every deployment:
- [ ] Verify deployment successful in Vercel
- [ ] Check application loads correctly
- [ ] Review error logs for new errors
- [ ] Test critical user flows if applicable

### 12.2 Monitoring Tools

| Tool | Purpose |
|------|---------|
| Vercel Analytics | Performance and errors |
| Vercel Logs | Application logs |
| Supabase Dashboard | Database health |
| Stripe Dashboard | Payment processing |

---

## 13. Roles and Responsibilities

| Role | Responsibilities |
|------|------------------|
| **Founder/CEO** | Approve high-risk changes; final authority on emergency changes |
| **Developer** | Implement changes following this policy; perform code review |

---

## 14. Policy Exceptions

Exceptions to this policy require:
- Written justification
- Risk assessment
- Founder/CEO approval
- Time-limited duration

---

## Document History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | January 2025 | Founder/CEO | Initial policy |
