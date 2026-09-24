/**
 * chat.js – Supabase-powered real-time chat for Safe Place.
 *
 * Connects only while the chat panel is open. Anonymous auth with
 * Cloudflare Turnstile CAPTCHA. Messages expire after 10 minutes.
 */
import './chat.css';
import { createClient } from '@supabase/supabase-js';

// ── Config ──────────────────────────────────────────────────────────────
const SUPABASE_URL  = import.meta.env.VITE_SUPABASE_URL  || 'https://mayqrvnkocoqtllsekju.supabase.co';
const SUPABASE_KEY  = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1heXFydm5rb2NvcXRsbHNla2p1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTAyNDcyMDMsImV4cCI6MjEwNTgyMzIwM30.TMSToj8g2qFuMc5_CFsplpbGd-p0jMZvkLR0p4pVICk';
const TURNSTILE_KEY = import.meta.env.VITE_TURNSTILE_SITE_KEY || '';
const MAX_MSG_LEN   = 300;
const MAX_NAME_LEN  = 40;
const HISTORY_LIMIT = 50;
const EXPIRY_MS     = 10 * 60 * 1000; // 10 minutes
const COOLDOWN_MS   = 3000;           // 3-second send cooldown
const EXPIRY_SWEEP  = 30_000;         // sweep hidden expired msgs every 30s

// ── DOM helpers ─────────────────────────────────────────────────────────
const $ = id => document.getElementById(id);

// ── State ───────────────────────────────────────────────────────────────
let supabase    = null;
let channel     = null;
let userId      = null;
let displayName = '';
let messages    = new Map();   // id → message object
let cooldownUntil  = 0;
let cooldownTimer  = null;
let expiryInterval = null;
let panelOpen      = false;

// ── Supabase client (lazy init) ─────────────────────────────────────────
function getClient() {
  if (!supabase) {
    if (!SUPABASE_URL || !SUPABASE_KEY) {
      throw new Error('Supabase URL or anon key is missing. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.');
    }
    supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
      auth: { persistSession: true, autoRefreshToken: true }
    });
  }
  return supabase;
}

// ── Turnstile CAPTCHA ───────────────────────────────────────────────────
function renderTurnstile() {
  return new Promise((resolve) => {
    const container = $('chat-captcha');
    if (!container) { resolve(null); return; }

    // If no site key, skip CAPTCHA
    if (!TURNSTILE_KEY) { resolve(null); return; }

    // Wait for Turnstile script
    const tryRender = () => {
      if (typeof window.turnstile === 'undefined') {
        setTimeout(tryRender, 200);
        return;
      }
      container.innerHTML = '';
      window.turnstile.render(container, {
        sitekey: TURNSTILE_KEY,
        theme: 'dark',
        size: 'compact',
        callback: (token) => resolve(token),
        'error-callback': () => resolve(null),
        'expired-callback': () => resolve(null),
      });
    };
    tryRender();
  });
}

// ── Auth ─────────────────────────────────────────────────────────────────
async function ensureAuth() {
  const client = getClient();
  const { data: { session } } = await client.auth.getSession();

  if (session?.user) {
    userId = session.user.id;
    return;
  }

  // New anonymous sign-in
  setStatus('Joining chat…');

  const options = {};

  // Get CAPTCHA token if Turnstile is configured
  if (TURNSTILE_KEY) {
    const token = await renderTurnstile();
    if (token) {
      options.options = { captchaToken: token };
    }
  }

  const { data, error } = await client.auth.signInAnonymously(options.options ? options : undefined);
  if (error) throw new Error(`Auth failed: ${error.message}`);
  userId = data.user.id;
}

// ── Messages ─────────────────────────────────────────────────────────────
function isExpired(msg) {
  return Date.now() - new Date(msg.created_at).getTime() > EXPIRY_MS;
}

function formatTime(isoString) {
  const d = new Date(isoString);
  const now = new Date();
  const diffMs = now - d;

  if (diffMs < 60_000) return 'just now';
  if (diffMs < 3600_000) {
    const mins = Math.floor(diffMs / 60_000);
    return `${mins}m ago`;
  }
  return d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
}

