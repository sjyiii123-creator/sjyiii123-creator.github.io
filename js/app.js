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
        '" loading="lazy" onerror="this.style.display=\'none\'">' +
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
     小火车进度条
     ============================================================ */
  function initTrain() {
    var train = $("#legoTrain");
    var percent = $("#trainPercent");
    var track = $("#trainTrack");
    var ticking = false;

    function update() {
      var doc = document.documentElement;
      var max = doc.scrollHeight - window.innerHeight;
      var p = max > 0 ? Math.min(1, Math.max(0, window.scrollY / max)) : 0;
      var w = track.clientWidth - 170;
      train.style.left = (p * w - 10) + "px";
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
    links.forEach(function (l) {
      l.addEventListener("click", function (e) {
        e.preventDefault();
        var t = document.getElementById(l.dataset.target);
        if (t) {
          window.scrollTo({ top: t.offsetTop - 70, behavior: "smooth" });
          setActive(l.dataset.target);
        }
      });
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
    fetch("data/content.json?t=" + Date.now())
      .then(function (r) {
        if (!r.ok) throw new Error("content.json 加载失败");
        return r.json();
      })
      .then(function (data) {
        render(data);
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
