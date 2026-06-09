# FukuFlow — Social Media Promotion Strategy (Open Source, $0 Budget)

A practical, free-only playbook for promoting FukuFlow. Every channel and tactic below costs
nothing but time. Ordered by expected impact for a self-hosted open-source finance app.

---

## 1. Positioning & Messaging

Before posting anywhere, lead with what makes FukuFlow different. The self-hosted finance space
is crowded (Firefly III, Ghostfolio, Actual Budget, Maybe, Wealthfolio), so the pitch must be
sharp.

### One-liner

> **FukuFlow** — a self-hosted, privacy-first net-worth dashboard for the whole family.
> No bank linking, no cloud, no subscription. One Docker command and your data never leaves
> your machine.

### Key differentiators (use these in every post)

| Angle | Why it lands |
|---|---|
| **No bank linking / manual snapshots** | Works in *any* country, any broker, any asset (real estate, crypto, watches, cash under the mattress). Plaid-based tools don't work outside the US/EU. |
| **Multi-person / family portfolios** | Most competitors are single-user. Tracking spouse + kids in one dashboard is a real gap. |
| **Privacy Mode** | Hide amounts, keep trends — perfect for screenshots, demos, and looking at finances in public. Also makes *your own promo screenshots* effortless. |
| **Snapshot model, not transaction model** | Net-worth tracking, not budgeting. 5 minutes a month, not categorizing every coffee. Positions FukuFlow *next to*, not against, Firefly/Actual. |
| **Deployment range** | One-liner Docker (`ghcr.io/gartur/fukuflow:latest`) *and* a portable Windows `.exe` with system tray — almost no self-hosted app offers both. |
| **Performance metrics done right** | CAGR, max drawdown, volatility — *net of cash flows*. Finance-savvy users notice this immediately. |
| **Monthly heatmap** | The most screenshot-able feature. Visual hooks drive shares. |

### Audience segments

1. **r/selfhosted crowd** — homelabbers; care about Docker, data ownership, no telemetry.
2. **FIRE / personal-finance trackers** — people maintaining net-worth spreadsheets today; the
   spreadsheet is the competitor, not other apps.
3. **Non-US users** — locked out of Plaid/Mint-style tools; "no bank linking" is a feature here.
4. **Privacy-conscious families** — want shared visibility without a cloud service.
5. **React/TypeScript developers** — potential contributors; care about the stack (React 19,
   Vite, Express 5, full test pyramid: Vitest + Supertest + Playwright).

---

## 2. Prerequisites — Make the Repo "Shareable" First

Do these **before** any promotion. Traffic with a weak landing repo is wasted.

- [ ] **GitHub social preview image** (Settings → Social preview, 1280×640). Use the dashboard
      screenshot with the logo. This is what shows when the repo is linked on X/Mastodon/Slack.
- [ ] **GitHub topics**: `self-hosted`, `personal-finance`, `wealth-management`, `portfolio-tracker`,
      `net-worth`, `react`, `typescript`, `docker`, `privacy`, `fire`. Topics drive organic GitHub
      search/Explore traffic.
- [ ] **Repo description + website field** filled in (link to README anchor or demo).
- [ ] **Animated demo GIF** at the top of the README (LICEcap / ScreenToGif / Peek — all free).
      A 15-second loop: add snapshot → chart updates → toggle privacy mode → heatmap. GIFs are
      the single highest-leverage promo asset; they get embedded everywhere the repo is shared.
