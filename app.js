const SUPABASE_URL = 'https://omkyyjhzcvwscnktwltn.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_zFBxBClCpdTgMwcio6itCA_K990QHlX';

const { createClient } = supabase;
const db = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const app = document.getElementById('app');

let currentUser = null;
let currentProfile = null;
let currentTheme = localStorage.getItem('altclass_theme') || 'system';

const PENDING_CODE_KEY = 'altclass_pending_code';

function applyTheme(theme) {
  currentTheme = theme;
  const html = document.documentElement;
  if (theme === 'dark') {
    html.classList.add('dark');
  } else if (theme === 'light') {
    html.classList.remove('dark');
  } else {
    if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
      html.classList.add('dark');
    } else {
      html.classList.remove('dark');
    }
  }
}

applyTheme(currentTheme);

window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
  if (currentTheme === 'system') applyTheme('system');
});

function showToast(message, type = 'default') {
  const container = document.getElementById('toast-container');
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.textContent = message;
  container.appendChild(toast);
  setTimeout(() => toast.remove(), 3500);
}

function formatDate(dateStr) {
  return new Date(dateStr).toLocaleDateString('uk-UA', { day: '2-digit', month: 'short', year: 'numeric' });
}

function isTestExpired(createdAt) {
  return new Date() > new Date(new Date(createdAt).getTime() + 7 * 24 * 60 * 60 * 1000);
}

function expiryDate(createdAt) {
  return new Date(new Date(createdAt).getTime() + 7 * 24 * 60 * 60 * 1000)
    .toLocaleDateString('uk-UA', { day: '2-digit', month: 'short', year: 'numeric' });
}

function getScoreClass(score, total) {
  const pct = (score / total) * 100;
  if (pct >= 75) return 'high';
  if (pct >= 50) return 'mid';
  return 'low';
}

function getScoreLabel(score, total) {
  const grade = scoreToGrade(score, total);
  if (grade >= 10) return 'Відмінно 🎉';
  if (grade >= 7) return 'Добре 👍';
  if (grade >= 4) return 'Задовільно 📚';
  return 'Незадовільно 😕';
}

function scoreToGrade(score, total) {
  if (!total) return 1;
  const pct = (score / total) * 100;
  if (pct === 100) return 12;
  if (pct >= 90) return 11;
  if (pct >= 83) return 10;
  if (pct >= 75) return 9;
  if (pct >= 67) return 8;
  if (pct >= 58) return 7;
  if (pct >= 50) return 6;
  if (pct >= 42) return 5;
  if (pct >= 33) return 4;
  if (pct >= 25) return 3;
  if (pct >= 12) return 2;
  return 1;
}

function generateCode() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

function navigate(path) {
  window.history.pushState({}, '', path);
  router();
}

async function router() {
  const path = window.location.pathname;
  const testCodeMatch = path.match(/^\/(\d{6})$/);
  const profileMatch = path.match(/^\/u\/(.+)$/);

  if (path === '/' || path === '') { renderHome(); return; }
  if (path === '/auth') { renderAuth(); return; }
  if (testCodeMatch) { await renderTestLanding(testCodeMatch[1]); return; }
  if (profileMatch) { await renderProfilePage(profileMatch[1]); return; }

  if (path === '/create') {
    if (!currentUser || currentProfile?.role !== 'teacher') { navigate('/'); return; }
    renderTestEditorPage(null);
    return;
  }

  const editRouteMatch = path.match(/^\/edit\/(.+)$/);
  if (editRouteMatch) {
    if (!currentUser || currentProfile?.role !== 'teacher') { navigate('/'); return; }
    await renderTestEditorPage(editRouteMatch[1]);
    return;
  }

  renderNotFound();
}

function renderNavbar() {
  const settingsBtn = currentUser ? `<button class="icon-btn" onclick="openSettings()" title="Налаштування">⚙</button>` : '';

  if (!currentUser) {
    return `
      <nav class="navbar">
        <span class="nav-logo" onclick="navigate('/')">
          <span class="logo-alt">Alt</span><span class="logo-class">Class</span>
        </span>
        <div class="nav-right">
          ${settingsBtn}
          <button class="btn btn-outline btn-sm" onclick="navigate('/auth')">Увійти</button>
        </div>
      </nav>
    `;
  }
  return `
    <nav class="navbar">
      <span class="nav-logo" onclick="navigate('/')">
        <span class="logo-alt">Alt</span><span class="logo-class">Class</span>
      </span>
      <div class="nav-right">
        ${settingsBtn}
        <button class="avatar-btn" onclick="navigate('/u/${currentUser.id}')" title="${escapeAttr(currentProfile?.name || '')}">
          ${currentProfile?.avatar_url
            ? `<img src="${currentProfile.avatar_url}" alt="" />`
            : (currentProfile?.name?.[0] || '?').toUpperCase()}
        </button>
      </div>
    </nav>
  `;
}

function renderLayout(content) {
  app.innerHTML = renderNavbar() + content;
}

function renderHome() {
  const loggedIn = !!currentUser;
  app.innerHTML = `
    ${renderNavbar()}
    <div class="home-hero">
      <div class="home-hero-inner">
        <div class="home-badge">Платформа для тестування</div>
        <h1 class="home-title">
          Навчай та перевіряй знання<br/>з <span class="logo-alt">Alt</span><span style="color:var(--dark)">Class</span>
        </h1>
        <p class="home-sub">Вчителі створюють тести за лічені хвилини. Учні проходять їх за унікальним кодом.</p>

        <div class="code-enter-box">
          <div class="code-enter-label">Введіть код тесту</div>
          <div class="code-enter-row">
            <input class="code-input" type="text" id="home-code-input" placeholder="000000" maxlength="6"
              oninput="handleCodeInput(this)" onkeydown="if(event.key==='Enter') handleCodeSubmit()" />
            <button class="btn btn-primary" onclick="handleCodeSubmit()" id="code-go-btn" disabled>→</button>
          </div>
        </div>

        ${loggedIn ? `
          <div class="home-actions-row">
            <button class="btn btn-ghost" onclick="navigate('/u/${currentUser.id}')">Мій кабінет</button>
            ${currentProfile?.role === 'teacher' ? `<button class="btn btn-outline" onclick="openCreateTest()">+ Створити тест</button>` : ''}
          </div>
        ` : `
          <div class="home-actions-row">
            <button class="btn btn-ghost" onclick="navigate('/auth')">Увійти в акаунт</button>
          </div>
        `}
      </div>

      <div class="home-features">
        <div class="feature-card">
          <div class="feature-icon">✏️</div>
          <h3>Для вчителів</h3>
          <p>Створюйте тести з декількома варіантами відповідей. Кожен тест отримує унікальний 6-значний код.</p>
        </div>
        <div class="feature-card">
          <div class="feature-icon">🎓</div>
          <h3>Для учнів</h3>
          <p>Отримайте код від вчителя, введіть його та пройдіть тест. Результати зберігаються автоматично.</p>
        </div>
        <div class="feature-card">
          <div class="feature-icon">📊</div>
          <h3>Аналітика</h3>
          <p>Відстежуйте прогрес. В особистому кабінеті зберігається повна історія тестів та оцінок.</p>
        </div>
      </div>
    </div>
  `;
}

function handleCodeInput(input) {
  input.value = input.value.replace(/\D/g, '').slice(0, 6);
  document.getElementById('code-go-btn').disabled = input.value.length !== 6;
}

function handleCodeSubmit() {
  const code = document.getElementById('home-code-input').value.trim();
  if (code.length !== 6) return;
  navigate(`/${code}`);
}

function renderAuth(mode = 'login') {
  if (window.location.pathname !== '/auth') window.history.pushState({}, '', '/auth');

  app.innerHTML = `
    <div class="auth-wrapper">
      <div style="position:absolute;top:20px;left:20px">
        <span class="nav-logo" onclick="navigate('/')" style="cursor:pointer">
          <span class="logo-alt">Alt</span><span class="logo-class">Class</span>
        </span>
      </div>
      <div class="auth-card">
        <div class="auth-tabs">
          <button class="auth-tab ${mode === 'login' ? 'active' : ''}" id="tab-login" onclick="switchAuthTab('login')">Вхід</button>
          <button class="auth-tab ${mode === 'register' ? 'active' : ''}" id="tab-register" onclick="switchAuthTab('register')">Реєстрація</button>
        </div>

        <div id="auth-form-login" ${mode !== 'login' ? 'style="display:none"' : ''}>
          <div class="form-group">
            <label class="form-label">Електронна пошта</label>
            <input class="form-input" type="email" id="login-email" placeholder="you@example.com" />
          </div>
          <div class="form-group">
            <label class="form-label">Пароль</label>
            <input class="form-input" type="password" id="login-password" placeholder="••••••••"
              onkeydown="if(event.key==='Enter') handleLogin()" />
          </div>
          <button class="btn btn-primary btn-full" onclick="handleLogin()" id="login-btn">Увійти</button>
        </div>

        <div id="auth-form-register" ${mode !== 'register' ? 'style="display:none"' : ''}>
          <div class="form-group">
            <label class="form-label">Ім'я та прізвище</label>
            <input class="form-input" type="text" id="reg-name" placeholder="Ваше ім'я" />
          </div>
          <div class="form-group">
            <label class="form-label">Електронна пошта</label>
            <input class="form-input" type="email" id="reg-email" placeholder="you@example.com" />
          </div>
          <div class="form-group">
            <label class="form-label">Пароль</label>
            <input class="form-input" type="password" id="reg-password" placeholder="Мінімум 6 символів"
              onkeydown="if(event.key==='Enter') handleRegister()" />
          </div>
          <button class="btn btn-primary btn-full" onclick="handleRegister()" id="register-btn">Створити акаунт</button>
        </div>

        <div class="divider">або</div>

        <button class="google-btn" onclick="handleGoogleLogin()">
          <svg width="16" height="16" viewBox="0 0 18 18">
            <path fill="#4285F4" d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.875 2.684-6.615z"/>
            <path fill="#34A853" d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332C2.438 15.983 5.482 18 9 18z"/>
            <path fill="#FBBC05" d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332z"/>
            <path fill="#EA4335" d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0 5.482 0 2.438 2.017.957 4.958L3.964 6.29C4.672 4.163 6.656 3.58 9 3.58z"/>
          </svg>
          Продовжити з Google
        </button>
      </div>
    </div>
  `;
}

