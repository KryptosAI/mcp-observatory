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