- [ ] **Demo instance or sample-data path**: the easiest free option is documenting
      `node scripts/generate_sample_data.cjs` prominently ("try it with realistic fake data in
      60 seconds"). A live read-only demo on a free tier (e.g. a small VPS you already run) is
      the upgrade later.
- [ ] **`CONTRIBUTING.md` + "good first issue" labels** — promotion brings contributors, not
      just users; have somewhere for them to land.
- [ ] **Tag a release** with human-readable notes. "Show HN" and Reddit posts that link a fresh
      release feel like news, not ads.
- [ ] **Enable GitHub Discussions** — gives non-Reddit users a place to ask questions, and
      activity signals a living project.

---

## 3. Channel Playbook (all free)

### Tier 1 — highest expected return

#### Reddit
The single best free channel for this category. **Read each subreddit's self-promo rules
first**; most allow OSS announcements if you're transparent ("I built this, it's MIT-licensed,
no paid tier").

| Subreddit | Angle | Notes |
|---|---|---|
| **r/selfhosted** | "I built a self-hosted net-worth dashboard — no bank linking, one Docker command" | The home crowd. Post on a weekday morning US time. Include heatmap screenshot + docker run one-liner in the post body. |
| **r/opensource** | Project announcement + ask for feedback | Welcomes maintainer posts. |
| **r/Fire / r/financialindependence** | "Stop maintaining your net-worth spreadsheet" angle | Check rules — often only allowed in daily threads. The *spreadsheet replacement* framing wins here. |
| **r/eupersonalfinance, r/UKPersonalFinance, r/PersonalFinanceCanada** | "Works without Plaid / bank APIs" | Non-US is FukuFlow's structural advantage. Verify each sub's promo policy. |
| **r/reactjs, r/node** | "Architecture of a full-stack React 19 + Express 5 + SQLite app with full test pyramid" | Post as a *technical write-up*, not a product ad. Drives contributors. |
| **r/SideProject, r/coolgithubprojects** | Straight announcements welcome | Low effort, decent reach. |
| **r/homelab, r/unRAID, r/docker** | Deployment-focused post once a community template/compose example exists | unRAID Community Apps template = recurring installs. |

**Reddit etiquette that decides success:** post as yourself ("I've been building this for my
family for a year…"), answer every comment for the first 24 h, never post the same text to two
subs on the same day, and accept criticism gracefully — feature requests in comments are free
roadmap marketing.

#### Hacker News — "Show HN"
- Title format: `Show HN: FukuFlow – self-hosted family net-worth tracker (no bank linking)`.
- First comment from you: why you built it, what's hard (snapshot-based performance math net of
  cash flows is genuinely interesting), what feedback you want.
- Post Tue–Thu, 8–10 am US Eastern. If it doesn't take off, **one** repost weeks later with a
  new release is acceptable per HN norms.
- A good Show HN is worth 500–3000 GitHub visitors and often seeds the blog/newsletter pickups
  below.

#### Directory & list submissions (one-time, compounding forever)
- [ ] **awesome-selfhosted** (PR to the Money/Finance section) — the highest-traffic free
      listing in this niche. Requirements: active repo, license, docs. 
- [ ] **selfh.st apps directory** + email the **selfh.st weekly newsletter** (regularly features
      new apps — free).
- [ ] **AlternativeTo** — create a listing; set as alternative to Mint, Empower/Personal Capital,
      Kubera, Ghostfolio. People searching "Mint alternative self-hosted" find you forever.
- [ ] **awesome-react / awesome-vite** style lists where the project qualifies.
- [ ] **LibHunt**, **OpenAlternative.co**, **Selfhst.club-style catalogs** — low effort each.
- [ ] **unRAID Community Apps** and a **Portainer/CasaOS/Umbrel/Runtipi app-store template** —
      each app store is a permanent distribution channel and each submission is free.

### Tier 2 — ongoing presence

#### Mastodon (Fosstodon) + Bluesky
The FOSS audience genuinely lives here now, and hashtags still work (unlike X).
- Create the account on **fosstodon.org** (FOSS-only instance, promo of your own OSS is the
  culture, not an exception).
- Use `#selfhosted #opensource #personalfinance #FIRE #homelab` — Mastodon hashtag follows give
  small accounts real reach.
- Cadence: 1–2 posts/week. Release notes, one-feature spotlights with a screenshot, dev
  insights ("how I calculate drawdown net of cash flows").
- Mirror the same content to **Bluesky** (self-hosted/FOSS community is active; use the same
  hashtags + join relevant feeds/starter packs).

#### X / Twitter
Lower organic reach for small accounts, but free and where #buildinpublic lives.
- Thread format works best: "I got tired of my net-worth spreadsheet, so I built…" with 4–5
  screenshots ending in the repo link.
- Tag/engage with self-hosting and FIRE accounts; reply to "what do you use to track net
  worth?" threads — replies outperform cold posts at small follower counts.

#### Lemmy
- Post to `!selfhosted@lemmy.world` and `!opensource@lemmy.ml` — smaller than Reddit but
  high-affinity and very welcoming to OSS announcements.

#### Dev.to / Hashnode (free blogging with built-in distribution)
Write once, repost everywhere. Article ideas that promote without being ads:
1. *"I built a self-hosted wealth tracker because Mint doesn't exist in my country"* — story post.
2. *"Snapshot-based portfolio math: CAGR, drawdown and volatility net of cash flows"* — the
   finance-nerd magnet; this is linkable reference content.
3. *"React 19 + Express 5 + SQLite: a full test pyramid (Vitest, Supertest, Playwright) on a
   solo project"* — contributor magnet.
4. *"Packaging a Node.js web app as a single Windows .exe with system-tray integration"* —
   genuinely rare content; ranks in search.

Each article ends with the repo link and the demo GIF. Cross-post the dev-heavy ones to
r/reactjs / r/node and HN.

#### YouTube (zero budget, two modes)
- **Passive**: pitch FukuFlow to self-hosting YouTubers who review apps for free content —
  DB Tech, Awesome Open Source, Jim's Garage, Techno Tim viewers are exactly the target user.
  A 2-line email with the GIF and the docker one-liner is enough; they need a steady supply of
  apps to cover.
- **Active (optional)**: a single 3–5 min "tour + install" screen recording (OBS, free) embedded
  in the README and posted once. Doesn't need production value; needs the heatmap.

### Tier 3 — opportunistic

- **Product Hunt** — free to launch. Do it *after* the Reddit/HN wave so the repo has stars
  (social proof) and you have screenshots/GIF ready. Tuesday–Thursday launch.
- **Changelog News / Console.dev newsletters** — both take free submissions of interesting OSS.
- **Discord/Matrix communities** (selfhosted Discord, homelab servers) — share in their
  #showcase / #self-promo channels only; otherwise just be present and helpful.
- **Comment marketing** — answer "how do you track net worth?" questions on Reddit/HN/Bluesky
  with a genuine answer that mentions FukuFlow as *one* option. Slow, compounding, free.

---

## 4. Content Pillars & Cadence

Sustainable solo-maintainer cadence: **~2 hours/week** after launch month.

| Pillar | Share | Examples |
|---|---|---|
| **Feature spotlights** | 40% | Heatmap deep-dive, Privacy Mode demo GIF, CSV import, multi-person view, themes |
| **Build in public** | 25% | Release notes as posts, "what I'm working on", architecture decisions (the ADRs in `docs/adr/` are ready-made content) |
| **Education** | 20% | What is CAGR/drawdown, why track net worth monthly, snapshot vs transaction tracking |
| **Community** | 15% | Answering questions, celebrating contributors/stars milestones, polls on next feature |

Rules of thumb:
- Every post has **one image or GIF** (Privacy Mode makes real-data screenshots safe).
- Every release = one Mastodon/Bluesky/X post + GitHub Release notes; minor releases don't go
  to Reddit, major ones do.
- Reuse: one piece of content → README, Dev.to, Mastodon thread, Reddit post, HN — staggered
  over 1–2 weeks, adapted per platform tone.

---

## 5. Launch Sequence (first 6 weeks)

**Week 0 — prep (no posting)**
- Complete the checklist in §2 (GIF, social preview, topics, release, CONTRIBUTING).
- Create Fosstodon + Bluesky accounts; soft-post 2–3 times so profiles aren't empty.

**Week 1 — home turf**
- Mon: r/selfhosted announcement post.
- Tue–Wed: answer every comment; file the feature requests as GitHub issues publicly ("great
  idea — tracked in #123"). This visibly-responsive behavior is the actual marketing.
- Thu: Lemmy `!selfhosted` + Mastodon/Bluesky announcement.

**Week 2 — developer wave**
- Show HN (Tue–Thu morning US ET).
- Publish Dev.to article #1 (the story post), cross-post to r/SideProject.

**Week 3 — directories**
- Submit: awesome-selfhosted PR, AlternativeTo, selfh.st (+ newsletter email), LibHunt.
- Email 3–5 self-hosting YouTubers.

**Week 4 — finance audience**
- r/Fire daily thread + non-US personal-finance subs (rules permitting), spaced across the week.
- Dev.to article #2 (portfolio math) → also to HN as a normal (non-Show) submission.

**Week 5 — app stores**
- unRAID template, CasaOS/Runtipi/Umbrel submissions, docker-compose gist polished.

**Week 6 — Product Hunt**
- Launch with the assets and social proof accumulated above; announce the launch on all your
  now-warm channels.

After week 6, drop to the steady cadence in §4 and re-run the big channels (r/selfhosted, Show
HN) only on **major releases** — "FukuFlow 2.0: now with X" posts perform as well as launches.

---

## 6. Free Asset Checklist

| Asset | Tool (free) | Used in |
|---|---|---|
| 15-sec demo GIF | ScreenToGif / Peek / LICEcap | README, every social post |
| Social preview card 1280×640 | GIMP / Figma free / Canva free | GitHub, link unfurls everywhere |
| 4–6 clean screenshots (sample data + Privacy Mode) | Built-in `generate_sample_data.cjs` | Reddit, PH, AlternativeTo |
| 3–5 min install/tour video | OBS Studio | README, YouTube, PH |
| Logo variants (light/dark bg) | existing assets | Avatars on all accounts |
| One-paragraph + one-line blurbs | — | Directory submissions, YouTuber emails |

---

## 7. Measuring What Works (free analytics)

- **GitHub Insights → Traffic**: referrer breakdown shows which channel actually sends visitors
  (note: only 14-day history — screenshot/record it weekly).
- **Stars over time**: star-history.com (free) for milestone posts ("we hit 500 ⭐").
- **GHCR pulls** and **release download counts**: actual adoption, not vanity.
- Per-channel UTM-free attribution: use distinct landing anchors per channel if needed
  (e.g. link `#quick-start` from Reddit, plain repo from HN) and read referrers.

Review monthly; double down on the top-2 referrers, drop what sends nothing after two attempts.

---

## 8. Ground Rules

1. **Always disclose** you're the author. OSS communities reward transparency and ban shills.
2. **Never astroturf** (no fake accounts, no asking friends to pose as users).
3. **Respect per-sub rules** — one removed post can mean a subreddit ban that closes the best
   channel permanently. When unsure, message the mods first; mods generally like OSS authors
   who ask.
4. **Respond > broadcast**: an hour answering comments beats an hour writing a new post.
5. **Screenshots use sample data or Privacy Mode** — never real finances.
6. **Feature requests are marketing**: every public "good idea, tracked in #N" reply converts a
   commenter into a stakeholder.
