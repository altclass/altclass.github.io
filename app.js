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
  if (theme === 'dark') html.classList.add('dark');
  else if (theme === 'light') html.classList.remove('dark');
  else {
    if (window.matchMedia('(prefers-color-scheme: dark)').matches) html.classList.add('dark');
    else html.classList.remove('dark');
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
  return new Date(new Date(createdAt).getTime() + 7 * 24 * 60 * 60 * 1000).toLocaleDateString('uk-UA', { day: '2-digit', month: 'short', year: 'numeric' });
}

function getScoreClass(score, total) {
  const pct = (score / total) * 100;
  if (pct >= 75) return 'high';
  if (pct >= 50) return 'mid';
  return 'low';
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

function escapeHtml(str) {
  return String(str || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function escapeAttr(str) {
  return (str || '').replace(/\\/g, '\\\\').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

const QUESTION_TYPES = [
  { value: 'single', label: 'Одиничний вибір', icon: 'fa-dot-circle' },
  { value: 'multiple', label: 'Множинний вибір', icon: 'fa-check-square' },
  { value: 'text', label: 'Текстова відповідь', icon: 'fa-font' },
  { value: 'number', label: 'Числова відповідь', icon: 'fa-hashtag' },
  { value: 'truefalse', label: 'Так/Ні', icon: 'fa-check-circle' },
  { value: 'dropdown', label: 'Випадаючий список', icon: 'fa-caret-down' },
  { value: 'order', label: 'Впорядкування', icon: 'fa-sort-amount-down' },
  { value: 'match', label: 'Відповідність', icon: 'fa-link' },
  { value: 'likert', label: 'Шкала Лайкерта', icon: 'fa-chart-line' },
  { value: 'date', label: 'Дата', icon: 'fa-calendar' },
  { value: 'file', label: 'Завантаження файлу', icon: 'fa-upload' }
];

function createEmptyQuestion() {
  return {
    id: Date.now() + Math.random(),
    text: '',
    type: 'single',
    options: ['', ''],
    correct: 0,
    points: 1,
    image: '',
    video: '',
    formula: '',
    hint: '',
    explanation: '',
    required: true,
    likertScale: 5,
    likertStatements: ['Твердження 1'],
    matchLeft: ['Лівий елемент 1'],
    matchRight: ['Правий елемент 1'],
    numberMin: 0,
    numberMax: 100,
    numberTolerance: 0,
    textPattern: '',
    textCaseSensitive: false
  };
}

function gradeAnswer(question, answer) {
  if (!answer && answer !== 0 && answer !== false) return { correct: false, points: 0, feedback: '' };
  
  switch (question.type) {
    case 'single':
      const isCorrect = answer == question.correct;
      return { correct: isCorrect, points: isCorrect ? (question.points || 1) : 0, feedback: isCorrect ? '' : (question.explanation || '') };
    
    case 'multiple':
      if (!Array.isArray(answer)) answer = [answer];
      const correctAnswers = Array.isArray(question.correct) ? question.correct : [question.correct];
      const allCorrect = correctAnswers.length === answer.length && correctAnswers.every(a => answer.includes(a));
      return { correct: allCorrect, points: allCorrect ? (question.points || 1) : 0, feedback: allCorrect ? '' : (question.explanation || '') };
    
    case 'truefalse':
      const tfCorrect = answer == (question.correct === true || question.correct === 'true');
      return { correct: tfCorrect, points: tfCorrect ? (question.points || 1) : 0, feedback: tfCorrect ? '' : (question.explanation || '') };
    
    case 'dropdown':
      const ddCorrect = answer == question.correct;
      return { correct: ddCorrect, points: ddCorrect ? (question.points || 1) : 0, feedback: ddCorrect ? '' : (question.explanation || '') };
    
    case 'text':
      if (!question.textPattern) {
        const match = String(answer).toLowerCase().trim() === String(question.correct).toLowerCase().trim();
        return { correct: match, points: match ? (question.points || 1) : 0, feedback: match ? '' : (question.explanation || '') };
      }
      const pattern = new RegExp(question.textPattern, question.textCaseSensitive ? '' : 'i');
      const matches = pattern.test(String(answer));
      return { correct: matches, points: matches ? (question.points || 1) : 0, feedback: matches ? '' : (question.explanation || '') };
    
    case 'number':
      const numAnswer = parseFloat(answer);
      const numCorrect = parseFloat(question.correct);
      const tolerance = question.numberTolerance || 0;
      const withinRange = Math.abs(numAnswer - numCorrect) <= tolerance;
      const withinBounds = (!question.numberMin || numAnswer >= question.numberMin) && (!question.numberMax || numAnswer <= question.numberMax);
      const isNumCorrect = withinRange && withinBounds;
      return { correct: isNumCorrect, points: isNumCorrect ? (question.points || 1) : 0, feedback: isNumCorrect ? '' : (question.explanation || '') };
    
    case 'order':
      if (!Array.isArray(answer)) return { correct: false, points: 0, feedback: question.explanation || '' };
      const correctOrder = Array.isArray(question.correct) ? question.correct : question.options;
      let correctCount = 0;
      answer.forEach((item, idx) => { if (item === correctOrder[idx]) correctCount++; });
      const partialPoints = (correctCount / correctOrder.length) * (question.points || 1);
      return { correct: correctCount === correctOrder.length, points: partialPoints, feedback: correctCount === correctOrder.length ? '' : (question.explanation || '') };
    
    case 'match':
      if (!answer || typeof answer !== 'object') return { correct: false, points: 0, feedback: question.explanation || '' };
      let matchCorrect = 0;
      const totalMatches = Object.keys(answer).length;
      Object.entries(answer).forEach(([leftIdx, rightIdx]) => {
        if (question.matchPairs && question.matchPairs[leftIdx] && question.matchPairs[leftIdx].correct == rightIdx) matchCorrect++;
      });
      const matchPoints = (matchCorrect / totalMatches) * (question.points || 1);
      return { correct: matchCorrect === totalMatches, points: matchPoints, feedback: matchCorrect === totalMatches ? '' : (question.explanation || '') };
    
    case 'likert':
      if (!answer || typeof answer !== 'object') return { correct: false, points: 0, feedback: '' };
      let likertScore = 0;
      Object.values(answer).forEach(val => { if (val) likertScore++; });
      return { correct: true, points: (likertScore / Object.keys(answer).length) * (question.points || 1), feedback: '' };
    
    case 'date':
      const dateAnswer = new Date(answer);
      const dateCorrect = new Date(question.correct);
      const isDateCorrect = !isNaN(dateAnswer) && dateAnswer.toDateString() === dateCorrect.toDateString();
      return { correct: isDateCorrect, points: isDateCorrect ? (question.points || 1) : 0, feedback: isDateCorrect ? '' : (question.explanation || '') };
    
    case 'file':
      return { correct: !!answer, points: answer ? (question.points || 1) : 0, feedback: answer ? '' : (question.explanation || 'Завантажте файл') };
    
    default:
      return { correct: false, points: 0, feedback: '' };
  }
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
  if (path === '/question-bank') {
    if (!currentUser || currentProfile?.role !== 'teacher') { navigate('/'); return; }
    renderQuestionBank();
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
  const settingsBtn = currentUser ? `<button class="icon-btn" onclick="openSettings()" title="Налаштування"><i class="fas fa-cog"></i></button>` : '';
  const tutorialBtn = `<button class="icon-btn" onclick="openTutorial()" title="Інструкція"><i class="fas fa-book-open"></i></button>`;

  if (!currentUser) {
    return `
      <nav class="navbar">
        <span class="nav-logo" onclick="navigate('/')"><span class="logo-alt">Alt</span><span class="logo-class">Class</span></span>
        <div class="nav-right">
          ${tutorialBtn}
          ${settingsBtn}
          <button class="btn btn-outline btn-sm" onclick="navigate('/auth')"><i class="fas fa-sign-in-alt"></i> Увійти</button>
        </div>
      </nav>
    `;
  }
  return `
    <nav class="navbar">
      <span class="nav-logo" onclick="navigate('/')"><span class="logo-alt">Alt</span><span class="logo-class">Class</span></span>
      <div class="nav-right">
        ${tutorialBtn}
        ${settingsBtn}
        ${currentProfile?.role === 'teacher' ? `<button class="icon-btn" onclick="navigate('/question-bank')" title="Банк питань"><i class="fas fa-database"></i></button>` : ''}
        <button class="avatar-btn" onclick="navigate('/u/${currentUser.id}')" title="${escapeAttr(currentProfile?.name || '')}">
          ${currentProfile?.avatar_url ? `<img src="${currentProfile.avatar_url}" alt="" />` : (currentProfile?.name?.[0] || '?').toUpperCase()}
        </button>
      </div>
    </nav>
  `;
}

function renderLayout(content) {
  app.innerHTML = renderNavbar() + content;
}

function renderAuth(mode = 'login') {
  if (window.location.pathname !== '/auth') window.history.pushState({}, '', '/auth');
  app.innerHTML = `
    <div class="auth-wrapper">
      <div style="position:absolute;top:20px;left:20px"><span class="nav-logo" onclick="navigate('/')" style="cursor:pointer"><span class="logo-alt">Alt</span><span class="logo-class">Class</span></span></div>
      <div class="auth-card">
        <div class="auth-tabs"><button class="auth-tab ${mode === 'login' ? 'active' : ''}" id="tab-login" onclick="switchAuthTab('login')">Вхід</button><button class="auth-tab ${mode === 'register' ? 'active' : ''}" id="tab-register" onclick="switchAuthTab('register')">Реєстрація</button></div>
        <div id="auth-form-login" ${mode !== 'login' ? 'style="display:none"' : ''}>
          <div class="form-group"><label class="form-label">Електронна пошта</label><input class="form-input" type="email" id="login-email" placeholder="you@example.com" /></div>
          <div class="form-group"><label class="form-label">Пароль</label><input class="form-input" type="password" id="login-password" placeholder="········" onkeydown="if(event.key==='Enter') handleLogin()" /></div>
          <button class="btn btn-primary btn-full" onclick="handleLogin()" id="login-btn"><i class="fas fa-sign-in-alt"></i> Увійти</button>
        </div>
        <div id="auth-form-register" ${mode !== 'register' ? 'style="display:none"' : ''}>
          <div class="form-group"><label class="form-label">Ім'я та прізвище</label><input class="form-input" type="text" id="reg-name" placeholder="Ваше ім'я" /></div>
          <div class="form-group"><label class="form-label">Електронна пошта</label><input class="form-input" type="email" id="reg-email" placeholder="you@example.com" /></div>
          <div class="form-group"><label class="form-label">Пароль</label><input class="form-input" type="password" id="reg-password" placeholder="Мінімум 6 символів" onkeydown="if(event.key==='Enter') handleRegister()" /></div>
          <button class="btn btn-primary btn-full" onclick="handleRegister()" id="register-btn"><i class="fas fa-user-plus"></i> Створити акаунт</button>
        </div>
        <div class="divider">або</div>
        <button class="google-btn" onclick="handleGoogleLogin()"><i class="fab fa-google"></i> Продовжити з Google</button>
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
  btn.disabled = true; btn.innerHTML = '<i class="fas fa-spinner fa-pulse"></i> Вхід...';
  const { error } = await db.auth.signInWithPassword({ email, password });
  if (error) { showToast('Невірна пошта або пароль', 'error'); btn.disabled = false; btn.innerHTML = '<i class="fas fa-sign-in-alt"></i> Увійти'; }
}

async function handleRegister() {
  const name = document.getElementById('reg-name').value.trim();
  const email = document.getElementById('reg-email').value.trim();
  const password = document.getElementById('reg-password').value;
  const btn = document.getElementById('register-btn');
  if (!name || !email || !password) { showToast('Заповніть усі поля', 'error'); return; }
  if (password.length < 6) { showToast('Пароль мінімум 6 символів', 'error'); return; }
  btn.disabled = true; btn.innerHTML = '<i class="fas fa-spinner fa-pulse"></i> Реєстрація...';
  const { data, error } = await db.auth.signUp({ email, password, options: { data: { full_name: name } } });
  if (error) { showToast(error.message, 'error'); btn.disabled = false; btn.innerHTML = '<i class="fas fa-user-plus"></i> Створити акаунт'; return; }
  if (data.user) { await ensureProfile(data.user, name); showToast('Акаунт створено! Перевірте пошту для підтвердження.', 'success'); btn.disabled = false; btn.innerHTML = '<i class="fas fa-user-plus"></i> Створити акаунт'; }
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
  const { data: profile, error: insertError } = await db.from('profiles').insert({ id: user.id, email, name: displayName, role, avatar_url: avatarUrl }).select().single();
  if (insertError) { showToast('Помилка створення профілю: ' + insertError.message, 'error'); return null; }
  currentProfile = profile;
  return profile;
}

async function afterAuthRedirect() {
  const pendingCode = sessionStorage.getItem(PENDING_CODE_KEY);
  if (pendingCode) { sessionStorage.removeItem(PENDING_CODE_KEY); navigate(`/${pendingCode}`); }
  else { navigate(`/u/${currentUser.id}`); }
}

function renderHome() {
  const loggedIn = !!currentUser;
  app.innerHTML = `
    ${renderNavbar()}
    <div class="home-hero">
      <div class="home-hero-inner">
        <div class="home-badge">Платформа для тестування</div>
        <h1 class="home-title">Навчай та перевіряй знання<br/>з <span class="logo-alt">Alt</span><span class="logo-class">Class</span></h1>
        <p class="home-sub">Вчителі створюють тести за лічені хвилини. Учні проходять їх за унікальним кодом.</p>
        <div class="code-enter-box">
          <div class="code-enter-label">Введіть код тесту</div>
          <div class="code-enter-row">
            <input class="code-input" type="text" id="home-code-input" placeholder="000000" maxlength="6" oninput="handleCodeInput(this)" onkeydown="if(event.key==='Enter') handleCodeSubmit()" />
            <button class="btn btn-primary" onclick="handleCodeSubmit()" id="code-go-btn" disabled><i class="fas fa-arrow-right"></i></button>
          </div>
          <input class="name-input" type="text" id="home-student-name" placeholder="Ваше ім'я (для проходження без реєстрації)" />
        </div>
        ${loggedIn ? `
          <div class="home-actions-row">
            <button class="btn btn-ghost" onclick="navigate('/u/${currentUser.id}')"><i class="fas fa-user"></i> Мій кабінет</button>
            ${currentProfile?.role === 'teacher' ? `<button class="btn btn-outline" onclick="openCreateTest()"><i class="fas fa-plus"></i> Створити тест</button>` : ''}
          </div>
        ` : `<div class="home-actions-row"><button class="btn btn-ghost" onclick="navigate('/auth')"><i class="fas fa-sign-in-alt"></i> Увійти в акаунт</button></div>`}
      </div>
      <div class="home-features">
        <div class="feature-card"><div class="feature-icon"><i class="fas fa-pen-fancy"></i></div><h3>Для вчителів</h3><p>Створюйте тести з різними типами питань. Кожен тест отримує унікальний код.</p></div>
        <div class="feature-card"><div class="feature-icon"><i class="fas fa-graduation-cap"></i></div><h3>Для учнів</h3><p>Отримайте код від вчителя, введіть його та пройдіть тест. Результати зберігаються автоматично.</p></div>
        <div class="feature-card"><div class="feature-icon"><i class="fas fa-chart-line"></i></div><h3>Аналітика</h3><p>Відстежуйте прогрес. В особистому кабінеті зберігається повна історія тестів та оцінок.</p></div>
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
  const studentName = document.getElementById('home-student-name')?.value.trim();
  if (studentName) sessionStorage.setItem('altclass_temp_name', studentName);
  navigate(`/${code}`);
}

// ============ Test Taking Engine ============
class TestSession {
  constructor(test, studentId, studentName, sessionToken, isAnonymous) {
    this.test = test;
    this.studentId = studentId;
    this.studentName = studentName;
    this.sessionToken = sessionToken;
    this.isAnonymous = isAnonymous;
    this.questions = test.shuffle_questions ? this.shuffleArray([...test.questions]) : [...test.questions];
    this.currentIndex = 0;
    this.answers = Array(this.questions.length).fill(null);
    this.answerDetails = Array(this.questions.length).fill(null);
    this.startTime = Date.now();
    this.timerInterval = null;
    this.timeLeft = (test.time_limit || 0) * 60;
    this.onComplete = null;
  }

  shuffleArray(arr) {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }

  shuffleOptions(options) {
    if (!this.test.shuffle_options) return options;
    const shuffled = [...options];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  }

  getCurrentQuestion() {
    return this.questions[this.currentIndex];
  }

  setAnswer(answer, details = null) {
    this.answers[this.currentIndex] = answer;
    this.answerDetails[this.currentIndex] = details;
    this.saveProgress();
  }

  async saveProgress() {
    if (this.sessionToken) {
      await db.from('active_sessions').upsert({
        session_token: this.sessionToken,
        student_name: this.studentName,
        test_id: this.test.id,
        current_question: this.currentIndex,
        answers: this.answers,
        answer_details: this.answerDetails,
        status: 'active',
        last_activity: new Date()
      });
    }
  }

  async finish() {
    this.stopTimer();
    
    let totalPoints = 0;
    let earnedPoints = 0;
    const results = [];
    
    for (let i = 0; i < this.questions.length; i++) {
      const q = this.questions[i];
      const answer = this.answers[i];
      const grading = gradeAnswer(q, answer);
      totalPoints += q.points || 1;
      earnedPoints += grading.points;
      results.push({
        questionId: i,
        questionText: q.text,
        questionType: q.type,
        userAnswer: answer,
        isCorrect: grading.correct,
        pointsEarned: grading.points,
        maxPoints: q.points || 1,
        feedback: grading.feedback,
        correctAnswer: q.correct
      });
    }
    
    const percentage = Math.round((earnedPoints / totalPoints) * 100);
    const passed = percentage >= (this.test.passing_score || 50);
    const grade = scoreToGrade(earnedPoints, totalPoints);
    
    const resultData = {
      student_id: this.studentId,
      student_name: this.studentName,
      test_id: this.test.id,
      test_title: this.test.title,
      score: earnedPoints,
      total: totalPoints,
      percentage: percentage,
      grade: grade,
      passed: passed,
      answers: this.answers,
      answer_details: this.answerDetails,
      results: results,
      completed_at: new Date().toISOString(),
      time_spent: Math.floor((Date.now() - this.startTime) / 1000)
    };
    
    if (!this.isAnonymous && this.studentId) {
      await db.from('test_results').insert(resultData);
      
      const attemptKey = `attempt_${this.test.id}_${this.studentId}`;
      const attemptCount = parseInt(localStorage.getItem(attemptKey) || '0');
      localStorage.setItem(attemptKey, attemptCount + 1);
    } else if (this.isAnonymous && this.sessionToken) {
      await db.from('active_sessions').update({ 
        status: 'completed',
        answers: this.answers,
        answer_details: this.answerDetails,
        completed_at: new Date()
      }).eq('session_token', this.sessionToken);
      
      const anonResults = JSON.parse(localStorage.getItem('altclass_anon_results') || '[]');
      anonResults.push(resultData);
      localStorage.setItem('altclass_anon_results', JSON.stringify(anonResults.slice(-50)));
    }
    
    if (passed && percentage === 100) {
      canvasConfetti({ particleCount: 200, spread: 70, origin: { y: 0.6 } });
    }
    
    if (this.onComplete) this.onComplete(resultData);
    this.renderResult(resultData);
  }

  renderResult(result) {
    const cls = result.percentage >= 75 ? 'high' : result.percentage >= 50 ? 'mid' : 'low';
    const showDetails = this.test.show_results !== false;
    
    let detailsHtml = '';
    if (showDetails && result.results) {
      detailsHtml = `
        <div style="margin-top: 32px; text-align: left; max-width: 600px; width: 100%;">
          <h3 style="margin-bottom: 16px;"><i class="fas fa-list-check"></i> Детальні результати</h3>
          ${result.results.map((r, idx) => `
            <div class="question-card" style="margin-bottom: 12px;">
              <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
                <strong>${idx + 1}. ${escapeHtml(r.questionText)}</strong>
                <span class="score-badge ${r.isCorrect ? 'high' : 'low'}">${r.pointsEarned}/${r.maxPoints}</span>
              </div>
              <div style="font-size: 0.85rem; color: var(--gray-500);">
                <div><i class="fas fa-user-edit"></i> Ваша відповідь: ${this.formatAnswerDisplay(r)}</div>
                ${!r.isCorrect && r.correctAnswer ? `<div><i class="fas fa-check-circle" style="color: var(--green);"></i> Правильна відповідь: ${this.formatCorrectAnswer(r)}</div>` : ''}
                ${r.feedback ? `<div><i class="fas fa-info-circle"></i> ${escapeHtml(r.feedback)}</div>` : ''}
              </div>
            </div>
          `).join('')}
        </div>
      `;
    }
    
    app.innerHTML = `
      <div class="result-screen">
        <div class="result-circle ${cls}">
          <span class="result-score-num">${result.score}</span>
          <span class="result-score-denom">з ${result.total}</span>
        </div>
        <h2 class="result-title">${result.passed ? '🎉 Вітаємо!' : '📚 Спробуйте ще раз'}</h2>
        <div class="result-grade-badge grade-${cls}">
          Оцінка: ${result.grade}/12 (${result.percentage}%)
        </div>
        <p class="result-sub">${escapeHtml(result.test_title)}</p>
        <div style="display: flex; gap: 10px; margin-top: 20px; flex-wrap: wrap; justify-content: center;">
          <button class="btn btn-ghost" onclick="navigate('/')">🏠 На головну</button>
          ${!this.isAnonymous && this.studentId ? `<button class="btn btn-primary" onclick="navigate('/u/${this.studentId}')">📊 Мої результати</button>` : ''}
          <button class="btn btn-outline" onclick="window.location.reload()">🔄 Пройти ще раз</button>
        </div>
        ${detailsHtml}
      </div>
    `;
  }

  formatAnswerDisplay(r) {
    if (r.userAnswer === undefined || r.userAnswer === null) return 'Немає відповіді';
    if (r.questionType === 'multiple' && Array.isArray(r.userAnswer)) {
      const opts = this.questions[r.questionId]?.options || [];
      return r.userAnswer.map(a => opts[a] || a).join(', ');
    }
    if (r.questionType === 'order' && Array.isArray(r.userAnswer)) {
      return r.userAnswer.map((a, i) => `${i + 1}. ${a}`).join(' → ');
    }
    if (r.questionType === 'match' && typeof r.userAnswer === 'object') {
      const left = this.questions[r.questionId]?.matchLeft || [];
      return Object.entries(r.userAnswer).map(([l, r]) => `${left[l]} → ${r}`).join(', ');
    }
    if (r.questionType === 'file') return '📎 Файл завантажено';
    return String(r.userAnswer);
  }

  formatCorrectAnswer(r) {
    if (r.questionType === 'multiple' && Array.isArray(r.correctAnswer)) {
      const opts = this.questions[r.questionId]?.options || [];
      return r.correctAnswer.map(a => opts[a] || a).join(', ');
    }
    if (r.questionType === 'order' && Array.isArray(r.correctAnswer)) {
      return r.correctAnswer.join(' → ');
    }
    return String(r.correctAnswer);
  }

  startTimer() {
    if (!this.test.time_limit || this.test.time_limit <= 0) return;
    
    this.timerInterval = setInterval(() => {
      this.timeLeft--;
      const timerEl = document.getElementById('test-timer');
      if (timerEl) {
        const minutes = Math.floor(this.timeLeft / 60);
        const seconds = this.timeLeft % 60;
        timerEl.innerHTML = `<i class="fas fa-hourglass-half"></i> ${minutes}:${String(seconds).padStart(2, '0')}`;
        timerEl.className = `test-timer ${this.timeLeft <= 30 ? 'timer-danger' : this.timeLeft <= 120 ? 'timer-warn' : ''}`;
      }
      if (this.timeLeft <= 0) {
        this.finish();
      }
    }, 1000);
  }

  stopTimer() {
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
      this.timerInterval = null;
    }
  }

  async renderQuestion() {
    const q = this.getCurrentQuestion();
    const isLast = this.currentIndex === this.questions.length - 1;
    const progress = ((this.currentIndex + 1) / this.questions.length) * 100;
    const savedAnswer = this.answers[this.currentIndex];
    
    const mediaHtml = this.renderQuestionMedia(q);
    const questionHtml = marked.parse(q.text || '');
    
    let answerHtml = await this.renderAnswerInput(q, savedAnswer);
    
    app.innerHTML = `
      <div class="test-wrapper">
        <div class="test-progress-bar-wrap">
          <div class="test-progress-bar" style="width: ${progress}%"></div>
        </div>
        <div class="test-header">
          <div class="test-header-top">
            <span class="test-title-main"><i class="fas fa-clipboard-list"></i> ${escapeHtml(this.test.title)}</span>
            <div>
              <span class="test-timer" id="test-timer">${this.test.time_limit ? `<i class="fas fa-hourglass-half"></i> ${Math.floor(this.timeLeft / 60)}:${String(this.timeLeft % 60).padStart(2, '0')}` : ''}</span>
              <span class="test-progress-label">${this.currentIndex + 1}/${this.questions.length}</span>
            </div>
          </div>
        </div>
        <div class="test-body">
          <div class="question-block">
            <div class="question-text">${questionHtml}</div>
            ${mediaHtml}
            ${q.hint ? `<div style="margin-bottom: 16px; padding: 8px 12px; background: var(--orange-light); border-radius: var(--radius-sm); font-size: 0.85rem;"><i class="fas fa-lightbulb"></i> Підказка: ${escapeHtml(q.hint)}</div>` : ''}
            <div id="answer-container">${answerHtml}</div>
          </div>
        </div>
        <div class="test-footer">
          <button class="btn btn-primary" id="next-btn" onclick="window.currentTestSession.next()" ${savedAnswer === undefined || savedAnswer === null ? 'disabled' : ''}>
            ${isLast ? '<i class="fas fa-check"></i> Завершити' : '<i class="fas fa-arrow-right"></i> Далі'}
          </button>
        </div>
      </div>
    `;
    
    this.attachAnswerHandlers(q, savedAnswer);
    if (q.formula) {
      const el = document.getElementById('qformula-render');
      if (el) {
        try {
          katex.render(q.formula, el, { throwOnError: false, displayMode: true });
        } catch(e) {
          el.textContent = q.formula;
        }
      }
    }
  }

  renderQuestionMedia(q) {
    if (q.image) return `<img src="${escapeAttr(q.image)}" style="max-width: 100%; border-radius: 12px; margin: 12px 0;" />`;
    if (q.video) {
      const youtubeId = this.getYoutubeId(q.video);
      return `<iframe src="https://www.youtube.com/embed/${youtubeId}" frameborder="0" allowfullscreen style="width: 100%; aspect-ratio: 16/9; border-radius: 12px; margin: 12px 0;"></iframe>`;
    }
    if (q.formula) return `<div class="formula-preview" id="qformula-render"></div>`;
    return '';
  }

  getYoutubeId(url) {
    const m = (url || '').match(/(?:v=|youtu\.be\/)([\w-]{11})/);
    return m ? m[1] : null;
  }

  async renderAnswerInput(q, savedAnswer) {
    const opts = this.test.shuffle_options ? this.shuffleOptions([...q.options]) : [...q.options];
    
    switch (q.type) {
      case 'single':
        return `
          <div class="answer-options">
            ${opts.map((opt, idx) => `
              <button class="answer-option ${savedAnswer === idx ? 'selected' : ''}" data-value="${idx}">
                <span class="answer-option-letter">${String.fromCharCode(65 + idx)}</span>
                <div class="answer-option-content">${escapeHtml(opt)}</div>
              </button>
            `).join('')}
          </div>
        `;
      
      case 'multiple':
        const selectedValues = Array.isArray(savedAnswer) ? savedAnswer : [];
        return `
          <div class="answer-options">
            ${opts.map((opt, idx) => `
              <button class="answer-option ${selectedValues.includes(idx) ? 'selected' : ''}" data-value="${idx}">
                <span class="answer-option-letter"><i class="fas ${selectedValues.includes(idx) ? 'fa-check-square' : 'fa-square'}"></i></span>
                <div class="answer-option-content">${escapeHtml(opt)}</div>
              </button>
            `).join('')}
          </div>
        `;
      
      case 'truefalse':
        return `
          <div class="answer-options">
            <button class="answer-option ${savedAnswer === true ? 'selected' : ''}" data-value="true">
              <span class="answer-option-letter"><i class="fas fa-check-circle"></i></span>
              <div class="answer-option-content">✅ Так / Правда</div>
            </button>
            <button class="answer-option ${savedAnswer === false ? 'selected' : ''}" data-value="false">
              <span class="answer-option-letter"><i class="fas fa-times-circle"></i></span>
              <div class="answer-option-content">❌ Ні / Неправда</div>
            </button>
          </div>
        `;
      
      case 'dropdown':
        return `
          <select class="answer-select" id="dropdown-select" style="width: 100%;">
            <option value="">-- Оберіть відповідь --</option>
            ${opts.map((opt, idx) => `
              <option value="${idx}" ${savedAnswer === idx ? 'selected' : ''}>${escapeHtml(opt)}</option>
            `).join('')}
          </select>
        `;
      
      case 'text':
        return `
          <textarea class="answer-input answer-textarea" id="text-answer" placeholder="Введіть вашу відповідь..." rows="3">${savedAnswer || ''}</textarea>
        `;
      
      case 'number':
        return `
          <input type="number" class="answer-input" id="number-answer" placeholder="Введіть число" value="${savedAnswer || ''}" 
            ${q.numberMin ? `min="${q.numberMin}"` : ''} ${q.numberMax ? `max="${q.numberMax}"` : ''} step="any" />
        `;
      
      case 'date':
        return `
          <input type="date" class="answer-input" id="date-answer" value="${savedAnswer || ''}" />
        `;
      
      case 'order':
        const orderItems = Array.isArray(savedAnswer) && savedAnswer.length ? savedAnswer : [...opts];
        return `
          <div class="order-list" id="order-list">
            ${orderItems.map((item, idx) => `
              <div class="order-item" data-index="${idx}">
                <span class="order-handle"><i class="fas fa-grip-vertical"></i></span>
                <span class="order-number">${idx + 1}</span>
                <span>${escapeHtml(item)}</span>
              </div>
            `).join('')}
          </div>
          <p class="meta-tag" style="margin-top: 8px;"><i class="fas fa-arrows-alt"></i> Перетягуйте елементи для зміни порядку</p>
        `;
      
      case 'match':
        const leftItems = q.matchLeft || opts;
        const rightItems = q.matchRight || q.options;
        const savedMatches = savedAnswer || {};
        return `
          <div class="match-pairs">
            ${leftItems.map((left, leftIdx) => `
              <div class="match-row">
                <div class="match-left">${escapeHtml(left)}</div>
                <div class="match-right">
                  <select class="match-select" data-left="${leftIdx}">
                    <option value="">-- Оберіть пару --</option>
                    ${rightItems.map((right, rightIdx) => `
                      <option value="${rightIdx}" ${savedMatches[leftIdx] == rightIdx ? 'selected' : ''}>${escapeHtml(right)}</option>
                    `).join('')}
                  </select>
                </div>
              </div>
            `).join('')}
          </div>
        `;
      
      case 'likert':
        const statements = q.likertStatements || ['Твердження'];
        const scale = q.likertScale || 5;
        const savedLikert = savedAnswer || {};
        return `
          <table class="likert-table">
            <thead>
              <tr><th>Твердження</th>
                ${Array.from({ length: scale }, (_, i) => `<th>${i + 1}</th>`).join('')}
              </tr>
            </thead>
            <tbody>
              ${statements.map((stmt, stmtIdx) => `
                <tr>
                  <td style="text-align: left;">${escapeHtml(stmt)}</td>
                  ${Array.from({ length: scale }, (_, val) => `
                    <td>
                      <div class="likert-option ${savedLikert[stmtIdx] === val ? 'selected' : ''}" data-stmt="${stmtIdx}" data-value="${val}">
                        ${val + 1}
                      </div>
                    </td>
                  `).join('')}
                </tr>
              `).join('')}
            </tbody>
          </table>
        `;
      
      case 'file':
        return `
          <div class="file-upload-area" id="file-upload-area">
            <i class="fas fa-cloud-upload-alt" style="font-size: 2rem; margin-bottom: 8px;"></i>
            <p>Натисніть або перетягніть файл</p>
            <p style="font-size: 0.75rem; color: var(--gray-500);">Максимум 10MB</p>
            <input type="file" id="file-input" style="display: none;" accept=".pdf,.jpg,.png,.doc,.docx,.txt" />
            ${savedAnswer ? `<div style="margin-top: 8px;"><i class="fas fa-check-circle" style="color: var(--green);"></i> Файл завантажено: ${savedAnswer.name || 'файл'}</div>` : ''}
          </div>
        `;
      
      default:
        return `<p>Тип питання не підтримується</p>`;
    }
  }

  attachAnswerHandlers(q, savedAnswer) {
    const container = document.getElementById('answer-container');
    if (!container) return;
    
    const updateNextButton = () => {
      const btn = document.getElementById('next-btn');
      if (btn) btn.disabled = false;
      this.saveProgress();
    };
    
    switch (q.type) {
      case 'single':
        container.querySelectorAll('.answer-option').forEach(btn => {
          btn.onclick = () => {
            const value = parseInt(btn.dataset.value);
            this.setAnswer(value);
            container.querySelectorAll('.answer-option').forEach(b => b.classList.remove('selected'));
            btn.classList.add('selected');
            updateNextButton();
          };
        });
        break;
      
      case 'multiple':
        const selectedValues = Array.isArray(this.answers[this.currentIndex]) ? [...this.answers[this.currentIndex]] : [];
        container.querySelectorAll('.answer-option').forEach(btn => {
          btn.onclick = () => {
            const value = parseInt(btn.dataset.value);
            const idx = selectedValues.indexOf(value);
            if (idx === -1) selectedValues.push(value);
            else selectedValues.splice(idx, 1);
            this.setAnswer([...selectedValues]);
            btn.classList.toggle('selected');
            const icon = btn.querySelector('.answer-option-letter i');
            if (icon) {
              icon.className = `fas ${selectedValues.includes(value) ? 'fa-check-square' : 'fa-square'}`;
            }
            updateNextButton();
          };
        });
        break;
      
      case 'truefalse':
        container.querySelectorAll('.answer-option').forEach(btn => {
          btn.onclick = () => {
            const value = btn.dataset.value === 'true';
            this.setAnswer(value);
            container.querySelectorAll('.answer-option').forEach(b => b.classList.remove('selected'));
            btn.classList.add('selected');
            updateNextButton();
          };
        });
        break;
      
      case 'dropdown':
        const select = document.getElementById('dropdown-select');
        if (select) {
          select.onchange = () => {
            const value = select.value === '' ? null : parseInt(select.value);
            this.setAnswer(value);
            updateNextButton();
          };
        }
        break;
      
      case 'text':
        const textarea = document.getElementById('text-answer');
        if (textarea) {
          const saveText = () => {
            this.setAnswer(textarea.value);
            updateNextButton();
          };
          textarea.oninput = saveText;
          textarea.onblur = saveText;
        }
        break;
      
      case 'number':
        const numberInput = document.getElementById('number-answer');
        if (numberInput) {
          const saveNumber = () => {
            this.setAnswer(parseFloat(numberInput.value));
            updateNextButton();
          };
          numberInput.oninput = saveNumber;
          numberInput.onblur = saveNumber;
        }
        break;
      
      case 'date':
        const dateInput = document.getElementById('date-answer');
        if (dateInput) {
          dateInput.onchange = () => {
            this.setAnswer(dateInput.value);
            updateNextButton();
          };
        }
        break;
      
      case 'order':
        const orderList = document.getElementById('order-list');
        if (orderList && typeof Sortable !== 'undefined') {
          const sortable = new Sortable(orderList, {
            animation: 150,
            handle: '.order-handle',
            onEnd: () => {
              const items = Array.from(orderList.querySelectorAll('.order-item span:last-child')).map(el => el.textContent);
              this.setAnswer(items);
              updateNextButton();
              orderList.querySelectorAll('.order-item').forEach((el, idx) => {
                const numSpan = el.querySelector('.order-number');
                if (numSpan) numSpan.textContent = idx + 1;
              });
            }
          });
        }
        break;
      
      case 'match':
        const selects = container.querySelectorAll('.match-select');
        selects.forEach(select => {
          select.onchange = () => {
            const matches = {};
            selects.forEach(s => {
              const leftIdx = parseInt(s.dataset.left);
              const rightIdx = s.value === '' ? null : parseInt(s.value);
              if (rightIdx !== null) matches[leftIdx] = rightIdx;
            });
            this.setAnswer(matches);
            updateNextButton();
          };
        });
        break;
      
      case 'likert':
        const likertOptions = container.querySelectorAll('.likert-option');
        likertOptions.forEach(opt => {
          opt.onclick = () => {
            const stmtIdx = parseInt(opt.dataset.stmt);
            const value = parseInt(opt.dataset.value);
            const current = this.answers[this.currentIndex] || {};
            current[stmtIdx] = value;
            this.setAnswer(current);
            container.querySelectorAll(`.likert-option[data-stmt="${stmtIdx}"]`).forEach(o => o.classList.remove('selected'));
            opt.classList.add('selected');
            updateNextButton();
          };
        });
        break;
      
      case 'file':
        const uploadArea = document.getElementById('file-upload-area');
        const fileInput = document.getElementById('file-input');
        if (uploadArea && fileInput) {
          uploadArea.onclick = () => fileInput.click();
          uploadArea.ondragover = (e) => { e.preventDefault(); uploadArea.style.borderColor = 'var(--blue)'; };
          uploadArea.ondragleave = () => uploadArea.style.borderColor = '';
          uploadArea.ondrop = async (e) => {
            e.preventDefault();
            uploadArea.style.borderColor = '';
            const file = e.dataTransfer.files[0];
            if (file) await this.uploadFile(file, uploadArea);
          };
          fileInput.onchange = async () => {
            const file = fileInput.files[0];
            if (file) await this.uploadFile(file, uploadArea);
          };
        }
        break;
    }
  }

  async uploadFile(file, uploadArea) {
    if (file.size > 10 * 1024 * 1024) {
      showToast('Файл занадто великий (макс 10MB)', 'error');
      return;
    }
    
    showToast('Завантаження файлу...', 'info');
    const fileExt = file.name.split('.').pop();
    const fileName = `${Date.now()}_${Math.random().toString(36).substr(2, 9)}.${fileExt}`;
    const filePath = `test_uploads/${this.sessionToken || 'anon'}/${fileName}`;
    
    const { error } = await db.storage.from('test_uploads').upload(filePath, file);
    if (error) {
      showToast('Помилка завантаження: ' + error.message, 'error');
      return;
    }
    
    const { data: urlData } = db.storage.from('test_uploads').getPublicUrl(filePath);
    this.setAnswer({ name: file.name, url: urlData.publicUrl, size: file.size });
    updateNextButton();
    
    uploadArea.innerHTML = `
      <i class="fas fa-check-circle" style="font-size: 2rem; color: var(--green);"></i>
      <p>Файл завантажено: ${escapeHtml(file.name)}</p>
      <button class="btn btn-sm btn-ghost" onclick="event.stopPropagation(); this.closest('.file-upload-area').click();">Змінити файл</button>
    `;
  }

  async next() {
    const currentAnswer = this.answers[this.currentIndex];
    if (currentAnswer === undefined || currentAnswer === null) {
      const q = this.getCurrentQuestion();
      if (q.required !== false) {
        showToast('Будь ласка, дайте відповідь на питання', 'error');
        return;
      }
    }
    
    if (this.currentIndex < this.questions.length - 1) {
      this.currentIndex++;
      await this.renderQuestion();
    } else {
      await this.finish();
    }
  }
}

window.currentTestSession = null;

async function startTest(test, studentId, studentName) {
  const sessionToken = 'session_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  const isAnonymous = !studentId;
  
  await db.from('active_sessions').insert({
    session_token: sessionToken,
    student_name: studentName,
    test_id: test.id,
    current_question: 0,
    answers: {},
    status: 'active'
  });
  
  const session = new TestSession(test, studentId, studentName, sessionToken, isAnonymous);
  window.currentTestSession = session;
  session.startTimer();
  await session.renderQuestion();
}

async function renderTestLanding(code) {
  renderLayout(`<div class="page" style="display:flex;align-items:center;justify-content:center;min-height:80vh"><div class="loading-spinner" style="margin:0 auto"></div></div>`);
  
  const { data: test } = await db.from('tests').select('*').eq('code', code).single();
  if (!test) { renderNotFound(); return; }
  if (!test.is_active) { renderBlockedTest('Цей тест деактивовано вчителем.'); return; }
  if (isTestExpired(test.created_at)) { renderBlockedTest('Час дії цього тесту закінчився (7 днів).'); return; }
  
  const tempName = sessionStorage.getItem('altclass_temp_name');
  if (tempName) sessionStorage.removeItem('altclass_temp_name');
  
  if (currentUser) {
    const attemptKey = `attempt_${test.id}_${currentUser.id}`;
    const attemptCount = parseInt(localStorage.getItem(attemptKey) || '0');
    if (attemptCount >= (test.max_attempts || 1)) {
      renderBlockedTest(`Ви вже використали ${test.max_attempts} спробу(и) для цього тесту.`);
      return;
    }
    const { data: existing } = await db.from('test_results').select('id').eq('student_id', currentUser.id).eq('test_id', test.id).single();
    if (existing && (test.max_attempts || 1) === 1) {
      renderAlreadyPassed(test);
      return;
    }
    startTest(test, currentUser.id, currentProfile?.name);
  } else {
    const studentName = tempName || prompt('Введіть ваше ім\'я для проходження тесту:');
    if (!studentName) { navigate('/'); return; }
    startTest(test, null, studentName);
  }
}

let editorQuestions = [];
let editorTestId = null;
let editorTitle = '';
let editorDescription = '';
let editorTimeLimit = 0;
let editorMaxAttempts = 1;
let editorShuffleQuestions = false;
let editorShuffleOptions = false;
let editorShowResults = true;
let editorPassingScore = 50;
let editorDraftSaved = false;
let sortableInstance = null;

async function renderTestEditorPage(testId) {
  const isEdit = !!testId;
  
  if (isEdit) {
    renderLayout(`<div class="page"><div class="loading-spinner" style="margin:0 auto"></div></div>`);
    const { data: test } = await db.from('tests').select('*').eq('id', testId).single();
    if (!test || test.teacher_id !== currentUser?.id) { navigate('/'); return; }
    editorQuestions = test.questions || [createEmptyQuestion()];
    editorTestId = testId;
    editorTitle = test.title || '';
    editorDescription = test.description || '';
    editorTimeLimit = test.time_limit || 0;
    editorMaxAttempts = test.max_attempts || 1;
    editorShuffleQuestions = test.shuffle_questions || false;
    editorShuffleOptions = test.shuffle_options || false;
    editorShowResults = test.show_results !== false;
    editorPassingScore = test.passing_score || 50;
  } else {
    editorTestId = null;
    editorQuestions = [createEmptyQuestion()];
    editorTitle = '';
    editorDescription = '';
    editorTimeLimit = 0;
    editorMaxAttempts = 1;
    editorShuffleQuestions = false;
    editorShuffleOptions = false;
    editorShowResults = true;
    editorPassingScore = 50;
  }
  
  renderLayout(`
    <div class="page-wide">
      <div class="editor-topbar">
        <button class="btn btn-ghost btn-sm" onclick="navigate('/u/${currentUser.id}')"><i class="fas fa-arrow-left"></i> Назад</button>
        <h1 class="editor-page-title">${isEdit ? '<i class="fas fa-edit"></i> Редагувати тест' : '<i class="fas fa-plus-circle"></i> Новий тест'}</h1>
        <div style="display: flex; gap: 8px;">
          <button class="btn btn-outline btn-sm" onclick="previewTest()"><i class="fas fa-eye"></i> Попередній перегляд</button>
          <button class="btn btn-primary btn-sm" onclick="saveTest()"><i class="fas fa-save"></i> Зберегти</button>
        </div>
      </div>
      
      <div class="editor-fields-row">
        <div class="form-group" style="grid-column: span 2;">
          <label class="form-label">Назва тесту <span style="color: var(--red);">*</span></label>
          <input class="form-input" type="text" id="test-title" value="${escapeAttr(editorTitle)}" placeholder="Назва тесту" />
        </div>
        <div class="form-group">
          <label class="form-label"><i class="fas fa-hourglass-half"></i> Час (хв)</label>
          <input class="form-input" type="number" id="test-time-limit" min="0" max="180" value="${editorTimeLimit}" placeholder="0 = без ліміту" />
        </div>
        <div class="form-group">
          <label class="form-label"><i class="fas fa-redo-alt"></i> Макс. спроб</label>
          <input class="form-input" type="number" id="setting-max-attempts" min="1" max="10" value="${editorMaxAttempts}" />
        </div>
      </div>
      
      <div class="form-group">
        <label class="form-label">Опис тесту (необов'язково)</label>
        <textarea class="form-input form-textarea" id="test-desc" rows="2" placeholder="Опишіть тему, складність, рекомендації...">${escapeAttr(editorDescription)}</textarea>
      </div>
      
      <div class="settings-panel">
        <div class="settings-title"><i class="fas fa-sliders-h"></i> Налаштування тесту</div>
        <div class="settings-grid">
          <label><input type="checkbox" id="setting-shuffle-questions" ${editorShuffleQuestions ? 'checked' : ''} /> <i class="fas fa-random"></i> Перемішати питання</label>
          <label><input type="checkbox" id="setting-shuffle-options" ${editorShuffleOptions ? 'checked' : ''} /> <i class="fas fa-exchange-alt"></i> Перемішати варіанти</label>
          <label><input type="checkbox" id="setting-show-results" ${editorShowResults ? 'checked' : ''} /> <i class="fas fa-chart-bar"></i> Показувати результати</label>
          <div><label class="form-label"><i class="fas fa-flag-checkered"></i> Мін. бал (%)</label><input class="form-input" type="number" id="setting-passing-score" min="0" max="100" value="${editorPassingScore}" style="width: 80px" /></div>
        </div>
      </div>
      
      <div class="section-header">
        <h2 class="section-title"><i class="fas fa-question-circle"></i> Питання (${editorQuestions.length})</h2>
        <div style="display: flex; gap: 8px;">
          <button class="btn btn-outline btn-sm" onclick="importQuestions()"><i class="fas fa-upload"></i> Імпорт</button>
          <button class="btn btn-primary btn-sm" onclick="addQuestion()"><i class="fas fa-plus"></i> Додати питання</button>
        </div>
      </div>
      
      <div class="questions-list" id="questions-list"></div>
      
      <div style="margin-top: 24px; display: flex; gap: 12px; justify-content: flex-end;">
        <button class="btn btn-ghost" onclick="navigate('/u/${currentUser.id}')">Скасувати</button>
        <button class="btn btn-primary" onclick="saveTest()"><i class="fas fa-save"></i> Зберегти тест</button>
      </div>
    </div>
  `);
  
  renderQuestionsEditor();
  
  setTimeout(() => {
    const container = document.getElementById('questions-list');
    if (container && typeof Sortable !== 'undefined') {
      if (sortableInstance) sortableInstance.destroy();
      sortableInstance = new Sortable(container, {
        animation: 200,
        handle: '.question-card',
        draggable: '.question-card',
        ghostClass: 'drag-placeholder',
        onEnd: () => {
          const newOrder = Array.from(container.querySelectorAll('.question-card')).map(card => parseInt(card.dataset.index));
          editorQuestions = newOrder.map(idx => editorQuestions[idx]);
          renderQuestionsEditor();
        }
      });
    }
  }, 100);
}

function renderQuestionsEditor() {
  const list = document.getElementById('questions-list');
  if (!list) return;
  
  list.innerHTML = editorQuestions.map((q, qi) => {
    const typeIcon = QUESTION_TYPES.find(t => t.value === q.type)?.icon || 'fa-question';
    
    return `
      <div class="question-card" data-index="${qi}">
        <div class="question-card-header">
          <span class="question-num"><i class="fas ${typeIcon}"></i> Питання ${qi + 1}</span>
          <div class="question-actions">
            <button class="icon-btn btn-sm" onclick="duplicateQuestion(${qi})" title="Дублювати"><i class="fas fa-copy"></i></button>
            <button class="icon-btn btn-sm" onclick="moveQuestionUp(${qi})" title="Вгору" ${qi === 0 ? 'disabled' : ''}><i class="fas fa-arrow-up"></i></button>
            <button class="icon-btn btn-sm" onclick="moveQuestionDown(${qi})" title="Вниз" ${qi === editorQuestions.length - 1 ? 'disabled' : ''}><i class="fas fa-arrow-down"></i></button>
            <button class="icon-btn btn-sm" onclick="addToBank(${qi})" title="Додати в банк"><i class="fas fa-database"></i></button>
            <button class="icon-btn btn-sm btn-danger" onclick="removeQuestion(${qi})" title="Видалити"><i class="fas fa-trash"></i></button>
          </div>
        </div>
        
        <div class="form-group">
          <label class="form-label"><i class="fas fa-paragraph"></i> Текст питання <span style="color: var(--red);">*</span></label>
          <textarea class="form-input form-textarea" rows="2" placeholder="Текст питання..." oninput="updateQuestionText(${qi}, this.value)">${escapeAttr(q.text)}</textarea>
        </div>
        
        <div class="form-group">
          <label class="form-label"><i class="fas fa-list-ul"></i> Тип питання</label>
          <select class="form-input" onchange="updateQuestionType(${qi}, this.value)">
            ${QUESTION_TYPES.map(type => `
              <option value="${type.value}" ${q.type === type.value ? 'selected' : ''}>
                <i class="fas ${type.icon}"></i> ${type.label}
              </option>
            `).join('')}
          </select>
        </div>
        
        <div class="form-group">
          <label class="form-label"><i class="fas fa-star"></i> Бали за питання</label>
          <input class="form-input" type="number" min="0" max="100" value="${q.points || 1}" onchange="updateQuestionPoints(${qi}, this.value)" style="width: 100px" />
          <label style="margin-left: 16px;"><input type="checkbox" ${q.required !== false ? 'checked' : ''} onchange="updateQuestionRequired(${qi}, this.checked)" /> Обов'язкове питання</label>
        </div>
        
        <div class="qmedia-tabs">
          <button class="qmedia-tab ${!q.image && !q.video && !q.formula ? 'active' : ''}" onclick="setMediaTab(${qi}, 'none')"><i class="fas fa-font"></i> Текст</button>
          <button class="qmedia-tab ${q.image ? 'active' : ''}" onclick="setMediaTab(${qi}, 'image')"><i class="fas fa-image"></i> Зображення</button>
          <button class="qmedia-tab ${q.video ? 'active' : ''}" onclick="setMediaTab(${qi}, 'video')"><i class="fas fa-video"></i> Відео</button>
          <button class="qmedia-tab ${q.formula ? 'active' : ''}" onclick="setMediaTab(${qi}, 'formula')"><i class="fas fa-superscript"></i> Формула</button>
        </div>
        <div class="qmedia-body">
          ${renderMediaFields(q, qi)}
        </div>
        
        <div id="question-type-fields-${qi}">
          ${renderTypeSpecificFields(q, qi)}
        </div>
        
        <div class="form-group" style="margin-top: 12px;">
          <label class="form-label"><i class="fas fa-lightbulb"></i> Підказка (необов'язково)</label>
          <input class="form-input" type="text" placeholder="Підказка для учня..." value="${escapeAttr(q.hint || '')}" oninput="updateQuestionField(${qi}, 'hint', this.value)" />
        </div>
        
        <div class="form-group">
          <label class="form-label"><i class="fas fa-info-circle"></i> Пояснення (необов'язково)</label>
          <textarea class="form-input form-textarea" rows="2" placeholder="Пояснення правильної відповіді..." oninput="updateQuestionField(${qi}, 'explanation', this.value)">${escapeAttr(q.explanation || '')}</textarea>
        </div>
      </div>
    `;
  }).join('');
}

function renderMediaFields(q, qi) {
  if (q.image) {
    return `<input class="form-input" type="url" placeholder="URL зображення" value="${escapeAttr(q.image)}" oninput="updateQuestionField(${qi}, 'image', this.value)" />
            ${q.image ? `<img src="${escapeAttr(q.image)}" class="qmedia-preview" onerror="this.style.display='none'" />` : ''}`;
  }
  if (q.video) {
    return `<input class="form-input" type="url" placeholder="YouTube URL" value="${escapeAttr(q.video)}" oninput="updateQuestionField(${qi}, 'video', this.value)" />`;
  }
  if (q.formula) {
    return `<div><input class="form-input" type="text" placeholder="LaTeX формула" value="${escapeAttr(q.formula)}" oninput="updateQuestionField(${qi}, 'formula', this.value)" />
            <button class="btn btn-outline btn-sm" onclick="openFormulaEditor(${qi})"><i class="fas fa-superscript"></i> Редактор формул</button>
            <div class="formula-preview" id="formula-preview-${qi}"></div></div>`;
  }
  return '';
}

function renderTypeSpecificFields(q, qi) {
  switch (q.type) {
    case 'single':
    case 'multiple':
    case 'dropdown':
      return `
        <label class="form-label">Варіанти відповідей</label>
        <div id="options-${qi}">
          ${q.options.map((opt, oi) => `
            <div class="option-row">
              <input type="${q.type === 'multiple' ? 'checkbox' : 'radio'}" name="correct-${qi}" ${q.correct === oi || (Array.isArray(q.correct) && q.correct.includes(oi)) ? 'checked' : ''} onchange="setCorrect(${qi}, ${oi})" />
              <input class="option-input" type="text" placeholder="Варіант ${oi + 1}" value="${escapeAttr(opt)}" oninput="updateOption(${qi}, ${oi}, this.value)" />
              ${q.options.length > 2 ? `<button class="option-remove" onclick="removeOption(${qi}, ${oi})"><i class="fas fa-times"></i></button>` : '<span style="width: 28px;"></span>'}
            </div>
          `).join('')}
        </div>
        ${q.options.length < 8 ? `<button class="btn btn-ghost btn-sm" onclick="addOption(${qi})"><i class="fas fa-plus"></i> Додати варіант</button>` : ''}
      `;
    
    case 'text':
      return `
        <div class="form-group">
          <label class="form-label">Правильна відповідь (опціонально для автоперевірки)</label>
          <input class="form-input" type="text" placeholder="Текст правильної відповіді" value="${escapeAttr(q.correct || '')}" oninput="updateQuestionField(${qi}, 'correct', this.value)" />
        </div>
        <div class="form-group">
          <label class="form-label">RegEx патерн (для розширеної перевірки)</label>
          <input class="form-input" type="text" placeholder="Наприклад: ^[А-Яа-я]+$" value="${escapeAttr(q.textPattern || '')}" oninput="updateQuestionField(${qi}, 'textPattern', this.value)" />
        </div>
        <label><input type="checkbox" ${q.textCaseSensitive ? 'checked' : ''} onchange="updateQuestionField(${qi}, 'textCaseSensitive', this.checked)" /> Враховувати регістр</label>
      `;
    
    case 'number':
      return `
        <div class="form-group">
          <label class="form-label">Правильне число</label>
          <input class="form-input" type="number" step="any" value="${q.correct || ''}" oninput="updateQuestionField(${qi}, 'correct', parseFloat(this.value))" />
        </div>
        <div class="form-group">
          <label class="form-label">Допустима похибка</label>
          <input class="form-input" type="number" step="any" value="${q.numberTolerance || 0}" oninput="updateQuestionField(${qi}, 'numberTolerance', parseFloat(this.value))" />
        </div>
        <div class="form-group">
          <label class="form-label">Мінімальне значення</label>
          <input class="form-input" type="number" step="any" value="${q.numberMin || ''}" oninput="updateQuestionField(${qi}, 'numberMin', parseFloat(this.value))" />
        </div>
        <div class="form-group">
          <label class="form-label">Максимальне значення</label>
          <input class="form-input" type="number" step="any" value="${q.numberMax || ''}" oninput="updateQuestionField(${qi}, 'numberMax', parseFloat(this.value))" />
        </div>
      `;
    
    case 'truefalse':
      return `
        <label class="form-label">Правильна відповідь</label>
        <div class="option-row">
          <input type="radio" name="tf-${qi}" ${q.correct === true ? 'checked' : ''} onchange="updateQuestionField(${qi}, 'correct', true)" /> Так / Правда
          <input type="radio" name="tf-${qi}" ${q.correct === false ? 'checked' : ''} onchange="updateQuestionField(${qi}, 'correct', false)" style="margin-left: 16px;" /> Ні / Неправда
        </div>
      `;
    
    case 'order':
      return `
        <label class="form-label">Елементи для впорядкування (правильний порядок зверху вниз)</label>
        <div id="order-options-${qi}">
          ${(q.options || ['Елемент 1', 'Елемент 2']).map((opt, oi) => `
            <div class="option-row">
              <span class="order-handle" style="cursor: grab;"><i class="fas fa-grip-vertical"></i></span>
              <input class="option-input" type="text" placeholder="Елемент ${oi + 1}" value="${escapeAttr(opt)}" oninput="updateOption(${qi}, ${oi}, this.value)" />
              <button class="option-remove" onclick="removeOption(${qi}, ${oi})"><i class="fas fa-times"></i></button>
            </div>
          `).join('')}
        </div>
        <button class="btn btn-ghost btn-sm" onclick="addOption(${qi})"><i class="fas fa-plus"></i> Додати елемент</button>
        <p class="meta-tag" style="margin-top: 8px;"><i class="fas fa-info-circle"></i> Правильний порядок визначається порядком елементів у списку</p>
      `;
    
    case 'match':
      return `
        <label class="form-label">Ліві елементи (питання)</label>
        <div id="match-left-${qi}">
          ${(q.matchLeft || ['Лівий 1']).map((item, idx) => `
            <div class="option-row">
              <input class="option-input" type="text" placeholder="Лівий елемент ${idx + 1}" value="${escapeAttr(item)}" oninput="updateMatchLeft(${qi}, ${idx}, this.value)" />
              <button class="option-remove" onclick="removeMatchLeft(${qi}, ${idx})"><i class="fas fa-times"></i></button>
            </div>
          `).join('')}
        </div>
        <button class="btn btn-ghost btn-sm" onclick="addMatchLeft(${qi})"><i class="fas fa-plus"></i> Додати лівий елемент</button>
        
        <label class="form-label" style="margin-top: 12px;">Праві елементи (відповіді)</label>
        <div id="match-right-${qi}">
          ${(q.matchRight || q.options || ['Правий 1']).map((item, idx) => `
            <div class="option-row">
              <input class="option-input" type="text" placeholder="Правий елемент ${idx + 1}" value="${escapeAttr(item)}" oninput="updateMatchRight(${qi}, ${idx}, this.value)" />
              <button class="option-remove" onclick="removeMatchRight(${qi}, ${idx})"><i class="fas fa-times"></i></button>
            </div>
          `).join('')}
        </div>
        <button class="btn btn-ghost btn-sm" onclick="addMatchRight(${qi})"><i class="fas fa-plus"></i> Додати правий елемент</button>
        
        <label class="form-label" style="margin-top: 12px;">Правильні пари (встановіть відповідність)</label>
        <div id="match-pairs-${qi}">
          ${(q.matchPairs || (q.matchLeft || []).map((_, idx) => ({ left: idx, right: idx }))).map((pair, idx) => `
            <div class="option-row">
              <span>${escapeHtml((q.matchLeft || [])[pair.left] || `Лівий ${pair.left + 1}`)} →</span>
              <select onchange="updateMatchPair(${qi}, ${idx}, this.value)">
                <option value="">-- Оберіть --</option>
                ${(q.matchRight || q.options || []).map((_, rightIdx) => `
                  <option value="${rightIdx}" ${pair.right === rightIdx ? 'selected' : ''}>${escapeHtml((q.matchRight || q.options)[rightIdx])}</option>
                `).join('')}
              </select>
            </div>
          `).join('')}
        </div>
      `;
    
    case 'likert':
      return `
        <label class="form-label">Шкала (1-${q.likertScale || 5})</label>
        <input class="form-input" type="range" min="2" max="10" value="${q.likertScale || 5}" oninput="updateQuestionField(${qi}, 'likertScale', parseInt(this.value)); document.getElementById('scale-value-${qi}').textContent = this.value" style="width: 200px;" />
        <span id="scale-value-${qi}">${q.likertScale || 5}</span>
        
        <label class="form-label" style="margin-top: 12px;">Твердження</label>
        <div id="likert-statements-${qi}">
          ${(q.likertStatements || ['Твердження 1']).map((stmt, idx) => `
            <div class="option-row">
              <input class="option-input" type="text" placeholder="Твердження ${idx + 1}" value="${escapeAttr(stmt)}" oninput="updateLikertStatement(${qi}, ${idx}, this.value)" />
              <button class="option-remove" onclick="removeLikertStatement(${qi}, ${idx})"><i class="fas fa-times"></i></button>
            </div>
          `).join('')}
        </div>
        <button class="btn btn-ghost btn-sm" onclick="addLikertStatement(${qi})"><i class="fas fa-plus"></i> Додати твердження</button>
      `;
    
    default:
      return '';
  }
}

window.updateQuestionText = (qi, val) => { editorQuestions[qi].text = val; };
window.updateQuestionType = (qi, type) => { 
  editorQuestions[qi].type = type;
  if (type === 'single') editorQuestions[qi].correct = 0;
  else if (type === 'multiple') editorQuestions[qi].correct = [];
  else if (type === 'truefalse') editorQuestions[qi].correct = true;
  else if (type === 'order') editorQuestions[qi].correct = editorQuestions[qi].options;
  renderQuestionsEditor();
};
window.updateQuestionPoints = (qi, points) => { editorQuestions[qi].points = parseInt(points) || 1; };
window.updateQuestionRequired = (qi, required) => { editorQuestions[qi].required = required; };
window.updateQuestionField = (qi, field, val) => { editorQuestions[qi][field] = val; if (field === 'formula') renderQuestionsEditor(); };
window.updateOption = (qi, oi, val) => { editorQuestions[qi].options[oi] = val; };
window.addOption = (qi) => { editorQuestions[qi].options.push(''); renderQuestionsEditor(); };
window.removeOption = (qi, oi) => { editorQuestions[qi].options.splice(oi, 1); renderQuestionsEditor(); };
window.setCorrect = (qi, oi) => {
  const q = editorQuestions[qi];
  if (q.type === 'single') q.correct = oi;
  else if (q.type === 'multiple') {
    if (!Array.isArray(q.correct)) q.correct = [];
    const idx = q.correct.indexOf(oi);
    if (idx === -1) q.correct.push(oi);
    else q.correct.splice(idx, 1);
  }
  renderQuestionsEditor();
};
window.setMediaTab = (qi, type) => {
  const q = editorQuestions[qi];
  q.image = type === 'image' ? (q.image || '') : '';
  q.video = type === 'video' ? (q.video || '') : '';
  q.formula = type === 'formula' ? (q.formula || '') : '';
  renderQuestionsEditor();
};
window.addQuestion = () => {
  editorQuestions.push(createEmptyQuestion());
  renderQuestionsEditor();
  setTimeout(() => {
    const lastCard = document.querySelector('.questions-list .question-card:last-child');
    if (lastCard) lastCard.scrollIntoView({ behavior: 'smooth' });
  }, 100);
};
window.removeQuestion = (qi) => { editorQuestions.splice(qi, 1); renderQuestionsEditor(); };
window.duplicateQuestion = (qi) => {
  const cloned = JSON.parse(JSON.stringify(editorQuestions[qi]));
  cloned.id = Date.now() + Math.random();
  editorQuestions.splice(qi + 1, 0, cloned);
  renderQuestionsEditor();
};
window.moveQuestionUp = (qi) => {
  if (qi > 0) {
    [editorQuestions[qi - 1], editorQuestions[qi]] = [editorQuestions[qi], editorQuestions[qi - 1]];
    renderQuestionsEditor();
  }
};
window.moveQuestionDown = (qi) => {
  if (qi < editorQuestions.length - 1) {
    [editorQuestions[qi], editorQuestions[qi + 1]] = [editorQuestions[qi + 1], editorQuestions[qi]];
    renderQuestionsEditor();
  }
};

window.updateMatchLeft = (qi, idx, val) => {
  if (!editorQuestions[qi].matchLeft) editorQuestions[qi].matchLeft = [];
  editorQuestions[qi].matchLeft[idx] = val;
};
window.addMatchLeft = (qi) => {
  if (!editorQuestions[qi].matchLeft) editorQuestions[qi].matchLeft = [];
  editorQuestions[qi].matchLeft.push(`Лівий ${editorQuestions[qi].matchLeft.length + 1}`);
  renderQuestionsEditor();
};
window.removeMatchLeft = (qi, idx) => {
  editorQuestions[qi].matchLeft.splice(idx, 1);
  renderQuestionsEditor();
};
window.updateMatchRight = (qi, idx, val) => {
  if (!editorQuestions[qi].matchRight) editorQuestions[qi].matchRight = [];
  editorQuestions[qi].matchRight[idx] = val;
};
window.addMatchRight = (qi) => {
  if (!editorQuestions[qi].matchRight) editorQuestions[qi].matchRight = [];
  editorQuestions[qi].matchRight.push(`Правий ${editorQuestions[qi].matchRight.length + 1}`);
  renderQuestionsEditor();
};
window.removeMatchRight = (qi, idx) => {
  editorQuestions[qi].matchRight.splice(idx, 1);
  renderQuestionsEditor();
};
window.updateMatchPair = (qi, pairIdx, rightVal) => {
  if (!editorQuestions[qi].matchPairs) editorQuestions[qi].matchPairs = [];
  if (!editorQuestions[qi].matchPairs[pairIdx]) editorQuestions[qi].matchPairs[pairIdx] = { left: pairIdx, right: null };
  editorQuestions[qi].matchPairs[pairIdx].right = parseInt(rightVal);
};

window.updateLikertStatement = (qi, idx, val) => {
  if (!editorQuestions[qi].likertStatements) editorQuestions[qi].likertStatements = [];
  editorQuestions[qi].likertStatements[idx] = val;
};
window.addLikertStatement = (qi) => {
  if (!editorQuestions[qi].likertStatements) editorQuestions[qi].likertStatements = [];
  editorQuestions[qi].likertStatements.push(`Твердження ${editorQuestions[qi].likertStatements.length + 1}`);
  renderQuestionsEditor();
};
window.removeLikertStatement = (qi, idx) => {
  editorQuestions[qi].likertStatements.splice(idx, 1);
  renderQuestionsEditor();
};

window.openFormulaEditor = (qi) => {
  const q = editorQuestions[qi];
  const modalHtml = `
    <div class="modal-overlay" id="formula-modal" onclick="closeModalOutside(event)">
      <div class="modal">
        <div class="modal-header">
          <h2 class="modal-title"><i class="fas fa-superscript"></i> Редактор формул</h2>
          <button class="modal-close" onclick="closeModal('formula-modal')"><i class="fas fa-times"></i></button>
        </div>
        <div class="formula-preview" id="formula-preview"></div>
        <div class="formula-buttons" id="formula-buttons"></div>
        <div class="form-group">
          <textarea class="form-input" id="formula-latex" rows="3" placeholder="Введіть LaTeX...">${escapeAttr(q.formula || '')}</textarea>
        </div>
        <div class="fe-actions" style="display: flex; gap: 8px; justify-content: flex-end; margin-top: 16px;">
          <button class="btn btn-ghost" onclick="closeModal('formula-modal')">Скасувати</button>
          <button class="btn btn-primary" onclick="saveFormulaToQuestion(${qi})">Вставити</button>
        </div>
      </div>
    </div>
  `;
  document.body.insertAdjacentHTML('beforeend', modalHtml);
  
  const btns = ['\\frac{}{}', '\\sqrt{}', '^{}', '_{}', '\\sum', '\\int', '\\alpha', '\\beta', '\\gamma', '\\pi', '\\infty', '\\leq', '\\geq', '\\neq', '\\times', '\\div', '\\cdot', '\\pm'];
  document.getElementById('formula-buttons').innerHTML = btns.map(b => `<button class="formula-btn" onclick="insertFormula('${b.replace(/\\/g, '\\\\')}')">${b}</button>`).join('');
  
  const preview = document.getElementById('formula-preview');
  const input = document.getElementById('formula-latex');
  input.oninput = () => {
    try {
      katex.render(input.value, preview, { throwOnError: false, displayMode: true });
    } catch(e) {
      preview.textContent = input.value;
    }
  };
  window.insertFormula = (latex) => {
    input.value += latex;
    input.oninput();
  };
  window.saveFormulaToQuestion = (qi) => {
    editorQuestions[qi].formula = document.getElementById('formula-latex').value;
    closeModal('formula-modal');
    renderQuestionsEditor();
  };
  input.oninput();
};

window.previewTest = () => {
  const testData = {
    title: document.getElementById('test-title')?.value.trim() || 'Попередній перегляд',
    description: document.getElementById('test-desc')?.value || '',
    questions: editorQuestions,
    time_limit: parseInt(document.getElementById('test-time-limit')?.value) || 0,
    max_attempts: parseInt(document.getElementById('setting-max-attempts')?.value) || 1,
    shuffle_questions: false,
    shuffle_options: false,
    show_results: true,
    passing_score: parseInt(document.getElementById('setting-passing-score')?.value) || 50,
    id: 'preview'
  };
  
  startTest(testData, null, 'Перегляд');
};

async function saveTest() {
  const title = document.getElementById('test-title')?.value.trim();
  if (!title) { showToast('Введіть назву тесту', 'error'); return; }
  
  for (let i = 0; i < editorQuestions.length; i++) {
    const q = editorQuestions[i];
    if (!q.text.trim()) { showToast(`Введіть текст питання ${i + 1}`, 'error'); return; }
    
    if (q.type === 'single' || q.type === 'multiple' || q.type === 'dropdown') {
      for (let j = 0; j < q.options.length; j++) {
        if (!q.options[j].trim()) { showToast(`Заповніть варіант ${j + 1} у питанні ${i + 1}`, 'error'); return; }
      }
    }
  }
  
  const testData = {
    title,
    description: document.getElementById('test-desc')?.value || '',
    questions: editorQuestions,
    time_limit: parseInt(document.getElementById('test-time-limit')?.value) || 0,
    max_attempts: parseInt(document.getElementById('setting-max-attempts')?.value) || 1,
    shuffle_questions: document.getElementById('setting-shuffle-questions')?.checked || false,
    shuffle_options: document.getElementById('setting-shuffle-options')?.checked || false,
    show_results: document.getElementById('setting-show-results')?.checked !== false,
    passing_score: parseInt(document.getElementById('setting-passing-score')?.value) || 50
  };
  
  if (editorTestId) {
    const { error } = await db.from('tests').update(testData).eq('id', editorTestId).eq('teacher_id', currentUser.id);
    if (error) { showToast('Помилка: ' + error.message, 'error'); return; }
    showToast('Тест оновлено!', 'success');
    navigate(`/u/${currentUser.id}`);
  } else {
    let code; let unique = false;
    while (!unique) {
      code = generateCode();
      const { data } = await db.from('tests').select('id').eq('code', code).single();
      if (!data) unique = true;
    }
    const { error } = await db.from('tests').insert({ ...testData, code, teacher_id: currentUser.id, is_active: true });
    if (error) { showToast('Помилка: ' + error.message, 'error'); return; }
    showToast(`Тест створено! Код: ${code}`, 'success');
    navigate(`/u/${currentUser.id}`);
  }
}

let bankQuestions = [];

async function renderQuestionBank() {
  renderLayout(`<div class="page-wide"><div class="loading-spinner" style="margin:0 auto"></div></div>`);
  
  const savedBank = localStorage.getItem('altclass_question_bank');
  if (savedBank) bankQuestions = JSON.parse(savedBank);
  
  renderLayout(`
    <div class="page-wide">
      <div class="editor-topbar">
        <button class="btn btn-ghost btn-sm" onclick="navigate('/')"><i class="fas fa-arrow-left"></i> Назад</button>
        <h1 class="editor-page-title"><i class="fas fa-database"></i> Банк питань</h1>
        <button class="btn btn-outline btn-sm" onclick="exportBank()"><i class="fas fa-download"></i> Експорт</button>
      </div>
      
      <div class="form-group">
        <input class="form-input" type="text" id="bank-search" placeholder="Пошук питань..." oninput="filterBank()" />
      </div>
      
      <div class="section-header">
        <h2 class="section-title">Мої питання (${bankQuestions.length})</h2>
        <button class="btn btn-primary btn-sm" onclick="importBankFromJSON()"><i class="fas fa-upload"></i> Імпорт JSON</button>
      </div>
      
      <div id="bank-list" class="bank-list">
        ${bankQuestions.length === 0 ? '<div class="empty-state"><i class="fas fa-database"></i><h3>Банк порожній</h3><p>Додавайте питання з редактора тестів</p></div>' : ''}
        ${bankQuestions.map((q, idx) => `
          <div class="question-bank-item" data-text="${escapeAttr(q.text.toLowerCase())}">
            <div style="display: flex; justify-content: space-between; align-items: center;">
              <div>
                <span class="question-num"><i class="fas ${QUESTION_TYPES.find(t => t.value === q.type)?.icon || 'fa-question'}"></i> ${QUESTION_TYPES.find(t => t.value === q.type)?.label || q.type}</span>
                <strong>${escapeHtml(q.text.substring(0, 100))}${q.text.length > 100 ? '...' : ''}</strong>
              </div>
              <div>
                <button class="icon-btn btn-sm" onclick="useBankQuestion(${idx})" title="Використати"><i class="fas fa-plus-circle"></i></button>
                <button class="icon-btn btn-sm" onclick="deleteBankQuestion(${idx})" title="Видалити"><i class="fas fa-trash"></i></button>
              </div>
            </div>
            <div class="meta-tag" style="margin-top: 8px;">${q.points || 1} бал(ів)</div>
          </div>
        `).join('')}
      </div>
    </div>
  `);
}

window.filterBank = () => {
  const search = document.getElementById('bank-search')?.value.toLowerCase() || '';
  const items = document.querySelectorAll('.question-bank-item');
  items.forEach(item => {
    const text = item.dataset.text || '';
    item.style.display = text.includes(search) ? '' : 'none';
  });
};

window.addToBank = (qi) => {
  const question = JSON.parse(JSON.stringify(editorQuestions[qi]));
  delete question.id;
  bankQuestions.push(question);
  localStorage.setItem('altclass_question_bank', JSON.stringify(bankQuestions));
  showToast('Питання додано до банку', 'success');
};

window.useBankQuestion = (idx) => {
  const question = JSON.parse(JSON.stringify(bankQuestions[idx]));
  question.id = Date.now() + Math.random();
  editorQuestions.push(question);
  renderQuestionsEditor();
  showToast('Питання додано до тесту', 'success');
  closeModal('bank-modal');
};

window.deleteBankQuestion = (idx) => {
  bankQuestions.splice(idx, 1);
  localStorage.setItem('altclass_question_bank', JSON.stringify(bankQuestions));
  renderQuestionBank();
  showToast('Питання видалено', 'success');
};

window.exportBank = () => {
  const dataStr = JSON.stringify(bankQuestions, null, 2);
  const blob = new Blob([dataStr], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `altclass_question_bank_${new Date().toISOString().slice(0, 19)}.json`;
  a.click();
  URL.revokeObjectURL(url);
  showToast('Банк експортовано', 'success');
};

window.importBankFromJSON = () => {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = '.json';
  input.onchange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const text = await file.text();
    try {
      const imported = JSON.parse(text);
      if (Array.isArray(imported)) {
        bankQuestions.push(...imported);
        localStorage.setItem('altclass_question_bank', JSON.stringify(bankQuestions));
        renderQuestionBank();
        showToast(`Імпортовано ${imported.length} питань`, 'success');
      } else {
        showToast('Невірний формат файлу', 'error');
      }
    } catch(err) {
      showToast('Помилка парсингу JSON', 'error');
    }
  };
  input.click();
};

window.importQuestions = () => {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = '.json,.csv';
  input.onchange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const text = await file.text();
    if (file.name.endsWith('.csv')) {
      importQuestionsFromCSV(text);
    } else {
      try {
        const imported = JSON.parse(text);
        if (Array.isArray(imported)) {
          editorQuestions.push(...imported);
          renderQuestionsEditor();
          showToast(`Імпортовано ${imported.length} питань`, 'success');
        } else {
          showToast('Невірний формат JSON', 'error');
        }
      } catch(err) {
        showToast('Помилка парсингу', 'error');
      }
    }
  };
  input.click();
};

function importQuestionsFromCSV(csvText) {
  const lines = csvText.split('\n');
  const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
  const imported = [];
  
  for (let i = 1; i < lines.length; i++) {
    if (!lines[i].trim()) continue;
    const values = parseCSVLine(lines[i]);
    const q = createEmptyQuestion();
    
    q.text = values[headers.indexOf('text')] || values[0] || '';
    q.type = values[headers.indexOf('type')] || 'single';
    q.points = parseInt(values[headers.indexOf('points')]) || 1;
    
    const optionsStr = values[headers.indexOf('options')] || '';
    q.options = optionsStr.split(';').filter(o => o.trim());
    if (q.options.length < 2) q.options = ['', ''];
    
    const correctStr = values[headers.indexOf('correct')] || '';
    if (q.type === 'single') q.correct = parseInt(correctStr) || 0;
    else if (q.type === 'multiple') q.correct = correctStr.split(';').map(Number);
    else q.correct = correctStr;
    
    imported.push(q);
  }
  
  if (imported.length) {
    editorQuestions.push(...imported);
    renderQuestionsEditor();
    showToast(`Імпортовано ${imported.length} питань з CSV`, 'success');
  }
}

function parseCSVLine(line) {
  const result = [];
  let inQuotes = false;
  let current = '';
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      result.push(current);
      current = '';
    } else {
      current += char;
    }
  }
  result.push(current);
  return result;
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
  
  const { data: results } = await db.from('test_results').select('*, tests(title)').in('test_id', allTests.map(t => t.id));
  const totalSubmissions = results?.length || 0;
  const avgScore = results?.length ? Math.round(results.reduce((sum, r) => sum + (r.percentage || 0), 0) / results.length) : 0;
  
  const testsHtml = allTests.length === 0
    ? `<div class="empty-state"><div class="empty-state-icon"><i class="fas fa-folder-open"></i></div><h3>Тестів ще немає</h3><p>Створіть перший тест для своїх учнів</p>${isOwn ? `<button class="btn btn-primary" onclick="openCreateTest()"><i class="fas fa-plus"></i> Новий тест</button>` : ''}</div>`
    : `<div class="card-list">${allTests.map(t => renderTeacherTestCard(t, isOwn)).join('')}</div>`;
  
  renderLayout(`
    <div class="page-wide">
      <div class="profile-header">
        <div class="profile-avatar">${profile.avatar_url ? `<img src="${profile.avatar_url}" alt="" />` : (profile.name?.[0] || '?').toUpperCase()}</div>
        <div class="profile-info">
          <h1>${escapeHtml(profile.name || 'Без імені')}</h1>
          <p><i class="fas fa-envelope"></i> ${escapeHtml(profile.email)}</p>
          <span class="role-badge teacher"><i class="fas fa-chalkboard-teacher"></i> Вчитель</span>
        </div>
      </div>
      
      <div class="stats-row">
        <div class="stat-card"><span class="stat-num">${allTests.length}</span><span class="stat-label"><i class="fas fa-list"></i> Тестів</span></div>
        <div class="stat-card"><span class="stat-num">${allTests.filter(t => t.is_active && !isTestExpired(t.created_at)).length}</span><span class="stat-label"><i class="fas fa-check-circle"></i> Активних</span></div>
        <div class="stat-card"><span class="stat-num">${totalSubmissions}</span><span class="stat-label"><i class="fas fa-users"></i> Всього спроб</span></div>
        <div class="stat-card"><span class="stat-num">${avgScore}%</span><span class="stat-label"><i class="fas fa-chart-line"></i> Сер. бал</span></div>
      </div>
      
      <div class="section-header">
        <h2 class="section-title"><i class="fas fa-tasks"></i> Мої тести</h2>
        <div>
          ${isOwn ? `<button class="btn btn-primary btn-sm" onclick="openCreateTest()"><i class="fas fa-plus"></i> Новий тест</button>` : ''}
        </div>
      </div>
      ${testsHtml}
      
      ${isOwn ? `<div style="margin-top: 32px; text-align: center"><button class="btn btn-ghost btn-sm" onclick="handleLogout()"><i class="fas fa-sign-out-alt"></i> Вийти</button></div>` : ''}
    </div>
  `);
}

function renderTeacherTestCard(test, isOwn) {
  const expired = isTestExpired(test.created_at);
  const status = !test.is_active ? 'inactive' : expired ? 'expired' : 'active';
  const statusLabel = status === 'active' ? 'Активний' : status === 'expired' ? 'Завершено' : 'Деактивовано';
  
  return `
    <div class="test-card">
      <div class="test-card-header">
        <div class="test-card-info">
          <h3>${escapeHtml(test.title)}</h3>
          <div class="test-card-meta">
            <span class="meta-tag"><span class="status-dot ${status}"></span> ${statusLabel}</span>
            <span class="meta-tag"><i class="fas fa-question-circle"></i> ${test.questions?.length || 0} питань</span>
            <span class="meta-tag"><i class="fas fa-calendar-week"></i> До ${expiryDate(test.created_at)}</span>
            <span class="meta-tag"><i class="fas fa-redo-alt"></i> Спроб: ${test.max_attempts || 1}</span>
          </div>
        </div>
        <div class="test-card-actions">
          <span class="code-chip" onclick="copyCode('${test.code}')"><i class="fas fa-link"></i> ${test.code}</span>
          ${isOwn ? `
            <button class="btn btn-sm btn-outline" onclick="exportResults('${test.id}', '${escapeAttr(test.title)}')" title="Експорт результатів"><i class="fas fa-download"></i></button>
            <button class="btn btn-sm btn-outline" onclick="openEditTest('${test.id}')"><i class="fas fa-edit"></i></button>
            <button class="btn btn-sm ${test.is_active ? 'btn-ghost' : 'btn-success'}" onclick="toggleTestActive('${test.id}', ${test.is_active})"><i class="fas ${test.is_active ? 'fa-ban' : 'fa-check'}"></i></button>
            <button class="btn btn-sm btn-danger" onclick="confirmDeleteTest('${test.id}', '${escapeAttr(test.title)}')"><i class="fas fa-trash"></i></button>
          ` : ''}
        </div>
      </div>
    </div>
  `;
}

async function renderStudentProfile(profile) {
  const isOwn = currentUser?.id === profile.id;
  const { data: results } = await db.from('test_results').select('*').eq('student_id', profile.id).order('completed_at', { ascending: false });
  const allResults = results || [];
  const avgScore = allResults.length ? Math.round(allResults.reduce((sum, r) => sum + (r.percentage || 0), 0) / allResults.length) : 0;
  
  const resultsHtml = allResults.length === 0
    ? `<div class="empty-state"><div class="empty-state-icon"><i class="fas fa-graduation-cap"></i></div><h3>Тестів ще не пройдено</h3><p>Введіть код тесту на головній сторінці</p></div>`
    : `<div class="card-list">${allResults.map(r => {
        const cls = getScoreClass(r.score, r.total);
        const grade = scoreToGrade(r.score, r.total);
        return `<div class="history-card" onclick="viewResultDetails('${r.id}')" style="cursor: pointer;">
          <div class="history-info">
            <h4>${escapeHtml(r.test_title || 'Тест')}</h4>
            <p><i class="fas fa-calendar-alt"></i> ${formatDate(r.completed_at)}</p>
          </div>
          <div><span class="score-badge ${cls}">${r.score}/${r.total} (${r.percentage}%) → ${grade}/12</span></div>
        </div>`;
      }).join('')}</div>`;
  
  renderLayout(`
    <div class="page">
      <div class="profile-header">
        <div class="profile-avatar">${profile.avatar_url ? `<img src="${profile.avatar_url}" alt="" />` : (profile.name?.[0] || '?').toUpperCase()}</div>
        <div class="profile-info">
          <h1>${escapeHtml(profile.name || 'Без імені')}</h1>
          <p><i class="fas fa-envelope"></i> ${escapeHtml(profile.email)}</p>
          <span class="role-badge student"><i class="fas fa-user-graduate"></i> Учень</span>
        </div>
      </div>
      
      ${allResults.length > 0 ? `
        <div class="stats-row">
          <div class="stat-card"><span class="stat-num">${allResults.length}</span><span class="stat-label">Пройдено</span></div>
          <div class="stat-card"><span class="stat-num">${avgScore}%</span><span class="stat-label">Середній бал</span></div>
          <div class="stat-card"><span class="stat-num">${allResults.filter(r => (r.score/r.total) >= 0.8).length}</span><span class="stat-label">Відмінно</span></div>
        </div>
      ` : ''}
      
      <div class="section-header">
        <h2 class="section-title"><i class="fas fa-history"></i> Історія тестів</h2>
      </div>
      ${resultsHtml}
      
      ${isOwn ? `<div style="margin-top: 32px; text-align: center"><button class="btn btn-ghost btn-sm" onclick="handleLogout()"><i class="fas fa-sign-out-alt"></i> Вийти</button></div>` : ''}
    </div>
  `);
}

window.viewResultDetails = async (resultId) => {
  const { data: result } = await db.from('test_results').select('*').eq('id', resultId).single();
  if (!result) return;
  
  let detailsHtml = '';
  if (result.results) {
    detailsHtml = `
      <div style="margin-top: 16px; text-align: left;">
        <h3 style="margin-bottom: 12px;">Детальні результати:</h3>
        ${result.results.map((r, idx) => `
          <div class="question-card" style="margin-bottom: 12px;">
            <div style="display: flex; justify-content: space-between;">
              <strong>${idx + 1}. ${escapeHtml(r.questionText)}</strong>
              <span class="score-badge ${r.isCorrect ? 'high' : 'low'}">${r.pointsEarned}/${r.maxPoints}</span>
            </div>
            <div style="font-size: 0.85rem; margin-top: 8px;">
              <div><i class="fas fa-user-edit"></i> Ваша відповідь: ${escapeHtml(JSON.stringify(r.userAnswer))}</div>
              ${!r.isCorrect && r.correctAnswer ? `<div><i class="fas fa-check-circle" style="color: var(--green);"></i> Правильно: ${escapeHtml(JSON.stringify(r.correctAnswer))}</div>` : ''}
              ${r.feedback ? `<div><i class="fas fa-info-circle"></i> ${escapeHtml(r.feedback)}</div>` : ''}
            </div>
          </div>
        `).join('')}
      </div>
    `;
  }
  
  document.body.insertAdjacentHTML('beforeend', `
    <div class="modal-overlay" id="result-modal" onclick="closeModalOutside(event)">
      <div class="modal" style="max-width: 700px;">
        <div class="modal-header">
          <h2 class="modal-title"><i class="fas fa-chart-bar"></i> Результат тесту</h2>
          <button class="modal-close" onclick="closeModal('result-modal')"><i class="fas fa-times"></i></button>
        </div>
        <div style="text-align: center;">
          <div class="result-circle ${getScoreClass(result.score, result.total)}" style="margin: 0 auto 16px; width: 100px; height: 100px;">
            <span class="result-score-num">${result.score}</span>
            <span class="result-score-denom">/${result.total}</span>
          </div>
          <h3>${escapeHtml(result.test_title)}</h3>
          <p>Оцінка: ${result.grade}/12 (${result.percentage}%)</p>
          <p>${result.passed ? '✅ Тест складено' : '❌ Тест не складено'}</p>
          ${detailsHtml}
        </div>
        <div style="display: flex; gap: 8px; justify-content: flex-end; margin-top: 20px;">
          <button class="btn btn-primary" onclick="closeModal('result-modal')">Закрити</button>
        </div>
      </div>
    </div>
  `);
};

window.exportResults = async (testId, testTitle) => {
  showToast('Експорт результатів...', 'info');
  
  const { data: results } = await db.from('test_results').select('*').eq('test_id', testId);
  if (!results || results.length === 0) {
    showToast('Немає результатів для експорту', 'error');
    return;
  }
  
  const worksheet = [];
  worksheet.push(['№', 'Учень', 'Дата', 'Бали', 'Макс.', '%', 'Оцінка', 'Складено', 'Час (сек)']);
  
  results.forEach((r, idx) => {
    worksheet.push([
      idx + 1,
      r.student_name,
      new Date(r.completed_at).toLocaleString('uk-UA'),
      r.score,
      r.total,
      r.percentage,
      r.grade,
      r.passed ? 'Так' : 'Ні',
      r.time_spent || ''
    ]);
  });
  
  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.aoa_to_sheet(worksheet);
  XLSX.utils.book_append_sheet(wb, ws, 'Результати');
  XLSX.writeFile(wb, `results_${testTitle}_${new Date().toISOString().slice(0, 19)}.xlsx`);
  showToast('Експорт завершено', 'success');
};

function renderAlreadyPassed(test) {
  renderLayout(`
    <div class="page" style="display:flex;align-items:center;justify-content:center;min-height:80vh">
      <div class="test-confirm-card">
        <div class="result-circle high" style="margin:0 auto 20px"><i class="fas fa-check-circle" style="font-size:3rem"></i></div>
        <h2 class="test-confirm-title">Ви вже проходили цей тест</h2>
        <p>Результат вже збережено у вашому кабінеті</p>
        <button class="btn btn-primary" onclick="navigate('/u/${currentUser.id}')"><i class="fas fa-user"></i> До кабінету</button>
      </div>
    </div>
  `);
}

function renderBlockedTest(message) {
  renderLayout(`<div class="not-found"><div style="font-size:2.5rem;margin-bottom:14px"><i class="fas fa-lock"></i></div><h2>Тест недоступний</h2><p>${escapeHtml(message)}</p><button class="btn btn-primary" onclick="navigate('/')"><i class="fas fa-home"></i> На головну</button></div>`);
}

function renderNotFound() {
  renderLayout(`<div class="not-found"><div class="not-found-code">404</div><h2><i class="fas fa-search"></i> Сторінку не знайдено</h2><button class="btn btn-primary" onclick="navigate('/')"><i class="fas fa-home"></i> На головну</button></div>`);
}

async function toggleTestActive(testId, currentActive) {
  const { error } = await db.from('tests').update({ is_active: !currentActive }).eq('id', testId);
  if (error) { showToast('Помилка оновлення', 'error'); return; }
  showToast(currentActive ? 'Тест деактивовано' : 'Тест активовано', 'success');
  navigate(`/u/${currentUser.id}`);
}

function confirmDeleteTest(testId, testTitle) {
  document.body.insertAdjacentHTML('beforeend', `
    <div class="modal-overlay" id="confirm-modal" onclick="closeModalOutside(event)">
      <div class="modal">
        <div class="modal-header">
          <h2 class="modal-title"><i class="fas fa-trash-alt"></i> Видалити тест?</h2>
          <button class="modal-close" onclick="closeModal('confirm-modal')"><i class="fas fa-times"></i></button>
        </div>
        <p>Видалити тест <strong>${escapeHtml(testTitle)}</strong>? Всі результати будуть видалені. Це незворотньо.</p>
        <div style="display: flex; gap: 12px; justify-content: flex-end; margin-top: 20px;">
          <button class="btn btn-ghost" onclick="closeModal('confirm-modal')"><i class="fas fa-times"></i> Скасувати</button>
          <button class="btn btn-danger" onclick="deleteTest('${testId}')"><i class="fas fa-trash"></i> Так, видалити</button>
        </div>
      </div>
    </div>
  `);
}

async function deleteTest(testId) {
  await db.from('test_results').delete().eq('test_id', testId);
  await db.from('active_sessions').delete().eq('test_id', testId);
  const { error } = await db.from('tests').delete().eq('id', testId).eq('teacher_id', currentUser.id);
  if (error) { showToast('Помилка: ' + error.message, 'error'); return; }
  showToast('Тест видалено', 'success');
  closeModal('confirm-modal');
  navigate(`/u/${currentUser.id}`);
}

function closeModal(id) { document.getElementById(id)?.remove(); }
window.closeModalOutside = function(e) { if (e.target.classList.contains('modal-overlay')) e.target.remove(); };

function copyCode(code) { 
  navigator.clipboard.writeText(`${window.location.origin}/${code}`)
    .then(() => showToast('Посилання скопійовано!', 'success'))
    .catch(() => showToast(`Код: ${code}`, 'info'));
}

function openCreateTest() { navigate('/create'); }
function openEditTest(testId) { navigate('/edit/' + testId); }

function openTutorial() {
  document.body.insertAdjacentHTML('beforeend', `
    <div class="modal-overlay" id="tutorial-modal" onclick="closeModalOutside(event)">
      <div class="modal">
        <div class="modal-header">
          <h2 class="modal-title"><i class="fas fa-book-open"></i> Інструкція</h2>
          <button class="modal-close" onclick="closeModal('tutorial-modal')"><i class="fas fa-times"></i></button>
        </div>
        <div>
          <h3><i class="fas fa-plus-circle"></i> Створення тесту</h3>
          <p>• Додайте назву та опис<br>• Налаштуйте час і кількість спроб<br>• Додавайте питання 11 різних типів</p>
          <h3><i class="fas fa-code"></i> Типи питань</h3>
          <p>• Одиничний вибір, множинний вибір, текстова відповідь, числова, Так/Ні<br>• Випадаючий список, впорядкування, відповідність, шкала Лайкерта, дата, файл</p>
          <h3><i class="fas fa-chart-line"></i> Для вчителів</h3>
          <p>• Банк питань для повторного використання<br>• Експорт результатів у Excel<br>• Детальний перегляд відповідей учнів</p>
        </div>
        <div style="margin-top: 20px;"><button class="btn btn-primary btn-full" onclick="closeModal('tutorial-modal')">Зрозуміло</button></div>
      </div>
    </div>
  `);
}

function openSettings() {
  document.body.insertAdjacentHTML('beforeend', `
    <div class="modal-overlay" id="settings-modal" onclick="closeModalOutside(event)">
      <div class="modal">
        <div class="modal-header">
          <h2 class="modal-title"><i class="fas fa-cog"></i> Налаштування</h2>
          <button class="modal-close" onclick="closeModal('settings-modal')"><i class="fas fa-times"></i></button>
        </div>
        <div>
          <div class="form-group"><label class="form-label"><i class="fas fa-user"></i> Ім'я</label><input class="form-input" type="text" id="settings-name" value="${escapeAttr(currentProfile?.name || '')}" /></div>
          <div class="form-group"><label class="form-label"><i class="fas fa-image"></i> Аватар URL</label><input class="form-input" type="url" id="settings-avatar" value="${escapeAttr(currentProfile?.avatar_url || '')}" placeholder="https://..." /></div>
          <div class="form-group"><label class="form-label"><i class="fas fa-palette"></i> Тема</label>
            <div class="theme-selector">
              <button class="theme-btn ${currentTheme === 'light' ? 'active' : ''}" onclick="setTheme('light')"><i class="fas fa-sun"></i> Світла</button>
              <button class="theme-btn ${currentTheme === 'dark' ? 'active' : ''}" onclick="setTheme('dark')"><i class="fas fa-moon"></i> Темна</button>
              <button class="theme-btn ${currentTheme === 'system' ? 'active' : ''}" onclick="setTheme('system')"><i class="fas fa-desktop"></i> Системна</button>
            </div>
          </div>
        </div>
        <div style="display: flex; gap: 8px; justify-content: flex-end; margin-top: 20px;">
          <button class="btn btn-ghost" onclick="closeModal('settings-modal')">Скасувати</button>
          <button class="btn btn-primary" onclick="saveSettings()">Зберегти</button>
        </div>
        <div style="margin-top: 16px; text-align: right"><button class="btn btn-ghost btn-sm" onclick="handleLogout();closeModal('settings-modal')" style="color: var(--red)"><i class="fas fa-sign-out-alt"></i> Вийти</button></div>
      </div>
    </div>
  `);
}

window.setTheme = function(theme) { 
  applyTheme(theme); 
  localStorage.setItem('altclass_theme', theme);
  document.querySelectorAll('.theme-btn').forEach(btn => btn.classList.remove('active'));
  if (event && event.target) event.target.classList.add('active');
};

async function saveSettings() {
  const name = document.getElementById('settings-name')?.value.trim();
  const avatarUrl = document.getElementById('settings-avatar')?.value.trim() || null;
  if (!name) { showToast('Введіть ім\'я', 'error'); return; }
  const { error } = await db.from('profiles').update({ name, avatar_url: avatarUrl }).eq('id', currentUser.id);
  if (error) { showToast('Помилка: ' + error.message, 'error'); return; }
  currentProfile.name = name;
  currentProfile.avatar_url = avatarUrl;
  showToast('Збережено', 'success');
  closeModal('settings-modal');
  navigate(`/u/${currentUser.id}`);
}

window.navigate = navigate;
window.handleLogout = handleLogout;
window.switchAuthTab = switchAuthTab;
window.handleLogin = handleLogin;
window.handleRegister = handleRegister;
window.handleGoogleLogin = handleGoogleLogin;
window.openCreateTest = openCreateTest;
window.openEditTest = openEditTest;
window.toggleTestActive = toggleTestActive;
window.confirmDeleteTest = confirmDeleteTest;
window.copyCode = copyCode;
window.closeModal = closeModal;
window.handleCodeInput = handleCodeInput;
window.handleCodeSubmit = handleCodeSubmit;
window.openSettings = openSettings;
window.openTutorial = openTutorial;
window.exportResults = exportResults;
window.viewResultDetails = viewResultDetails;

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
        currentUser = null;
        currentProfile = null;
        navigate('/');
      }
    });
    return;
  }
  
  const { data: { session } } = await db.auth.getSession();
  if (session?.user) {
    currentUser = session.user;
    await ensureProfile(session.user);
  }
  
  document.getElementById('loading-screen')?.remove();
  
  db.auth.onAuthStateChange(async (event, session) => {
    if (event === 'SIGNED_IN' && session?.user) {
      currentUser = session.user;
      await ensureProfile(session.user);
      navigate('/');
    } else if (event === 'SIGNED_OUT') {
      currentUser = null;
      currentProfile = null;
      navigate('/');
    }
  });
  
  if (window.location.pathname === '/auth') {
    renderAuth();
    return;
  }
  router();
}

init();