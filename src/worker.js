// Republic of Letters — letters.jupyter.pro
// One Cloudflare Worker, two readers:
//   humans get HTML;  agents get /llms.txt (or the bare domain via content-negotiation).
// Live data (board, projects) is fetched from the public org repo, with an embedded
// fallback so the site always renders.

const ORG = "https://github.com/republic-of-letters";
const RAW = "https://raw.githubusercontent.com/republic-of-letters/showcase/main/data";
const PROTOCOL_TEMPLATE = "republic-of-letters/protocol";

// ---- embedded fallback data (mirrors data/board.json + data/projects.json in the org) ----
const FALLBACK = {
  board: [
    {
      id: "offering-polymarket-microstructure",
      kind: "offering", what: "data",
      area: "Prediction-market microstructure (Polymarket)",
      area_zh: "预测市场微观结构（Polymarket）",
      shape: "transaction-level panel + settled-market cross-section",
      shape_zh: "交易级面板 + 已结算市场截面",
      scale: "~1e9 fills · ~1e6 markets",
      period: "2020–2026",
      terms: "can-run",
      seeking: "Hypotheses and estimation ideas across microstructure, trader behaviour, and event pricing. I hold the data and compute, and run the analysis as the project's Runner.",
      seeking_zh: "征微观结构、交易者行为、事件定价方向的假设与估计思路；本人持有数据与算力，以执行方（Runner）身份运行分析。",
      contact: "@alonegg",
      expires: "2027-01",
    },
  ],
  projects: [
    {
      id: "sandbox",
      title: "Sandbox — your first letter",
      title_zh: "沙盒 — 你的第一封信",
      blurb: "A public NYC yellow-taxi sample where anyone and their agent walk one complete round — ask, code, safety-scan, run, result, merge — in about thirty minutes. A CI robot plays the Runner.",
      blurb_zh: "在公开的纽约出租车样本上，任何人和他的代理都能在约三十分钟内走完整整一轮——提问、写码、安全扫描、运行、出结果、合并。CI 机器人担任执行方。",
      status: "active", tier: "open", since: "2026-07", people: 1,
      contact: "@alonegg", repo: "https://github.com/republic-of-letters/sandbox",
    },
  ],
};

