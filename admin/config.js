/* =========================================================
   简历后台 · 配置文件（站长专用）
   ---------------------------------------------------------
   1) Google 登录（推荐）：
      到 https://console.cloud.google.com/apis/credentials 创建
      「OAuth 客户端 ID（Web 应用）」，把授权来源设为你的网站地址
      （例如 https://你的用户名.github.io），然后把 Client ID 填到下面。
   2) 管理员口令：未配置 Google 登录时的备用登录方式，请改成你自己的口令。
   3) allowedEmails：允许登录的 Google 邮箱；留空 = 任意 Google 账号可进入
      （但保存仍需要你的 GitHub Token，所以不会有安全风险）。
   ========================================================= */
window.ADMIN_CONFIG = {
  googleClientId: "",            // 例："1234567890-xxxx.apps.googleusercontent.com"
  allowedEmails: [],             // 例：["zhengmiao@example.com"]
  adminPasscode: "lzm-2026-edit", // ← 请改成你自己的口令！
  repoOwner: "",                 // 留空 = 使用 Token 对应账号
  repoName: "",                  // 留空 = 默认 "<账号>.github.io"
  branch: "main"                 // 简历网站所在分支
};
