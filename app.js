import './components/customer-view.js';
import './components/store-view.js';

const host = document.getElementById('appView');
const navButtons = [...document.querySelectorAll('[data-view]')];
let activeView = '';
let renderToken = 0;

function loadViewScript(view) {
  const source = view === 'customer-view' ? 'customer-estimator.js' : 'store-operations.js';
  return new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = `${source}?mount=${Date.now()}`;
    script.onload = () => resolve(script);
    script.onerror = () => reject(new Error(`無法載入元件：${source}`));
    document.body.append(script);
  });
}

async function showView(view, updateLocation = true) {
  if (!customElements.get(view) || activeView === view) return;
  activeView = view;
  const token = ++renderToken;
  host.replaceChildren(document.createElement(view));
  navButtons.forEach(button => {
    const selected = button.dataset.view === view;
    button.setAttribute('aria-selected', String(selected));
    button.tabIndex = selected ? 0 : -1;
  });
  if (updateLocation) history.replaceState(null, '', view === 'store-view' ? '#store' : '#customer');
  document.title = view === 'store-view' ? '門市端｜家電汰換服務系統' : '顧客端｜家電汰換服務系統';
  try {
    await loadViewScript(view);
    if (token !== renderToken) return;
  } catch (error) {
    if (token === renderToken) host.innerHTML = `<div class="view-error">${error.message}</div>`;
  }
}

navButtons.forEach(button => button.addEventListener('click', () => showView(button.dataset.view)));
showView(location.hash === '#store' ? 'store-view' : 'customer-view', false);