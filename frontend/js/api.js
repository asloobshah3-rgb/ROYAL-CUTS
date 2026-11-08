(function () {
  function escapeHtml(value) {
    return String(value == null ? '' : value).replace(/[&<>"']/g, (character) => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
    }[character]));
  }

  function safeUrl(value) {
    try {
      const url = new URL(value, window.location.origin);
      return ['http:', 'https:'].includes(url.protocol) ? url.href : '';
    } catch (error) {
      return '';
    }
  }

  async function api(path, options) {
    const config = Object.assign({ credentials: 'same-origin' }, options || {});
    config.headers = Object.assign({}, config.headers || {});
    if (config.body && typeof config.body !== 'string') {
      config.headers['Content-Type'] = 'application/json';
      config.body = JSON.stringify(config.body);
    }
    const response = await fetch(`/api${path}`, config);
    let data;
    try {
      data = await response.json();
    } catch (error) {
      throw new Error('The server returned an invalid response. Please try again.');
    }
    if (!response.ok) {
      const error = new Error(data.message || `Request failed (${response.status}).`);
      error.status = response.status;
      throw error;
    }
    return data;
  }

  function setMessage(element, message, kind) {
    if (!element) return;
    element.textContent = message || '';
    element.className = `form-message${kind ? ` ${kind}` : ''}`;
  }

  window.RC = { api, escapeHtml, safeUrl, setMessage };
}());
