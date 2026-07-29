(() => {
  const config = window.MCP_OBSERVATORY_LEADS || {};
  const freeEmailDomains = new Set(["gmail.com", "googlemail.com", "yahoo.com", "outlook.com", "hotmail.com", "icloud.com", "proton.me", "protonmail.com"]);
  const query = new URLSearchParams(window.location.search);
  const attributionKeys = ["utm_source", "utm_medium", "utm_campaign", "utm_term", "utm_content"];

  if (!sessionStorage.getItem("mcp_observatory_first_touch_url")) {
    sessionStorage.setItem("mcp_observatory_first_touch_url", window.location.href);
  }

  const escapeHtml = value => String(value).replace(/[&<>'"]/g, char => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" }[char]));
  const leadIsQualified = values => {
    const domain = String(values.company_domain || "").toLowerCase().trim();
    const emailParts = String(values.email || "").split("@");
    const emailDomain = emailParts[emailParts.length - 1].toLowerCase();
    return values.mcp_deployment_status !== "exploring"
      && values.decision_timing !== "later"
      && values.decision_owner === "confirmed"
      && domain.includes(".")
      && !freeEmailDomains.has(emailDomain);
  };
  const formIdFor = kind => kind === "buyer" ? config.buyerFormId : config.partnerFormId;
  const readyForHubSpot = kind => Boolean(config.hubspotPortalId && formIdFor(kind));

  document.querySelectorAll("form[data-lead-form]").forEach(form => {
    const status = form.querySelector("[data-form-status]");
    form.addEventListener("submit", async event => {
      event.preventDefault();
      const kind = form.dataset.leadKind;
      const raw = Object.fromEntries(new FormData(form).entries());
      attributionKeys.forEach(key => { raw[key] = query.get(key) || ""; });
      raw.first_touch_url = sessionStorage.getItem("mcp_observatory_first_touch_url") || window.location.href;
      raw.last_touch_url = window.location.href;
      raw.referrer_url = document.referrer || "direct";
      raw.partner_referral_source = query.get("partner") || raw.partner_referral_source || "";
      const qualified = kind === "buyer" && leadIsQualified(raw);
      const button = form.querySelector("button[type=submit]");
      button.disabled = true;
      button.textContent = "Sending…";

      try {
        if (readyForHubSpot(kind)) {
          const fields = Object.entries(raw).filter(([, value]) => value !== "").map(([name, value]) => ({ name, value: String(value) }));
          const hutkMatch = document.cookie.match(/hubspotutk=([^;]+)/);
          const response = await fetch(`https://api.hsforms.com/submissions/v3/integration/submit/${config.hubspotPortalId}/${formIdFor(kind)}`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ fields, context: { pageUri: window.location.href, pageName: document.title, hutk: hutkMatch ? hutkMatch[1] : undefined } }),
          });
          if (!response.ok) throw new Error("HubSpot submission failed");
        } else {
          const subject = kind === "buyer" ? "MCP Release Gate Pilot request" : "MCP Observatory partner deal registration";
          const body = Object.entries(raw).filter(([, value]) => value).map(([key, value]) => `${key}: ${value}`).join("\n");
          window.location.href = `mailto:${config.fallbackEmail}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
        }
        form.hidden = true;
        const next = qualified && config.meetingUrl
          ? `<a class="button primary" href="${escapeHtml(config.meetingUrl)}">Book your 20-minute fit call ↗</a><p>Choose a time now. We will review your context before the call.</p>`
          : "<p>Thank you. We will review the request and reply within one business day. Please do not send credentials, private URLs, or source code until we agree the scope.</p>";
        status.hidden = false;
        status.innerHTML = `<h3>Request received.</h3>${next}`;
      } catch {
        button.disabled = false;
        button.textContent = kind === "buyer" ? "Request the pilot" : "Register the opportunity";
        status.hidden = false;
        status.textContent = "We could not submit the form. Please try again or email us using the contact link below.";
      }
    });
  });
})();
