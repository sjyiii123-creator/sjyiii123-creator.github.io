/* =========================================================
   简历后台 · 可视化编辑器
   - Google 账号 / 管理员口令 双重登录入口
   - GitHub Token 仅保存在当前浏览器（localStorage），用于提交修改
   - 所有编辑最终提交到 data/resume.json，前端自动重新渲染
   ========================================================= */
(function () {
  "use strict";
  const CFG = window.ADMIN_CONFIG || {};
  const API = "https://api.github.com";
  const $ = (s, r) => (r || document).querySelector(s);
  const $$ = (s, r) => Array.from((r || document).querySelectorAll(s));
  const esc = (s) =>
    String(s == null ? "" : s).replace(/[&<>"']/g, (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c])
    );

  const state = {
    authed: false,
    identity: "",
    token: "",
    user: null,
    owner: "",
    repo: "",
    branch: CFG.branch || "main",
    data: null,
    sha: "",
    uploads: [], // {modelPath, fileName, dataUrl}
    tab: "global",
  };

  /* ---------------- Toast ---------------- */
  let toastTimer;
  function toast(msg, kind) {
    const t = $("#toast");
    t.textContent = msg;
    t.className = "toast show" + (kind ? " " + kind : "");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => (t.className = "toast"), 3200);
  }

  /* ---------------- 模型路径读写 ---------------- */
  function getPath(obj, path) {
    return path.split(".").reduce((o, k) => (o == null ? undefined : o[k]), obj);
  }
  function setPath(obj, path, value) {
    const keys = path.split(".");
    let cur = obj;
    for (let i = 0; i < keys.length - 1; i++) {
      const k = keys[i];
      if (cur[k] == null || typeof cur[k] !== "object") cur[k] = /^\d+$/.test(keys[i + 1]) ? [] : {};
      cur = cur[k];
    }
    cur[keys[keys.length - 1]] = value;
  }
  function ensurePath(obj, path, fallback) {
    const v = getPath(obj, path);
    if (v == null) setPath(obj, path, fallback);
    return getPath(obj, path);
  }

  /* ---------------- 登录：Google ---------------- */
  function decodeJwt(token) {
    try {
      const payload = token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/");
      return JSON.parse(decodeURIComponent(escape(atob(payload))));
    } catch (e) {
      return null;
    }
  }
  function onGoogleCredential(resp) {
    const claims = decodeJwt(resp.credential);
    const email = claims && claims.email;
    if (!email) return toast("Google 登录失败：无法读取邮箱", "err");
    if (Array.isArray(CFG.allowedEmails) && CFG.allowedEmails.length && !CFG.allowedEmails.includes(email)) {
      return toast("该 Google 账号无权登录后台", "err");
    }
    passAuth(email);
  }
  function initGoogle() {
    if (!CFG.googleClientId) {
      $("#googleBtnWrap").innerHTML =
        '<p style="font-size:12px;color:#8A94A8;text-align:center">（未配置 Google Client ID，可先用下方口令登录）</p>';
      return;
    }
    if (!window.google || !google.accounts) {
      if ((initGoogle._retry = (initGoogle._retry || 0) + 1) > 30) return;
      setTimeout(initGoogle, 400);
      return;
    }
    google.accounts.id.initialize({ client_id: CFG.googleClientId, callback: onGoogleCredential });
    google.accounts.id.renderButton($(".g_id_signin"), {
      theme: "outline", size: "large", width: 320, text: "signin_with", locale: "zh-CN",
    });
    $("#orDivider").style.display = "flex";
  }

  function passAuth(identity) {
    state.authed = true;
    state.identity = identity;
    $("#authStatus").textContent = "✅ 已验证身份：" + identity;
    $("#authStatus").classList.add("ok");
    $("#stepToken").classList.remove("step--locked");
    $("#ghToken").focus();
    toast("身份验证成功，请连接 GitHub Token", "ok");
  }

  /* ---------------- GitHub API ---------------- */
  function headers(token, json) {
    const h = { Authorization: "Bearer " + token, Accept: "application/vnd.github+json" };
    if (json) h["Content-Type"] = "application/json";
    return h;
  }
  async function gh(path, opts) {
    const res = await fetch(API + path, Object.assign({ headers: headers(state.token, opts && opts.json) }, opts || {}));
    const text = await res.text();
    let data = null;
    try { data = text ? JSON.parse(text) : null; } catch (e) { data = { message: text }; }
    if (!res.ok) {
      const err = new Error((data && data.message) || ("HTTP " + res.status));
      err.status = res.status;
      err.data = data;
      throw err;
    }
    return data;
  }
  function b64utf8(str) {
    const bytes = new TextEncoder().encode(str);
    let bin = "";
    bytes.forEach((b) => (bin += String.fromCharCode(b)));
    return btoa(bin);
  }
  function unb64utf8(b64) {
    const bin = atob(b64.replace(/\s/g, ""));
    const bytes = Uint8Array.from(bin, (c) => c.charCodeAt(0));
    return new TextDecoder().decode(bytes);
  }

  async function loadRepo() {
    const user = await gh("/user");
    state.user = user;
    state.owner = CFG.repoOwner || user.login;
    state.repo = CFG.repoName || user.login + ".github.io";
    $("#whoami").textContent = user.login + " · " + state.owner + "/" + state.repo;

    try {
      const f = await gh(`/repos/${state.owner}/${state.repo}/contents/data/resume.json?ref=${state.branch}`);
      state.sha = f.sha;
      state.data = JSON.parse(unb64utf8(f.content));
    } catch (e) {
      if (e.status === 404) {
        // 仓库或文件不存在：尝试本地文件兜底
        const res = await fetch("../data/resume.json", { cache: "no-store" });
        if (!res.ok) throw new Error("找不到简历数据文件");
        state.data = await res.json();
        state.sha = "";
        toast("远端数据文件不存在，已载入本地数据；保存时将自动创建", "ok");
      } else throw e;
    }
  }

  async function commitUpload(item) {
    const path = "assets/uploads/" + Date.now() + "-" + item.fileName.replace(/[^\w.\-]/g, "_");
    let sha = null;
    try {
      const exist = await gh(`/repos/${state.owner}/${state.repo}/contents/${path}?ref=${state.branch}`);
      sha = exist.sha;
    } catch (e) { /* 不存在则新建 */ }
    await gh(`/repos/${state.owner}/${state.repo}/contents/${path}`, {
      method: "PUT", json: true,
      body: JSON.stringify({
        message: "上传图片：" + item.fileName,
        content: item.dataUrl.split(",")[1],
        branch: state.branch,
        sha: sha || undefined,
      }),
    });
    return path;
  }

  async function save() {
    const btn = $("#saveBtn");
    btn.disabled = true;
    const bar = $("#saveProgress");
    bar.classList.add("run");
    try {
      // 1) 上传队列
      for (const item of state.uploads) {
        const path = await commitUpload(item);
        setPath(state.data, item.modelPath, path);
      }
      state.uploads = [];
      // 2) 提交数据文件
      const content = b64utf8(JSON.stringify(state.data, null, 2));
      let sha = state.sha;
      if (!sha) {
        try {
          const exist = await gh(`/repos/${state.owner}/${state.repo}/contents/data/resume.json?ref=${state.branch}`);
          sha = exist.sha;
        } catch (e) { /* 新文件 */ }
      }
      const res = await gh(`/repos/${state.owner}/${state.repo}/contents/data/resume.json`, {
        method: "PUT", json: true,
        body: JSON.stringify({
          message: "更新简历内容（后台编辑）",
          content,
          branch: state.branch,
          sha: sha || undefined,
        }),
      });
      state.sha = res.content && res.content.sha ? res.content.sha : state.sha;
      toast("✅ 已保存并发布，约 1 分钟后线上生效", "ok");
    } catch (e) {
      toast("保存失败：" + e.message, "err");
    } finally {
      btn.disabled = false;
      setTimeout(() => bar.classList.remove("run"), 700);
    }
  }

  /* ---------------- 表单渲染 ---------------- */
  const FIELDS = (path, f, val) => {
    const p = esc(path);
    switch (f.type) {
      case "textarea":
        return `<label class="field"><span>${esc(f.label)}</span><textarea rows="${f.rows || 3}" data-path="${p}">${esc(val || "")}</textarea></label>`;
      case "lines":
        return `<label class="field"><span>${esc(f.label)}</span><textarea rows="5" data-path="${p}" data-type="lines" placeholder="每行一条">${esc((val || []).join("\n"))}</textarea></label>`;
      case "tags":
        return `<label class="field"><span>${esc(f.label)}</span><input type="text" data-path="${p}" data-type="tags" value="${esc((val || []).join(", "))}" placeholder="用逗号分隔"></label>`;
      case "slider":
        return `<label class="field"><span>${esc(f.label)}</span><div class="range-row">
          <input type="range" min="0" max="100" step="1" data-path="${p}" data-type="number" value="${Number(val) || 0}">
          <div class="range-val">${Number(val) || 0}</div></div></label>`;
      case "checkbox":
        return `<label class="field"><span>${esc(f.label)}</span>
          <input type="checkbox" data-path="${p}" data-type="checkbox" ${val !== false ? "checked" : ""} style="width:20px;height:20px;accent-color:#2563EB"></label>`;
      case "select":
        return `<label class="field"><span>${esc(f.label)}</span><select data-path="${p}">
          ${(f.options || []).map((o) => `<option value="${esc(o)}" ${o === val ? "selected" : ""}>${esc(o)}</option>`).join("")}
        </select></label>`;
      case "image":
        return `<div class="field"><span>${esc(f.label)}</span>
          <div class="img-row">
            <img class="img-preview" src="${esc(val || "")}" alt="预览" onerror="this.style.opacity=.25">
            <div>
              <input type="text" data-path="${p}" value="${esc(val || "")}" placeholder="图片地址或相对路径，如 assets/projects/p1.svg">
              <div class="upload-btn" style="margin-top:8px">
                <button class="btn btn--ghost btn--sm" type="button">上传本地图片…</button>
                <input type="file" accept="image/*" data-upload="${p}" style="position:absolute;inset:0;opacity:0;cursor:pointer">
              </div>
            </div>
          </div></div>`;
      default:
        return `<label class="field"><span>${esc(f.label)}</span><input type="text" data-path="${p}" value="${esc(val == null ? "" : val)}"></label>`;
    }
  };

  function renderList(basePath, listCfg) {
    const arr = ensurePath(state.data, basePath, []) || [];
    const cards = arr
      .map((item, idx) => {
        const itemLabel = listCfg.itemLabelKey ? item[listCfg.itemLabelKey] : listCfg.label + " " + (idx + 1);
        const fields = (listCfg.fields || [])
          .map((f) => {
            const v = getPath(item, f.key);
            const full = `${basePath}.${idx}.${f.key}`;
            if (f.type === "objlist") {
              return `<div class="field"><span>${esc(f.label)}</span>${renderList(`${basePath}.${idx}.${f.key}`, {
                label: "子项", fields: f.itemFields, addText: "+ 添加",
              })}</div>`;
            }
            return FIELDS(full, f, v);
          })
          .join("");
        return `<div class="item-card">
          <div class="item-tools">
            <button class="icon-btn" data-move="up" data-base="${esc(basePath)}" data-index="${idx}" title="上移">↑</button>
            <button class="icon-btn" data-move="down" data-base="${esc(basePath)}" data-index="${idx}" title="下移">↓</button>
            <button class="icon-btn del" data-remove="${esc(basePath)}" data-index="${idx}" title="删除">✕</button>
          </div>
          <div class="item-label">${esc(itemLabel)}</div>
          ${fields}
        </div>`;
      })
      .join("");
    return `${cards}
      <button class="btn btn--ghost btn--sm" data-add="${esc(basePath)}" type="button">${esc(listCfg.addText || "+ 添加" + listCfg.label)}</button>`;
  }

  const TABS = {
    global: {
      label: "全局信息",
      groups: [
        {
          title: "个人信息",
          desc: "这些信息会出现在侧边栏与联系方式区域",
          fields: [
            { path: "meta.name", label: "姓名", type: "text" },
            { path: "meta.role", label: "职位", type: "text" },
            { path: "meta.tagline", label: "一句话签名", type: "text" },
            { path: "meta.location", label: "所在地", type: "text" },
            { path: "meta.email", label: "邮箱", type: "text" },
            { path: "meta.phone", label: "电话", type: "text" },
            { path: "meta.github", label: "GitHub 主页", type: "text" },
            { path: "meta.website", label: "个人网站", type: "text" },
            { path: "footer.text", label: "页脚文字", type: "text" },
          ],
        },
      ],
    },
    welcome: {
      label: "欢迎词",
      groups: [
        {
          title: "首屏欢迎词",
          desc: "访客打开网站第一眼看到的内容",
          fields: [
            { path: "welcome.badge", label: "顶部徽章", type: "text" },
            { path: "welcome.title", label: "主标题", type: "text" },
            { path: "welcome.highlight", label: "高亮副标题", type: "text" },
            { path: "welcome.subtitle", label: "欢迎词正文", type: "textarea", rows: 4 },
            { path: "welcome.roles", label: "轮播标签（每行一个）", type: "lines" },
            { path: "welcome.ctaPrimary.text", label: "主按钮文字", type: "text" },
            { path: "welcome.ctaPrimary.href", label: "主按钮链接", type: "text" },
            { path: "welcome.ctaSecondary.text", label: "次按钮文字", type: "text" },
            { path: "welcome.ctaSecondary.href", label: "次按钮链接", type: "text" },
          ],
        },
      ],
    },
    about: {
      label: "关于我",
      groups: [
        {
          title: "正文",
          fields: [
            { path: "about.title", label: "板块标题", type: "text" },
            { path: "about.lead", label: "导语", type: "textarea", rows: 3 },
            { path: "about.paragraphs", label: "正文段落（每行一段）", type: "lines" },
            { path: "about.image", label: "形象图", type: "image" },
          ],
        },
        {
          title: "数据亮点",
          list: {
            path: "about.stats",
            label: "亮点",
            itemLabelKey: "label",
            addText: "+ 添加亮点",
            fields: [
              { key: "value", label: "数字", type: "text" },
              { key: "label", label: "说明", type: "text" },
            ],
          },
        },
      ],
    },
    experience: {
      label: "工作经历",
      groups: [
        {
          title: "工作经历",
          desc: "可拖动排序：使用右上角 ↑ ↓ 调整顺序",
          list: {
            path: "experience.items",
            label: "经历",
            itemLabelKey: "company",
            addText: "+ 添加工作经历",
            fields: [
              { key: "company", label: "公司", type: "text" },
              { key: "role", label: "职位", type: "text" },
              { key: "period", label: "时间段", type: "text" },
              { key: "location", label: "地点", type: "text" },
              { key: "summary", label: "概述", type: "textarea" },
              { key: "bullets", label: "工作要点（每行一条）", type: "lines" },
              { key: "tags", label: "标签（逗号分隔）", type: "tags" },
            ],
          },
        },
      ],
    },
    skills: {
      label: "技能",
      groups: [
        {
          title: "技能分组",
          list: {
            path: "skills.groups",
            label: "分组",
            itemLabelKey: "name",
            addText: "+ 添加技能分组",
            fields: [
              { key: "name", label: "分组名称", type: "text" },
              { key: "icon", label: "图标", type: "select", options: ["brain", "chat", "gear", "star", "code", "grid", "book"] },
              {
                key: "items",
                label: "技能项",
                type: "objlist",
                itemFields: [
                  { key: "name", label: "技能名称", type: "text" },
                  { key: "level", label: "掌握度", type: "slider" },
                ],
              },
            ],
          },
        },
      ],
    },
    projects: {
      label: "作品集",
      groups: [
        {
          title: "项目卡片",
          desc: "建议上传 16:10 比例的图片，效果最佳",
          list: {
            path: "projects.items",
            label: "项目",
            itemLabelKey: "title",
            addText: "+ 添加项目",
            fields: [
              { key: "title", label: "项目名称", type: "text" },
              { key: "summary", label: "项目简介", type: "textarea", rows: 3 },
              { key: "image", label: "项目图片", type: "image" },
              { key: "tags", label: "技术标签（逗号分隔）", type: "tags" },
              { key: "links.demo", label: "在线体验链接", type: "text" },
              { key: "links.code", label: "源代码链接", type: "text" },
            ],
          },
        },
      ],
    },
    education: {
      label: "教育背景",
      groups: [
        {
          title: "教育经历",
          list: {
            path: "education.items",
            label: "教育经历",
            itemLabelKey: "school",
            addText: "+ 添加教育经历",
            fields: [
              { key: "school", label: "学校", type: "text" },
              { key: "degree", label: "学历", type: "text" },
              { key: "major", label: "专业", type: "text" },
              { key: "period", label: "时间段", type: "text" },
              { key: "description", label: "描述", type: "textarea" },
              { key: "tags", label: "标签（逗号分隔）", type: "tags" },
            ],
          },
        },
      ],
    },
    contact: {
      label: "联系方式",
      groups: [
        {
          title: "联系区域",
          desc: "邮箱 / 电话 / GitHub 请在「全局信息」中修改",
          fields: [
            { path: "contact.title", label: "板块标题", type: "text" },
            { path: "contact.intro", label: "介绍语", type: "textarea", rows: 3 },
            { path: "contact.availability", label: "当前状态", type: "text" },
            { path: "contact.form.enabled", label: "显示访客留言表单", type: "checkbox" },
            { path: "contact.form.subjectPrefix", label: "邮件主题前缀", type: "text" },
          ],
        },
      ],
    },
    json: { label: "高级 · JSON", json: true },
  };

  function renderTab(tab) {
    state.tab = tab;
    $$(".sidenav__item").forEach((b) => b.classList.toggle("is-active", b.dataset.tab === tab));
    const panel = $("#panel");
    const cfg = TABS[tab];
    if (!cfg) return;

    if (cfg.json) {
      panel.innerHTML = `<div class="panel-card">
        <div class="panel-title"><h2>高级模式 · 直接编辑 JSON</h2><p>修改后点击「应用 JSON」再保存</p></div>
        <textarea class="json-area" id="jsonArea"></textarea>
        <div style="margin-top:14px;display:flex;gap:10px">
          <button class="btn btn--primary btn--sm" id="applyJson" type="button">应用 JSON</button>
          <button class="btn btn--ghost btn--sm" id="formatJson" type="button">格式化</button>
        </div>
      </div>`;
      $("#jsonArea").value = JSON.stringify(state.data, null, 2);
      $("#applyJson").onclick = () => {
        try {
          state.data = JSON.parse($("#jsonArea").value);
          toast("JSON 已应用，记得点击「保存并发布」", "ok");
        } catch (e) {
          toast("JSON 解析失败：" + e.message, "err");
        }
      };
      $("#formatJson").onclick = () => {
        try {
          $("#jsonArea").value = JSON.stringify(JSON.parse($("#jsonArea").value), null, 2);
        } catch (e) {
          toast("JSON 解析失败：" + e.message, "err");
        }
      };
      return;
    }

    panel.innerHTML = (cfg.groups || [])
      .map((g) => {
        const body = g.list ? renderList(g.list.path, g.list) : (g.fields || []).map((f) => FIELDS(f.path, f, getPath(state.data, f.path))).join("");
        return `<div class="panel-card">
          <div class="panel-title"><h2>${esc(g.title)}</h2><p>${esc(g.desc || "")}</p></div>
          ${body}
        </div>`;
      })
      .join("");
  }

  /* ---------------- 表单事件 ---------------- */
  function coerce(value, type) {
    if (type === "lines") return value.split("\n").map((s) => s.trim()).filter(Boolean);
    if (type === "tags") return value.split(/[,，]/).map((s) => s.trim()).filter(Boolean);
    if (type === "number") return Number(value) || 0;
    if (type === "checkbox") return !!value;
    return value;
  }

  document.addEventListener("input", (e) => {
    const el = e.target;
    if (!el.dataset || !el.dataset.path) return;
    const type = el.dataset.type || "text";
    const value = type === "checkbox" ? el.checked : coerce(el.value, type);
    setPath(state.data, el.dataset.path, value);
    // 滑块数值实时显示
    if (type === "number" && el.type === "range") {
      const box = el.parentElement.querySelector(".range-val");
      if (box) box.textContent = el.value;
    }
    // 图片预览实时刷新
    if (el.dataset.path.endsWith("image") || el.parentElement.querySelector(".img-preview")) {
      const img = el.closest(".img-row") && el.closest(".img-row").querySelector(".img-preview");
      if (img && el.value) img.src = el.value;
    }
  });

  document.addEventListener("change", (e) => {
    const el = e.target;
    if (el.dataset && el.dataset.upload && el.files && el.files[0]) {
      const file = el.files[0];
      const reader = new FileReader();
      reader.onload = () => {
        const modelPath = el.dataset.upload;
        state.uploads.push({ modelPath, fileName: file.name, dataUrl: reader.result });
        setPath(state.data, modelPath, reader.result); // 先本地预览
        const img = el.closest(".img-row").querySelector(".img-preview");
        if (img) img.src = reader.result;
        toast("图片已选择，点击「保存并发布」后上传", "ok");
      };
      reader.readAsDataURL(file);
    }
    if (el.dataset && el.dataset.path && el.dataset.type === "checkbox") {
      setPath(state.data, el.dataset.path, el.checked);
    }
  });

  document.addEventListener("click", (e) => {
    const btn = e.target.closest("button");
    if (!btn) return;

    if (btn.dataset.add) {
      const arr = getPath(state.data, btn.dataset.add) || [];
      const listCfg = findListCfg(btn.dataset.add);
      const blank = {};
      (listCfg.fields || []).forEach((f) => {
        if (f.type === "objlist" || f.type === "lines" || f.type === "tags") setPath(blank, f.key, []);
        else if (f.type === "slider") setPath(blank, f.key, 80);
        else setPath(blank, f.key, "");
      });
      arr.push(blank);
      setPath(state.data, btn.dataset.add, arr);
      renderTab(state.tab);
    }

    if (btn.dataset.remove != null && btn.dataset.remove) {
      const arr = getPath(state.data, btn.dataset.remove) || [];
      arr.splice(Number(btn.dataset.index), 1);
      renderTab(state.tab);
    }

    if (btn.dataset.move) {
      const arr = getPath(state.data, btn.dataset.base) || [];
      const i = Number(btn.dataset.index);
      const j = btn.dataset.move === "up" ? i - 1 : i + 1;
      if (j >= 0 && j < arr.length) {
        [arr[i], arr[j]] = [arr[j], arr[i]];
        renderTab(state.tab);
      }
    }
  });

  function findListCfg(path) {
    for (const key of Object.keys(TABS)) {
      const cfg = TABS[key];
      for (const g of cfg.groups || []) {
        if (g.list && g.list.path === path) return g.list;
        for (const f of g.list ? g.list.fields || [] : []) {
          if (f.type === "objlist" && path.endsWith("." + f.key)) return { fields: f.itemFields };
        }
      }
    }
    return { fields: [] };
  }

  /* ---------------- 启动 ---------------- */
  function enterApp() {
    $("#loginView").hidden = true;
    $("#appView").hidden = false;
    renderTab("global");
    $$(".sidenav__item").forEach((b) => (b.onclick = () => renderTab(b.dataset.tab)));
    $("#saveBtn").onclick = save;
    $("#logoutBtn").onclick = () => {
      localStorage.removeItem("resume_admin_token");
      location.reload();
    };
    document.addEventListener("keydown", (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "s") {
        e.preventDefault();
        save();
      }
    });
  }

  async function tryLogin(token) {
    state.token = token;
    $("#tokenStatus").textContent = "正在验证 Token…";
    try {
      await loadRepo();
      localStorage.setItem("resume_admin_token", token);
      $("#tokenStatus").textContent = "";
      enterApp();
      toast("欢迎回来，" + (state.user.login || ""), "ok");
    } catch (e) {
      $("#tokenStatus").textContent = "❌ " + e.message + "（请检查 Token 权限 / 仓库与分支配置）";
    }
  }

  function init() {
    initGoogle();

    $("#passcodeBtn").onclick = () => {
      const v = $("#passcode").value.trim();
      if (!CFG.adminPasscode) return toast("尚未配置管理员口令，请改用 Google 登录", "err");
      if (v !== CFG.adminPasscode) return toast("口令不正确", "err");
      passAuth("管理员口令");
    };

    $("#loginBtn").onclick = () => {
      if (!state.authed) return toast("请先完成身份验证", "err");
      const token = $("#ghToken").value.trim();
      if (!/^gh[pousr]_[A-Za-z0-9]{20,}$/.test(token)) return toast("Token 格式不正确", "err");
      tryLogin(token);
    };

    const saved = localStorage.getItem("resume_admin_token");
    if (saved) $("#ghToken").value = saved;
  }

  init();
})();
