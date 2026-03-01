/* AgenticMedia — Client-side Form Handling & Interactivity */

document.addEventListener('DOMContentLoaded', function () {
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
        setTimeout(function () {
          showSuccessModal('Sign In Successful!', 'Welcome back to AgenticMedia. Redirecting to your dashboard...', function () {
            window.location.href = 'index.html';
          });
        }, 1500);
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
        setTimeout(function () {
          showSuccessModal('Account Created!', 'Welcome to AgenticMedia, ' + firstName + '! Your AI agents are being deployed. Redirecting to sign in...', function () {
            window.location.href = 'signin.html';
          });
        }, 2000);
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
        setTimeout(function () {
          showSuccessModal('Message Sent!', 'Thank you for reaching out. Our team will respond within 24 hours to ' + email + '.', function () {
            contactForm.reset();
            btn.textContent = 'Send Message →';
            btn.disabled = false;
          });
        }, 1500);
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
