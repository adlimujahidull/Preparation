/**
 * github.js — Satu-satunya modul pemanggil GitHub REST API
 * Menangani otentikasi PAT, pembacaan file dengan cache SHA, penulisan file aman base64 UTF-8,
 * dan deteksi konflik HTTP 409.
 */

const GitHubAPI = (() => {
  const STORAGE_KEY = 'ai200_github_config';
  const shaCache = new Map();

  function getConfig() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch (e) {
      console.error('Gagal membaca config dari localStorage:', e);
      return null;
    }
  }

  function setConfig(cfg) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      owner: cfg.owner.trim(),
      repo: cfg.repo.trim(),
      branch: (cfg.branch || 'main').trim(),
      token: cfg.token.trim()
    }));
  }

  function clearConfig() {
    localStorage.removeItem(STORAGE_KEY);
    shaCache.clear();
  }

  function hasConfig() {
    const cfg = getConfig();
    return !!(cfg && cfg.owner && cfg.repo && cfg.token);
  }

  function getMaskedToken() {
    const cfg = getConfig();
    if (!cfg || !cfg.token) return '';
    const t = cfg.token.trim();
    if (t.length <= 4) return '••••';
    return '••••••••' + t.slice(-4);
  }

  function getHeaders(token) {
    const t = token || (getConfig() ? getConfig().token : '');
    return {
      'Accept': 'application/vnd.github+json',
      'Authorization': `Bearer ${t}`,
      'X-GitHub-Api-Version': '2022-11-28',
      'Content-Type': 'application/json'
    };
  }

  // UTF-8 safe Base64 Encoder/Decoder
  function utf8ToBase64(str) {
    const bytes = new TextEncoder().encode(str);
    let binary = '';
    const len = bytes.byteLength;
    for (let i = 0; i < len; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return window.btoa(binary);
  }

  function base64ToUtf8(b64) {
    const cleanB64 = b64.replace(/\s/g, '');
    const binary = window.atob(cleanB64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return new TextDecoder().decode(bytes);
  }

  async function validateRepo(owner, repo, branch, token) {
    const url = `https://api.github.com/repos/${owner}/${repo}`;
    try {
      const resp = await fetch(url, {
        method: 'GET',
        headers: getHeaders(token)
      });

      if (resp.status === 401) {
        return { ok: false, error: 'Token GitHub tidak valid atau telah kedaluwarsa.' };
      }
      if (resp.status === 404) {
        return { ok: false, error: `Repositori "${owner}/${repo}" tidak ditemukan atau token tidak memiliki izin akses.` };
      }
      if (resp.status === 403) {
        return { ok: false, error: 'Akses ditolak (403). Periksa permission token (Contents: Read and write) atau limit API.' };
      }
      if (!resp.ok) {
        return { ok: false, error: `GitHub API error (HTTP ${resp.status}): ${resp.statusText}` };
      }

      const repoData = await resp.json();

      // Check branch existence
      const targetBranch = branch || 'main';
      const branchResp = await fetch(`https://api.github.com/repos/${owner}/${repo}/branches/${targetBranch}`, {
        method: 'GET',
        headers: getHeaders(token)
      });

      if (!branchResp.ok && branchResp.status === 404) {
        return { ok: false, error: `Branch "${targetBranch}" tidak ditemukan pada repositori "${owner}/${repo}".` };
      }

      return { ok: true, data: repoData };
    } catch (e) {
      return { ok: false, error: `Koneksi gagal: ${e.message}. Pastikan perangkat Anda terhubung ke internet.` };
    }
  }

  async function getFile(path) {
    const cfg = getConfig();
    if (!cfg) throw new Error('Konfigurasi GitHub belum diatur.');

    const url = `https://api.github.com/repos/${cfg.owner}/${cfg.repo}/contents/${path}?ref=${cfg.branch}`;
    const resp = await fetch(url, {
      method: 'GET',
      headers: getHeaders()
    });

    if (resp.status === 404) {
      return null;
    }
    if (!resp.ok) {
      throw new Error(`Gagal membaca ${path} (HTTP ${resp.status}): ${resp.statusText}`);
    }

    const data = await resp.json();
    if (data.sha) {
      shaCache.set(path, data.sha);
    }

    if (data.encoding === 'base64' && data.content) {
      const decoded = base64ToUtf8(data.content);
      return { content: decoded, sha: data.sha };
    }

    return { content: '', sha: data.sha };
  }

  async function putFile(path, contentStr, commitMessage) {
    const cfg = getConfig();
    if (!cfg) throw new Error('Konfigurasi GitHub belum diatur.');

    const url = `https://api.github.com/repos/${cfg.owner}/${cfg.repo}/contents/${path}`;
    const currentSha = shaCache.get(path);

    const payload = {
      message: commitMessage || `Update ${path}`,
      content: utf8ToBase64(contentStr),
      branch: cfg.branch
    };

    if (currentSha) {
      payload.sha = currentSha;
    }

    const resp = await fetch(url, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify(payload)
    });

    if (resp.status === 409) {
      const err = new Error(`Konflik commit (409) pada file ${path}. Data di repositori telah diubah dari perangkat lain.`);
      err.isConflict = true;
      err.filePath = path;
      throw err;
    }

    if (!resp.ok) {
      const errorDetail = await resp.json().catch(() => ({}));
      throw new Error(`Gagal menyimpan ${path} (HTTP ${resp.status}): ${errorDetail.message || resp.statusText}`);
    }

    const resData = await resp.json();
    if (resData.content && resData.content.sha) {
      shaCache.set(path, resData.content.sha);
    }

    return resData;
  }

  async function listDir(path) {
    const cfg = getConfig();
    if (!cfg) throw new Error('Konfigurasi GitHub belum diatur.');

    const url = `https://api.github.com/repos/${cfg.owner}/${cfg.repo}/contents/${path}?ref=${cfg.branch}`;
    const resp = await fetch(url, {
      method: 'GET',
      headers: getHeaders()
    });

    if (resp.status === 404) return [];
    if (!resp.ok) {
      throw new Error(`Gagal melist direktori ${path} (HTTP ${resp.status})`);
    }

    const data = await resp.json();
    if (Array.isArray(data)) {
      data.forEach(item => {
        if (item.sha && item.path) {
          shaCache.set(item.path, item.sha);
        }
      });
      return data;
    }
    return [];
  }

  function setCachedSha(path, sha) {
    shaCache.set(path, sha);
  }

  function getCachedSha(path) {
    return shaCache.get(path);
  }

  return {
    getConfig,
    setConfig,
    clearConfig,
    hasConfig,
    getMaskedToken,
    validateRepo,
    getFile,
    putFile,
    listDir,
    setCachedSha,
    getCachedSha
  };
})();

window.GitHubAPI = GitHubAPI;
