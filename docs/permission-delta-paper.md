---
title: "Permission Deltas: A Consent-Relative Model for Tool Schema Changes"
author: "William Weishuhn"
date: "Research draft, revised 6 September 2026"
---

# Abstract {.unnumbered}

An input-compatible tool update can admit requests absent from its previous
contract. We study a consent-relative abstraction of this change: projections
onto selected field names, together with realizable enum-advertised mutation
atoms. These sets describe declared requests, not the server's actual authority.
A four-sign classifier reports widening, narrowing, neutral changes, or a need
for review. For a specified flat object fragment, we give pen-and-paper
arguments that widening has a constructive witness and that admitting only
neutral and narrowing updates preserves the abstract baseline grant.
The implementation passes a 2,048-pair single-field model and a new
114,244-pair two-field model using an independent JSON Schema validator.
Sixteen authored fixtures and two selected, source-pinned release cases
illustrate its behavior. On seven authored pairs and both release cases,
mcp-diff 0.1.0 reports no breaking or warning changes while this policy
escalates. These are differences between decision procedures, not measured
security misses. The revised artifact corrects a mutation-witness defect,
an unsatisfiable-schema definition, and an inaccurate release extraction.

# Motivation and scope

MCP exposes named tools with input schemas and allows servers to notify clients
that their tool list has changed. The protocol also requires server-side access
controls; a schema is not itself an authorization mechanism [@mcp-tools].

Consider a declared field named *mode*, initially restricted to *read*.
Adding *write* can preserve every previously valid input while changing what
the model can request. Conversely, adding a required parser field such as
*format* can invalidate old inputs without adding a selected permission
coordinate. Compatibility and the abstraction studied here can therefore
order an update differently.

We implement an advisory schema comparison and an optional CLI gate. We do
not implement a permission system, infer arbitrary server behavior, prove that
a release is malicious, or establish that a schema-valid request succeeds.
A field called *format* might control deletion in the actual implementation;
our default name predicate would not capture that meaning. An unchanged schema
can accompany arbitrary behavior changes.

The contribution is a precise, limited model and a tested implementation of
its update rules. Novelty relative to the full literature, ecosystem detection
accuracy, and operational effectiveness are not established by this artifact.

# Abstract request grants

## Supported object fragment

Let $\mathcal J$ be finite JSON values representable by the implementation and
$\mathcal O$ its JSON objects. Comparisons operate on object arguments.
A schema $S$ consists of a finite declared field set $F_S$, property domains
$D_S(f)$, required fields $R_S\subseteq F_S$, and an open/closed flag.

Each property domain is a JSON type or nonempty union of types, optionally
intersected with a finite enum. Missing type denotes all represented JSON
types; missing enum imposes no finite restriction. The empty enum denotes an
empty domain. Integer values are included in the number type. Structured enum
values use structural equality. JSON numbers outside the runtime's faithful
numeric representation are not covered.

An object $v$ is accepted exactly when:

1. Every field in $R_S$ occurs in $v$.
2. Each declared field occurring in $v$ has a value in $D_S(f)$.
3. A closed schema has no undeclared fields in $v$.

Write this set as $A(S)$. The schema is satisfiable iff every required
property domain is nonempty; optional empty domains are permitted.
Absent *additionalProperties* means open. An absent root type is interpreted
on the object-only argument domain, not as containment over arbitrary JSON.

These rules follow the relevant JSON Schema assertions [@json-validation;
@json-core]. We treat descriptions, titles, defaults, examples, and the
recognized annotation keywords as non-asserting. A default does not fill in a
missing value during this analysis. The implementation also ignores *x-*
extension keywords; the model assumes they carry no validation semantics.

Nested validation, combinators, references, patterns, numeric/string bounds,
dependent constraints, schema-valued additional properties, and unsupported
keywords route a changed contract to review. Object and array *values* remain
supported through unconstrained types or finite enums. Malformed schemas and
prototype-sensitive property names are also reviewed. Identical serialized
schemas are skipped even if outside the fragment; this is absence of observed
change, not validation of those schemas.

## Fixed predicates and two components

Fix a field predicate $\lambda(f)$ and value predicate $\mu(e)$ for an approval
epoch. The projection $\pi_\lambda(v)$ retains exactly the fields whose names
satisfy $\lambda$. Define the projected request surface
$$
P_\lambda(S)=\{\pi_\lambda(v):v\in A(S)\}.
$$

Let $E_S(f)$ denote an explicitly present enum. Define **realizable advertised
mutation atoms** by
$$
M_\mu(S)=\{(f,e): e\in E_S(f),\ \mu(e),\
                 \exists v\in A(S)\text{ with }v[f]=e\}.