// ------------------------------- styles -------------------------------
const CSS = `
:root{--bg:#fbfcff;--band:#f3f6fd;--card:#fff;--ink:#1b2333;--muted:#697089;--line:#e8ecf7;
--accent:#4361ee;--accent-ink:#3049d6;--mint:#0fb894;--tint:#eef2ff;--chip:#eef1fb;
--shadow:0 1px 2px rgba(27,35,51,.04),0 10px 34px rgba(27,35,51,.06);--nav:rgba(251,252,255,.86);
--sans:'Inter',-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'PingFang SC','Hiragino Sans GB','Microsoft YaHei','Noto Sans CJK SC',sans-serif;
--mono:ui-monospace,'SF Mono',Menlo,'Cascadia Code',monospace}
@media(prefers-color-scheme:dark){:root{--bg:#0b0f1a;--band:#10162501;--band:#0f1626;--card:#141b2b;
--ink:#e6ebf6;--muted:#8a93ab;--line:#222c40;--accent:#7d92ff;--accent-ink:#a6b4ff;--mint:#34d3a6;
--tint:#172142;--chip:#1a2333;--shadow:0 1px 2px rgba(0,0,0,.3),0 10px 34px rgba(0,0,0,.4);--nav:rgba(11,15,26,.84)}}
*{box-sizing:border-box;margin:0}html{scroll-behavior:smooth}
body{background:var(--bg);color:var(--ink);font:16.5px/1.72 var(--sans);-webkit-font-smoothing:antialiased}
.wrap{max-width:1060px;margin:0 auto;padding:0 1.6rem}
a{color:var(--accent);text-decoration:none}a:hover{text-decoration:underline;text-underline-offset:3px}
code{font-family:var(--mono);font-size:.85em;background:var(--chip);border-radius:5px;padding:.12em .42em}

nav{position:sticky;top:0;z-index:20;background:var(--nav);backdrop-filter:saturate(1.7) blur(12px);border-bottom:1px solid var(--line)}
.nav-in{display:flex;flex-wrap:wrap;gap:.4rem 1.15rem;align-items:center;padding:.9rem 1.6rem;
max-width:1060px;margin:0 auto;font-size:.85rem;font-weight:500}
nav a{color:var(--muted)}nav a:hover{color:var(--ink);text-decoration:none}
nav .brand{font-weight:800;color:var(--ink);letter-spacing:-.01em}
nav .agent{color:var(--accent);font-weight:600}nav .lang{margin-left:auto;color:var(--accent);font-weight:600}

.hero{background:linear-gradient(180deg,var(--tint),transparent 62%)}
.hero .wrap{padding-top:4.2rem;padding-bottom:3.4rem}
.eyebrow{display:inline-block;background:var(--card);border:1px solid var(--line);color:var(--accent-ink);
font-size:.74rem;font-weight:700;letter-spacing:.1em;text-transform:uppercase;padding:.4rem .8rem;border-radius:999px;box-shadow:var(--shadow)}
h1{font-size:3.3rem;font-weight:800;letter-spacing:-.035em;line-height:1.02;margin:1.1rem 0 1rem;max-width:16ch}
.lead{font-size:1.35rem;line-height:1.4;max-width:30ch;color:var(--ink);font-weight:500}
.sub{font-size:1.06rem;color:var(--muted);max-width:60ch;margin-top:1rem}
.agentbar{margin-top:1.6rem;display:inline-flex;flex-wrap:wrap;gap:.5rem;align-items:center;font-size:.92rem;
background:var(--card);border:1px solid var(--line);border-radius:12px;padding:.7rem 1rem;box-shadow:var(--shadow)}
.agentbar code{color:var(--accent-ink)}
svg.loop{width:100%;height:auto;margin-top:2.2rem;display:block;border:1px solid var(--line);
border-radius:18px;padding:.6rem;background:var(--card);box-shadow:var(--shadow)}
svg.loop .t{font:700 15px var(--sans);fill:var(--ink)}svg.loop .s{font:12.5px var(--sans);fill:var(--muted)}
svg.loop .g{font:700 12.5px var(--sans);fill:var(--accent);letter-spacing:.03em}

.chapter{border-top:1px solid var(--line)}
.chapter.band{background:var(--band)}
.chapter .wrap{display:grid;grid-template-columns:250px 1fr;gap:3.2rem;padding-top:4.4rem;padding-bottom:4.4rem}
@media(max-width:820px){.chapter .wrap{grid-template-columns:1fr;gap:1.4rem;padding-top:3rem;padding-bottom:3rem}}
.rail{align-self:start}
@media(min-width:821px){.rail{position:sticky;top:4.2rem}}
.rail .num{font:700 .78rem/1 var(--mono);color:var(--accent);letter-spacing:.06em}
.rail h2{font-size:1.5rem;font-weight:800;letter-spacing:-.02em;margin:.5rem 0 .5rem}
.rail p{font-size:.96rem;color:var(--muted)}
.body>*+*{margin-top:1.1rem}

.grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(250px,1fr));gap:1rem}
.grid.two{grid-template-columns:1fr 1fr}
@media(max-width:560px){.grid.two{grid-template-columns:1fr}}
.card{background:var(--card);border:1px solid var(--line);border-radius:16px;padding:1.25rem 1.35rem;box-shadow:var(--shadow)}
.card h3{font-size:1.06rem;font-weight:700;margin:0 0 .35rem;letter-spacing:-.01em}
.card p{font-size:.95rem;color:var(--muted)}
.card.act{display:flex;flex-direction:column}
.card.act .go{margin-top:auto;padding-top:.9rem;font-weight:600;color:var(--accent);font-size:.9rem}
.who{margin-top:.6rem;font-size:.82rem;color:var(--muted)}

.beats{display:grid;grid-template-columns:repeat(3,1fr);gap:1rem}
@media(max-width:560px){.beats{grid-template-columns:1fr}}
.beat{background:var(--card);border:1px solid var(--line);border-radius:14px;padding:1.1rem 1.15rem;box-shadow:var(--shadow)}
.beat .n{font:700 .72rem/1 var(--mono);color:var(--accent);letter-spacing:.08em}
.beat h3{font-size:1rem;font-weight:700;margin:.4rem 0 .3rem}
.beat p{font-size:.9rem;color:var(--muted)}

.sub-h{font-size:.78rem;font-weight:700;letter-spacing:.09em;text-transform:uppercase;color:var(--muted);margin:.4rem 0 .2rem}
ol.rules{counter-reset:r;list-style:none;padding:0;margin:0}
ol.rules li{counter-increment:r;position:relative;padding:.7rem 0 .7rem 2.4rem;border-bottom:1px solid var(--line);font-size:.98rem}
ol.rules li:last-child{border-bottom:none}
ol.rules li::before{content:counter(r);position:absolute;left:0;top:.7rem;width:1.6rem;height:1.6rem;
background:var(--tint);color:var(--accent-ink);border-radius:8px;display:flex;align-items:center;justify-content:center;font:700 .82rem/1 var(--sans)}
ol.rules b{font-weight:700;color:var(--ink)}

.give ul{list-style:none;padding:0;margin:.4rem 0 0}
.give li{padding:.42rem 0 .42rem 1.6rem;position:relative;font-size:.94rem;border-bottom:1px solid var(--line)}
.give li:last-child{border-bottom:none}
.give.yes li::before{content:'✓';position:absolute;left:0;color:var(--mint);font-weight:800}
.give.no li{color:var(--muted)}
.give.no li::before{content:'\\2013';position:absolute;left:0;color:var(--muted);font-weight:800}
.give h3 .k{font-size:.72rem;font-weight:700;letter-spacing:.08em;text-transform:uppercase;display:block;margin-bottom:.1rem}
.give.yes h3 .k{color:var(--mint)}.give.no h3 .k{color:var(--muted)}

.reader h3 .k{font-size:.72rem;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:var(--accent);display:block;margin-bottom:.1rem}
.reader ol,.reader ul{margin:.5rem 0 0;padding-left:1.15rem;font-size:.92rem;color:var(--muted)}
.reader li{margin-bottom:.32rem}
.reader b{color:var(--ink)}

.pills{display:flex;flex-wrap:wrap;gap:.4rem;margin-bottom:.55rem}
.pill{display:inline-flex;align-items:center;background:var(--chip);color:var(--ink);border-radius:999px;
padding:.32rem .72rem .32rem .6rem;font-size:.72rem;font-weight:600}
.pill::before{content:'';width:.5rem;height:.5rem;border-radius:50%;background:var(--pc,transparent);margin-right:.45rem}
.pill.tier{color:var(--muted)}.pill.tier::before{display:none}
.facts{margin-top:.5rem;font-size:.86rem;color:var(--muted)}.facts span{white-space:nowrap}
.meta{margin-top:.65rem;font-size:.82rem;color:var(--muted)}
.empty{color:var(--muted)}

ol.journey{counter-reset:s;list-style:none;padding:0;margin:0}
ol.journey li{counter-increment:s;position:relative;padding:0 0 1.3rem 3rem}
ol.journey li:last-child{padding-bottom:0}
ol.journey li::before{content:counter(s);position:absolute;left:0;top:-.1rem;width:2.1rem;height:2.1rem;
background:var(--accent);color:#fff;border-radius:50%;display:flex;align-items:center;justify-content:center;font-weight:700}
ol.journey h3{margin:0 0 .2rem;font-size:1.04rem;font-weight:700}
ol.journey p{font-size:.93rem;color:var(--muted)}
pre{background:#0e1424;color:#e7ecf6;border-radius:12px;padding:1rem 1.15rem;overflow-x:auto;font-size:.82rem;line-height:1.55;box-shadow:var(--shadow)}
pre code{background:none;padding:0;color:inherit;font-size:inherit}
.cta{display:inline-flex;align-items:center;background:var(--accent);color:#fff;font-size:.92rem;font-weight:600;
border-radius:11px;padding:.7rem 1.15rem;box-shadow:var(--shadow)}.cta:hover{text-decoration:none;filter:brightness(1.07)}

footer{border-top:1px solid var(--line)}
footer .wrap{padding-top:2.4rem;padding-bottom:3.6rem;color:var(--muted);font-size:.88rem}
`;

