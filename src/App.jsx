import { useState } from "react";

const CREDIT_ROLES = [
  { canonical: "Conceptualization",           patterns: [/conceptuali[sz]ation/i] },
  { canonical: "Data curation",               patterns: [/data[\s\-]*curation/i] },
  { canonical: "Formal analysis",             patterns: [/formal[\s\-]*analysis/i] },
  { canonical: "Funding acquisition",         patterns: [/funding[\s\-]*acquisition/i] },
  { canonical: "Investigation",               patterns: [/\binvestigation\b/i] },
  { canonical: "Methodology",                 patterns: [/\bmethodology\b/i] },
  { canonical: "Project administration",      patterns: [/project[\s\-]*administration/i] },
  { canonical: "Resources",                   patterns: [/\bresources\b/i] },
  { canonical: "Software",                    patterns: [/\bsoftware\b/i] },
  { canonical: "Supervision",                 patterns: [/\bsupervision\b/i] },
  { canonical: "Validation",                  patterns: [/\bvalidation\b/i] },
  { canonical: "Visualization",               patterns: [/visuali[sz]ation/i] },
  { canonical: "Writing - original draft",    patterns: [/original[\s\-]*draft/i, /writing[\s\-]+original[\s\-]*draft/i] },
  { canonical: "Writing - review & editing",  patterns: [/review[\s\-]*[&+\/][\s\-]*edit/i, /review(?:ing)?[\s\-]+and[\s\-]+edit/i, /writing[\s\-]+review/i, /reviewing[\s\-]+and[\s\-]+edit/i] },
];

function matchRoleText(text) {
  const t = (text || "").trim();
  for (const r of CREDIT_ROLES) {
    for (const p of r.patterns) {
      if (p.test(t)) return r.canonical;
    }
  }
  return null;
}

const PARTICLES = new Set([
  "von","van","de","der","den","del","della","delle","di","du","le","la",
  "los","las","el","al","bin","bint","af","av","of","zu","zum","zur","op","ten","ter"
]);

const norm = s => (s || "").toLowerCase().replace(/[.\s\-,]/g, "");

function nameKeys(fullName) {
  const parts = fullName.trim().split(/\s+/);
  if (!parts.length) return new Set();
  const last = parts[parts.length - 1];
  const middle = parts.slice(1, -1);
  const isParticle = w => PARTICLES.has(w.toLowerCase());
  const particles = middle.filter(isParticle);
  const midNames  = middle.filter(w => !isParticle(w));
  const firstPart = parts[0];
  const firstInits = firstPart.split("-").map(p => p[0] ? p[0].toUpperCase() : "").join("");
  const midInits   = midNames.map(w => w[0] ? w[0].toUpperCase() : "").join("");
  const partInits  = particles.map(w => w[0].toLowerCase()).join("");
  const allFirstInits = firstInits + midInits;
  const lastI = last[0] ? last[0].toUpperCase() : "";
  const lastNoHyphen = last.replace(/-/g, "");
  const keys = new Set();
  const add = s => { const k = norm(s); if (k.length > 1) keys.add(k); };
  add(last);
  if (last.includes("-")) add(lastNoHyphen);
  [firstInits, allFirstInits].forEach(fi => {
    add(fi + partInits + last);
    add(fi + last);
    add(last + fi + partInits);
    add(last + fi);
    add(fi + partInits + lastI);
    add(fi + lastI);
    if (last.includes("-")) {
      add(fi + partInits + lastNoHyphen);
      add(fi + lastNoHyphen);
      add(lastNoHyphen + fi + partInits);
      add(lastNoHyphen + fi);
    }
  });
  // Full name and first+last — for CRediT statements that use complete names
  add(parts.join(" "));           // "Zahra Quettawala Mufaddal" → zahraQuettawalaMufaddal
  add(parts.join(""));            // joined without spaces
  add(parts[0] + " " + last);    // "Zahra Mufaddal"
  add(parts[0] + last);          // "ZahraMufaddal"

  // Hyphenated last name: generate initials for each part separately
  // e.g. "Baricevic-Jones" → parts ["Baricevic","Jones"] → initials "BJ"
  // so "I.B.-J." → norm "ibj" matches "Ivona Baricevic-Jones"
  if (last.includes("-")) {
    const lastParts = last.split("-");
    const lastPartsI = lastParts.map(p => p[0] ? p[0].toUpperCase() : "").join("");
    [firstInits, allFirstInits].forEach(fi => {
      add(fi + partInits + lastPartsI);   // e.g. IBJ, DDW
      add(lastPartsI + fi + partInits);   // e.g. BJI
      add(lastPartsI + fi);
      add(fi + lastPartsI);
    });
  }

  return keys;
}

