// Vercel Edge Middleware: 全站密码保护
// 密码默认 2099，可通过环境变量 PASSWORD 覆盖

export const config = {
  matcher: '/:path*',
};

const COOKIE_NAME = 'worklog_auth';
const SESSION_DAYS = 7;

const PASSWORD = (globalThis.process?.env?.PASSWORD) || '2099';

function getCookie(request, name) {
  const cookieHeader = request.headers.get('cookie') || '';
  const cookies = cookieHeader.split(';').map(s => s.trim());
  for (const c of cookies) {
    const eq = c.indexOf('=');
    if (eq > 0 && c.substring(0, eq).trim() === name) {
      try { return decodeURIComponent(c.substring(eq + 1).trim()); } catch (e) { return null; }
    }
  }
  return null;
}

function isStatic(path) {
  return /\.(css|js|png|jpg|jpeg|gif|svg|ico|woff2?|ttf|map|webp|avif)$/i.test(path);
}

const loginPage = () => `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1.0">
<meta name="robots" content="noindex,nofollow">
<title>访问验证 · 工作记录</title>
<link rel="icon" href="/img/favicon.svg">
<style>
*,*::before,*::after{margin:0;padding:0;box-sizing:border-box}
:root{
  --ink:#11161d;
  --panel:#ffffff;
  --line:#e2e6ec;
  --text:#1d242e;
  --muted:#6b7684;
  --accent:#1f6f5c;
  --accent-strong:#17594a;
  --danger:#a6382c;
}
html,body{height:100%}
body{
  display:flex;align-items:center;justify-content:center;
  padding:24px;
  background:var(--ink);
  color:var(--text);
  font-family:-apple-system,BlinkMacSystemFont,'Segoe UI','PingFang SC','Microsoft YaHei',Roboto,sans-serif;
  -webkit-font-smoothing:antialiased;
}
/* 底纹：细网格 + 顶部一层极淡的暖光，避免整屏单色渐变 */
body::before{
  content:'';position:fixed;inset:0;pointer-events:none;
  background-image:
    linear-gradient(rgba(255,255,255,.045) 1px,transparent 1px),
    linear-gradient(90deg,rgba(255,255,255,.045) 1px,transparent 1px);
  background-size:44px 44px,44px 44px;
}
body::after{
  content:'';position:fixed;inset:0 0 auto 0;height:46vh;pointer-events:none;
  background:linear-gradient(180deg,rgba(196,166,110,.10),rgba(17,22,29,0) 78%);
}
.shell{position:relative;z-index:1;width:100%;max-width:392px}
.brand{display:flex;align-items:center;gap:10px;margin-bottom:18px;padding-left:2px}
.brand-dot{width:9px;height:9px;border-radius:50%;background:#c4a66e;box-shadow:0 0 0 4px rgba(196,166,110,.18)}
.brand-text{color:#e8ecf1;font-size:.95rem;font-weight:600}
.brand-sub{color:#7d8797;font-size:.78rem;margin-left:auto}
.card{
  background:var(--panel);
  border:1px solid var(--line);
  border-radius:8px;
  padding:26px 24px 24px;
  box-shadow:0 24px 48px -24px rgba(0,0,0,.55);
}
h1{font-size:1.05rem;font-weight:650;letter-spacing:0}
.sub{margin-top:6px;color:var(--muted);font-size:.83rem;line-height:1.55}
form{margin-top:20px}
label{display:block;font-size:.78rem;font-weight:600;color:var(--muted);margin-bottom:7px}
.field{position:relative;display:flex;align-items:center}
input{
  width:100%;height:42px;padding:0 44px 0 12px;
  border:1px solid var(--line);border-radius:6px;
  font-size:.95rem;font-family:inherit;color:var(--text);
  background:#fbfcfd;outline:none;
  transition:border-color .15s ease,box-shadow .15s ease,background .15s ease;
}
input::placeholder{color:#a6aeb9}
input:focus{background:#fff;border-color:var(--accent);box-shadow:0 0 0 3px rgba(31,111,92,.14)}
.reveal{
  position:absolute;right:5px;width:34px;height:34px;
  display:flex;align-items:center;justify-content:center;
  border:none;background:transparent;color:#8b95a1;cursor:pointer;border-radius:5px;
}
.reveal:hover{color:var(--text);background:#f1f3f6}
.reveal svg{width:17px;height:17px;display:block}
.reveal .off{display:none}
.reveal[aria-pressed="true"] .on{display:none}
.reveal[aria-pressed="true"] .off{display:block}
button.submit{
  width:100%;height:42px;margin-top:14px;
  border:none;border-radius:6px;cursor:pointer;
  background:var(--accent);color:#fff;
  font-size:.95rem;font-weight:600;font-family:inherit;
  transition:background .15s ease;
}
button.submit:hover{background:var(--accent-strong)}
button.submit:active{transform:translateY(1px)}
form.busy button.submit{background:var(--accent-strong);opacity:.75;cursor:progress}
.err{
  display:none;align-items:flex-start;gap:8px;
  margin-top:16px;padding:9px 11px;
  border:1px solid #eccfca;border-left:3px solid var(--danger);border-radius:5px;
  background:#fdf3f1;color:var(--danger);
  font-size:.82rem;line-height:1.5;
}
.err.show{display:flex}
.err svg{width:15px;height:15px;flex:0 0 auto;margin-top:1px}
.foot{
  margin-top:16px;padding-top:14px;border-top:1px solid var(--line);
  color:var(--muted);font-size:.76rem;line-height:1.6;
}
.tip{margin-top:14px;text-align:center;color:#6d7787;font-size:.74rem}
@media (max-width:420px){
  .card{padding:22px 18px 20px}
  .brand-sub{display:none}
}
@media (prefers-color-scheme:dark){
  :root{
    --panel:#181e26;--line:#2b333d;--text:#e6eaef;--muted:#98a2af;
    --accent:#3f9d84;--accent-strong:#348a73;--danger:#e08b7f;
  }
  input{background:#141a21;color:var(--text)}
  input:focus{background:#141a21;box-shadow:0 0 0 3px rgba(63,157,132,.18)}
  input::placeholder{color:#6c7783}
  .reveal:hover{background:#222a33}
  .err{background:#2a1f1d;border-color:#4a332e}
  button.submit{color:#0d1216}
}
</style>
</head>
<body>
<main class="shell">
  <div class="brand">
    <span class="brand-dot"></span>
    <span class="brand-text">工作记录</span>
    <span class="brand-sub">worklog.yizone.top</span>
  </div>

  <div class="card">
    <h1>需要访问密码</h1>
    <p class="sub">本站为个人工作日志与周报归档，内容仅供受邀查看。</p>

    <p class="err" id="err">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
      <span>密码不正确，请重新输入。</span>
    </p>

    <form method="get" id="form" autocomplete="off">
      <label for="pwd">访问密码</label>
      <div class="field">
        <input id="pwd" type="password" name="pwd" placeholder="请输入密码" autofocus autocomplete="current-password" required>
        <button class="reveal" type="button" id="reveal" aria-pressed="false" aria-label="显示密码" title="显示密码">
          <svg class="on" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7-10-7-10-7z"/><circle cx="12" cy="12" r="3"/></svg>
          <svg class="off" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9.9 4.2A10.9 10.9 0 0 1 12 4c6.4 0 10 7 10 7a18.5 18.5 0 0 1-2.4 3.4"/><path d="M6.6 6.6A18.6 18.6 0 0 0 2 11s3.6 7 10 7a10.9 10.9 0 0 0 4.2-.8"/><path d="M10.6 10.6a2 2 0 0 0 2.8 2.8"/><line x1="2" y1="2" x2="22" y2="22"/></svg>
        </button>
      </div>
      <button class="submit" type="submit" id="submit">进入</button>
    </form>

    <p class="foot">验证通过后 7 天内免重复输入，浏览器清除 Cookie 后需再次验证。</p>
  </div>

  <p class="tip">忘记密码请联系站点所有者</p>
</main>
<script>
(function(){
  var params = new URLSearchParams(location.search);
  var input = document.getElementById('pwd');
  if (params.get('error') === '1') {
    document.getElementById('err').classList.add('show');
    input.focus();
    input.select();
  }
  var reveal = document.getElementById('reveal');
  reveal.addEventListener('click', function(){
    var shown = input.type === 'text';
    input.type = shown ? 'password' : 'text';
    reveal.setAttribute('aria-pressed', String(!shown));
    var label = shown ? '显示密码' : '隐藏密码';
    reveal.setAttribute('aria-label', label);
    reveal.setAttribute('title', label);
    input.focus();
  });
  document.getElementById('form').addEventListener('submit', function(){
    this.classList.add('busy');
    document.getElementById('submit').textContent = '验证中…';
  });
})();
</script>
</body>
</html>`;