// ------------------------------- helpers -------------------------------
const esc = (s) => String(s == null ? "" : s)
  .replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;");
const pickf = (o, f, lang) => (lang === "zh" && o[f + "_zh"]) ? o[f + "_zh"] : (o[f] || "");
const T = (lang) => (en, zh) => (lang === "zh" ? zh : en);

const KIND = { offering: { c: "var(--mint)", en: "offering", zh: "提供" }, seeking: { c: "var(--accent)", en: "seeking", zh: "征求" } };
const WHAT = { data: ["data", "数据"], licence: ["licence", "数据授权"], compute: ["compute", "算力"], methods: ["methods", "方法"], ideas: ["ideas", "想法"] };
const TERMS = { "can-run": ["code comes to it", "代码上门跑"], "can-share": ["can be shared in", "可入圈共享"], "licence-bound": ["licence-bound", "受授权约束"] };
const STATUS = { incubating: ["#b45309", "incubating", "孵化中"], active: ["#15803d", "active", "进行中"], writing: ["#1d4ed8", "writing", "写作中"], published: ["#7e22ce", "published", "已发表"], archived: ["#6b7280", "archived", "已归档"] };
const TIER = { "display-only": ["display only", "仅展示"], "apply-to-join": ["open to applications", "开放申请"], open: ["open", "完全开放"] };

function loopSVG(lang) {
  const t = T(lang);
  return `<svg class="loop" viewBox="0 0 760 250" role="img" aria-label="${t("Loop: a proposer sends a question and code; the runner runs it where the data lives and returns aggregates; three human gates govern it.", "循环：提议方寄出问题与代码，执行方在数据所在处运行并寄回聚合结果，三道人闸把守。")}">
<defs><marker id="a" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0,0 L10,5 L0,10 z" fill="var(--accent)"/></marker></defs>
<rect x="505" y="42" width="238" height="162" rx="14" fill="none" stroke="var(--muted)" stroke-dasharray="5 5"/>
<rect x="20" y="68" width="205" height="92" rx="12" fill="var(--tint)"/>
<text x="122" y="106" text-anchor="middle" class="t">${t("PROPOSER", "提议方")}</text>
<text x="122" y="128" text-anchor="middle" class="s">${t("ideas + code", "想法 + 代码")}</text>
<rect x="524" y="68" width="200" height="92" rx="12" fill="var(--tint)"/>
<text x="624" y="106" text-anchor="middle" class="t">${t("RUNNER", "执行方")}</text>
<text x="624" y="128" text-anchor="middle" class="s">${t("data + compute", "数据 + 算力")}</text>
<text x="624" y="190" text-anchor="middle" class="s">${t("the data never leaves", "数据不出这条虚线")}</text>
<path d="M225,93 L520,93" fill="none" stroke="var(--accent)" stroke-width="1.5" marker-end="url(#a)"/>
<text x="373" y="80" text-anchor="middle" class="s">${t("a question + runnable code (one pull request)", "问题 + 可运行的代码（一个 Pull Request）")}</text>
<path d="M524,138 L229,138" fill="none" stroke="var(--accent)" stroke-width="1.5" marker-end="url(#a)"/>
<text x="373" y="164" text-anchor="middle" class="s">${t("figures + tables — aggregates only, never data", "图与表——只有聚合结果，从不含数据")}</text>
<text x="380" y="236" text-anchor="middle" class="g">${t("three human gates: topic · data · merge", "三道人闸：课题 · 数据 · 合并")}</text>
</svg>`;
}

