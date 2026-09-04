(() => {
  const hero = document.querySelector("section.hero");
  if (hero) {
    const eyebrow = hero.querySelector(".eyebrow");
    const title = hero.querySelector("h1");
    const subtitle = hero.querySelector(".subtitle");
    const actions = hero.querySelector(".hero-actions");
    if (eyebrow) eyebrow.textContent = "AGENT WORKFLOW SAFETY";
    if (title) title.innerHTML = 'Is this agent <span>safe to ship?</span>';
    if (subtitle) {
      subtitle.textContent = "Your agents can call tools \u2014 GitHub, Slack, files, sometimes production. Those tools are small servers your team pasted into a config. MCP is just the name of the plug. Observatory checks them before the agent is allowed to connect.";
    }
    if (actions) {
      actions.innerHTML = '<a class="button primary" href="/safety-index/">See a scored tool \u2197</a><a class="button" href="https://www.npmjs.com/package/@kryptosai/mcp-observatory">Run a free scan \u2197</a>';
    }
    document.title = "MCP Observatory \u2014 Check the tools your agents can use";
  }

  const cards = [...document.querySelectorAll(".server-card")];
  const search = document.querySelector("#server-search");
  const category = document.querySelector("#category-filter");
  const status = document.querySelector("#directory-status");
  const showMore = document.querySelector("#show-more");
  if (!search || !category || !status || !showMore) return;
  let limit = 12;

  const render = () => {
    const query = search.value.trim().toLowerCase();
    const selectedCategory = category.value;
    const matches = cards.filter(card =>
      (!query || card.dataset.search.includes(query)) &&
      (!selectedCategory || card.dataset.category === selectedCategory)
    );
    cards.forEach(card => card.classList.add("is-hidden"));
    matches.slice(0, limit).forEach(card => card.classList.remove("is-hidden"));
    const shown = Math.min(limit, matches.length);
    status.textContent = matches.length === 0
      ? "No servers match those filters"
      : `Showing ${shown} of ${matches.length} matching servers`;
    showMore.hidden = shown >= matches.length;
  };

  search.addEventListener("input", () => { limit = 12; render(); });
  category.addEventListener("change", () => { limit = 12; render(); });
  showMore.addEventListener("click", () => { limit += 12; render(); });
  render();
})();
