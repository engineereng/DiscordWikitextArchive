import 'dotenv/config';

const WIKI_API_URL = process.env.WIKI_API_URL || 'https://siivagunner.wiki/w/api.php';
const WIKI_USERNAME = process.env.WIKI_USERNAME;
const WIKI_PASSWORD = process.env.WIKI_PASSWORD;

let cookies = '';
let csrfToken = null;

async function apiRequest(params, method = 'GET') {
  params.format = 'json';
  const url = new URL(WIKI_API_URL);

  if (method === 'GET') {
    for (const [key, value] of Object.entries(params)) {
      url.searchParams.set(key, value);
    }
    const res = await fetch(url.toString(), {
      headers: { Cookie: cookies },
    });
    updateCookies(res);
    return res.json();
  }

  const body = new URLSearchParams(params);
  const res = await fetch(url.toString(), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Cookie: cookies,
    },
    body: body.toString(),
  });
  updateCookies(res);
  return res.json();
}

function updateCookies(res) {
  const setCookie = res.headers.getSetCookie?.() || [];
  for (const c of setCookie) {
    const name = c.split('=')[0];
    const value = c.split(';')[0];
    const existing = cookies.split('; ').filter(x => x && !x.startsWith(name + '='));
    existing.push(value);
    cookies = existing.join('; ');
  }
}

export async function wikiLogin() {
  if (!WIKI_USERNAME || !WIKI_PASSWORD) {
    throw new Error('WIKI_USERNAME and WIKI_PASSWORD must be set in .env');
  }

  // Step 1: get login token
  const tokenData = await apiRequest({
    action: 'query',
    meta: 'tokens',
    type: 'login',
  });
  const loginToken = tokenData.query.tokens.logintoken;

  // Step 2: log in
  const loginData = await apiRequest({
    action: 'login',
    lgname: WIKI_USERNAME,
    lgpassword: WIKI_PASSWORD,
    lgtoken: loginToken,
  }, 'POST');

  if (loginData.login.result !== 'Success') {
    throw new Error(`Wiki login failed: ${loginData.login.result} - ${loginData.login.reason || ''}`);
  }

  console.log(`Logged in to wiki as ${loginData.login.lgusername}`);
  csrfToken = null;
  return loginData;
}

async function getCsrfToken() {
  if (csrfToken) return csrfToken;

  const data = await apiRequest({
    action: 'query',
    meta: 'tokens',
  });
  csrfToken = data.query.tokens.csrftoken;
  return csrfToken;
}

/**
 * Read the wikitext source of a page.
 * @param {string} title Page title
 * @returns {string|null} Page wikitext, or null if the page doesn't exist
 */
export async function wikiReadPage(title) {
  const data = await apiRequest({
    action: 'query',
    titles: title,
    prop: 'revisions',
    rvprop: 'content',
    rvslots: 'main',
  });

  const pages = Object.values(data.query.pages);
  const page = pages[0];
  if (page.missing !== undefined) return null;
  return page.revisions[0].slots.main['*'];
}

/**
 * Edit (or create) a wiki page.
 * @param {string} title Page title
 * @param {string} content Full page wikitext (replaces existing)
 * @param {string} summary Edit summary
 * @returns {object} API response
 */
export async function wikiEditPage(title, content, summary) {
  const token = await getCsrfToken();
  const data = await apiRequest({
    action: 'edit',
    title,
    text: content,
    summary,
    token,
    bot: '1',
  }, 'POST');

  if (data.error) {
    // Token may have expired; refresh and retry once
    if (data.error.code === 'badtoken') {
      csrfToken = null;
      const freshToken = await getCsrfToken();
      return apiRequest({
        action: 'edit',
        title,
        text: content,
        summary,
        token: freshToken,
        bot: '1',
      }, 'POST');
    }
    throw new Error(`Wiki edit failed: ${data.error.code} - ${data.error.info}`);
  }
  return data;
}

/**
 * Append text to the end of a wiki page (or create it).
 * @param {string} title Page title
 * @param {string} text Text to append
 * @param {string} summary Edit summary
 * @returns {object} API response
 */
export async function wikiAppendToPage(title, text, summary) {
  const token = await getCsrfToken();
  const data = await apiRequest({
    action: 'edit',
    title,
    appendtext: text,
    summary,
    token,
    bot: '1',
  }, 'POST');

  if (data.error) {
    if (data.error.code === 'badtoken') {
      csrfToken = null;
      const freshToken = await getCsrfToken();
      return apiRequest({
        action: 'edit',
        title,
        appendtext: text,
        summary,
        token: freshToken,
        bot: '1',
      }, 'POST');
    }
    throw new Error(`Wiki append failed: ${data.error.code} - ${data.error.info}`);
  }
  return data;
}