function boardCard(n, lang) {
  const t = T(lang);
  const k = KIND[n.kind] || KIND.offering;
  const what = (WHAT[n.what] || [n.what, n.what])[lang === "zh" ? 1 : 0];
  const facts = [];
  for (const f of ["shape", "scale", "period"]) { const v = pickf(n, f, lang); if (v) facts.push(`<span>${esc(v)}</span>`); }
  if (TERMS[n.terms]) facts.push(`<span>${esc(TERMS[n.terms][lang === "zh" ? 1 : 0])}</span>`);
  const seeking = pickf(n, "seeking", lang);
  const contact = n.contact === "watch" || !n.contact
    ? t("anonymous — reply via an issue naming this id", "匿名——开 issue 写明布告编号即可应答")
    : (t("contact ", "联系 ") + esc(n.contact));
  const meta = [`<span>${esc(n.id)}</span>`, `<span>${contact}</span>`];
  if (n.expires) meta.push(`<span>${t("until", "有效至")} ${esc(n.expires)}</span>`);
  return `<article class="card"><div class="pills"><span class="pill" style="--pc:${k.c}">${t(k.en, k.zh)}</span><span class="pill tier">${esc(what)}</span></div>
<h3>${esc(pickf(n, "area", lang))}</h3>${facts.length ? `<p class="facts">${facts.join(" · ")}</p>` : ""}
${seeking ? `<p><strong>${t("In return:", "所求：")}</strong> ${esc(seeking)}</p>` : ""}
<p class="meta">${meta.join(" · ")}</p></article>`;
}

function projectCard(p, lang) {
  const t = T(lang);
  const s = STATUS[p.status] || ["#6b7280", p.status, p.status];
  const tier = (TIER[p.tier] || [p.tier, p.tier])[lang === "zh" ? 1 : 0];
  let title = esc(pickf(p, "title", lang) || p.id);
  if (p.tier === "open" && p.repo) title = `<a href="${esc(p.repo)}">${title}</a>`;
  const meta = [];
  if (p.since) meta.push(t("since ", "始于 ") + esc(p.since));
  if (p.people) meta.push(esc(p.people) + t(" members", " 名成员"));
  if (p.contact && p.tier === "apply-to-join") meta.push(t("contact ", "联系 ") + esc(p.contact));
  return `<article class="card"><div class="pills"><span class="pill" style="--pc:${s[0]}">${lang === "zh" ? s[2] : s[1]}</span><span class="pill tier">${esc(tier)}</span></div>
<h3>${title}</h3><p>${esc(pickf(p, "blurb", lang))}</p>${meta.length ? `<p class="meta">${meta.join(" · ")}</p>` : ""}</article>`;
}

