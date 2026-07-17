# Incident Response Plan

## Severity Levels

| Level | Definition | Response Time |
|---|---|---|
| Sev 1 | Data breach, auth bypass, token exposure | Immediate (< 1 hour) |
| Sev 2 | Service degradation, elevated error rates | < 4 hours |
| Sev 3 | Non-critical bug, cosmetic issue | Next business day |

## Response Process

### 1. Detection
- Cloudflare Workers observability (error rate, latency)
- GitHub Dependabot alerts
- User reports via GitHub Issues or email

### 2. Containment
- **Sev 1/2**: Rotate affected secrets immediately via `wrangler secret put`. Deploy emergency fix or rollback to last known good version.
- **API Worker**: Rollback via `wrangler rollback` or redeploy previous commit.
- **Telemetry Worker**: Same rollback procedure.

### 3. Investigation
- Review Cloudflare Worker logs for the incident window
- Examine git history for recent changes
- Check Dependabot alerts for related CVEs
- Document findings in a post-mortem

### 4. Remediation
- Deploy fix through the standard change management process
- Add regression tests to prevent recurrence
- Update threat model if new attack vector discovered

### 5. Notification
- **Sev 1**: Notify affected customers within 24 hours. Include: what happened, what data was affected, what actions we took, what customers should do.
- **Sev 2**: Notify affected customers within 72 hours if service impact.
- Public disclosure via GitHub Security Advisory if appropriate.

## Contact

Security incidents: `william@banksey.com`
GitHub: https://github.com/KryptosAI/mcp-observatory/security
