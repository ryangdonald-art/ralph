(() => {
  'use strict';

  const bootState = document.getElementById('bootState');
  const loginForm = document.getElementById('loginForm');
  const loginMessage = document.getElementById('loginMessage');
  const signInBtn = document.getElementById('signInBtn');
  const signOutBtn = document.getElementById('signOutBtn');
  const authenticatedShell = document.getElementById('authenticatedShell');
  const identityLabel = document.getElementById('identityLabel');
  const fatalState = document.getElementById('fatalState');

  let client;

  function showOnly(element) {
    [bootState, loginForm, authenticatedShell, fatalState].forEach((item) => item.classList.toggle('hidden', item !== element));
    signOutBtn.classList.toggle('hidden', element !== authenticatedShell);
  }

  function safeMessage(message) { loginMessage.textContent = message || ''; }

  async function getConfig() {
    const response = await fetch('/api/auth/config', { headers: { Accept: 'application/json' }, cache: 'no-store' });
    if (!response.ok) throw new Error('AUTH_CONFIG_UNAVAILABLE');
    const data = await response.json();
    if (!data.supabaseUrl || !data.supabasePublishableKey) throw new Error('AUTH_CONFIG_INVALID');
    return data;
  }

  async function verifyWithServer(session) {
    if (!session || !session.access_token) return null;
    const response = await fetch('/api/auth/me', {
      headers: { Authorization: `Bearer ${session.access_token}`, Accept: 'application/json' },
      cache: 'no-store'
    });
    if (!response.ok) return null;
    const data = await response.json();
    return data && data.authenticated ? data.user : null;
  }

  async function renderSession(session) {
    const identity = await verifyWithServer(session);
    if (!identity) {
      identityLabel.textContent = '';
      showOnly(loginForm);
      return;
    }
    identityLabel.textContent = identity.email || 'Verified user';
    showOnly(authenticatedShell);
  }

  async function boot() {
    try {
      if ('serviceWorker' in navigator) navigator.serviceWorker.register('/sw.js').catch(() => {});
      if (!window.supabase || typeof window.supabase.createClient !== 'function') throw new Error('AUTH_LIBRARY_UNAVAILABLE');
      const config = await getConfig();
      client = window.supabase.createClient(config.supabaseUrl, config.supabasePublishableKey, {
        auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true }
      });
      const { data, error } = await client.auth.getSession();
      if (error) throw error;
      await renderSession(data.session);
      client.auth.onAuthStateChange((_event, session) => {
        window.setTimeout(() => renderSession(session).catch(() => showOnly(loginForm)), 0);
      });
    } catch (_error) {
      showOnly(fatalState);
    }
  }

  loginForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    if (!client) return;
    signInBtn.disabled = true;
    safeMessage('Sending secure link…');
    const email = new FormData(loginForm).get('email');
    try {
      const { error } = await client.auth.signInWithOtp({
        email: String(email || '').trim(),
        options: { shouldCreateUser: false, emailRedirectTo: window.location.origin }
      });
      if (error) throw error;
      safeMessage('Secure link sent. Open it on this iPhone to continue.');
    } catch (_error) {
      safeMessage('Sign-in could not be completed. Access remains closed.');
    } finally {
      signInBtn.disabled = false;
    }
  });

  signOutBtn.addEventListener('click', async () => {
    if (!client) return;
    signOutBtn.disabled = true;
    try { await client.auth.signOut(); }
    finally {
      identityLabel.textContent = '';
      showOnly(loginForm);
      signOutBtn.disabled = false;
    }
  });

  boot();
})();