$$
An atom requires an accepted complete request, not just a locally type-valid
enum constant. Consequently an unsatisfiable schema has both components empty.
An unconstrained string field contributes no enum-advertised atom merely
because it could accept the string *write*.

The abstract grant and its order are
$$
G(S)=(P_\lambda(S),M_\mu(S)),\qquad
(P,M)\leq(P',M')\ \Longleftrightarrow\ P\subseteq P'\land M\subseteq M'.
$$
This is a deliberately chosen abstraction. It is not a claim that approving
an MCP connection automatically grants these sets in an operating system or
authorization service.

For the closed object whose only field is insensitive *format*, changing its
enum from *read* to *read,write* leaves the projection set equal to
$\{\{\}\}$ but adds $(\texttt{format},\texttt{write})$ to $M_\mu$.
The separate component captures this policy choice without making all enum
fields sensitive.

## Implemented predicate instance

The implementation uses a case-insensitive substring regex with 25 alternatives:
allow, allowlist, command, cmd, directory, dir, endpoint, exec, file, filename,
filepath, host, mode, namespace, path, permission, role, root, scope, secret,
shell, token, uri, url, workspace.

The mutation predicate accepts strings whose lowercase form is one of:
append, create, delete, execute, modify, mutate, patch, post, put, remove,
run, send, update, upload, write.
Atoms retain the original value: *write* and *WRITE* are distinct values,
although both satisfy the predicate. These predicates are fixed in source,
not configurable through the current classifier API.

A fresh sensitive name always exists outside a finite declared field set for
this regex. The witness builder starts at $\texttt{permission\_delta\_secret}$
and appends $\texttt{\_secret}$ until the name is absent from both endpoints.
Generalizing the arguments to another predicate requires a corresponding
fresh-name construction. Changing predicates invalidates an approval epoch.

# Classification and enforcement

The classifier examines contract names first. Added names require review;
removed names are narrowing. A malformed surviving contract or unsupported
changed schema requires review. For supported schemas, it handles
satisfiability before individual edits: impossible-to-possible is widening,
possible-to-impossible is narrowing, and impossible-to-impossible is neutral.

For two satisfiable endpoints, its rules are:

| Change | Result |
|:--|:--|
| Closed object becomes open | Widening with a fresh sensitive-key witness |
| Open object becomes closed | Narrowing |
| Required sensitive field becomes optional | Widening with an omitted-field witness |
| Optional field becomes required | Narrowing |
| Add/remove a sensitive field or mutation-bearing coordinate | Review |
| Add required insensitive, non-mutating field | Narrowing |
| Add optional or remove insensitive, non-mutating field | Neutral |
| Enum keyword appears or disappears | Review |
| Add an effective sensitive or mutating enum value | Widening |
| Remove an effective sensitive or mutating enum value | Narrowing |
| Change only insensitive, pure enum values | Neutral |
| Type change makes an explicit mutation value valid | Widening |
| Type change removes projected or mutation values | Narrowing |
| Sensitive type gains values without a widening rule | Review |
| Other insensitive carrier changes | Neutral |

Requiredness, enum, and type edits are inspected independently. A single
release may receive multiple signs. Rotation can remove one value and add
another; widening means **non-containment of the new grant**, not that the
entire old grant is a strict subset of the new one.
Narrowing labels include compatibility contractions that leave the abstract
grant equal. Review means the procedure abstains or invokes policy;
it is not a mathematical undecidability claim.

The CLI command below exits unsuccessfully if any entry is widening or review:

    mcp-observatory diff baseline.json current.json \
      --fail-on-permission-delta review

The *widening* threshold permits review-class changes and therefore does not
implement the preservation policy below. Without the flag, results are
advisory. The CLI does not itself stop a server or collect renewed consent;
the calling host or CI workflow must enforce its decision.

# Correctness arguments for the fragment

These are pen-and-paper arguments about the specified abstraction and rules.
They are not a proof-assistant verification of the TypeScript program. They
assume complete, accurately paired contract sets; represented finite JSON
values; fixed predicates; and the stated annotation/object semantics.

## Product lemma

For a satisfiable flat schema, constraints on different declared coordinates
are independent. A projected object is realizable iff its sensitive
coordinates satisfy their domains and requiredness, its undeclared sensitive
keys respect closedness, and every required insensitive coordinate can be
filled from its nonempty domain. Optional insensitive coordinates may be
omitted. Moreover $(f,e)\in M_\mu(S)$ iff the schema is satisfiable, the
field explicitly enumerates $e$, the value satisfies its type, and $\mu(e)$.
Fill all other required fields independently to establish the reverse
implication. For an unsatisfiable schema both sets are empty.

## Proposition 1: constructive widening

Every widening entry for supported endpoints has an object accepted by the
head and rejected by the base, demonstrating a new projection or mutation atom.

*Impossible-to-possible:* any head witness projects to an element of a
nonempty set; the base projection set is empty.

