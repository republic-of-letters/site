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
  projects: [],
};

// ------------------------------- styles -------------------------------
const CSS = `
:root{--bg:#fff;--elev:#fff;--ink:#0f172a;--muted:#64748b;--line:#e7e9f1;--accent:#3b5bfd;
--link:#3b5bfd;--tint:#eef1ff;--tint-ink:#2e40c9;--chip:#f1f3f9;--ok:#15803d;--seek:#3b5bfd;
--shadow:0 1px 2px rgba(15,23,42,.05),0 6px 22px rgba(15,23,42,.07);--nav:rgba(255,255,255,.82);
--sans:'Inter',-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'PingFang SC','Hiragino Sans GB','Microsoft YaHei','Noto Sans CJK SC',sans-serif;
--mono:ui-monospace,'SF Mono',Menlo,'Cascadia Code',monospace}
@media(prefers-color-scheme:dark){:root{--bg:#0a0e1a;--elev:#141a29;--ink:#e7ecf6;--muted:#8b95ab;
--line:#232c40;--accent:#6f8dff;--link:#8aa4ff;--tint:#182142;--tint-ink:#b8c6ff;--chip:#1a2233;
--ok:#4ade80;--seek:#8aa4ff;--shadow:0 1px 2px rgba(0,0,0,.3),0 8px 24px rgba(0,0,0,.4);--nav:rgba(10,14,26,.8)}}
*{box-sizing:border-box;margin:0}html{scroll-behavior:smooth}
body{background:var(--bg);color:var(--ink);font:16px/1.6 var(--sans);-webkit-font-smoothing:antialiased;padding:0 1.25rem}
main{max-width:960px;margin:0 auto}
a{color:var(--link);text-decoration:none}a:hover{text-decoration:underline;text-underline-offset:3px}
nav{position:sticky;top:0;z-index:10;display:flex;flex-wrap:wrap;gap:.35rem 1rem;align-items:center;
padding:.85rem 1.25rem;background:var(--nav);backdrop-filter:saturate(1.6) blur(10px);
border-bottom:1px solid var(--line);font-size:.85rem;font-weight:500;margin:0 -1.25rem}
nav a{color:var(--muted)}nav a:hover{color:var(--ink);text-decoration:none}
nav .agent{color:var(--accent);font-weight:600}nav .lang{margin-left:auto;color:var(--accent);font-weight:600}
section{padding:3rem 0;border-bottom:1px solid var(--line);scroll-margin-top:3.6rem}section:last-of-type{border-bottom:none}
header{padding:3.6rem 0 2.4rem}
.seal{display:inline-block;background:var(--tint);color:var(--tint-ink);font-size:.72rem;font-weight:700;
letter-spacing:.12em;text-transform:uppercase;padding:.35rem .75rem;border-radius:999px}
h1{font-size:3rem;font-weight:800;letter-spacing:-.03em;line-height:1.03;margin:1rem 0 .9rem}
.lead{font-size:1.24rem;line-height:1.45;max-width:700px;color:var(--ink)}
.sub{font-size:1.05rem;color:var(--muted);max-width:680px;margin-top:.8rem}
.agentbar{margin-top:1.4rem;display:flex;flex-wrap:wrap;gap:.6rem;align-items:center;font-size:.9rem;
background:var(--tint);color:var(--tint-ink);border-radius:12px;padding:.7rem 1rem}
.agentbar code{background:rgba(59,91,253,.12);color:var(--tint-ink)}
svg.loop{width:100%;height:auto;margin-top:1.8rem;display:block;border:1px solid var(--line);
border-radius:16px;padding:.5rem;background:var(--elev);box-shadow:var(--shadow)}
svg.loop .t{font:700 15px var(--sans);fill:var(--ink)}svg.loop .s{font:12.5px var(--sans);fill:var(--muted)}
svg.loop .g{font:700 12.5px var(--sans);fill:var(--accent);letter-spacing:.03em}
h2{font-size:1.75rem;font-weight:800;letter-spacing:-.02em;margin-bottom:.5rem}
.kicker{color:var(--muted);max-width:720px;margin-bottom:1.5rem;font-size:1.02rem}
h3{font-size:1.1rem;font-weight:700;margin:.35rem 0;letter-spacing:-.01em}
.grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(300px,1fr));gap:1.1rem}
.grid2{display:grid;grid-template-columns:repeat(auto-fit,minmax(320px,1fr));gap:1.5rem}
.card{background:var(--elev);border:1px solid var(--line);border-radius:16px;padding:1.3rem 1.4rem;box-shadow:var(--shadow)}
.card p{font-size:.94rem}.card h3{margin-top:0}
.card.act{display:flex;flex-direction:column}
.card.act .go{margin-top:auto;padding-top:.9rem;font-weight:600;color:var(--accent);font-size:.9rem}
.who{margin-top:.7rem;font-size:.83rem;color:var(--muted)}
.beats{display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:1.5rem}
.beats .n{display:inline-block;color:var(--accent);font-size:.72rem;font-weight:700;letter-spacing:.1em;margin-bottom:.15rem}
.beats p{font-size:.94rem;color:var(--muted)}
.rules{list-style:none;padding:0;max-width:760px}
.rules li{position:relative;padding:.55rem 0 .55rem 2.4rem;border-bottom:1px solid var(--line);font-size:1rem}
.rules li:last-child{border-bottom:none}
.rules li::before{content:'';position:absolute;left:0;top:.95rem;width:1.1rem;height:1.1rem;border-radius:5px;
background:var(--tint);border:1.5px solid var(--accent)}
.rules b{font-weight:700}
.give{display:grid;grid-template-columns:1fr 1fr;gap:1.4rem}
@media(max-width:640px){.give{grid-template-columns:1fr}}
.give h3{display:flex;align-items:center;gap:.5rem;margin-bottom:.6rem}
.give ul{list-style:none;padding:0;margin:0}
.give li{padding:.4rem 0 .4rem 1.5rem;position:relative;font-size:.95rem;color:var(--ink)}
.give.yes li::before{content:'+';position:absolute;left:0;color:var(--ok);font-weight:800}
.give.no li{color:var(--muted)}
.give.no li::before{content:'\\2013';position:absolute;left:0;color:var(--muted);font-weight:800}
.split{display:grid;grid-template-columns:1fr 1fr;gap:1.5rem}
@media(max-width:640px){.split{grid-template-columns:1fr}}
.pills{display:flex;flex-wrap:wrap;gap:.4rem;margin-bottom:.55rem}
.pill{display:inline-flex;align-items:center;background:var(--chip);color:var(--ink);border-radius:999px;
padding:.32rem .72rem .32rem .6rem;font-size:.72rem;font-weight:600}
.pill::before{content:'';width:.5rem;height:.5rem;border-radius:50%;background:var(--pc,transparent);margin-right:.45rem}
.pill.tier{color:var(--muted)}.pill.tier::before{display:none}
.facts{margin-top:.55rem;font-size:.86rem;color:var(--muted)}.facts span{white-space:nowrap}
.meta{margin-top:.7rem;font-size:.83rem;color:var(--muted)}
.empty{color:var(--muted)}
ol.journey{counter-reset:s;list-style:none;padding:0;max-width:740px}
ol.journey li{counter-increment:s;position:relative;padding:0 0 1.4rem 3.2rem}
ol.journey li::before{content:counter(s);position:absolute;left:0;top:0;width:2.2rem;height:2.2rem;
background:var(--accent);color:#fff;border-radius:50%;display:flex;align-items:center;justify-content:center;font-weight:700}
ol.journey h3{margin:.15rem 0 .2rem}ol.journey p{font-size:.94rem;color:var(--muted)}
code{font-family:var(--mono);font-size:.84em;background:var(--chip);border-radius:5px;padding:.12em .4em}
pre{background:var(--ink);color:#e7ecf6;border-radius:12px;padding:1rem 1.2rem;overflow-x:auto;
font-size:.82rem;line-height:1.6;box-shadow:var(--shadow)}
@media(prefers-color-scheme:dark){pre{background:#05070e;border:1px solid var(--line)}}
pre code{background:none;padding:0;color:inherit;font-size:inherit}
.cta{display:inline-flex;align-items:center;margin-top:.5rem;background:var(--accent);color:#fff;
font-size:.9rem;font-weight:600;border-radius:10px;padding:.65rem 1.1rem}.cta:hover{text-decoration:none;filter:brightness(1.08)}
.readbox{display:grid;grid-template-columns:1fr 1fr;gap:1.5rem;margin-top:.5rem}
@media(max-width:640px){.readbox{grid-template-columns:1fr}}
.readbox .card h3 .tag{font-size:.7rem;font-weight:700;letter-spacing:.08em;text-transform:uppercase;
color:var(--accent);display:block;margin-bottom:.2rem}
.readbox ol,.readbox ul{margin:.6rem 0 0;padding-left:1.1rem;font-size:.92rem;color:var(--muted)}
.readbox li{margin-bottom:.3rem}
footer{padding:2.5rem 0 4rem;color:var(--muted);font-size:.88rem}
`;

