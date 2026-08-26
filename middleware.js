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
      return decodeURIComponent(c.substring(eq + 1).trim());
    }
  }
  return null;
}

const loginPage = (showError) => `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>访问验证</title>
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{min-height:100vh;display:flex;align-items:center;justify-content:center;background:linear-gradient(135deg,#2f6df6,#6a5acd);font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif}
.box{background:#fff;padding:32px 28px;border-radius:12px;box-shadow:0 20px 60px rgba(0,0,0,.2);width:320px}
h1{font-size:1.2rem;margin-bottom:16px;color:#333;text-align:center}
input{width:100%;padding:10px 12px;border:1px solid #ddd;border-radius:8px;font-size:1rem;margin-bottom:12px;outline:none}
input:focus{border-color:#2f6df6}
button{width:100%;padding:10px;background:#2f6df6;color:#fff;border:none;border-radius:8px;font-size:1rem;cursor:pointer}
button:hover{background:#285ad8}
.err{color:#e0632f;font-size:.85rem;margin-bottom:12px;text-align:center;${showError ? '' : 'display:none'}}
</style>
</head>
<body>
<form class="box" method="get">
<h1>请输入访问密码</h1>
<p class="err">密码错误，请重试</p>
<input type="password" name="pwd" placeholder="密码" autofocus>
<button type="submit">进入</button>
</form>
</body>
</html>`;

export default function handler(request) {
  const url = new URL(request.url);

  // 静态资源直接放行（CSS/JS/图片/字体），避免登录页样式加载不出来
  const path = url.pathname;
  if (/\.(css|js|png|jpg|jpeg|gif|svg|ico|woff2?|ttf|map)$/.test(path)) {
    return fetch(request);
  }

  // 检查 cookie
  const cookie = getCookie(request, COOKIE_NAME);
  if (cookie === PASSWORD) {
    return fetch(request);
  }

  // 检查 URL 密码参数
  const pwd = url.searchParams.get('pwd');
  if (pwd !== null) {
    if (pwd === PASSWORD) {
      const cleanUrl = new URL(url.origin + url.pathname);
      url.searchParams.forEach((v, k) => {
        if (k !== 'pwd') cleanUrl.searchParams.set(k, v);
      });
      const maxAge = 60 * 60 * 24 * SESSION_DAYS;
      return Response.redirect(cleanUrl.toString(), 302, {
        headers: {
          'Set-Cookie': `${COOKIE_NAME}=${encodeURIComponent(PASSWORD)}; Path=/; Max-Age=${maxAge}; HttpOnly; SameSite=Lax`,
        },
      });
    } else {
      return new Response(loginPage(true), {
        status: 200,
        headers: {
          'Content-Type': 'text/html; charset=utf-8',
          'Cache-Control': 'no-store',
        },
      });
    }
  }

  // 默认显示登录页
  return new Response(loginPage(false), {
    status: 200,
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'no-store',
    },
  });
}
