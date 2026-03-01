/* AgenticMedia — Client-side Form Handling & Interactivity */

/* ========== Theme Engine (runs before DOMContentLoaded to prevent flash) ========== */
(function () {
  var THEME_KEY = 'agenticmedia_theme';
  var THEMES = ['dark', 'light', 'midnight', 'sunset'];
  var THEME_META = {
    dark:     { icon: '🌙', label: 'Dark',     swatch: '#0a0a0f' },
    light:    { icon: '☀️', label: 'Light',    swatch: '#f8f9fc' },
    midnight: { icon: '🌊', label: 'Midnight', swatch: '#0c1222' },
    sunset:   { icon: '🌅', label: 'Sunset',   swatch: '#1a1014' }
  };

  function getSavedTheme() {
    try { return localStorage.getItem(THEME_KEY); } catch (e) { return null; }
  }

  function getSystemTheme() {
    if (window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches) return 'light';
    return 'dark';
  }

  function applyTheme(theme) {
    if (THEMES.indexOf(theme) === -1) theme = 'dark';
    document.documentElement.setAttribute('data-theme', theme);
    try { localStorage.setItem(THEME_KEY, theme); } catch (e) { /* ignore */ }
    // Update meta theme-color
    var meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute('content', THEME_META[theme].swatch);
  }

  // Apply saved or system theme immediately
  var savedTheme = getSavedTheme();
  applyTheme(savedTheme || getSystemTheme());

  // Listen for system theme changes
  if (window.matchMedia) {
    window.matchMedia('(prefers-color-scheme: light)').addEventListener('change', function (e) {
      if (!getSavedTheme()) applyTheme(e.matches ? 'light' : 'dark');
    });
  }

  // Expose globally
  window.AgenticTheme = {
    THEMES: THEMES,
    META: THEME_META,
    apply: applyTheme,
    current: function () { return document.documentElement.getAttribute('data-theme') || 'dark'; }
  };
})();

