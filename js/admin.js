/* ============================================================
   LEGO 简历 · 站长后台 admin.js (Zero-Latency Realtime Sync Edition)
   实时广播同步 + 图片自动压缩防超限 + 防缓存 SHA 校验 + GitHub API 直连发布
   ============================================================ */
(function () {
  "use strict";

  var DEFAULT_PASS = "lego2026";
  var DEFAULT_REPO = "sjyiii123-creator/sjyiii123-creator.github.io";
  var LS = {
    pass: "lego_admin_pass",
    token: "lego_gh_token",
    repo: "lego_gh_repo",
    draft: "lego_draft",
    live: "lego_live_content"
  };

  var state = null;
  var dirty = false;
  var syncChannel = null;
  try {
    if ("BroadcastChannel" in window) {
      syncChannel = new BroadcastChannel("lego_resume_sync");
    }
  } catch (e) {}

  /* ---------- 工具 ---------- */
  function $(s, r) { return (r || document).querySelector(s); }
  function $$(s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); }
  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (m) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[m];
    });
  }
  function getPath(obj, path) {
    return path.split(".").reduce(function (o, k) { return o == null ? o : o[k]; }, obj);
  }
  function broadcastLiveState() {
    if (!state) return;
    state._updatedAt = Date.now();
    try {
      var raw = JSON.stringify(state);
      localStorage.setItem(LS.live, raw);
      localStorage.setItem(LS.draft, raw);
      if (syncChannel) syncChannel.postMessage({ type: "CONTENT_UPDATED", data: state });
    } catch (e) {}
  }
  function setPath(obj, path, val) {
    var keys = path.split(".");
    var last = keys.pop();
    var target = keys.reduce(function (o, k) { return o[k]; }, obj);
    target[last] = val;
    dirty = true;
    broadcastLiveState();
  }
  function status(msg, kind, busy) {
    var bar = $("#statusBar");
    if (!bar) return;
    bar.className = "status " + (kind || "info");
    bar.innerHTML = (busy ? '<span class="spinner"></span> ' : "") + esc(msg);
  }
  function b64utf8(str) {
    var bytes = new TextEncoder().encode(str);
    var chunk = 0x8000;
    var parts = [];
    for (var i = 0; i < bytes.length; i += chunk) {
      parts.push(String.fromCharCode.apply(null, bytes.subarray(i, i + chunk)));
    }
    return btoa(parts.join(""));
  }
  function b64decodeUtf8(b64) {
    var clean = String(b64 || "").replace(/\s+/g, "");
    var bin = atob(clean);
    var bytes = new Uint8Array(bin.length);
    for (var i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    return new TextDecoder("utf-8").decode(bytes);
  }

  /* 自动压缩上传图片（限制最大宽高 800px，避免 Base64 超过 GitHub API 1MB 限制导致发布失败） */
  function compressImageFile(file, callback) {
    if (file.type === "image/svg+xml") {
      var rSvg = new FileReader();
      rSvg.onload = function () { callback(rSvg.result); };
      rSvg.readAsDataURL(file);
      return;
    }
    var reader = new FileReader();
    reader.onload = function () {
      var img = new Image();
      img.onload = function () {
        var maxSide = 800;
        var w = img.width || 400;
        var h = img.height || 400;
        if (w > maxSide || h > maxSide) {
          if (w > h) { h = Math.round(h * maxSide / w); w = maxSide; }
          else { w = Math.round(w * maxSide / h); h = maxSide; }
        }
        var canvas = document.createElement("canvas");
        canvas.width = w;
        canvas.height = h;
        var ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0, w, h);
        var out = canvas.toDataURL("image/jpeg", 0.85);
        callback(out);
      };
      img.onerror = function () { callback(reader.result); };
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  }

  /* ---------- 表单小部件 ---------- */
  function field(label, path, opts) {
    opts = opts || {};
    var v = esc(getPath(state, path));
    var input;
    if (opts.type === "textarea") {
      input = '<textarea data-path="' + path + '" rows="' + (opts.rows || 3) + '">' + v + "</textarea>";
    } else if (opts.type === "number") {
      input = '<input type="number" data-path="' + path + '" value="' + v + '" min="' + (opts.min != null ? opts.min : 0) + '" max="' + (opts.max != null ? opts.max : 100) + '">';
    } else {
      input = '<input type="text" data-path="' + path + '" value="' + v + '" placeholder="' + esc(opts.ph || "") + '">';
    }
    return '<div class="field' + (opts.full ? " full" : "") + '"><label>' + esc(label) + "</label>" + input + "</div>";
  }
  function card(studsHtml, inner) {
    return '<div class="card"><div class="card-studs">' + (studsHtml || "<i></i><i></i><i></i><i></i>") + "</div>" + inner + "</div>";
  }
  function itemCard(title, idx, section, inner) {
    return '<div class="item-card"><h4>' + esc(title) + "</h4>" +
      '<div class="item-actions">' +
      '<button type="button" class="mini mini-up" data-act="up" data-sec="' + section + '" data-idx="' + idx + '">▲ 上移</button>' +
      '<button type="button" class="mini mini-down" data-act="down" data-sec="' + section + '" data-idx="' + idx + '">▼ 下移</button>' +
      '<button type="button" class="mini mini-del" data-act="del" data-sec="' + section + '" data-idx="' + idx + '">✕ 删除</button>' +
      "</div>" + inner + "</div>";
  }

  /* ============================================================
     各面板渲染
     ============================================================ */
  function renderProfile() {
    var pImg = getPath(state, "profile.photo") || "assets/avatar-placeholder.svg";
    var dispPath = pImg.indexOf("data:") === 0 ? "[已内嵌压缩图片]" : pImg;
    $("#p-profile").innerHTML = card(null,
      '<div class="grid">' +
      field("姓名", "profile.name") +
      field("职位头衔", "profile.title") +
      field("座右铭", "profile.motto", { full: true }) +
      field("侧边栏署名（英文）", "profile.sidebarSlogan") +
      field("头像文字（1-2 字）", "profile.avatarText") +
      '<div class="img-row field full" style="margin-top:8px">' +
      '<img class="img-preview" src="' + esc(pImg) + '" alt="个人照片预览" style="width:110px;height:130px;object-fit:cover">' +
      '<div class="field" style="flex:1;min-width:220px"><label>个人照片（首屏动态 LEGO 城堡相框 · 上传自动压缩并实时同步）</label>' +
      '<input type="file" accept="image/*" data-upload="profile.photo">' +
      '<input type="text" data-path="profile.photo" value="' + esc(dispPath) + '" placeholder="图片路径或 URL" style="margin-top:8px"></div></div>' +
      field("页脚文字", "footer", { full: true }) +
      "</div>");
  }

  function renderWelcome() {
    $("#p-welcome").innerHTML = card(null,
      '<div class="grid">' +
      field("小标签（如 WELCOME）", "welcome.eyebrow") +
      field("按钮文字", "welcome.button") +
      field("欢迎标题", "welcome.title", { full: true }) +
      field("副标题 / 引导语", "welcome.subtitle", { type: "textarea", rows: 2, full: true }) +
      "</div>");
  }

  function renderAbout() {
    $("#p-about").innerHTML =
      card(null, '<div class="grid">' + field("章节标题", "about.title") +
        field("自我介绍", "about.text", { type: "textarea", rows: 7, full: true }) + "</div>") +
      '<div class="card"><div class="card-studs"><i></i><i></i><i></i></div><h4 style="margin-bottom:14px;color:var(--blue);letter-spacing:2px">亮点积木（也可作为首屏数字）</h4>' +
      (state.about.highlights || []).map(function (h, i) {
        return '<div class="list-row">' +
          '<input type="text" data-path="about.highlights.' + i + '.icon" value="' + esc(h.icon) + '" style="max-width:88px" title="图标">' +
          '<input type="text" data-path="about.highlights.' + i + '.text" value="' + esc(h.text) + '">' +
          '<button type="button" class="mini mini-del" data-act="del" data-sec="about.highlights" data-idx="' + i + '">✕</button></div>';
      }).join("") +
      '<button type="button" class="add-btn" data-act="add" data-sec="about.highlights">＋ 添加亮点</button></div>';
  }

  function renderExp() {
    $("#p-exp").innerHTML =
      (state.experience || []).map(function (e, i) {
        return itemCard((e.company || "未命名公司") + " · " + (e.role || ""), i, "experience",
          '<div class="grid">' +
          field("公司名称", "experience." + i + ".company") +
          field("职位", "experience." + i + ".role") +
          field("时间段", "experience." + i + ".period") +
          field("城市", "experience." + i + ".location") +
          field("一句话描述", "experience." + i + ".desc", { full: true }) +
          "</div>" +
          '<div class="field full" style="margin-top:12px"><label>工作要点（每行一条）</label>' +
          '<textarea data-path="experience.' + i + '.bullets" data-lines="1" rows="4">' + esc((e.bullets || []).join("\n")) + "</textarea></div>" +
          '<div class="field full" style="margin-top:12px"><label>标签（逗号分隔）</label>' +
          '<input type="text" data-path="experience.' + i + '.tags" data-csv="1" value="' + esc((e.tags || []).join(", ")) + '"></div>');
      }).join("") +
      '<button type="button" class="add-btn" data-act="add" data-sec="experience">＋ 添加一份工作经历</button>';
  }

  function renderSkills() {
    $("#p-skills").innerHTML =
      (state.skills || []).map(function (g, gi) {
        return itemCard(g.group || "未命名分组", gi, "skills",
          '<div class="grid">' + field("分组名称", "skills." + gi + ".group", { full: true }) + "</div>" +
          (g.items || []).map(function (s, si) {
            return '<div class="bar-row">' +
              '<input type="text" data-path="skills.' + gi + '.items.' + si + '.name" value="' + esc(s.name) + '">' +
              '<input type="number" data-path="skills.' + gi + '.items.' + si + '.level" data-num="1" value="' + esc(s.level) + '" min="0" max="100">' +
              '<div class="bar-mini"><span style="width:' + esc(s.level) + '%"></span></div>' +
              '<button type="button" class="mini mini-del" data-act="del" data-sec="skills.' + gi + '.items" data-idx="' + si + '">✕</button></div>';
          }).join("") +
          '<button type="button" class="add-btn" data-act="add" data-sec="skills.' + gi + '.items">＋ 添加技能</button>');
      }).join("") +
      '<button type="button" class="add-btn" data-act="add" data-sec="skills">＋ 添加技能分组</button>';
  }

  function renderProjects() {
    $("#p-projects").innerHTML =
      (state.projects || []).map(function (p, i) {
        var dispImg = (p.image || "").indexOf("data:") === 0 ? "[已内嵌压缩图片]" : (p.image || "");
        return itemCard("项目 " + (i + 1) + " · " + (p.title || "未命名"), i, "projects",
          '<div class="grid">' +
          field("项目名称", "projects." + i + ".title", { full: true }) +
          field("项目描述", "projects." + i + ".desc", { type: "textarea", rows: 3, full: true }) +
          "</div>" +
          '<div class="img-row" style="margin-top:12px">' +
          '<img class="img-preview" src="' + esc(p.image) + '" alt="预览">' +
          '<div class="field" style="flex:1;min-width:220px"><label>图片（上传本地图片自动压缩，或填写图片链接）</label>' +
          '<input type="file" accept="image/*" data-upload="projects.' + i + '.image">' +
          '<input type="text" data-path="projects.' + i + '.image" value="' + esc(dispImg) + '" style="margin-top:8px"></div></div>' +
          '<div class="field full" style="margin-top:12px"><label>标签（逗号分隔）</label>' +
          '<input type="text" data-path="projects.' + i + '.tags" data-csv="1" value="' + esc((p.tags || []).join(", ")) + '"></div>' +
          '<div class="field full" style="margin-top:12px"><label>项目链接（可留空）</label>' +
          '<input type="text" data-path="projects.' + i + '.link" value="' + esc(p.link) + '"></div>');
      }).join("") +
      '<button type="button" class="add-btn" data-act="add" data-sec="projects">＋ 添加项目</button>';
  }

  function renderEdu() {
    $("#p-edu").innerHTML =
      (state.education || []).map(function (e, i) {
        return itemCard(e.school || "未命名学校", i, "education",
          '<div class="grid">' +
          field("学校", "education." + i + ".school") +
          field("学位", "education." + i + ".degree") +
          field("专业", "education." + i + ".major") +
          field("时间段", "education." + i + ".period") +
          field("描述", "education." + i + ".desc", { type: "textarea", rows: 3, full: true }) +
          "</div>");
      }).join("") +
      '<button type="button" class="add-btn" data-act="add" data-sec="education">＋ 添加教育经历</button>';
  }

  function renderContact() {
    $("#p-contact").innerHTML = card(null,
      '<div class="grid">' +
      field("章节标题", "contact.title") +
      field("说明文字", "contact.note") +
      field("邮箱", "contact.email") +
      field("电话", "contact.phone") +
      field("微信号", "contact.wechat") +
      field("GitHub 主页链接", "contact.github") +
      field("所在地", "contact.location") +
      "</div>" +
      '<div class="note" style="margin-top:18px">🔒 访客打开网站时<b>只能查看并联系你</b>（发邮件 / 打电话 / 留言），没有任何编辑入口。只有在本后台输入密码 + Token 的你才能修改内容。</div>');
  }

  function renderSettings() {
    var token = localStorage.getItem(LS.token) || "";
    var repo = localStorage.getItem(LS.repo) || DEFAULT_REPO;
    $("#p-settings").innerHTML = card(null,
      '<div class="grid">' +
      '<div class="field full"><label>GitHub Token（只保存在本浏览器，不会上传第三方）</label>' +
      '<input type="password" id="setToken" value="' + esc(token) + '" placeholder="ghp_ 或 github_pat_ 开头的 Token"></div>' +
      '<div class="field full"><label>目标仓库（格式：用户名/仓库名）</label>' +
      '<input type="text" id="setRepo" value="' + esc(repo) + '" placeholder="例如：sjyiii123-creator/sjyiii123-creator.github.io"></div>' +
      "</div>" +
      '<div style="display:flex;gap:12px;margin-top:18px;flex-wrap:wrap">' +
      '<button type="button" class="btn btn-navy" id="btnSaveCfg">💾 保存配置</button>' +
      '<button type="button" class="btn btn-yellow" id="btnVerify">🔍 验证 Token 并自动找仓库</button>' +
      "</div>" +
      '<div class="note" style="margin-top:20px"><b>⚡ 零延迟实时更新机制：</b><br>1. 你在后台修改或点击「发布」的瞬间，同浏览器的前台页面会通过 <code>BroadcastChannel + localStorage</code> <b>0 秒实时更新</b>。<br>2. 点击底部「🚀 发布到 GitHub」后，前台会自动直连 GitHub 实时接口（绕过 GitHub Pages 静态 CDN 缓存），任何设备刷新均可<b>秒级同步最新内容</b>！</div>' +
      '<div class="card" style="margin-top:22px"><div class="card-studs"><i></i><i></i><i></i></div>' +
      '<h4 style="margin-bottom:12px;color:var(--blue);letter-spacing:2px">修改后台登录密码</h4>' +
      '<div class="grid">' +
      '<div class="field"><label>新密码</label><input type="password" id="newPass" placeholder="留空则不修改"></div>' +
      '<div class="field"><label>确认新密码</label><input type="password" id="newPass2"></div></div>' +
      '<button type="button" class="btn btn-navy" id="btnPass" style="margin-top:14px">更新密码</button></div>');
    bindSettings();
  }

  function renderAll() {
    renderProfile(); renderWelcome(); renderAbout(); renderExp();
    renderSkills(); renderProjects(); renderEdu(); renderContact(); renderSettings();
  }

  /* ============================================================
     交互绑定
     ============================================================ */
  function bindInputs() {
    $("#panels").addEventListener("input", function (e) {
      var t = e.target;
      var path = t.getAttribute("data-path");
      if (!path) return;
      var val = t.value;
      if (val === "[已内嵌压缩图片]" || val === "[已上传本地图片]") return;
      if (t.hasAttribute("data-lines")) val = val.split("\n").filter(function (s) { return s.trim(); });
      else if (t.hasAttribute("data-csv")) val = val.split(/[,，]/).map(function (s) { return s.trim(); }).filter(Boolean);
      else if (t.hasAttribute("data-num")) val = Number(val) || 0;
      setPath(state, path, val);
      var bar = t.parentElement && t.parentElement.querySelector(".bar-mini span");
      if (bar && t.hasAttribute("data-num")) bar.style.width = Math.min(100, Math.max(0, val)) + "%";
    });

    $("#panels").addEventListener("change", function (e) {
      var t = e.target;
      var up = t.getAttribute("data-upload");
      if (up && t.files && t.files[0]) {
        status("正在压缩并载入图片…", "info", true);
        compressImageFile(t.files[0], function (dataUrl) {
          setPath(state, up, dataUrl);
          if (up === "profile.photo") {
            try { localStorage.setItem("lego_custom_photo", dataUrl); } catch (err) {}
          }
          var img = t.closest(".img-row").querySelector(".img-preview");
          if (img) img.src = dataUrl;
          var txt = t.parentElement.querySelector("input[type=text]");
          if (txt) txt.value = "[已内嵌压缩图片]";
          status("✅ 图片已压缩载入并同步到本地预览，请点击「🚀 发布到 GitHub」永久生效", "ok");
        });
      }
    });

    $("#panels").addEventListener("click", function (e) {
      var btn = e.target.closest("[data-act]");
      if (!btn) return;
      var act = btn.getAttribute("data-act");
      var sec = btn.getAttribute("data-sec");
      var idx = Number(btn.getAttribute("data-idx"));

      if (act === "add") {
        if (sec === "experience") state.experience.push({ company: "新公司", role: "职位", period: "2024.01 — 至今", location: "城市", desc: "", bullets: [], tags: [] });
        else if (sec === "skills") state.skills.push({ group: "新分组", items: [{ name: "新技能", level: 80 }] });
        else if (sec === "projects") state.projects.push({ title: "新项目", desc: "", image: "assets/projects/p1.svg", tags: [], link: "" });
        else if (sec === "education") state.education.push({ school: "新学校", degree: "学位", major: "专业", period: "2021 — 2025", desc: "" });
        else if (sec === "about.highlights") state.about.highlights.push({ icon: "⭐", text: "新亮点" });
        else if (/\.items$/.test(sec)) getPath(state, sec).push({ name: "新技能", level: 80 });
        broadcastLiveState();
        renderAll();
        status("已添加新项，记得点击「🚀 发布到 GitHub」", "info");
      } else if (act === "del") {
        getPath(state, sec).splice(idx, 1);
        broadcastLiveState();
        renderAll();
        status("已删除该项，记得点击「🚀 发布到 GitHub」", "info");
      } else if (act === "up" || act === "down") {
        var arr = getPath(state, sec);
        var j = act === "up" ? idx - 1 : idx + 1;
        if (j >= 0 && j < arr.length) {
          var tmp = arr[idx]; arr[idx] = arr[j]; arr[j] = tmp;
          broadcastLiveState();
          renderAll();
        }
      }
    });
  }

  function bindTabs() {
    $("#tabs").addEventListener("click", function (e) {
      var tab = e.target.closest(".tab");
      if (!tab) return;
      $$(".tab").forEach(function (t) { t.classList.toggle("active", t === tab); });
      $$(".panel").forEach(function (p) {
        p.classList.toggle("active", p.getAttribute("data-panel") === tab.getAttribute("data-tab"));
      });
    });
  }

  function syncCfgFromInputs() {
    var tkInput = $("#setToken");
    var rpInput = $("#setRepo");
    if (tkInput && tkInput.value.trim()) {
      localStorage.setItem(LS.token, tkInput.value.trim());
    }
    if (rpInput && rpInput.value.trim()) {
      localStorage.setItem(LS.repo, rpInput.value.trim());
    }
  }

  function bindSettings() {
    $("#btnSaveCfg").addEventListener("click", function () {
      syncCfgFromInputs();
      status("✅ 配置已保存到本浏览器", "ok");
    });
    $("#btnVerify").addEventListener("click", function () {
      syncCfgFromInputs();
      var token = localStorage.getItem(LS.token) || "";
      if (!token) { status("请先粘贴 Token", "err"); return; }
      status("正在验证 Token…", "info", true);
      fetch("https://api.github.com/user?t=" + Date.now(), {
        cache: "no-store",
        headers: { Authorization: "Bearer " + token, Accept: "application/vnd.github+json" }
      })
        .then(function (r) { return r.json().then(function (j) { return { ok: r.ok, j: j }; }); })
        .then(function (res) {
          if (!res.ok) { status("❌ Token 无效：" + (res.j.message || "验证失败"), "err"); return; }
          var login = res.j.login;
          status("✅ Token 有效，账号：" + login + "，正在查找仓库…", "info", true);
          return fetch("https://api.github.com/user/repos?per_page=100&sort=pushed&t=" + Date.now(), {
            cache: "no-store",
            headers: { Authorization: "Bearer " + token, Accept: "application/vnd.github+json" }
          }).then(function (r) { return r.json(); }).then(function (repos) {
            var candidates = [login + ".github.io", "sjyiii123-creator.github.io", "resume", "resume-site"];
            var found = null;
            (repos || []).forEach(function (r) {
              if (!found && candidates.indexOf(r.name) !== -1) found = r.full_name;
            });
            if (!found && repos && repos.length) found = repos[0].full_name;
            if (found) {
              $("#setRepo").value = found;
              localStorage.setItem(LS.repo, found);
              localStorage.setItem(LS.token, token);
              status("✅ 已定位仓库：" + found + "（已保存配置）", "ok");
            } else {
              status("⚠ 未找到可用仓库，请手动填写「用户名/仓库名」", "err");
            }
          });
        })
        .catch(function (e) { status("网络错误：" + e.message, "err"); });
    });
    $("#btnPass").addEventListener("click", function () {
      var a = $("#newPass").value, b = $("#newPass2").value;
      if (!a) { status("新密码不能为空", "err"); return; }
      if (a !== b) { status("两次输入的密码不一致", "err"); return; }
      localStorage.setItem(LS.pass, a);
      $("#newPass").value = ""; $("#newPass2").value = "";
      status("✅ 登录密码已更新", "ok");
    });
  }

  function bindTopbar() {
    $("#btnDraft").addEventListener("click", function () {
      broadcastLiveState();
      dirty = false;
      status("💾 草稿已保存并实时同步到本机前台预览！（点击「发布到 GitHub」可同步到线上）", "ok");
    });
    $("#btnExport").addEventListener("click", function () {
      broadcastLiveState();
      var blob = new Blob([JSON.stringify(state, null, 2) + "\n"], { type: "application/json" });
      var a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = "content.json";
      a.click();
      status("已导出最新 content.json", "ok");
    });
    $("#btnLogout").addEventListener("click", function () {
      $("#app").style.display = "none";
      $("#gate").style.display = "flex";
      $("#gatePass").value = "";
    });
    $("#btnPublish").addEventListener("click", publish);
  }

  /* ============================================================
     零延迟防缓存发布到 GitHub（自动检测默认分支 + 强制最新 SHA + 实时广播）
     ============================================================ */
  async function publish() {
    syncCfgFromInputs();
    var token = (localStorage.getItem(LS.token) || "").trim();
    var repo = (localStorage.getItem(LS.repo) || DEFAULT_REPO).trim();
    if (!token) {
      status("❌ 请先在「⚙ 发布设置」粘贴 GitHub Token", "err");
      $$(".tab").forEach(function (t) { t.classList.toggle("active", t.getAttribute("data-tab") === "settings"); });
      $$(".panel").forEach(function (p) { p.classList.toggle("active", p.getAttribute("data-panel") === "settings"); });
      return;
    }
    if (!/^[^/]+\/[^/]+$/.test(repo)) {
      status("❌ 仓库格式应为 用户名/仓库名（例如 sjyiii123-creator/sjyiii123-creator.github.io）", "err");
      return;
    }

    // 1. 立即同步本机前台（0ms 生效）
    broadcastLiveState();
    status("⏳ 正在直连 GitHub 实时写入最新内容…", "info", true);

    var headers = {
      Authorization: "Bearer " + token,
      Accept: "application/vnd.github+json"
    };

    try {
      // 2. 查询仓库实际默认分支（防止 main/master 不一致）
      var branch = "main";
      var repoRes = await fetch("https://api.github.com/repos/" + repo + "?t=" + Date.now(), {
        cache: "no-store",
        headers: headers
      });
      if (repoRes.ok) {
        var repoMeta = await repoRes.json();
        if (repoMeta && repoMeta.default_branch) branch = repoMeta.default_branch;
      }

      // 3. 强制绕过缓存获取最新文件 SHA（避免 409 Conflict）
      var path = "data/content.json";
      var api = "https://api.github.com/repos/" + repo + "/contents/" + path;
      var sha = null;
      var getRes = await fetch(api + "?ref=" + encodeURIComponent(branch) + "&t=" + Date.now(), {
        cache: "no-store",
        headers: headers
      });
      if (getRes.ok) {
        var meta = await getRes.json();
        sha = meta && meta.sha ? meta.sha : null;
      }

      // 4. PUT 提交最新 JSON
      var payload = {
        message: "update(resume): realtime content publish via admin panel (" + new Date().toISOString() + ")",
        content: b64utf8(JSON.stringify(state, null, 2) + "\n"),
        branch: branch
      };
      if (sha) payload.sha = sha;

      var putRes = await fetch(api, {
        method: "PUT",
        cache: "no-store",
        headers: Object.assign({ "Content-Type": "application/json" }, headers),
        body: JSON.stringify(payload)
      });
      var putJson = await putRes.json().catch(function () { return {}; });

      if (!putRes.ok) {
        throw new Error(putJson.message || ("HTTP " + putRes.status));
      }

      dirty = false;
      broadcastLiveState();
      status("🚀 发布成功！前台已实时同步更新（0 秒延迟，点击右上角「👁 预览网站」立即查看）", "ok");
    } catch (err) {
      status("❌ 发布失败：" + err.message, "err");
    }
  }

  /* ============================================================
     启动：优先从 GitHub 实时接口拉取最新内容，彻底避开旧缓存
     ============================================================ */
  function gate() {
    function tryLogin() {
      var saved = localStorage.getItem(LS.pass) || DEFAULT_PASS;
      if ($("#gatePass").value === saved) {
        $("#gate").style.display = "none";
        $("#app").style.display = "block";
        start();
      } else {
        $("#gateErr").textContent = "密码错误，请重试";
        $("#gatePass").value = "";
        $("#gatePass").focus();
      }
    }
    $("#gateBtn").addEventListener("click", tryLogin);
    $("#gatePass").addEventListener("keydown", function (e) {
      if (e.key === "Enter") tryLogin();
    });
  }

  async function fetchLatestContent() {
    var repo = (localStorage.getItem(LS.repo) || DEFAULT_REPO).trim();
    var token = (localStorage.getItem(LS.token) || "").trim();
    // 1. 优先从 GitHub API 实时拉取（无 CDN 缓存延迟）
    try {
      var headers = { Accept: "application/vnd.github+json" };
      if (token) headers.Authorization = "Bearer " + token;
      var apiRes = await fetch("https://api.github.com/repos/" + repo + "/contents/data/content.json?t=" + Date.now(), {
        cache: "no-store",
        headers: headers
      });
      if (apiRes.ok) {
        var meta = await apiRes.json();
        if (meta && meta.content) {
          return JSON.parse(b64decodeUtf8(meta.content));
        }
      }
    } catch (e) {}

    // 2. 降级使用带时间戳防缓存的本地/静态 JSON
    var r = await fetch("data/content.json?t=" + Date.now(), { cache: "no-store" });
    return await r.json();
  }

  function start() {
    status("正在拉取最新简历数据…", "info", true);
    fetchLatestContent()
      .then(function (remoteData) {
        var best = remoteData;
        try {
          var liveRaw = localStorage.getItem(LS.live) || localStorage.getItem(LS.draft);
          if (liveRaw) {
            var localData = JSON.parse(liveRaw);
            if ((localData._updatedAt || 0) > (remoteData._updatedAt || 0)) {
              best = localData;
            }
          }
        } catch (e) {}
        state = best;
        renderAll();
        bindInputs(); bindTabs(); bindTopbar();
        status("✅ 已加载最新数据 — 修改后将实时同步前台，点击「🚀 发布到 GitHub」永久保存", "ok");
      })
      .catch(function (e) {
        status("内容加载失败：" + e.message, "err");
      });
  }

  gate();
})();
