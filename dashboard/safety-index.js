(() => {
  const table = document.querySelector("#serverTable");
  const search = document.querySelector("#search");
  const category = document.querySelector("#categoryFilter");
  const resultCount = document.querySelector("#resultCount");

  if (!table || !search || !category || !resultCount) return;

  const rows = Array.from(table.querySelectorAll("tr"));

  const filterTable = () => {
    const query = search.value.trim().toLowerCase();
    const activeCategory = category.value;
    let visible = 0;

    rows.forEach(row => {
      const rowCategory = row.dataset.category ?? "";
      const rowName = row.dataset.name ?? "";
      const rowPackage = row.dataset.package ?? "";
      const matchesCategory = !activeCategory || rowCategory === activeCategory;
      const matchesSearch = !query
        || rowName.toLowerCase().includes(query)
        || rowPackage.toLowerCase().includes(query)
        || rowCategory.toLowerCase().includes(query);

      row.hidden = !(matchesCategory && matchesSearch);
      if (!row.hidden) visible += 1;
    });

    resultCount.textContent = `Showing ${visible} of ${rows.length} servers`;
  };

  search.addEventListener("input", filterTable);
  category.addEventListener("change", filterTable);
})();