export default function handler(request) {
  const url = new URL(request.url);
  const path = url.pathname;

  // 静态资源直接放行
  if (isStatic(path)) {
    return fetch(request);
  }

  // 检查 cookie
  const cookie = getCookie(request, COOKIE_NAME);
  if (cookie === PASSWORD) {
    return fetch(request);
  }

  // 检查 URL 里的密码
  const pwd = url.searchParams.get('pwd');
  if (pwd !== null) {
    if (pwd === PASSWORD) {
      // 密码正确：设 cookie + 跳转到干净路径
      const cleanUrl = new URL(url.origin + url.pathname);
      // 保留其他非 pwd 参数
      url.searchParams.forEach((v, k) => {
        if (k !== 'pwd') cleanUrl.searchParams.set(k, v);
      });
      const maxAge = 60 * 60 * 24 * SESSION_DAYS;
      const cookieVal = `${COOKIE_NAME}=${encodeURIComponent(PASSWORD)}; Path=/; Max-Age=${maxAge}; HttpOnly; SameSite=Lax`;
      return new Response(null, {
        status: 302,
        headers: {
          Location: cleanUrl.toString(),
          'Set-Cookie': cookieVal,
        },
      });
    } else {
      // 密码错误：跳转回登录页 + error 参数
      const errUrl = new URL(url.origin + url.pathname);
      errUrl.searchParams.set('error', '1');
      return new Response(null, {
        status: 302,
        headers: { Location: errUrl.toString() },
      });
    }
  }

  // 默认：登录页
  return new Response(loginPage(), {
    status: 200,
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'no-store',
    },
  });
}
