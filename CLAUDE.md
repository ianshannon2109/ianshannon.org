# CLAUDE.md

Guidance for AI assistants working in this repository.

## What this is

`ianshannon.org` is the personal/professional website of Ian Shannon — a
strategist and nonprofit executive in North Carolina. It is a **static,
hand-written website** with no build step, no framework, no package manager,
and no dependencies to install. Files are edited directly and served as-is.

## Tech stack

- Plain **HTML5**, one shared **CSS** file, and small vanilla **JavaScript** files.
- Google Fonts (`Playfair Display` for headings, `DM Sans` for body) loaded via CDN.
- No bundler, transpiler, Node project, or `package.json`. There is nothing to
  `npm install` or compile.

## Repository layout

```
index.html          Home / hero + summary cards
about.html          Short bio (prose)
experience.html     Résumé-style career & education history
capstone.html       Password-gated Duke MPA capstone page (noindex)
contact.html        Contact methods
styles.css          The single global stylesheet for every page
nav.js              Mobile nav toggle (used on every page)
capstone.js         Client-side password gate for capstone.html only
ian-shannon-headshot.png   Hero/social image
robots.txt          Disallows the capstone page
sitemap.xml         Public pages only (capstone intentionally excluded)
README.md           One-line description
```

## How to preview / "run" it

There is no dev server or build. To view locally, open an HTML file in a
browser, or serve the directory statically, e.g.:

```bash
python3 -m http.server 8000   # then visit http://localhost:8000/
```

Use a server (not `file://`) so relative paths and the fonts behave normally.

## Deployment

The site is served from the custom domain `ianshannon.org`. There is no CI
config or build pipeline in the repo (no `.github/workflows`, no `CNAME` file
checked in) — history shows files committed directly ("Add files via upload"),
consistent with GitHub Pages or a static host. **Whatever is on the default
branch is what ships**, so treat every change as production-facing. Don't add a
build step or framework unless explicitly asked.

## Conventions to follow

Each page is self-contained and repeats the same boilerplate. When adding or
editing pages, keep these patterns consistent:

- **`<head>` block:** every public page sets `<title>`, `<meta name="description">`,
  `author`, a `canonical` link, and the full Open Graph + Twitter card tags
  pointing at `ian-shannon-headshot.png`. Mirror an existing page's head when
  creating a new one.
- **Shared header nav:** the `<header class="site-header">` markup with the five
  links (Home, About, Experience, Capstone, Contact) is duplicated in every
  HTML file. The current page's link gets `class="active"`. **If you change a
  nav item, update it in all five HTML files.**
- **Footer:** `&copy; 2026 Ian Shannon` is hardcoded per page — update everywhere
  if the year changes.
- **Scripts:** every page includes `nav.js` before `</body>`. `capstone.html`
  additionally includes `capstone.js`.
- **Styling:** all styling lives in `styles.css`. Use the existing CSS custom
  properties in `:root` (`--navy`, `--accent`, `--bg`, `--surface`, `--muted`,
  `--border`, `--max-width`) rather than hardcoding colors. Reuse existing
  component classes (`.container`, `.eyebrow`, `.card`, `.resume-section`,
  `.entry`, `.prose`, `.contact-list`, `.gate`) instead of inventing new ones.
- **HTML entities:** the markup favors named entities (`&amp;`, `&middot;`,
  `&ndash;`, `&mdash;`) — match that style.
- **JS style:** vanilla JS wrapped in an IIFE, querying the DOM and guarding for
  missing elements. No frameworks or external JS libraries.
- **Responsive:** the single breakpoint is `@media (max-width: 720px)`; the
  mobile nav toggle (`.nav-toggle`) only appears below it.

## SEO / indexing rules

- Public pages must stay listed in `sitemap.xml`. Update `lastmod` when content
  changes.
- `capstone.html` is **private**: it carries `<meta name="robots" content="noindex, nofollow">`,
  is blocked in `robots.txt`, and is deliberately **omitted** from `sitemap.xml`.
  Keep it that way — do not add it to the sitemap or remove its noindex tag.

## The capstone password gate (important)

`capstone.js` implements a **client-side-only** password gate with the password
hardcoded in the source (`PASSWORD`). This is soft protection only — anyone can
read the password by viewing source, and the gated content ships in the HTML.
The file's own comments acknowledge this. Do **not** treat this as real
security, do not put genuinely sensitive material behind it, and if asked to
strengthen it, recommend real server-side / host-level auth instead. If you
change the password, it lives only in `capstone.js`.

## Content accuracy

This is a personal résumé site, so biographical facts (titles, dates, dollar
figures, the expected August 2026 MPA graduation) are real and should not be
invented or "rounded." Note that some headline numbers are stated differently
across pages (e.g. fundraising totals in `index.html` meta vs. `about.html` vs.
`experience.html`); if asked to update figures, confirm the intended number with
the user rather than guessing, and apply it consistently everywhere it appears.

## Working agreement

- Make focused, minimal edits that match the surrounding hand-written style;
  avoid reformatting whole files.
- Keep duplicated boilerplate (nav, head tags, footer) in sync across pages.
- Commit with clear messages and push to the working branch. Do **not** open a
  pull request unless the user explicitly asks.
</content>
</invoke>
