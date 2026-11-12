(() => {
  const context = () => window.getCommunityChatContext?.();
  function isGiphyUrl(value) {
    try {
      const url = new URL(value);
      return url.protocol === 'https:' && (url.hostname === 'giphy.com' || url.hostname.endsWith('.giphy.com'));
    } catch {
      return false;
    }
  }
  const imageAttachmentTypes = new Set(['image/jpeg', 'image/png', 'image/gif', 'image/webp']);
  const attachmentUrlCache = new Map();
  const attachmentUrlRequests = new Map();
  async function getAttachmentUrl(path) {
    const cached = attachmentUrlCache.get(path);
    if (cached && cached.expiresAt > Date.now() + 60000) return cached.url;
    let request = attachmentUrlRequests.get(path);
    if (!request) {
      request = context().supabase.storage.from('community-chat-files').createSignedUrl(path, 3600)
        .then(({ data, error }) => {
          if (error) throw error;
          const entry = { url: data.signedUrl, expiresAt: Date.now() + 3540000 };
          attachmentUrlCache.set(path, entry);
          return entry.url;
        })
        .finally(() => attachmentUrlRequests.delete(path));
      attachmentUrlRequests.set(path, request);
    }
    return request;
  }
  const chatStatus = document.querySelector('#chatStatus');
  const chatList = document.querySelector('#chatMessages');
  const fileInput = document.querySelector('#chatFileInput');
  const profileDialog = document.querySelector('#chatProfileDialog');

  if (!chatStatus || !chatList || !profileDialog) return;

  if (fileInput) fileInput.accept = '*/*';

  const style = document.createElement('style');
  style.textContent = `
    .community .section-head { align-items: end; }
    .community-chat {
      max-width: 980px;
      margin: 0 auto;
      padding: clamp(16px, 3vw, 30px);
      border: 1px solid #6e504227;
      border-radius: 24px;
      background: radial-gradient(ellipse at 92% 0%, #f4bdc55c, transparent 38%), linear-gradient(145deg, #fffaf3, #efe4d9);
      box-shadow: 0 18px 44px #35251b17, 0 3px 0 #b8a6cf66;
    }
    .chat-status {
      display: inline-flex;
      align-items: center;
      min-height: 34px;
      margin: 0;
      padding: 7px 12px;
      border: 1px solid #71896335;
      border-radius: 999px;
      background: #e7eddf;
      color: #43523c;
    }
    .chat-messages {
      display: flex;
      flex-direction: column;
      gap: 11px;
      max-height: min(58vh, 560px);
      min-height: 260px;
      padding: clamp(12px, 2.5vw, 22px);
      border: 1px solid #6e504222;
      border-radius: 20px;
      background: linear-gradient(180deg, #f8f2ea, #f2e9df);
      scroll-behavior: smooth;
    }
    .chat-message {
      width: fit-content;
      max-width: min(88%, 700px);
      padding: 12px 15px;
      border: 1px solid #6e50421c;
      border-radius: 16px 16px 16px 5px;
      background: #fffdfa;
      box-shadow: 0 4px 12px #35251b0d;
    }
    .chat-message-head { gap: 10px; }
    .chat-message-head time { margin-left: auto; }
    .chat-message-body { font-size: 13px; }
    .chat-image-attachment { max-width: min(440px, 100%); margin: 10px 0 0; }
    .chat-image-attachment a { display: block; line-height: 0; }
    .chat-image-attachment img { display: block; width: auto; max-width: 100%; max-height: 420px; border: 1px solid #6e504222; border-radius: 12px; object-fit: contain; }
    .chat-image-attachment figcaption { margin-top: 5px; font: 8px var(--mono); color: #756861; overflow-wrap: anywhere; }
    .chat-tools { gap: 9px; margin: 16px 0 12px; }
    .chat-tools .pill { min-height: 38px; border-radius: 999px; }
    .chat-compose textarea {
      min-height: 72px;
      border-radius: 14px;
      background: #fffdfa;
      box-shadow: inset 0 1px 3px #35251b0c;
    }
    .chat-compose button { min-height: 46px; border-radius: 999px; }
    .chat-people-button { border-color: #9c6c78 !important; background: #f4bdc5 !important; }
    .chat-profile-last-active {
      margin: 4px 0 14px;
      font: 10px var(--mono);
      color: #65574f;
    }
    .chat-profile-dialog .chat-profile-message {
      float: none;
      width: auto;
      height: auto;
      padding: 10px 18px;
      border-radius: 999px;
      background: var(--ink);
      color: var(--paper);
      font: 10px var(--mono);
      text-transform: uppercase;
    }
    .chat-dm-dialog {
      width: min(940px, calc(100% - 24px));
      max-width: none;
      height: min(760px, calc(100% - 24px));
      max-height: none;
      padding: 0;
      overflow: hidden;
      border: 1px solid #6e504244;
      border-radius: 24px;
      background: #fffaf3;
      color: var(--ink);
      box-shadow: 0 24px 80px #21191555;
    }
    .chat-dm-dialog::backdrop { background: #211915aa; backdrop-filter: blur(7px); }
    .chat-dm-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 16px;
      padding: 18px 22px;
      border-bottom: 1px solid var(--line);
      background: radial-gradient(ellipse at 90% 0%, #f4bdc566, transparent 45%), #fffaf3;
    }
    .chat-dm-header h3 { margin: 3px 0 0; font: 600 23px var(--serif); }
    .chat-dm-kicker { margin: 0; font: 9px var(--mono); letter-spacing: .14em; text-transform: uppercase; }
    .chat-presence-select { max-width: 150px; padding: 8px 10px; border: 1px solid var(--line); border-radius: 999px; background: #fffdfa; color: var(--ink); font: 9px var(--mono); }
    .chat-dm-close {
      width: 36px;
      height: 36px;
      border: 1px solid var(--line);
      border-radius: 50%;
      background: transparent;
      cursor: pointer;
    }
    .chat-dm-layout {
      display: grid;
      grid-template-columns: minmax(230px, .75fr) minmax(0, 1.5fr);
      min-height: 0;
      height: calc(100% - 76px);
    }
    .chat-people-pane { min-height: 0; overflow: auto; padding: 16px; border-right: 1px solid var(--line); }
    .chat-people-search {
      width: 100%;
      margin-bottom: 12px;
      padding: 11px 12px;
      border: 1px solid var(--line);
      border-radius: 12px;
      background: #fff;
      font: 11px var(--mono);
    }
    .chat-people-list { display: grid; gap: 8px; padding: 0; margin: 0; list-style: none; }
    .chat-person {
      display: grid;
      grid-template-columns: 42px minmax(0, 1fr) auto;
      align-items: center;
      gap: 10px;
      padding: 10px;
      border: 1px solid #6e50421c;
      border-radius: 15px;
      background: #fffdfa;
    }
    .chat-person-avatar {
      width: 42px;
      height: 42px;
      border-radius: 50%;
      object-fit: cover;
      background: #f4bdc5;
    }
    .chat-person-name { display: block; overflow: hidden; font: 600 14px var(--serif); text-overflow: ellipsis; white-space: nowrap; }
    .chat-person-meta { display: block; margin-top: 3px; font: 8px/1.5 var(--mono); color: #756861; }
    .chat-person-state { display: inline-flex; align-items: center; gap: 6px; }
    .chat-presence-dot { width: 8px; height: 8px; flex: 0 0 8px; border-radius: 50%; background: #9a918c; }
    .chat-presence-online .chat-presence-dot { background: #4b9b57; box-shadow: 0 0 0 3px #4b9b5726; }
    .chat-presence-away .chat-presence-dot { background: #d69932; }
    .chat-presence-dnd .chat-presence-dot { background: #d45a60; }
    .chat-person-message {
      padding: 8px 10px;
      border: 1px solid #9c6c78;
      border-radius: 999px;
      background: #f4bdc5;
      font: 8px var(--mono);
      text-transform: uppercase;
      cursor: pointer;
    }
    .chat-dm-thread { display: flex; flex-direction: column; min-width: 0; min-height: 0; padding: 16px; }
    .chat-dm-contact { padding-bottom: 12px; border-bottom: 1px solid var(--line); }
    .chat-dm-contact strong { font: 600 18px var(--serif); }
    .chat-dm-contact p { margin: 3px 0 0; font: 9px var(--mono); color: #756861; }
    .chat-dm-messages {
      display: flex;
      flex: 1;
      flex-direction: column;
      gap: 9px;
      min-height: 100px;
      overflow-y: auto;
      padding: 12px 3px;
      margin: 0;
      list-style: none;
    }
    .chat-dm-message { align-self: flex-start; max-width: 85%; padding: 10px 12px; border-radius: 14px 14px 14px 4px; background: #f2e9df; overflow-wrap: anywhere; }
    .chat-dm-message.is-mine { align-self: flex-end; border-radius: 14px 14px 4px 14px; background: #f4bdc5; }
    .chat-dm-message p { margin: 0; white-space: pre-wrap; font: 12px/1.5 var(--sans); }
    .chat-dm-message .chat-attachment-link { display: block; color: inherit; }
    .chat-dm-image-attachment { max-width: min(320px, 100%); margin: 7px 0 0; }
    .chat-dm-image-attachment a { display: block; line-height: 0; }
    .chat-dm-image-attachment img { display: block; width: auto; max-width: 100%; max-height: 320px; border: 1px solid #6e504222; border-radius: 10px; object-fit: contain; }
    .chat-dm-image-attachment figcaption { margin-top: 4px; font: 8px var(--mono); color: #756861; overflow-wrap: anywhere; }
    .chat-dm-gif { display: block; max-width: min(250px, 100%); max-height: 220px; margin-top: 7px; object-fit: contain; }
    .chat-dm-message time { display: block; margin-top: 5px; text-align: right; font: 8px var(--mono); color: #756861; }
    .chat-dm-empty { display: grid; flex: 1; place-items: center; padding: 20px; text-align: center; font: 11px/1.6 var(--mono); color: #756861; }
    .chat-dm-compose { margin-top: auto; }
    .chat-dm-tools { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; margin-bottom: 8px; }
    .chat-dm-tools .pill { min-height: 34px; padding: 7px 12px; font-size: 8px; }
    .chat-dm-file-name { font: 9px var(--mono); color: #756861; overflow-wrap: anywhere; }
    .chat-dm-gif-picker { max-height: 210px; overflow: auto; margin: 8px 0; padding: 10px; border: 1px solid var(--line); border-radius: 12px; background: #fffdfa; }
    .chat-dm-gif-search { display: grid; grid-template-columns: minmax(0, 1fr) auto; gap: 8px; }
    .chat-dm-gif-search input { min-width: 0; padding: 9px; border: 1px solid var(--line); border-radius: 8px; background: transparent; color: var(--ink); font: 10px var(--mono); }
    .chat-dm-gif-results { display: grid; grid-template-columns: repeat(auto-fill, minmax(76px, 1fr)); gap: 7px; margin-top: 8px; }
    .chat-dm-gif-results .chat-gif-result { min-height: 60px; }
    .chat-dm-gif-results .chat-gif-result img { height: 72px; }
    .chat-dm-form { display: grid; grid-template-columns: minmax(0, 1fr) auto; gap: 9px; align-items: end; }
    .chat-dm-form textarea { width: 100%; min-height: 56px; max-height: 120px; resize: vertical; padding: 11px; border: 1px solid var(--line); border-radius: 12px; background: #fff; font: 12px/1.5 var(--sans); }
    .chat-dm-form button { min-height: 42px; border-radius: 999px; }
    .chat-dm-status { min-height: 17px; margin: 4px 0 8px; font: 9px var(--mono); color: #756861; }
    .chat-dm-status:empty { display: none; }
    .theme-dark .community-chat, .theme-dark .chat-dm-dialog, .theme-dark .chat-dm-header { background: #29232a; color: var(--ink); }
    .theme-dark .chat-messages, .theme-dark .chat-person, .theme-dark .chat-compose textarea, .theme-dark .chat-dm-form textarea { background: #302a32; color: var(--ink); }
    .theme-dark .chat-message { background: #38313a; color: var(--ink); }
    .theme-dark .chat-people-search { background: #302a32; color: var(--ink); }
    .theme-dark .chat-presence-select, .theme-dark .chat-dm-gif-picker { background: #302a32; color: var(--ink); }
    .theme-dark .chat-profile-last-active, .theme-dark .chat-person-meta, .theme-dark .chat-dm-contact p { color: #c3b9c9; }
    @media (max-width: 640px) {
      .chat-dm-dialog { height: min(850px, calc(100% - 14px)); width: calc(100% - 14px); border-radius: 18px; }
      .chat-dm-layout { grid-template-columns: 1fr; grid-template-rows: minmax(150px, .75fr) minmax(220px, 1.25fr); }
      .chat-people-pane { border-right: 0; border-bottom: 1px solid var(--line); padding: 10px; }
      .chat-people-list { grid-template-columns: 1fr; }
      .chat-person { padding: 7px; }
      .chat-person-avatar { width: 36px; height: 36px; }
      .chat-dm-thread { padding: 11px; }
      .chat-message { max-width: 96%; }
      .chat-dm-header { gap: 8px; padding: 14px; }
      .chat-presence-select { max-width: 112px; padding: 7px; }
      .chat-dm-gif-search { grid-template-columns: 1fr; }
    }
    .theme-dark .chat-status { background: #384333; color: #e4efd8; }
  `;
  document.head.append(style);

  const peopleButton = document.createElement('button');
  peopleButton.type = 'button';
  peopleButton.className = 'pill chat-people-button';
  peopleButton.textContent = 'people & DMs ↗';
  peopleButton.disabled = true;
  document.querySelector('.chat-tools')?.prepend(peopleButton);

  const peopleDialog = document.createElement('dialog');
  peopleDialog.className = 'chat-dm-dialog';
  peopleDialog.setAttribute('aria-labelledby', 'chatDmTitle');
  peopleDialog.innerHTML = `
    <header class="chat-dm-header">
      <div><p class="chat-dm-kicker">The fan community</p><h3 id="chatDmTitle">People & messages</h3></div>
      <label class="chat-dm-kicker" for="chatPresenceMode">your status
        <select class="chat-presence-select" id="chatPresenceMode" aria-label="Your activity status">
          <option value="online">online</option><option value="away">away</option><option value="do_not_disturb">do not disturb</option><option value="offline">offline</option>
        </select>
      </label>
      <button class="chat-dm-close" type="button" aria-label="Close messages">×</button>
    </header>
    <div class="chat-dm-layout">
      <aside class="chat-people-pane" aria-label="Community members">
        <input class="chat-people-search" type="search" maxlength="40" placeholder="Find a member…" aria-label="Find a member">
        <ol class="chat-people-list" aria-live="polite"></ol>
      </aside>
      <section class="chat-dm-thread" aria-label="Direct messages">
        <div class="chat-dm-empty">Choose someone from the list to start a private conversation.</div>
        <div class="chat-dm-contact" hidden><strong></strong><p></p></div>
        <ol class="chat-dm-messages" aria-live="polite" hidden></ol>
        <p class="chat-dm-status" aria-live="polite"></p>
        <div class="chat-dm-compose" hidden>
          <div class="chat-dm-tools">
            <button class="pill chat-dm-attach" type="button">attach file ↗</button>
            <button class="pill chat-dm-gif-toggle" type="button">GIF ↗</button>
            <input class="chat-dm-file-input" type="file" accept="*/*" hidden>
            <span class="chat-dm-file-name"></span>
          </div>
          <section class="chat-dm-gif-picker" hidden aria-label="GIPHY search">
            <form class="chat-dm-gif-search-form">
              <div class="chat-dm-gif-search"><input type="search" maxlength="50" placeholder="search GIPHY" aria-label="Search GIPHY"><button class="pill" type="submit">search</button></div>
            </form>
            <p class="chat-dm-status chat-dm-gif-status" aria-live="polite"></p>
            <div class="chat-dm-gif-results"></div>
            <p class="chat-gif-attribution"><a href="https://giphy.com" target="_blank" rel="noopener noreferrer">Powered by GIPHY</a></p>
          </section>
          <form class="chat-dm-form">
            <textarea maxlength="500" placeholder="Write a private message…" aria-label="Private message"></textarea>
            <button class="pill" type="submit">send ↗</button>
          </form>
        </div>
      </section>
    </div>`;
  document.body.append(peopleDialog);

  const peopleList = peopleDialog.querySelector('.chat-people-list');
  const search = peopleDialog.querySelector('.chat-people-search');
  const dmEmpty = peopleDialog.querySelector('.chat-dm-empty');
  const dmContact = peopleDialog.querySelector('.chat-dm-contact');
  const dmMessages = peopleDialog.querySelector('.chat-dm-messages');
  const dmStatus = peopleDialog.querySelector('.chat-dm-status');
  const dmForm = peopleDialog.querySelector('.chat-dm-form');
  const dmCompose = peopleDialog.querySelector('.chat-dm-compose');
  const dmInput = dmForm.querySelector('textarea');
  const dmSend = dmForm.querySelector('button');
  const dmFileInput = peopleDialog.querySelector('.chat-dm-file-input');
  const dmFileName = peopleDialog.querySelector('.chat-dm-file-name');
  const dmGifPicker = peopleDialog.querySelector('.chat-dm-gif-picker');
  const dmGifSearchForm = peopleDialog.querySelector('.chat-dm-gif-search-form');
  const dmGifSearch = dmGifSearchForm.querySelector('input');
  const dmGifStatus = peopleDialog.querySelector('.chat-dm-gif-status');
  const dmGifResults = peopleDialog.querySelector('.chat-dm-gif-results');
  const presenceMode = peopleDialog.querySelector('#chatPresenceMode');
  const profiles = new Map();
  const presence = new Map();
  const recentMessages = new Map();
  const dmGifChoices = new Map();
  let supabase = null;
  let user = null;
  let activePeerId = null;
  let selectedDmFile = null;
  let selectedDmGif = null;
  let selectedPresenceMode = 'online';
  let profilePeerId = null;
  let realtimeChannel = null;
  let heartbeat = null;
  let lastActiveTimer = null;

  const setStatus = (element, prefix, error) => {
    const detail = error?.message || String(error || 'Unknown error');
    element.textContent = `${prefix}: ${detail}`;
    console.error(prefix, error);
  };

  const monitoredStorageClients = new WeakSet();
  function exposeStorageErrorDetails(client) {
    const storage = client?.storage;
    if (!storage || monitoredStorageClients.has(storage)) return;
    const originalFetch = storage.fetch;
    if (typeof originalFetch !== 'function') return;
    monitoredStorageClients.add(storage);
    storage.fetch = async (...args) => {
      const response = await originalFetch(...args);
      const request = args[0];
      const url = typeof request === 'string' ? request : request?.url || '';
      if (response.ok || !url.includes('/storage/v1/object/community-chat-files/')) return response;
      try {
        const body = await response.clone().text();
        let detail = body.trim();
        try {
          const parsed = JSON.parse(body);
          detail = [parsed.message, parsed.error, parsed.error_description, parsed.details]
            .filter(value => typeof value === 'string' && value.trim())
            .join(' — ') || detail;
        } catch {
          detail = detail.slice(0, 500);
        }
        const requestId = [
          'x-request-id',
          'x-kong-request-id',
          'x-supabase-request-id',
          'cf-ray'
        ].map(name => response.headers.get(name)).find(Boolean);
        const metadata = [
          response.headers.get('content-type') && `response type ${response.headers.get('content-type')}`,
          response.headers.get('server') && `server ${response.headers.get('server')}`,
          requestId && `request ID ${requestId}`
        ].filter(Boolean).join(', ');
        if (metadata) detail = `${detail} [${metadata}]`;
        const headers = new Headers(response.headers);
        headers.delete('Content-Length');
        headers.delete('Content-Encoding');
        headers.set('Content-Type', 'application/json');
        return new Response(JSON.stringify({ message: detail || `Storage returned HTTP ${response.status} without details.` }), {
          status: response.status,
          statusText: response.statusText,
          headers
        });
      } catch (error) {
        console.error('Could not read the Storage upload error response.', error);
        return response;
      }
    };
  }

  function lastActiveText(timestamp) {
    if (!timestamp) return 'Last active unknown';
    const elapsed = Math.max(0, Date.now() - Date.parse(timestamp));
    if (!Number.isFinite(elapsed)) return 'Last active unknown';
    if (elapsed < 120000) return 'Online now';
    const minutes = Math.floor(elapsed / 60000);
    if (minutes < 60) return `Active ${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `Active ${hours}h ago`;
    const days = Math.floor(hours / 24);
    if (days < 7) return `Active ${days}d ago`;
    return `Last active ${new Date(timestamp).toLocaleDateString()}`;
  }

  function memberStatus(item) {
    const mode = item?.status_mode || 'online';
    const recent = item?.last_active_at && Date.now() - Date.parse(item.last_active_at) < 120000;
    if (mode === 'offline') return { mode, text: 'Offline' };
    if (mode === 'do_not_disturb') return { mode, text: 'Do not disturb' };
    if (mode === 'away') return { mode, text: 'Away' };
    return { mode: recent ? 'online' : 'offline', text: recent ? 'Online now' : lastActiveText(item?.last_active_at) };
  }

  function addAvatar(container, profile, className) {
    if (profile?.avatar_url?.startsWith('data:image/jpeg;base64,')) {
      const image = document.createElement('img');
      image.className = className;
      image.src = profile.avatar_url;
      image.alt = '';
      container.append(image);
      return;
    }
    const fallback = document.createElement('span');
    fallback.className = `${className} chat-avatar-fallback`;
    fallback.textContent = (profile?.display_name || 'F').trim().slice(0, 1).toUpperCase();
    container.append(fallback);
  }

  function renderPeople() {
    const query = search.value.trim().toLocaleLowerCase();
    const members = [...profiles.values()]
      .filter(profile => profile.user_id !== user?.id)
      .filter(profile => profile.display_name.toLocaleLowerCase().includes(query))
      .sort((a, b) => {
        const aMessage = recentMessages.get(a.user_id)?.created_at || '';
        const bMessage = recentMessages.get(b.user_id)?.created_at || '';
        return bMessage.localeCompare(aMessage) || a.display_name.localeCompare(b.display_name);
      });

    peopleList.replaceChildren();
    if (!members.length) {
      const empty = document.createElement('li');
      empty.className = 'chat-dm-empty';
      empty.textContent = query ? 'No members match that search.' : 'No other members yet. Check back soon!';
      peopleList.append(empty);
      return;
    }

    for (const profile of members) {
      const row = document.createElement('li');
      row.className = 'chat-person';
      addAvatar(row, profile, 'chat-person-avatar');
      const details = document.createElement('div');
      const name = document.createElement('strong');
      name.className = 'chat-person-name';
      name.textContent = profile.display_name;
      const state = memberStatus(presence.get(profile.user_id));
      const stateLabel = document.createElement('span');
      stateLabel.className = `chat-person-state chat-presence-${state.mode}`;
      const dot = document.createElement('span');
      dot.className = 'chat-presence-dot';
      dot.setAttribute('aria-hidden', 'true');
      const stateText = document.createElement('span');
      stateText.textContent = state.text;
      stateLabel.append(dot, stateText);
      const meta = document.createElement('span');
      const recent = recentMessages.get(profile.user_id);
      meta.className = 'chat-person-meta';
      meta.textContent = recent?.body || (recent?.attachment_path ? 'Shared a file' : recent?.gif_url ? 'Shared a GIF' : '');
      details.append(name, stateLabel, meta);
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'chat-person-message';
      button.dataset.dmPeer = profile.user_id;
      button.textContent = 'message';
      row.append(details, button);
      peopleList.append(row);
    }
  }

  async function loadPeople() {
    if (!user || !supabase) return;
    const { data: memberData, error: memberError } = await supabase
      .from('community_profiles')
      .select('user_id,display_name,avatar_url')
      .order('display_name', { ascending: true });
    if (memberError) {
      setStatus(dmStatus, 'Could not load members', memberError);
      return;
    }
    profiles.clear();
    memberData.forEach(profile => profiles.set(profile.user_id, profile));

    const memberIds = memberData.map(profile => profile.user_id);
    if (memberIds.length) {
      const { data: presenceData, error: presenceError } = await supabase
        .from('community_presence')
        .select('user_id,last_active_at,status_mode')
        .in('user_id', memberIds);
      if (presenceError) {
        setStatus(dmStatus, 'Could not load activity', presenceError);
        return;
      }
      presence.clear();
      presenceData.forEach(item => presence.set(item.user_id, item));
      const currentPresence = presence.get(user.id);
      selectedPresenceMode = currentPresence?.status_mode || 'online';
      presenceMode.value = selectedPresenceMode;
    }

    const { data: messages, error: messagesError } = await supabase
      .from('direct_messages')
      .select('sender_id,recipient_id,body,attachment_path,gif_url,created_at')
      .or(`sender_id.eq.${user.id},recipient_id.eq.${user.id}`)
      .order('created_at', { ascending: false })
      .limit(200);
    if (messagesError) {
      setStatus(dmStatus, 'Could not load conversations', messagesError);
      return;
    }
    recentMessages.clear();
    messages.forEach(item => {
      const peerId = item.sender_id === user.id ? item.recipient_id : item.sender_id;
      if (!recentMessages.has(peerId)) recentMessages.set(peerId, item);
    });
    renderPeople();
    updateProfileActivity();
  }

  async function touchPresence(mode = null) {
    if (!user || !supabase) return;
    const { data, error } = await supabase.rpc('touch_community_presence', mode ? { p_status_mode: mode } : undefined);
    if (error) {
      setStatus(dmStatus, 'Could not update your activity', error);
      chatStatus.textContent = `Your chat is connected, but activity could not be updated: ${error.message}`;
      return;
    }
    const current = presence.get(user.id) || { user_id: user.id, status_mode: selectedPresenceMode };
    presence.set(user.id, { ...current, last_active_at: data, status_mode: mode || current.status_mode });
    renderPeople();
    updateProfileActivity();
  }

  function renderMessages(items) {
    dmMessages.replaceChildren();
    for (const item of items) {
      const row = document.createElement('li');
      row.className = `chat-dm-message${item.sender_id === user?.id ? ' is-mine' : ''}`;
      const body = document.createElement('p');
      body.textContent = item.body;
      if (item.body) row.append(body);
      if (item.attachment_path) {
        if (imageAttachmentTypes.has(item.attachment_type)) {
          const figure = document.createElement('figure');
          figure.className = 'chat-dm-image-attachment';
          const attachment = document.createElement('a');
          attachment.href = '#';
          attachment.dataset.dmAttachment = item.attachment_path;
          attachment.dataset.dmImage = 'true';
          const image = document.createElement('img');
          image.alt = item.attachment_name || 'Image attachment';
          image.loading = 'lazy';
          image.decoding = 'async';
          attachment.append(image);
          figure.append(attachment);
          const caption = document.createElement('figcaption');
          caption.textContent = item.attachment_name || 'Image attachment';
          figure.append(caption);
          getAttachmentUrl(item.attachment_path).then(url => {
            if (image.isConnected) image.src = url;
          }).catch(error => {
            if (image.isConnected) caption.textContent = `Could not load image preview: ${error.message || 'please try opening the image.'}`;
          });
          row.append(figure);
        } else {
          const attachment = document.createElement('a');
          attachment.className = 'chat-attachment-link';
          attachment.href = '#';
          attachment.dataset.dmAttachment = item.attachment_path;
          attachment.textContent = `download ${item.attachment_name || 'attachment'}`;
          row.append(attachment);
        }
      }
      if (item.gif_url && isGiphyUrl(item.gif_url)) {
        const gif = document.createElement('img');
        gif.className = 'chat-dm-gif';
        gif.src = item.gif_url;
        gif.alt = 'GIF shared from GIPHY';
        gif.loading = 'lazy';
        row.append(gif);
      }
      const time = document.createElement('time');
      time.dateTime = item.created_at;
      time.textContent = new Date(item.created_at).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
      row.append(time);
      dmMessages.append(row);
    }
    dmMessages.scrollTop = dmMessages.scrollHeight;
  }

  async function openConversation(peerId) {
    if (!user || !supabase || peerId === user.id) return;
    if (activePeerId && activePeerId !== peerId) {
      selectedDmFile = null;
      selectedDmGif = null;
      dmFileInput.value = '';
      dmFileName.textContent = '';
    }
    const peer = profiles.get(peerId);
    if (!peer) {
      await loadPeople();
      if (!profiles.has(peerId)) {
        dmStatus.textContent = 'This member is no longer available.';
        return;
      }
    }
    activePeerId = peerId;
    const member = profiles.get(peerId);
    dmContact.querySelector('strong').textContent = member.display_name;
    dmContact.querySelector('p').textContent = memberStatus(presence.get(peerId)).text;
    dmContact.hidden = false;
    dmEmpty.hidden = true;
    dmMessages.hidden = false;
    dmCompose.hidden = false;
    dmInput.disabled = false;
    dmSend.disabled = false;
    dmStatus.textContent = 'Private between you and this member.';
    const { data, error } = await supabase
      .from('direct_messages')
      .select('id,sender_id,recipient_id,body,attachment_path,attachment_name,attachment_type,attachment_size,gif_id,gif_url,created_at')
      .or(`and(sender_id.eq.${user.id},recipient_id.eq.${peerId}),and(sender_id.eq.${peerId},recipient_id.eq.${user.id})`)
      .order('created_at', { ascending: true })
      .limit(100);
    if (error) {
      setStatus(dmStatus, 'Could not load this conversation', error);
      return;
    }
    if (activePeerId === peerId) renderMessages(data);
    dmInput.focus();
  }

  async function refreshConversation() {
    if (activePeerId) await openConversation(activePeerId);
    if (peopleDialog.open) await loadPeople();
  }

  async function handleUser(userValue) {
    const nextUser = userValue || null;
    if (nextUser?.id === user?.id) return;
    if (realtimeChannel && supabase) await supabase.removeChannel(realtimeChannel);
    if (heartbeat) clearInterval(heartbeat);
    if (lastActiveTimer) clearInterval(lastActiveTimer);
    realtimeChannel = null;
    user = nextUser;
    const app = context();
    supabase = app?.supabase || null;
    exposeStorageErrorDetails(supabase);
    activePeerId = null;
    profiles.clear();
    presence.clear();
    recentMessages.clear();
    peopleButton.disabled = !user || !supabase;
    presenceMode.disabled = !user || !supabase;
    dmCompose.hidden = true;
    selectedDmFile = null;
    selectedDmGif = null;
    dmFileInput.value = '';
    dmFileName.textContent = '';
    dmContact.hidden = true;
    dmMessages.hidden = true;
    dmEmpty.hidden = false;
    dmEmpty.textContent = user ? 'Choose someone from the list to start a private conversation.' : 'Sign in to find members and send private messages.';
    if (!user || !supabase) {
      if (peopleDialog.open) peopleDialog.close();
      return;
    }

    realtimeChannel = supabase.channel(`community-dm-${user.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'community_presence' }, payload => {
        const item = payload.eventType === 'DELETE' ? payload.old : payload.new;
        if (payload.eventType === 'DELETE') presence.delete(item.user_id);
        else presence.set(item.user_id, item);
        renderPeople();
        updateProfileActivity();
        if (activePeerId === item.user_id) {
          dmContact.querySelector('p').textContent = memberStatus(item).text;
        }
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'community_profiles' }, payload => {
        const item = payload.eventType === 'DELETE' ? payload.old : payload.new;
        if (payload.eventType === 'DELETE') profiles.delete(item.user_id);
        else profiles.set(item.user_id, item);
        renderPeople();
      })
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'direct_messages' }, payload => {
        const item = payload.new;
        if (item.sender_id === user?.id || item.recipient_id === user?.id) {
          void refreshConversation();
        }
      })
      .subscribe(status => {
        if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          setStatus(dmStatus, 'Live direct messages disconnected', status);
        }
      });

    await Promise.all([touchPresence(), loadPeople()]);
    heartbeat = setInterval(() => {
      if (document.visibilityState === 'visible') void touchPresence();
    }, 60000);
    lastActiveTimer = setInterval(() => {
      renderPeople();
      updateProfileActivity();
      if (activePeerId) {
        dmContact.querySelector('p').textContent = memberStatus(presence.get(activePeerId)).text;
      }
    }, 30000);
  }

  function updateProfileActivity() {
    if (!profileDialog.contains(profileActivity)) return;
    const profile = profiles.get(profilePeerId);
    profileActivity.textContent = memberStatus(presence.get(profilePeerId)).text;
    profileMessage.disabled = !user || profilePeerId === user.id || !profile;
    profileMessage.textContent = profilePeerId === user?.id ? 'That’s you' : 'Send a private message';
  }

  const profileActivity = document.createElement('p');
  profileActivity.className = 'chat-profile-last-active';
  const profileMessage = document.createElement('button');
  profileMessage.type = 'button';
  profileMessage.className = 'chat-profile-message';
  profileDialog.append(profileActivity, profileMessage);

  chatList.addEventListener('click', event => {
    const author = event.target.closest('button[data-profile-user]');
    if (!author) return;
    profilePeerId = author.dataset.profileUser;
    updateProfileActivity();
  }, true);

  profileMessage.addEventListener('click', () => {
    if (!profilePeerId || profilePeerId === user?.id) return;
    profileDialog.close();
    peopleDialog.showModal();
    void openConversation(profilePeerId);
    void loadPeople();
  });

  peopleButton.addEventListener('click', () => {
    if (!user) return;
    peopleDialog.showModal();
    void loadPeople();
    search.focus();
  });
  peopleDialog.querySelector('.chat-dm-close').addEventListener('click', () => peopleDialog.close());
  peopleDialog.addEventListener('click', async event => {
    if (event.target === peopleDialog) peopleDialog.close();
    const attachment = event.target.closest('a[data-dm-attachment]');
    if (attachment) {
      event.preventDefault();
      const popup = window.open('about:blank', '_blank');
      if (popup) popup.opener = null;
      try {
        const url = attachment.dataset.dmImage === 'true'
          ? await getAttachmentUrl(attachment.dataset.dmAttachment)
          : await supabase.storage.from('community-chat-files')
            .createSignedUrl(attachment.dataset.dmAttachment, 3600, { download: true })
            .then(({ data, error }) => {
              if (error) throw error;
              return data.signedUrl;
            });
        if (popup) popup.location.href = url;
        else window.location.href = url;
      } catch (error) {
        popup?.close();
        const action = attachment.dataset.dmImage === 'true' ? 'open the image' : 'download the attachment';
        dmStatus.textContent = `Could not ${action}: ${error.message || 'please try again.'}`;
      }
      return;
    }
    const messageButton = event.target.closest('button[data-dm-peer]');
    if (messageButton) void openConversation(messageButton.dataset.dmPeer);
  });
  search.addEventListener('input', renderPeople);
  presenceMode.addEventListener('change', async () => {
    const previousMode = selectedPresenceMode;
    selectedPresenceMode = presenceMode.value;
    dmStatus.textContent = 'Updating your status…';
    await touchPresence(selectedPresenceMode);
    if (presence.get(user?.id)?.status_mode !== selectedPresenceMode) {
      selectedPresenceMode = previousMode;
      presenceMode.value = previousMode;
      return;
    }
    dmStatus.textContent = `Your status is ${presenceMode.options[presenceMode.selectedIndex].text}.`;
  });

  peopleDialog.querySelector('.chat-dm-attach').addEventListener('click', () => dmFileInput.click());
  dmFileInput.addEventListener('change', () => {
    const file = dmFileInput.files?.[0];
    if (!file) return;
    if (file.size < 1 || file.size > 10485760) {
      dmFileInput.value = '';
      selectedDmFile = null;
      dmFileName.textContent = '';
      dmStatus.textContent = 'Choose a non-empty file no larger than 10 MB.';
      return;
    }
    selectedDmFile = file;
    selectedDmGif = null;
    dmFileName.textContent = `Attached: ${file.name}`;
    dmStatus.textContent = 'File ready to send.';
  });
  peopleDialog.querySelector('.chat-dm-gif-toggle').addEventListener('click', () => {
    dmGifPicker.hidden = !dmGifPicker.hidden;
    if (!dmGifPicker.hidden) dmGifSearch.focus();
  });
  dmGifSearchForm.addEventListener('submit', async event => {
    event.preventDefault();
    const query = dmGifSearch.value.trim();
    const apiKey = window.ORACLE_GIPHY_API_KEY;
    if (!query) return;
    if (!apiKey) {
      dmGifStatus.textContent = 'GIPHY search is not configured.';
      return;
    }
    dmGifStatus.textContent = 'Searching…';
    dmGifResults.replaceChildren();
    try {
      const params = new URLSearchParams({ api_key: apiKey, q: query, limit: '18', rating: 'g', lang: 'en' });
      const response = await fetch(`https://api.giphy.com/v1/gifs/search?${params}`);
      if (!response.ok) throw new Error(`GIPHY search failed (${response.status}).`);
      const result = await response.json();
      dmGifChoices.clear();
      const buttons = (result.data || []).flatMap(gif => {
        const url = gif.images?.fixed_height?.url;
        const previewUrl = gif.images?.fixed_width_small?.url || url;
        if (!gif.id || !isGiphyUrl(url) || !isGiphyUrl(previewUrl)) return [];
        dmGifChoices.set(gif.id, { id: gif.id, url, title: gif.title || 'GIPHY GIF' });
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'chat-gif-result';
        button.dataset.dmGifId = gif.id;
        button.setAttribute('aria-label', `Send ${gif.title || 'GIF'}`);
        const image = document.createElement('img');
        image.src = previewUrl;
        image.alt = gif.title || 'GIPHY GIF';
        image.loading = 'lazy';
        button.append(image);
        return [button];
      });
      dmGifResults.replaceChildren(...buttons);
      dmGifStatus.textContent = buttons.length ? 'Choose a GIF to add it to your message.' : 'No GIFs found.';
    } catch (error) {
      dmGifStatus.textContent = error.message || 'Could not search GIPHY.';
    }
  });
  dmGifResults.addEventListener('click', event => {
    const button = event.target.closest('button[data-dm-gif-id]');
    const gif = button && dmGifChoices.get(button.dataset.dmGifId);
    if (!gif) return;
    selectedDmGif = gif;
    selectedDmFile = null;
    dmFileInput.value = '';
    dmFileName.textContent = `GIF selected: ${gif.title}`;
    dmGifPicker.hidden = true;
    dmStatus.textContent = 'GIF ready to send.';
  });

  dmForm.addEventListener('submit', async event => {
    event.preventDefault();
    const body = dmInput.value.trim();
    const file = selectedDmFile;
    const gif = selectedDmGif;
    if ((!body && !file && !gif) || body.length > 500 || !user || !activePeerId || !supabase) return;
    dmSend.disabled = true;
    peopleDialog.querySelector('.chat-dm-attach').disabled = true;
    peopleDialog.querySelector('.chat-dm-gif-toggle').disabled = true;
    dmStatus.textContent = 'Sending…';
    const recipientId = activePeerId;
    let attachmentPath = null;
    let attachmentUploaded = false;
    try {
      const message = { sender_id: user.id, recipient_id: recipientId, body };
      if (file) {
        attachmentPath = `${user.id}/dm/${crypto.randomUUID()}`;
        const { error: uploadError } = await supabase.storage
          .from('community-chat-files')
          .upload(attachmentPath, file, { contentType: 'application/octet-stream', upsert: false });
        if (uploadError) throw new Error(`Storage upload failed${uploadError.statusCode ? ` (HTTP ${uploadError.statusCode})` : ''}: ${uploadError.message || 'check the file type and size.'}`);
        attachmentUploaded = true;
        Object.assign(message, {
          attachment_path: attachmentPath,
          attachment_name: file.name.slice(0, 255),
          attachment_type: file.type || 'application/octet-stream',
          attachment_size: file.size
        });
      }
      if (gif) Object.assign(message, { gif_id: gif.id, gif_url: gif.url });
      const { data, error } = await supabase
        .from('direct_messages')
        .insert(message)
        .select('id,sender_id,recipient_id,body,attachment_path,attachment_name,attachment_type,attachment_size,gif_id,gif_url,created_at')
        .single();
      if (error) throw error;
      dmInput.value = '';
      selectedDmFile = null;
      selectedDmGif = null;
      dmFileInput.value = '';
      dmFileName.textContent = '';
      if (user?.id !== data.sender_id || activePeerId !== recipientId) return;
      await openConversation(recipientId);
      dmStatus.textContent = 'Private message sent.';
      void loadPeople();
    } catch (error) {
      let cleanupMessage = '';
      if (attachmentUploaded && attachmentPath) {
        const { error: cleanupError } = await supabase.storage.from('community-chat-files').remove([attachmentPath]);
        if (cleanupError) {
          cleanupMessage = ` The uploaded file could not be cleaned up: ${cleanupError.message}`;
          console.error('Could not clean up an uploaded direct-message file.', cleanupError);
        }
      }
      setStatus(dmStatus, 'Could not send your private message', `${error.message || 'please try again.'}${cleanupMessage}`);
    } finally {
      dmSend.disabled = !user || !activePeerId;
      peopleDialog.querySelector('.chat-dm-attach').disabled = !user || !activePeerId;
      peopleDialog.querySelector('.chat-dm-gif-toggle').disabled = !user || !activePeerId;
    }
  });

  chatList.addEventListener('click', async event => {
    const attachment = event.target.closest('a[data-chat-attachment]');
    if (!attachment) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    if (!user || !supabase) return;
    const popup = window.open('about:blank', '_blank');
    if (popup) popup.opener = null;
    try {
      const { data, error } = await supabase.storage
        .from('community-chat-files')
        .createSignedUrl(attachment.dataset.chatAttachment, 3600, { download: true });
      if (error) throw error;
      if (popup) popup.location.href = data.signedUrl;
      else window.location.href = data.signedUrl;
    } catch (error) {
      popup?.close();
      chatStatus.textContent = `Could not download the attachment: ${error.message || 'please try again.'}`;
      console.error('Could not create a signed chat attachment URL.', error);
    }
  }, true);

  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') void touchPresence();
  });

  const app = context();
  supabase = app?.supabase || null;
  exposeStorageErrorDetails(supabase);
  if (!supabase) {
    peopleButton.title = 'Sign in to see community members.';
  } else {
    supabase.auth.onAuthStateChange((_event, session) => {
      setTimeout(() => { void handleUser(session?.user || null); }, 0);
    });
    supabase.auth.getSession().then(({ data, error }) => {
      if (error) {
        setStatus(chatStatus, 'Could not check your sign-in status', error);
        return;
      }
      void handleUser(data.session?.user || null);
    }).catch(error => setStatus(chatStatus, 'Could not check your sign-in status', error));
  }
})();