// ------------------------------- the human page -------------------------------
function page(lang, data) {
  const t = T(lang);
  const other = lang === "zh" ? "/" : "/zh";
  const ISSUES = ORG + "/showcase/issues/new/choose";
  const board = data.board.length ? data.board.map((n) => boardCard(n, lang)).join("") :
    `<p class="empty">${t("The board is empty — be the first to ", "布告栏还空着——来")}<a href="${ISSUES}">${t("post a notice", "登第一张布告")}</a>.</p>`;
  const projects = data.projects.length ? data.projects.map((p) => projectCard(p, lang)).join("") :
    `<p class="empty">${t("The first projects are being onboarded. ", "首批项目正在入驻。")}<a href="${ISSUES}">${t("Propose one", "提议一个")}</a>.</p>`;

  const chapter = (id, band, num, title, sub, body) =>
`<section class="chapter${band ? " band" : ""}" id="${id}"><div class="wrap">
<div class="rail"><span class="num">${num}</span><h2>${title}</h2><p>${sub}</p></div>
<div class="body">${body}</div>
</div></section>`;

  return `<!doctype html><html lang="${lang === "zh" ? "zh-CN" : "en"}"><head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${t("Republic of Letters", "文人共和国 · Republic of Letters")}</title>
<meta name="description" content="${t("Bring a question. Meet the data it needs. Turn it into a paper together — while the data stays where it is.", "带来一个问题，遇见它需要的数据，一起把它变成论文——而数据留在原地。")}">
<link rel="alternate" type="text/markdown" href="/llms.txt" title="brief for AI agents">
<style>${CSS}</style></head><body>

<nav><div class="nav-in">
<a class="brand" href="/">${t("Republic of Letters", "文人共和国")}</a>
<a href="#do">${t("Do", "能做什么")}</a><a href="#how">${t("How", "怎么运作")}</a>
<a href="#limits">${t("Limits", "边界")}</a><a href="#readers">${t("Readers", "两种读者")}</a>
<a href="#start">${t("Start", "开始")}</a><a href="#projects">${t("Projects", "项目")}</a><a href="#board">${t("Board", "布告栏")}</a>
<a class="agent" href="/llms.txt">/llms.txt</a>
<a class="lang" href="${other}">${t("中文", "EN")}</a>
</div></nav>

<header class="hero"><div class="wrap">
<span class="eyebrow">${t("Research by correspondence", "以书信做研究")}</span>
<h1>${t("Republic of Letters", "文人共和国")}</h1>
<p class="lead">${t("Bring a question. Meet the data it needs. Write the paper together.", "带来一个问题，遇见它需要的数据，一起写出论文。")}</p>
<p class="sub">${t(
  "A space for faculty, students, and the AI agents beside them. The data never leaves the hands that hold it — code travels to it, and only results travel back.",
  "一个面向教师、学生及其身边 AI 代理的空间。数据从不离开持有它的人——代码走过去，只有结果寄回来。")}</p>
<div class="agentbar">🤖 ${t("An AI agent?", "你是 AI 代理？")} <a href="/llms.txt"><code>letters.jupyter.pro/llms.txt</code></a> · ${t("Humans, hand that link to yours.", "人类：把这个链接交给你的代理。")}</div>
${loopSVG(lang)}
</div></header>

${chapter("do", false, "01", t("What you can do", "你能做什么"),
  t("Four ways in. The fastest is to just try it.", "四个入口。最快的一个，是直接试一次。"),
`<div class="grid">
<article class="card act"><h3>${t("Try it in 30 minutes", "30 分钟试一次")}</h3><p>${t("The sandbox: on public data, you and your agent walk one whole round — a robot runs your code and replies. No account approval, no waiting.", "沙盒：在公开数据上，你和你的代理走完整整一轮——机器人跑你的代码并回信。无需审批，无需等待。")}</p><a class="go" href="#start">${t("→ Send your first letter", "→ 寄出第一封信")}</a></article>
<article class="card act"><h3>${t("Join a project", "加入项目")}</h3><p>${t("Bring a question, code, compute, or a licence to a running project — a mentor guides your first rounds.", "带问题、代码、算力或授权，加入进行中的项目——由导师带你走完头几轮。")}</p><a class="go" href="#projects">${t("→ See projects", "→ 看项目")}</a></article>
<article class="card act"><h3>${t("Hold data", "有数据")}</h3><p>${t("Post a silhouette of what you hold. It never moves; code comes to you.", "登一张剪影。数据从不移动，代码上门。")}</p><a class="go" href="${ISSUES}">${t("→ Post an offering", "→ 登一张提供")}</a></article>
<article class="card act"><h3>${t("Start your own", "自己开")}</h3><p>${t("The protocol is a template — one command makes a private project.", "协议就是模板——一条命令建私有项目。")}</p><a class="go" href="#start">${t("→ How to start", "→ 如何开始")}</a></article>
</div>`)}

${chapter("how", true, "02", t("How it works", "怎么运作"),
  t("One question becomes one pull request. Three gates keep people in charge.", "一个问题变成一个 Pull Request。三道闸让人始终掌舵。"),
`<div class="beats">
<div class="beat"><span class="n">${t("TOPIC", "课题")}</span><h3>${t("One candidate paper", "一篇候选论文")}</h3><p>${t("Hypothesis, falsifier, authorship, and a decision log — one file.", "假设、证伪条件、署名、决策日志——一个文件。")}</p></div>
<div class="beat"><span class="n">${t("ROUND", "ROUND")}</span><h3>${t("One question, one PR", "一个问题，一个 PR")}</h3><p>${t("Send a question + code; the data side runs it, returns aggregates.", "寄出问题和代码；数据方运行后寄回聚合结果。")}</p></div>
<div class="beat"><span class="n">${t("GATES", "人闸")}</span><h3>${t("Humans decide", "人来决定")}</h3><p>${t("Topic, data, and merge — opened only by people. Anyone can halt a round.", "课题、数据、合并——只有人能开。任何人都能叫停。")}</p></div>
</div>
<p class="sub-h">${t("The four rules", "四条规矩")}</p>
<ol class="rules">
<li><b>${t("Three gates, opened only by humans.", "三道闸，只有人能开。")}</b> ${t("Choosing a topic, running code on data, and merging — each is a person's call. This is the part built for the age of agents.", "选课题、在数据上跑代码、合并——每件都由人拍板。这一条，是为代理时代而设计的。")}</li>
<li><b>${t("Agents draft; agents never decide.", "代理起草；代理从不决定。")}</b> ${t("No agent opens a PR, merges, or runs on real data unless its human asked. The human is the author; the agent is the pen.", "任何代理都不得擅自开 PR、合并或在真实数据上运行，除非它的人要求。人是作者，代理是笔。")}</li>
<li><b>${t("Data never moves.", "数据从不移动。")}</b> ${t("Code travels to the data; only aggregates come back. Medical research has run this code-to-data loop for years (OpenSAFELY) — here it's the proven foundation, not the novelty.", "代码走向数据；回来的只有聚合结果。医学研究已用这套代码上门的机制多年（OpenSAFELY）——在这里它是成熟的地基，而非新意所在。")}</li>
<li><b>${t("Everything on the record.", "全程留痕。")}</b> ${t("Every question, result, and dead end is a versioned file — and that record is a priority claim: it protects ideas the way the boundary protects data.", "每个问题、结果、死路都是带版本的文件——而这份记录本身就是优先权凭证：它保护想法，正如边界保护数据。")}</li>
</ol>`)}

${chapter("limits", false, "03", t("What we give, what we don't", "给什么，不给什么"),
  t("The boundary is the honest part. Know it before you start.", "边界才是诚实的部分。开始前先看清。"),
`<div class="grid two">
<div class="give yes"><h3><span class="k">${t("We give you", "我们提供")}</span></h3><ul>
<li>${t("A protocol you start in one command.", "一条命令即启动的协议。")}</li>
<li>${t("Safety tooling: scan + human read + sandbox before code touches data.", "安全工具：触碰数据前扫描＋人读＋沙箱。")}</li>
<li>${t("A permanent, citable archive — failures included.", "永久、可引用的档案——含失败。")}</li>
<li>${t("A board to find data, collaborators, or a fitting question.", "一块找数据、找人、找合适问题的布告栏。")}</li>
<li>${t("A provenance label on every result.", "每个结果都带来源等级。")}</li>
</ul></div>
<div class="give no"><h3><span class="k">${t("We don't", "我们不做")}</span></h3><ul>
<li>${t("Host your data or give you compute.", "托管你的数据或提供算力。")}</li>
<li>${t("Verify your science — the gates are process, not peer review.", "替你验证科学——闸门是流程，不是评审。")}</li>
<li>${t("Adjudicate authorship — you settle it early, in writing.", "裁决署名——你早早白纸黑字谈定。")}</li>
<li>${t("Lock you in — leave any time with the whole archive.", "锁定你——随时带走整份档案离开。")}</li>
</ul></div>
</div>`)}

${chapter("readers", true, "04", t("Two readers", "两种读者"),
  t("This place is built to be read by people and by agents — differently.", "这个地方为人和代理两种读者而建——各读各的。"),
`<div class="grid two">
<article class="card reader"><h3><span class="k">${t("For you", "给你")}</span>${t("How a human reads it", "人怎么读")}</h3>
<ul>
<li>${t("5 min — ", "5 分钟——")}<a href="${ORG}/sandbox/tree/main/exchange/R001-tip-by-hour">${t("read one real letter", "读一封真实的信")}</a></li>
<li>${t("15 min — ", "15 分钟——")}<a href="${ORG}/protocol/blob/main/AGENTS.md">${t("the whole protocol", "全部协议")}</a></li>
<li>${t("30 min — ", "30 分钟——")}<a href="${ORG}/sandbox">${t("send your first letter in the sandbox", "在沙盒里寄出第一封信")}</a>${t(", and you're in.", "，即入门。")}</li>
</ul>
<p style="margin-top:.7rem;font-size:.92rem;color:var(--muted)">${t("You decide at the gates. You are the author; the agent is the pen.", "你在闸口决策。你是作者，代理是笔。")}</p></article>
<article class="card reader"><h3><span class="k">${t("For your agent", "给你的代理")}</span>${t("How an agent reads it", "代理怎么读")}</h3>
<p style="font-size:.92rem;color:var(--muted)">${t("Hand it ", "把 ")}<a href="/llms.txt"><code>/llms.txt</code></a>${t(" — the machine-readable contract. It learns:", " 交给它——机器可读的契约。它会学到：")}</p>
<ul>
<li><b>${t("Read order:", "读序：")}</b> AGENTS.md → PROJECT.md → TOPIC.md → ${t("merged rounds → open PR", "已合并 round → 打开的 PR")}</li>
<li><b>${t("May:", "可以：")}</b> ${t("scaffold, draft, analyse, comment.", "搭架子、起草、分析、评论。")}</li>
<li><b>${t("May not:", "不可以：")}</b> ${t("open a PR, merge, or run on data — unless its human asked.", "开 PR、合并、在数据上运行——除非它的人要求。")}</li>
</ul></article>
</div>`)}

${chapter("start", false, "05", t("Get started", "动手开始"),
  t("The fastest way to understand it is to do one round. Start in the sandbox.", "理解它最快的办法，是亲手走一轮。从沙盒开始。"),
`<ol class="journey">
<li><h3>${t("Send your first letter — in the sandbox", "在沙盒里寄出第一封信")}</h3><p>${t("Public taxi data, a robot Runner. You and your agent do one whole round — ask, code, safety scan, run, result, merge — in about 30 minutes, start to finish.", "公开的出租车数据，一个机器人执行方。你和你的代理走完整整一轮——提问、写码、安全扫描、运行、出结果、合并——大约 30 分钟从头到尾。")} <a href="${ORG}/sandbox">${t("→ republic-of-letters/sandbox", "→ republic-of-letters/sandbox")}</a></p></li>
<li><h3>${t("Join a real project", "加入一个真实项目")}</h3><p><a href="${ISSUES}">${t("Apply to a running project", "申请加入进行中的项目")}</a> — ${t("a mentor named in the project approves your first rounds. Or post a notice / propose your own.", "项目中指定的导师会为你的头几轮把关。也可以登布告，或自己提议一个。")}</p></li>
<li><h3>${t("Onboard with your agent", "带上代理入职")}</h3><p>${t("The guide takes you from no account to working. Hand your agent the brief; it learns the protocol and does the legwork.", "指南把你从没有账号带到能工作。把简报交给你的代理；它学会协议，替你跑腿。")}</p></li>
<li><h3>${t("Work in rounds", "以 round 工作")}</h3><p>${t("Propose code; results come back in-thread; humans call GO and merge.", "提出代码；结果寄回同一线程；人来判 GO 和合并。")}</p></li>
</ol>
<p class="sub-h" style="margin-top:1.4rem">${t("Already a team? Take the machinery", "已有团队？直接拿走机制")}</p>
<pre><code>gh repo create &lt;owner&gt;/&lt;name&gt; --template ${PROTOCOL_TEMPLATE} --private</code></pre>
<p style="margin-top:1.1rem"><a class="cta" href="${ORG}/sandbox">${t("Try the sandbox →", "试试沙盒 →")}</a> <a class="cta" href="${ISSUES}" style="background:var(--card);color:var(--accent);border:1px solid var(--line);margin-left:.5rem">${t("Apply or propose →", "申请或提议 →")}</a></p>`)}

${chapter("projects", true, "06", t("Projects", "项目"),
  t("Most people join here — invited into a running project, mentored through their first rounds. Research lives in private repos; cards show only what each project approved.", "多数人从这里加入——受邀进入进行中的项目，由导师带完头几轮。研究在私有仓库进行；卡片只展示各项目批准公开的部分。"),
`<div class="grid">${projects}</div>`)}

${chapter("board", false, "07", t("The board", "布告栏"),
  t("A second way in, for when no project fits yet: silhouettes of who holds data and who needs it. Coarse by design; every notice expires. Most collaborations start from a project, not the board.", "第二条路，当暂时没有合适的项目时：谁有数据、谁需要，只登剪影。粗粒度是刻意的；每张都有有效期。多数合作始于项目，而非布告栏。"),
`<div class="grid">${board}</div>`)}

<footer><div class="wrap">
${t("Named for the 17th-century scholars' network that did science by mail. ", "名字取自十七世纪靠书信做科学的学者网络。")}
<a href="${ORG}">${t("The org", "组织")}</a> · <a href="${ORG}/protocol">${t("the protocol", "协议")}</a> · <a href="/llms.txt">/llms.txt</a> · <a href="${other}">${t("中文", "English")}</a>
</div></footer>
</body></html>`;
}

