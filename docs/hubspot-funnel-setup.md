# HubSpot Funnel Setup

This guide configures the public site without placing credentials in the repository. `dashboard/lead-config.js` contains only public portal, form, and meeting identifiers.

## Buyer form

Create a HubSpot form named `MCP Release Gate Pilot request` with standard `email`, `company`, and `job_function` properties plus these custom properties: `company_domain`, `mcp_deployment_status`, `critical_mcp_servers`, `decision_timing`, `decision_owner`, `decision_context`, `lead_type`, `first_touch_url`, `last_touch_url`, `referrer_url`, `partner_referral_source`, `utm_source`, `utm_medium`, `utm_campaign`, `utm_term`, and `utm_content`.

Use values matching the public form: `exploring`, `pre_production`, `production`; `1`, `2_3`, `4_plus`; `within_30_days`, `within_60_days`, `later`; and `confirmed`, `introduce`, `unknown`.

## Partner form

Create `MCP Observatory partner deal registration` with `email`, `company`, `company_domain`, `job_function`, `partner_firm_type`, `decision_timing`, `partner_decision_context`, `lead_type`, and the same attribution properties.

## Meeting and pipeline

Connect the founder calendar, create a 20-minute one-on-one scheduling page called `MCP Release Gate fit call`, and copy its public link. Create deal stages: `new`, `qualified`, `meeting-booked`, `meeting-held`, `proposal`, `deposit`, `paid-pilot`, `nurture`, and `closed-lost`. The founder owns new and qualified records and replies within one business day.

## Publish identifiers

Set `hubspotPortalId`, `buyerFormId`, `partnerFormId`, and `meetingUrl` in `dashboard/lead-config.js`, deploy, and submit one test record for each form. Confirm the contact, attribution properties, and pipeline record appear in HubSpot. Do not add API keys or private tokens to this repository.
