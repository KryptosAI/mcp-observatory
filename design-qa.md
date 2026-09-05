# Design QA — Logo-led landing-page credibility

**Source visual truth**

- Selected light landing-page style: `/Users/williamweishuhn/Documents/Codex/2026-09-01/an/outputs/mcp-observatory-business-polish/public-home-1100x900.png`
- Source pixels: 1100 × 900 at 1× density.

**Rendered implementation**

- Local route: `http://127.0.0.1:4177/`
- Desktop capture: `/Users/williamweishuhn/Documents/Codex/2026-09-01/an/outputs/mcp-observatory-business-polish/public-home-logo-wall-final-1100x900.png`
- Desktop pixels and CSS viewport: 1100 × 900 at 1× density.
- Mobile capture: `/Users/williamweishuhn/Documents/Codex/2026-09-01/an/outputs/mcp-observatory-business-polish/public-logo-wall-final-390x844.png`
- Mobile pixels and CSS viewport: 390 × 844 at 1× density.
- Tablet capture: `/Users/williamweishuhn/Documents/Codex/2026-09-01/an/outputs/mcp-observatory-business-polish/public-logo-wall-final-901x900.png`
- Tablet pixels and CSS viewport: 901 × 900 at 1× density.
- Density normalization: none required; source and primary implementation capture have identical pixel and CSS dimensions.
- State: unauthenticated homepage at initial load, followed by the credibility section immediately below the hero.

**Comparison evidence**

- Full-view, same-viewport comparison: `/Users/williamweishuhn/Documents/Codex/2026-09-01/an/outputs/mcp-observatory-business-polish/public-home-logo-final-comparison-1100x900.png`
- Focused, same-viewport credibility-region comparison: `/Users/williamweishuhn/Documents/Codex/2026-09-01/an/outputs/mcp-observatory-business-polish/public-logo-proof-final-focused-comparison.png`
- Detailed implementation capture for all evidence-card assets and labels: `/Users/williamweishuhn/Documents/Codex/2026-09-01/an/outputs/mcp-observatory-business-polish/public-logo-wall-final-focus-1100x900.png`

**Findings**

- No actionable P0, P1, or P2 findings remain.
- Fonts and typography: the implementation retains the source's Roboto/system typography, weights, letter spacing, and hierarchy. The new eyebrow, heading, metric, brand, and target-label sizes remain clearly distinct without crowding.
- Spacing and layout rhythm: the hero is unchanged. The proof row aligns three organization marks on desktop, uses a balanced three-column evidence grid at tablet widths, and becomes a two-column evidence grid on mobile. Borders, radii, elevation, and section rhythm match the selected landing-page system.
- Colors and visual tokens: the light surface palette and existing Material-derived tokens are preserved. Brand SVGs use their source colors, while borders, hover states, and focus treatment use existing site tokens.
- Image quality and asset fidelity: all 21 visible marks use real local SVG assets. Fifteen new technology assets are generated from pinned Simple Icons 16.29.0 source data; no inline SVG, CSS drawing, emoji, or placeholder substitutes are used. All logo images loaded successfully in Chrome.
- Copy and content: the requested `Used by developers at` proof names Accenture, Cisco, and Oracle. The previous long disclosure is absent. Each technology card now names the exact MCP target behind its logo, including distinctions such as Google → Chrome DevTools MCP and Cloudflare → Anthropic Cloudflare MCP server.
- Accessibility and interaction: organization and technology groups use list semantics; organization images have useful alt text; decorative technology images are hidden from assistive technology; each evidence link has an exact target-specific accessible name; global focus-visible treatment and reduced-motion handling apply. The smallest mobile evidence card measured 175 × 142 CSS pixels. Chrome reported zero horizontal overflow at 390, 901, and 1100 CSS pixels. Clicking the Microsoft card successfully opened `/safety-index/servers/clarity-server.html`.

**Comparison history**

- Earlier P2: mobile-only organization-grid rules were outside their media query, stacking the three employer logos on desktop. Fix: moved those rules into `@media(max-width:600px)`. Post-fix evidence: the final 1100 × 900 comparison shows one balanced horizontal employer row.
- Earlier P2: generic `Published evidence` subtitles made the relationship between some brands and evaluated targets unclear. Fix: derive the visible subtitle, tooltip, and accessible label from canonical Safety Index target metadata and add table-driven brand-to-target tests. Post-fix evidence: the final focused desktop capture shows the exact target under every visible brand.
- Earlier P2: the first responsive refinement produced a five-plus-one card arrangement at 901px. Fix: use six columns on wide desktop, three from 601–1024px, and two at 600px and below. Post-fix evidence: the 901 × 900 capture shows two balanced rows of three cards with no overflow.

**Open Questions**

- None.

**Implementation Checklist**

- [x] Preserve the selected light landing-page design.
- [x] Restore the three telemetry-supported organization marks.
- [x] Add 18 prominent, evidence-linked technology marks.
- [x] Make every technology relationship inspectable through an exact report link and target label.
- [x] Verify desktop, tablet, and mobile layout, assets, accessibility, and interaction.
- [x] Run the full repository validation suite.

**Follow-up Polish**

- No P3 polish is required before handoff.

final result: passed
