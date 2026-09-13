(() => {
  "use strict";

  const endpoint = "https://app.mcp-observatory.com/api/v1/funnel";
  const allowedEvents = new Set(["profile_view", "scan_cta"]);
  const targetPattern = /^[a-z0-9][a-z0-9-]{0,127}$/;

  if (navigator.doNotTrack === "1" || window.doNotTrack === "1") return;

  function eventId() {
    return typeof crypto?.randomUUID === "function"
      ? crypto.randomUUID()
      : `${Date.now()}-${crypto.getRandomValues(new Uint32Array(1))[0]}`;
  }

  function send(name, targetId) {
    if (!allowedEvents.has(name) || !targetPattern.test(targetId || "")) return;
    const payload = JSON.stringify({ eventId: eventId(), event: name, targetId });
    const body = new Blob([payload], { type: "text/plain;charset=UTF-8" });
    if (navigator.sendBeacon?.(endpoint, body)) return;
    void fetch(endpoint, {
      method: "POST",
      body: payload,
      headers: { "Content-Type": "text/plain;charset=UTF-8" },
      keepalive: true,
      credentials: "omit",
    }).catch(() => undefined);
  }

  const page = document.body?.dataset.funnelPage;
  const targetId = document.body?.dataset.funnelTarget;
  if (page && targetId) send(page, targetId);

  document.addEventListener("click", event => {
    const trigger = event.target.closest("[data-funnel-event]");
    if (!(trigger instanceof HTMLElement)) return;
    send(trigger.dataset.funnelEvent || "", trigger.dataset.funnelTarget || "");
  });
})();
