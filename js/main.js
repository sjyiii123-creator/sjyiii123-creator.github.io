/* =========================================================
   李正淼 · 个人简历 — 渲染 / 动画 / LEGO 手指光标
   ========================================================= */
(function () {
  "use strict";

  /* ---------- 工具 ---------- */
  const $ = (s, r) => (r || document).querySelector(s);
  const $$ = (s, r) => Array.from((r || document).querySelectorAll(s));
  const esc = (s) =>
    String(s == null ? "" : s).replace(/[&<>"']/g, (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c])
    );

  /* ---------- 图标库 ---------- */
  const ICONS = {
    home: '<path d="M3 11.5 12 4l9 7.5"/><path d="M6 10.5V20h12v-9.5"/><path d="M10 20v-5h4v5"/>',
    user: '<circle cx="12" cy="8" r="3.6"/><path d="M4.8 20c.9-3.6 3.8-5.4 7.2-5.4s6.3 1.8 7.2 5.4"/>',
    case: '<rect x="3" y="7.5" width="18" height="12.5" rx="2.5"/><path d="M9 7.5V6a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v1.5"/><path d="M3 12.5h18"/>',
    star: '<path d="M12 3.6l2.6 5.4 5.9.8-4.3 4.1 1.1 5.9L12 17l-5.3 2.8 1.1-5.9-4.3-4.1 5.9-.8z"/>',
    grid: '<rect x="3.5" y="3.5" width="7" height="7" rx="2"/><rect x="13.5" y="3.5" width="7" height="7" rx="2"/><rect x="3.5" y="13.5" width="7" height="7" rx="2"/><rect x="13.5" y="13.5" width="7" height="7" rx="2"/>',
    book: '<path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H19v15H6.5A2.5 2.5 0 0 0 4 20.5z"/><path d="M4 20.5A2.5 2.5 0 0 1 6.5 18H19v3H6.5"/><path d="M9 7.5h6"/>',
    mail: '<rect x="3" y="5" width="18" height="14" rx="2.5"/><path d="M4 7l8 6 8-6"/>',
    phone: '<path d="M7 3.5h3l1.5 4-2 1.5a12 12 0 0 0 5.5 5.5l1.5-2 4 1.5v3a2 2 0 0 1-2 2A15.5 15.5 0 0 1 5 5.5a2 2 0 0 1 2-2z"/>',
    github: '<path d="M12 2.8a9.2 9.2 0 0 0-2.9 17.9c.46.08.63-.2.63-.44v-1.7c-2.56.56-3.1-1.1-3.1-1.1-.42-1.06-1.02-1.34-1.02-1.34-.84-.57.06-.56.06-.56.92.07 1.4.95 1.4.95.82 1.4 2.15 1 2.67.76.08-.6.32-1 .58-1.24-2.04-.23-4.2-1.02-4.2-4.56 0-1 .36-1.83.95-2.47-.1-.24-.41-1.18.09-2.46 0 0 .78-.25 2.54.95a8.8 8.8 0 0 1 4.62 0c1.76-1.2 2.54-.95 2.54-.95.5 1.28.19 2.22.1 2.46.59.64.94 1.47.94 2.47 0 3.55-2.16 4.32-4.21 4.55.33.29.62.85.62 1.72v2.55c0 .24.17.53.64.44A9.2 9.2 0 0 0 12 2.8z"/>',
    pin: '<path d="M12 21s7-5.6 7-11a7 7 0 1 0-14 0c0 5.4 7 11 7 11z"/><circle cx="12" cy="10" r="2.6"/>',
    calendar: '<rect x="3.5" y="5" width="17" height="15.5" rx="2.5"/><path d="M3.5 9.5h17"/><path d="M8 3v3.5M16 3v3.5"/>',
    brain: '<path d="M9.5 4.5A3 3 0 0 0 6.6 8a3 3 0 0 0-2 4.6A3 3 0 0 0 6.4 17a3 3 0 0 0 5.1 1.8V5.6a2.6 2.6 0 0 0-2-1.1z"/><path d="M14.5 4.5A3 3 0 0 1 17.4 8a3 3 0 0 1 2 4.6 3 3 0 0 1-1.8 4.4 3 3 0 0 1-5.1 1.8"/>',
    chat: '<path d="M4 6.5A2.5 2.5 0 0 1 6.5 4h11A2.5 2.5 0 0 1 20 6.5v7a2.5 2.5 0 0 1-2.5 2.5H9l-5 4z"/><path d="M8 9h8M8 12h5"/>',
    gear: '<circle cx="12" cy="12" r="3.2"/><path d="M12 2.8v2.4M12 18.8v2.4M4.7 4.7l1.7 1.7M17.6 17.6l1.7 1.7M2.8 12h2.4M18.8 12h2.4M4.7 19.3l1.7-1.7M17.6 6.4l1.7-1.7"/>',
    clock: '<circle cx="12" cy="12" r="8.6"/><path d="M12 7.4V12l3 2"/>',
    send: '<path d="M21 3 10.5 13.5"/><path d="M21 3l-6.6 18-3.9-8.5L2 8.6z"/>',
    link: '<path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1.2 1.2"/><path d="M14 10a4 4 0 0 0-5.7 0l-3 3A4 4 0 0 0 11 18.7l1.2-1.2"/>',
    code: '<path d="M8.5 8 4 12.5 8.5 17"/><path d="M15.5 8 20 12.5 15.5 17"/><path d="M13.5 5l-3 14"/>',
  };
  const ico = (name, cls) =>
    `<svg class="${cls || ""}" viewBox="0 0 24 24" aria-hidden="true">${ICONS[name] || ""}</svg>`;

  /* ---------- 提示 ---------- */
  let toastTimer = null;
  function toast(msg) {
    const t = $("#toast");
    if (!t) return;
    t.textContent = msg;
    t.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => t.classList.remove("show"), 2600);
  }

  /* ---------- 渲染 ---------- */
  function bindText(data) {
    $$("[data-bind]").forEach((el) => {
      const path = el.getAttribute("data-bind").split(".");
      let v = data;
      for (const k of path) v = v && v[k];
      if (typeof v === "string" && v) el.textContent = v;
    });
  }

  function renderAbout(d) {
    const wrap = $("#aboutParagraphs");
    if (wrap) {
      wrap.innerHTML = (d.paragraphs || [])
        .map((p, i) => `<p class="reveal" style="--d:${(i * 0.12).toFixed(2)}s">${esc(p)}</p>`)
        .join("");
    }
    const stats = $("#aboutStats");
    if (stats) {
      stats.innerHTML = (d.stats || [])
        .map(
          (s, i) => `
        <div class="stat reveal" style="--d:${(i * 0.1).toFixed(2)}s">
          <div class="stat__num">${esc(s.value)}</div>
          <div class="stat__label">${esc(s.label)}</div>
        </div>`
        )
        .join("");
    }
    const img = $("#aboutImage");
    if (img && d.image) img.src = d.image;
  }

  function renderExperience(d) {
    const tl = $("#timeline");
    if (!tl) return;
    tl.innerHTML = (d.items || [])
      .map(
        (it, i) => `
      <div class="tl-item reveal" style="--d:${(i * 0.12).toFixed(2)}s">
        <div class="tl-card">
          <div class="tl-top">
            <h3 class="tl-company">${esc(it.company)}</h3>
            <span class="tl-role">${esc(it.role)}</span>
          </div>
          <div class="tl-meta">
            <span>${ico("calendar")}${esc(it.period)}</span>
            <span>${ico("pin")}${esc(it.location)}</span>
          </div>
          <p class="tl-summary">${esc(it.summary)}</p>
          <ul class="tl-bullets">
            ${(it.bullets || []).map((b) => `<li>${esc(b)}</li>`).join("")}
          </ul>
          <div class="tags">${(it.tags || []).map((t) => `<span class="tag">${esc(t)}</span>`).join("")}</div>
        </div>
      </div>`
      )
      .join("");
  }

  function renderSkills(d) {
    const grid = $("#skillsGrid");
    if (!grid) return;
    grid.innerHTML = (d.groups || [])
      .map(
        (g, i) => `
      <div class="skill-card reveal" style="--d:${(i * 0.12).toFixed(2)}s">
        <div class="skill-card__head">
          <div class="skill-ico">${ico(g.icon || "star")}</div>
          <h3 class="skill-card__title">${esc(g.name)}</h3>
        </div>
        ${(g.items || [])
          .map(
            (it) => `
          <div class="skill-item">
            <div class="skill-item__top">
              <span class="skill-item__name">${esc(it.name)}</span>
              <span class="skill-item__val">${esc(it.level)}%</span>
            </div>
            <div class="skill-track"><div class="skill-fill" data-level="${Number(it.level) || 0}"></div></div>
          </div>`
          )
          .join("")}
      </div>`
      )
      .join("");
  }

  function renderProjects(d) {
    const grid = $("#projectsGrid");
    if (!grid) return;
    grid.innerHTML = (d.items || [])
      .map((p, i) => {
        const links = p.links || {};
        const linkHtml = [
          links.demo
            ? `<a class="project-link" href="${esc(links.demo)}" target="_blank" rel="noopener">${ico("link")}在线体验</a>`
            : "",
          links.code
            ? `<a class="project-link" href="${esc(links.code)}" target="_blank" rel="noopener">${ico("code")}源代码</a>`
            : "",
        ].join("");
        return `
      <article class="project-card reveal" style="--d:${((i % 3) * 0.12).toFixed(2)}s">
        <div class="project-media">
          <img src="${esc(p.image)}" alt="${esc(p.title)}" loading="lazy">
          ${linkHtml ? `<div class="project-overlay">${linkHtml}</div>` : ""}
        </div>
        <div class="project-body">
          <h3 class="project-title">${esc(p.title)}</h3>
          <p class="project-summary">${esc(p.summary)}</p>
          <div class="tags">${(p.tags || []).map((t) => `<span class="tag">${esc(t)}</span>`).join("")}</div>
        </div>
      </article>`;
      })
      .join("");
  }

  function renderEducation(d) {
    const grid = $("#eduGrid");
    if (!grid) return;
    grid.innerHTML = (d.items || [])
      .map(
        (e, i) => `
      <div class="edu-card reveal" style="--d:${(i * 0.12).toFixed(2)}s">
        <h3 class="edu-school">${esc(e.school)}</h3>
        <span class="edu-degree">${esc(e.degree)} · ${esc(e.major)}</span>
        <div class="edu-period">${ico("clock")} ${esc(e.period)}</div>
        <p class="edu-desc">${esc(e.description)}</p>
        <div class="tags">${(e.tags || []).map((t) => `<span class="tag">${esc(t)}</span>`).join("")}</div>
      </div>`
      )
      .join("");
  }

  function renderContact(data) {
    const meta = data.meta || {};
    const grid = $("#contactGrid");
    if (!grid) return;
    const items = [
      { icon: "mail", label: "Email", value: meta.email, href: "mailto:" + meta.email, copy: meta.email },
      { icon: "phone", label: "Phone", value: meta.phone, href: "tel:" + String(meta.phone || "").replace(/[^+\d]/g, ""), copy: meta.phone },
      { icon: "github", label: "GitHub", value: meta.github, href: /^https?:/.test(meta.github || "") ? meta.github : "https://" + meta.github },
      { icon: "pin", label: "Location", value: data.contact && data.contact.availability ? data.contact.availability : meta.location },
    ];
    grid.innerHTML = items
      .filter((it) => it.value)
      .map((it, i) => {
        const inner = `
        <div class="contact-ico">${ico(it.icon)}</div>
        <div>
          <div class="contact-item__label">${esc(it.label)}</div>
          <div class="contact-item__value">${esc(it.value)}</div>
        </div>`;
        return it.href
          ? `<a class="contact-item reveal" style="--d:${(i * 0.1).toFixed(2)}s" href="${esc(it.href)}" ${it.copy ? `data-copy="${esc(it.copy)}"` : ""}>${inner}</a>`
          : `<div class="contact-item reveal" style="--d:${(i * 0.1).toFixed(2)}s" ${it.copy ? `data-copy="${esc(it.copy)}"` : ""}>${inner}</div>`;
      })
      .join("");

    // 点击复制
    $$("[data-copy]").forEach((el) => {
      el.addEventListener("click", (e) => {
        const text = el.getAttribute("data-copy");
        if (!text || !navigator.clipboard) return;
        navigator.clipboard.writeText(text).then(() => toast("已复制：" + text)).catch(() => {});
      });
    });

    // 社交链接（侧边栏）
    const social = $("#social");
    if (social) {
      const links = [
        { icon: "mail", href: "mailto:" + meta.email, title: "发送邮件" },
        { icon: "phone", href: "tel:" + String(meta.phone || "").replace(/[^+\d]/g, ""), title: "电话联系" },
        { icon: "github", href: /^https?:/.test(meta.github || "") ? meta.github : "https://" + meta.github, title: "GitHub" },
      ];
      social.innerHTML = links
        .filter((l) => l.href && l.href.length > 8)
        .map((l) => `<a href="${esc(l.href)}" title="${esc(l.title)}" aria-label="${esc(l.title)}">${ico(l.icon)}</a>`)
        .join("");
    }
  }

  function renderFormMeta(data) {
    const form = $("#msgForm");
    if (!form) return;
    const meta = data.meta || {};
    if (data.contact && data.contact.form && data.contact.form.enabled === false) {
      const box = $("#contactForm");
      if (box) box.style.display = "none";
      return;
    }
    form.addEventListener("submit", (e) => {
      e.preventDefault();
      const fd = new FormData(form);
      const subject =
        ((data.contact && data.contact.form && data.contact.form.subjectPrefix) || "【个人网站】") +
        " 来自 " +
        fd.get("name") +
        " 的留言";
      const body =
        "称呼：" + fd.get("name") + "\n联系方式：" + fd.get("from") + "\n\n" + fd.get("body");
      window.location.href =
        "mailto:" + meta.email + "?subject=" + encodeURIComponent(subject) + "&body=" + encodeURIComponent(body);
      toast("正在打开邮件客户端…");
    });
  }

  /* ---------- 滚动渐进动画 ---------- */
  function initReveal() {
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((en) => {
          if (en.isIntersecting) {
            en.target.classList.add("in");
            io.unobserve(en.target);
            // 技能进度条动画
            $$(".skill-fill", en.target).forEach((bar, i) => {
              setTimeout(() => {
                bar.style.width = (Number(bar.dataset.level) || 0) + "%";
              }, 120 + i * 110);
            });
          }
        });
      },
      { threshold: 0.12, rootMargin: "0px 0px -8% 0px" }
    );
    $$(".reveal, .timeline").forEach((el) => io.observe(el));
  }

  /* ---------- 导航 / 滚动监听 ---------- */
  function initNav() {
    const navItems = $$(".nav__item");
    const sections = $$("[data-section]");
    const spy = new IntersectionObserver(
      (entries) => {
        entries.forEach((en) => {
          if (en.isIntersecting) {
            const id = en.target.getAttribute("data-section");
            navItems.forEach((a) => a.classList.toggle("is-active", a.dataset.nav === id));
          }
        });
      },
      { rootMargin: "-42% 0px -52% 0px" }
    );
    sections.forEach((s) => spy.observe(s));

    // 移动端抽屉
    const sidebar = $("#sidebar");
    const btn = $("#menuBtn");
    const mask = $("#drawerMask");
    const close = () => {
      sidebar.classList.remove("open");
      btn.classList.remove("open");
      mask.classList.remove("show");
    };
    if (btn) {
      btn.addEventListener("click", () => {
        const open = !sidebar.classList.contains("open");
        sidebar.classList.toggle("open", open);
        btn.classList.toggle("open", open);
        mask.classList.toggle("show", open);
      });
      mask.addEventListener("click", close);
      navItems.forEach((a) => a.addEventListener("click", close));
    }

    // 进度条
    const progress = $("#progress");
    const onScroll = () => {
      const h = document.documentElement.scrollHeight - window.innerHeight;
      if (progress) progress.style.width = (h > 0 ? (window.scrollY / h) * 100 : 0) + "%";
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
  }

  /* ---------- LEGO 手指光标 ---------- */
  function initCursor() {
    if (!window.matchMedia || !matchMedia("(pointer:fine)").matches) return;
    const cursor = $("#cursor");
    const dot = $("#cursor-dot");
    if (!cursor || !dot) return;
    document.body.classList.add("custom-cursor");

    let mx = innerWidth / 2, my = innerHeight / 2, cx = mx, cy = my;
    document.addEventListener("mousemove", (e) => {
      mx = e.clientX;
      my = e.clientY;
      dot.style.transform = `translate(${mx}px,${my}px)`;
    });
    const loop = () => {
      cx += (mx - cx) * 0.16;
      cy += (my - cy) * 0.16;
      cursor.style.transform = `translate(${cx}px,${cy}px)`;
      requestAnimationFrame(loop);
    };
    loop();

    const hoverSel =
      "a,button,input,textarea,label,.project-card,.stat,.skill-card,.tl-card,.edu-card,.contact-item,.nav__item";
    document.addEventListener("mouseover", (e) => {
      if (e.target.closest && e.target.closest(hoverSel)) cursor.classList.add("is-hover");
    });
    document.addEventListener("mouseout", (e) => {
      if (e.target.closest && e.target.closest(hoverSel)) cursor.classList.remove("is-hover");
    });
    document.addEventListener("mousedown", () => cursor.classList.add("is-down"));
    document.addEventListener("mouseup", () => cursor.classList.remove("is-down"));
  }

  /* ---------- 欢迎词：角色打字机 ---------- */
  function initRoleRotator(roles) {
    const el = $("#roleRotator");
    if (!el || !roles || !roles.length) return;
    let idx = 0, char = 0, deleting = false;
    const tick = () => {
      const word = roles[idx % roles.length];
      char += deleting ? -1 : 1;
      el.textContent = word.slice(0, Math.max(0, char));
      let delay = deleting ? 45 : 95;
      if (!deleting && char === word.length) {
        deleting = true;
        delay = 1600;
      } else if (deleting && char === 0) {
        deleting = false;
        idx++;
        delay = 320;
      }
      setTimeout(tick, delay);
    };
    tick();
  }

  /* ---------- 页面过场 ---------- */
  function initIntro() {
    setTimeout(() => document.body.classList.add("intro-done"), 2300);
  }

  /* ---------- 启动 ---------- */
  function apply(data) {
    bindText(data);
    renderAbout(data.about || {});
    renderExperience(data.experience || {});
    renderSkills(data.skills || {});
    renderProjects(data.projects || {});
    renderEducation(data.education || {});
    renderContact(data);
    renderFormMeta(data);
    const cta1 = $("#ctaPrimary"), cta2 = $("#ctaSecondary");
    if (cta1 && data.welcome && data.welcome.ctaPrimary && data.welcome.ctaPrimary.href) cta1.href = data.welcome.ctaPrimary.href;
    if (cta2 && data.welcome && data.welcome.ctaSecondary && data.welcome.ctaSecondary.href) cta2.href = data.welcome.ctaSecondary.href;
    initRoleRotator((data.welcome && data.welcome.roles) || []);
    initReveal();
    initNav();
    initCursor();
    initIntro();
    const y = String(new Date().getFullYear());
    const y1 = $("#year"), y2 = $("#year2");
    if (y1) y1.textContent = y;
    if (y2) y2.textContent = y;
    document.title = ((data.meta && data.meta.name) || "个人简历") + " · " + ((data.meta && data.meta.role) || "") + " | 个人简历";
  }

  fetch("data/resume.json", { cache: "no-store" })
    .then((r) => {
      if (!r.ok) throw new Error("HTTP " + r.status);
      return r.json();
    })
    .then(apply)
    .catch((err) => {
      console.error("简历数据加载失败:", err);
      toast("简历数据加载失败，请刷新重试");
      initNav();
      initCursor();
      initIntro();
    });
})();