function parseAuthorList(raw) {
  let text = raw.trim().replace(/\r?\n/g, " ");
  // Strip markdown hyperlinks: [Name](url) -> Name, and bold markers __Name__ -> Name
  text = text.replace(/\[([^\]]+)\]\([^)]+\)/g, "$1");
  text = text.replace(/_{1,2}([^_]+)_{1,2}/g, "$1");
  // Strip non-breaking spaces
  text = text.replace(/[\u00a0\u202f]/g, " ");
  text = text.replace(/^by\s+/i, "");
  text = text.replace(/\d*\s*ORCID[iD]?\s*[\d\-]*/gi, "");
  text = text.replace(/[*\u2020\u2021\u00a7\u00b6\u00b0]/g, "");
  // Strip academic/medical credential suffixes
  text = text.replace(/\b(MD|MBBS|PhD|Ph\.D|M\.D|DO|MSc?|BSc?|FRCS|MRCS|MBChB|MBBCh|DPhil|DrPH|MPH|MHS|DMD|DDS|RN|NP|FACS|FACP|FRCP)\b\.?/gi, "");
  // Strip affiliation superscript numbers
  text = text.replace(/([A-Za-z])\s*\d+(?=[,;\s&]|$)/g, "$1");
  // Strip single standalone lowercase letters (affiliation codes like a, b, c)
  text = text.replace(/\b[a-z]\b/g, "");
  // Strip ellipsis characters (…) used in truncated author lists
  text = text.replace(/[\u2026]/g, ",");
  // Handle & as separator
  text = text.replace(/&/g, ",");
  text = text.replace(/\band([A-Z])/g, ", $1");
  text = text.replace(/\band\b/gi, ",");
  return text.split(/[,;]+/).map(p => p.replace(/\s+/g, " ").trim()).filter(p => p.length > 2 && /[A-Za-z]{2,}/.test(p));
}

function buildNameMatcher(fullNames) {
  const map = new Map();
  fullNames.forEach(fullName => {
    for (const key of nameKeys(fullName)) {
      if (!map.has(key)) map.set(key, fullName);
    }
  });
  return token => { const k = norm(token); return k.length > 1 ? (map.get(k) || null) : null; };
}

function tokenizeAuthors(seg) {
  return seg.replace(/\band\b/gi, ",").split(/[,;]+/).map(s => s.trim()).filter(s => s.length > 1);
}

