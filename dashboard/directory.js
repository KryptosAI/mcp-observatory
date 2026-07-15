(() => {
  const cards = [...document.querySelectorAll(".server-card")];
  const search = document.querySelector("#server-search");
  const category = document.querySelector("#category-filter");
  const status = document.querySelector("#directory-status");
  const showMore = document.querySelector("#show-more");
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