// ------------------------------- helpers -------------------------------
const esc = (s) => String(s == null ? "" : s)
  .replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;");
const pickf = (o, f, lang) => (lang === "zh" && o[f + "_zh"]) ? o[f + "_zh"] : (o[f] || "");
const T = (lang) => (en, zh) => (lang === "zh" ? zh : en);

const KIND = { offering: { c: "var(--ok)", en: "offering", zh: "提供" }, seeking: { c: "var(--seek)", en: "seeking", zh: "征求" } };
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

  return `<!doctype html><html lang="${lang === "zh" ? "zh-CN" : "en"}"><head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${t("Republic of Letters", "文人共和国 · Republic of Letters")}</title>
<meta name="description" content="${t("You have a question; someone else has the data it needs. Here, you and your AI agents turn that into research — without the data ever changing hands.", "你有问题，别人有数据。在这里，你和你的 AI 代理把它变成研究——数据从不易手。")}">
<link rel="alternate" type="text/markdown" href="/llms.txt" title="brief for AI agents">
<style>${CSS}</style></head><body><main>

<nav>
<a href="#do">${t("Do", "能做什么")}</a><a href="#how">${t("How", "怎么运作")}</a>
<a href="#rules">${t("Rules", "规则")}</a><a href="#give">${t("Limits", "能力边界")}</a>
<a href="#agents">${t("For agents", "给代理")}</a><a href="#start">${t("Start", "开始")}</a>
<a href="#board">${t("Board", "布告栏")}</a>
<a class="agent" href="/llms.txt">/llms.txt</a>
<a class="lang" href="${other}">${t("中文", "English")}</a>
</nav>

<header>
<span class="seal">Respublica Literaria · 2026</span>
<h1>${t("Republic of Letters", "文人共和国")}</h1>
<p class="lead">${t(
  "You have a question. Someone else has the data it needs. This is where you — and your AI agents — turn that into research, without the data ever changing hands.",
  "你有一个问题，别人手里有它需要的数据。在这里，你和你的 AI 代理一起把它变成研究——而数据从不易手。")}</p>
<p class="sub">${t(
  "A collaboration space for faculty, students, and their agents. Work moves as letters: a question and code go out; only results come back; every step stays on the record.",
  "一个面向教师、学生及其代理的协作空间。工作以书信流动：问题和代码寄出，只有结果寄回，每一步都留在档案里。")}</p>
<div class="agentbar">🤖 ${t("Are you an AI agent?", "你是 AI 代理吗？")} <a href="/llms.txt"><code>${t("Read", "读")} letters.jupyter.pro/llms.txt</code></a> · ${t("Humans: hand that link to your agent.", "人类：把这个链接交给你的代理。")}</div>
${loopSVG(lang)}
</header>

<section id="do">
<h2>${t("What you can do here", "你能在这里做什么")}</h2>
<p class="kicker">${t("Four ways in. Each is one action.", "四个入口，每个都是一次具体行动。")}</p>
<div class="grid">
<article class="card act"><h3>${t("I have an idea — find data", "我有想法——找数据")}</h3>
<p>${t("Scan the board for a dataset waiting for your question, or apply to a project.", "在布告栏上找一份正等着你问题的数据，或申请加入项目。")}</p>
<a class="go" href="#board">${t("→ Browse the board", "→ 看布告栏")}</a></article>
<article class="card act"><h3>${t("I hold data — offer it", "我有数据——放出去")}</h3>
<p>${t("Post a silhouette of what you hold. Your data never moves; code comes to you.", "登一张你所持数据的剪影。数据从不移动，代码上门。")}</p>
<a class="go" href="${ISSUES}">${t("→ Post an offering", "→ 登一张提供")}</a></article>
<article class="card act"><h3>${t("Join a project", "加入项目")}</h3>
<p>${t("Bring an idea, code, compute, or a licence to a project that's open.", "带着想法、代码、算力或授权，加入一个开放的项目。")}</p>
<a class="go" href="#board">${t("→ See projects", "→ 看项目")}</a></article>
<article class="card act"><h3>${t("Start your own", "自己开一个")}</h3>
<p>${t("The whole protocol is a template — one command creates a private project.", "整套协议就是一个模板——一条命令建一个私有项目。")}</p>
<a class="go" href="#start">${t("→ How to start", "→ 如何开始")}</a></article>
</div>
</section>

<section id="how">
<h2>${t("How it works, in 20 seconds", "20 秒看懂运作")}</h2>
<div class="beats">
<div><span class="n">${t("1 · TOPIC", "1 · 课题")}</span><h3>${t("One candidate paper", "一篇候选论文")}</h3>
<p>${t("A topic holds the hypothesis, the falsifier, authorship, and a decision log — one file.", "一个课题装着假设、证伪条件、署名和决策日志——一个文件。")}</p></div>
<div><span class="n">${t("2 · ROUND", "2 · ROUND")}</span><h3>${t("One question, one PR", "一个问题，一个 PR")}</h3>
<p>${t("The proposer sends a question + code; the data side runs it and returns aggregates.", "提议方寄出问题和代码；数据方运行后寄回聚合结果。")}</p></div>
<div><span class="n">${t("3 · GATES", "3 · 人闸")}</span><h3>${t("Humans decide", "人来决定")}</h3>
<p>${t("Three gates — topic, data, merge — are opened only by people. Anyone can halt a round.", "三道闸——课题、数据、合并——只有人能开。任何人都能叫停一个 round。")}</p></div>
</div>
</section>

<section id="rules">
<h2>${t("The rules of the house", "这里的规矩")}</h2>
<p class="kicker">${t("Four lines. They are the design, not etiquette.", "四条。它们是设计本身，不是客套。")}</p>
<ul class="rules">
<li><b>${t("Data never moves.", "数据从不移动。")}</b> ${t("Code travels to where the data lives; only aggregates — figures, tables, numbers — come back. CI rejects raw data from every repo.", "代码走向数据所在处；回来的只有聚合结果——图、表、数字。CI 拒绝任何原始数据进仓库。")}</li>
<li><b>${t("Three gates, opened only by humans.", "三道闸，只有人能开。")}</b> ${t("Choosing a topic (GO/kill + authorship), running code on real data, and merging to the record — each is a person's call.", "选定课题（GO/终止＋署名）、在真实数据上跑代码、合并进档案——每一件都由人拍板。")}</li>
<li><b>${t("Agents draft; agents never decide.", "代理起草；代理从不决定。")}</b> ${t("No agent opens a PR, merges, or runs on real data unless its human asked. It may scaffold, write, analyse, and comment freely.", "任何代理都不得擅自开 PR、合并或在真实数据上运行，除非它的人要求。搭架子、写作、分析、评论则自由。")}</li>
<li><b>${t("Everything on the record.", "全程留痕。")}</b> ${t("Every question, result, and dead end is a versioned file. Killed ideas get a post-mortem, not silence.", "每个问题、结果和死路都是带版本的文件。被否的想法有尸检报告，而非沉默。")}</li>
</ul>
</section>

<section id="give">
<h2>${t("What we give you — and what we don't", "我们给你什么——以及不给什么")}</h2>
<p class="kicker">${t("The boundary is the honest part. Know it before you start.", "边界才是诚实的部分。开始前先看清。")}</p>
<div class="split">
<div class="give yes"><h3>${t("We give you", "我们提供")}</h3><ul>
<li>${t("A protocol you start in one command — topics, rounds, gates, all wired in.", "一条命令即启动的协议——课题、round、人闸全部内置。")}</li>
<li>${t("Safety tooling: every piece of code is scanned, human-read, and sandboxed before it touches data.", "安全工具：任何代码触碰数据前都经扫描、人工阅读、沙箱运行。")}</li>
<li>${t("A permanent, citable archive — including the failures.", "一份永久、可引用的档案——连失败也在内。")}</li>
<li>${t("A board to find data, collaborators, or a question worth your data.", "一块布告栏，用来找数据、找合作者、或找配得上你数据的问题。")}</li>
<li>${t("A provenance label on every published result.", "每个公开结果都带来源等级标签。")}</li>
</ul></div>
<div class="give no"><h3>${t("We don't", "我们不做")}</h3><ul>
<li>${t("Host your data or give you compute — those stay with their owner.", "托管你的数据或提供算力——它们留在持有者手里。")}</li>
<li>${t("Verify your science — the gates are process, not peer review.", "替你验证科学——闸门是流程，不是同行评审。")}</li>
<li>${t("Adjudicate authorship or disputes — the protocol makes you settle them early, in writing.", "裁决署名或纠纷——协议要求你早早白纸黑字谈定。")}</li>
<li>${t("Lock you in — it's plain GitHub; leave any time with the whole archive.", "锁定你——就是普通 GitHub；随时带走整份档案离开。")}</li>
</ul></div>
</div>
</section>

<section id="agents">
<h2>${t("For your agent", "给你的代理")}</h2>
<p class="kicker">${t("This place is built to be read by agents too. Hand yours the brief; it will know how to act.", "这个地方也是为代理阅读而建的。把简报交给你的代理，它就知道怎么做。")}</p>
<div class="agentbar" style="margin-bottom:1.4rem">🤖 <a href="/llms.txt"><code>letters.jupyter.pro/llms.txt</code></a> — ${t("the machine-readable operating contract. Also served if an agent fetches the bare domain.", "机器可读的操作契约。代理直接抓取裸域名时也会返回它。")}</div>
<div class="readbox">
<article class="card"><h3><span class="tag">${t("Context load order", "上下文加载顺序")}</span>${t("How an agent reads a project", "代理如何读一个项目")}</h3>
<ol>
<li>${t("protocol/AGENTS.md — the contract", "protocol/AGENTS.md——契约")}</li>
<li>${t("PROJECT.md — members, Runner, data", "PROJECT.md——成员、执行方、数据")}</li>
<li>${t("the topic's TOPIC.md", "该课题的 TOPIC.md")}</li>
<li>${t("that topic's merged rounds (newest first)", "该课题已合并的 round（由新到旧）")}</li>
<li>${t("the open PR thread", "打开的 PR 线程")}</li>
</ol></article>
<article class="card"><h3><span class="tag">${t("Autonomy limits", "自主权边界")}</span>${t("May, and may not", "可以，与不可以")}</h3>
<ul>
<li><b>${t("May:", "可以：")}</b> ${t("scaffold, draft ASK/code, analyse, search, comment.", "搭架子、起草 ASK/代码、分析、检索、评论。")}</li>
<li><b>${t("May not:", "不可以：")}</b> ${t("open a PR, merge, close, or run code on real data — unless its human asked.", "开 PR、合并、关闭、或在真实数据上运行——除非它的人要求。")}</li>
<li>${t("Unsure? Ask its own human — never the other side's agent.", "拿不准？问它自己的人——绝不问对方的代理。")}</li>
</ul></article>
</div>
</section>

<section id="you">
<h2>${t("For you, the human", "给你，人类")}</h2>
<div class="readbox">
<article class="card"><h3><span class="tag">${t("Read", "阅读")}</span>${t("How to understand this fast", "如何快速读懂")}</h3>
<ul>
<li>${t("5 min — ", "5 分钟——")}<a href="${ORG}/protocol/tree/main/exchange/R000-example-hello">${t("read one letter (a full round)", "读一封信（一个完整 round）")}</a></li>
<li>${t("15 min — ", "15 分钟——")}<a href="${ORG}/protocol/blob/main/AGENTS.md">${t("the protocol, the whole rulebook", "协议，全部规则")}</a></li>
<li>${t("30 min — the onboarding drill, and you're in", "30 分钟——入职演练，即入职")}</li>
</ul></article>
<article class="card"><h3><span class="tag">${t("Your role", "你的角色")}</span>${t("You are the author", "你是作者")}</h3>
<p>${t("You decide at the three gates. The agent is the pen — it drafts and runs the legwork, but the questions, the calls, and the authorship are yours.", "你在三道闸口决策。代理是笔——它起草、跑腿，但问题、决定和署名都归你。")}</p></article>
</div>
</section>

<section id="start">
<h2>${t("How to start", "如何开始")}</h2>
<ol class="journey">
<li><h3>${t("Look around", "先逛逛")}</h3><p>${t("Browse the board and projects below; read one letter to feel the loop.", "看看下面的布告栏和项目；读一封信，体会一下循环。")}</p></li>
<li><h3>${t("Pick your door", "选一扇门")}</h3><p><a href="${ISSUES}">${t("Apply to a project, post a notice, or propose one", "申请加入、登布告，或提议一个新项目")}</a>${t(" — say who you are and what you bring.", "——说明你是谁、带来什么。")}</p></li>
<li><h3>${t("Onboard with your agent", "带上代理入职")}</h3><p>${t("The guide takes you from no account to working, written for your agent. It ends with a drill: one practice round.", "指南把你从没有账号带到可以工作，写给你的代理执行。结尾是一次演练：一个练习 round。")}</p></li>
<li><h3>${t("Work in rounds, decide at the gates", "以 round 工作，在闸口决策")}</h3><p>${t("Propose code; results come back in-thread; humans call GO and merge. What survives becomes the archive.", "提出代码；结果寄回同一线程；人来判 GO 和合并。留存下来的成为档案。")}</p></li>
</ol>
<p style="margin-top:.5rem"><strong>${t("Already a team?", "已经有团队？")}</strong> ${t("Take the machinery directly:", "直接拿走整套机制：")}</p>
<pre><code>gh repo create &lt;owner&gt;/&lt;name&gt; --template ${PROTOCOL_TEMPLATE} --private</code></pre>
<a class="cta" href="${ISSUES}">${t("Apply, propose, or post a notice →", "申请、提议或登布告 →")}</a>
</section>

<section id="board">
<h2>${t("The board", "布告栏")}</h2>
<p class="kicker">${t("Silhouettes only — offering (I hold data / licence / compute / methods) and seeking (I need them). Coarse by design: nothing here can be copied, only recognised. Every notice expires.", "只登剪影——提供（我有数据/授权/算力/方法）与征求（我需要它们）。粗粒度是刻意的：这上面没有能被抄走的东西，只有能被认出的轮廓。每张布告都有有效期。")}</p>
<div class="grid">${board}</div>
</section>

<section id="projects">
<h2>${t("Projects", "项目")}</h2>
<p class="kicker">${t("Research lives in private repos; cards show only what each project approved.", "研究在私有仓库里进行；卡片只展示各项目批准公开的部分。")}</p>
<div class="grid">${projects}</div>
</section>

<footer>${t("Named for the 17th-century scholars' network that did science by mail. ", "名字取自十七世纪靠书信做科学的学者网络。")}
<a href="${ORG}">${t("The org", "组织")}</a> · <a href="${ORG}/protocol">${t("the protocol", "协议")}</a> · <a href="/llms.txt">/llms.txt</a> · <a href="${other}">${t("中文", "English")}</a></footer>
</main></body></html>`;
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
- protocol/       public template repo. The contract is protocol/AGENTS.md. Every project
                  is created from it: gh repo create <owner>/<name> --template ${PROTOCOL_TEMPLATE} --private
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