// ------------------------------- the agent brief -------------------------------
function llmsTxt(data) {
  const notices = data.board.map((n) =>
    `- ${n.kind}/${n.what}: ${n.area} — ${n.scale || ""}${n.period ? ", " + n.period : ""}${n.terms ? ", " + n.terms : ""}; contact ${n.contact}; expires ${n.expires}`
  ).join("\n") || "- (none yet)";
  return `# Republic of Letters — brief for AI agents
> letters.jupyter.pro · You are an AI agent acting for ONE human member. Read this once,
> then follow the protocol exactly. You are the pen; your human is the author and holds
> every decision that matters.

## What this place is
Faculty, students, and their agents doing empirical research by correspondence.
Members bring different things: some hold data + compute, others bring questions + code.
Work is exchanged as ROUNDS — one research question + runnable code, as a single GitHub
pull request. Code travels to the data; only aggregate results travel back. The dataset
never enters any repository, ever.

## How the org is organized
- Org:            ${ORG}
- protocol/       public template repo. The contract is protocol/AGENTS.md (中文: AGENTS.zh.md;
                  English is authoritative). Every project is created from it:
                  gh repo create <owner>/<name> --template ${PROTOCOL_TEMPLATE} --private
- sandbox/        public practice project (tier: open). Walk one full round on public NYC-taxi
                  data with a robot Runner — the fastest way to learn the loop end to end.
                  Start here: ${ORG}/sandbox
- <project>/      one private repo per project. Inside:
    PROJECT.md          members, who the Runner is, the data statement
    topics/T<NN>/TOPIC.md   one candidate paper: hypotheses, falsifier, authorship, decision log
    exchange/R<NNN>/    a round: ASK.md (question) + run.py (code) + result/ (what came back)

## The hard rules — do NOT route around them
1. Data boundary. Never commit raw data; never move data off the Runner's machine.
   Results are aggregates only (figures, tables, coefficients). CI rejects large/raw files.
2. Three human gates. WITHOUT your human explicitly asking, you may NOT:
   - open, merge, or close a pull request;
   - run code against a real dataset;
   - decide a topic GO/kill or an authorship order.
   You MAY, autonomously: scaffold, draft ASK.md/code, analyse, search, comment.
3. Before any code runs on data it passes: a safety scan + a human read + a sandbox
   (non-root, read-only data, no network). If you are the Runner's agent: run
   scripts/scan-round.sh, surface the result to your human, and stop.
4. The durable layer is files, not chat. Write decisions into TOPIC.md / ASK.md / RESULT.md
   BEFORE acting on them. A fresh session rebuilds context only from committed files.
5. The archive is a priority claim. Opening a topic or round timestamps who proposed which
   hypothesis — the idea side's protection, symmetric to the data boundary. Taking a
   hypothesis disclosed inside a project outside it, or using it without credit, is as
   serious a breach as moving raw data. Before a topic's first analysis round runs, a
   one-line provisional credit line goes in TOPIC.md (originator + default co-authorship
   with the Runner); full authorship is settled no later than GO.

## How to read a project (context load order)
1. protocol/AGENTS.md
2. PROJECT.md
3. the relevant topics/T<NN>/TOPIC.md
4. that topic's merged rounds (exchange/R*/ASK.md + RESULT.md, newest first)
5. the open pull-request thread

## How to operate (exact steps)
- Practise first: do one full round in ${ORG}/sandbox (public data, robot Runner) — its
  README.md is a 30-minute end-to-end walkthrough. This is the drill.
- Onboard into a real project: follow protocol/ONBOARDING.md.
- Propose a round: ./scripts/new-round.sh "short slug"  ->  fill ASK.md  ->  write run.py
  (read os.environ["DATA_ROOT"], write only ./result/, no network, no absolute paths)  ->
  bash scripts/check.sh  ->  open the PR ONLY if your human asked.
- Run a round (Runner side): bash scripts/scan-round.sh <folder>  ->  read the code  ->
  run sandboxed with DATA_ROOT set  ->  commit result/  ->  never commit raw rows.

## Canonical, machine-readable sources
- Protocol (authoritative): ${ORG}/protocol/blob/main/AGENTS.md  (中文: AGENTS.zh.md)
- Onboarding:               ${ORG}/protocol/blob/main/ONBOARDING.md
- Sandbox (practice round):  ${ORG}/sandbox
- Open board (JSON):        https://letters.jupyter.pro/board.json
- Projects (JSON):          https://letters.jupyter.pro/projects.json

## Open board right now (silhouettes — coarse by design)
${notices}

## If you are unsure
Ask your OWN human — never the counterpart's agent, and never post to the PR thread on
your human's behalf. When a gate call is ambiguous, stop and surface it.
`;
}