function parseCreditStatement(text, fullNames) {
  const matchName = buildNameMatcher(fullNames);
  const contribs = {};
  const hasOther = new Set();
  const otherLabels = {};
  fullNames.forEach(n => { contribs[n] = new Set(); otherLabels[n] = new Set(); });

  // Normalise newlines to spaces, strip common section headings that journals prepend
  const t = text
    .replace(/[\u2013\u2014]/g, "-")
    .replace(/\r?\n/g, " ")
    // Strip contribution level qualifiers like (lead), (equal), (supporting)
    .replace(/\(\s*(?:lead|equal|supporting|co-lead|co-equal|first author|last author|corresponding|co-first|co-last)\s*\)/gi, "")
    .replace(/^\s*CRediT\s+authorship\s+contribution\s+statement\s*:?\s*/i, "")
    .replace(/^\s*Author\s+contributions?\s*:?\s*/i, "")
    .replace(/^\s*Authorship\s+contributions?\s*:?\s*/i, "")
    .replace(/^\s*Contributions?\s*:?\s*/i, "")
    .trim();
  const rolePats = CREDIT_ROLES.flatMap(r => r.patterns.map(p => p.source)).join("|");
  const roleColonMatches = [...t.matchAll(new RegExp(`(${rolePats})\\s*:`, "gi"))];

  let format;
  if (roleColonMatches.length >= 2) {
    format = "role-first";
  } else if (/:/.test(t)) {
    // Colons present but not after role names — must be author-first.
    // Role-comma format never uses colons, so any colon means author-first.
    format = "author-first";
  } else {
    // No colons at all — check for role-comma format.
    const startRoleCount = t.split(/;/).filter(chunk => {
      const c = chunk.trim();
      return c && new RegExp(`^(${rolePats})`, "i").test(c);
    }).length;
    format = startRoleCount >= 2 ? "role-comma" : "author-first";
  }

  function applySegment(roleText, seg) {
    const canonical = matchRoleText(roleText);
    if (/all\s+authors/i.test(seg)) {
      fullNames.forEach(n => { if (canonical) contribs[n].add(canonical); });
      return;
    }
    tokenizeAuthors(seg).forEach(token => {
      const name = matchName(token);
      if (!name) return;
      if (canonical) contribs[name].add(canonical);
      else { hasOther.add(name); otherLabels[name].add(roleText.trim()); }
    });
  }

  if (format === "role-first") {
    roleColonMatches.forEach((match, idx) => {
      const start = match.index + match[0].length;
      const end = roleColonMatches[idx + 1]?.index ?? t.length;
      applySegment(match[1], t.slice(start, end).trim().replace(/[.;,]$/, ""));
    });
  } else if (format === "role-comma") {
    t.split(/;/).forEach(chunk => {
      chunk = chunk.trim();
      if (!chunk) return;
      const rm = chunk.match(new RegExp(`^(${rolePats})`, "i"));
      if (!rm) return;
      applySegment(rm[1], chunk.slice(rm[0].length).replace(/^[\s,]+/, ""));
    });
  } else if (/were\s+carried\s+out\s+by|was\s+carried\s+out\s+by/i.test(t)) {
    // Narrative format: "Role(s) were/was carried out by Author1, Author2."
    // Split on ". " only when followed by Capital+lowercase (real sentence start)
    // This avoids splitting on dots within initials like "R.A. and G.C.F."
    const narrativeSentences = t.split(/\.\s+(?=[A-Z][a-z])/);
    narrativeSentences.forEach(sentence => {
      const byMatch = sentence.match(/^(.+?)\s+(?:were|was)\s+carried\s+out\s+by\s+(.+)$/i);
      if (!byMatch) return;
      const rolePart   = byMatch[1].trim();
      const authorPart = byMatch[2].replace(/\.$/, "").trim();
      // Match roles by scanning for patterns directly rather than splitting naively.
      // This handles "Writing, reviewing and editing" as a single phrase.
      const canonicals = [];
      const usedRoles = new Set();
      // Try matching the full rolePart first (catches multi-word phrases)
      const fullMatch = matchRoleText(rolePart);
      if (fullMatch) {
        canonicals.push(fullMatch);
        usedRoles.add(fullMatch);
      }
      // Then try each comma/and token for remaining roles
      rolePart
        .replace(/\band\b/gi, ",")
        .split(/[,;]+/)
        .map(r => r.trim())
        .filter(Boolean)
        .forEach(token => {
          const c = matchRoleText(token);
          if (c && !usedRoles.has(c)) { canonicals.push(c); usedRoles.add(c); }
        });
      if (!canonicals.length) return;
      tokenizeAuthors(authorPart).forEach(token => {
        const name = matchName(token);
        if (!name) return;
        canonicals.forEach(canonical => contribs[name].add(canonical));
      });
    });

  } else {
    // Build a split regex from actual author names so we can handle
    // comma-separated entries like "Author: roles, Author: roles"
    // as well as period/semicolon-separated entries.
    const escapeName = n => n.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const nameColonPat = fullNames.map(n => escapeName(n) + "\\s*:").join("|");
    const splitRx = new RegExp(`(?<=[.,])\\s+(?=${nameColonPat})`, "i");
    let sentences = t.split(splitRx).filter(s => s.includes(":"));
    // Fallback: split ONLY on period+space (never semicolons).
    // Semicolons often separate roles within one author's entry:
    // "MHD: writing; formal analysis; supervision. SL: writing."
    if (sentences.length < 2) {
      sentences = t.split(/\.\s+/).filter(s => s.includes(":"));
    }
    sentences.forEach(sentence => {
      const ci = sentence.indexOf(":");
      if (ci === -1) return;
      const authorPart = sentence.slice(0, ci);
      const rolePart   = sentence.slice(ci + 1);
      if (matchRoleText(authorPart)) return;
      const matchedAuthors = tokenizeAuthors(authorPart).map(tok => matchName(tok)).filter(Boolean);
      if (!matchedAuthors.length) return;
      rolePart.split(/[,;]/).forEach(rt => {
        const canonical = matchRoleText(rt);
        matchedAuthors.forEach(name => {
          if (canonical) contribs[name].add(canonical);
          else if (rt.trim().length > 3) { hasOther.add(name); otherLabels[name].add(rt.trim()); }
        });
      });
    });
  }

  return { contribs, hasOther, otherLabels, format };
}