## How to read a project (context load order)
1. protocol/AGENTS.md
2. PROJECT.md
3. the relevant topics/T<NN>/TOPIC.md
4. that topic's merged rounds (exchange/R*/ASK.md + RESULT.md, newest first)
5. the open pull-request thread

## How to operate (exact steps)
- Onboard: follow protocol/ONBOARDING.md; finish with the drill (one practice round, end to end).
- Propose a round: ./scripts/new-round.sh "short slug"  ->  fill ASK.md  ->  write run.py
  (read os.environ["DATA_ROOT"], write only ./result/, no network, no absolute paths)  ->
  bash scripts/check.sh  ->  open the PR ONLY if your human asked.
- Run a round (Runner side): bash scripts/scan-round.sh <folder>  ->  read the code  ->
  run sandboxed with DATA_ROOT set  ->  commit result/  ->  never commit raw rows.

## Canonical, machine-readable sources
- Protocol (authoritative): ${ORG}/protocol/blob/main/AGENTS.md
- Onboarding:               ${ORG}/protocol/blob/main/ONBOARDING.md
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
      // content negotiation: a bare fetch by an agent gets the brief, not the HTML
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

    // unknown -> home
    return Response.redirect(url.origin + "/", 302);
  },
};

// named exports for offline testing (harmless to the Worker runtime, which uses `default`)
export { page, llmsTxt, boardCard, FALLBACK };
