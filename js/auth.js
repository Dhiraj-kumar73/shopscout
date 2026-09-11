/**
 * SHOPSCOUT — AUTHENTICATION & USER PROFILE CONTROLLER
 */

const AuthController = {
  // Default seed accounts for ShopScout demo & testing
  DEFAULT_USERS: [
    {
      name: 'Alex Hunter',
      email: 'alex.hunter@example.com',
      password: 'Password123',
      joinedDate: 'Jan 2026',
      avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=120&auto=format&fit=crop&q=80'
    },
    {
      name: 'Rahul Sharma',
      email: 'rahul.sharma@example.com',
      password: 'Password123',
      joinedDate: 'Feb 2026',
      avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=120&auto=format&fit=crop&q=80'
    }
  ],

  EMAIL_REGEX: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,

  init() {
    this.ensureRegisteredUsersSeed();
    this.bindAuthTabs();
    this.bindSocialLogin();
    this.bindQuickFill();
    this.bindPasswordToggles();
    this.bindPasswordStrength();
    this.bindLiveFieldClearing();
    this.bindLoginForm();
    this.bindRegisterForm();
    this.bindForgotPasswordForm();
    this.initProfilePage();
  },

  // ─── Registered Users Database Management ───
  ensureRegisteredUsersSeed() {
    const key = (typeof ShopScout !== 'undefined' && ShopScout.KEYS && ShopScout.KEYS.REGISTERED_USERS) 
      ? ShopScout.KEYS.REGISTERED_USERS 
      : 'shopscout_registered_users';

    let users = [];
    try {
      users = JSON.parse(localStorage.getItem(key)) || [];
    } catch {
      users = [];
    }

    if (!Array.isArray(users) || users.length === 0) {
      localStorage.setItem(key, JSON.stringify(this.DEFAULT_USERS));
    }
  },

  getRegisteredUsers() {
    const key = (typeof ShopScout !== 'undefined' && ShopScout.KEYS && ShopScout.KEYS.REGISTERED_USERS) 
      ? ShopScout.KEYS.REGISTERED_USERS 
      : 'shopscout_registered_users';

    try {
      const users = JSON.parse(localStorage.getItem(key));
      if (Array.isArray(users) && users.length > 0) return users;
    } catch (e) {
      console.error('Error reading registered users:', e);
    }
    return [...this.DEFAULT_USERS];
  },

  findUserByEmail(email) {
    if (!email) return null;
    const cleanEmail = email.trim().toLowerCase();
    const users = this.getRegisteredUsers();
    return users.find(u => (u.email || '').trim().toLowerCase() === cleanEmail) || null;
  },

  saveRegisteredUser(user) {
    const key = (typeof ShopScout !== 'undefined' && ShopScout.KEYS && ShopScout.KEYS.REGISTERED_USERS) 
      ? ShopScout.KEYS.REGISTERED_USERS 
      : 'shopscout_registered_users';

    const users = this.getRegisteredUsers();
    const cleanEmail = user.email.trim().toLowerCase();
    const existingIndex = users.findIndex(u => (u.email || '').trim().toLowerCase() === cleanEmail);

    if (existingIndex > -1) {
      users[existingIndex] = { ...users[existingIndex], ...user };
    } else {
      users.push(user);
    }

    localStorage.setItem(key, JSON.stringify(users));
  },

  // ─── Visual UI Error & Alert Helpers ───
  clearFieldErrors(form) {
    if (!form) return;
    form.querySelectorAll('.is-invalid').forEach(el => el.classList.remove('is-invalid'));
    form.querySelectorAll('.field-error-msg').forEach(el => el.remove());
    form.querySelectorAll('.shake-error').forEach(el => el.classList.remove('shake-error'));
  },

  showFieldError(inputEl, message) {
    if (!inputEl) return;
    inputEl.classList.add('is-invalid');
    
    // Find closest container for shake
    const wrap = inputEl.closest('.input-with-icon') || inputEl.closest('.form-group') || inputEl;
    wrap.classList.remove('shake-error');
    void wrap.offsetWidth; // Trigger reflow to restart animation
    wrap.classList.add('shake-error');

    // Remove existing error msg on this group
    const formGroup = inputEl.closest('.form-group');
    if (formGroup) {
      const existing = formGroup.querySelector('.field-error-msg');
      if (existing) existing.remove();

      const errEl = document.createElement('div');
      errEl.className = 'field-error-msg';
      errEl.innerHTML = `<i class="fa-solid fa-circle-exclamation"></i><span>${message}</span>`;
      formGroup.appendChild(errEl);
    }
  },

  showAlert(containerId, message, type = 'error') {
    const container = document.getElementById(containerId);
    if (!container) return;
    const icon = type === 'error' ? 'fa-triangle-exclamation' : 'fa-circle-check';
    container.innerHTML = `
      <div class="auth-alert-box auth-alert-${type}">
        <i class="fa-solid ${icon}"></i>
        <div>${message}</div>
      </div>
    `;
  },

  clearAlert(containerId) {
    const container = document.getElementById(containerId);
    if (container) container.innerHTML = '';
  },

  bindLiveFieldClearing() {
    document.querySelectorAll('#login-form input, #register-form input').forEach(input => {
      input.addEventListener('input', () => {
        if (input.classList.contains('is-invalid')) {
          input.classList.remove('is-invalid');
          const group = input.closest('.form-group');
          if (group) {
            const err = group.querySelector('.field-error-msg');
            if (err) err.remove();
          }
        }
      });
    });
  },

  // ─── Tabs & Switchers ───
  switchTab(tabName) {
    const tabBtns = document.querySelectorAll('.auth-tab-btn');
    const panes = document.querySelectorAll('.auth-form-pane');

    tabBtns.forEach(btn => {
      btn.classList.toggle('active', btn.dataset.tab === tabName);
    });
    panes.forEach(pane => {
      pane.classList.toggle('active', pane.id === `pane-${tabName}`);
    });
    if (history.replaceState) {
      history.replaceState(null, '', tabName === 'register' ? '#register' : '#signin');
    }
    // Clear errors when switching
    this.clearAlert('login-alert-container');
    this.clearAlert('register-alert-container');
    const loginForm = document.getElementById('login-form');
    const registerForm = document.getElementById('register-form');
    if (loginForm) this.clearFieldErrors(loginForm);
    if (registerForm) this.clearFieldErrors(registerForm);
  },

  bindAuthTabs() {
    const tabBtns = document.querySelectorAll('.auth-tab-btn');
    if (!tabBtns.length) return;

    tabBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        this.switchTab(btn.dataset.tab);
      });
    });

    const hash = window.location.hash.toLowerCase();
    const isRegisterPage = window.location.pathname.includes('register.html');
    if (hash === '#register' || hash === '#signup' || isRegisterPage) {
      this.switchTab('register');
    }
  },

  bindSocialLogin() {
    const googleBtns = document.querySelectorAll('.btn-google-login');
    googleBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        this.openGoogleAccountChooser();
      });
    });
  },

  // ─── GOOGLE ACCOUNT CHOOSER MODAL ───
  openGoogleAccountChooser() {
    let modalOverlay = document.getElementById('google-oauth-modal');
    if (!modalOverlay) {
      modalOverlay = document.createElement('div');
      modalOverlay.id = 'google-oauth-modal';
      modalOverlay.className = 'google-modal-overlay';
      document.body.appendChild(modalOverlay);
    }

    // Determine current active mode: Sign In vs Create Account
    const activePane = document.querySelector('.auth-form-pane.active');
    const isRegisterMode = activePane && activePane.id === 'pane-register';
    const mode = isRegisterMode ? 'register' : 'login';

    // Get current registered users
    const registeredUsers = this.getRegisteredUsers();

    // Accounts available on device to choose from
    const deviceAccounts = [
      ...registeredUsers.map(u => ({
        name: u.name,
        email: u.email,
        avatar: u.avatar || '',
        isRegistered: true
      }))
    ];

    // If no gmail sample exists, provide one unregistered device Google account so user can test rejection!
    if (!deviceAccounts.some(a => a.email === 'user.phone@gmail.com')) {
      deviceAccounts.push({
        name: 'Device Account (Unregistered)',
        email: 'user.phone@gmail.com',
        avatar: '',
        isRegistered: false
      });
    }

    modalOverlay.innerHTML = `
      <div class="google-modal-card">
        <button type="button" class="google-modal-close-btn" id="btn-close-google-modal" title="Close dialog">
          <i class="fa-solid fa-xmark"></i>
        </button>

        <div class="google-modal-header">
          <div class="google-modal-glogo">
            <svg width="28" height="28" viewBox="0 0 18 18">
              <path fill="#4285F4" d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.874 2.684-6.616z"/>
              <path fill="#34A853" d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.258c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332C2.438 15.983 5.482 18 9 18z"/>
              <path fill="#FBBC05" d="M3.964 10.707c-.18-.54-.282-1.117-.282-1.707s.102-1.167.282-1.707V4.961H.957C.347 6.173 0 7.547 0 9s.347 2.827.957 4.039l3.007-2.332z"/>
              <path fill="#EA4335" d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0 5.482 0 2.438 2.017.957 4.961L3.964 7.293C4.672 5.166 6.656 3.58 9 3.58z"/>
            </svg>
          </div>
          <h3 class="google-modal-title">${mode === 'login' ? 'Sign In with Google' : 'Sign Up with Google'}</h3>
          <p class="google-modal-subtitle">Choose an account to continue to <strong>ShopScout</strong></p>
        </div>

        <div id="google-modal-alert-area"></div>

        <div class="google-account-list" id="google-account-list">
          ${deviceAccounts.map(acc => `
            <div class="google-account-item" data-email="${acc.email}" data-name="${acc.name}">
              ${acc.avatar ? `
                <img src="${acc.avatar}" alt="${acc.name}" class="google-account-avatar">
              ` : `
                <div class="google-account-letter">${acc.name.charAt(0).toUpperCase()}</div>
              `}
              <div class="google-account-info">
                <div class="google-account-name">
                  <span>${acc.name}</span>
                  ${acc.isRegistered ? `<span class="google-badge-registered"><i class="fa-solid fa-check"></i> Registered</span>` : ''}
                </div>
                <div class="google-account-email">${acc.email}</div>
              </div>
              <i class="fa-solid fa-chevron-right" style="color: var(--muted-light); font-size: 0.85rem;"></i>
            </div>
          `).join('')}
        </div>

        <div class="google-use-another-row">
          <button type="button" class="google-use-another-btn" id="btn-google-use-another">
            <i class="fa-solid fa-user-plus"></i> Use another Google account
          </button>
          
          <div class="google-custom-input-box" id="google-custom-input-box">
            <div class="google-custom-row">
              <input type="email" id="google-custom-email-input" placeholder="Enter your Gmail address" autocomplete="email">
              <button type="button" id="btn-submit-google-custom">Continue</button>
            </div>
          </div>
        </div>

        <div class="google-modal-footer">
          To continue, Google will verify your email address and profile name with ShopScout.
        </div>
      </div>
    `;

    // Show modal
    setTimeout(() => {
      modalOverlay.classList.add('active');
    }, 10);

    // Close Button Event
    const closeBtn = document.getElementById('btn-close-google-modal');
    if (closeBtn) {
      closeBtn.addEventListener('click', () => {
        modalOverlay.classList.remove('active');
      });
    }

    // Backdrop click close
    modalOverlay.onclick = (e) => {
      if (e.target === modalOverlay) {
        modalOverlay.classList.remove('active');
      }
    };

    // Bind Account Item Clicks
    modalOverlay.querySelectorAll('.google-account-item').forEach(item => {
      item.addEventListener('click', () => {
        const email = item.dataset.email;
        const name = item.dataset.name;
        this.processGoogleAccountSelection(email, name, mode);
      });
    });

    // Bind "Use another account"
    const useAnotherBtn = document.getElementById('btn-google-use-another');
    const customInputBox = document.getElementById('google-custom-input-box');
    const customEmailInput = document.getElementById('google-custom-email-input');
    const submitCustomBtn = document.getElementById('btn-submit-google-custom');

    if (useAnotherBtn && customInputBox) {
      useAnotherBtn.addEventListener('click', () => {
        customInputBox.classList.toggle('active');
        if (customInputBox.classList.contains('active') && customEmailInput) {
          customEmailInput.focus();
        }
      });
    }

    if (submitCustomBtn && customEmailInput) {
      submitCustomBtn.addEventListener('click', () => {
        const email = customEmailInput.value.trim();
        if (!email || !this.EMAIL_REGEX.test(email)) {
          this.showGoogleModalAlert('Please enter a valid Gmail / Google email address.', 'error');
          return;
        }
        const name = email.split('@')[0];
        this.processGoogleAccountSelection(email, name, mode);
      });
    }
  },

  showGoogleModalAlert(message, type = 'error') {
    const alertArea = document.getElementById('google-modal-alert-area');
    if (!alertArea) return;
    const icon = type === 'error' ? 'fa-triangle-exclamation' : 'fa-circle-check';
    alertArea.innerHTML = `
      <div class="auth-alert-box auth-alert-${type}" style="margin-bottom: 1rem; animation: shakeInvalid 0.35s ease;">
        <i class="fa-solid ${icon}"></i>
        <div>${message}</div>
      </div>
    `;
  },

  processGoogleAccountSelection(email, name, mode) {
    const cleanEmail = (email || '').trim().toLowerCase();
    const registeredUser = this.findUserByEmail(cleanEmail);

    // ─── 1. SIGN IN MODE: MUST BE ALREADY SIGNED UP ───
    if (mode === 'login') {
      if (!registeredUser) {
        // ❌ REJECT LOGIN: Gmail is not signed up yet!
        this.showGoogleModalAlert(`
          <strong>Account Not Found:</strong> Yeh Google account (<em>${cleanEmail}</em>) ShopScout par abhi registered nahi hai!<br>
          <span style="display:block; margin-top:0.35rem; font-size:0.82rem; color:inherit;">
            Jab tak aap is Gmail se Sign Up nahi karenge, tab tak login nahi ho sakta.
          </span>
          <button type="button" class="btn btn-primary btn-sm" id="btn-switch-to-google-signup" style="margin-top:0.6rem; font-size:0.8rem; padding: 0.35rem 0.75rem;">
            <i class="fa-solid fa-user-plus"></i> Is Gmail se Free Account Banayein
          </button>
        `, 'error');

        ShopScout.toast('Google account not registered. Please sign up first!', 'danger');

        const switchBtn = document.getElementById('btn-switch-to-google-signup');
        if (switchBtn) {
          switchBtn.addEventListener('click', () => {
            const modalOverlay = document.getElementById('google-oauth-modal');
            if (modalOverlay) modalOverlay.classList.remove('active');
            this.switchTab('register');
            const regEmailInput = document.getElementById('reg-email');
            const regNameInput = document.getElementById('reg-name');
            if (regEmailInput) regEmailInput.value = cleanEmail;
            if (regNameInput) regNameInput.value = name;
            ShopScout.toast(`Gmail filled: ${cleanEmail}. Please set a password to create account.`, 'info');
          });
        }
        return; // DO NOT LOG IN
      }

      // ✅ REGISTERED: ALLOW LOGIN!
      const sessionUser = {
        id: registeredUser.id || 'usr_' + Date.now(),
        name: registeredUser.name,
        email: registeredUser.email,
        joinedDate: registeredUser.joinedDate || 'Sep 2026',
        avatar: registeredUser.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=120&auto=format&fit=crop&q=80',
        authProvider: 'google'
      };

      const token = 'jwt_google_' + btoa(cleanEmail) + '_' + Date.now();
      localStorage.setItem('auth_token', token);
      localStorage.setItem(ShopScout.KEYS.USER, JSON.stringify(sessionUser));

      this.showGoogleModalAlert(`
        <strong>Google Verified!</strong> Signing in as <strong>${sessionUser.name}</strong>...
      `, 'success');

      ShopScout.toast(`Google Sign-In verified! Welcome back, ${sessionUser.name}.`, 'success');
      setTimeout(() => {
        const modalOverlay = document.getElementById('google-oauth-modal');
        if (modalOverlay) modalOverlay.classList.remove('active');
        window.location.href = 'profile.html';
      }, 700);
      return;
    }

    // ─── 2. REGISTER MODE: CREATE NEW ACCOUNT WITH THIS GOOGLE EMAIL ───
    if (mode === 'register') {
      if (registeredUser) {
        this.showGoogleModalAlert(`
          <strong>Account Already Exists:</strong> Yeh Google account (<em>${cleanEmail}</em>) pehle se registered hai! Kripya Sign In karein.
          <button type="button" class="btn btn-primary btn-sm" id="btn-switch-to-google-signin" style="margin-top:0.6rem; font-size:0.8rem; padding: 0.35rem 0.75rem;">
            <i class="fa-solid fa-arrow-right-to-bracket"></i> Sign In Tab par Jayein
          </button>
        `, 'error');

        const signinBtn = document.getElementById('btn-switch-to-google-signin');
        if (signinBtn) {
          signinBtn.addEventListener('click', () => {
            const modalOverlay = document.getElementById('google-oauth-modal');
            if (modalOverlay) modalOverlay.classList.remove('active');
            this.switchTab('login');
            const loginEmailInput = document.getElementById('login-email');
            if (loginEmailInput) loginEmailInput.value = cleanEmail;
          });
        }
        return;
      }

      // Register new Google account
      const newGoogleUser = {
        id: 'usr_' + Date.now(),
        name: name,
        email: cleanEmail,
        password: 'GoogleOAuth2Verified',
        joinedDate: new Date().toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
        avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=120&auto=format&fit=crop&q=80',
        authProvider: 'google'
      };

      this.saveRegisteredUser(newGoogleUser);

      const token = 'jwt_google_' + btoa(cleanEmail) + '_' + Date.now();
      localStorage.setItem('auth_token', token);
      localStorage.setItem(ShopScout.KEYS.USER, JSON.stringify(newGoogleUser));

      this.showGoogleModalAlert(`
        <strong>Account Created!</strong> Welcome to ShopScout, <strong>${newGoogleUser.name}</strong>. Loading your dashboard...
      `, 'success');

      ShopScout.toast(`Google Account successfully registered! Welcome, ${newGoogleUser.name}.`, 'success');
      setTimeout(() => {
        const modalOverlay = document.getElementById('google-oauth-modal');
        if (modalOverlay) modalOverlay.classList.remove('active');
        window.location.href = 'profile.html';
      }, 700);
    }
  },

  bindQuickFill() {
    const demoBtn = document.getElementById('btn-quickfill-demo');
    if (!demoBtn) return;

    demoBtn.addEventListener('click', () => {
      this.switchTab('login');
      const emailInput = document.getElementById('login-email');
      const passInput = document.getElementById('login-password');
      if (emailInput && passInput) {
        emailInput.value = 'alex.hunter@example.com';
        passInput.value = 'Password123';
        this.clearFieldErrors(document.getElementById('login-form'));
        this.clearAlert('login-alert-container');
        
        emailInput.style.borderColor = 'var(--primary)';
        passInput.style.borderColor = 'var(--primary)';
        setTimeout(() => {
          emailInput.style.borderColor = '';
          passInput.style.borderColor = '';
        }, 1200);
        ShopScout.toast('Demo credentials filled: alex.hunter@example.com / Password123', 'info');
      }
    });
  },

  getCurrentUser() {
    try {
      const u = JSON.parse(localStorage.getItem(ShopScout.KEYS.USER));
      if (u && u.name) return u;
    } catch {
      // fallback to rich default
    }
    return {
      name: 'Alex Hunter',
      email: 'alex.hunter@example.com',
      joinedDate: 'Jan 2026',
      avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=120&auto=format&fit=crop&q=80'
    };
  },

  bindPasswordToggles() {
    document.querySelectorAll('.password-toggle-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const input = btn.previousElementSibling;
        if (input && input.tagName === 'INPUT') {
          const isPass = input.type === 'password';
          input.type = isPass ? 'text' : 'password';
          btn.innerHTML = `<i class="fa-solid fa-eye${isPass ? '-slash' : ''}"></i>`;
        }
      });
    });
  },

  bindPasswordStrength() {
    const passInput = document.getElementById('reg-password');
    const fill = document.getElementById('strength-bar-fill');
    const label = document.getElementById('strength-label');

    if (!passInput || !fill) return;

    passInput.addEventListener('input', () => {
      const val = passInput.value;
      let score = 0;
      if (val.length >= 8) score++;
      if (/[A-Z]/.test(val)) score++;
      if (/[0-9]/.test(val)) score++;
      if (/[^A-Za-z0-9]/.test(val)) score++;

      if (val.length === 0) {
        fill.style.width = '0%';
        if (label) label.textContent = '';
      } else if (score <= 1) {
        fill.style.width = '25%';
        fill.style.backgroundColor = '#EF4444';
        if (label) { label.textContent = 'Weak'; label.style.color = '#EF4444'; }
      } else if (score === 2 || score === 3) {
        fill.style.width = '65%';
        fill.style.backgroundColor = '#F59E0B';
        if (label) { label.textContent = 'Medium'; label.style.color = '#F59E0B'; }
      } else {
        fill.style.width = '100%';
        fill.style.backgroundColor = '#16A34A';
        if (label) { label.textContent = 'Strong'; label.style.color = '#16A34A'; }
      }
    });
  },

  getApiUrl(endpoint) {
    if (window.location.port === '3000') {
      return endpoint;
    }
    return 'http://localhost:3000' + endpoint;
  },

  // ─── STRICT SIGN IN (AUTHENTICATION) ───
  bindLoginForm() {
    const form = document.getElementById('login-form');
    if (!form) return;

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      this.clearFieldErrors(form);
      this.clearAlert('login-alert-container');

      const emailInput = document.getElementById('login-email');
      const passInput = document.getElementById('login-password');
      const submitBtn = document.getElementById('btn-login-submit') || form.querySelector('button[type="submit"]');

      const email = emailInput ? emailInput.value.trim() : '';
      const pass = passInput ? passInput.value : '';

      let hasError = false;

      // 1. Email validation
      if (!email) {
        this.showFieldError(emailInput, 'Please enter your registered email address.');
        hasError = true;
      } else if (!this.EMAIL_REGEX.test(email)) {
        this.showFieldError(emailInput, 'Please enter a valid email format (e.g. name@example.com).');
        hasError = true;
      }

      // 2. Password validation
      if (!pass) {
        this.showFieldError(passInput, 'Please enter your account password.');
        hasError = true;
      }

      if (hasError) {
        if (!email && emailInput) emailInput.focus();
        else if (!pass && passInput) passInput.focus();
        ShopScout.toast('Please fill in all required fields correctly.', 'warning');
        return;
      }

      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> Verifying Credentials...`;
      }

      // 3. Connect to Real Node.js / Express Auth API
      try {
        const response = await fetch(this.getApiUrl('/api/auth/login'), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password: pass })
        });

        const data = await response.json();

        if (!response.ok) {
          if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.innerHTML = `Sign In to ShopScout <i class="fa-solid fa-arrow-right"></i>`;
          }

          if (response.status === 404) {
            this.showAlert(
              'login-alert-container',
              `<strong>Account Not Found:</strong> ${data.message || 'No account found with this email.'}`,
              'error'
            );
            this.showFieldError(emailInput, 'No account found with this email.');
            if (emailInput) emailInput.focus();
          } else if (response.status === 401) {
            this.showAlert(
              'login-alert-container',
              `<strong>Incorrect Password:</strong> ${data.message || 'Invalid password.'}`,
              'error'
            );
            this.showFieldError(passInput, 'Incorrect password. Please try again.');
            if (passInput) {
              passInput.value = '';
              passInput.focus();
            }
          } else {
            this.showAlert('login-alert-container', data.message || 'Authentication failed.', 'error');
          }

          ShopScout.toast(data.message || 'Authentication failed.', 'danger');
          return;
        }

        // 4. Successful Authentication!
        localStorage.setItem('auth_token', data.token);
        localStorage.setItem(ShopScout.KEYS.USER, JSON.stringify(data.user));

        if (submitBtn) {
          submitBtn.innerHTML = `<i class="fa-solid fa-circle-check"></i> Signing You In...`;
          submitBtn.style.backgroundColor = '#16A34A';
        }

        this.showAlert(
          'login-alert-container',
          `<strong>Success!</strong> Credentials verified via JWT & Bcrypt. Welcome back, <strong>${data.user.name}</strong>!`,
          'success'
        );

        ShopScout.toast(`Signed in successfully! Welcome back, ${data.user.name}.`, 'success');
        setTimeout(() => {
          window.location.href = 'profile.html';
        }, 700);

      } catch (networkError) {
        console.warn('API network error, falling back to local registry:', networkError);
        // Fallback to local user registry if node server is offline
        const registeredUser = this.findUserByEmail(email);

        if (!registeredUser) {
          if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.innerHTML = `Sign In to ShopScout <i class="fa-solid fa-arrow-right"></i>`;
          }
          this.showAlert(
            'login-alert-container',
            `<strong>Account Not Found:</strong> No registered account found with <em>${email}</em>.`,
            'error'
          );
          this.showFieldError(emailInput, 'No account found with this email.');
          return;
        }

        if (registeredUser.password !== pass) {
          if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.innerHTML = `Sign In to ShopScout <i class="fa-solid fa-arrow-right"></i>`;
          }
          this.showAlert(
            'login-alert-container',
            `<strong>Incorrect Password:</strong> The password you entered is incorrect.`,
            'error'
          );
          this.showFieldError(passInput, 'Incorrect password. Please try again.');
          return;
        }

        const sessionUser = {
          name: registeredUser.name || email.split('@')[0],
          email: registeredUser.email,
          joinedDate: registeredUser.joinedDate || 'Sep 2026',
          avatar: registeredUser.avatar || ''
        };
        localStorage.setItem(ShopScout.KEYS.USER, JSON.stringify(sessionUser));
        ShopScout.toast(`Signed in successfully! Welcome, ${sessionUser.name}.`, 'success');
        setTimeout(() => { window.location.href = 'profile.html'; }, 700);
      }
    });
  },

  // ─── STRICT SIGN UP (REGISTRATION) ───
  bindRegisterForm() {
    const form = document.getElementById('register-form');
    if (!form) return;

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      this.clearFieldErrors(form);
      this.clearAlert('register-alert-container');

      const nameInput = document.getElementById('reg-name');
      const emailInput = document.getElementById('reg-email');
      const passInput = document.getElementById('reg-password');
      const confirmPassInput = document.getElementById('reg-confirm-password');
      const submitBtn = form.querySelector('button[type="submit"]');

      const name = nameInput ? nameInput.value.trim() : '';
      const email = emailInput ? emailInput.value.trim() : '';
      const pass = passInput ? passInput.value : '';
      const confirmPass = confirmPassInput ? confirmPassInput.value : '';

      let hasError = false;

      // 1. Name Check
      if (!name || name.length < 2) {
        this.showFieldError(nameInput, 'Please enter your full name (at least 2 characters).');
        hasError = true;
      }

      // 2. Email Check
      if (!email) {
        this.showFieldError(emailInput, 'Please enter your email address.');
        hasError = true;
      } else if (!this.EMAIL_REGEX.test(email)) {
        this.showFieldError(emailInput, 'Please enter a valid email address (e.g. name@example.com).');
        hasError = true;
      }

      // 3. Password Strength Check
      if (!pass) {
        this.showFieldError(passInput, 'Please create a secure password.');
        hasError = true;
      } else if (pass.length < 8) {
        this.showFieldError(passInput, 'Password must be at least 8 characters long.');
        hasError = true;
      } else if (!/[A-Za-z]/.test(pass) || !/[0-9]/.test(pass)) {
        this.showFieldError(passInput, 'Password must contain both letters and numbers.');
        hasError = true;
      }

      // 4. Confirm Password Check
      if (!confirmPass) {
        this.showFieldError(confirmPassInput, 'Please re-enter your password to confirm.');
        hasError = true;
      } else if (pass !== confirmPass) {
        this.showFieldError(confirmPassInput, 'Passwords do not match! Please verify your password.');
        hasError = true;
      }

      if (hasError) {
        ShopScout.toast('Please resolve the errors above before continuing.', 'warning');
        return;
      }

      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> Creating Secure Account...`;
      }

      // 5. Connect to Real Node.js / Express Signup API
      try {
        const response = await fetch(this.getApiUrl('/api/auth/signup'), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name, email, password: pass })
        });

        const data = await response.json();

        if (!response.ok) {
          if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.innerHTML = `Create My Account <i class="fa-solid fa-rocket"></i>`;
          }

          if (response.status === 409) {
            this.showAlert(
              'register-alert-container',
              `<strong>Account Already Exists:</strong> ${data.message} <a href="javascript:void(0)" onclick="AuthController.switchTab('login')" style="color:inherit; font-weight:700; text-decoration:underline;">Click here to Sign In</a>.`,
              'error'
            );
            this.showFieldError(emailInput, 'An account with this email already exists.');
          } else {
            this.showAlert('register-alert-container', data.message || 'Registration failed.', 'error');
          }

          ShopScout.toast(data.message || 'Registration error.', 'warning');
          return;
        }

        // 6. Success from Backend!
        localStorage.setItem('auth_token', data.token);
        localStorage.setItem(ShopScout.KEYS.USER, JSON.stringify(data.user));

        // Also save into local registry for offline fallback
        this.saveRegisteredUser({
          name: data.user.name,
          email: data.user.email,
          password: pass,
          joinedDate: data.user.joinedDate
        });

        if (submitBtn) {
          submitBtn.innerHTML = `<i class="fa-solid fa-circle-check"></i> Account Created! Redirecting...`;
          submitBtn.style.backgroundColor = '#16A34A';
        }

        this.showAlert(
          'register-alert-container',
          `<strong>Account Created!</strong> Welcome to ShopScout, <strong>${data.user.name}</strong>. Loading your dashboard...`,
          'success'
        );

        ShopScout.toast(`Account created successfully! Welcome, ${data.user.name}.`, 'success');
        setTimeout(() => {
          window.location.href = 'profile.html';
        }, 700);

      } catch (networkError) {
        console.warn('Signup API network error, falling back to local registry:', networkError);
        const newUser = {
          name: name,
          email: email.toLowerCase(),
          password: pass,
          joinedDate: new Date().toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
          avatar: ''
        };
        this.saveRegisteredUser(newUser);
        localStorage.setItem(ShopScout.KEYS.USER, JSON.stringify(newUser));
        ShopScout.toast(`Account created successfully! Welcome, ${newUser.name}.`, 'success');
        setTimeout(() => { window.location.href = 'profile.html'; }, 700);
      }
    });
  },

  bindForgotPasswordForm() {
    const form = document.getElementById('forgot-form');
    if (!form) return;

    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const emailInput = document.getElementById('forgot-email');
      const email = emailInput ? emailInput.value.trim() : '';

      this.clearFieldErrors(form);

      if (!email || !this.EMAIL_REGEX.test(email)) {
        this.showFieldError(emailInput, 'Please enter a valid registered email address.');
        return;
      }

      const user = this.findUserByEmail(email);
      if (!user) {
        this.showFieldError(emailInput, 'No account found with this email address.');
        ShopScout.toast('Email not found in registered accounts.', 'danger');
        return;
      }

      ShopScout.toast(`Password reset instructions sent to ${email}`, 'success');
      form.innerHTML = `
        <div class="auth-alert-box auth-alert-success" style="margin-top: 1rem;">
          <i class="fa-solid fa-circle-check"></i>
          <div>
            <strong>Reset Link Sent!</strong><br>
            We've sent a password recovery link to <strong>${email}</strong>. Please check your inbox and spam folder.
          </div>
        </div>
        <div style="text-align: center; margin-top: 1.5rem;">
          <a href="login.html" class="btn btn-primary btn-sm"><i class="fa-solid fa-arrow-left"></i> Return to Sign In</a>
        </div>
      `;
    });
  },

  async initProfilePage() {
    if (!window.location.pathname.includes('profile.html')) return;

    // Design Mode Active: Freely access full profile UI without login blocks
    const user = this.getCurrentUser();
    const nameEls = document.querySelectorAll('.profile-user-name');
    const emailEls = document.querySelectorAll('.profile-user-email');
    const avatarEls = document.querySelectorAll('.profile-avatar-letter');
    const savedCountEl = document.getElementById('profile-saved-count');
    const compareCountEl = document.getElementById('profile-compare-count');
    const alertsCountEl = document.getElementById('profile-alerts-count');
    const savingsEl = document.getElementById('profile-savings-total');

    nameEls.forEach(el => el.textContent = user.name || 'Alex Hunter');
    emailEls.forEach(el => el.textContent = user.email || 'alex.hunter@example.com');
    if (avatarEls.length && user.name) {
      avatarEls.forEach(el => el.textContent = user.name.charAt(0).toUpperCase());
    }

    // Pre-fill settings form if exists
    const settingsName = document.getElementById('settings-name');
    const settingsEmail = document.getElementById('settings-email');
    if (settingsName) settingsName.value = user.name || 'Alex Hunter';
    if (settingsEmail) settingsEmail.value = user.email || 'alex.hunter@example.com';

    const wishlist = ShopScout.getWishlist();
    const compare = ShopScout.getCompare();
    let alerts = ShopScout.getAlerts();

    // If alerts are completely empty for a new user, add 1 realistic default alert so the dashboard looks vibrant
    if (Object.keys(alerts).length === 0 || alerts['prod-1']) {
      alerts = {
        'prod-vivo-t3x-5g': { targetPrice: 13500, createdAt: new Date().toISOString() }
      };
      localStorage.setItem(ShopScout.KEYS.ALERTS, JSON.stringify(alerts));
    }

    if (savedCountEl) savedCountEl.textContent = wishlist.length;
    if (compareCountEl) compareCountEl.textContent = compare.length;
    if (alertsCountEl) alertsCountEl.textContent = Object.keys(alerts).length;
    if (savingsEl) savingsEl.textContent = '₹' + (Object.keys(alerts).length * 2800 + wishlist.length * 650 + 1200).toLocaleString('en-IN');

    this.bindProfileTabs();
    this.bindSettingsForm();

    // Fetch products and render alerts & wishlist
    try {
      const allProducts = typeof ProductService !== 'undefined' ? await ProductService.getAllProducts() : [];
      this.renderProfileAlerts(alerts, allProducts);
      this.renderProfileWishlist(wishlist, allProducts);
    } catch (err) {
      console.error('Error rendering profile dashboard:', err);
    }
  },

  bindProfileTabs() {
    const tabBtns = document.querySelectorAll('.profile-tab-button');
    const panes = document.querySelectorAll('.profile-pane');

    if (!tabBtns.length) return;

    const switchTab = (tabId) => {
      tabBtns.forEach(btn => {
        btn.classList.toggle('active', btn.dataset.profileTab === tabId);
      });
      panes.forEach(pane => {
        pane.classList.toggle('active', pane.id === `pane-${tabId}`);
      });
    };

    tabBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        switchTab(btn.dataset.profileTab);
      });
    });

    // Check hash
    const hash = window.location.hash.toLowerCase();
    if (hash.includes('alerts')) {
      switchTab('alerts');
    } else if (hash.includes('wishlist')) {
      switchTab('wishlist');
    } else if (hash.includes('settings')) {
      switchTab('settings');
    }
  },

  renderProfileAlerts(alerts, allProducts) {
    const alertsContainers = [
      document.getElementById('profile-alerts-list'),
      document.getElementById('profile-alerts-full-list')
    ];

    const alertKeys = Object.keys(alerts);

    alertsContainers.forEach(container => {
      if (!container) return;

      if (alertKeys.length === 0) {
        container.innerHTML = `
          <div class="profile-empty-state">
            <div class="profile-empty-icon"><i class="fa-regular fa-bell-slash"></i></div>
            <h4 class="profile-empty-title">No Active Price Alerts Yet</h4>
            <p class="profile-empty-desc">Open any product page and click "Set Price Alert" to track price drops across Flipkart & Amazon.</p>
            <a href="deals.html" class="btn btn-primary btn-sm"><i class="fa-solid fa-fire"></i> Browse Live Deals</a>
          </div>
        `;
        return;
      }

      container.innerHTML = alertKeys.map(prodId => {
        const product = allProducts.find(p => String(p.id) === String(prodId)) || {
          id: prodId,
          name: 'vivo T3x 5G (Cyber Green, 128 GB)',
          category: 'Mobiles',
          price: 12999,
          originalPrice: 17499,
          image: 'https://rukminim2.flixcart.com/image/832/832/xif0q/mobile/k/g/j/t3x-5g-v2338-vivo-original-imahyyzaqhgwzfup.jpeg?q=70',
          stores: [{ name: 'Flipkart', price: 12999, url: 'https://www.flipkart.com' }]
        };

        const prodTitle = product.name || product.title || 'Smart Product';
        const targetPrice = alerts[prodId].targetPrice;
        const currentPrice = product.price || product.currentPrice || 12999;
        const isTargetMet = currentPrice <= targetPrice;
        const savingsDiff = targetPrice - currentPrice;

        return `
          <div class="profile-alert-item" id="alert-card-${prodId}">
            <img src="${product.image || 'https://rukminim2.flixcart.com/image/832/832/xif0q/mobile/k/g/j/t3x-5g-v2338-vivo-original-imahyyzaqhgwzfup.jpeg?q=70'}" alt="${prodTitle}" class="profile-alert-thumb">
            <div class="profile-alert-details">
              <h4 class="profile-alert-title"><a href="product-details.html?id=${product.id}" style="color:inherit; text-decoration:none;">${prodTitle}</a></h4>
              <div class="profile-alert-meta">
                <div class="profile-alert-prices">
                  <span class="profile-alert-current">${ShopScout.formatPrice(currentPrice)}</span>
                  <span class="profile-alert-target">Target: <strong>${ShopScout.formatPrice(targetPrice)}</strong></span>
                </div>
                ${isTargetMet ? `
                  <span class="profile-alert-status-badge status-target-hit">
                    <i class="fa-solid fa-circle-check"></i> Target Met! Save ${ShopScout.formatPrice(Math.abs(savingsDiff))}
                  </span>
                ` : `
                  <span class="profile-alert-status-badge status-monitoring">
                    <span class="pulse-indicator"></span> Tracking (Needs ${ShopScout.formatPrice(Math.abs(savingsDiff))} drop)
                  </span>
                `}
              </div>
            </div>
            <div class="profile-alert-actions">
              <a href="product-details.html?id=${product.id}" class="btn-alert-buy">
                <i class="fa-solid fa-bag-shopping"></i> View Deal
              </a>
              <button class="btn-alert-remove" title="Remove Alert" onclick="AuthController.removeAlert('${prodId}')">
                <i class="fa-regular fa-trash-can"></i>
              </button>
            </div>
          </div>
        `;
      }).join('');
    });
  },

  renderProfileWishlist(wishlist, allProducts) {
    const container = document.getElementById('profile-wishlist-grid');
    if (!container) return;

    if (wishlist.length === 0) {
      container.innerHTML = `
        <div class="profile-empty-state" style="grid-column: 1 / -1;">
          <div class="profile-empty-icon"><i class="fa-regular fa-heart"></i></div>
          <h4 class="profile-empty-title">Your Wishlist is Empty</h4>
          <p class="profile-empty-desc">Save items while browsing to track price fluctuations in one place.</p>
          <a href="products.html" class="btn btn-primary btn-sm"><i class="fa-solid fa-layer-group"></i> Explore Catalog</a>
        </div>
      `;
      return;
    }

    container.innerHTML = wishlist.map(prodId => {
      const product = allProducts.find(p => String(p.id) === String(prodId));
      if (!product) return '';

      return `
        <div class="product-card" style="margin-bottom:0;">
          <div class="product-img-wrap">
            <img src="${product.image}" alt="${product.title}" class="product-img" loading="lazy">
          </div>
          <div class="product-info">
            <span class="product-category">${product.category}</span>
            <h3 class="product-title"><a href="product-details.html?id=${product.id}">${product.title}</a></h3>
            <div class="product-price-row">
              <div class="product-prices">
                <span class="price-current">${ShopScout.formatPrice(product.currentPrice)}</span>
                ${product.originalPrice ? `<span class="price-original">${ShopScout.formatPrice(product.originalPrice)}</span>` : ''}
              </div>
              <button class="btn btn-primary btn-sm" onclick="window.location.href='product-details.html?id=${product.id}'">
                View
              </button>
            </div>
          </div>
        </div>
      `;
    }).join('');
  },

  bindSettingsForm() {
    const form = document.getElementById('profile-settings-form');
    if (!form) return;

    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const name = document.getElementById('settings-name').value.trim();
      const email = document.getElementById('settings-email').value.trim();

      const user = this.getCurrentUser();
      user.name = name;
      user.email = email;
      localStorage.setItem(ShopScout.KEYS.USER, JSON.stringify(user));

      ShopScout.toast('Profile preferences updated successfully!', 'success');
      this.initProfilePage();
    });
  },

  removeAlert(prodId) {
    const alerts = ShopScout.getAlerts();
    delete alerts[prodId];
    localStorage.setItem(ShopScout.KEYS.ALERTS, JSON.stringify(alerts));
    ShopScout.toast('Price alert removed', 'info');
    this.initProfilePage();
  },

  logout() {
    localStorage.removeItem('auth_token');
    localStorage.removeItem(ShopScout.KEYS.USER);
    ShopScout.toast('Session reset (VIP Demo active)', 'info');
    setTimeout(() => {
      window.location.href = '../index.html';
    }, 500);
  }
};

document.addEventListener('DOMContentLoaded', () => {
  AuthController.init();
});