function switchAuthTab(tab) {
  document.getElementById('tab-login').classList.toggle('active', tab === 'login');
  document.getElementById('tab-register').classList.toggle('active', tab === 'register');
  document.getElementById('auth-form-login').style.display = tab === 'login' ? '' : 'none';
  document.getElementById('auth-form-register').style.display = tab === 'register' ? '' : 'none';
}

async function handleLogin() {
  const email = document.getElementById('login-email').value.trim();
  const password = document.getElementById('login-password').value;
  const btn = document.getElementById('login-btn');
  if (!email || !password) { showToast('Заповніть усі поля', 'error'); return; }
  btn.disabled = true; btn.textContent = 'Вхід...';
  const { error } = await db.auth.signInWithPassword({ email, password });
  if (error) {
    showToast('Невірна пошта або пароль', 'error');
    btn.disabled = false; btn.textContent = 'Увійти';
  }
}

async function handleRegister() {
  const name = document.getElementById('reg-name').value.trim();
  const email = document.getElementById('reg-email').value.trim();
  const password = document.getElementById('reg-password').value;
  const btn = document.getElementById('register-btn');
  if (!name || !email || !password) { showToast('Заповніть усі поля', 'error'); return; }
  if (password.length < 6) { showToast('Пароль мінімум 6 символів', 'error'); return; }
  btn.disabled = true; btn.textContent = 'Реєстрація...';
  const { data, error } = await db.auth.signUp({ email, password, options: { data: { full_name: name } } });
  if (error) {
    showToast(error.message, 'error');
    btn.disabled = false; btn.textContent = 'Створити акаунт';
    return;
  }
  if (data.user) {
    await ensureProfile(data.user, name);
    showToast('Акаунт створено! Перевірте пошту для підтвердження.', 'success');
    btn.disabled = false; btn.textContent = 'Створити акаунт';
  }
}

async function handleGoogleLogin() {
  const { error } = await db.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: window.location.origin } });
  if (error) showToast('Помилка Google входу', 'error');
}

async function handleLogout() {
  await db.auth.signOut();
  currentUser = null; currentProfile = null;
  navigate('/');
}

async function ensureProfile(user, name = null) {
  const { data: existing, error: fetchError } = await db.from('profiles').select('*').eq('id', user.id).single();
  if (existing) { currentProfile = existing; return existing; }
  if (fetchError && fetchError.code !== 'PGRST116') { showToast('Помилка завантаження профілю', 'error'); return null; }
  const email = user.email;
  const { data: teacher } = await db.from('allowed_teachers').select('email').eq('email', email).single();
  const role = teacher ? 'teacher' : 'student';
  const displayName = name || user.user_metadata?.full_name || email.split('@')[0];
  const avatarUrl = user.user_metadata?.avatar_url || null;
  const { data: profile, error: insertError } = await db.from('profiles').insert({
    id: user.id, email, name: displayName, role, avatar_url: avatarUrl,
  }).select().single();
  if (insertError) { showToast('Помилка створення профілю: ' + insertError.message, 'error'); return null; }
  currentProfile = profile;
  return profile;
}

async function afterAuthRedirect() {
  const pendingCode = sessionStorage.getItem(PENDING_CODE_KEY);
  if (pendingCode) { sessionStorage.removeItem(PENDING_CODE_KEY); navigate(`/${pendingCode}`); }
  else { navigate(`/u/${currentUser.id}`); }
}

function openSettings() {
  const theme = currentTheme;
  document.body.insertAdjacentHTML('beforeend', `
    <div class="modal-overlay" id="settings-modal" onclick="closeModalOutside(event)">
      <div class="modal" style="max-width:420px">
        <div class="modal-header">
          <h2 class="modal-title">⚙ Налаштування</h2>
          <button class="modal-close" onclick="closeModal('settings-modal')">✕</button>
        </div>
        <div class="settings-section">
          ${currentUser ? `
            <div class="form-group">
              <label class="form-label">Ім'я на сайті</label>
              <input class="form-input" type="text" id="settings-name"
                value="${escapeAttr(currentProfile?.name || '')}" placeholder="Ваше ім'я" />
            </div>
            <div class="form-group">
              <label class="form-label">Посилання на аватар</label>
              <div class="settings-avatar-row">
                <div class="settings-avatar-preview" id="settings-avatar-preview">
                  ${currentProfile?.avatar_url
                    ? `<img src="${escapeAttr(currentProfile.avatar_url)}" />`
                    : `<span>${(currentProfile?.name?.[0] || '?').toUpperCase()}</span>`}
                </div>
                <input class="form-input" type="url" id="settings-avatar"
                  value="${escapeAttr(currentProfile?.avatar_url || '')}"
                  placeholder="https://..."
                  oninput="previewSettingsAvatar(this.value)" />
              </div>
            </div>
          ` : ''}
          <div class="form-group">
            <label class="form-label">Тема</label>
            <div class="theme-selector">
              <button class="theme-btn ${theme==='light'?'active':''}" onclick="setThemeBtn('light', this)">☀ Світла</button>
              <button class="theme-btn ${theme==='dark'?'active':''}" onclick="setThemeBtn('dark', this)">◑ Темна</button>
              <button class="theme-btn ${theme==='system'?'active':''}" onclick="setThemeBtn('system', this)">⊙ Системна</button>
            </div>
          </div>
        </div>
        <div class="fe-actions">
          <button class="btn btn-ghost" onclick="closeModal('settings-modal')">Скасувати</button>
          ${currentUser ? `<button class="btn btn-primary" onclick="saveSettings()">Зберегти</button>` : ''}
        </div>
        ${currentUser ? `
          <div style="margin-top:16px;padding-top:14px;border-top:1px solid var(--border);text-align:right">
            <button class="btn btn-ghost btn-sm" onclick="handleLogout();closeModal('settings-modal')" style="color:var(--red)">Вийти</button>
          </div>
        ` : ''}
      </div>
    </div>
  `);
}

