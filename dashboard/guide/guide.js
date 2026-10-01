(() => {
const input = document.querySelector('#guide-search');
const topics = [...document.querySelectorAll('[data-guide-topic]')];
const apply = () => {
 const query = input.value.trim().toLowerCase();
 let visible = 0;
 for (const topic of topics) { const show = topic.textContent.toLowerCase().includes(query); topic.hidden = !show; if (show) visible++; }
 document.querySelector('#guide-count').textContent = `${visible} ${visible === 1 ? 'workflow' : 'workflows'}`;
 document.querySelector('#guide-empty').hidden = visible !== 0;
};
input.addEventListener('input', apply);
document.querySelectorAll('.guide-menu a[href^="#"]').forEach(link => link.addEventListener('click', () => { input.value = ''; apply(); }));
})();
// Keep the contents list oriented to the section currently being read.
(() => {
 const sections = [...document.querySelectorAll('[data-guide-topic], #samples')];
 const links = [...document.querySelectorAll('.guide-menu a[href^="#"]')];
 const mark = id => links.forEach(link => {
  if (link.hash === `#${id}`) link.setAttribute('aria-current', 'location');
  else link.removeAttribute('aria-current');
 });
 if (!('IntersectionObserver' in window)) return;
 const visible = new Set();
 const observer = new IntersectionObserver(entries => {
  entries.forEach(entry => entry.isIntersecting ? visible.add(entry.target) : visible.delete(entry.target));
  const first = sections.find(section => !section.hidden && visible.has(section) && section.getBoundingClientRect().bottom > 120);
  if (first) mark(first.id);
 }, { rootMargin: '-24px 0px -45% 0px' });
 sections.forEach(section => observer.observe(section));
})();
