async function getJson(url) {
  const res = await fetch(url);
  return res.json();
}

function formatCurrency(value) {
  return new Intl.NumberFormat('en-ZA', { style: 'currency', currency: 'ZAR', maximumFractionDigits: 0 }).format(value || 0);
}

function renderDeals(deals) {
  const el = document.getElementById('deals');
  el.innerHTML = deals.map(d => `
    <div class="item">
      <h3>${d.company} — ${d.title}</h3>
      <div class="meta">Stage: ${d.stage}</div>
      <div class="meta">Value: ${formatCurrency(d.value)}</div>
      <div class="meta">Next action: ${d.nextAction}</div>
      ${d.notes ? `<p>${d.notes}</p>` : ''}
    </div>
  `).join('');
}

function renderSignals(signals) {
  const el = document.getElementById('signals');
  el.innerHTML = signals.map(s => `
    <div class="item">
      <h3>${s.company}</h3>
      <div class="meta">${s.signal}</div>
      <div class="meta">Confidence: ${s.confidence}%</div>
    </div>
  `).join('');
}

function renderPosts(posts) {
  const el = document.getElementById('posts');
  el.innerHTML = posts.map(p => `
    <div class="item">
      <h3>${p.title}</h3>
      <p>${p.content}</p>
    </div>
  `).join('');
}

async function load() {
  const [deals, signals, posts] = await Promise.all([
    getJson('/api/deals'),
    getJson('/api/signals'),
    getJson('/api/posts')
  ]);
  renderDeals(deals);
  renderSignals(signals);
  renderPosts(posts);
}

const modal = document.getElementById('dealModal');
document.getElementById('openFormBtn').addEventListener('click', () => modal.classList.remove('hidden'));
document.getElementById('closeFormBtn').addEventListener('click', () => modal.classList.add('hidden'));

document.getElementById('dealForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const form = new FormData(e.target);
  const body = Object.fromEntries(form.entries());

  await fetch('/api/deals', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });

  e.target.reset();
  modal.classList.add('hidden');
  load();
});

load();