window.setThemeBtn = function(theme, btn) {
  document.querySelectorAll('#settings-modal .theme-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  applyTheme(theme);
  localStorage.setItem('altclass_theme', theme);
};

window.previewSettingsAvatar = function(url) {
  const preview = document.getElementById('settings-avatar-preview');
  if (!preview) return;
  if (url) {
    preview.innerHTML = `<img src="${escapeAttr(url)}" onerror="this.style.display='none'" />`;
  } else {
    preview.innerHTML = `<span>${(currentProfile?.name?.[0] || '?').toUpperCase()}</span>`;
  }
};

window.saveSettings = async function() {
  const nameEl = document.getElementById('settings-name');
  const avatarEl = document.getElementById('settings-avatar');
  const name = nameEl?.value.trim();
  const avatarUrl = avatarEl?.value.trim() || null;

  if (name !== undefined && !name) { showToast('Введіть ім\'я', 'error'); return; }

  const updates = {};
  if (name !== undefined) updates.name = name;
  if (avatarUrl !== undefined) updates.avatar_url = avatarUrl;

  if (Object.keys(updates).length > 0) {
    const { error } = await db.from('profiles').update(updates).eq('id', currentUser.id);
    if (error) { showToast('Помилка збереження: ' + error.message, 'error'); return; }
    if (updates.name) currentProfile.name = updates.name;
    if ('avatar_url' in updates) currentProfile.avatar_url = updates.avatar_url;
  }

  showToast('Налаштування збережено', 'success');
  closeModal('settings-modal');
  const navbar = document.querySelector('.navbar');
  if (navbar) navbar.outerHTML = renderNavbar();
  document.querySelector('.navbar')?.remove();
  app.prepend(Object.assign(document.createElement('div'), { innerHTML: renderNavbar() }).firstElementChild);
};

async function renderTestLanding(code) {
  renderLayout(`<div class="page" style="display:flex;align-items:center;justify-content:center;min-height:80vh"><div class="loading-spinner" style="margin:0 auto"></div></div>`);
  const { data: test } = await db.from('tests').select('*').eq('code', code).single();
  if (!test) { renderNotFound(); return; }
  if (!test.is_active) { renderBlockedTest('Цей тест деактивовано вчителем.'); return; }
  if (isTestExpired(test.created_at)) { renderBlockedTest('Час дії цього тесту закінчився (7 днів).'); return; }
  if (!currentUser) {
    sessionStorage.setItem(PENDING_CODE_KEY, code);
    showToast('Спочатку увійдіть у свій акаунт', 'info');
    renderAuth();
    return;
  }
  const { data: existing } = await db.from('test_results').select('id, score, total, completed_at')
    .eq('student_id', currentUser.id).eq('test_id', test.id).single();
  if (existing) { renderAlreadyPassed(test, existing); return; }
  renderTestConfirm(test);
}

function renderTestConfirm(test) {
  const questionsCount = test.questions?.length || 0;
  const timeLimit = test.time_limit || 0;
  renderLayout(`
    <div class="page" style="display:flex;align-items:center;justify-content:center;min-height:80vh">
      <div class="test-confirm-card">
        <div class="test-confirm-icon">📋</div>
        <h2 class="test-confirm-title">${test.title}</h2>
        <div class="test-confirm-meta">
          <div class="confirm-meta-item">
            <span class="confirm-meta-label">Питань</span>
            <span class="confirm-meta-value">${questionsCount}</span>
          </div>
          <div class="confirm-meta-item">
            <span class="confirm-meta-label">&#9201; Час</span>
            <span class="confirm-meta-value">${timeLimit ? timeLimit + ' хв' : '∞'}</span>
          </div>
          <div class="confirm-meta-item">
            <span class="confirm-meta-label">Активний до</span>
            <span class="confirm-meta-value">${expiryDate(test.created_at)}</span>
          </div>
        </div>
        <p class="test-confirm-notice">Після початку тест не можна зупинити. Пройти можна лише один раз. Відповідайте уважно.</p>
        <div class="test-confirm-actions">
          <button class="btn btn-ghost" onclick="navigate('/')">Скасувати</button>
          <button class="btn btn-primary" onclick="startTestById('${test.id}', '${escapeAttr(JSON.stringify(test))}')">Розпочати →</button>
        </div>
      </div>
    </div>
  `);
}

function renderAlreadyPassed(test, result) {
  const cls = getScoreClass(result.score, result.total);
  const pct = Math.round((result.score / result.total) * 100);
  const grade = scoreToGrade(result.score, result.total);
  renderLayout(`
    <div class="page" style="display:flex;align-items:center;justify-content:center;min-height:80vh">
      <div class="test-confirm-card" style="text-align:center">
        <div class="result-circle ${cls}" style="margin:0 auto 20px">
          <span class="result-score-num">${result.score}</span>
          <span class="result-score-denom">з ${result.total}</span>
        </div>
        <h2 class="test-confirm-title">Ви вже проходили цей тест</h2>
        <div class="result-grade-badge grade-${cls}" style="margin-bottom:10px">Оцінка: <strong>${grade}</strong> / 12</div>
        <p style="color:var(--gray-500);font-size:0.85rem;margin:0 0 20px">${test.title} · ${pct}% · ${formatDate(result.completed_at)}</p>
        <button class="btn btn-primary" onclick="navigate('/u/${currentUser.id}')">До мого кабінету</button>
      </div>
    </div>
  `);
}

window.startTestById = function(testId, testJson) {
  let test;
  try { test = JSON.parse(testJson); } catch { showToast('Помилка завантаження тесту', 'error'); return; }
  startTest(test);
};

function renderBlockedTest(message) {
  renderLayout(`
    <div class="not-found">
      <div style="font-size:2.5rem;margin-bottom:14px">🔒</div>
      <h2>Тест недоступний</h2>
      <p>${message}</p>
      <button class="btn btn-primary" onclick="navigate('/')">На головну</button>
    </div>
  `);
}

async function renderProfilePage(userId) {
  renderLayout(`<div class="page" style="display:flex;align-items:center;justify-content:center;min-height:80vh"><div class="loading-spinner" style="margin:0 auto"></div></div>`);
  const { data: profile } = await db.from('profiles').select('*').eq('id', userId).single();
  if (!profile) { renderNotFound(); return; }
  if (profile.role === 'teacher') await renderTeacherProfile(profile);
  else await renderStudentProfile(profile);
}

async function renderTeacherProfile(profile) {
  const isOwn = currentUser?.id === profile.id;
  const { data: tests } = await db.from('tests').select('*').eq('teacher_id', profile.id).order('created_at', { ascending: false });
  const allTests = tests || [];
  const activeCount = allTests.filter(t => t.is_active && !isTestExpired(t.created_at)).length;

  const testsHtml = allTests.length === 0
    ? `<div class="empty-state"><div class="empty-state-icon">📋</div><h3>Тестів ще немає</h3><p>Створіть перший тест для своїх учнів</p>${isOwn ? `<button class="btn btn-primary" onclick="openCreateTest()">+ Новий тест</button>` : ''}</div>`
    : `<div class="card-list">${allTests.map(t => renderTeacherTestCard(t, isOwn)).join('')}</div>`;

  renderLayout(`
    <div class="page-wide">
      <div class="profile-header">
        <div class="profile-avatar">
          ${profile.avatar_url ? `<img src="${profile.avatar_url}" alt="" />` : (profile.name?.[0] || '?').toUpperCase()}
        </div>
        <div class="profile-info">
          <h1>${profile.name || 'Без імені'}</h1>
          <p>${profile.email}</p>
          <span class="role-badge teacher">✏️ Вчитель</span>
        </div>
      </div>

      <div class="stats-row">
        <div class="stat-card"><span class="stat-num">${allTests.length}</span><span class="stat-label">Всього тестів</span></div>
        <div class="stat-card"><span class="stat-num">${activeCount}</span><span class="stat-label">Активних</span></div>
        <div class="stat-card"><span class="stat-num">${allTests.length - activeCount}</span><span class="stat-label">Завершених</span></div>
      </div>

      <div class="section-header">
        <h2 class="section-title">Мої тести</h2>
        ${isOwn ? `<button class="btn btn-primary btn-sm" onclick="openCreateTest()">+ Новий тест</button>` : ''}
      </div>

      ${testsHtml}

      ${isOwn ? `<div style="margin-top:32px;padding-top:20px;border-top:1px solid var(--border);text-align:center"><button class="btn btn-ghost btn-sm" onclick="handleLogout()">Вийти з акаунту</button></div>` : ''}
    </div>
  `);
}

function renderTeacherTestCard(test, isOwn) {
  const expired = isTestExpired(test.created_at);
  const status = !test.is_active ? 'inactive' : expired ? 'expired' : 'active';
  const statusLabel = status === 'active' ? 'Активний' : status === 'expired' ? 'Завершено' : 'Деактивовано';
  const questionsCount = test.questions?.length || 0;
  return `
    <div class="test-card" id="test-card-${test.id}">
      <div class="test-card-header">
        <div class="test-card-info">
          <h3>${test.title}</h3>
          <div class="test-card-meta">
            <span class="meta-tag"><span class="status-dot ${status}"></span> ${statusLabel}</span>
            <span class="meta-tag">📝 ${questionsCount} питань</span>
            <span class="meta-tag">📅 До ${expiryDate(test.created_at)}</span>
          </div>
        </div>
        <div class="test-card-actions">
          <span class="code-chip" onclick="copyCode('${test.code}')" title="Скопіювати посилання">🔗 ${test.code}</span>
          ${isOwn ? `
            <button class="btn btn-sm btn-outline" onclick="openEditTest('${test.id}')">✎ Редагувати</button>
            <button class="btn btn-sm ${test.is_active ? 'btn-ghost' : 'btn-success'}" onclick="toggleTestActive('${test.id}', ${test.is_active})">
              ${test.is_active ? 'Деактивувати' : 'Активувати'}
            </button>
            <button class="btn btn-sm btn-danger" onclick="confirmDeleteTest('${test.id}', '${escapeAttr(test.title)}')">Видалити</button>
          ` : ''}
        </div>
      </div>
    </div>
  `;
}

async function renderStudentProfile(profile) {
  const isOwn = currentUser?.id === profile.id;
  const { data: results } = await db.from('test_results').select('*, tests(title)').eq('student_id', profile.id).order('completed_at', { ascending: false });
  const allResults = results || [];
  const avgScore = allResults.length
    ? Math.round(allResults.reduce((sum, r) => sum + (r.score / r.total) * 100, 0) / allResults.length)
    : 0;

  const resultsHtml = allResults.length === 0
    ? `<div class="empty-state"><div class="empty-state-icon">📚</div><h3>Тестів ще не пройдено</h3><p>Введіть 6-значний код тесту на <a href="/" style="color:var(--blue)">головній сторінці</a></p></div>`
    : `<div class="card-list">${allResults.map(r => {
        const cls = getScoreClass(r.score, r.total);
        const grade = scoreToGrade(r.score, r.total);
        return `<div class="history-card"><div class="history-info"><h4>${r.tests?.title || 'Тест'}</h4><p>${formatDate(r.completed_at)}</p></div><div style="display:flex;align-items:center;gap:6px;flex-shrink:0"><span class="grade-chip grade-${cls}">${grade}/12</span><span class="score-badge ${cls}">${r.score}/${r.total}</span></div></div>`;
      }).join('')}</div>`;

  renderLayout(`
    <div class="page">
      <div class="profile-header">
        <div class="profile-avatar">
          ${profile.avatar_url ? `<img src="${profile.avatar_url}" alt="" />` : (profile.name?.[0] || '?').toUpperCase()}
        </div>
        <div class="profile-info">
          <h1>${profile.name || 'Без імені'}</h1>
          <p>${profile.email}</p>
          <span class="role-badge student">🎓 Учень</span>
        </div>
      </div>

      ${allResults.length > 0 ? `
        <div class="stats-row">
          <div class="stat-card"><span class="stat-num">${allResults.length}</span><span class="stat-label">Пройдено</span></div>
          <div class="stat-card"><span class="stat-num">${avgScore}%</span><span class="stat-label">Середній бал</span></div>
          <div class="stat-card"><span class="stat-num">${allResults.filter(r => (r.score/r.total)>=0.8).length}</span><span class="stat-label">Відмінно</span></div>
        </div>
      ` : ''}

      <div class="section-header"><h2 class="section-title">Пройдені тести</h2></div>
      ${resultsHtml}

      ${isOwn ? `<div style="margin-top:32px;padding-top:20px;border-top:1px solid var(--border);text-align:center"><button class="btn btn-ghost btn-sm" onclick="handleLogout()">Вийти з акаунту</button></div>` : ''}
    </div>
  `);
}

function getOptType(q, oi) { return q.optionTypes?.[oi] || 'text'; }
function getOptExtra(q, oi) { return q.optionExtras?.[oi] || ''; }

function renderOptionContent(q, oi, letters) {
  const type = getOptType(q, oi);
  const val = q.options[oi] || '';
  const extra = getOptExtra(q, oi);
  const letter = letters[oi] || (oi + 1);

  let contentHtml = '';
  if (type === 'image') {
    contentHtml = `<div class="answer-option-content">${val ? `<img src="${escapeAttr(val)}" class="answer-option-img" />` : '(зображення)'}</div>`;
  } else if (type === 'video') {
    const vid = getYoutubeId(val);
    contentHtml = vid
      ? `<div class="answer-option-content"><div style="font-size:0.8rem;opacity:0.7">▶ YouTube відео</div></div>`
      : `<div class="answer-option-content">${val || '(відео)'}</div>`;
  } else if (type === 'formula') {
    contentHtml = `<div class="answer-option-content"><div class="answer-option-formula" id="opt-formula-${oi}"></div></div>`;
  } else if (type === 'markdown') {
    const md = typeof marked !== 'undefined' ? marked.parse(val) : val;
    contentHtml = `<div class="answer-option-content">${md}</div>`;
  } else {
    contentHtml = `<div class="answer-option-content">${val}</div>`;
  }

  return contentHtml;
}

function getYoutubeId(url) {
  const m = (url || '').match(/(?:v=|youtu\.be\/)([\w-]{11})/);
  return m ? m[1] : null;
}

function startTest(test) {
  const questions = test.questions;
  let currentIndex = 0;
  const answers = Array(questions.length).fill(null);
  const optionLetters = ['А', 'Б', 'В', 'Г', 'Д', 'Е'];

  let timerInterval = null;
  let timeLeft = (test.time_limit || 0) * 60;

  function startTimer() {
    if (!test.time_limit) return;
    timerInterval = setInterval(() => {
      timeLeft--;
      const el = document.getElementById('test-timer');
      if (el) {
        el.textContent = '⏱ ' + fmtTime(timeLeft);
        el.className = 'test-timer' + (timeLeft <= 30 ? ' timer-danger' : timeLeft <= 120 ? ' timer-warn' : '');
      }
      if (timeLeft <= 0) { clearInterval(timerInterval); finishTest(); }
    }, 1000);
  }

  function stopTimer() { if (timerInterval) clearInterval(timerInterval); }

  function fmtTime(s) {
    return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0');
  }

  function renderQuestion() {
    const q = questions[currentIndex];
    const isLast = currentIndex === questions.length - 1;
    const progress = (currentIndex / questions.length) * 100;

    let mediaHtml = '';
    if (q.image) {
      mediaHtml = `<div class="q-media-block"><img src="${escapeAttr(q.image)}" class="q-media-img" /></div>`;
    } else if (q.video) {
      const vid = getYoutubeId(q.video);
      if (vid) mediaHtml = `<div class="q-media-block"><div class="q-video-wrap"><iframe src="https://www.youtube.com/embed/${vid}" frameborder="0" allowfullscreen></iframe></div></div>`;
    } else if (q.formula) {
      mediaHtml = `<div class="q-media-block q-formula-block" id="qformula-render"></div>`;
    }

    const questionHtml = typeof marked !== 'undefined'
      ? marked.parse(String(currentIndex + 1) + '. ' + (q.text || ''))
      : (currentIndex + 1) + '. ' + (q.text || '');

    app.innerHTML = `
      <div class="test-wrapper">
        <div class="test-progress-bar-wrap">
          <div class="test-progress-bar" style="width:${progress}%"></div>
        </div>
        <div class="test-header">
          <div class="test-header-top">
            <span class="test-title-main">${test.title}</span>
            <div style="display:flex;align-items:center;gap:8px">
              ${test.time_limit ? `<span class="test-timer" id="test-timer">⏱ ${fmtTime(timeLeft)}</span>` : ''}
              <span class="test-progress-label">${currentIndex + 1} / ${questions.length}</span>
            </div>
          </div>
        </div>
        <div class="test-body">
          <div class="question-block">
            <div class="question-text">${questionHtml}</div>
            ${mediaHtml}
            <div class="answer-options" id="options-wrap">
              ${q.options.map((opt, oi) => {
                const type = getOptType(q, oi);
                const selected = answers[currentIndex] === oi;
                let inner = '';
                if (type === 'image') {
                  inner = opt ? `<img src="${escapeAttr(opt)}" class="answer-option-img" />` : '(зображення)';
                } else if (type === 'formula') {
                  inner = `<div class="answer-option-formula" id="opt-formula-${oi}"></div>`;
                } else if (type === 'markdown') {
                  inner = typeof marked !== 'undefined' ? marked.parse(opt) : opt;
                } else {
                  inner = escapeHtml(opt);
                }
                return `
                  <button class="answer-option ${selected ? 'selected' : ''}" id="opt-${oi}" onclick="selectOption(${oi})">
                    <span class="answer-option-letter">${optionLetters[oi] || oi + 1}</span>
                    <div class="answer-option-content">${inner}</div>
                  </button>`;
              }).join('')}
            </div>
          </div>
        </div>
        <div class="test-footer">
          <button class="btn btn-primary" id="next-btn" onclick="nextQuestion()" ${answers[currentIndex] === null ? 'disabled' : ''}>
            ${isLast ? 'Завершити ✓' : 'Наступне →'}
          </button>
        </div>
      </div>
    `;

    if (q.formula) {
      const el = document.getElementById('qformula-render');
      if (el) try { katex.render(q.formula, el, { throwOnError: false, displayMode: true }); } catch(e) { el.textContent = q.formula; }
    }

    q.options.forEach((opt, oi) => {
      if (getOptType(q, oi) === 'formula') {
        const el = document.getElementById('opt-formula-' + oi);
        if (el) try { katex.render(opt, el, { throwOnError: false, displayMode: false }); } catch(e) { el.textContent = opt; }
      }
    });
  }

  window.selectOption = function(optIndex) {
    answers[currentIndex] = optIndex;
    document.querySelectorAll('.answer-option').forEach((el, i) => {
      el.classList.toggle('selected', i === optIndex);
      el.querySelector('.answer-option-letter')?.classList.toggle('selected', i === optIndex);
    });
    document.getElementById('next-btn').disabled = false;
    const q = questions[currentIndex];
    if (q.hint) {
      const existing = document.getElementById('q-hint-box');
      if (!existing) {
        const hint = document.createElement('div');
        hint.id = 'q-hint-box';
        hint.className = 'q-hint-box';
        hint.innerHTML = '<span class="q-hint-icon">💡</span>' + q.hint;
        document.querySelector('.question-block')?.appendChild(hint);
      }
    }
  };

  window.nextQuestion = async function() {
    if (answers[currentIndex] === null) return;
    if (currentIndex < questions.length - 1) { currentIndex++; renderQuestion(); }
    else { await finishTest(); }
  };

  async function finishTest() {
    stopTimer();
    let score = 0;
    questions.forEach((q, i) => { if (answers[i] === q.correct) score++; });
    await db.from('test_results').insert({ student_id: currentUser.id, test_id: test.id, score, total: questions.length, answers });
    renderResult(score, questions.length, test.title);
  }

  renderQuestion();
  startTimer();
}

function escapeHtml(str) {
  return String(str || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

function renderResult(score, total, testTitle) {
  const cls = getScoreClass(score, total);
  const label = getScoreLabel(score, total);
  const pct = Math.round((score / total) * 100);
  const grade = scoreToGrade(score, total);
  app.innerHTML = `
    <div class="result-screen">
      <div class="result-circle ${cls}">
        <span class="result-score-num">${score}</span>
        <span class="result-score-denom">з ${total}</span>
      </div>
      <h2 class="result-title">${label}</h2>
      <div class="result-grade-badge grade-${cls}">Оцінка: <strong>${grade}</strong> / 12</div>
      <p class="result-sub">${testTitle} · ${pct}% правильних відповідей</p>
      <button class="btn btn-primary" onclick="navigate('/u/${currentUser.id}')">До мого кабінету</button>
    </div>
  `;
}

function renderNotFound() {
  renderLayout(`
    <div class="not-found">
      <div class="not-found-code">404</div>
      <h2>Сторінку не знайдено</h2>
      <p>Можливо, посилання застаріло або не існує</p>
      <button class="btn btn-primary" onclick="navigate('/')">На головну</button>
    </div>
  `);
}

function openCreateTest() { navigate('/create'); }
function openEditTest(testId) { navigate('/edit/' + testId); }

async function renderTestEditorPage(testId) {
  const isEdit = !!testId;

  if (isEdit) {
    renderLayout(`<div class="page" style="display:flex;align-items:center;justify-content:center;min-height:80vh"><div class="loading-spinner" style="margin:0 auto"></div></div>`);
    const { data: test, error } = await db.from('tests').select('*').eq('id', testId).single();
    if (error || !test) { renderNotFound(); return; }
    if (test.teacher_id !== currentUser?.id) { navigate('/'); return; }
    window._testQuestions = test.questions.map(q => ({
      text: q.text || '', options: q.options || ['', ''], correct: q.correct || 0,
      image: q.image || '', video: q.video || '', formula: q.formula || '', hint: q.hint || '',
      optionTypes: q.optionTypes || [],
      optionExtras: q.optionExtras || [],
    }));
    window._editTestId = testId;
    window._editorTitle = test.title;
    window._editorTimeLimit = test.time_limit || 0;
  } else {
    window._editTestId = null;
    const draftRaw = localStorage.getItem('altclass_draft');
    if (draftRaw) {
      try {
        const d = JSON.parse(draftRaw);
        if (Date.now() - (d.savedAt || 0) < 7 * 24 * 3600 * 1000) {
          window._testQuestions = d.questions || [createEmptyQuestion()];
          window._editorTitle = d.title || '';
          window._editorTimeLimit = d.timeLimit || 0;
        } else { clearDraft(); window._testQuestions = [createEmptyQuestion()]; window._editorTitle = ''; window._editorTimeLimit = 0; }
      } catch { window._testQuestions = [createEmptyQuestion()]; window._editorTitle = ''; window._editorTimeLimit = 0; }
    } else { window._testQuestions = [createEmptyQuestion()]; window._editorTitle = ''; window._editorTimeLimit = 0; }
  }

  renderLayout(`
    <div class="page-wide">
      <div class="editor-topbar">
        <button class="btn btn-ghost btn-sm" onclick="navigate('/u/${currentUser.id}')">← Назад</button>
        <h1 class="editor-page-title">${isEdit ? '✎ Редагувати тест' : 'Новий тест'}</h1>
        <button class="btn btn-primary btn-sm" onclick="saveTest()" id="save-test-btn">${isEdit ? 'Зберегти зміни' : 'Зберегти'}</button>
      </div>
      <div class="editor-fields-row">
        <div class="form-group" style="flex:1;min-width:180px;margin-bottom:0">
          <label class="form-label">Назва тесту</label>
          <input class="form-input" type="text" id="test-title-input"
            value="${escapeAttr(window._editorTitle || '')}" placeholder="Наприклад: Алгебра — тема 3" oninput="saveDraft()" />
        </div>
        <div class="form-group" style="width:150px;margin-bottom:0">
          <label class="form-label">⏱ Час (хвилини)</label>
          <input class="form-input" type="number" id="test-timelimit-input"
            placeholder="0 = без ліміту" min="0" max="180" value="${window._editorTimeLimit || 0}" oninput="saveDraft()" />
        </div>
      </div>
      <div class="section-header" style="margin-top:20px;margin-bottom:12px">
        <h2 class="section-title">Питання</h2>
        <button class="btn btn-outline btn-sm" onclick="addQuestion()">+ Додати питання</button>
      </div>
      <div class="questions-list" id="questions-list"></div>
      <div style="margin-top:20px;padding-bottom:52px">
        <button class="btn btn-primary btn-full" onclick="saveTest()" id="save-test-btn-bottom">
          ${isEdit ? '💾 Зберегти зміни' : 'Зберегти тест'}
        </button>
      </div>
    </div>
  `);

  renderQuestionsEditor();
}

function saveDraft() {
  if (window._editTestId) return;
  try {
    const title = document.getElementById('test-title-input')?.value || '';
    const tl = parseInt(document.getElementById('test-timelimit-input')?.value || '0', 10);
    localStorage.setItem('altclass_draft', JSON.stringify({
      title, timeLimit: isNaN(tl) ? 0 : tl,
      questions: window._testQuestions || [], savedAt: Date.now(),
    }));
  } catch {}
}

function clearDraft() { try { localStorage.removeItem('altclass_draft'); } catch {} }

function createEmptyQuestion() {
  return { text: '', options: ['', ''], correct: 0, image: '', video: '', formula: '', hint: '', optionTypes: [], optionExtras: [] };
}

const OPTION_TYPES = [
  { key: 'text', icon: 'T', title: 'Текст' },
  { key: 'image', icon: '🖼', title: 'Зображення' },
  { key: 'video', icon: '▶', title: 'Відео' },
  { key: 'formula', icon: '∑', title: 'Формула' },
  { key: 'markdown', icon: 'MD', title: 'Markdown' },
];

function renderQuestionsEditor() {
  const list = document.getElementById('questions-list');
  if (!list) return;

  list.innerHTML = window._testQuestions.map((q, qi) => {
    const optionsHtml = q.options.map((opt, oi) => {
      const type = getOptType(q, oi);
      const typeBtns = OPTION_TYPES.map(t => `
        <button class="option-type-btn ${type === t.key ? 'active' : ''}" title="${t.title}"
          onclick="updateOptionType(${qi}, ${oi}, '${t.key}')">${t.icon}</button>
      `).join('');

      let inputHtml = '';
      if (type === 'image') {
        inputHtml = `
          <div style="flex:1">
            <input class="option-input" type="url" placeholder="https://... (URL зображення)"
              value="${escapeAttr(opt)}" oninput="updateOption(${qi}, ${oi}, this.value)" />
            ${opt ? `<img src="${escapeAttr(opt)}" style="max-height:60px;max-width:100%;margin-top:4px;border-radius:4px;object-fit:contain" onerror="this.style.display='none'" />` : ''}
          </div>`;
      } else if (type === 'video') {
        inputHtml = `<input class="option-input" type="url" placeholder="https://youtube.com/watch?v=..."
          value="${escapeAttr(opt)}" oninput="updateOption(${qi}, ${oi}, this.value)" style="flex:1" />`;
      } else if (type === 'formula') {
        inputHtml = `
          <div style="flex:1">
            <input class="option-input" type="text" placeholder="LaTeX: \\frac{1}{2}"
              value="${escapeAttr(opt)}" oninput="updateOption(${qi}, ${oi}, this.value);renderOptionFormulaPreview(${qi},${oi},this.value)" />
            <div class="option-formula-preview" id="opt-fprev-${qi}-${oi}"></div>
          </div>`;
      } else if (type === 'markdown') {
        inputHtml = `<textarea class="option-input form-textarea" style="min-height:48px;flex:1" placeholder="**жирний**, *курсив*, математика..."
          oninput="updateOption(${qi}, ${oi}, this.value)">${escapeAttr(opt)}</textarea>`;
      } else {
        inputHtml = `<input class="option-input" type="text" placeholder="Варіант ${oi + 1}"
          value="${escapeAttr(opt)}" oninput="updateOption(${qi}, ${oi}, this.value)" style="flex:1" />`;
      }

      return `
        <div class="option-row" style="align-items:flex-start">
          <input type="radio" class="option-radio" name="correct-${qi}" style="margin-top:10px"
            ${q.correct === oi ? 'checked' : ''} onchange="setCorrect(${qi}, ${oi})" title="Правильна відповідь" />
          <div class="option-type-selector" style="margin-top:6px">${typeBtns}</div>
          ${inputHtml}
          ${q.options.length > 2
            ? `<button class="option-remove" onclick="removeOption(${qi}, ${oi})" style="margin-top:8px">✕</button>`
            : `<span style="width:24px;flex-shrink:0"></span>`}
        </div>`;
    }).join('');

    return `
      <div class="question-card" id="qcard-${qi}">
        <div class="question-card-header">
          <span class="question-num">Питання ${qi + 1}</span>
          ${window._testQuestions.length > 1
            ? `<button class="btn btn-danger btn-sm" onclick="removeQuestion(${qi})">Видалити</button>`
            : ''}
        </div>

        <div class="form-group">
          <label class="form-label">Текст питання (підтримує **markdown**)</label>
          <textarea class="form-input form-textarea" placeholder="Наприклад: Яке значення має вираз 2x + 3 при x = 5?"
            oninput="updateQuestionText(${qi}, this.value)" rows="2">${escapeAttr(q.text)}</textarea>
        </div>

        <div class="qmedia-tabs">
          <button class="qmedia-tab ${!q.image && !q.video && !q.formula ? 'active' : ''}" onclick="setMediaTab(${qi}, 'none')">Текст</button>
          <button class="qmedia-tab ${q.image ? 'active' : ''}" onclick="setMediaTab(${qi}, 'image')">🖼 Зображення</button>
          <button class="qmedia-tab ${q.video ? 'active' : ''}" onclick="setMediaTab(${qi}, 'video')">▶ Відео</button>
          <button class="qmedia-tab ${q.formula ? 'active' : ''}" onclick="setMediaTab(${qi}, 'formula')">∑ Формула</button>
        </div>

        <div class="qmedia-body" id="qmedia-${qi}">
          ${q.image ? `
            <div class="form-group" style="margin-top:8px">
              <input class="form-input" type="url" placeholder="https://... (посилання на зображення)"
                value="${escapeAttr(q.image)}" oninput="updateQuestionField(${qi}, 'image', this.value)" />
              ${q.image ? `<img src="${escapeAttr(q.image)}" class="qmedia-preview" onerror="this.style.display='none'" />` : ''}
            </div>
          ` : q.video ? `
            <div class="form-group" style="margin-top:8px">
              <input class="form-input" type="url" placeholder="https://youtube.com/watch?v=..."
                value="${escapeAttr(q.video)}" oninput="updateQuestionField(${qi}, 'video', this.value)" />
            </div>
          ` : q.formula ? `
            <div class="form-group" style="margin-top:8px">
              <div style="display:flex;gap:8px;align-items:center;margin-bottom:5px">
                <input class="form-input" type="text" placeholder="LaTeX формула: \\frac{a}{b}"
                  value="${escapeAttr(q.formula)}" oninput="updateQuestionField(${qi}, 'formula', this.value)"
                  style="flex:1" />
                <button class="btn btn-outline btn-sm" onclick="openFormulaEditor(${qi})">∑ Редактор</button>
              </div>
              <div class="formula-preview" id="fpreview-${qi}"></div>
            </div>
          ` : ''}
        </div>

        <label class="form-label" style="margin-top:10px;margin-bottom:6px;display:block">Варіанти відповідей</label>
        <div class="options-list" id="opts-${qi}">${optionsHtml}</div>

        ${q.options.length < 6
          ? `<button class="btn btn-ghost btn-sm" style="margin-top:8px" onclick="addOption(${qi})">+ Ще варіант</button>`
          : ''}

        <div class="form-group" style="margin-top:12px">
          <label class="form-label">💡 Підказка після відповіді (необов'язково)</label>
          <input class="form-input" type="text" placeholder="Пояснення або підказка..."
            value="${escapeAttr(q.hint || '')}" oninput="updateQuestionField(${qi}, 'hint', this.value)" />
        </div>
      </div>
    `;
  }).join('');

  window._testQuestions.forEach((q, qi) => {
    if (q.formula) {
      const el = document.getElementById('fpreview-' + qi);
      if (el) try { katex.render(q.formula, el, { throwOnError: false, displayMode: true }); } catch(e) { el.textContent = q.formula; }
    }
    q.options.forEach((opt, oi) => {
      if (getOptType(q, oi) === 'formula' && opt) {
        const el = document.getElementById(`opt-fprev-${qi}-${oi}`);
        if (el) try { katex.render(opt, el, { throwOnError: false, displayMode: false }); } catch(e) { el.textContent = opt; }
      }
    });
  });
}

window.renderOptionFormulaPreview = function(qi, oi, val) {
  const el = document.getElementById(`opt-fprev-${qi}-${oi}`);
  if (!el) return;
  if (!val.trim()) { el.textContent = ''; return; }
  try { katex.render(val, el, { throwOnError: false, displayMode: false }); } catch(e) { el.textContent = val; }
};

window.updateOptionType = function(qi, oi, type) {
  if (!window._testQuestions[qi].optionTypes) window._testQuestions[qi].optionTypes = [];
  window._testQuestions[qi].optionTypes[oi] = type;
  renderQuestionsEditor();
  saveDraft();
};

window.addQuestion = function() {
  window._testQuestions.push(createEmptyQuestion());
  renderQuestionsEditor();
  saveDraft();
  document.getElementById('qcard-' + (window._testQuestions.length - 1))?.scrollIntoView({ behavior: 'smooth' });
};

window.removeQuestion = function(qi) {
  window._testQuestions.splice(qi, 1);
  renderQuestionsEditor();
  saveDraft();
};

window.updateQuestionText = function(qi, val) { window._testQuestions[qi].text = val; saveDraft(); };

window.updateQuestionField = function(qi, field, val) {
  window._testQuestions[qi][field] = val;
  if (field === 'formula') {
    const el = document.getElementById('fpreview-' + qi);
    if (el) try { katex.render(val, el, { throwOnError: false, displayMode: true }); } catch(e) { el.textContent = val; }
  }
  saveDraft();
};

window.setMediaTab = function(qi, type) {
  const q = window._testQuestions[qi];
  q.image = type === 'image' ? (q.image || '') : '';
  q.video = type === 'video' ? (q.video || '') : '';
  q.formula = type === 'formula' ? (q.formula || '') : '';
  renderQuestionsEditor();
  if (type === 'formula') openFormulaEditor(qi);
  else if (type !== 'none') document.getElementById('qmedia-' + qi)?.querySelector('input')?.focus();
};

window.updateOption = function(qi, oi, val) { window._testQuestions[qi].options[oi] = val; saveDraft(); };
window.setCorrect = function(qi, oi) { window._testQuestions[qi].correct = oi; saveDraft(); };

window.addOption = function(qi) {
  const q = window._testQuestions[qi];
  q.options.push('');
  renderQuestionsEditor();
  saveDraft();
  document.querySelector(`#opts-${qi} .option-row:last-child .option-input`)?.focus();
};

window.removeOption = function(qi, oi) {
  const q = window._testQuestions[qi];
  q.options.splice(oi, 1);
  if (q.optionTypes) q.optionTypes.splice(oi, 1);
  if (q.optionExtras) q.optionExtras.splice(oi, 1);
  if (q.correct >= q.options.length) q.correct = 0;
  renderQuestionsEditor();
  saveDraft();
};

window.saveTest = async function() {
  const title = (document.getElementById('test-title-input')?.value || '').trim();
  const tlRaw = parseInt(document.getElementById('test-timelimit-input')?.value || '0', 10);
  const timeLimit = isNaN(tlRaw) || tlRaw < 0 ? 0 : tlRaw;
  const btn = document.getElementById('save-test-btn');
  const isEdit = !!window._editTestId;

  if (!title) { showToast('Введіть назву тесту', 'error'); return; }

  for (let i = 0; i < window._testQuestions.length; i++) {
    const q = window._testQuestions[i];
    if (!q.text.trim()) { showToast(`Введіть текст питання ${i + 1}`, 'error'); return; }
    for (let j = 0; j < q.options.length; j++) {
      if (!q.options[j].trim()) { showToast(`Заповніть варіант ${j + 1} у питанні ${i + 1}`, 'error'); return; }
    }
  }

  if (btn) { btn.disabled = true; btn.textContent = 'Збереження...'; }

  if (isEdit) {
    const { error } = await db.from('tests').update({ title, questions: window._testQuestions, time_limit: timeLimit || null }).eq('id', window._editTestId).eq('teacher_id', currentUser.id);
    if (error) { showToast('Помилка збереження: ' + error.message, 'error'); if (btn) { btn.disabled = false; btn.textContent = 'Зберегти зміни'; } return; }
    showToast('Тест оновлено!', 'success');
    navigate(`/u/${currentUser.id}`);
    return;
  }

  let code; let unique = false;
  while (!unique) {
    code = generateCode();
    const { data } = await db.from('tests').select('id').eq('code', code).single();
    if (!data) unique = true;
  }

  const { error } = await db.from('tests').insert({ code, teacher_id: currentUser.id, title, questions: window._testQuestions, is_active: true, time_limit: timeLimit || null });
  if (error) { showToast('Помилка збереження: ' + error.message, 'error'); if (btn) { btn.disabled = false; btn.textContent = 'Зберегти тест'; } return; }
  clearDraft();
  showToast(`Тест створено! Код: ${code}`, 'success');
  navigate(`/u/${currentUser.id}`);
};

async function toggleTestActive(testId, currentActive) {
  const { error } = await db.from('tests').update({ is_active: !currentActive }).eq('id', testId);
  if (error) { showToast('Помилка оновлення', 'error'); return; }
  showToast(currentActive ? 'Тест деактивовано' : 'Тест активовано', 'success');
  navigate(`/u/${currentUser.id}`);
}

function confirmDeleteTest(testId, testTitle) {
  document.body.insertAdjacentHTML('beforeend', `
    <div class="modal-overlay" id="confirm-modal" onclick="closeModalOutside(event)">
      <div class="modal" style="max-width:380px">
        <div class="modal-header">
          <h2 class="modal-title">Видалити тест?</h2>
          <button class="modal-close" onclick="closeModal('confirm-modal')">✕</button>
        </div>
        <p class="confirm-text">Ви збираєтесь видалити тест <strong>${testTitle}</strong>. Всі результати учнів також будуть видалені. Це неможливо скасувати.</p>
        <div class="confirm-actions">
          <button class="btn btn-ghost" onclick="closeModal('confirm-modal')">Скасувати</button>
          <button class="btn btn-danger" onclick="deleteTest('${testId}')">Так, видалити</button>
        </div>
      </div>
    </div>
  `);
}

window.deleteTest = async function(testId) {
  const deleteBtn = document.querySelector('#confirm-modal .btn-danger');
  if (deleteBtn) { deleteBtn.disabled = true; deleteBtn.textContent = 'Видалення...'; }
  await db.from('test_results').delete().eq('test_id', testId);
  const { error } = await db.from('tests').delete().eq('id', testId).eq('teacher_id', currentUser.id);
  if (error) { showToast('Помилка видалення: ' + error.message, 'error'); if (deleteBtn) { deleteBtn.disabled = false; deleteBtn.textContent = 'Так, видалити'; } return; }
  showToast('Тест видалено', 'success');
  closeModal('confirm-modal');
  navigate(`/u/${currentUser.id}`);
};

function closeModal(id) { document.getElementById(id)?.remove(); }

window.closeModalOutside = function(e) {
  if (e.target.classList.contains('modal-overlay')) e.target.remove();
};

function copyCode(code) {
  const url = `${window.location.origin}/${code}`;
  navigator.clipboard.writeText(url)
    .then(() => showToast('Посилання скопійовано!', 'success'))
    .catch(() => showToast(`Код: ${code}`, 'info'));
}

function escapeAttr(str) {
  return (str || '').replace(/\\/g, '\\\\').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

window.openFormulaEditor = function(qi) {
  const q = window._testQuestions[qi];
  window._formulaQi = qi;

  document.body.insertAdjacentHTML('beforeend', `
    <div class="modal-overlay" id="formula-modal" onclick="closeModalOutside(event)">
      <div class="modal formula-modal-inner">
        <div class="modal-header">
          <h2 class="modal-title">∑ Редактор формул</h2>
          <button class="modal-close" onclick="closeModal('formula-modal')">✕</button>
        </div>

        <div class="fe-preview-wrap">
          <div class="fe-preview" id="fe-preview-render">
            <span class="fe-placeholder">Прев'ю формули...</span>
          </div>
        </div>

        <div class="fe-builder" id="fe-builder"></div>

        <div class="fe-toolbar-scroll">
          <div class="fecat">
            <div class="fecat-name">Дріб / Корінь</div>
            <div class="fecat-items">
              <button class="fecat-btn" title="Дріб" onclick="feOpenBuilder('frac')"><span class="fe-icon-frac"><span>□</span><span>□</span></span></button>
              <button class="fecat-btn" title="Квадратний корінь" onclick="feOpenBuilder('sqrt')">√□</button>
              <button class="fecat-btn" title="Корінь n-го степеня" onclick="feOpenBuilder('nroot')">ⁿ√□</button>
            </div>
          </div>
          <div class="fecat">
            <div class="fecat-name">Індекси</div>
            <div class="fecat-items">
              <button class="fecat-btn" title="Степінь" onclick="feOpenBuilder('sup')">xⁿ</button>
              <button class="fecat-btn" title="Нижній індекс" onclick="feOpenBuilder('sub')">xₙ</button>
              <button class="fecat-btn" title="Обидва індекси" onclick="feOpenBuilder('subsup')">xₙⁿ</button>
            </div>
          </div>
          <div class="fecat">
            <div class="fecat-name">Оператори</div>
            <div class="fecat-items">
              <button class="fecat-btn" title="Сума" onclick="feOpenBuilder('sum')">Σ</button>
              <button class="fecat-btn" title="Добуток" onclick="feOpenBuilder('prod')">Π</button>
              <button class="fecat-btn" title="Ліміт" onclick="feOpenBuilder('lim')">lim</button>
              <button class="fecat-btn" title="Логарифм" onclick="feOpenBuilder('log')">log</button>
              <button class="fecat-btn" title="Інтеграл" onclick="feInsert('\\\\int_{a}^{b} f(x)\\,dx')">∫</button>
              <button class="fecat-btn" title="Подвійний інтеграл" onclick="feInsert('\\\\iint_{D}')">∬</button>
              <button class="fecat-btn" onclick="feInsert('\\\\bigcup_{i=1}^{n}')">⋃</button>
              <button class="fecat-btn" onclick="feInsert('\\\\bigcap_{i=1}^{n}')">⋂</button>
            </div>
          </div>
          <div class="fecat">
            <div class="fecat-name">Дужки</div>
            <div class="fecat-items">
              <button class="fecat-btn" onclick="feOpenBuilder('paren')">(a)</button>
              <button class="fecat-btn" onclick="feOpenBuilder('bracket')">[a]</button>
              <button class="fecat-btn" onclick="feOpenBuilder('brace')">{a}</button>
              <button class="fecat-btn" onclick="feOpenBuilder('abs')">|a|</button>
              <button class="fecat-btn" onclick="feOpenBuilder('norm')">‖a‖</button>
            </div>
          </div>
          <div class="fecat">
            <div class="fecat-name">Функції</div>
            <div class="fecat-items">
              <button class="fecat-btn" onclick="feInsert('\\\\sin')">sin</button>
              <button class="fecat-btn" onclick="feInsert('\\\\cos')">cos</button>
              <button class="fecat-btn" onclick="feInsert('\\\\tan')">tan</button>
              <button class="fecat-btn" onclick="feInsert('\\\\arcsin')">arcsin</button>
              <button class="fecat-btn" onclick="feInsert('\\\\arccos')">arccos</button>
              <button class="fecat-btn" onclick="feInsert('\\\\ln')">ln</button>
              <button class="fecat-btn" onclick="feInsert('\\\\infty')">∞</button>
            </div>
          </div>
          <div class="fecat">
            <div class="fecat-name">Грецькі</div>
            <div class="fecat-items">
              ${[['\\\\alpha','α'],['\\\\beta','β'],['\\\\gamma','γ'],['\\\\delta','δ'],['\\\\epsilon','ε'],['\\\\theta','θ'],['\\\\lambda','λ'],['\\\\mu','μ'],['\\\\pi','π'],['\\\\sigma','σ'],['\\\\phi','φ'],['\\\\Omega','Ω'],['\\\\Delta','Δ'],['\\\\Sigma','Σ'],['\\\\Pi','Π']].map(([l,s]) => `<button class="fecat-btn" onclick="feInsert('${l}')">${s}</button>`).join('')}
            </div>
          </div>
          <div class="fecat">
            <div class="fecat-name">Діакритика</div>
            <div class="fecat-items">
              <button class="fecat-btn" onclick="feOpenBuilder('hat')" title="Hat">â</button>
              <button class="fecat-btn" onclick="feOpenBuilder('bar')" title="Bar">ā</button>
              <button class="fecat-btn" onclick="feOpenBuilder('dot')" title="Dot">ȧ</button>
              <button class="fecat-btn" onclick="feOpenBuilder('vec')" title="Вектор">a⃗</button>
              <button class="fecat-btn" onclick="feOpenBuilder('tilde')" title="Tilde">ã</button>
            </div>
          </div>
          <div class="fecat">
            <div class="fecat-name">Матриця / Система</div>
            <div class="fecat-items">
              <button class="fecat-btn" onclick="feOpenBuilder('matrix22')">2×2</button>
              <button class="fecat-btn" onclick="feOpenBuilder('matrix33')">3×3</button>
              <button class="fecat-btn" onclick="feOpenBuilder('cases')">{…}</button>
            </div>
          </div>
          <div class="fecat">
            <div class="fecat-name">Символи</div>
            <div class="fecat-items">
              ${[['\\\\pm','±'],['\\\\times','×'],['\\\\div','÷'],['\\\\neq','≠'],['\\\\leq','≤'],['\\\\geq','≥'],['\\\\approx','≈'],['\\\\to','→'],['\\\\Rightarrow','⇒'],['\\\\Leftrightarrow','⇔'],['\\\\in','∈'],['\\\\notin','∉'],['\\\\subset','⊂'],['\\\\cup','∪'],['\\\\cap','∩']].map(([l,s]) => `<button class="fecat-btn" onclick="feInsert('${l}')">${s}</button>`).join('')}
            </div>
          </div>
        </div>

        <div class="fe-latex-toggle-row">
          <button class="fe-latex-toggle" onclick="feToggleLatex()">{ } Сховати LaTeX</button>
          <button class="btn btn-ghost btn-sm" onclick="feClear()" style="color:var(--red);font-size:0.75rem">скинути все</button>
        </div>
        <div id="fe-latex-row" style="margin-bottom:10px">
          <input class="form-input fe-latex-input" type="text" id="fe-latex-input"
            placeholder="Введіть або вставте LaTeX..."
            value="${escapeAttr(q.formula || '')}"
            onfocus="window._feActiveInput=this;window._feCurrentBuilderType=null"
            oninput="feRenderPreview()" />
        </div>

        <div class="fe-actions">
          <button class="btn btn-ghost" onclick="closeModal('formula-modal')">Скасувати</button>
          <button class="btn btn-primary" onclick="applyFormula(${qi})">Вставити формулу</button>
        </div>
      </div>
    </div>
  `);

  window._feActiveInput = document.getElementById('fe-latex-input');
  window._feCurrentBuilderType = null;
  feRenderPreview();
};

const FE_BUILDERS = {
  frac:    { title: 'Дріб', fields: [{label:'Чисельник', key:'num', val:''},{label:'Знаменник', key:'den', val:''}], build: f => `\\frac{${f.num}}{${f.den}}` },
  sqrt:    { title: 'Квадратний корінь', fields: [{label:'Вираз під коренем', key:'a', val:''}], build: f => `\\sqrt{${f.a}}` },
  nroot:   { title: 'Корінь n-го степеня', fields: [{label:'Степінь n', key:'n', val:''},{label:'Вираз', key:'a', val:''}], build: f => `\\sqrt[${f.n}]{${f.a}}` },
  sup:     { title: 'Степінь', fields: [{label:'Основа', key:'a', val:''},{label:'Показник', key:'n', val:''}], build: f => `${f.a}^{${f.n}}` },
  sub:     { title: 'Нижній індекс', fields: [{label:'Вираз', key:'a', val:''},{label:'Індекс', key:'i', val:''}], build: f => `${f.a}_{${f.i}}` },
  subsup:  { title: 'Індекси', fields: [{label:'Вираз', key:'a', val:''},{label:'Нижній', key:'i', val:''},{label:'Верхній', key:'n', val:''}], build: f => `${f.a}_{${f.i}}^{${f.n}}` },
  sum:     { title: 'Сума Σ', fields: [{label:'Від (i=...)', key:'from', val:'i=1'},{label:'До', key:'to', val:'n'},{label:'Вираз', key:'expr', val:''}], build: f => `\\sum_{${f.from}}^{${f.to}} ${f.expr}` },
  prod:    { title: 'Добуток Π', fields: [{label:'Від', key:'from', val:'i=1'},{label:'До', key:'to', val:'n'},{label:'Вираз', key:'expr', val:''}], build: f => `\\prod_{${f.from}}^{${f.to}} ${f.expr}` },
  lim:     { title: 'Ліміт', fields: [{label:'Змінна → значення', key:'to', val:'x \\\\to \\\\infty'},{label:'Вираз', key:'expr', val:''}], build: f => `\\lim_{${f.to}} ${f.expr}` },
  log:     { title: 'Логарифм', fields: [{label:'Основа (порожньо = lg)', key:'base', val:''},{label:'Аргумент', key:'arg', val:''}], build: f => f.base ? `\\log_{${f.base}}(${f.arg})` : `\\log(${f.arg})` },
  paren:   { title: 'Круглі дужки', fields: [{label:'Вираз', key:'a', val:''}], build: f => `\\left( ${f.a} \\right)` },
  bracket: { title: 'Квадратні дужки', fields: [{label:'Вираз', key:'a', val:''}], build: f => `\\left[ ${f.a} \\right]` },
  brace:   { title: 'Фігурні дужки', fields: [{label:'Вираз', key:'a', val:''}], build: f => `\\left\\{ ${f.a} \\right\\}` },
  abs:     { title: 'Модуль', fields: [{label:'Вираз', key:'a', val:''}], build: f => `\\left| ${f.a} \\right|` },
  norm:    { title: 'Норма', fields: [{label:'Вираз', key:'a', val:''}], build: f => `\\left\\| ${f.a} \\right\\|` },
  hat:     { title: 'Hat', fields: [{label:'Символ', key:'a', val:''}], build: f => `\\hat{${f.a}}` },
  bar:     { title: 'Bar', fields: [{label:'Символ', key:'a', val:''}], build: f => `\\bar{${f.a}}` },
  dot:     { title: 'Dot', fields: [{label:'Символ', key:'a', val:''}], build: f => `\\dot{${f.a}}` },
  vec:     { title: 'Вектор', fields: [{label:'Символ', key:'a', val:''}], build: f => `\\vec{${f.a}}` },
  tilde:   { title: 'Tilde', fields: [{label:'Символ', key:'a', val:''}], build: f => `\\tilde{${f.a}}` },
  matrix22:{ title: 'Матриця 2×2', fields: [{label:'a₁₁',key:'a',val:''},{label:'a₁₂',key:'b',val:''},{label:'a₂₁',key:'c',val:''},{label:'a₂₂',key:'d',val:''}], build: f => `\\begin{pmatrix} ${f.a} & ${f.b} \\\\ ${f.c} & ${f.d} \\end{pmatrix}` },
  matrix33:{ title: 'Матриця 3×3', fields: [{label:'a',key:'a',val:''},{label:'b',key:'b',val:''},{label:'c',key:'c',val:''},{label:'d',key:'d',val:''},{label:'e',key:'e',val:''},{label:'f',key:'f0',val:''},{label:'g',key:'g',val:''},{label:'h',key:'h',val:''},{label:'i',key:'i',val:''}], build: f => `\\begin{pmatrix} ${f.a} & ${f.b} & ${f.c} \\\\ ${f.d} & ${f.e} & ${f.f0} \\\\ ${f.g} & ${f.h} & ${f.i} \\end{pmatrix}` },
  cases:   { title: 'Система рівнянь', fields: [{label:'Вираз 1', key:'a', val:''},{label:'Умова 1', key:'ca', val:''},{label:'Вираз 2', key:'b', val:''},{label:'Умова 2', key:'cb', val:''}], build: f => `\\begin{cases} ${f.a} & \\text{якщо } ${f.ca} \\\\ ${f.b} & \\text{якщо } ${f.cb} \\end{cases}` },
};

const FE_INLINE_TEMPLATES = {
  frac: '\\frac{}{}', sqrt: '\\sqrt{}', nroot: '\\sqrt[]{}',
  sup: '^{}', sub: '_{}', subsup: '_{}^{}',
  sum: '\\sum_{}^{}', prod: '\\prod_{}^{}', lim: '\\lim_{}',
  log: '\\log_{}()', paren: '\\left(  \\right)', bracket: '\\left[  \\right]',
  brace: '\\left\\{  \\right\\}', abs: '\\left|  \\right|', norm: '\\left\\|  \\right\\|',
  hat: '\\hat{}', bar: '\\bar{}', dot: '\\dot{}', vec: '\\vec{}', tilde: '\\tilde{}',
  matrix22: '\\begin{pmatrix} a & b \\\\ c & d \\end{pmatrix}',
  matrix33: '\\begin{pmatrix} a & b & c \\\\ d & e & f \\\\ g & h & i \\end{pmatrix}',
  cases: '\\begin{cases} f_1 & \\text{якщо } x \\\\ f_2 & \\text{якщо } y \\end{cases}',
};

window.feOpenBuilder = function(type) {
  const def = FE_BUILDERS[type];
  if (!def) return;

  const active = window._feActiveInput;
  if (active && active.id && active.id.startsWith('fe-field-')) {
    const tmpl = FE_INLINE_TEMPLATES[type] || '';
    if (tmpl) { feInsert(tmpl); return; }
  }

  window._feCurrentBuilderType = type;
  const builderEl = document.getElementById('fe-builder');
  if (!builderEl) return;

  const fieldsHtml = def.fields.map((f, i) => `
    <div class="fe-field">
      <label class="fe-field-label">${f.label}</label>
      <input class="form-input fe-field-input" type="text" id="fe-field-${i}"
        value="${f.val}" placeholder="${f.label}"
        oninput="feBuilderPreview('${type}')"
        onfocus="window._feActiveInput=this;window._feCurrentBuilderType='${type}'" />
    </div>
  `).join('');

  builderEl.innerHTML = `
    <div class="fe-builder-box">
      <div class="fe-builder-title">${def.title} — заповніть поля (можна вставляти LaTeX)</div>
      <div class="fe-builder-fields">${fieldsHtml}</div>
      <div class="fe-builder-preview" id="fe-builder-preview"></div>
      <div class="fe-builder-actions">
        <button class="btn btn-ghost btn-sm" onclick="feCloseBuilder()">Скасувати</button>
        <button class="btn btn-primary btn-sm" onclick="feInsertBuilt('${type}')">Додати →</button>
      </div>
    </div>
  `;
  builderEl.style.display = 'block';
  document.getElementById('fe-field-0')?.focus();
  feBuilderPreview(type);
};

window.feCloseBuilder = function() {
  const b = document.getElementById('fe-builder');
  if (b) { b.innerHTML = ''; b.style.display = 'none'; }
  window._feCurrentBuilderType = null;
  window._feActiveInput = document.getElementById('fe-latex-input');
};

window.feBuilderPreview = function(type) {
  const def = FE_BUILDERS[type];
  if (!def) return;
  const vals = {};
  def.fields.forEach((f, i) => { vals[f.key] = document.getElementById('fe-field-' + i)?.value || ''; });
  const latex = def.build(vals);
  const prev = document.getElementById('fe-builder-preview');
  if (prev) try { katex.render(latex, prev, { throwOnError: false, displayMode: true }); } catch(e) { prev.textContent = latex; }
};

window.feInsertBuilt = function(type) {
  const def = FE_BUILDERS[type];
  if (!def) return;
  const vals = {};
  def.fields.forEach((f, i) => { vals[f.key] = document.getElementById('fe-field-' + i)?.value || f.val || ' '; });
  const latex = def.build(vals);
  feCloseBuilder();
  const mainInput = document.getElementById('fe-latex-input');
  if (mainInput) {
    window._feActiveInput = mainInput;
    window._feCurrentBuilderType = null;
    feInsert(latex);
  }
};

window.feInsert = function(latex) {
  const active = window._feActiveInput || document.getElementById('fe-latex-input');
  if (!active) return;
  const start = active.selectionStart || 0;
  const end = active.selectionEnd || 0;
  active.value = active.value.slice(0, start) + latex + active.value.slice(end);
  const newPos = start + latex.length;
  active.setSelectionRange(newPos, newPos);
  active.focus();
  if (active.id && active.id.startsWith('fe-field-') && window._feCurrentBuilderType) {
    feBuilderPreview(window._feCurrentBuilderType);
  }
  feRenderPreview();
};

window.feRenderPreview = function() {
  const input = document.getElementById('fe-latex-input');
  const preview = document.getElementById('fe-preview-render');
  if (!preview) return;
  const val = input ? input.value.trim() : '';
  if (!val) { preview.innerHTML = '<span class="fe-placeholder">Прев\'ю формули...</span>'; return; }
  try { katex.render(val, preview, { throwOnError: false, displayMode: true }); } catch(e) { preview.textContent = val; }
};

window.feToggleLatex = function() {
  const row = document.getElementById('fe-latex-row');
  const btn = document.querySelector('.fe-latex-toggle');
  if (!row) return;
  const visible = row.style.display !== 'none';
  row.style.display = visible ? 'none' : 'block';
  if (btn) btn.textContent = visible ? '{ } Показати LaTeX' : '{ } Сховати LaTeX';
};

window.feClear = function() {
  const input = document.getElementById('fe-latex-input');
  if (input) input.value = '';
  feRenderPreview();
};

window.applyFormula = function(qi) {
  const input = document.getElementById('fe-latex-input');
  if (!input) return;
  window._testQuestions[qi].formula = input.value.trim();
  closeModal('formula-modal');
  renderQuestionsEditor();
};

window.navigate = navigate;
window.handleLogout = handleLogout;
window.switchAuthTab = switchAuthTab;
window.handleLogin = handleLogin;
window.handleRegister = handleRegister;
window.handleGoogleLogin = handleGoogleLogin;
window.openCreateTest = openCreateTest;
window.openEditTest = openEditTest;
window.renderTestEditorPage = renderTestEditorPage;
window.toggleTestActive = toggleTestActive;
window.confirmDeleteTest = confirmDeleteTest;
window.copyCode = copyCode;
window.closeModal = closeModal;
window.handleCodeInput = handleCodeInput;
window.handleCodeSubmit = handleCodeSubmit;
window.openSettings = openSettings;

window.addEventListener('popstate', router);

async function init() {
  const hasOAuthToken = window.location.hash.includes('access_token') || window.location.search.includes('code=');

  if (hasOAuthToken) {
    db.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_IN' && session?.user) {
        currentUser = session.user;
        await ensureProfile(session.user);
        document.getElementById('loading-screen')?.remove();
        await afterAuthRedirect();
      } else if (event === 'SIGNED_OUT') {
        currentUser = null; currentProfile = null;
        navigate('/');
      }
    });
    return;
  }

  const { data: { session } } = await db.auth.getSession();
  if (session?.user) { currentUser = session.user; await ensureProfile(session.user); }

  document.getElementById('loading-screen')?.remove();

  db.auth.onAuthStateChange(async (event, session) => {
    if (event === 'SIGNED_IN' && session?.user) {
      currentUser = session.user;
      await ensureProfile(session.user);
    } else if (event === 'SIGNED_OUT') {
      currentUser = null; currentProfile = null;
      navigate('/');
    }
  });

  if (window.location.pathname === '/auth') { renderAuth(); return; }
  router();
}

init();