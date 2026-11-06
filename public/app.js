const THEME_INFO = {
  classic:{name:'Clássico',description:'Tradicional',reason:'Escolha para vagas mais tradicionais ou quando prefere uma apresentação direta, com seções familiares e hierarquia clara.',font:'Arial',margins:'15 × 16 mm',design:'Hierarquia convencional e títulos sublinhados.',palette:{paper:'#FFFFFF',text:'#222222',heading:'#111111',muted:'#555555',line:'#999999'}},
  modern:{name:'Moderno',description:'Atual e claro',reason:'Escolha se prefere uma aparência contemporânea, mantendo uma coluna, leitura linear e separadores discretos.',font:'Arial',margins:'14 × 16 mm',design:'Títulos alinhados a divisores horizontais.',palette:{paper:'#FFFFFF',text:'#222222',heading:'#222222',muted:'#505050',line:'#B8B8B8'}},
  minimal:{name:'Compacto',description:'Mais conteúdo',reason:'Escolha quando tem mais experiência para apresentar. Reduz espaços entre blocos, mas mantém o texto do documento em pelo menos 10 pt; não força todo currículo a caber em uma página.',font:'Arial',margins:'13 × 15 mm',design:'Espaçamento mais enxuto; corpo continua em 10 pt.',palette:{paper:'#FFFFFF',text:'#303030',heading:'#222222',muted:'#5C5C5C',line:'#A8A8A8'}},
  creative:{name:'Editorial',description:'Personalidade',reason:'Escolha para áreas de conteúdo, comunicação ou design, quando uma tipografia editorial combina com a candidatura.',font:'Georgia + Arial',margins:'16 × 18 mm',design:'Serifa no texto e títulos sem cor decorativa.',palette:{paper:'#FFFFFF',text:'#292929',heading:'#222222',muted:'#5B5B5B',line:'#B0B0B0'}},
  'tech-dark':{name:'Técnico',description:'Tecnologia',reason:'Escolha para candidaturas em engenharia, dados ou produto quando quiser uma hierarquia técnica discreta, sem fundos escuros, ícones ou colunas.',font:'Arial',margins:'14 × 16 mm',design:'Filete neutro no cabeçalho; PDF permanece branco.',palette:{paper:'#FFFFFF',text:'#242424',heading:'#202020',muted:'#535353',line:'#A6A6A6'}},
};
const THEMES = ['classic','modern','minimal','creative','tech-dark'];
const SAMPLE = ['---','name: John Doe','label: Product Designer','email: john.doe@example.com','location: São Paulo, SP','github: john-doe','linkedin: john-doe','lang: pt-BR','---','',
  '## Resumo','Product designer com experiência em pesquisa, prototipação e design de interfaces. Foco em criar experiências claras, acessíveis e orientadas por dados.','',
  '## Experiência','',
  '### Product Designer — Estúdio Aurora (2022–atual)','- Liderei o redesign de um aplicativo usado por mais de 50 mil usuários.','- Criei e mantive um design system com mais de 80 componentes.','- Conduzi pesquisas com usuários e transformei os achados em melhorias de usabilidade.','- Colaborei com engenharia e produto para entregar funcionalidades com foco em acessibilidade.','',
  '### UX Designer — Agência Norte (2020–2022)','- Desenhei fluxos e protótipos para plataformas web e mobile.','- Realizei testes de usabilidade e ajustei interfaces com base em métricas de conversão.','',
  '## Projetos','',
  '### Sistema de design — Projeto pessoal','- Biblioteca de componentes em Figma e código, com documentação e exemplos.','- Repositório: [github.com/john-doe/design-system](https://github.com/john-doe/design-system)','',
  '## Formação','- Bacharelado em Design — Universidade Estadual (2016–2020)','',
  '## Competências','Figma · Design systems · Pesquisa com usuários · Prototipação · Acessibilidade · HTML/CSS',
].join('\n');

function parseFrontmatter(markdown) {
  const m = markdown.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/);
  if (!m) return { data: {}, content: markdown };
  const yaml = m[1];
  const content = m[2];
  const data = {};
  for (const line of yaml.split(/\r?\n/)) {
    const mm = line.match(/^([A-Za-z_][\w-]*)\s*:\s*(.*)$/);
    if (!mm) continue;
    let val = mm[2].trim();
    if (val === '') { data[mm[1]] = ''; continue; }
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      if (val.startsWith('"')) { try { val = JSON.parse(val); } catch { val = val.slice(1,-1); } }
      else val = val.slice(1,-1);
    }
    data[mm[1]] = val;
  }
  return { data, content };
}

