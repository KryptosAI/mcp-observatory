# Self-Assessment: mcp-observatory scans itself

**This project dogfoods its own security scanner.** We run mcp-observatory
against its own MCP server surface and publish the unedited results — including
the findings that make us look bad — because a trust tool that will not scan
itself should not be trusted to scan you.

- **Scan date:** 2026-07-22
- **Scanner:** mcp-observatory v1.33.1 (this repository, `npx tsx src/cli.ts`)
- **Target:** `@kryptosai/mcp-observatory serve` from npm (v1.31.0), stdio transport
- **SARIF report:** [self-assessment.sarif](./self-assessment.sarif) (SARIF 2.1.0, 22 results, ready for GitHub Code Scanning)

## Headline result

| Metric | Result |
| --- | --- |
| Health score | **63/100 (D)** |
| Gate | **fail** |
| Action receipt | **quarantine** |
| Surface | 13 tools, 0 prompts, 0 resources |
| Checks | 2 pass, 2 partial, 2 unsupported, **2 fail** |
| Security findings | **7 HIGH**, 0 medium, 0 low (+ 5 schema-quality info) |
| Performance | Connect 586ms, p95 latency 541ms (score run) |

### Score breakdown (score run)

| Dimension | Score | Weight |
| --- | --- | --- |
| Protocol Compliance | 100 | 30% |
| Schema Quality | 60 | 20% |
| Security | **0** | 20% |
| Reliability | 65 | 20% |
| Performance | 80 | 10% |

### Check results (test run)

| Check | Status |
| --- | --- |
| tools | pass (13/13 listed) |
| conformance | pass (7/7 diagnostics pass) |
| prompts | unsupported (not advertised — skipped) |
| resources | unsupported (not advertised — skipped) |
| schema-quality | partial (5 info) |
| runtime-profile | partial (0 egress, 40 state mutations) |
| security-lite | **fail (5 HIGH)** |
| attack-sim | **fail (2 HIGH)** |

## What was found

### HIGH — `shell-injection` (security-lite, 5 findings)

The tools `check_server`, `score_server`, `record`, `verify`, and `watch` each
expose a `command` parameter that may allow arbitrary command execution.

### HIGH — `attack-sim/permission-boundary/broad-destructive-tool` (2 findings)

`check_server` and `watch` combine a broad `command` parameter with
destructive / non-read-only behavior. Scanner recommendation: *constrain with
typed inputs, allowlists, explicit read-only/destructive annotations, and a
harmless CI fixture* — recommended action **quarantine**.

### Info — schema quality (5 findings)

`scan`, `suggest_servers`, `lock_verify`, `get_history`, and `ci_report`
declare properties but no `required` array.

### Runtime profile

0 egress targets; 40 high-confidence state mutations (almost entirely
filesystem writes in the working directory — run artifacts, lock files, and
history — which is the product doing exactly what it says it does).

### MEDIUM findings

None.

## What we did about it

**Flagged as a known, by-design issue — with a mitigation path, not a waiver.**

The HIGH findings are true positives, and we are keeping them. Executing
arbitrary server commands *is the product's function*: `check_server({
command: 'npx -y some-mcp-server' })` must spawn that command to test it. A
scanner that cannot launch servers cannot scan them. Removing the `command`
parameter would remove the product.

What this self-scan actually proves is the point of the product: **powerful
MCP tools need runtime policy, not blind trust.** Our own server's action
receipt is `quarantine`, and we agree with it. Nobody — including us — should
run this server's mutating tools without enforcement. That is exactly why the
scanner tells every user, including us, to run:

```bash
npx @kryptosai/mcp-observatory enforce npx -y @kryptosai/mcp-observatory serve
```

which generates a seatbelt policy and proxies the server with least-privilege
controls (see [Works with mcp-seatbelt](../README.md#works-with-mcp-seatbelt)).

Concrete actions taken:

1. **Published this assessment and the raw SARIF** instead of quietly passing
   ourselves.
2. **Kept the findings open as known issues.** The shell-injection and
   broad-destructive-tool findings stand until the tools gain typed input
   constraints and explicit destructive annotations; the scanner's
   recommendation text is our remediation spec.
3. **Schema-quality info findings queued as fixable.** Adding explicit
   `required` arrays to the five flagged tool schemas is a mechanical fix
   tracked for an upcoming release.
4. **Recommend enforcement for all deployments**, including our own dogfood
   target, per the action receipt.

## Reproduce

```bash
# Health score
npx @kryptosai/mcp-observatory score npx -y @kryptosai/mcp-observatory serve

# Full check suite
npx @kryptosai/mcp-observatory test npx -y @kryptosai/mcp-observatory serve

# SARIF for GitHub Code Scanning
npx @kryptosai/mcp-observatory test npx -y @kryptosai/mcp-observatory serve --sarif self-assessment.sarif
```

> Note: the scan target must be the MCP server surface (`... serve`), not the
> bare CLI. The bare `npx -y @kryptosai/mcp-observatory` command runs a scan
> of *your* local agent configs and exits — it is not an MCP server, and
> (correctly) fails handshake as a scan target.

## Why we publish a failing grade

A D grade with an explanation is worth more than an A with none. Every claim
this product makes about other servers — this server is powerful, this server
mutates state, this server needs a seatbelt policy — is a claim we now make
about ourselves, in public, with the evidence artifact attached. If the score
improves, the improvement will be visible here. If it regresses, that will be
visible too.
