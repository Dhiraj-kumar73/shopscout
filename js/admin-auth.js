/**
 * SHOPSCOUT — ADMIN SECURITY GATE CONTROLLER
 * Protects Admin Portal from unauthorized public access
 */

const AdminAuth = {
  MASTER_PINS: ['7373', '9440', 'admin73'],
  STORAGE_KEY: 'shopscout_admin_auth_status',

  init() {
    this.checkAuthStatus();
    this.bindForm();
  },

  isLoggedIn() {
    return localStorage.getItem(this.STORAGE_KEY) === 'granted' || 
           sessionStorage.getItem(this.STORAGE_KEY) === 'granted';
  },

  checkAuthStatus() {
    const gate = document.getElementById('admin-security-gate');
    if (!gate) return;

    if (this.isLoggedIn()) {
      gate.style.display = 'none';
    } else {
      gate.style.display = 'flex';
      setTimeout(() => {
        const input = document.getElementById('admin-pin-input');
        if (input) input.focus();
      }, 200);
    }
  },

  verifyPin(pin) {
    const cleanPin = (pin || '').trim();
    if (this.MASTER_PINS.includes(cleanPin)) {
      localStorage.setItem(this.STORAGE_KEY, 'granted');
      sessionStorage.setItem(this.STORAGE_KEY, 'granted');
      
      const gate = document.getElementById('admin-security-gate');
      if (gate) {
        gate.style.opacity = '0';
        setTimeout(() => {
          gate.style.display = 'none';
        }, 300);
      }

      if (typeof ShopScout !== 'undefined' && ShopScout.toast) {
        ShopScout.toast('Security Verified! Welcome back Dhiraj.', 'success');
      }
      return true;
    } else {
      const errorMsg = document.getElementById('security-error-msg');
      const input = document.getElementById('admin-pin-input');
      if (errorMsg) errorMsg.style.display = 'flex';
      if (input) {
        input.classList.add('pin-shake');
        input.value = '';
        setTimeout(() => input.classList.remove('pin-shake'), 450);
      }
      return false;
    }
  },

  logout() {
    localStorage.removeItem(this.STORAGE_KEY);
    sessionStorage.removeItem(this.STORAGE_KEY);
    window.location.reload();
  },

  togglePinVisibility() {
    const input = document.getElementById('admin-pin-input');
    const eyeIcon = document.getElementById('pin-eye-icon');
    if (!input || !eyeIcon) return;

    if (input.type === 'password') {
      input.type = 'text';
      eyeIcon.classList.remove('fa-eye');
      eyeIcon.classList.add('fa-eye-slash');
    } else {
      input.type = 'password';
      eyeIcon.classList.remove('fa-eye-slash');
      eyeIcon.classList.add('fa-eye');
    }
  },

  bindForm() {
    const form = document.getElementById('security-pin-form');
    if (form) {
      form.addEventListener('submit', (e) => {
        e.preventDefault();
        const input = document.getElementById('admin-pin-input');
        if (input) this.verifyPin(input.value);
      });
    }
  }
};

// Auto-run on script load
document.addEventListener('DOMContentLoaded', () => {
  AdminAuth.init();
});