const css = `
@import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;600&family=Source+Code+Pro:wght@400;600&family=Lato:wght@300;400;700&display=swap');
*{box-sizing:border-box;margin:0;padding:0}
.app{min-height:100vh;background:#f5f0e8;font-family:'Lato',sans-serif;color:#1a1a2e;padding:2rem 1.5rem 4rem}
.header{text-align:center;margin-bottom:2.5rem;border-bottom:2px solid #1a1a2e;padding-bottom:1.2rem}
.lbl{font-family:'Source Code Pro',monospace;font-size:.68rem;letter-spacing:.2em;text-transform:uppercase;color:#7a6a4f;margin-bottom:.4rem;display:block}
.header h1{font-family:'Playfair Display',serif;font-size:2rem;font-weight:600;color:#1a1a2e;line-height:1.2}
.header h1 span{color:#8b1a1a}
.inputs{display:grid;grid-template-columns:1fr 1fr;gap:1.2rem;max-width:900px;margin:0 auto 1.2rem}
@media(max-width:620px){.inputs{grid-template-columns:1fr}}
.field textarea{width:100%;height:160px;background:#fff;border:1.5px solid #c8bfaa;border-radius:2px;padding:.8rem;font-family:'Lato',sans-serif;font-size:.85rem;color:#1a1a2e;resize:vertical;transition:border-color .2s;line-height:1.5}
.field textarea:focus{outline:none;border-color:#1a1a2e}
.field textarea::placeholder{color:#b0a090}
.btn-row{display:flex;justify-content:center;gap:.8rem;max-width:900px;margin:0 auto 1.5rem;flex-wrap:wrap}
.btn{font-family:'Source Code Pro',monospace;font-size:.72rem;letter-spacing:.12em;text-transform:uppercase;padding:.65rem 1.6rem;border:1.5px solid #1a1a2e;border-radius:2px;cursor:pointer;transition:all .2s;background:transparent;color:#1a1a2e}
.btn.primary{background:#1a1a2e;color:#f5f0e8}
.btn.primary:hover{background:#8b1a1a;border-color:#8b1a1a}
.btn:not(.primary):hover{background:#1a1a2e;color:#f5f0e8}
.info{text-align:center;font-family:'Source Code Pro',monospace;font-size:.7rem;color:#7a6a4f;letter-spacing:.08em;margin-bottom:1rem}
.info.err{color:#8b1a1a}
.badge{display:inline-block;font-size:.62rem;letter-spacing:.1em;text-transform:uppercase;padding:.2rem .5rem;background:#1a1a2e;color:#f5f0e8;border-radius:2px;margin-left:.5rem;font-family:'Source Code Pro',monospace}
.badge.green{background:#2a4a2e}
.summary{max-width:900px;margin:0 auto 1.2rem;font-size:.83rem;line-height:2}
.summary-line{padding:.3rem .8rem;border-radius:2px;margin-bottom:.3rem}
.summary-line.none{background:#fdf0f0;border-left:3px solid #8b1a1a;color:#5a1010}
.summary-line.many{background:#f0faf2;border-left:3px solid #2a6a3a;color:#1a4a2a}
.summary-line strong{font-weight:700;margin-right:.4rem}
.summary-line.unmatched{background:#fff8e8;border-left:3px solid #c8a020;color:#6a4a00}
.summary-line.sparse{background:#fdf0f0;border-left:4px solid #8b1a1a;padding:.5rem .8rem;margin-bottom:.6rem}
.summary-line.sparse .sparse-count{font-size:1em;font-weight:700;color:#1a1a2e}
.summary-line.sparse .sparse-warn{font-size:1em;font-weight:700;color:#8b1a1a}
.table-wrap{max-width:100%;overflow-x:auto;border:1.5px solid #c8bfaa;border-radius:2px;background:#fff}
table{border-collapse:collapse;width:100%;font-size:.8rem}
thead tr{background:#1a1a2e;color:#f5f0e8}
thead th{padding:.65rem .8rem;text-align:center;font-family:'Lato',sans-serif;font-weight:400;font-size:.76rem;border-right:1px solid #2e2e4a;white-space:nowrap}
thead th:first-child{text-align:left;font-family:'Source Code Pro',monospace;font-size:.62rem;letter-spacing:.1em;text-transform:uppercase;color:#aaa8c0;min-width:195px}
thead th.total-col{background:#2a1a1a;color:#e0b0a0}
tbody tr:nth-child(even){background:#faf7f2}
tbody tr:hover{background:#f0ebe0}
tbody tr.other-row td{background:#fffaed}
tbody tr.empty-row td:not(:first-child){opacity:.25}
tbody td{padding:.5rem .8rem;border-right:1px solid #e8e0d0;border-bottom:1px solid #e8e0d0;text-align:center;color:#1a1a2e}
tbody td:first-child{text-align:left;color:#3a3a4e;font-size:.82rem;border-right:2px solid #c8bfaa}
td.total-col{font-family:'Source Code Pro',monospace;font-weight:600;font-size:.8rem;background:#fdf5f0;color:#6a1a1a;border-right:none}
tbody tr.empty-row td.total-col{opacity:.25}
tfoot tr{background:#1a1a2e}
tfoot td{padding:.55rem .8rem;text-align:center;font-family:'Source Code Pro',monospace;font-size:.75rem;font-weight:600;color:#f5f0e8;border-right:1px solid #2e2e4a}
tfoot td:first-child{text-align:left;font-size:.62rem;letter-spacing:.1em;text-transform:uppercase;color:#aaa8c0;border-right:2px solid #444}
tfoot td.total-col{background:#2a1a1a;color:#e0b0a0}
.check{color:#8b1a1a;font-size:1rem;font-weight:700}
.copy-ok{color:#2a7a2a}
`;