function escapeText(str) {
  const el = document.createElement('span');
  el.textContent = str;
  return el.innerHTML;
}

function renderMessages() {
  const container = $('chat-messages');
  if (!container) return;

  // Filter expired
  const active = [];
  for (const [id, msg] of messages) {
    if (isExpired(msg)) {
      messages.delete(id);
    } else {
      active.push(msg);
    }
  }

  // Sort by time
  active.sort((a, b) => new Date(a.created_at) - new Date(b.created_at));

  if (active.length === 0) {
    container.innerHTML = '<div class="chat-empty">No messages yet.<br>Say hello — messages disappear after 10 minutes.</div>';
    return;
  }

  const wasAtBottom = container.scrollHeight - container.scrollTop - container.clientHeight < 40;
  const fragment = document.createDocumentFragment();

  for (const msg of active) {
    const isOwn = msg.user_id === userId;
    const wrapper = document.createElement('div');
    wrapper.className = `chat-msg ${isOwn ? 'chat-msg-own' : 'chat-msg-other'}`;
    wrapper.dataset.id = msg.id;

    if (!isOwn) {
      const nameEl = document.createElement('div');
      nameEl.className = 'chat-msg-name';
      nameEl.textContent = msg.display_name || 'Anonymous';
      wrapper.appendChild(nameEl);
    }

    const textEl = document.createElement('div');
    textEl.className = 'chat-msg-text';
    textEl.textContent = msg.content;
    wrapper.appendChild(textEl);

    const timeEl = document.createElement('div');
    timeEl.className = 'chat-msg-time';
    timeEl.textContent = formatTime(msg.created_at);
    wrapper.appendChild(timeEl);

    fragment.appendChild(wrapper);
  }

  container.innerHTML = '';
  container.appendChild(fragment);

  if (wasAtBottom) {
    container.scrollTop = container.scrollHeight;
  }
}

function addMessage(msg) {
  if (isExpired(msg)) return;
  if (messages.has(msg.id)) return; // deduplicate
  messages.set(msg.id, msg);
  renderMessages();
}

async function loadHistory() {
  const client = getClient();
  const { data, error } = await client
    .from('chat_messages')
    .select('*')
    .gt('created_at', new Date(Date.now() - EXPIRY_MS).toISOString())
    .order('created_at', { ascending: true })
    .limit(HISTORY_LIMIT);

  if (error) {
    console.warn('Failed to load chat history:', error.message);
    return;
  }

  messages.clear();
  for (const msg of (data || [])) {
    if (!isExpired(msg)) messages.set(msg.id, msg);
  }
  renderMessages();
}

// ── Presence / Active Users ─────────────────────────────────────────────
function updatePresenceUI(count) {
  const safeCount = Math.max(1, count || 1);
  const label = safeCount === 1 ? '1 user online' : `${safeCount} users online`;
  const badgeLabel = `${safeCount} online`;

  const subheadEl = $('chat-subhead-count');
  const textEl = $('chat-presence-text');
  const badgeEl = $('chat-online-badge');

  if (subheadEl) subheadEl.textContent = label;
  if (textEl) textEl.textContent = label;
  if (badgeEl) badgeEl.textContent = badgeLabel;
}

function handlePresenceSync() {
  if (!channel) return;
  const state = channel.presenceState();
  const keys = Object.keys(state || {});

  // Count unique users across presences
  const userSet = new Set();
  for (const k of keys) {
    const list = state[k] || [];
    for (const item of list) {
      if (item && item.user_id) userSet.add(item.user_id);
    }
  }

  const count = userSet.size > 0 ? userSet.size : Math.max(1, keys.length);
  updatePresenceUI(count);
}

