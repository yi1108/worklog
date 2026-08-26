// Vercel Edge Middleware: 全站密码保护
// 密码默认 2099，可通过环境变量 PASSWORD 覆盖
export const config = {
  matcher: [
    /*
     * 匹配所有路径，除了：
     * - /api (如果有)
     * - _next/static (静态资源)
     * - favicon.ico 等
     * 但我们的 Hexo 静态站简单点：保护所有 HTML 页面
     */
    '/((?!api|_next/static|_next/image|favicon.ico|.*\\.png$|.*\\.jpg$|.*\\.svg$|.*\\.css$|.*\\.js$|.*\\.woff2?$|.*\\.ttf$).*)',
  ],
};

const COOKIE_NAME = 'worklog_auth';
const PASSWORD = process.env.PASSWORD || '2099';
const SESSION_DAYS = 7;

// 简单的 HTML 登录页
const loginPage = (error) => `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>访问验证</title>
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{min-height:100vh;display:flex;align-items:center;justify-content:center;background:linear-gradient(135deg,#2f6df6 0%,#6a5acd 100%);font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif}
.box{background:#fff;padding:32px 28px;border-radius:12px;box-shadow:0 20px 60px rgba(0,0,0,.2);width:320px}
h1{font-size:1.2rem;margin-bottom:16px;color:#333;text-align:center}
input{width:100%;padding:10px 12px;border:1px solid #ddd;border-radius:8px;font-size:1rem;margin-bottom:12px;outline:none;transition:border-color .2s}
input:focus{border-color:#2f6df6}
button{width:100%;padding:10px;background:#2f6df6;color:#fff;border:none;border-radius:8px;font-size:1rem;cursor:pointer;transition:background .2s}
button:hover{background:#285ad8}
.err{color:#e0632f;font-size:.85rem;margin-bottom:12px;text-align:center;${error ? '' : 'display:none'}}
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

  // 检查 cookie
  const cookie = request.cookies.get(COOKIE_NAME)?.value;
  if (cookie === PASSWORD) {
    return NextResponse.next();
  }

  // 检查 URL 密码参数（GET 提交）
  const pwd = url.searchParams.get('pwd');
  if (pwd !== null) {
    if (pwd === PASSWORD) {
      // 密码正确：设 cookie + 重定向（去掉 pwd 参数）
      const cleanUrl = new URL(url.origin + url.pathname);
      // 保留其他参数，去掉 pwd
      url.searchParams.forEach((v, k) => {
        if (k !== 'pwd') cleanUrl.searchParams.set(k, v);
      });
      const response = NextResponse.redirect(cleanUrl);
      response.cookies.set({
        name: COOKIE_NAME,
        value: PASSWORD,
        maxAge: 60 * 60 * 24 * SESSION_DAYS,
        path: '/',
        httpOnly: true,
        sameSite: 'lax',
      });
      return response;
    } else {
      // 密码错误：显示登录页 + 错误提示
      return new Response(loginPage(true), {
        status: 200,
        headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' },
      });
    }
  }

  // 默认：显示登录页
  return new Response(loginPage(false), {
    status: 200,
    headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' },
  });
}
