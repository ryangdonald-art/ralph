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
  const attentionList = document.getElementById('attentionList');
  const runSyntheticBtn = document.getElementById('runSyntheticBtn');
  let currentSession=null;

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

  async function api(path, options={}) {
    if(!currentSession?.access_token) throw new Error('AUTH_REQUIRED');
    const response=await fetch(path,{...options,headers:{Authorization:`Bearer ${currentSession.access_token}`,'Content-Type':'application/json',Accept:'application/json',...(options.headers||{})},cache:'no-store'});
    const data=await response.json().catch(()=>({}));
    if(!response.ok) throw new Error(data?.error?.message||'REQUEST_FAILED');
    return data;
  }

  async function loadAttention(){
    if(!attentionList) return;
    const data=await api('/api/attention');
    attentionList.replaceChildren();
    if(!data.items?.length){ attentionList.textContent='No actions awaiting approval.'; return; }
    data.items.forEach(item=>{
      const card=document.createElement('div'); card.className='boundary-card';
      const title=document.createElement('strong'); title.textContent=item.action_type;
      const p=document.createElement('p'); p.textContent=item.requested_action?.text||'Review action';
      const btn=document.createElement('button'); btn.className='primary-btn'; btn.type='button'; btn.textContent='Approve & execute';
      btn.addEventListener('click',async()=>{btn.disabled=true; try{await api(`/api/actions/${encodeURIComponent(item.id)}/approve-execute`,{method:'POST'}); await loadAttention();}catch(e){btn.textContent='Approval failed';}});
      card.append(title,p,btn); attentionList.append(card);
    });
  }

  async function renderSession(session) {
    currentSession=session;
    const identity = await verifyWithServer(session);
    if (!identity) {
      identityLabel.textContent = '';
      showOnly(loginForm);
      return;
    }
    identityLabel.textContent = identity.email || 'Verified user';
    showOnly(authenticatedShell);
    await loadAttention();
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

  if(runSyntheticBtn) runSyntheticBtn.addEventListener('click',async()=>{
    runSyntheticBtn.disabled=true;
    try{ await api('/api/synthetic/cash-flow',{method:'POST'}); await loadAttention(); }
    catch(e){ runSyntheticBtn.textContent='Synthetic test failed'; }
    finally{ runSyntheticBtn.disabled=false; }
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
