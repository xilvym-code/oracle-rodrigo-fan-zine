(() => {
  const context = () => window.getCommunityChatContext?.();
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
    .chat-person-online { color: #557548; }
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
    .chat-dm-message time { display: block; margin-top: 5px; text-align: right; font: 8px var(--mono); color: #756861; }
    .chat-dm-empty { display: grid; flex: 1; place-items: center; padding: 20px; text-align: center; font: 11px/1.6 var(--mono); color: #756861; }
    .chat-dm-form { display: grid; grid-template-columns: minmax(0, 1fr) auto; gap: 9px; align-items: end; }
    .chat-dm-form textarea { width: 100%; min-height: 56px; max-height: 120px; resize: vertical; padding: 11px; border: 1px solid var(--line); border-radius: 12px; background: #fff; font: 12px/1.5 var(--sans); }
    .chat-dm-form button { min-height: 42px; border-radius: 999px; }
    .chat-dm-status { min-height: 17px; margin: 4px 0 8px; font: 9px var(--mono); color: #756861; }
    .chat-dm-status:empty { display: none; }
    .theme-dark .community-chat, .theme-dark .chat-dm-dialog, .theme-dark .chat-dm-header { background: #29232a; color: var(--ink); }
    .theme-dark .chat-messages, .theme-dark .chat-person, .theme-dark .chat-compose textarea, .theme-dark .chat-dm-form textarea { background: #302a32; color: var(--ink); }
    .theme-dark .chat-message { background: #38313a; color: var(--ink); }
    .theme-dark .chat-people-search { background: #302a32; color: var(--ink); }
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
        <form class="chat-dm-form" hidden>
          <textarea maxlength="500" required placeholder="Write a private message…" aria-label="Private message"></textarea>
          <button class="pill" type="submit">send ↗</button>
        </form>
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
  const dmInput = dmForm.querySelector('textarea');
  const dmSend = dmForm.querySelector('button');
  const profiles = new Map();
  const presence = new Map();
  const recentMessages = new Map();
  let supabase = null;
  let user = null;
  let activePeerId = null;
  let profilePeerId = null;
  let realtimeChannel = null;
  let heartbeat = null;
  let lastActiveTimer = null;

  const setStatus = (element, prefix, error) => {
    const detail = error?.message || String(error || 'Unknown error');
    element.textContent = `${prefix}: ${detail}`;
    console.error(prefix, error);
  };

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
      const meta = document.createElement('span');
      const activity = presence.get(profile.user_id)?.last_active_at;
      meta.className = `chat-person-meta${activity && Date.now() - Date.parse(activity) < 120000 ? ' chat-person-online' : ''}`;
      const recent = recentMessages.get(profile.user_id);
      meta.textContent = recent?.body ? `${lastActiveText(activity)} · ${recent.body.slice(0, 28)}` : lastActiveText(activity);
      details.append(name, meta);
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
        .select('user_id,last_active_at')
        .in('user_id', memberIds);
      if (presenceError) {
        setStatus(dmStatus, 'Could not load activity', presenceError);
        return;
      }
      presence.clear();
      presenceData.forEach(item => presence.set(item.user_id, item));
    }

    const { data: messages, error: messagesError } = await supabase
      .from('direct_messages')
      .select('sender_id,recipient_id,body,created_at')
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

  async function touchPresence() {
    if (!user || !supabase) return;
    const { data, error } = await supabase.rpc('touch_community_presence');
    if (error) {
      setStatus(dmStatus, 'Could not update your activity', error);
      chatStatus.textContent = `Your chat is connected, but activity could not be updated: ${error.message}`;
      return;
    }
    presence.set(user.id, { user_id: user.id, last_active_at: data });
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
      const time = document.createElement('time');
      time.dateTime = item.created_at;
      time.textContent = new Date(item.created_at).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
      row.append(body, time);
      dmMessages.append(row);
    }
    dmMessages.scrollTop = dmMessages.scrollHeight;
  }

  async function openConversation(peerId) {
    if (!user || !supabase || peerId === user.id) return;
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
    dmContact.querySelector('p').textContent = lastActiveText(presence.get(peerId)?.last_active_at);
    dmContact.hidden = false;
    dmEmpty.hidden = true;
    dmMessages.hidden = false;
    dmForm.hidden = false;
    dmInput.disabled = false;
    dmSend.disabled = false;
    dmStatus.textContent = 'Private between you and this member.';
    const { data, error } = await supabase
      .from('direct_messages')
      .select('id,sender_id,recipient_id,body,created_at')
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
    activePeerId = null;
    profiles.clear();
    presence.clear();
    recentMessages.clear();
    peopleButton.disabled = !user || !supabase;
    dmForm.hidden = true;
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
    }, 30000);
  }

  function updateProfileActivity() {
    if (!profileDialog.contains(profileActivity)) return;
    const profile = profiles.get(profilePeerId);
    profileActivity.textContent = lastActiveText(presence.get(profilePeerId)?.last_active_at);
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
  peopleDialog.addEventListener('click', event => {
    if (event.target === peopleDialog) peopleDialog.close();
    const messageButton = event.target.closest('button[data-dm-peer]');
    if (messageButton) void openConversation(messageButton.dataset.dmPeer);
  });
  search.addEventListener('input', renderPeople);

  dmForm.addEventListener('submit', async event => {
    event.preventDefault();
    const body = dmInput.value.trim();
    if (!body || body.length > 500 || !user || !activePeerId || !supabase) return;
    dmSend.disabled = true;
    dmStatus.textContent = 'Sending…';
    const recipientId = activePeerId;
    const { data, error } = await supabase
      .from('direct_messages')
      .insert({ sender_id: user.id, recipient_id: recipientId, body })
      .select('id,sender_id,recipient_id,body,created_at')
      .single();
    if (error) {
      setStatus(dmStatus, 'Could not send your private message', error);
      dmSend.disabled = false;
      return;
    }
    dmInput.value = '';
    dmSend.disabled = false;
    if (user?.id !== data.sender_id || activePeerId !== recipientId) return;
    await openConversation(recipientId);
    dmStatus.textContent = 'Private message sent.';
    void loadPeople();
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