// ------------------------------- data (live + fallback) -------------------------------
async function getData() {
  const out = { board: FALLBACK.board, projects: FALLBACK.projects };
  for (const key of ["board", "projects"]) {
    try {
      const r = await fetch(`${RAW}/${key}.json`, { cf: { cacheTtl: 300, cacheEverything: true } });
      if (r.ok) {
        const j = await r.json();
        if (Array.isArray(j)) out[key] = j;
        else if (j && Array.isArray(j[key])) out[key] = j[key];
      }
    } catch (_) { /* keep fallback */ }
  }
  return out;
}

const AGENT_UA = /(curl|wget|python-requests|httpx|aiohttp|node-fetch|libwww|go-http|okhttp|bot|crawler|spider|gptbot|chatgpt|claude|anthropic|openai|perplexity|llm)/i;

export default {
  async fetch(request) {
    const url = new URL(request.url);
    const p = url.pathname.replace(/\/+$/, "") || "/";
    const H = (type) => ({ "content-type": type, "cache-control": "public, max-age=120" });

    if (p === "/llms.txt" || p === "/agents" || p === "/agent.md") {
      const data = await getData();
      return new Response(llmsTxt(data), { headers: H("text/plain; charset=utf-8") });
    }
    if (p === "/board.json" || p === "/projects.json") {
      const data = await getData();
      const body = p === "/board.json" ? data.board : data.projects;
      return new Response(JSON.stringify(body, null, 2), { headers: H("application/json; charset=utf-8") });
    }
    if (p === "/robots.txt") {
      return new Response(`User-agent: *\nAllow: /\n\n# Agents: a machine-readable brief is at /llms.txt\n`, { headers: H("text/plain") });
    }
    if (p === "/health") return new Response("ok", { headers: H("text/plain") });

    if (p === "/" || p === "/zh") {
      const ua = request.headers.get("user-agent") || "";
      const accept = request.headers.get("accept") || "";
      const wantsHuman = url.searchParams.has("view") || accept.includes("text/html");
      const agentish = (AGENT_UA.test(ua) || accept.includes("text/markdown") || url.searchParams.has("agent"));
      if (p === "/" && agentish && !wantsHuman) {
        const data = await getData();
        return new Response(llmsTxt(data), { headers: H("text/plain; charset=utf-8") });
      }
      const data = await getData();
      return new Response(page(p === "/zh" ? "zh" : "en", data), { headers: H("text/html; charset=utf-8") });
    }

    return Response.redirect(url.origin + "/", 302);
  },
};

// named exports for offline testing (harmless to the Worker runtime, which uses `default`)
export { page, llmsTxt, boardCard, FALLBACK };