export default function App() {
  const [authorText, setAuthorText] = useState("");
  const [creditText, setCreditText] = useState("");
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);

  function generate() {
    setError(""); setResult(null);
    const authors = parseAuthorList(authorText);
    if (!authors.length) { setError("Could not extract any author names — please check the author list."); return; }
    if (!creditText.trim()) { setError("Please paste a CRediT statement."); return; }
    const { contribs, hasOther, otherLabels, format } = parseCreditStatement(creditText, authors);
    const emptyAuthors = authors.filter(a => contribs[a]?.size === 0 && !hasOther.has(a));
    setResult({ authors, contribs, hasOther, otherLabels, format, emptyAuthors });
  }

  function copyTable() {
    if (!result) return;
    const { authors, contribs, hasOther, otherLabels } = result;
    const roleCounts = CREDIT_ROLES.map(r => authors.filter(a => contribs[a]?.has(r.canonical)).length);
    const rows = [
      ["CRediT Role", "Total", ...authors].join("\t"),
      ...CREDIT_ROLES.map((r, i) =>
        [r.canonical, roleCounts[i] || "", ...authors.map(a => contribs[a]?.has(r.canonical) ? "v" : "")].join("\t")
      ),
    ];
    if (hasOther.size > 0) {
      rows.push(["Other contributions", ...authors.map(a =>
        hasOther.has(a) ? [...otherLabels[a]].join(", ") : ""
      ), ""].join("\t"));
    }
    rows.push(["Roles per author", ...authors.map(a =>
      CREDIT_ROLES.filter(r => contribs[a]?.has(r.canonical)).length || ""
    ), ""].join("\t"));
    navigator.clipboard.writeText(rows.join("\n")).then(() => {
      setCopied(true); setTimeout(() => setCopied(false), 2000);
    });
  }

  function reset() { setAuthorText(""); setCreditText(""); setResult(null); setError(""); }

  return (
    <>
      <style>{css}</style>
      <div className="app">
        <div className="header">
          <div className="lbl">A tool to assess CRediT Author Contributions &mdash; errors and feedback can be sent to Matt Spick at the University of Surrey&apos;s Metascience expert group, <a href="mailto:matt.spick@surrey.ac.uk" style={{color:"#8b1a1a",textDecoration:"none"}}>matt.spick@surrey.ac.uk</a></div>
          <h1>CRediT <span>Check</span></h1>
        </div>

        <div style={{maxWidth:"900px",margin:"0 auto 1.5rem",fontSize:".88rem",lineHeight:"1.7",color:"#3a3a4e"}}>
          <p style={{marginBottom:".7rem"}}>
            Paste an author list and CRediT contribution statement from a scientific manuscript to generate
            a structured contribution table. The tool supports all common CRediT statement formats and
            handles initials, name particles (e.g. von, van, de), hyphenated names, and academic credentials
            automatically. Note that authors sharing identical initials may cause disambiguation issues —
            where this occurs, contributions may be assigned to the wrong author and the output should be
            checked manually. This tool is based on the{" "}
            <a href="https://credit.niso.org/" target="_blank" rel="noreferrer"
               style={{color:"#8b1a1a",textDecoration:"none",borderBottom:"1px solid #c8a0a0"}}>
              Contributor Role Taxonomy (CRediT)
            </a>
            , developed by the National Information Standards Organization (NISO).
          </p>
          <p style={{marginBottom:".7rem"}}><strong>Paste as plain text if possible, directly from the manuscript.</strong>{" "}
            In case of parsing errors, separating authors with carriage returns (one author per line)
            will assist with parsing.
          </p>
          <p>
            <strong>This tool is designed for structured CRediT taxonomy statements.</strong>{" "}If a journal or authors
            have described contributions in narrative prose (e.g. "X developed the code and carried
            out the analysis") rather than using the standardised CRediT roles, the tool may not be
            able to parse them correctly, and the contribution statement itself may not be fully
            CRediT-compliant.
          </p>
        </div>

        <div className="inputs">
          <div className="field">
            <label className="lbl">Author List</label>
            <textarea value={authorText} onChange={e => setAuthorText(e.target.value)}
              placeholder={"Paste the full author list here, e.g.:\nJane Smith 1, John Doe 2ORCID,\nMaria Garcia 1 and Wei Zhang 2,*"} />
          </div>
          <div className="field">
            <label className="lbl">CRediT Statement</label>
            <textarea value={creditText} onChange={e => setCreditText(e.target.value)}
              placeholder={"Paste the CRediT / author contribution statement.\n\nSupports:\n  Role: Author1, Author2; Role2: Author3\n  Role, Author1, Author2; Role2, Author3\n  Author1: Role1, Role2. Author2: Role3."} />
          </div>
        </div>

        <div className="btn-row">
          <button className="btn primary" onClick={generate}>Generate Table</button>
          {result && <>
            <button className="btn" onClick={copyTable}>
              {copied ? <span className="copy-ok">Copied!</span> : "Copy to Clipboard"}
            </button>
            <button className="btn" onClick={reset}>Clear</button>
          </>}
        </div>

        {error && <div className="info err">{error}</div>}

        {result && (() => {
          const roleCounts = CREDIT_ROLES.map(r => ({
            role: r.canonical,
            n: result.authors.filter(a => result.contribs[a]?.has(r.canonical)).length
          }));
          const noContrib   = roleCounts.filter(r => r.n === 0).map(r => r.role);
          const manyContrib = roleCounts.filter(r => r.n >= 4);
          const formatLabel = result.format === "role-first" ? "role-first"
            : result.format === "role-comma" ? "role-comma" : "author-first";

          return <>
            <div className="info">
              {result.authors.length} authors · {result.format === "role-comma" ? "role-comma" : formatLabel} format
              <span className={`badge ${result.format !== "author-first" ? "green" : ""}`}>{formatLabel}</span>
            </div>

            <div className="summary" style={{maxWidth:"900px",margin:"0 auto 1.2rem"}}>
              {(() => {
                const rolesWithContributors = roleCounts.filter(r => r.n > 0).length;
                if (rolesWithContributors <= 5) {
                  return (
                    <div className="summary-line sparse">
                      <span className="sparse-count">{rolesWithContributors === 0 ? "No CRediT roles have been identified as having contributors assigned." : `Only ${rolesWithContributors} of 14 CRediT roles have been identified as having contributors assigned.`}{" "}</span>
                      <span className="sparse-warn">The contribution statement may not be compliant with the CRediT taxonomy.</span>
                    </div>
                  );
                }
                return null;
              })()}
              {result.emptyAuthors.length > 0 && (
                <div className="summary-line unmatched">
                  <strong>Authors with no roles assigned:</strong>{" "}
                  {result.emptyAuthors.join(", ")}
                </div>
              )}
              {noContrib.length > 0 && (
                <div className="summary-line none">
                  <strong>Roles with no contributors:</strong>{" "}
                  {noContrib.join(", ")}
                </div>
              )}
              {manyContrib.length > 0 && (
                <div className="summary-line many">
                  <strong>Roles with 4+ contributors:</strong>{" "}
                  {manyContrib.map(r => `${r.role} (n = ${r.n})`).join(", ")}
                </div>
              )}
            </div>

            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>CRediT Role</th>
                    <th className="total-col">Total</th>
                    {result.authors.map(a => <th key={a}>{a}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {CREDIT_ROLES.map((role, ri) => {
                    const anyHas = result.authors.some(a => result.contribs[a]?.has(role.canonical));
                    const count  = roleCounts[ri].n;
                    return (
                      <tr key={role.canonical} className={anyHas ? "" : "empty-row"}>
                        <td>{role.canonical}</td>
                        <td className="total-col">{count > 0 ? count : ""}</td>
                        {result.authors.map(a => (
                          <td key={a}>
                            {result.contribs[a]?.has(role.canonical) ? <span className="check">v</span> : ""}
                          </td>
                        ))}
                      </tr>
                    );
                  })}
                  {result.hasOther.size > 0 && (
                    <tr className="other-row">
                      <td>Other contributions</td>
                      <td className="total-col"></td>
                      {result.authors.map(a => (
                        <td key={a} style={{fontSize:".7rem",color:"#7a5010",fontStyle:"italic",maxWidth:"120px",wordBreak:"break-word"}}>
                          {result.hasOther.has(a) ? [...result.otherLabels[a]].join(", ") || "v" : ""}
                        </td>
                      ))}
                    </tr>
                  )}
                </tbody>
                <tfoot>
                  <tr>
                    <td>Roles per author</td>
                    <td className="total-col"></td>
                    {result.authors.map(a => {
                      const n = CREDIT_ROLES.filter(r => result.contribs[a]?.has(r.canonical)).length;
                      return <td key={a}>{n > 0 ? n : ""}</td>;
                    })}
                  </tr>
                </tfoot>
              </table>
            </div>
          </>;
        })()}
      </div>
    </>
  );
}