// ── Realtime ─────────────────────────────────────────────────────────────
function subscribe() {
  if (channel) return;
  const client = getClient();

  // Set initial UI right away
  updatePresenceUI(1);

  // Generate connection presence key (unique per device/tab)
  const presenceKey = userId ? `u_${userId}_${Math.random().toString(36).slice(2, 7)}` : `guest_${Math.random().toString(36).slice(2, 9)}`;

  channel = client
    .channel('chat-room', {
      config: {
        presence: {
          key: presenceKey,
        },
      },
    })
    .on('presence', { event: 'sync' }, () => handlePresenceSync())
    .on('presence', { event: 'join' }, () => handlePresenceSync())
    .on('presence', { event: 'leave' }, () => handlePresenceSync())
    .on(
      'postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'chat_messages' },
      (payload) => addMessage(payload.new)
    )
    .on(
      'postgres_changes',
      { event: 'DELETE', schema: 'public', table: 'chat_messages' },
      (payload) => {
        messages.delete(payload.old.id);
        renderMessages();
      }
    )
    .subscribe(async (status) => {
      if (status === 'SUBSCRIBED') {
        try {
          await channel.track({
            user_id: userId,
            display_name: displayName || 'Anonymous',
            online_at: new Date().toISOString(),
          });
          handlePresenceSync();
        } catch (err) {
          console.warn('Presence tracking error:', err);
        }
        await loadHistory();
        setStatus('');
      }
      if (status === 'CHANNEL_ERROR') {
        setStatus('Connection lost. Reconnecting…', true);
      }
    });
}

async function unsubscribe() {
  if (channel) {
    const client = getClient();
    try {
      await channel.untrack();
    } catch {}
    client.removeChannel(channel);
    channel = null;
  }
  updatePresenceUI(1);
}

// ── Send message ─────────────────────────────────────────────────────────
async function sendMessage(content) {
  if (!content || !userId) return;
  const trimmed = content.trim().slice(0, MAX_MSG_LEN);
  if (!trimmed) return;

  // Client-side cooldown
  if (Date.now() < cooldownUntil) return;

  const sendBtn = $('chat-send');
  const input = $('chat-input');
  if (sendBtn) sendBtn.disabled = true;

  const client = getClient();
  const { error } = await client.from('chat_messages').insert({
    user_id: userId,
    display_name: displayName,
    content: trimmed,
  });

  if (error) {
    if (error.message.includes('Rate limit') || error.message.includes('cooldown')) {
      setStatus('Slow down — wait a few seconds.', true);
    } else {
      setStatus(`Send failed: ${error.message}`, true);
    }
    if (sendBtn) sendBtn.disabled = false;
    return;
  }

  // Start cooldown
  cooldownUntil = Date.now() + COOLDOWN_MS;
  startCooldownBar();

  if (input) input.value = '';
  setStatus('');
}

// ── Cooldown bar ─────────────────────────────────────────────────────────
function startCooldownBar() {
  const fill = document.querySelector('.chat-cooldown-fill');
  const sendBtn = $('chat-send');
  if (!fill) return;

  fill.style.width = '100%';
  const start = Date.now();

  clearInterval(cooldownTimer);
  cooldownTimer = setInterval(() => {
    const elapsed = Date.now() - start;
    const pct = Math.max(0, 1 - elapsed / COOLDOWN_MS) * 100;
    fill.style.width = `${pct}%`;

    if (elapsed >= COOLDOWN_MS) {
      clearInterval(cooldownTimer);
      fill.style.width = '0%';
      if (sendBtn) sendBtn.disabled = false;
    }
  }, 50);
}

// ── Expiry sweep ─────────────────────────────────────────────────────────
function startExpirySweep() {
  clearInterval(expiryInterval);
  expiryInterval = setInterval(() => {
    let changed = false;
    for (const [id, msg] of messages) {
      if (isExpired(msg)) {
        messages.delete(id);
        changed = true;
      }
    }
    if (changed) renderMessages();
  }, EXPIRY_SWEEP);
}

function stopExpirySweep() {
  clearInterval(expiryInterval);
}

