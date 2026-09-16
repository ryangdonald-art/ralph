async function getJson(url, options) {
  const res = await fetch(url, options);
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || `Request failed: ${res.status}`);
  return data;
}

function formatCurrency(value) {
  return new Intl.NumberFormat('en-ZA', { style: 'currency', currency: 'ZAR', maximumFractionDigits: 0 }).format(value || 0);
}

function textElement(tag, className, text) {
  const el = document.createElement(tag);
  if (className) el.className = className;
  el.textContent = text == null ? '' : String(text);
  return el;
}

function itemContainer() {
  const el = document.createElement('div');
  el.className = 'item';
  return el;
}

function replaceChildren(container, children) {
  container.replaceChildren(...children);
}

function renderDeals(deals) {
  const items = deals.map((d) => {
    const item = itemContainer();
    item.append(
      textElement('h3', '', `${d.company} — ${d.title}`),
      textElement('div', 'meta', `Stage: ${d.stage}`),
      textElement('div', 'meta', `Value: ${formatCurrency(d.value)}`),
      textElement('div', 'meta', `Next action: ${d.nextAction}`)
    );
    if (d.notes) item.append(textElement('p', '', d.notes));
    return item;
  });
  replaceChildren(document.getElementById('deals'), items);
}

function renderSignals(signals) {
  const items = signals.map((s) => {
    const item = itemContainer();
    item.append(
      textElement('h3', '', s.company),
      textElement('div', 'meta', s.signal),
      textElement('div', 'meta', `Confidence: ${s.confidence}%`)
    );
    return item;
  });
  replaceChildren(document.getElementById('signals'), items);
}

function renderPosts(posts) {
  const items = posts.map((p) => {
    const item = itemContainer();
    item.append(
      textElement('h3', '', p.title),
      textElement('p', '', p.content)
    );
    return item;
  });
  replaceChildren(document.getElementById('posts'), items);
}

function showLoadError(error) {
  console.error('RALPH load error', error);
  const priorities = document.querySelector('.priority-list');
  if (priorities) {
    priorities.replaceChildren(textElement('li', '', 'RALPH could not load current data. Check system health.'));
  }
}

async function load() {
  try {
    const [deals, signals, posts] = await Promise.all([
      getJson('/api/deals'),
      getJson('/api/signals'),
      getJson('/api/posts')
    ]);
    renderDeals(deals);
    renderSignals(signals);
    renderPosts(posts);
  } catch (error) {
    showLoadError(error);
  }
}

const modal = document.getElementById('dealModal');
document.getElementById('openFormBtn').addEventListener('click', () => modal.classList.remove('hidden'));
document.getElementById('closeFormBtn').addEventListener('click', () => modal.classList.add('hidden'));

document.getElementById('dealForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const form = new FormData(e.target);
  const body = Object.fromEntries(form.entries());

  try {
    await getJson('/api/deals', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
    e.target.reset();
    modal.classList.add('hidden');
    await load();
  } catch (error) {
    console.error('RALPH deal save error', error);
    window.alert(error.message || 'Unable to save deal');
  }
});

load();