*Closed-to-open:* add a fresh sensitive field to a valid head request.
Its projection cannot be realized by the closed base.

*Required-to-optional sensitive field:* omit that field and fill the head's
remaining required fields. No base request can realize the resulting
projection, which lacks a base-required sensitive coordinate.

*Enum or carrier widening:* select a newly valid sensitive value, or an
explicit newly valid mutation value when the field is insensitive. In the
former case its projected coordinate is impossible in the base. In the
latter case its mutation atom is absent from the base. Fill the other
head-required fields using the product lemma.

These arguments use the actual endpoints. Simultaneous contractions on other
coordinates do not invalidate a witness built from the head. A newly
unsatisfiable head is handled earlier and receives no widening entry.

## Proposition 2: admitted updates do not expand the grant

If the classifier emits no widening or review entry for supported endpoints,
then $G(S_{\rm head})\leq G(S_{\rm base})$.

An unsatisfiable head has the empty grant. An unsatisfiable base with a
satisfiable head would have emitted widening. Otherwise both endpoints are
satisfiable. The head cannot open a closed base, add/remove a sensitive
coordinate, make a required sensitive field optional, or gain an effective
sensitive value: each such edit emits widening or review. Thus every head
projection can be completed to a base request, filling any removed or changed
insensitive required coordinates from the base's nonempty domains.

For mutation atoms, enum presence cannot change without review. No newly
declared mutation coordinate can pass review, and no existing coordinate can
gain a type-valid mutating enum value without widening. Every realized head
atom therefore occurs in the base, by the product lemma. The two inclusions
establish the result directly, without assuming an ordering of intermediate
atomic edits that might become unsatisfiable.

## Proposition 3: neutral invariance

If the endpoints are supported and every emitted entry is neutral, or there
are no entries, their grants are equal. Both impossible endpoints give empty
grants. For satisfiable endpoints the previous argument gives one inclusion.
With no narrowing entries, neither closedness nor sensitive requiredness can
strengthen, and no effective sensitive value or mutation atom can disappear.
Edits confined to insensitive pure coordinates preserve realizability by the
product lemma. This gives the reverse inclusion. Syntactically identical
inputs have identical abstractions under the fixed semantics.

## Corollary: preservation within an approval epoch

Start with an approved abstract grant $G_0$. If each transition blocks widening
and review results and otherwise admits the head, Proposition 2 and transitivity
give $G_t\leq G_0$ for every admitted version. For a contract set, index both
components by contract name; removal contracts the set, while additions
require review. Renewed approval starts a **new** epoch with a new baseline;
it does not preserve containment in the old epoch automatically.

This corollary requires enforcement of every transition and trustworthy
contract identity/collection. It proves no corresponding inclusion between
the servers' actual side effects, credentials, or resource access.

## Implementation cost

The old draft's total linear-time claim is withdrawn. If there are $W$
widening records and $R$ required fields, materializing a complete request for
each witness can output $\Theta(WR)$ field occurrences, even with primitive
enums. Structured enum canonicalization also requires recursion and key
sorting. The implementation performs local domain comparisons rather than
general schema containment, but we report neither a linear bound for total
output nor a controlled performance benchmark.

# Validation and descriptive comparison

## Regression and finite-model checks

The retained one-field model checks 2,048 pairs: two field labels, endpoint
requiredness and closedness, two type carriers, and four enum configurations.

The added two-field model independently enumerates accepted requests using
AJV 8.20.0. Each of *path* and *format* is absent, or optional/required with
one of six domains: unconstrained; empty string enum; *read*; *read,png,write*;
number with enum *0,write*; or string/number with enum *0,write*.
Together with open/closed objects this gives 338 schemas and
$338^2=114{,}244$ ordered endpoint pairs.

The request grid contains absence, the empty string, *read*, *png*, *write*,
0, 0.5, false, null, an empty array, and an empty object for each coordinate,
plus an absent/present fresh sensitive key. AJV rejects an empty enum during
compilation, so the oracle replaces only that property schema with *false*,
which has the same empty-domain semantics. It uses no classifier domain helpers.

For every admitted pair it checks componentwise non-expansion, and for every
neutral-only pair it checks equality. Every widening witness is independently
checked for head acceptance, base rejection, and a new projection or realized
mutation atom. All pairs pass. The grid is finite: it is neither exhaustive
over all JSON nor a mechanized proof of the propositions.

This revision exposed and corrected two issues. The earlier mutation
definition counted optional *write* even when another required field made
every request impossible. Requiring whole-request realizability repairs that
definition. Separately, an insensitive enum expanding from *read* to
*read,png,write* previously returned a *png* witness; that showed new
acceptance but no new abstract atom. The implementation now selects *write*.
These are distinct changes to the model and implementation.