// ── Status ───────────────────────────────────────────────────────────────
function setStatus(text, isError = false) {
  const el = $('chat-status');
  if (!el) return;
  el.textContent = text;
  el.classList.toggle('chat-status-error', isError);
}

// ── Panel toggle ─────────────────────────────────────────────────────────
const chatCard  = $('chat-card');
const openBtn   = $('chat-open');
const closeBtn  = $('chat-close');
const nameStep  = $('chat-name-step');
const roomStep  = $('chat-room-step');
const nameForm  = $('chat-name-form');
const nameInput = $('chat-name-input');
const msgInput  = $('chat-input');
const sendBtn   = $('chat-send');

const CHAT_NAME_KEY = 'anshu-chat-name-v1';

function toggleChat(show) {
  const visible = typeof show === 'boolean' ? show : chatCard.hidden;
  chatCard.hidden = !visible;
  openBtn.setAttribute('aria-expanded', String(visible));
  panelOpen = visible;

  if (visible) {
    const savedName = localStorage.getItem(CHAT_NAME_KEY);
    if (savedName && savedName.trim()) {
      displayName = savedName.trim();
      enterChatRoom();
    } else {
      showNameStep();
    }
  } else {
    // Disconnect when panel closes
    unsubscribe();
    stopExpirySweep();
  }
}

function showNameStep() {
  if (nameStep) nameStep.hidden = false;
  if (roomStep) roomStep.hidden = true;
  const savedName = localStorage.getItem(CHAT_NAME_KEY);
  if (nameInput) {
    nameInput.value = savedName || '';
    setTimeout(() => nameInput.focus(), 80);
  }
}

async function enterChatRoom() {
  if (nameStep) nameStep.hidden = true;
  if (roomStep) roomStep.hidden = false;

  setStatus('Connecting…');

  try {
    await ensureAuth();
    subscribe();
    startExpirySweep();
    if (msgInput) setTimeout(() => msgInput.focus(), 120);
  } catch (err) {
    setStatus(`Could not connect: ${err.message}`, true);
  }
}

// ── Event listeners ─────────────────────────────────────────────────────
if (openBtn) {
  openBtn.addEventListener('click', () => toggleChat());
}

if (closeBtn) {
  closeBtn.addEventListener('click', () => toggleChat(false));
}

if (nameForm) {
  nameForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const name = nameInput.value.trim().slice(0, MAX_NAME_LEN);
    if (!name) {
      nameInput.setCustomValidity('Please enter a display name.');
      nameForm.reportValidity();
      return;
    }
    nameInput.setCustomValidity('');
    displayName = name;
    try { localStorage.setItem(CHAT_NAME_KEY, name); } catch {}
    enterChatRoom();
  });
}

if (msgInput) {
  // Auto-resize textarea
  msgInput.addEventListener('input', () => {
    msgInput.style.height = 'auto';
    msgInput.style.height = Math.min(msgInput.scrollHeight, 80) + 'px';
  });

  // Enter to send (shift+enter for newline)
  msgInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage(msgInput.value);
    }
  });
}

if (sendBtn) {
  sendBtn.addEventListener('click', () => {
    if (msgInput) sendMessage(msgInput.value);
  });
}

// Character counter
if (msgInput) {
  msgInput.addEventListener('input', () => {
    const remaining = MAX_MSG_LEN - msgInput.value.length;
    const counter = $('chat-char-count');
    if (counter) {
      counter.textContent = remaining <= 50 ? `${remaining}` : '';
      counter.style.color = remaining <= 10 ? '#e8a9a9' : '#8a9a88';
    }
  });
}

// Clean up on page hide
window.addEventListener('pagehide', () => {
  unsubscribe();
  stopExpirySweep();
});

// Re-sync presence when returning to the tab on mobile
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible' && panelOpen && channel) {
    channel.track({
      user_id: userId,
      display_name: displayName || 'Anonymous',
      online_at: new Date().toISOString(),
    }).catch(() => {});
    handlePresenceSync();
  }
});
