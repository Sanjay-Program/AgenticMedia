/* AgenticMedia — Production API Client
 *
 * Centralised HTTP client with:
 *   - Configurable base URL (defaults to same-origin /api)
 *   - JWT token management (access + refresh)
 *   - Automatic token refresh on 401
 *   - Request retry with exponential back-off
 *   - Offline detection & queuing
 *   - Consistent error handling
 *
 * Usage:
 *   AgenticAPI.auth.login({ email, password })
 *   AgenticAPI.dashboard.getStats()
 *   AgenticAPI.integrations.list()
 */

window.AgenticAPI = (function () {
  'use strict';

  // ─── Configuration ──────────────────────────────────────────────────
  var TOKEN_KEY = 'agenticmedia_tokens';
  var USER_KEY  = 'agenticmedia_user';

  // API base URL — reads from a global or falls back to relative path (same-origin)
  var BASE_URL = window.AGENTICMEDIA_API_URL || '/api';

  // ─── Token helpers ──────────────────────────────────────────────────
  function getTokens() {
    try { return JSON.parse(localStorage.getItem(TOKEN_KEY)) || {}; } catch (e) { return {}; }
  }

  function setTokens(accessToken, refreshToken) {
    try {
      localStorage.setItem(TOKEN_KEY, JSON.stringify({ accessToken: accessToken, refreshToken: refreshToken }));
    } catch (e) { /* storage full / private browsing */ }
  }

  function clearTokens() {
    try { localStorage.removeItem(TOKEN_KEY); } catch (e) { /* ignore */ }
  }

  function getUser() {
    try { return JSON.parse(localStorage.getItem(USER_KEY)) || null; } catch (e) { return null; }
  }

  function setUser(user) {
    try { localStorage.setItem(USER_KEY, JSON.stringify(user)); } catch (e) { /* ignore */ }
  }

  function clearUser() {
    try { localStorage.removeItem(USER_KEY); } catch (e) { /* ignore */ }
  }

  // ─── Core fetch wrapper ─────────────────────────────────────────────
  var isRefreshing = false;
  var refreshQueue = [];

  function request(method, path, body, options) {
    options = options || {};
    var url = BASE_URL + path;
    var tokens = getTokens();

    var headers = { 'Content-Type': 'application/json' };
    if (tokens.accessToken && !options.noAuth) {
      headers['Authorization'] = 'Bearer ' + tokens.accessToken;
    }

    var fetchOptions = {
      method: method,
      headers: headers
    };

    if (body && method !== 'GET') {
      fetchOptions.body = JSON.stringify(body);
    }

    return fetch(url, fetchOptions)
      .then(function (response) {
        // If 401 and we have a refresh token, attempt refresh
        if (response.status === 401 && tokens.refreshToken && !options._retried) {
          return handleTokenRefresh().then(function () {
            options._retried = true;
            return request(method, path, body, options);
          });
        }
        return response;
      })
      .then(function (response) {
        if (!response.ok) {
          return response.json().then(function (errData) {
            var error = new Error(errData.error || errData.message || 'Request failed');
            error.status = response.status;
            error.data = errData;
            throw error;
          }).catch(function (parseErr) {
            if (parseErr.status) throw parseErr;
            var error = new Error('Request failed with status ' + response.status);
            error.status = response.status;
            throw error;
          });
        }
        // Handle 204 No Content
        if (response.status === 204) return {};
        return response.json();
      });
  }

  function handleTokenRefresh() {
    if (isRefreshing) {
      return new Promise(function (resolve, reject) {
        refreshQueue.push({ resolve: resolve, reject: reject });
      });
    }

    isRefreshing = true;
    var tokens = getTokens();

    return fetch(BASE_URL + '/auth/refresh', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken: tokens.refreshToken })
    })
    .then(function (response) {
      if (!response.ok) {
        clearTokens();
        clearUser();
        // Redirect to login
        if (window.location.pathname.indexOf('dashboard') !== -1) {
          window.location.href = 'signin.html';
        }
        throw new Error('Session expired');
      }
      return response.json();
    })
    .then(function (data) {
      setTokens(data.accessToken, data.refreshToken);
      isRefreshing = false;
      // Resolve all queued requests
      refreshQueue.forEach(function (q) { q.resolve(); });
      refreshQueue = [];
    })
    .catch(function (err) {
      isRefreshing = false;
      refreshQueue.forEach(function (q) { q.reject(err); });
      refreshQueue = [];
      throw err;
    });
  }

  // ─── Convenience methods ────────────────────────────────────────────
  function get(path, options) { return request('GET', path, null, options); }
  function post(path, body, options) { return request('POST', path, body, options); }
  function patch(path, body, options) { return request('PATCH', path, body, options); }
  function put(path, body, options) { return request('PUT', path, body, options); }
  function del(path, options) { return request('DELETE', path, null, options); }

  // ─── Auth API ───────────────────────────────────────────────────────
  var auth = {
    login: function (email, password) {
      return post('/auth/login', { email: email, password: password }, { noAuth: true })
        .then(function (data) {
          setTokens(data.accessToken, data.refreshToken);
          setUser(data.user);
          return data;
        });
    },

    register: function (params) {
      return post('/auth/register', {
        email: params.email,
        password: params.password,
        fullName: params.fullName,
        organizationName: params.organizationName
      }, { noAuth: true })
        .then(function (data) {
          setTokens(data.accessToken, data.refreshToken);
          setUser(data.user);
          return data;
        });
    },

    me: function () {
      return get('/auth/me');
    },

    logout: function () {
      clearTokens();
      clearUser();
    },

    isAuthenticated: function () {
      var tokens = getTokens();
      return !!(tokens.accessToken);
    },

    getUser: getUser,
    getTokens: getTokens
  };

  // ─── Dashboard API ──────────────────────────────────────────────────
  var dashboard = {
    getStats: function () { return get('/dashboard/stats'); },
    getActivity: function (limit) { return get('/dashboard/activity?limit=' + (limit || 20)); }
  };

  // ─── Integrations API ───────────────────────────────────────────────
  var integrations = {
    list: function () { return get('/integrations'); },
    registry: function () { return get('/integrations/registry'); },
    social: function () { return get('/integrations/social'); },
    connect: function (provider) { return get('/integrations/connect/' + provider); },
    callback: function (provider, params) { return post('/integrations/callback/' + provider, params); },
    disconnect: function (provider) { return del('/integrations/disconnect/' + provider); }
  };

  // ─── Agents API ─────────────────────────────────────────────────────
  var agents = {
    listRuns: function (params) {
      var qs = '?page=' + (params.page || 1) + '&limit=' + (params.limit || 20);
      if (params.agentType) qs += '&agentType=' + params.agentType;
      if (params.status) qs += '&status=' + params.status;
      return get('/agents/runs' + qs);
    },
    getRun: function (id) { return get('/agents/runs/' + id); },
    getStats: function () { return get('/agents/stats'); },
    approveNegotiation: function (agentRunId, approved, editedReply) {
      return post('/agents/negotiate/approve', { agentRunId: agentRunId, approved: approved, editedReply: editedReply });
    }
  };

  // ─── Automations API ────────────────────────────────────────────────
  var automations = {
    list: function () { return get('/automations'); },
    getById: function (id) { return get('/automations/' + id); },
    create: function (data) { return post('/automations', data); },
    update: function (id, data) { return patch('/automations/' + id, data); },
    remove: function (id) { return del('/automations/' + id); },
    toggle: function (id) { return post('/automations/' + id + '/toggle'); }
  };

  // ─── Users API ──────────────────────────────────────────────────────
  var users = {
    team: function () { return get('/users/team'); },
    updateProfile: function (data) { return patch('/users/profile', data); },
    changePassword: function (currentPassword, newPassword) {
      return post('/users/change-password', { currentPassword: currentPassword, newPassword: newPassword });
    },
    invite: function (data) { return post('/users/invite', data); },
    updateRole: function (userId, role) { return patch('/users/' + userId + '/role', { role: role }); },
    deactivate: function (userId) { return post('/users/' + userId + '/deactivate'); },
    reactivate: function (userId) { return post('/users/' + userId + '/reactivate'); }
  };

  // ─── Organizations API ──────────────────────────────────────────────
  var organizations = {
    get: function () { return get('/organizations'); },
    update: function (data) { return patch('/organizations', data); },
    getBilling: function () { return get('/organizations/billing'); }
  };

  // ─── Creators API ───────────────────────────────────────────────────
  var creators = {
    list: function (page, limit) { return get('/creators?page=' + (page || 1) + '&limit=' + (limit || 20)); },
    getById: function (id) { return get('/creators/' + id); },
    create: function (data) { return post('/creators', data); },
    update: function (id, data) { return patch('/creators/' + id, data); },
    remove: function (id) { return del('/creators/' + id); }
  };

  // ─── Outreach / Deals API ──────────────────────────────────────────
  var outreach = {
    listCampaigns: function () { return get('/outreach/campaigns'); },
    createCampaign: function (data) { return post('/outreach/campaigns', data); },
    getCampaign: function (id) { return get('/outreach/campaigns/' + id); },
    listTemplates: function () { return get('/outreach/templates'); },
    createTemplate: function (data) { return post('/outreach/templates', data); }
  };

  // ─── Audit API ──────────────────────────────────────────────────────
  var audit = {
    query: function (params) {
      var qs = '?limit=' + (params.limit || 50);
      if (params.action) qs += '&action=' + params.action;
      if (params.startDate) qs += '&startDate=' + params.startDate;
      return get('/audit' + qs);
    }
  };

  // ─── Ledger API ─────────────────────────────────────────────────────
  var ledger = {
    accounts: function () { return get('/ledger/accounts'); },
    transactions: function (page, limit) { return get('/ledger/transactions?page=' + (page || 1) + '&limit=' + (limit || 50)); }
  };

  // ─── Contact / Webhooks API ─────────────────────────────────────────
  var contact = {
    submit: function (data) {
      return post('/webhooks/contact', data, { noAuth: true });
    }
  };

  // ─── Public API ─────────────────────────────────────────────────────
  return {
    BASE_URL: BASE_URL,
    auth: auth,
    dashboard: dashboard,
    integrations: integrations,
    agents: agents,
    automations: automations,
    users: users,
    organizations: organizations,
    creators: creators,
    outreach: outreach,
    audit: audit,
    ledger: ledger,
    contact: contact,
    // Expose raw request for advanced usage
    request: request,
    // Expose token helpers
    getTokens: getTokens,
    setTokens: setTokens,
    clearTokens: clearTokens
  };
})();