## Authored conformance fixtures

The 16 fixtures and expectations were authored with the rules. They all match
their expected sign presence: seven seeded scenarios, eight synthetic
coverage cases, and one enum rotation. They produce four widening, five
review, four narrowing, and seven neutral records; some pairs have multiple
records. They do not cover every possible rule or interaction.

| Highest-priority action | Authored pairs |
|:--|--:|
| Widening: would block | 4 |
| Review: would queue | 5 |
| Neutral/narrowing: pass | 7 |
| No records | 0 |

All 16 inputs change a contract. A binary-change policy would flag 16; the
review threshold flags 9 (43.75% fewer), and the widening-only threshold
flags 4 (75% fewer). These are routing counts for a constructed mixture, not
false-positive reductions. Widening-only also admits cases for which the
preservation argument supplies no guarantee.

## Selected release cases

Six upstream files were fetched at immutable commits and checked by SHA-256.
The extraction script runs the reviewed, hash-pinned Notion converter and
reads GitHub's released snapshots. Schema annotations and unused definitions
are removed; remaining converter/snapshot validation keywords are preserved.
The artifact contains only selected changed contracts, not complete release
inventories or captures from live servers.

**Notion v2.1.0 to v2.3.1.** The earlier OpenAPI document has no page-Markdown
path. The head converter generates retrieve and update operations, and its
proxy advertises them as *API-retrieve-page-markdown* and
*API-update-page-markdown*. Both additions produce review records.
The current extraction preserves the converter's format, defaults, nested
schemas, and anyOf string fallbacks; the old hand-written extraction did not
reproduce these details. The new-tool rule does not claim containment for
those nested schemas [@notion-parser; @notion-proxy].

**GitHub v0.7.0 to v0.8.0.** The released get-file-contents snapshots change
required fields from *owner,repo,path* to *owner,repo*, adding the default
slash to *path*. The associated source change confirms the intended root
default [@github-path]. The classifier emits widening, with *owner* and
*repo* present and *path* omitted. This is a schema acceptance witness;
the empty placeholder repository values need not correspond to a successful
API call. The case establishes a change in omission semantics, not a
vulnerability or a newly accessible resource.

## Pinned mcp-diff comparison

We ran the installed mcp-diff 0.1.0 classification engine, whose source hash
matches its published wheel [@mcp-diff]. Each subprocess checks both version
and module hash. The runner supplies empty tool descriptions to both sides
and compares the same normalized input schemas. It recomputes this
classifier's actions directly; it does not trust a stale result file.

| Pair | mcp-diff result | This policy |
|:--|:--|:--|
| rugpull-01: mode enum grows | Compatible | Widening |
| rugpull-02: closed object opens | Compatible | Widening |
| rugpull-03: required scope relaxed | Compatible | Widening |
| rugpull-04: token field added | Compatible | Review |
| multi-01: tool added | Compatible | Review |
| limit-01: enum rotation | Compatible | Widening |
| combo-02: multi-tool addition | Compatible | Review |
| Selected Notion additions | Compatible | Review |
| Selected GitHub path change | Compatible | Widening |

Here *compatible* means this pinned engine emitted neither breaking nor warning
records. It is not proof of acceptance-set containment. In particular, version
0.1.0 does not inspect enum values, additional-properties changes, or requiredness
changes on existing parameters. Its compatible result for the enum rotation
therefore also reflects implementation coverage, not merely opposite
mathematical orderings. New tools produce informational records, not an
identical result.

One authored pair goes the other way: adding required insensitive *format*
is breaking under mcp-diff and admitted with narrowing under this policy.
The source supports these version-specific observations; we make no claim
about newer versions or comparative security quality. All disagreements are
stored as descriptive outcomes, without the former "consent miss" label.

# Reproducibility and limitations

The source, commands, frozen inputs, hashes, baseline wheel pin, and extraction
procedure are documented in the corpus extraction runbook. The Markdown is the
canonical manuscript text; the LaTeX body is generated from it, and
named/anonymous-author PDFs share that body. The anonymous-author variant is
not certified to satisfy a particular venue's blind-review rules.

The theoretical guarantee is relative to the declared abstraction and trusted
update handling. It excludes schema-independent behavior, semantic meanings
not captured by the predicates, invalid collection/identity matching, arbitrary
JSON Schema, and unfaithfully represented numbers. Only a finite implementation
model was exhaustively checked. The two selected releases are illustrative,
and the authored suite has no independent labels. No detection accuracy,
ecosystem prevalence, user consent behavior, latency distribution, or ablation
effect has been measured.

A useful next research step is a preregistered, independently sampled release
corpus with separate labels for actual authorization effects and schema-level
request changes. Until then, the supported result is a reproducible abstract
change classifier with explicit review boundaries.
