/* ============================================================
   LEGO-style Resume · app.js
   内容渲染 + 欢迎过场 + 小火车进度条 + 滚动动画
   ============================================================ */
(function () {
  "use strict";

  var C = null;

  /* ---------- 工具 ---------- */
  function $(sel, root) { return (root || document).querySelector(sel); }
  function $$(sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); }
  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (m) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[m];
    });
  }

  /* ============================================================
     渲染
     ============================================================ */
  function render(data) {
    C = data;

    // 侧边栏 / Hero
    $("#sideName").textContent = data.profile.name;
    $("#sideTitle").textContent = data.profile.title;
    $("#sideSlogan").textContent = data.profile.sidebarSlogan || "";
    $("#avatarText").textContent = data.profile.avatarText || data.profile.name.charAt(0);
    $("#heroName").textContent = data.profile.name;
    $("#heroRole").textContent = data.profile.title;
    $("#heroMotto").textContent = '"' + (data.profile.motto || "") + '"';
    document.title = data.profile.name + " · " + data.profile.title + " | LEGO-style Resume";

    // 欢迎词
    $("#welcomeEyebrow").textContent = data.welcome.eyebrow;
    $("#welcomeTitle").textContent = data.welcome.title;
    $("#welcomeSub").textContent = data.welcome.subtitle;
    $("#welcomeBtnText").textContent = data.welcome.button;

    // Hero 统计积木
    var stats = (data.about.highlights || []).slice(0, 4);
    $("#heroStats").innerHTML = stats.map(function (h) {
      return '<div class="stat-brick reveal"><div class="stat-num">' + esc(h.icon) +
        '</div><div class="stat-label">' + esc(h.text) + "</div></div>";
    }).join("");

    // 关于我
    $("#aboutText").textContent = data.about.text;
    $("#aboutHighlights").innerHTML = (data.about.highlights || []).map(function (h, i) {
      return '<div class="highlight-brick reveal" style="--d:' + (i * 0.12).toFixed(2) + 's">' +
        '<div class="h-icon">' + esc(h.icon) + "</div><span>" + esc(h.text) + "</span></div>";
    }).join("");

    // 工作经历
    $("#timeline").innerHTML = (data.experience || []).map(function (e, i) {
      return '<article class="time-card reveal" style="--d:' + (i * 0.15).toFixed(2) + 's">' +
        '<div class="time-head"><h3 class="time-company">' + esc(e.company) + "</h3>" +
        '<span class="time-role">' + esc(e.role) + "</span>" +
        '<span class="time-period">' + esc(e.period) + "</span></div>" +
        '<div class="time-location">📍 ' + esc(e.location) + "</div>" +
        '<p class="time-desc">' + esc(e.desc) + "</p>" +
        '<ul class="time-bullets">' + (e.bullets || []).map(function (b) {
          return "<li>" + esc(b) + "</li>";
        }).join("") + "</ul>" +
        '<div class="tag-row">' + (e.tags || []).map(function (t) {
          return '<span class="tag">' + esc(t) + "</span>";
        }).join("") + "</div></article>";
    }).join("");

    // 技能
    $("#skillsGrid").innerHTML = (data.skills || []).map(function (g, gi) {
      return '<div class="skill-group reveal" style="--d:' + (gi * 0.14).toFixed(2) + 's"><h3>' +
        esc(g.group) + "</h3>" + (g.items || []).map(function (s) {
          return '<div class="skill-item"><div class="skill-top"><span class="skill-name">' +
            esc(s.name) + '</span><span class="skill-val">' + esc(s.level) +
            '%</span></div><div class="skill-bar"><div class="skill-fill" data-level="' +
            esc(s.level) + '"></div></div></div>';
        }).join("") + "</div>";
    }).join("");

    // 作品集
    $("#projectsGrid").innerHTML = (data.projects || []).map(function (p, i) {
      return '<article class="project-card reveal" style="--d:' + (i * 0.1).toFixed(2) + 's">' +
        '<div class="p-studs"><i></i><i></i><i></i></div>' +
        '<div class="p-img"><img src="' + esc(p.image) + '" alt="' + esc(p.title) +
        '" loading="lazy" decoding="async" onerror="this.style.display=\'none\'">' +
        '<span class="p-badge">PROJECT ' + String(i + 1).padStart(2, "0") + "</span></div>" +
        '<div class="p-body"><h3 class="p-title">' + esc(p.title) + "</h3>" +
        '<p class="p-desc">' + esc(p.desc) + "</p>" +
        '<div class="tag-row">' + (p.tags || []).map(function (t) {
          return '<span class="tag">' + esc(t) + "</span>";
        }).join("") + "</div>" +
        (p.link ? '<a class="p-link" href="' + esc(p.link) + '" target="_blank" rel="noopener">查看项目</a>' : "") +
        "</div></article>";
    }).join("");

    // 教育
    $("#eduGrid").innerHTML = (data.education || []).map(function (e, i) {
      return '<article class="brick-card edu-card reveal" style="--d:' + (i * 0.14).toFixed(2) + 's">' +
        '<div class="card-studs"><i></i><i></i><i></i><i></i></div>' +
        '<span class="edu-deg">' + esc(e.degree) + "</span>" +
        '<span class="edu-period">' + esc(e.period) + "</span>" +
        '<h3 class="edu-school">' + esc(e.school) + "</h3>" +
        '<p class="edu-major">' + esc(e.major) + "</p>" +
        '<p class="edu-desc">' + esc(e.desc) + "</p></article>";
    }).join("");

    // 联系
    $("#contactTitle").textContent = data.contact.title;
    $("#contactNote").textContent = data.contact.note;
    var items = [
      { icon: "✉️", label: data.contact.email, href: "mailto:" + data.contact.email },
      { icon: "📞", label: data.contact.phone, href: "tel:" + String(data.contact.phone).replace(/[^+\d]/g, "") },
      { icon: "💬", label: data.contact.wechat ? "微信 " + data.contact.wechat : "" },
      { icon: "🐙", label: data.contact.github, href: data.contact.github },
      { icon: "📍", label: data.contact.location }
    ].filter(function (it) { return it.label; });
    $("#contactList").innerHTML = items.map(function (it) {
      return '<li><span class="c-icon">' + it.icon + "</span>" +
        (it.href ? '<a href="' + esc(it.href) + '" target="_blank" rel="noopener">' + esc(it.label) + "</a>"
          : "<span>" + esc(it.label) + "</span>") + "</li>";
    }).join("");

    // 页脚
    $("#footerText").textContent = data.footer;

    // 侧边栏链接
    $("#sideLinks").innerHTML =
      (data.contact.github ? '<a href="' + esc(data.contact.github) + '" target="_blank" rel="noopener" title="GitHub">GH</a>' : "") +
      '<a href="mailto:' + esc(data.contact.email) + '" title="Email">✉</a>' +
      '<a href="tel:' + esc(String(data.contact.phone).replace(/-/g, "")) + '" title="电话">☏</a>';
  }

  /* ============================================================
     欢迎过场
     ============================================================ */
  function initWelcome() {
    var overlay = $("#welcomeOverlay");
    var field = $("#brickField");
    var colors = ["#0B2A5B", "#123A78", "#071E42", "#0A2450"];
    var count = 12 * 8;
    var frag = document.createDocumentFragment();
    for (var i = 0; i < count; i++) {
      var b = document.createElement("div");
      b.className = "brick-cell";
      b.style.background = colors[i % colors.length];
      b.style.animationDelay = (Math.random() * 0.7).toFixed(2) + "s";
      frag.appendChild(b);
    }
    field.appendChild(frag);

    function enter() {
      overlay.classList.add("out");
      document.body.style.overflow = "";
      setTimeout(function () {
        overlay.classList.add("hidden");
        overlay.style.display = "none";
      }, 900);
      // 触发首屏动画
      revealAll();
    }

    $("#welcomeBtn").addEventListener("click", enter);
    // 点击卡片外任意区域也可进入
    overlay.addEventListener("click", function (e) {
      if (e.target === overlay || e.target === field) enter();
    });

    document.body.style.overflow = "hidden";
    // 12 秒后自动放行，避免卡住
    setTimeout(function () {
      if (!overlay.classList.contains("out")) enter();
    }, 12000);
  }

  /* ============================================================
     滚动显现（循序渐进）
     ============================================================ */
  var observer = null;
  function initReveal() {
    if (!("IntersectionObserver" in window)) { revealAll(); return; }
    observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) {
          en.target.classList.add("in");
          // 技能条进入视口再填充
          $$(".skill-fill", en.target).forEach(function (fill) {
            fill.style.width = (fill.getAttribute("data-level") || 0) + "%";
          });
          observer.unobserve(en.target);
        }
      });
    }, { threshold: 0.16, rootMargin: "0px 0px -8% 0px" });
    $$(".reveal").forEach(function (el) { observer.observe(el); });
  }
  function revealAll() {
    $$(".reveal").forEach(function (el) {
      el.classList.add("in");
      $$(".skill-fill", el).forEach(function (f) {
        f.style.width = (f.getAttribute("data-level") || 0) + "%";
      });
    });
  }

  /* ============================================================
     小火车进度条（填满式：轨道随进度被积木覆盖）
     ============================================================ */
  function initTrain() {
    var train = $("#legoTrain");
    var percent = $("#trainPercent");
    var track = $("#trainTrack");
    var fill = $("#railFill");
    var ticking = false;

    function update() {
      var doc = document.documentElement;
      var max = doc.scrollHeight - window.innerHeight;
      var p = max > 0 ? Math.min(1, Math.max(0, window.scrollY / max)) : 0;
      var w = track.clientWidth;
      var tw = 150;
      // 火车从最左行驶到最右，100% 时车尾贴住终点
      train.style.left = (p * (w - tw)) + "px";
      // 轨道被已走过的积木段完全覆盖：进度延伸到火车头，100% 时整条轨道填满
      fill.style.width = Math.min(w, p * (w - tw) + tw) + "px";
      train.style.setProperty("--wheel-rot", (p * 2160) + "deg");
      percent.textContent = Math.round(p * 100) + "%";
      ticking = false;
    }
    window.addEventListener("scroll", function () {
      if (!ticking) { ticking = true; requestAnimationFrame(update); }
    }, { passive: true });
    window.addEventListener("resize", update);
    update();
  }

  /* ============================================================
     乐高小人生成器（渐变立体质感 · 参考真实 Minifigure 结构）
     ============================================================ */
  var figUid = 0;
  function shade(hex, amt) {
    var n = parseInt(hex.slice(1), 16), r = n >> 16, g = (n >> 8) & 255, b = n & 255;
    function f(v) { return Math.round(Math.min(255, Math.max(0, v + 255 * amt))); }
    return "#" + ((1 << 24) + (f(r) << 16) + (f(g) << 8) + f(b)).toString(16).slice(1);
  }
  // 标准 C 型手爪：270° 圆弧 + 圆端点（开口朝 gapDeg 方向）
  function clawPath(cx, cy, r, gapDeg) {
    var a1 = (gapDeg + 45) * Math.PI / 180, a2 = (gapDeg + 315) * Math.PI / 180;
    var x1 = (cx + r * Math.cos(a1)).toFixed(1), y1 = (cy + r * Math.sin(a1)).toFixed(1);
    var x2 = (cx + r * Math.cos(a2)).toFixed(1), y2 = (cy + r * Math.sin(a2)).toFixed(1);
    return "M" + x1 + " " + y1 + " A" + r + " " + r + " 0 1 1 " + x2 + " " + y2;
  }
  function minifigSVG(opt) {
    var uid = "mf" + (++figUid);
    var t = opt.torso, l = opt.legs;
    var tL = shade(t, 0.2), tD = shade(t, -0.26), lL = shade(l, 0.2), lD = shade(l, -0.26);
    // 硬塑料渐变：亮带 -> 本色 -> 暗部，过渡更硬朗
    function grad(id, light, base, dark) {
      return '<linearGradient id="' + id + '" x1="0" y1="0" x2="1" y2="0">' +
        '<stop offset="0" stop-color="' + light + '"/><stop offset=".2" stop-color="' + light + '"/>' +
        '<stop offset=".38" stop-color="' + base + '"/><stop offset=".72" stop-color="' + base + '"/>' +
        '<stop offset="1" stop-color="' + dark + '"/></linearGradient>';
    }
    return '<svg class="minifig ' + (opt.cls || "") + '"' +
      (opt.delay ? ' style="animation-delay:' + opt.delay + '"' : "") +
      ' viewBox="0 0 64 128" aria-hidden="true"><defs>' +
      grad("h" + uid, "#FFE9A0", "#FFC400", "#C78E00") +
      grad("t" + uid, tL, t, tD) +
      grad("l" + uid, lL, l, lD) +
      '</defs>' +
      '<ellipse cx="32" cy="123" rx="19" ry="4.6" fill="#0B2A5B" opacity=".2"/>' +
      // 腿部（髋块 + 腿柱 + 外撇脚掌，模块拼接缝）
      '<g stroke="#17202E" stroke-width="1.7" stroke-linejoin="round">' +
      '<rect x="12" y="61" width="40" height="13" rx="4" fill="url(#l' + uid + ')"/>' +
      '<rect x="13" y="70" width="16" height="38" rx="5" fill="url(#l' + uid + ')"/>' +
      '<rect x="35" y="70" width="16" height="38" rx="5" fill="url(#l' + uid + ')"/>' +
      '<rect x="9.5" y="101" width="21.5" height="13" rx="2.5" fill="url(#l' + uid + ')"/>' +
      '<rect x="33" y="101" width="21.5" height="13" rx="2.5" fill="url(#l' + uid + ')"/></g>' +
      '<path d="M22 74.5 h20 M22 65.5 h20" stroke="#17202E" stroke-width="1" opacity=".35"/>' +
      // 颈柱（独立件 + 接缝）
      '<rect x="26" y="28" width="12" height="8" rx="2" fill="#E8B200" stroke="#A87C00" stroke-width="1.5"/>' +
      // 躯干（硬边圆肩梯形，接近真实 Minifigure 比例）
      '<path d="M12.5 38.5 q0-7.5 7.5-7.5 h24 q7.5 0 7.5 7.5 l-2.2 25.5 q-.4 4-4.4 4 h-23.8 q-4 0-4.4-4 z" fill="url(#t' + uid + ')" stroke="#17202E" stroke-width="1.9" stroke-linejoin="round"/>' +
      '<rect x="17" y="34" width="4" height="26" rx="2" fill="#fff" opacity=".38"/>' +
      '<circle cx="15.5" cy="42" r="3.4" fill="#17202E" opacity=".2"/>' +
      '<circle cx="48.5" cy="42" r="3.4" fill="#17202E" opacity=".2"/>' +
      // 手臂 + 标准 C 型手爪（大开口）
      '<g class="arm-l"><path d="M16 42 C9 44 5.5 50 5 57" fill="none" stroke="url(#t' + uid + ')" stroke-width="13" stroke-linecap="round"/>' +
      '<path d="' + clawPath(5.2, 65, 6.2, 222) + '" fill="none" stroke="url(#h' + uid + ')" stroke-width="4.3" stroke-linecap="round"/></g>' +
      '<g class="arm-r"><path d="M48 42 C55 44 58.5 50 59 57" fill="none" stroke="url(#t' + uid + ')" stroke-width="13" stroke-linecap="round"/>' +
      '<path d="' + clawPath(58.8, 65, 6.2, 318) + '" fill="none" stroke="url(#h' + uid + ')" stroke-width="4.3" stroke-linecap="round"/></g>' +
      // 头部（圆柱头：平直侧壁 + 顶部椭圆 + 独立凸点 + 硬高光）
      '<g class="fig-head">' +
      '<rect x="26.5" y="0" width="11" height="8" rx="2.5" fill="url(#h' + uid + ')" stroke="#A87C00" stroke-width="1.5"/>' +
      '<ellipse cx="32" cy="1.6" rx="5" ry="1.7" fill="#FFE9A0" opacity=".6"/>' +
      '<rect x="16" y="7" width="32" height="27" rx="7" fill="url(#h' + uid + ')" stroke="#A87C00" stroke-width="1.7"/>' +
      '<ellipse cx="32" cy="7.4" rx="15.6" ry="3" fill="#FFE9A0" opacity=".5"/>' +
      '<rect x="19.5" y="11" width="4.2" height="17" rx="2" fill="#fff" opacity=".5" transform="rotate(-5 21.6 19.5)"/>' +
      // 印刷式平面五官
      '<rect x="22.8" y="15.8" width="4.4" height="6.4" rx="2" fill="#262013"/>' +
      '<rect x="36.8" y="15.8" width="4.4" height="6.4" rx="2" fill="#262013"/>' +
      '<circle cx="26" cy="17.6" r="1.25" fill="#fff"/><circle cx="40" cy="17.6" r="1.25" fill="#fff"/>' +
      '<path d="M21 12.2 q3-2 6-1" stroke="#262013" stroke-width="2.1" fill="none" stroke-linecap="round"/>' +
      '<path d="M43 12.2 q-3-2-6-1" stroke="#262013" stroke-width="2.1" fill="none" stroke-linecap="round"/>' +
      '<path d="M26 25 q6 5.5 12 0" stroke="#262013" stroke-width="2.8" fill="none" stroke-linecap="round"/>' +
      '</g></svg>';
  }

  var FIG_PRESETS = {
    heroWave:  { cls: "bob", torso: "#E30613", legs: "#0B2A5B" },
    heroBuild: { cls: "bob", torso: "#00A651", legs: "#1B2430", delay: ".9s" },
    walk1:     { cls: "walk", torso: "#FFC400", legs: "#0B2A5B" },
    walk2:     { cls: "walk wave-left", torso: "#006DB7", legs: "#E30613", delay: ".25s" },
    walk3:     { cls: "walk", torso: "#E30613", legs: "#006DB7", delay: ".5s" },
    walk4:     { cls: "walk wave-left", torso: "#00A651", legs: "#0B2A5B", delay: ".75s" },
    foot1:     { cls: "bob", torso: "#FFC400", legs: "#0B2A5B" },
    foot2:     { cls: "bob", torso: "#E30613", legs: "#0B2A5B", delay: ".5s" }
  };
  function initFigures() {
    $$(".fig-slot").forEach(function (slot) {
      var preset = FIG_PRESETS[slot.getAttribute("data-fig")];
      if (preset) slot.innerHTML = minifigSVG(preset);
    });
  }

  /* ============================================================
     积木过场跳转（每个章节专属动画 + 标题卡）
     ============================================================ */
  var jumpStyles = {
    hero:       { anim: "rain",    label: "首页",     c1: "#0B2A5B", c2: "#FFC400" },
    about:      { anim: "wave",    label: "关于我",   c1: "#FFC400", c2: "#E30613" },
    experience: { anim: "rows",    label: "工作经历", c1: "#0B2A5B", c2: "#006DB7" },
    skills:     { anim: "diag",    label: "技能",     c1: "#00A651", c2: "#FFC400" },
    projects:   { anim: "grid",    label: "作品集",   c1: "#006DB7", c2: "#0B2A5B" },
    education:  { anim: "core",    label: "教育背景", c1: "#123A78", c2: "#FFC400" },
    contact:    { anim: "curtain", label: "联系方式", c1: "#E30613", c2: "#FFC400" }
  };
  var transitioning = false;
  function brickJumpTo(targetId, navEl) {
    if (transitioning) return;
    var target = document.getElementById(targetId);
    if (!target) return;
    transitioning = true;

    var js = jumpStyles[targetId] || jumpStyles.hero;
    var bt = $("#brickTransition");
    bt.className = "brick-transition anim-" + js.anim;
    bt.style.setProperty("--bt-c1", js.c1);
    bt.style.setProperty("--bt-c2", js.c2);
    $("#btLabelText").textContent = js.label;
    void bt.offsetWidth; // 强制重排以重启动画
    bt.classList.add("in");

    if (navEl) {
      navEl.classList.remove("jump");
      void navEl.offsetWidth;
      navEl.classList.add("jump");
    }

    // 节奏：盖屏 ~1.2s → 落位 → 揭幕 ~1.1s（从容不迫）
    setTimeout(function () {
      window.scrollTo({ top: target.offsetTop - 70, behavior: "instant" });
      bt.classList.remove("in");
      bt.classList.add("out");

      target.classList.remove("pop");
      void target.offsetWidth;
      target.classList.add("pop");

      setTimeout(function () {
        bt.classList.remove("out");
        target.classList.remove("pop");
        transitioning = false;
      }, 1150);
    }, 1250);
  }

  /* ============================================================
     导航高亮
     ============================================================ */
  function initNav() {
    var links = $$(".nav-brick");
    var sections = links.map(function (l) { return document.getElementById(l.dataset.target); }).filter(Boolean);

    function setActive(id) {
      links.forEach(function (l) {
        l.classList.toggle("active", l.dataset.target === id);
      });
    }
    if ("IntersectionObserver" in window) {
      var navObs = new IntersectionObserver(function (entries) {
        entries.forEach(function (en) {
          if (en.isIntersecting) setActive(en.target.id);
        });
      }, { threshold: 0.12, rootMargin: "-25% 0px -55% 0px" });
      sections.forEach(function (s) { navObs.observe(s); });
    }
    // 侧边栏导航 + 页内锚点按钮 → 积木过场
    document.addEventListener("click", function (e) {
      var link = e.target.closest('a[href^="#"]');
      if (!link) return;
      var id = link.getAttribute("href").slice(1);
      if (!id) return;
      e.preventDefault();
      brickJumpTo(id, link.classList.contains("nav-brick") ? link : null);
    });
  }

  /* ============================================================
     留言表单（mailto）
     ============================================================ */
  function initForm() {
    $("#messageForm").addEventListener("submit", function (e) {
      e.preventDefault();
      var name = $("#msgName").value.trim();
      var contact = $("#msgContact").value.trim();
      var body = $("#msgBody").value.trim();
      var mail = C && C.contact ? C.contact.email : "";
      var subject = encodeURIComponent("【简历网站留言】来自 " + name);
      var text = encodeURIComponent("称呼: " + name + "\n联系方式: " + contact + "\n\n" + body);
      window.location.href = "mailto:" + mail + "?subject=" + subject + "&body=" + text;
    });
    $("#openAdmin").addEventListener("click", function () {
      window.location.href = "admin.html";
    });
  }

  /* ============================================================
     启动
     ============================================================ */
  function boot() {
    fetch("data/content.json")
      .then(function (r) {
        if (!r.ok) throw new Error("content.json 加载失败");
        return r.json();
      })
      .then(function (data) {
        render(data);
        initFigures();
        initWelcome();
        initReveal();
        initTrain();
        initNav();
        initForm();
      })
      .catch(function (err) {
        console.error(err);
        document.body.innerHTML =
          '<div style="padding:60px;font-family:sans-serif;text-align:center">' +
          "<h2>内容加载失败</h2><p>请通过 HTTP 服务访问本站（如 GitHub Pages），而非直接双击打开文件。</p></div>";
      });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();