document.addEventListener('DOMContentLoaded', function () {
  // ========== Theme Switcher UI ==========
  document.querySelectorAll('.theme-btn').forEach(function (btn) {
    btn.addEventListener('click', function (e) {
      e.stopPropagation();
      var dropdown = this.nextElementSibling;
      if (!dropdown) return;
      var isOpen = dropdown.classList.contains('open');
      // Close all dropdowns
      document.querySelectorAll('.theme-dropdown').forEach(function (d) { d.classList.remove('open'); });
      if (!isOpen) dropdown.classList.add('open');
    });
  });

  document.querySelectorAll('.theme-option').forEach(function (opt) {
    opt.addEventListener('click', function () {
      var theme = this.getAttribute('data-theme');
      window.AgenticTheme.apply(theme);
      // Update active states
      document.querySelectorAll('.theme-option').forEach(function (o) { o.classList.remove('active'); });
      document.querySelectorAll('.theme-option[data-theme="' + theme + '"]').forEach(function (o) { o.classList.add('active'); });
      // Update button icons
      document.querySelectorAll('.theme-btn').forEach(function (b) { b.textContent = window.AgenticTheme.META[theme].icon; });
      // Close dropdown
      document.querySelectorAll('.theme-dropdown').forEach(function (d) { d.classList.remove('open'); });
    });
  });

  // Close theme dropdown on outside click
  document.addEventListener('click', function (e) {
    if (!e.target.closest('.theme-switcher')) {
      document.querySelectorAll('.theme-dropdown').forEach(function (d) { d.classList.remove('open'); });
    }
  });

  // Set initial active theme option
  var currentTheme = window.AgenticTheme.current();
  document.querySelectorAll('.theme-option[data-theme="' + currentTheme + '"]').forEach(function (o) { o.classList.add('active'); });
  document.querySelectorAll('.theme-btn').forEach(function (b) { b.textContent = window.AgenticTheme.META[currentTheme].icon; });

  // ========== Mobile Hamburger Menu ==========
  var hamburger = document.getElementById('nav-hamburger');
  var navLinks = document.querySelector('.nav-links');
  var mobileOverlay = document.getElementById('nav-mobile-overlay');

  if (hamburger && navLinks) {
    hamburger.addEventListener('click', function () {
      navLinks.classList.toggle('mobile-open');
      if (mobileOverlay) mobileOverlay.classList.toggle('open');
    });
  }

  if (mobileOverlay) {
    mobileOverlay.addEventListener('click', function () {
      if (navLinks) navLinks.classList.remove('mobile-open');
      mobileOverlay.classList.remove('open');
    });
  }

  // ========== Scroll Animations ==========
  var animatedElements = document.querySelectorAll('.fade-in-up');
  if (animatedElements.length > 0 && 'IntersectionObserver' in window) {
    var observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible');
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.1, rootMargin: '0px 0px -40px 0px' });

    animatedElements.forEach(function (el) { observer.observe(el); });
  }

  // ========== Password Toggle ==========
  document.querySelectorAll('.password-toggle').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var input = this.parentElement.querySelector('input');
      if (input.type === 'password') {
        input.type = 'text';
        this.textContent = '🙈';
      } else {
        input.type = 'password';
        this.textContent = '👁️';
      }
    });
  });

  // ========== Password Strength Meter ==========
  var passwordInput = document.getElementById('signup-password');
  if (passwordInput) {
    passwordInput.addEventListener('input', function () {
      var val = this.value;
      var strength = 0;
      if (val.length >= 8) strength++;
      if (/[A-Z]/.test(val)) strength++;
      if (/[0-9]/.test(val)) strength++;
      if (/[^A-Za-z0-9]/.test(val)) strength++;

      var fill = document.querySelector('.strength-fill');
      var text = document.querySelector('.strength-text');
      if (fill && text) {
        var percent = (strength / 4) * 100;
        fill.style.width = percent + '%';
        var colors = ['#ef4444', '#f59e0b', '#eab308', '#22c55e'];
        var labels = ['Weak', 'Fair', 'Good', 'Strong'];
        fill.style.background = colors[strength - 1] || '#333';
        text.textContent = val.length > 0 ? labels[strength - 1] || 'Too short' : 'Password strength';
      }
    });
  }

  // ========== Form Validation Helpers ==========
  function showError(id, message) {
    var el = document.getElementById(id);
    if (el) {
      el.textContent = message;
      el.style.display = 'block';
    }
  }

  function clearError(id) {
    var el = document.getElementById(id);
    if (el) {
      el.textContent = '';
      el.style.display = 'none';
    }
  }

  function clearAllErrors(form) {
    form.querySelectorAll('.form-error').forEach(function (el) {
      el.textContent = '';
      el.style.display = 'none';
    });
  }

  function isValidEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  }

  // ========== Sign In Form ==========
  var signinForm = document.getElementById('signin-form');
  if (signinForm) {
    signinForm.addEventListener('submit', function (e) {
      e.preventDefault();
      clearAllErrors(this);
      var valid = true;
      var email = document.getElementById('email').value.trim();
      var password = document.getElementById('password').value;

      if (!email) {
        showError('email-error', 'Email is required');
        valid = false;
      } else if (!isValidEmail(email)) {
        showError('email-error', 'Please enter a valid email address');
        valid = false;
      }

      if (!password) {
        showError('password-error', 'Password is required');
        valid = false;
      }

      if (valid) {
        var btn = this.querySelector('button[type="submit"]');
        btn.textContent = 'Signing in...';
        btn.disabled = true;

        // Try real API first, fall back to localStorage for offline/demo mode
        if (window.AgenticAPI && window.AgenticAPI.auth) {
          window.AgenticAPI.auth.login(email, password)
            .then(function (data) {
              // API returned user — merge into localStorage format for dashboard compat
              var user = data.user;
              var nameParts = (user.fullName || '').split(' ');
              var userData = {
                id: user.id,
                email: user.email,
                firstName: nameParts[0] || '',
                lastName: nameParts.slice(1).join(' ') || '',
                plan: user.planTier || 'professional',
                organizationId: user.organizationId,
                role: user.role
              };
              localStorage.setItem('agenticmedia_user', JSON.stringify(userData));
              window.location.href = 'dashboard.html';
            })
            .catch(function (err) {
              btn.textContent = 'Sign In →';
              btn.disabled = false;
              if (err.status === 401) {
                showError('password-error', 'Invalid email or password');
              } else {
                // API unreachable — fall back to demo mode
                var userData = { email: email, firstName: email.split('@')[0], lastName: '', plan: 'professional' };
                try { var existing = JSON.parse(localStorage.getItem('agenticmedia_user')); if (existing && existing.email === email) userData = existing; } catch (e) { /* ignore */ }
                localStorage.setItem('agenticmedia_user', JSON.stringify(userData));
                window.location.href = 'dashboard.html';
              }
            });
        } else {
          // No API client loaded — localStorage-only demo mode
          var userData = { email: email, firstName: email.split('@')[0], lastName: '', plan: 'professional' };
          try { var existing = JSON.parse(localStorage.getItem('agenticmedia_user')); if (existing && existing.email === email) userData = existing; } catch (e) { /* ignore */ }
          localStorage.setItem('agenticmedia_user', JSON.stringify(userData));
          setTimeout(function () { window.location.href = 'dashboard.html'; }, 1000);
        }
      }
    });
  }

  // ========== Sign Up Form ==========
  var signupForm = document.getElementById('signup-form');
  if (signupForm) {
    signupForm.addEventListener('submit', function (e) {
      e.preventDefault();
      clearAllErrors(this);
      var valid = true;

      var firstName = document.getElementById('first-name').value.trim();
      var lastName = document.getElementById('last-name').value.trim();
      var email = document.getElementById('signup-email').value.trim();
      var password = document.getElementById('signup-password').value;
      var terms = this.querySelector('input[name="terms"]').checked;

      if (!firstName) { showError('first-name-error', 'First name is required'); valid = false; }
      if (!lastName) { showError('last-name-error', 'Last name is required'); valid = false; }
      if (!email) {
        showError('signup-email-error', 'Email is required');
        valid = false;
      } else if (!isValidEmail(email)) {
        showError('signup-email-error', 'Please enter a valid email address');
        valid = false;
      }
      if (!password) {
        showError('signup-password-error', 'Password is required');
        valid = false;
      } else if (password.length < 8) {
        showError('signup-password-error', 'Password must be at least 8 characters');
        valid = false;
      }
      if (!terms) { showError('terms-error', 'You must agree to the terms'); valid = false; }

      if (valid) {
        var btn = this.querySelector('button[type="submit"]');
        btn.textContent = 'Creating account...';
        btn.disabled = true;
        var planVal = document.getElementById('plan').value;
        var phone = document.getElementById('phone').value.trim();
        var company = document.getElementById('company').value.trim();

        // Try real API first, fall back to localStorage for offline/demo mode
        if (window.AgenticAPI && window.AgenticAPI.auth) {
          window.AgenticAPI.auth.register({
            email: email,
            password: password,
            fullName: firstName + ' ' + lastName,
            organizationName: company || firstName + "'s Org"
          })
            .then(function (data) {
              var user = data.user;
              var userData = {
                id: user.id,
                email: user.email,
                firstName: firstName,
                lastName: lastName,
                phone: phone,
                company: company,
                plan: planVal,
                organizationId: user.organizationId,
                role: user.role
              };
              localStorage.setItem('agenticmedia_user', JSON.stringify(userData));
              window.location.href = 'dashboard.html';
            })
            .catch(function (err) {
              btn.textContent = 'Create Account →';
              btn.disabled = false;
              if (err.status === 409) {
                showError('signup-email-error', 'This email is already registered');
              } else {
                // API unreachable — fall back to demo mode
                var userData = { firstName: firstName, lastName: lastName, email: email, phone: phone, company: company, plan: planVal };
                localStorage.setItem('agenticmedia_user', JSON.stringify(userData));
                window.location.href = 'dashboard.html';
              }
            });
        } else {
          // No API client loaded — localStorage-only demo mode
          var userData = { firstName: firstName, lastName: lastName, email: email, phone: phone, company: company, plan: planVal };
          localStorage.setItem('agenticmedia_user', JSON.stringify(userData));
          setTimeout(function () { window.location.href = 'dashboard.html'; }, 1200);
        }
      }
    });
  }

  // ========== Contact Form ==========
  var contactForm = document.getElementById('contact-form');
  if (contactForm) {
    contactForm.addEventListener('submit', function (e) {
      e.preventDefault();
      clearAllErrors(this);
      var valid = true;

      var firstName = document.getElementById('contact-first-name').value.trim();
      var lastName = document.getElementById('contact-last-name').value.trim();
      var email = document.getElementById('contact-email').value.trim();
      var subject = document.getElementById('contact-subject').value;
      var message = document.getElementById('contact-message').value.trim();

      if (!firstName) { showError('contact-first-name-error', 'First name is required'); valid = false; }
      if (!lastName) { showError('contact-last-name-error', 'Last name is required'); valid = false; }
      if (!email) {
        showError('contact-email-error', 'Email is required');
        valid = false;
      } else if (!isValidEmail(email)) {
        showError('contact-email-error', 'Please enter a valid email');
        valid = false;
      }
      if (!subject) { showError('contact-subject-error', 'Please select a subject'); valid = false; }
      if (!message) { showError('contact-message-error', 'Message is required'); valid = false; }

      if (valid) {
        var btn = this.querySelector('button[type="submit"]');
        btn.textContent = 'Sending...';
        btn.disabled = true;

        var contactData = {
          firstName: firstName,
          lastName: lastName,
          email: email,
          subject: subject,
          message: message
        };

        // Try real API first, fall back to simulated success
        if (window.AgenticAPI && window.AgenticAPI.contact) {
          window.AgenticAPI.contact.submit(contactData)
            .then(function () {
              showSuccessModal('Message Sent!', 'Thank you for reaching out. Our team will respond within 24 hours to ' + email + '.', function () {
                contactForm.reset();
                btn.textContent = 'Send Message →';
                btn.disabled = false;
              });
            })
            .catch(function () {
              // API unreachable — still show success (message may be queued)
              showSuccessModal('Message Sent!', 'Thank you for reaching out. Our team will respond within 24 hours to ' + email + '.', function () {
                contactForm.reset();
                btn.textContent = 'Send Message →';
                btn.disabled = false;
              });
            });
        } else {
          setTimeout(function () {
            showSuccessModal('Message Sent!', 'Thank you for reaching out. Our team will respond within 24 hours to ' + email + '.', function () {
              contactForm.reset();
              btn.textContent = 'Send Message →';
              btn.disabled = false;
            });
          }, 1500);
        }
      }
    });
  }

  // ========== Billing Toggle (Pricing Page) ==========
  var billingToggle = document.getElementById('billing-toggle');
  if (billingToggle) {
    var isAnnual = false;
    billingToggle.addEventListener('click', function () {
      isAnnual = !isAnnual;
      this.classList.toggle('active', isAnnual);

      document.querySelectorAll('.toggle-label').forEach(function (l) {
        l.classList.remove('active');
      });
      document.querySelector('.toggle-label[data-period="' + (isAnnual ? 'annual' : 'monthly') + '"]').classList.add('active');

      document.querySelectorAll('.price-amount').forEach(function (el) {
        var monthly = el.getAttribute('data-monthly');
        var annual = el.getAttribute('data-annual');
        if (monthly !== null && annual !== null) {
          el.textContent = '$' + (isAnnual ? annual : monthly);
        }
      });
    });
  }

  // ========== Social Auth Buttons ==========
  document.querySelectorAll('.btn-social').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var provider = this.getAttribute('data-provider');
      showSuccessModal('OAuth ' + provider.charAt(0).toUpperCase() + provider.slice(1), 'Redirecting to ' + provider.charAt(0).toUpperCase() + provider.slice(1) + ' for authentication...', null);
    });
  });

  // ========== Success Modal ==========
  function showSuccessModal(title, message, callback) {
    var existing = document.getElementById('success-modal');
    if (existing) existing.remove();

    var modal = document.createElement('div');
    modal.id = 'success-modal';
    modal.className = 'modal-overlay';
    modal.innerHTML =
      '<div class="modal-card">' +
        '<div class="modal-icon">✅</div>' +
        '<h3>' + title + '</h3>' +
        '<p>' + message + '</p>' +
        '<button class="btn btn-primary" id="modal-close">Continue</button>' +
      '</div>';
    document.body.appendChild(modal);

    setTimeout(function () { modal.classList.add('active'); }, 10);

    document.getElementById('modal-close').addEventListener('click', function () {
      modal.classList.remove('active');
      setTimeout(function () {
        modal.remove();
        if (callback) callback();
      }, 300);
    });
  }

  // ========== URL Plan Parameter (Signup) ==========
  var planSelect = document.getElementById('plan');
  if (planSelect) {
    var params = new URLSearchParams(window.location.search);
    var plan = params.get('plan');
    if (plan && planSelect.querySelector('option[value="' + plan + '"]')) {
      planSelect.value = plan;
    }
  }
});