function parseResume(markdown) {
  const { data, content } = parseFrontmatter(markdown);
  const imageField = ['photo','image','avatar'].find((f) => f in data);
  if (imageField) throw new Error('O campo "' + imageField + '" não é suportado: os temas não inserem fotos ou imagens no currículo.');
  if (!data.name || !String(data.name).trim()) throw new Error('name: Required');
  if (data.email && String(data.email).trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(data.email))) throw new Error('email: Invalid email');
  const meta = { name: String(data.name).trim() };
  for (const f of ['label','email','phone','location','url','github','linkedin','lang']) {
    if (data[f] !== undefined && String(data[f]).trim() !== '') meta[f] = String(data[f]).trim();
    else if (data[f] !== undefined) meta[f] = '';
  }
  for (const f of ['label','email','phone','location','url','github','linkedin','lang']) {
    if (meta[f] === '') delete meta[f];
  }
  const lines = content.split(/\r?\n/);
  const sections = [];
  let currentSection = null;
  let currentItem = null;
  const summaryLines = [];
  const flushItem = () => { if (currentItem && currentSection) { currentSection.items.push(currentItem); currentItem = null; } };
  const flushSection = () => { flushItem(); if (currentSection) { sections.push(currentSection); currentSection = null; } };
  for (const raw of lines) {
    const line = raw.trimEnd();
    if (line.trim() === '') continue;
    if (/^---\s*$/.test(line)) continue;
    if (/^##(\s|$)/.test(line)) {
      flushSection();
      currentSection = { title: line.replace(/^##\s*/, '').trim(), items: [], paragraphs: [] };
      continue;
    }
    if (/^#\s+/.test(line)) continue;
    if (/^###\s+/.test(line)) {
      flushItem();
      if (!currentSection) currentSection = { title: 'Detalhes', items: [], paragraphs: [] };
      const headerText = line.replace(/^###\s+/, '').trim();
      const periodMatch = headerText.match(/\(([^)]+)\)\s*$/);
      const period = periodMatch ? periodMatch[1].trim() : undefined;
      const withoutPeriod = periodMatch ? headerText.slice(0, periodMatch.index).trim() : headerText;
      const parts = withoutPeriod.split(/\s+[—–-]\s+/);
      const title = parts[0] ? parts[0].trim() : headerText;
      const subtitle = parts.length > 1 ? parts.slice(1).join(' — ').trim() : undefined;
      currentItem = { title, subtitle, period, bullets: [] };
      continue;
    }
    if (/^[-*]\s+/.test(line)) {
      const text = line.replace(/^[-*]\s+/, '').trim();
      if (currentItem) currentItem.bullets.push(text);
      else if (currentSection) currentSection.paragraphs.push(text);
      else summaryLines.push(text);
      continue;
    }
    if (currentItem) {
      currentItem.body = currentItem.body ? currentItem.body + ' ' + line.trim() : line.trim();
    } else if (currentSection) {
      currentSection.paragraphs.push(line.trim());
    } else {
      summaryLines.push(line.trim());
    }
  }
  flushSection();
  const summary = summaryLines.join(' ').trim() || undefined;
  return { meta, summary, sections };
}

function validateResume(markdown) {
  try { parseResume(markdown); return { ok: true, errors: [] }; }
  catch (e) { return { ok: false, errors: [e instanceof Error ? e.message : String(e)] }; }
}

function escapeHtml(value) {
  return String(value == null ? '' : value).replace(/[&<>"']/g, (c) => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}
function escapeAttr(value) { return escapeHtml(value); }
function formatInline(value) {
  let formatted = escapeHtml(value);
  formatted = formatted.replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+|mailto:[^\s)]+)\)/gi, '<a href="$2" rel="noreferrer">$1</a>');
  formatted = formatted.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  formatted = formatted.replace(/\*(.+?)\*/g, '<em>$1</em>');
  formatted = formatted.replace(/`([^`]+)`/g, '<code>$1</code>');
  return formatted;
}
function externalUrl(value) {
  try {
    const normalized = /^https?:\/\//i.test(value) ? value : 'https://' + value;
    const url = new URL(normalized);
    return url.protocol === 'http:' || url.protocol === 'https:' ? url.toString() : undefined;
  } catch { return undefined; }
}
function profileUrl(value, network) {
  const trimmed = String(value || '').trim();
  const looksLikeProfileUrl = /^(https?:\/\/|(?:www\.)?(?:github\.com|linkedin\.com)\/)/i.test(trimmed);
  const directUrl = looksLikeProfileUrl ? externalUrl(trimmed) : undefined;
  if (directUrl) return directUrl;
  const handle = trimmed.replace(/^@/, '');
  if (!/^[\w.-]+$/.test(handle)) return undefined;
  return network === 'github' ? 'https://github.com/' + handle : 'https://www.linkedin.com/in/' + handle;
}
function profileLabel(value, network) {
  const url = profileUrl(value, network);
  if (!url) return undefined;
  const parsed = new URL(url);
  return parsed.hostname.replace(/^www\./, '') + parsed.pathname.replace(/\/$/, '');
}

const themeCssCache = {};
async function loadThemeCss(name) {
  if (themeCssCache[name]) return themeCssCache[name];
  const res = await fetch('themes/' + name + '/style.css');
  if (!res.ok) throw new Error('Não foi possível carregar o tema.');
  const css = await res.text();
  themeCssCache[name] = css;
  return css;
}

async function renderHtml(data, theme) {
  const css = await loadThemeCss(theme) + `
    @media screen {
      html, body { background:#e4e7eb; }
      .resume { width:210mm; margin:0 auto; background-color:#fff; overflow-wrap:anywhere; }
    }
    @media print {
      html,body { background:#fff!important; }
      .resume { width:210mm!important; margin:0!important; background-image:none!important; background-color:#fff!important; box-shadow:none!important; overflow-wrap:anywhere; }
    }
  `;
  const title = data.meta.name ? 'Currículo — ' + data.meta.name : 'Currículo';
  const contacts = [];
  if (data.meta.email) contacts.push({ label: data.meta.email, href: 'mailto:' + data.meta.email });
  if (data.meta.phone) contacts.push({ label: data.meta.phone, href: 'tel:' + String(data.meta.phone).replace(/[^\d+]/g, '') });
  if (data.meta.location) contacts.push({ label: data.meta.location });
  if (data.meta.url && externalUrl(data.meta.url)) contacts.push({ label: String(data.meta.url).replace(/^https?:\/\//i, '').replace(/\/$/, ''), href: externalUrl(data.meta.url) });
  if (data.meta.github && profileUrl(data.meta.github, 'github')) contacts.push({ label: profileLabel(data.meta.github, 'github'), href: profileUrl(data.meta.github, 'github') });
  if (data.meta.linkedin && profileUrl(data.meta.linkedin, 'linkedin')) contacts.push({ label: profileLabel(data.meta.linkedin, 'linkedin'), href: profileUrl(data.meta.linkedin, 'linkedin') });
  return '<!doctype html>\n<html lang="' + escapeAttr(data.meta.lang || 'pt-BR') + '">\n<head>\n  <meta charset="utf-8">\n  <meta name="viewport" content="width=device-width, initial-scale=1">\n  <title>' + escapeHtml(title) + '</title>\n  <style>' + css + '</style>\n</head>\n<body>\n  <main class="resume">\n    <header class="resume-header">\n      <div class="identity">\n        <h1>' + escapeHtml(data.meta.name) + '</h1>\n        ' + (data.meta.label ? '<p class="eyebrow">' + escapeHtml(data.meta.label) + '</p>' : '') + '\n      </div>\n      ' + (contacts.length ? '<div class="contact" aria-label="Contato">' + contacts.map((c) => '<span class="contact-item">' + (c.href ? '<a href="' + escapeAttr(c.href) + '">' + escapeHtml(c.label) + '</a>' : escapeHtml(c.label)) + '</span>').join('') + '</div>' : '') + '\n    </header>\n    ' + (data.summary ? '<section class="summary-block" aria-label="Resumo profissional"><p>' + formatInline(data.summary) + '</p></section>' : '') + '\n    ' + (data.sections || []).map((section) => '\n      <section class="resume-section">\n        <h2>' + escapeHtml(section.title) + '</h2>\n        ' + (section.paragraphs && section.paragraphs.length ? '<div class="section-paragraphs">' + section.paragraphs.map((p) => '<p>' + formatInline(p) + '</p>').join('') + '</div>' : '') + '\n        ' + (section.items || []).map((item) => '\n          <article class="resume-item">\n            <div class="item-heading">\n              <h3>' + escapeHtml(item.title) + '</h3>\n              ' + (item.subtitle ? '<span class="employer">— ' + escapeHtml(item.subtitle) + '</span>' : '') + '\n              ' + (item.period ? '<span class="period">(' + escapeHtml(item.period) + ')</span>' : '') + '\n            </div>\n            ' + (item.body ? '<p class="item-body">' + formatInline(item.body) + '</p>' : '') + '\n            ' + (item.bullets && item.bullets.length ? '<ul>' + item.bullets.map((b) => '<li>' + formatInline(b) + '</li>').join('') + '</ul>' : '') + '\n          </article>\n        ').join('') + '\n      </section>\n    ').join('') + '\n  </main>\n</body>\n</html>';
}

/* ---------------------------------------------------------------------------
   Paginação automática
   ---------------------------------------------------------------------------
   Cada página é uma caixa real de 210 × 297 mm com o padding do tema. O
   conteúdo é medido e distribuído dentro dela — o navegador não pagina mais
   nada na impressão, então prévia e PDF são idênticos por construção.
--------------------------------------------------------------------------- */
const MM_TO_PX = 96 / 25.4;
const SHEET_W = 210 * MM_TO_PX;
const SHEET_H = 297 * MM_TO_PX;

function paginateDocument(doc) {
  const win = doc.defaultView;
  const resume = doc.querySelector('main.resume');
  if (!win || !resume) return;

  // As margens do tema viram o padding de cada folha (medido antes de zerar).
  const style = win.getComputedStyle(resume);
  const padTop = parseFloat(style.paddingTop) || 0;
  const padRight = parseFloat(style.paddingRight) || 0;
  const padBottom = parseFloat(style.paddingBottom) || 0;
  const padLeft = parseFloat(style.paddingLeft) || 0;
  const contentHeight = SHEET_H - padTop - padBottom;

  // Blocos de primeiro nível: cabeçalho, resumo e seções.
  const units = Array.from(resume.children);
  resume.replaceChildren();

  const pageStyle = doc.createElement('style');
  pageStyle.setAttribute('data-pagination', '');
  pageStyle.textContent = `
    .resume {
      width:${SHEET_W}px !important; max-width:${SHEET_W}px !important;
      min-height:0 !important; margin:0 auto !important; padding:0 !important;
      background:transparent !important; background-image:none !important; box-shadow:none !important;
    }
    .resume-page {
      box-sizing:border-box; width:${SHEET_W}px; height:${SHEET_H}px;
      padding:${padTop}px ${padRight}px ${padBottom}px ${padLeft}px;
      overflow:hidden; background:#fff; position:relative;
    }
    .resume-page-inner { display:flow-root; width:100%; }
    @media screen {
      html, body { background:#e4e7eb !important; margin:0; }
      .resume { margin:0 auto !important; }
      .resume-page { margin:0 auto 8mm; box-shadow:0 3px 10px rgb(31 45 55 / 16%), 0 14px 32px rgb(31 45 55 / 12%); }
      .resume-page:last-child { margin-bottom:0; }
    }
    @media print {
      html, body { background:#fff !important; margin:0 !important; padding:0 !important; }
      .resume { width:${SHEET_W}px !important; margin:0 !important; }
      .resume-page { margin:0 !important; box-shadow:none !important; break-after:page; page-break-after:always; break-inside:avoid; page-break-inside:avoid; }
      .resume-page:last-child { break-after:auto; page-break-after:auto; }
    }
  `;
  doc.head.appendChild(pageStyle);

  let page = null;
  let inner = null;

  const openPage = () => {
    page = doc.createElement('div');
    page.className = 'resume-page';
    inner = doc.createElement('div');
    inner.className = 'resume-page-inner';
    page.appendChild(inner);
    resume.appendChild(page);
  };
  const ensurePage = () => { if (!page) openPage(); };
  const pageIsEmpty = () => !inner || inner.childNodes.length === 0;
  const fits = () => inner.getBoundingClientRect().height <= contentHeight + 0.75;

  // Um nó sozinho maior que a folha (ex.: 60 bullets num único item) é dividido
  // recursivamente nos seus filhos; a divisão CONTINUA na página atual em vez
  // de abrir uma página nova a cada nível.
  const cloneChunk = (chunk, newPage) => {
    if (newPage) openPage(); else ensurePage();
    const clone = chunk.cloneNode(false);
    inner.appendChild(clone);
    return clone;
  };

  const placeChildren = (chunk, children) => {
    for (const child of children) {
      chunk.appendChild(child);
      if (fits()) continue;
      chunk.removeChild(child);

      if (child.nodeType === 1 && child.children.length > 0) {
        const grandChildren = Array.from(child.childNodes);
        child.replaceChildren();
        chunk.appendChild(child);
        placeChildren(child, grandChildren);
        chunk = cloneChunk(chunk);
        continue;
      }

      chunk = cloneChunk(chunk, true);
      chunk.appendChild(child);
    }
  };

  const splitOversized = (node) => {
    const children = Array.from(node.childNodes);
    node.replaceChildren();
    ensurePage();
    inner.appendChild(node);
    placeChildren(node, children);
  };

  const place = (node) => {
    ensurePage();
    inner.appendChild(node);
    if (fits()) return;

    const nodeHeight = node.getBoundingClientRect().height;
    inner.removeChild(node);

    // Maior que uma folha inteira: divide já a partir da página atual, sem
    // desperdiçar o espaço que sobrou nela.
    if (pageIsEmpty() || nodeHeight > contentHeight + 0.75) {
      splitOversized(node);
      return;
    }

    openPage();
    inner.appendChild(node);
    if (fits()) return;

    inner.removeChild(node);
    splitOversized(node);
  };

  for (const unit of units) place(unit);

  // Remove sobras vazias e páginas em branco no fim.
  for (const blank of resume.querySelectorAll('.resume-page-inner > *')) {
    if (!blank.childNodes.length && !blank.textContent.trim()) blank.remove();
  }
  const pages = Array.from(resume.querySelectorAll('.resume-page'));
  for (let i = pages.length - 1; i > 0; i -= 1) {
    if (!pages[i].textContent.trim() && !pages[i].querySelector('a')) pages[i].remove();
    else break;
  }
  if (!resume.querySelector('.resume-page')) openPage();
}

// Mede e pagina em um iframe isolado de 1:1 (sem zoom), devolvendo o HTML final.
async function paginateHtml(html) {
  const frame = document.createElement('iframe');
  frame.setAttribute('aria-hidden', 'true');
  frame.setAttribute('tabindex', '-1');
  frame.style.cssText = 'position:fixed;left:-10000px;top:0;width:1000px;height:1400px;border:0;visibility:hidden;pointer-events:none;';
  document.body.appendChild(frame);
  try {
    const doc = frame.contentDocument;
    if (!doc) throw new Error('Não foi possível medir o documento.');
    doc.open();
    doc.write(html);
    doc.close();
    if (!doc.querySelector('main.resume')) throw new Error('Documento de medição inválido.');
    if (doc.fonts && doc.fonts.ready) { try { await doc.fonts.ready; } catch { /* fontes do sistema */ } }
    paginateDocument(doc);
    return '<!doctype html>\n' + doc.documentElement.outerHTML;
  } finally {
    frame.remove();
  }
}

async function renderPagedHtml(data, theme) {
  return paginateHtml(await renderHtml(data, theme));
}

async function renderDocx(data) {
  const d = window.docx;
  const FONT = 'Arial'; const INK = '222222'; const MUTED = '555555';
  function plainText(value) {
    return String(value == null ? '' : value)
      .replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+|mailto:[^\s)]+)\)/gi, '$1 ($2)')
      .replace(/\*\*(.+?)\*\*/g, '$1')
      .replace(/\*(.+?)\*/g, '$1')
      .replace(/`([^`]+)`/g, '$1')
      .trim();
  }
  function textRun(text, options) {
    options = options || {};
    return new d.TextRun({ text: plainText(text), font: FONT, size: options.size != null ? options.size : 20, color: options.color || INK, bold: options.bold || false });
  }
  function heading(text, level) {
    const isH1 = level === d.HeadingLevel.HEADING_1;
    return new d.Paragraph({ heading: level, children: [textRun(text, { bold: true, size: isH1 ? 22 : 21 })], spacing: { before: isH1 ? 200 : 120, after: 80 }, keepNext: true });
  }
  function itemHeading(item) {
    const children = [textRun(item.title || 'Item', { bold: true })];
    if (item.subtitle) children.push(textRun(' — ' + item.subtitle, { color: MUTED }));
    if (item.period) children.push(textRun(' (' + item.period + ')', { color: MUTED }));
    return new d.Paragraph({ children, spacing: { before: 80, after: 40 }, keepNext: true });
  }
  function contactLine(data) {
    const profile = (value, base, path) => {
      path = path || '';
      const withoutScheme = String(value).trim().replace(/^https?:\/\//i, '').replace(/^www\./i, '').replace(/^@/, '');
      if (withoutScheme.startsWith(base + '/')) return withoutScheme;
      return base + '/' + path + withoutScheme;
    };
    const contacts = [];
    if (data.meta.email) contacts.push(data.meta.email);
    if (data.meta.phone) contacts.push(data.meta.phone);
    if (data.meta.location) contacts.push(data.meta.location);
    if (data.meta.url) contacts.push(String(data.meta.url).replace(/^https?:\/\//i, '').replace(/\/$/, ''));
    if (data.meta.github) contacts.push(profile(data.meta.github, 'github.com'));
    if (data.meta.linkedin) contacts.push(profile(data.meta.linkedin, 'linkedin.com', 'in/'));
    return contacts;
  }
  const children = [];
  children.push(new d.Paragraph({ children: [textRun(data.meta.name, { bold: true, size: 34, color: '111111' })], spacing: { after: 40 }, keepNext: true }));
  if (data.meta.label) children.push(new d.Paragraph({ children: [textRun(data.meta.label, { size: 20, color: MUTED })], spacing: { after: 60 }, keepNext: true }));
  const contacts = contactLine(data);
  if (contacts.length) {
    children.push(new d.Paragraph({ children: contacts.flatMap((contact, index) => index ? [textRun(' · ', { color: MUTED }), textRun(contact, { color: MUTED })] : [textRun(contact, { color: MUTED })]), spacing: { after: 180 } }));
  }
  if (data.summary) {
    children.push(heading('Resumo', d.HeadingLevel.HEADING_1));
    for (const paragraph of String(data.summary).split(/\r?\n/).map(plainText).filter(Boolean)) {
      children.push(new d.Paragraph({ text: paragraph, spacing: { after: 80 } }));
    }
  }
  for (const section of data.sections || []) {
    children.push(heading(section.title, d.HeadingLevel.HEADING_1));
    for (const paragraph of section.paragraphs || []) {
      if (plainText(paragraph)) children.push(new d.Paragraph({ text: plainText(paragraph), spacing: { after: 80 } }));
    }
    for (const item of section.items || []) {
      const hasContent = item.title || item.subtitle || item.period || item.body || (item.bullets && item.bullets.length);
      if (!hasContent) continue;
      children.push(itemHeading(item));
      if (item.body && plainText(item.body)) children.push(new d.Paragraph({ text: plainText(item.body), spacing: { after: 60 } }));
      for (const bullet of item.bullets || []) {
        if (plainText(bullet)) children.push(new d.Paragraph({ text: plainText(bullet), bullet: { level: 0 }, spacing: { after: 40 } }));
      }
    }
  }
  const document = new d.Document({
    creator: 'resume-as-code',
    title: data.meta.name ? 'Currículo — ' + data.meta.name : 'Currículo',
    styles: {
      default: {
        document: { run: { font: FONT, size: 20, color: INK }, paragraph: { spacing: { after: 80, line: 276 } } },
        heading1: { run: { font: FONT, size: 22, bold: true, color: INK }, paragraph: { spacing: { before: 200, after: 80 } } },
        heading2: { run: { font: FONT, size: 21, bold: true, color: INK }, paragraph: { spacing: { before: 120, after: 60 } } },
      },
    },
    sections: [{
      properties: { page: { size: { width: 11906, height: 16838 }, margin: { top: 850, right: 900, bottom: 850, left: 900 } } },
      children,
    }],
  });
  return d.Packer.toBlob(document);
}

function toJsonResume(data) {
  const out = {};
  out.basics = {
    name: data.meta.name,
    label: data.meta.label,
    email: data.meta.email,
    phone: data.meta.phone,
    url: data.meta.url,
    location: data.meta.location ? { city: data.meta.location } : undefined,
    profiles: [
      data.meta.github ? { network: 'GitHub', username: data.meta.github, url: 'https://github.com/' + data.meta.github } : null,
      data.meta.linkedin ? { network: 'LinkedIn', username: data.meta.linkedin, url: 'https://linkedin.com/in/' + data.meta.linkedin } : null,
    ].filter(Boolean),
  };
  const work = [], education = [], skills = [], projects = [], certificates = [];
  for (const sec of data.sections || []) {
    const t = String(sec.title || '').toLowerCase();
    if (t.indexOf('experi') !== -1 || t.indexOf('experience') !== -1 || t.indexOf('work') !== -1) {
      for (const it of sec.items || []) {
        work.push({ name: it.subtitle, position: it.title, startDate: it.period ? it.period.split(/[–-]/)[0].trim() : undefined, endDate: it.period ? it.period.split(/[–-]/)[1].trim() : undefined, summary: it.body, highlights: it.bullets });
      }
    } else if (t.indexOf('educ') !== -1) {
      for (const it of sec.items || []) education.push({ institution: it.subtitle || it.title, studyType: it.title, area: it.subtitle });
      for (const p of sec.paragraphs || []) education.push({ institution: p });
    } else if (t.indexOf('skill') !== -1) {
      const all = [].concat(sec.paragraphs || [], (sec.items || []).map((i) => i.title));
      const list = all.flatMap((s) => String(s).split(/[,;]/).map((x) => x.trim()).filter(Boolean));
      if (list.length) skills.push({ name: sec.title, keywords: list });
    } else if (t.indexOf('proj') !== -1) {
      for (const it of sec.items || []) projects.push({ name: it.title, description: it.body || (it.bullets || []).join(' '), url: '' });
    } else if (t.indexOf('cert') !== -1) {
      for (const it of sec.items || []) certificates.push({ name: it.title, issuer: it.subtitle, date: it.period });
    }
  }
  if (work.length) out.work = work;
  if (education.length) out.education = education;
  if (skills.length) out.skills = skills;
  if (projects.length) out.projects = projects;
  if (certificates.length) out.certificates = certificates;
  if (data.summary) out.basics.summary = data.summary;
  return out;
}

function emptyResumeData(){return {meta:{},summary:'',sections:[]};}
function oneLine(value){return String(value==null?'':value).replace(/[\r\n]+/g,' ').trim();}
function splitLines(value){return String(value==null?'':value).split(/\r?\n/).map(line=>line.trim()).filter(Boolean);}
function serializeResume(data){
  data = data || guidedResume;
  if(!data)return '';
  const meta=data.meta||{},sections=Array.isArray(data.sections)?data.sections:[];
  const hasMeta=['name','label','email','phone','location','url','github','linkedin','lang'].some(key=>String(meta[key]==null?'':meta[key]).trim());
  const hasSections=sections.some(section=>String(section.title||'').trim()|| (section.paragraphs||[]).some(Boolean)||(section.items||[]).some(item=>item.title||item.subtitle||item.period||item.body||(item.bullets||[]).some(Boolean)));
  const summary=String(data.summary||'').trim();
  if(!hasMeta&&!hasSections&&!summary)return '';
  const fields=['name','label','email','phone','location','url','github','linkedin','lang'];
  const frontmatter=['---','name: ' + JSON.stringify(String(meta.name||''))];
  for(const key of fields.slice(1)){
    const value=String(meta[key]==null?'':meta[key]).trim();
    if(value)frontmatter.push(key + ': ' + JSON.stringify(value));
  }
  frontmatter.push('---','');
  const body=[];
  if(summary)body.push.apply(body, summary.split(/\r?\n/).map(line=>line.trim()).filter(Boolean).concat(['']));
  for(const section of sections){
    const paragraphs=(section.paragraphs||[]).map(line=>String(line||'').trim()).filter(Boolean);
    const items=(section.items||[]).filter(item=>item.title||item.subtitle||item.period||item.body||(item.bullets||[]).some(Boolean));
    if(!String(section.title||'').trim()&&!paragraphs.length&&!items.length)continue;
    if(!String(section.title||'').trim())continue;
    body.push('## ' + (oneLine(section.title)||'Nova seção'),'');
    for(const paragraph of paragraphs)body.push(paragraph);
    if(paragraphs.length&&items.length)body.push('');
    for(const item of items){
      const title=oneLine(item.title)||oneLine(item.subtitle)||'Novo item';
      const subtitle=oneLine(item.subtitle);
      const period=oneLine(item.period);
      const heading='### ' + title + (subtitle&&subtitle!==title?' — '+subtitle:'') + (period?' ('+period+')':'');
      body.push(heading);
      if(item.body)body.push.apply(body, String(item.body).split(/\r?\n/).map(line=>line.trim()).filter(Boolean));
      for(const bullet of item.bullets||[])for(const line of splitLines(bullet))body.push('- ' + line);
      body.push('');
    }
    while(body.length&&body[body.length-1]==='')body.pop();
    body.push('');
  }
  return frontmatter.concat(body).join('\n').trimEnd()+'\n';
}

const editor = CodeMirror.fromTextArea(document.getElementById('markdown'), { mode:'markdown', theme:'dracula', lineNumbers:true, lineWrapping:true, tabSize:2, autofocus:false });
const editorHost=document.getElementById('editorHost'), guidedHost=document.getElementById('guidedHost'), editorEmpty=document.getElementById('editorEmpty'), editorError=document.getElementById('editorError');
const modeMarkdownButton=document.getElementById('modeMarkdown'), modeGuidedButton=document.getElementById('modeGuided');
const saveIndicator=document.getElementById('saveIndicator'), saveText=document.getElementById('saveText');
const renderStatus=document.getElementById('renderStatus'), renderText=document.getElementById('renderText');
const previewCanvas=document.getElementById('previewCanvas'), paperStage=document.getElementById('paperStage'), paper=document.getElementById('paper'), previewFrame=document.getElementById('previewFrame'), previewEmpty=document.getElementById('previewEmpty');
const pageCountLabel=document.getElementById('pageCount'), zoomOutButton=document.getElementById('zoomOut'), zoomFitButton=document.getElementById('zoomFit'), zoomInButton=document.getElementById('zoomIn');
const themePicker=document.getElementById('themePicker'), themeMenu=document.getElementById('themeMenu'), themeTrigger=document.getElementById('themeTrigger');
const moreActions=document.getElementById('moreActions'), fileInput=document.getElementById('fileInput');
const PAGE_WIDTH=794, PAGE_HEIGHT=1123;
let selectedTheme='classic', editorMode='markdown', guidedResume=emptyResumeData(), renderTimer=null, saveTimer=null, activeRender=null, toastTimer=null, currentHtml='', renderToken=0, fadeNextPreview=false, longPreview=false;
let previewZoom=null;
const ZOOM_STEPS=[0.4,0.5,0.65,0.8,1];
let themes = THEMES.slice();

function currentMarkdown(){return editorMode==='guided'?serializeResume():editor.getValue();}

function updateModeButtons(){modeMarkdownButton.setAttribute('aria-pressed',String(editorMode==='markdown'));modeGuidedButton.setAttribute('aria-pressed',String(editorMode==='guided'));}
function updateEmptyState(){const hasText=Boolean(currentMarkdown().trim());editorEmpty.hidden=editorMode==='guided'||hasText;previewEmpty.hidden=hasText;paperStage.hidden=!hasText||!currentHtml;document.getElementById('clearDraft').disabled=!hasText;if(!hasText){if(pageCountLabel)pageCountLabel.textContent='—';setPreviewEmpty('A prévia aparece aqui','Digite ou carregue um CV para ver o resultado.');}}
function setMarkdownMode(markdown){
  const nextMarkdown=markdown!==undefined?markdown:(editorMode==='guided'?serializeResume(guidedResume):editor.getValue());
  editorMode='markdown';guidedHost.hidden=true;editorHost.hidden=false;updateModeButtons();
  if(editor.getValue()!==nextMarkdown)editor.setValue(nextMarkdown);
  editor.save();
  editor.refresh();updateEmptyState();scheduleRender();
}
async function setGuidedMode(){
  if(editorMode==='guided')return;
  try{
    const markdown=editor.getValue();
    if(!markdown.trim())guidedResume=emptyResumeData();
    else{
      const data=parseResume(markdown);
      const parsedSections=(data.sections||[]).map(section=>({title:section.title||'',paragraphs:section.paragraphs||[],items:(section.items||[]).map(item=>({title:item.title||'',subtitle:item.subtitle||'',period:item.period||'',body:item.body||'',bullets:item.bullets||[]}))}));
      let summary=data.summary||'';
      const remainingSections=[];
      for(const section of parsedSections){
        if(/^resumo|summary/i.test(section.title)&&!(section.items||[]).length){
          if(!summary)summary=(section.paragraphs||[]).join('\n');
        }else remainingSections.push(section);
      }
      guidedResume={meta:data.meta||{},summary,sections:remainingSections};
    }
    renderGuidedForm();editorMode='guided';editorHost.hidden=true;guidedHost.hidden=false;updateModeButtons();updateEmptyState();setError('');scheduleRender();
  }catch(error){setError(error.message||'Não foi possível abrir o modo guiado.');setRenderStatus('error','Revise o Markdown');}
}
function guidedChanged(){updateEmptyState();setSaveStatus('saving','Salvando…');clearTimeout(saveTimer);saveTimer=setTimeout(saveDraft,350);scheduleRender();}
function makeGuidedButton(text,label,handler,disabled){
  disabled = !!disabled;
  const button=document.createElement('button');button.type='button';button.className='guided-small-button';button.textContent=text;button.setAttribute('aria-label',label);button.title=label;button.disabled=disabled;button.addEventListener('click',handler);return button;
}
function makeGuidedField(labelText,value,onChange,options){
  options = options || {};
  const label=document.createElement('label');label.className='guided-field';
  const caption=document.createElement('span');caption.textContent=labelText;
  const control=document.createElement(options.multiline?'textarea':'input');
  if(!options.multiline&&options.type)control.type=options.type;
  if(options.placeholder)control.placeholder=options.placeholder;
  if(options.required)control.setAttribute('aria-required','true');
  control.value=value==null?'':value;
  control.addEventListener('input',()=>{onChange(control.value);guidedChanged();});
  label.append(caption,control);return label;
}
function makeGuidedPanel(title){
  const panel=document.createElement('section');panel.className='guided-section';
  const heading=document.createElement('h3');heading.className='guided-panel-title';heading.textContent=title;panel.append(heading);return panel;
}
function renderGuidedForm(){
  guidedHost.replaceChildren();
  const intro=document.createElement('p');intro.className='guided-intro';intro.textContent='Preencha os campos; o Markdown e a prévia são atualizados automaticamente.';guidedHost.append(intro);
  const basics=makeGuidedPanel('Identidade e contato'),basicGrid=document.createElement('div');basicGrid.className='guided-grid';
  const metaFields=[
    ['Nome completo *','name','Seu nome',{required:true}],
    ['Cargo ou área','label','Ex.: Engenheira de software',{}],
    ['E-mail','email','nome@exemplo.com',{type:'email'}],
    ['Telefone','phone','+55 11 99999-9999',{}],
    ['Localização','location','Cidade, país',{}],
    ['Site ou portfólio','url','https://…',{}],
    ['GitHub','github','usuário ou URL',{}],
    ['LinkedIn','linkedin','usuário ou URL',{}],
    ['Idioma do documento','lang','pt-BR',{}],
  ];
  for(const [label,key,placeholder,options] of metaFields){
    basicGrid.append(makeGuidedField(label,guidedResume.meta[key],value=>{guidedResume.meta[key]=value;},Object.assign({},options,{placeholder})));
  }
  basics.append(basicGrid);guidedHost.append(basics);
  const summary=makeGuidedPanel('Resumo profissional');
  const summaryWrapper=makeGuidedField('Resumo','',value=>{guidedResume.summary=value;},{multiline:true,placeholder:'Uma apresentação breve alinhada à vaga.'});
  summaryWrapper.querySelector('textarea').value=guidedResume.summary||'';
  summary.append(summaryWrapper);guidedHost.append(summary);
  const sectionsHost=document.createElement('div');sectionsHost.className='guided-section-body';
  if(!guidedResume.sections.length){const empty=document.createElement('div');empty.className='guided-empty';empty.textContent='Adicione uma seção para começar, por exemplo Experiência ou Formação.';sectionsHost.append(empty);}
  guidedResume.sections.forEach((section,index)=>{
    const card=makeGuidedPanel('Seção');card.classList.add('guided-section-card');
    const cardHeading=card.querySelector('.guided-panel-title');
    const controls=document.createElement('div');controls.className='guided-actions';
    controls.append(
      makeGuidedButton('↑','Mover ' + (section.title||'seção') + ' para cima',()=>moveSection(index,-1),index===0),
      makeGuidedButton('↓','Mover ' + (section.title||'seção') + ' para baixo',()=>moveSection(index,1),index===guidedResume.sections.length-1),
      makeGuidedButton('Remover','Remover seção ' + (section.title||''),()=>{guidedResume.sections.splice(index,1);renderGuidedForm();guidedChanged();}),
    );
    const sectionHead=document.createElement('div');sectionHead.className='guided-section-head';
    const titleLabel=document.createElement('label');titleLabel.className='guided-section-title';
    const titleCaption=document.createElement('span');titleCaption.textContent='Seção ' + (index+1);
    const titleInput=document.createElement('input');titleInput.type='text';titleInput.value=section.title||'';titleInput.placeholder='Ex.: Experiência';
    titleInput.addEventListener('input',()=>{section.title=titleInput.value;titleCaption.textContent='Seção ' + (index+1) + ' · ' + (titleInput.value||'sem título');guidedChanged();});
    titleLabel.append(titleCaption,titleInput);sectionHead.append(titleLabel,controls);
    cardHeading.remove();card.append(sectionHead);
    const paragraphs=makeGuidedField('Texto da seção (opcional)',(section.paragraphs||[]).join('\n'),value=>{section.paragraphs=splitLines(value);},{multiline:true,placeholder:'Uma linha por parágrafo. Útil para competências ou formação.'});
    card.append(paragraphs);
    const itemsHost=document.createElement('div');itemsHost.className='guided-section-body';
    (section.items||[]).forEach((item,itemIndex)=>{
      const itemCard=document.createElement('div');itemCard.className='guided-item';
      const itemHead=document.createElement('div');itemHead.className='guided-item-head';
      const itemLabel=document.createElement('span');itemLabel.textContent='Item ' + (itemIndex+1);
      itemHead.append(itemLabel,makeGuidedButton('Remover','Remover item ' + (itemIndex+1),()=>{section.items.splice(itemIndex,1);renderGuidedForm();guidedChanged();}));
      itemCard.append(itemHead);
      const itemGrid=document.createElement('div');itemGrid.className='guided-grid';
      itemGrid.append(
        makeGuidedField('Cargo ou título',item.title,value=>{item.title=value;},{placeholder:'Ex.: Desenvolvedora backend'}),
        makeGuidedField('Empresa ou contexto',item.subtitle,value=>{item.subtitle=value;},{placeholder:'Ex.: Empresa ou projeto'}),
        makeGuidedField('Período',item.period,value=>{item.period=value;},{placeholder:'2022–atual'}),
      );
      itemCard.append(itemGrid);
      itemCard.append(makeGuidedField('Descrição (opcional)',item.body,value=>{item.body=value;},{multiline:true,placeholder:'Contexto breve do cargo ou projeto.'}));
      itemCard.append(makeGuidedField('Resultados ou tópicos (um por linha)',(item.bullets||[]).join('\n'),value=>{item.bullets=splitLines(value);},{multiline:true,placeholder:'Ex.: Reduzi o tempo de resposta em 30%.'}));
      itemsHost.append(itemCard);
    });
    const addItem=makeGuidedButton('＋ Adicionar item','Adicionar item à seção',()=>{section.items.push({title:'',subtitle:'',period:'',body:'',bullets:[]});renderGuidedForm();guidedChanged();});
    addItem.className='guided-add';itemsHost.append(addItem);card.append(itemsHost);sectionsHost.append(card);
  });
  const addSection=makeGuidedButton('＋ Adicionar seção','Adicionar seção ao currículo',()=>{guidedResume.sections.push({title:'Nova seção',paragraphs:[],items:[]});renderGuidedForm();guidedChanged();});
  addSection.className='guided-add';sectionsHost.append(addSection);guidedHost.append(sectionsHost);
}
function moveSection(index,direction){
  const target=index+direction;if(target<0||target>=guidedResume.sections.length)return;
  const tmp=guidedResume.sections[index];guidedResume.sections[index]=guidedResume.sections[target];guidedResume.sections[target]=tmp;
  renderGuidedForm();guidedChanged();
}

function showToast(message){const toast=document.getElementById('toast');toast.textContent=message;toast.dataset.visible='true';clearTimeout(toastTimer);toastTimer=setTimeout(()=>toast.dataset.visible='false',2800);}
function themeLabel(slug){return (THEME_INFO[slug]&&THEME_INFO[slug].name)||slug;}
function setRenderStatus(state,message){renderStatus.dataset.state=state;renderText.textContent=message;renderStatus.firstElementChild.className=state==='rendering'?'spinner':'status-dot';}
function setSaveStatus(state,message){saveIndicator.dataset.state=state;saveText.textContent=message;}
function setError(message){message=message||'';editorError.textContent=message;editorError.dataset.visible=message?'true':'false';}
function setPreviewEmpty(title,message){const content=document.createElement('div'),heading=document.createElement('strong');heading.textContent=title;content.append(heading,document.createTextNode(message));previewEmpty.replaceChildren(content);}

function renderDesignThemeSpecs(){
  const grid=document.getElementById('designThemeGrid');
  const labels=[['Papel','paper'],['Texto','text'],['Títulos','heading'],['Apoio','muted'],['Divisórias','line']];
  grid.replaceChildren.apply(grid, Object.entries(THEME_INFO).map(([slug,info])=>{
    const card=document.createElement('article');card.className='design-theme-card';
    const title=document.createElement('h4');title.textContent=info.name;
    const meta=document.createElement('p');meta.className='design-theme-meta';meta.textContent=info.font + ' · margens ' + info.margins + '. ' + info.design;
    const reason=document.createElement('p');reason.className='design-theme-reason';reason.textContent='Escolha quando: ' + info.reason;
    const palette=document.createElement('div');palette.className='palette-row';
    for(const [label,key] of labels){
      const row=document.createElement('div');row.className='palette-item';
      const swatch=document.createElement('span');swatch.className='palette-swatch';swatch.style.backgroundColor=info.palette[key];swatch.setAttribute('aria-hidden','true');
      const name=document.createElement('span');name.textContent=label;
      const color=document.createElement('code');color.textContent=info.palette[key];
      row.append(swatch,name,color);palette.append(row);
    }
    card.append(title,meta,reason,palette);return card;
  }));
}
renderDesignThemeSpecs();

function createThemeOption(slug){
  const info=THEME_INFO[slug]||{name:slug,description:'Tema'};
  const button=document.createElement('button');button.type='button';button.className='theme-option';button.dataset.theme=slug;button.setAttribute('role','radio');button.setAttribute('aria-checked','false');button.tabIndex=-1;button.title=info.reason||info.description;
  const thumb=document.createElement('span');thumb.className='theme-thumb thumb-' + slug;thumb.setAttribute('aria-hidden','true');
  const text=document.createElement('span');
  const name=document.createElement('strong');name.textContent=info.name;
  const description=document.createElement('small');description.textContent=info.description;
  text.append(name,description);
  const check=document.createElement('span');check.className='theme-check';check.setAttribute('aria-hidden','true');check.textContent='✓';
  button.append(thumb,text,check);button.addEventListener('click',()=>selectTheme(slug));return button;
}
function updateSelectedCard(){
  document.querySelectorAll('.theme-option').forEach(option=>{
    const active=option.dataset.theme===selectedTheme;
    option.setAttribute('aria-checked',String(active));
    option.tabIndex=active?0:-1;
  });
  const info=THEME_INFO[selectedTheme];
  const thumb=document.getElementById('themeTriggerThumb');
  const name=document.getElementById('themeTriggerName');
  if(thumb)thumb.className='theme-thumb thumb-'+selectedTheme;
  if(name&&info)name.textContent=info.name;
  if(themeTrigger&&info)themeTrigger.setAttribute('aria-label','Tema: '+info.name+'. Alterar tema');
}
function selectTheme(theme,closeMenu=true){
  if(themes.indexOf(theme)===-1)return;
  selectedTheme=theme;updateSelectedCard();
  try{localStorage.setItem('resume-theme',theme);}catch{}
  if(closeMenu&&themePicker)themePicker.open=false;
  fadeNextPreview=true;
  scheduleRender();
}
function themeOptions(){return Array.from(themeMenu.querySelectorAll('.theme-option'));}
function focusThemeOption(offset){
  const options=themeOptions();if(!options.length)return null;
  let index=options.indexOf(document.activeElement);
  if(index<0)index=Math.max(0,options.findIndex(option=>option.getAttribute('aria-checked')==='true'));
  if(offset)index=(index+offset+options.length)%options.length;
  const option=options[index];option.focus();return option;
}

function loadThemes(){
  const order=['classic','modern','minimal','creative','tech-dark'];
  themes = order.filter(t=>THEMES.indexOf(t)!==-1);
  themeMenu.replaceChildren.apply(themeMenu, themes.map(createThemeOption));
  try{const savedTheme=localStorage.getItem('resume-theme');if(savedTheme&&themes.indexOf(savedTheme)!==-1)selectedTheme=savedTheme;}catch{}
  updateSelectedCard();
}

function scheduleRender(){
  clearTimeout(renderTimer);activeRender?.abort();activeRender=null;renderToken++;setError('');
  const markdown=currentMarkdown();
  if(!markdown.trim()){currentHtml='';updateEmptyState();setRenderStatus('idle','Aguardando');return;}
  if(editorMode==='guided'&&!String((guidedResume.meta&&guidedResume.meta.name)||'').trim()){
    currentHtml='';paperStage.hidden=true;previewEmpty.hidden=false;if(pageCountLabel)pageCountLabel.textContent='—';setPreviewEmpty('Informe seu nome','Preencha o campo Nome completo para gerar o currículo.');setError('O nome completo é necessário para montar a prévia.');setRenderStatus('error','Campo obrigatório');return;
  }
  if(!currentHtml){previewEmpty.hidden=false;setPreviewEmpty('Preparando prévia','Seu currículo será atualizado em instantes.');}
  setRenderStatus('rendering','Atualizando…');renderTimer=setTimeout(renderPreview,280);
}
async function renderPreview(){
  const markdown=currentMarkdown();if(!markdown.trim())return;
  const controller=new AbortController();activeRender=controller;
  try{
    const data=parseResume(markdown);
    const token=++renderToken;
    const html=await renderPagedHtml(data,selectedTheme);
    if(token!==renderToken)return;
    const scrollTop=previewCanvas.scrollTop;
    currentHtml=html;previewEmpty.hidden=true;paperStage.hidden=false;
    previewFrame.onload=()=>{
      fitPreview();
      if(fadeNextPreview){
        fadeNextPreview=false;
        if(!window.matchMedia||!window.matchMedia('(prefers-reduced-motion: reduce)').matches){
          previewFrame.classList.remove('is-fading');
          void previewFrame.offsetWidth;
          previewFrame.classList.add('is-fading');
          previewFrame.addEventListener('animationend',()=>previewFrame.classList.remove('is-fading'),{once:true});
        }
      }
      if(scrollTop>0)previewCanvas.scrollTop=scrollTop;setError('');setRenderStatus('ready','Atualizado');
    };
    previewFrame.srcdoc=currentHtml;updateEmptyState();
  }catch(error){
    currentHtml='';paperStage.hidden=true;previewEmpty.hidden=false;if(pageCountLabel)pageCountLabel.textContent='—';setPreviewEmpty('Prévia indisponível','Confira os dados e a formatação do Markdown no editor.');setError(error.message||'Ocorreu um erro ao interpretar o Markdown.');setRenderStatus('error','Revisar');
  }
}
function changePreviewZoom(direction){
  if(!previewFrame.contentDocument)return;
  const fitScale=Math.min(1,Math.max(220,previewCanvas.clientWidth-32)/PAGE_WIDTH);
  const current=previewZoom===null?fitScale:previewZoom;
  if(direction>0){previewZoom=ZOOM_STEPS.find(step=>step>current+.02)||1;}
  else{const lower=ZOOM_STEPS.filter(step=>step<current-.02);previewZoom=lower.length?lower[lower.length-1]:ZOOM_STEPS[0];}
  fitPreview();
}
function fitPreview(){
  if(!previewFrame.contentDocument||paperStage.hidden)return;
  const doc=previewFrame.contentDocument,height=Math.max(PAGE_HEIGHT,doc.documentElement.scrollHeight,doc.body?doc.body.scrollHeight:0);
  const fitScale=Math.min(1,Math.max(220,previewCanvas.clientWidth-32)/PAGE_WIDTH);
  const scale=previewZoom===null?fitScale:previewZoom;
  paper.style.width=PAGE_WIDTH*scale+'px';paper.style.height=height*scale+'px';
  previewFrame.style.width=PAGE_WIDTH+'px';previewFrame.style.height=height+'px';previewFrame.style.transform='scale('+scale+')';
  paperStage.style.justifyContent=(PAGE_WIDTH*scale>Math.max(220,previewCanvas.clientWidth-32))?'flex-start':'center';
  const percent=Math.round(scale*100);
  if(zoomFitButton){
    zoomFitButton.textContent=percent+'%';
    zoomFitButton.setAttribute('aria-pressed',String(previewZoom===null));
    zoomFitButton.setAttribute('aria-label',previewZoom===null?'Ajustado à largura ('+percent+'%). Alterar zoom.':'Zoom de '+percent+'%. Voltar a ajustar.');
    zoomFitButton.disabled=false;
  }
  if(zoomOutButton)zoomOutButton.disabled=false;
  if(zoomInButton)zoomInButton.disabled=false;
  if(pageCountLabel){
    const pages=doc.querySelectorAll('.resume-page').length||Math.max(1,Math.ceil(height/PAGE_HEIGHT));
    pageCountLabel.textContent=(pages>2?'⚠ ':'')+pages+(pages===1?' página':' páginas');
    pageCountLabel.classList.toggle('is-long',pages>2);
    pageCountLabel.title=pages>2?'Mais de 2 páginas. Considere enxugar o conteúdo para facilitar a leitura.':'';
    if(pages>2&&!longPreview){longPreview=true;showToast('Seu currículo tem '+pages+' páginas. Considere enxugar o conteúdo.');}
    else if(pages<=2)longPreview=false;
  }
}

function saveDraft(){
  const markdown=currentMarkdown();
  if(!markdown.trim()){setSaveStatus('saved','Rascunho neste navegador');return;}
  setSaveStatus('saving','Salvando…');
  try{localStorage.setItem('resume-md',markdown);localStorage.setItem('resume-theme',selectedTheme);setSaveStatus('saved','Rascunho neste navegador');}
  catch{setSaveStatus('error','Não foi possível salvar');}
}
function onEditorChange(){editor.save();updateEmptyState();setSaveStatus('saving','Salvando…');clearTimeout(saveTimer);saveTimer=setTimeout(saveDraft,350);scheduleRender();}
function loadExample(){if(currentMarkdown().trim()&&!window.confirm('Substituir o conteúdo atual pelo exemplo?'))return;setMarkdownMode('');editor.setValue(SAMPLE);editor.focus();showToast('Exemplo carregado. Troque os dados fictícios pelos seus.');}
async function readMarkdownFile(file){
  if(!file)return;if(file.size>1024*1024){setError('O arquivo é muito grande. O limite é 1 MB.');return;}
  setMarkdownMode('');editor.setValue(await file.text());editor.focus();setError('');showToast('Arquivo “'+file.name+'” aberto.');
}

const browserLibraryPromises={};
function loadBrowserLibrary(globalName,relativeUrl){
  if(window[globalName])return Promise.resolve(window[globalName]);
  if(browserLibraryPromises[globalName])return browserLibraryPromises[globalName];
  browserLibraryPromises[globalName]=new Promise((resolve,reject)=>{
    const script=document.createElement('script');
    script.src=new URL(relativeUrl,document.baseURI).href;
    script.onload=()=>window[globalName]?resolve(window[globalName]):reject(new Error('A biblioteca '+globalName+' não foi inicializada.'));
    script.onerror=()=>{delete browserLibraryPromises[globalName];reject(new Error('Não foi possível carregar a biblioteca '+globalName+'.'));};
    document.head.append(script);
  });
  return browserLibraryPromises[globalName];
}

function downloadBlob(blob, filename){
  const url=URL.createObjectURL(blob),link=document.createElement('a');link.href=url;link.download=filename;document.body.append(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);
}
async function downloadPdf(){
  const markdown=currentMarkdown();
  if(!markdown.trim()){setError('Adicione o conteúdo do currículo antes de exportar.');if(editorMode==='markdown')editor.focus();return;}
  let data;
  try{data=parseResume(markdown);}
  catch(error){setError(error.message||'Falha ao preparar o PDF.');setRenderStatus('error','Falha na exportação');return;}
  const w=window.open('','_blank');
  if(!w){setError('Permita pop-ups para abrir a impressão do PDF.');setRenderStatus('error','Pop-up bloqueado');return;}
  try{
    const html=await renderPagedHtml(data,selectedTheme);
    w.document.open();w.document.write(html);w.document.close();
    setTimeout(async()=>{try{await w.document.fonts.ready;}catch{}w.focus();w.print();},300);
    setRenderStatus('ready','Pronto');showToast('Use “Salvar como PDF” na janela de impressão.');
  }catch(error){w.close();setError(error.message||'Falha ao exportar.');setRenderStatus('error','Falha na exportação');}
}
async function downloadHtml(){
  const markdown=currentMarkdown();
  if(!markdown.trim()){setError('Adicione o conteúdo do currículo antes de exportar.');if(editorMode==='markdown')editor.focus();return;}
  try{
    const data=parseResume(markdown);
    const html=await renderPagedHtml(data,selectedTheme);
    downloadBlob(new Blob([html],{type:'text/html;charset=utf-8'}),'curriculo-'+selectedTheme+'.html');
    setRenderStatus('ready','Pronto');showToast('curriculo-'+selectedTheme+'.html foi baixado.');
  }catch(error){setError(error.message||'Falha ao exportar.');setRenderStatus('error','Falha na exportação');}
}
function downloadMarkdown(){
  const markdown=currentMarkdown();
  if(!markdown.trim()){setError('Adicione o conteúdo do currículo antes de exportar.');if(editorMode==='markdown')editor.focus();return;}
  try{
    downloadBlob(new Blob([markdown],{type:'text/markdown;charset=utf-8'}),'curriculo.md');
    setRenderStatus('ready','Pronto');showToast('curriculo.md foi baixado.');
  }catch(error){setError(error.message||'Falha ao exportar.');setRenderStatus('error','Falha na exportação');}
}
async function downloadJson(){
  const markdown=currentMarkdown();
  if(!markdown.trim()){setError('Adicione o conteúdo do currículo antes de exportar.');if(editorMode==='markdown')editor.focus();return;}
  try{
    const data=parseResume(markdown);
    const json=toJsonResume(data);
    downloadBlob(new Blob([JSON.stringify(json,null,2)],{type:'application/json;charset=utf-8'}),'resume.json');
    setRenderStatus('ready','Pronto');showToast('resume.json foi baixado.');
  }catch(error){setError(error.message||'Falha ao exportar.');setRenderStatus('error','Falha na exportação');}
}
async function downloadDocx(){
  const markdown=currentMarkdown();
  if(!markdown.trim()){setError('Adicione o conteúdo do currículo antes de exportar.');if(editorMode==='markdown')editor.focus();return;}
  try{
    const data=parseResume(markdown);
    await loadBrowserLibrary('docx','vendor/docx.iife.js');
    const blob=await renderDocx(data);
    downloadBlob(blob,'curriculo.docx');
    setRenderStatus('ready','Pronto');showToast('curriculo.docx foi baixado.');
  }catch(error){setError(error.message||'Falha ao exportar.');setRenderStatus('error','Falha na exportação');}
}
async function downloadZip(){
  const markdown=currentMarkdown();
  if(!markdown.trim()){setError('Adicione o conteúdo do currículo antes de exportar.');if(editorMode==='markdown')editor.focus();return;}
  try{
    const data=parseResume(markdown);
    const JSZipLibrary=await loadBrowserLibrary('JSZip','vendor/jszip.min.js');
    const zip=new JSZipLibrary();
    for(const t of themes){
      const html=await renderPagedHtml(data,t);
      zip.file('curriculo.'+t+'.html',html);
    }
    const blob=await zip.generateAsync({type:'blob'});
    downloadBlob(blob,'curriculos-temas.zip');
    setRenderStatus('ready','Pronto');showToast('curriculos-temas.zip foi baixado.');
  }catch(error){setError(error.message||'Falha ao exportar.');setRenderStatus('error','Falha na exportação');}
}

function getHistory(){try{return JSON.parse(localStorage.getItem('resume-history')||'[]');}catch{return[];}}
function saveVersion(){
  const markdown=currentMarkdown();if(!markdown.trim()){setError('Não há conteúdo para salvar como versão.');return;}
  const history=getHistory();history.unshift({markdown,theme:selectedTheme,createdAt:Date.now()});
  try{localStorage.setItem('resume-history',JSON.stringify(history.slice(0,10)));showToast('Versão salva neste navegador.');}catch{showToast('Não foi possível salvar a versão.');}
}
function openHistory(){
  const list=document.getElementById('historyList');list.replaceChildren();const history=getHistory();
  if(!history.length){const empty=document.createElement('div');empty.className='history-empty';empty.textContent='As versões salvas manualmente aparecerão aqui.';list.append(empty);}
  history.forEach(entry=>{
    const button=document.createElement('button');button.type='button';button.className='history-entry';
    const details=document.createElement('span'),date=document.createElement('strong'),theme=document.createElement('small'),restore=document.createElement('span');
    date.textContent=new Date(entry.createdAt).toLocaleString('pt-BR');theme.textContent=themeLabel(entry.theme);restore.textContent='Restaurar';restore.style.cssText='color:#d0d6d9;font-size:11px';details.append(date,theme);button.append(details,restore);
    button.addEventListener('click',()=>{setMarkdownMode(entry.markdown);editor.focus();selectTheme(entry.theme);document.getElementById('historyDialog').close();showToast('Versão restaurada.');});list.append(button);
  });
  document.getElementById('historyDialog').showModal();moreActions.open=false;
}

editor.on('change',onEditorChange);
modeMarkdownButton.addEventListener('click',()=>{if(editorMode==='guided')setMarkdownMode();});
modeGuidedButton.addEventListener('click',setGuidedMode);
document.getElementById('openFile').addEventListener('click',()=>fileInput.click());
document.getElementById('loadExample').addEventListener('click',loadExample);
document.getElementById('clearDraft').addEventListener('click',()=>{
  if(!currentMarkdown().trim()||!window.confirm('Limpar o conteúdo do editor?'))return;
  setError('');
  try{localStorage.removeItem('resume-md');}catch{}
  if(editorMode==='guided'){guidedResume=emptyResumeData();renderGuidedForm();guidedChanged();}
  else{editor.setValue('');editor.focus();}
  setSaveStatus('idle','Rascunho removido');
});
fileInput.addEventListener('change',async event=>{await readMarkdownFile(event.target.files[0]);fileInput.value='';});
editorHost.addEventListener('dragover',event=>{event.preventDefault();editorHost.style.boxShadow='inset 0 0 0 2px #8b9397';});
editorHost.addEventListener('dragleave',()=>{editorHost.style.boxShadow='';});
editorHost.addEventListener('drop',async event=>{event.preventDefault();editorHost.style.boxShadow='';await readMarkdownFile(event.dataTransfer.files[0]);});
document.getElementById('downloadPdf').addEventListener('click',downloadPdf);
document.getElementById('downloadDocx').addEventListener('click',()=>{downloadDocx();moreActions.open=false;});
document.getElementById('downloadHtml').addEventListener('click',()=>{downloadHtml();moreActions.open=false;});
document.getElementById('downloadMd').addEventListener('click',()=>{downloadMarkdown();moreActions.open=false;});
document.getElementById('downloadJson').addEventListener('click',()=>{downloadJson();moreActions.open=false;});
document.getElementById('downloadZip').addEventListener('click',()=>{downloadZip();moreActions.open=false;});
document.getElementById('saveVersion').addEventListener('click',()=>{saveVersion();moreActions.open=false;});
document.getElementById('openHistory').addEventListener('click',openHistory);
document.getElementById('closeHistory').addEventListener('click',()=>document.getElementById('historyDialog').close());
document.getElementById('historyDialog').addEventListener('click',event=>{if(event.target===event.currentTarget)event.currentTarget.close();});
document.getElementById('openDesignDialog').addEventListener('click',()=>{moreActions.open=false;document.getElementById('designDialog').showModal();});
document.getElementById('closeDesignDialog').addEventListener('click',()=>document.getElementById('designDialog').close());
document.getElementById('designDialog').addEventListener('click',event=>{if(event.target===event.currentTarget)event.currentTarget.close();});
document.addEventListener('click',event=>{if(moreActions.open&&!moreActions.contains(event.target))moreActions.open=false;});
document.addEventListener('keydown',event=>{
  if((event.ctrlKey||event.metaKey)&&event.key.toLowerCase()==='s'){event.preventDefault();document.getElementById('downloadPdf').click();}
  if((event.ctrlKey||event.metaKey)&&event.key==='Enter'){event.preventDefault();renderPreview();}
  if(event.key==='Escape'){moreActions.open=false;if(themePicker.open){themePicker.open=false;themeTrigger.focus();}}
});
document.getElementById('emptyExample').addEventListener('click',loadExample);
document.getElementById('emptyOpenFile').addEventListener('click',()=>fileInput.click());
document.addEventListener('click',event=>{if(themePicker.open&&!themePicker.contains(event.target))themePicker.open=false;});
themeTrigger.addEventListener('keydown',event=>{
  if(['ArrowDown','ArrowUp','ArrowLeft','ArrowRight'].indexOf(event.key)===-1)return;
  event.preventDefault();themePicker.open=true;
  focusThemeOption(0);
});
themeMenu.addEventListener('keydown',event=>{
  if(event.key==='Escape'){event.preventDefault();themePicker.open=false;themeTrigger.focus();return;}
  const step={ArrowDown:1,ArrowRight:1,ArrowUp:-1,ArrowLeft:-1}[event.key];
  if(step){event.preventDefault();const option=focusThemeOption(step);if(option)selectTheme(option.dataset.theme,false);return;}
  if(event.key==='Home'||event.key==='End'){
    event.preventDefault();
    const options=themeOptions(),option=options[event.key==='Home'?0:options.length-1];
    if(option){option.focus();selectTheme(option.dataset.theme,false);}
  }
});
themePicker.addEventListener('toggle',()=>{
  themeMenu.style.transform='';
  if(!themePicker.open)return;
  requestAnimationFrame(()=>{
    const rect=themeMenu.getBoundingClientRect(),pad=12,width=window.innerWidth;
    let shift=0;
    if(rect.left<pad)shift=pad-rect.left;
    else if(rect.right>width-pad)shift=(width-pad)-rect.right;
    if(shift)themeMenu.style.transform='translateX('+Math.round(shift)+'px)';
  });
});
if(zoomOutButton)zoomOutButton.addEventListener('click',()=>changePreviewZoom(-1));
if(zoomFitButton)zoomFitButton.addEventListener('click',()=>{previewZoom=previewZoom===null?1:null;fitPreview();});
if(zoomInButton)zoomInButton.addEventListener('click',()=>changePreviewZoom(1));
window.addEventListener('resize',fitPreview);
if('ResizeObserver'in window)new ResizeObserver(fitPreview).observe(previewCanvas);

try{const saved=localStorage.getItem('resume-md');if(saved)editor.setValue(saved);}catch{}
updateEmptyState();
loadThemes();
if(editor.getValue().trim())renderPreview();else setRenderStatus('idle','Aguardando');
editor.refresh();
setSaveStatus('saved','Rascunho neste navegador');
const footerNote=document.querySelector('.editor-footer span[title]');
if(footerNote){footerNote.textContent='Tudo processado no navegador.';footerNote.removeAttribute('title');}
if('serviceWorker' in navigator){navigator.serviceWorker.register('sw.js').catch(()=>{});}
