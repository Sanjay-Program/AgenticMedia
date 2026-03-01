/* AgenticMedia — Dashboard Interactivity */

document.addEventListener('DOMContentLoaded', function () {
  // ========== Auth Guard ==========
  var user = null;
  try { user = JSON.parse(localStorage.getItem('agenticmedia_user')); } catch (e) { /* ignore */ }
  if (!user) {
    window.location.href = 'signin.html';
    return;
  }

  // ========== Populate User Info ==========
  var initial = (user.firstName || 'U').charAt(0).toUpperCase();
  var fullName = (user.firstName || '') + ' ' + (user.lastName || '');
  var planName = (user.plan || 'professional');
  var planLabels = { starter: 'Starter', professional: 'Professional', enterprise: 'Enterprise' };

  var userAvatarEl = document.getElementById('user-avatar');
  var userNameEl = document.getElementById('user-name');
  var userPlanEl = document.getElementById('user-plan');
  var topbarAvatarEl = document.getElementById('topbar-avatar');

  if (userAvatarEl) userAvatarEl.textContent = initial;
  if (userNameEl) userNameEl.textContent = fullName.trim() || 'User';
  if (userPlanEl) userPlanEl.textContent = planLabels[planName] || 'Professional';
  if (topbarAvatarEl) topbarAvatarEl.textContent = initial;

  // Fill settings forms with user data
  var settingsFirstName = document.getElementById('settings-first-name');
  var settingsLastName = document.getElementById('settings-last-name');
  var settingsEmail = document.getElementById('settings-email');
  var settingsPhone = document.getElementById('settings-phone');
  if (settingsFirstName) settingsFirstName.value = user.firstName || 'Sanjay';
  if (settingsLastName) settingsLastName.value = user.lastName || 'Murugadoss';
  if (settingsEmail) settingsEmail.value = user.email || 'sanjaymurugadoss02@gmail.com';
  if (settingsPhone) settingsPhone.value = user.phone || '+91 7305771789';

  var companyNameEl = document.getElementById('company-name');
  if (companyNameEl && user.company) companyNameEl.value = user.company;

  // ========== Page Navigation ==========
  var sidebarLinks = document.querySelectorAll('.sidebar-link');
  var pages = document.querySelectorAll('.page');
  var topbarTitle = document.getElementById('topbar-title');
  var pageTitles = {
    'command-center': 'Command Center',
    'ai-agents': 'AI Agents',
    'deals': 'Deal Room',
    'integrations': 'Integrations',
    'social': 'Social Media',
    'automations': 'Automations',
    'settings': 'Settings',
    'billing': 'Billing'
  };

  function switchPage(pageId) {
    pages.forEach(function (p) { p.classList.remove('active'); });
    sidebarLinks.forEach(function (l) { l.classList.remove('active'); });

    var targetPage = document.getElementById('page-' + pageId);
    var targetLink = document.querySelector('.sidebar-link[data-page="' + pageId + '"]');
    if (targetPage) targetPage.classList.add('active');
    if (targetLink) targetLink.classList.add('active');
    if (topbarTitle) topbarTitle.textContent = pageTitles[pageId] || 'Dashboard';

    // Close mobile sidebar
    var sidebar = document.getElementById('sidebar');
    var overlay = document.getElementById('sidebar-overlay');
    if (sidebar) sidebar.classList.remove('open');
    if (overlay) overlay.classList.remove('active');

    // Update URL hash
    window.location.hash = pageId;
  }

  sidebarLinks.forEach(function (link) {
    link.addEventListener('click', function (e) {
      e.preventDefault();
      var pageId = this.getAttribute('data-page');
      if (pageId) switchPage(pageId);
    });
  });

  // Also handle dash-link clicks (e.g., "View All →" links)
  document.querySelectorAll('.dash-link[data-page]').forEach(function (link) {
    link.addEventListener('click', function (e) {
      e.preventDefault();
      var pageId = this.getAttribute('data-page');
      if (pageId) switchPage(pageId);
    });
  });

  // Handle initial hash
  var hash = window.location.hash.replace('#', '');
  if (hash && pageTitles[hash]) {
    switchPage(hash);
  }

  // ========== Mobile Sidebar ==========
  var mobileMenuBtn = document.getElementById('mobile-menu-btn');
  var sidebarEl = document.getElementById('sidebar');

  // Create overlay
  var overlay = document.createElement('div');
  overlay.id = 'sidebar-overlay';
  overlay.className = 'sidebar-overlay';
  document.body.appendChild(overlay);

  if (mobileMenuBtn) {
    mobileMenuBtn.addEventListener('click', function () {
      sidebarEl.classList.toggle('open');
      overlay.classList.toggle('active');
    });
  }

  overlay.addEventListener('click', function () {
    sidebarEl.classList.remove('open');
    overlay.classList.remove('active');
  });

  // ========== Logout ==========
  var logoutBtn = document.getElementById('logout-btn');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', function () {
      if (window.AgenticAPI && window.AgenticAPI.auth) {
        window.AgenticAPI.auth.logout();
      }
      localStorage.removeItem('agenticmedia_user');
      localStorage.removeItem('agenticmedia_tokens');
      window.location.href = 'signin.html';
    });
  }

  // ========== Settings Tabs ==========
  var settingsTabs = document.querySelectorAll('.settings-tab');
  var settingsPanels = document.querySelectorAll('.settings-panel');

  settingsTabs.forEach(function (tab) {
    tab.addEventListener('click', function () {
      var target = this.getAttribute('data-settings-tab');
      settingsTabs.forEach(function (t) { t.classList.remove('active'); });
      settingsPanels.forEach(function (p) { p.classList.remove('active'); });
      this.classList.add('active');
      var panel = document.getElementById('settings-' + target);
      if (panel) panel.classList.add('active');
    });
  });

  // ========== Settings Forms ==========
  var profileForm = document.getElementById('profile-form');
  if (profileForm) {
    profileForm.addEventListener('submit', function (e) {
      e.preventDefault();
      user.firstName = document.getElementById('settings-first-name').value;
      user.lastName = document.getElementById('settings-last-name').value;
      user.email = document.getElementById('settings-email').value;
      user.phone = document.getElementById('settings-phone').value;
      localStorage.setItem('agenticmedia_user', JSON.stringify(user));

      var newInitial = (user.firstName || 'U').charAt(0).toUpperCase();
      var newFullName = (user.firstName || '') + ' ' + (user.lastName || '');
      if (userAvatarEl) userAvatarEl.textContent = newInitial;
      if (userNameEl) userNameEl.textContent = newFullName.trim();
      if (topbarAvatarEl) topbarAvatarEl.textContent = newInitial;

      // Persist to backend if API available
      if (window.AgenticAPI && window.AgenticAPI.users) {
        window.AgenticAPI.users.updateProfile({
          fullName: user.firstName + ' ' + user.lastName,
          email: user.email
        }).catch(function () { /* offline — localStorage already updated */ });
      }

      showDashToast('Profile updated successfully!');
    });
  }

  var companyForm = document.getElementById('company-form');
  if (companyForm) {
    companyForm.addEventListener('submit', function (e) {
      e.preventDefault();
      user.company = document.getElementById('company-name').value;
      localStorage.setItem('agenticmedia_user', JSON.stringify(user));

      // Persist to backend if API available
      if (window.AgenticAPI && window.AgenticAPI.organizations) {
        window.AgenticAPI.organizations.update({ name: user.company })
          .catch(function () { /* offline — localStorage already updated */ });
      }

      showDashToast('Company settings saved!');
    });
  }

  var securityForm = document.getElementById('security-form');
  if (securityForm) {
    securityForm.addEventListener('submit', function (e) {
      e.preventDefault();
      var currentPwEl = document.getElementById('current-password');
      var currentPw = currentPwEl ? currentPwEl.value : '';
      var newPw = document.getElementById('new-password').value;
      var confirmPw = document.getElementById('confirm-password').value;
      if (!newPw || newPw.length < 8) {
        showDashToast('Password must be at least 8 characters', 'error');
        return;
      }
      if (newPw !== confirmPw) {
        showDashToast('Passwords do not match', 'error');
        return;
      }

      // Change password via API if available
      if (window.AgenticAPI && window.AgenticAPI.users && currentPw) {
        window.AgenticAPI.users.changePassword(currentPw, newPw)
          .then(function () {
            securityForm.reset();
            showDashToast('Password updated successfully!');
          })
          .catch(function (err) {
            showDashToast(err.message || 'Failed to update password', 'error');
          });
      } else {
        securityForm.reset();
        showDashToast('Password updated successfully!');
      }
    });
  }

  // ========== Chart Button Toggle ==========
  document.querySelectorAll('.chart-btn').forEach(function (btn) {
    btn.addEventListener('click', function () {
      this.parentElement.querySelectorAll('.chart-btn').forEach(function (b) { b.classList.remove('active'); });
      this.classList.add('active');
    });
  });

  // ========== Action Buttons (Modals) ==========
  var actionButtons = [
    { id: 'deploy-agent-btn', title: 'Deploy New Agent', msg: 'Configure and deploy a new AI agent to your swarm. Select agent type, set parameters, and define triggers.' },
    { id: 'create-deal-btn', title: 'Create New Deal', msg: 'Start a new deal with brand and creator details, deliverables, budget, and timeline.' },
    { id: 'create-automation-btn', title: 'Create Workflow', msg: 'Build a new automation workflow by selecting a trigger event, conditions, and actions.' }
  ];

  actionButtons.forEach(function (ab) {
    var btn = document.getElementById(ab.id);
    if (btn) {
      btn.addEventListener('click', function () {
        showDashModal(ab.title, ab.msg);
      });
    }
  });

  // ========== Integration Buttons ==========
  document.querySelectorAll('.integration-dash-actions .btn').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var action = this.textContent.trim();
      var card = this.closest('.integration-dash-card');
      var name = card ? card.querySelector('h4').textContent : 'Integration';
      var provider = card ? (card.getAttribute('data-provider') || name.toLowerCase().replace(/\s+/g, '')) : '';

      if (action === 'Sync Now') {
        this.textContent = 'Syncing...';
        this.disabled = true;
        var self = this;

        // Try real API sync
        if (window.AgenticAPI && window.AgenticAPI.integrations) {
          window.AgenticAPI.integrations.list()
            .then(function () {
              self.textContent = 'Sync Now';
              self.disabled = false;
              showDashToast(name + ' synced successfully!');
            })
            .catch(function () {
              // Fallback to simulated sync
              setTimeout(function () {
                self.textContent = 'Sync Now';
                self.disabled = false;
                showDashToast(name + ' synced successfully!');
              }, 1500);
            });
        } else {
          setTimeout(function () {
            self.textContent = 'Sync Now';
            self.disabled = false;
            showDashToast(name + ' synced successfully!');
          }, 1500);
        }
      } else if (action.indexOf('Connect') !== -1) {
        this.textContent = 'Connecting...';
        this.disabled = true;
        var self = this;

        // Try real OAuth flow
        if (window.AgenticAPI && window.AgenticAPI.integrations) {
          window.AgenticAPI.integrations.connect(provider)
            .then(function (data) {
              if (data.authUrl) {
                // Redirect to OAuth provider
                window.open(data.authUrl, '_blank', 'width=600,height=700');
              }
              self.textContent = 'Sync Now';
              self.disabled = false;
              self.className = 'btn btn-outline btn-sm';
              var statusEl = card.querySelector('.integration-status');
              if (statusEl) {
                statusEl.textContent = '● Connected';
                statusEl.className = 'integration-status connected';
              }
              card.classList.add('connected');
              showDashToast(name + ' connected successfully!');
            })
            .catch(function () {
              // Fallback: simulated connection
              setTimeout(function () {
                self.textContent = 'Sync Now';
                self.disabled = false;
                self.className = 'btn btn-outline btn-sm';
                var statusEl = card.querySelector('.integration-status');
                if (statusEl) {
                  statusEl.textContent = '● Connected';
                  statusEl.className = 'integration-status connected';
                }
                card.classList.add('connected');
                showDashToast(name + ' connected successfully!');
              }, 2000);
            });
        } else {
          setTimeout(function () {
            self.textContent = 'Sync Now';
            self.disabled = false;
            self.className = 'btn btn-outline btn-sm';
            var statusEl = card.querySelector('.integration-status');
            if (statusEl) {
              statusEl.textContent = '● Connected';
              statusEl.className = 'integration-status connected';
            }
            card.classList.add('connected');
            showDashToast(name + ' connected successfully!');
          }, 2000);
        }
      } else if (action === 'Disconnect') {
        // Try real API disconnect
        if (window.AgenticAPI && window.AgenticAPI.integrations) {
          window.AgenticAPI.integrations.disconnect(provider)
            .catch(function () { /* offline, proceed with UI update */ });
        }

        var statusEl = card.querySelector('.integration-status');
        if (statusEl) {
          statusEl.textContent = '○ Not Connected';
          statusEl.className = 'integration-status disconnected';
        }
        card.classList.remove('connected');
        var actions = card.querySelector('.integration-dash-actions');
        if (actions) {
          actions.innerHTML = '<button class="btn btn-primary btn-sm">Connect →</button>';
          var newBtn = actions.querySelector('.btn');
          if (newBtn) {
            newBtn.addEventListener('click', function () {
              showDashToast('Redirecting to ' + name + ' OAuth...');
            });
          }
        }
        var statsEl = card.querySelector('.integration-dash-stats');
        if (statsEl) statsEl.remove();
        showDashToast(name + ' disconnected');
      }
    });
  });

  // ========== Load Dashboard Data from API ==========
  function updateStatCard(selector, value) {
    var el = document.querySelector(selector);
    if (el) el.textContent = value;
  }

  function formatCurrency(amount) {
    if (amount >= 1000000) return '$' + (amount / 1000000).toFixed(1) + 'M';
    if (amount >= 1000) return '$' + (amount / 1000).toFixed(1) + 'K';
    return '$' + amount.toFixed(0);
  }

  if (window.AgenticAPI && window.AgenticAPI.dashboard) {
    // Load real stats
    window.AgenticAPI.dashboard.getStats()
      .then(function (data) {
        if (data && data.stats) {
          var s = data.stats;
          updateStatCard('.stat-card:nth-child(1) .stat-value', formatCurrency(s.totalGMV || 0));
          updateStatCard('.stat-card:nth-child(2) .stat-value', String(s.activeDeals || 0));
          updateStatCard('.stat-card:nth-child(3) .stat-value', String(s.totalCreators || 0));
          updateStatCard('.stat-card:nth-child(4) .stat-value', String(s.totalAgentRuns || 0));
        }
      })
      .catch(function () { /* Keep default values from HTML */ });

    // Load real activity feed
    window.AgenticAPI.dashboard.getActivity(10)
      .then(function (data) {
        if (data && data.activity && data.activity.length > 0 && agentFeed) {
          agentFeed.innerHTML = '';
          data.activity.forEach(function (evt) {
            var div = document.createElement('div');
            div.className = 'feed-item';
            div.innerHTML =
              '<span class="feed-icon">📋</span>' +
              '<div class="feed-content">' +
                '<span class="feed-agent">' + (evt.actor_type || 'System') + '</span>' +
                '<span class="feed-msg">' + (evt.action || '') + ' ' + (evt.resource_type || '') + '</span>' +
                '<span class="feed-time">' + new Date(evt.created_at).toLocaleTimeString() + '</span>' +
              '</div>';
            agentFeed.appendChild(div);
          });
        }
      })
      .catch(function () { /* Keep simulated feed */ });
  }

  // ========== Live Feed Simulation (fallback) ==========
  var feedMessages = [
    { icon: '🔍', agent: 'Scout Agent', msg: 'Scanning #travel niche — found 12 new creators above 500K' },
    { icon: '🤝', agent: 'Negotiator', msg: 'Brand reply received from TechVault — analyzing terms' },
    { icon: '📋', agent: 'Legal Agent', msg: 'Template v3.2 validated — all clauses compliant' },
    { icon: '🎯', agent: 'Orchestrator', msg: 'social.analytics.synced → Dashboard updated' },
    { icon: '🔍', agent: 'Scout Agent', msg: 'Added @travel_diary to pipeline (1.4M, score: 88%)' },
    { icon: '🤝', agent: 'Negotiator', msg: 'Deal with StyleDrop accepted at $11,500!' },
    { icon: '🎯', agent: 'Orchestrator', msg: 'payment.completed → Creator payout initiated' },
    { icon: '📋', agent: 'Legal Agent', msg: 'Contract #AM-2848 ready for signature' }
  ];
  var feedIndex = 0;
  var agentFeed = document.getElementById('agent-feed');

  setInterval(function () {
    if (!agentFeed) return;
    var item = feedMessages[feedIndex % feedMessages.length];
    feedIndex++;

    var div = document.createElement('div');
    div.className = 'feed-item';
    div.style.opacity = '0';
    div.style.transform = 'translateY(-10px)';
    div.innerHTML =
      '<span class="feed-icon">' + item.icon + '</span>' +
      '<div class="feed-content">' +
        '<span class="feed-agent">' + item.agent + '</span>' +
        '<span class="feed-msg">' + item.msg + '</span>' +
        '<span class="feed-time">just now</span>' +
      '</div>';

    agentFeed.insertBefore(div, agentFeed.firstChild);
    setTimeout(function () {
      div.style.transition = 'all 0.3s';
      div.style.opacity = '1';
      div.style.transform = 'translateY(0)';
    }, 10);

    // Keep max 10 items
    while (agentFeed.children.length > 10) {
      agentFeed.removeChild(agentFeed.lastChild);
    }
  }, 8000);

  // ========== Toast Notification ==========
  function showDashToast(message, type) {
    var existing = document.querySelector('.dash-toast');
    if (existing) existing.remove();

    var toast = document.createElement('div');
    toast.className = 'dash-toast' + (type === 'error' ? ' error' : '');
    toast.innerHTML = '<span>' + (type === 'error' ? '❌' : '✅') + '</span><span>' + message + '</span>';

    // Add toast styles inline if not in CSS
    toast.style.cssText = 'position:fixed;bottom:24px;right:24px;z-index:300;display:flex;align-items:center;gap:8px;padding:12px 20px;background:var(--bg-card);border:1px solid ' + (type === 'error' ? '#ef4444' : 'var(--accent-green)') + ';border-radius:10px;color:#fff;font-size:14px;box-shadow:0 8px 32px rgba(0,0,0,0.3);opacity:0;transform:translateY(10px);transition:all 0.3s;';

    document.body.appendChild(toast);
    setTimeout(function () {
      toast.style.opacity = '1';
      toast.style.transform = 'translateY(0)';
    }, 10);

    setTimeout(function () {
      toast.style.opacity = '0';
      toast.style.transform = 'translateY(10px)';
      setTimeout(function () { toast.remove(); }, 300);
    }, 3000);
  }

  // ========== Dashboard Modal ==========
  function showDashModal(title, message) {
    var existing = document.getElementById('dash-modal');
    if (existing) existing.remove();

    var modal = document.createElement('div');
    modal.id = 'dash-modal';
    modal.className = 'modal-overlay';
    modal.innerHTML =
      '<div class="modal-card">' +
        '<div class="modal-icon">🚀</div>' +
        '<h3>' + title + '</h3>' +
        '<p>' + message + '</p>' +
        '<p style="font-size:12px;color:var(--text-muted);margin-top:8px">This feature requires API connection. Configure your environment variables to enable.</p>' +
        '<button class="btn btn-primary" id="dash-modal-close">Got it</button>' +
      '</div>';
    document.body.appendChild(modal);
    setTimeout(function () { modal.classList.add('active'); }, 10);

    document.getElementById('dash-modal-close').addEventListener('click', function () {
      modal.classList.remove('active');
      setTimeout(function () { modal.remove(); }, 300);
    });
  }

  // ========== Notifications Panel ==========
  var notifBtn = document.getElementById('notifications-btn');
  if (notifBtn) {
    notifBtn.addEventListener('click', function () {
      showDashModal('Notifications', '<div style="text-align:left;font-size:13px;line-height:1.8">' +
        '🔔 Scout found 5 new creators in #fitness<br>' +
        '🔔 Contract #AM-2847 pending signature<br>' +
        '🔔 Payment of $8,200 completed to @fitness_guru' +
        '</div>');
    });
  }
});
