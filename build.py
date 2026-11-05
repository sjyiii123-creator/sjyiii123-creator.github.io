#!/usr/bin/env python3
"""build.py — 压缩 CSS/JS 并写入内容哈希版本号（缓存最优策略）
用法: python3 build.py
产物: css/style.min.css, js/app.min.js, js/admin.min.js
      HTML 中的 ?v=BUILD 被替换为 ?v=<内容哈希前8位>
源文件 (style.css / app.js / admin.js) 保留，便于日后修改后重新构建。
"""
import hashlib
import os
import re
import shutil
import subprocess
import sys

ROOT = os.path.dirname(os.path.abspath(__file__))

TARGETS = [
    ("css/style.css", "css/style.min.css"),
    ("js/app.js", "js/app.min.js"),
    ("js/admin.js", "js/admin.min.js"),
]
HTMLS = ["index.html", "admin.html"]


def safe_minify_js(src):
    """保守压缩：去注释/空行/缩进（不改语义，避免破坏代码）"""
    out = []
    in_block_comment = False
    for line in src.splitlines():
        s = line.strip()
        if in_block_comment:
            if "*/" in s:
                s = s.split("*/", 1)[1].strip()
                in_block_comment = False
            else:
                continue
        if s.startswith("/*"):
            if "*/" not in s:
                in_block_comment = True
                continue
            s = s.split("*/", 1)[1].strip()
        if not s or s.startswith("//"):
            continue
        out.append(s)
    return "\n".join(out)


def safe_minify_css(src):
    out = re.sub(r"/\*.*?\*/", "", src, flags=re.S)
    out = re.sub(r"\s*\n\s*", "\n", out)
    out = re.sub(r"\n{2,}", "\n", out)
    return out.strip()


def try_terser(inp, outp):
    try:
        r = subprocess.run(
            ["npx", "-y", "terser", inp, "-c", "-m", "-o", outp],
            capture_output=True, text=True, timeout=120,
        )
        return r.returncode == 0 and os.path.getsize(outp) > 0
    except Exception:
        return False


def try_cleancss(inp, outp):
    try:
        r = subprocess.run(
            ["npx", "-y", "clean-css-cli", "-o", outp, inp],
            capture_output=True, text=True, timeout=120,
        )
        return r.returncode == 0 and os.path.getsize(outp) > 0
    except Exception:
        return False


def main():
    hashes = {}
    for src_rel, out_rel in TARGETS:
        src = os.path.join(ROOT, src_rel)
        out = os.path.join(ROOT, out_rel)
        is_css = src_rel.endswith(".css")
        used = None
        if is_css and shutil.which("npx"):
            used = "clean-css" if try_cleancss(src, out) else None
        elif (not is_css) and shutil.which("npx"):
            used = "terser" if try_terser(src, out) else None
        if used is None:
            raw = open(src, encoding="utf-8").read()
            mini = safe_minify_css(raw) if is_css else safe_minify_js(raw)
            open(out, "w", encoding="utf-8").write(mini)
            used = "builtin"
        digest = hashlib.md5(open(out, "rb").read()).hexdigest()[:8]
        hashes[out_rel] = digest
        a, b = os.path.getsize(src), os.path.getsize(out)
        print(f"{src_rel} -> {out_rel} [{used}] {a}B -> {b}B  v={digest}")

    for html in HTMLS:
        p = os.path.join(ROOT, html)
        text = open(p, encoding="utf-8").read()

        def sub(m):
            name = m.group(1)
            # style.min.css / app.min.js 等 -> 对应哈希
            for rel, digest in hashes.items():
                if rel.endswith(name):
                    return f"{name}?v={digest}"
            return m.group(0)

        new = re.sub(r"([\w./-]+\.min\.(?:css|js))\?v=(?:BUILD|[a-f0-9]+)", sub, text)
        open(p, "w", encoding="utf-8").write(new)
        print(f"{html}: 版本号已更新")

    print("BUILD OK")


if __name__ == "__main__":
    main()
