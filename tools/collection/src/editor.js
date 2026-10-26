// Rich-text editor for the collection dashboard: Tiptap with figures (inline images,
// enlarged detail crops, wide plates), image galleries and numbered source references.
// Markdown shortcuts (## heading, > quote, **bold**, *italic*, - list) come from StarterKit.
import { Editor, Node, mergeAttributes } from '@tiptap/core';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import Superscript from '@tiptap/extension-superscript';
import Typography from '@tiptap/extension-typography';

const Figure = Node.create({
  name: 'figure',
  group: 'block',
  atom: true,
  draggable: true,
  addAttributes() {
    return {
      src: { default: null, parseHTML: (el) => el.querySelector('img')?.getAttribute('src') },
      alt: { default: '', parseHTML: (el) => el.querySelector('img')?.getAttribute('alt') || '' },
      caption: { default: '', parseHTML: (el) => el.querySelector('figcaption')?.textContent || '' },
      variant: { default: 'inline', parseHTML: (el) => el.getAttribute('data-variant') || 'inline' },
    };
  },
  parseHTML() { return [{ tag: 'figure.cx-fig' }]; },
  renderHTML({ node }) {
    const { src, alt, caption, variant } = node.attrs;
    const kids = [['img', { src, alt, loading: 'lazy' }]];
    if (caption) kids.push(['figcaption', {}, caption]);
    return ['figure', { class: 'cx-fig cx-fig-' + variant, 'data-variant': variant }, ...kids];
  },
});

const Gallery = Node.create({
  name: 'gallery',
  group: 'block',
  atom: true,
  draggable: true,
  addAttributes() {
    return {
      images: {
        default: [],
        parseHTML: (el) => [...el.querySelectorAll('figure')].map((f) => ({
          src: f.querySelector('img')?.getAttribute('src') || '',
          alt: f.querySelector('img')?.getAttribute('alt') || '',
          caption: f.querySelector('figcaption')?.textContent || '',
        })),
      },
    };
  },
  parseHTML() { return [{ tag: 'div.cx-gallery' }]; },
  renderHTML({ node }) {
    const figs = node.attrs.images.map((im) => {
      const k = [['img', { src: im.src, alt: im.alt || '', loading: 'lazy' }]];
      if (im.caption) k.push(['figcaption', {}, im.caption]);
      return ['figure', {}, ...k];
    });
    return ['div', { class: 'cx-gallery' }, ...figs];
  },
});

// A numbered reference marker: <sup class="cx-ref"><a href="#ref-3">3</a></sup>
const Ref = Node.create({
  name: 'ref',
  group: 'inline',
  inline: true,
  atom: true,
  addAttributes() {
    return { n: { default: 1, parseHTML: (el) => Number(el.textContent) || 1 } };
  },
  parseHTML() { return [{ tag: 'sup.cx-ref', priority: 1000 }]; },
  renderHTML({ node }) {
    return ['sup', { class: 'cx-ref' }, ['a', mergeAttributes({ href: '#ref-' + node.attrs.n }), String(node.attrs.n)]];
  },
});

const BUTTONS = [
  ['P', 'Paragraph', (c) => c.setParagraph()],
  ['H2', 'Heading', (c) => c.toggleHeading({ level: 2 })],
  ['H3', 'Subheading', (c) => c.toggleHeading({ level: 3 })],
  ['B', 'Bold', (c) => c.toggleBold()],
  ['I', 'Italic', (c) => c.toggleItalic()],
  ['“ ”', 'Blockquote', (c) => c.toggleBlockquote()],
  ['•', 'Bulleted list', (c) => c.toggleBulletList()],
  ['—', 'Divider', (c) => c.setHorizontalRule()],
];

// opts: { content, placeholder, onUpdate(html), pickImage() -> Promise<{src, alt}|null> }
export function createEditor(host, opts = {}) {
  host.classList.add('ed');
  const bar = document.createElement('div');
  bar.className = 'ed-bar';
  bar.setAttribute('role', 'toolbar');
  const area = document.createElement('div');
  area.className = 'ed-area';
  host.append(bar, area);

  const editor = new Editor({
    element: area,
    extensions: [
      StarterKit.configure({ heading: { levels: [2, 3] }, codeBlock: false, code: false, link: { openOnClick: false, autolink: true } }),
      Placeholder.configure({ placeholder: opts.placeholder || 'Begin writing…' }),
      Superscript, Typography, Figure, Gallery, Ref,
    ],
    content: opts.content || '',
    onUpdate: ({ editor: e }) => opts.onUpdate && opts.onUpdate(e.isEmpty ? '' : e.getHTML()),
  });

  const add = (label, title, fn) => {
    const b = document.createElement('button');
    b.type = 'button'; b.textContent = label; b.title = title; b.setAttribute('aria-label', title);
    b.addEventListener('click', () => { fn(); editor.commands.focus(); });
    bar.appendChild(b);
    return b;
  };
  BUTTONS.forEach(([l, t, f]) => add(l, t, () => f(editor.chain().focus()).run()));
  add('Link', 'Link', () => {
    const prev = editor.getAttributes('link').href || '';
    const url = prompt('Link URL (leave empty to remove)', prev);
    if (url === null) return;
    if (!url) editor.chain().focus().unsetLink().run();
    else editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run();
  });
  const insertFigure = async (variant) => {
    const im = opts.pickImage ? await opts.pickImage() : { src: prompt('Image URL') };
    if (!im || !im.src) return;
    const caption = prompt('Caption (optional)') || '';
    editor.chain().focus().insertContent({ type: 'figure', attrs: { src: im.src, alt: im.alt || caption, caption, variant } }).run();
  };
  add('Image', 'Inline image with caption', () => insertFigure('inline'));
  add('Detail', 'Enlarged detail crop', () => insertFigure('detail'));
  add('Gallery', 'Image gallery', async () => {
    const images = [];
    for (;;) {
      const im = opts.pickImage ? await opts.pickImage() : { src: prompt('Image URL (cancel to finish)') };
      if (!im || !im.src) break;
      images.push({ src: im.src, alt: im.alt || '', caption: prompt('Caption (optional)') || '' });
      if (!confirm('Add another image to this gallery?')) break;
    }
    if (images.length) editor.chain().focus().insertContent({ type: 'gallery', attrs: { images } }).run();
  });
  add('Ref', 'Cite a numbered source from References', () => {
    const n = Number(prompt('Reference number', '1'));
    if (n > 0) editor.chain().focus().insertContent({ type: 'ref', attrs: { n } }).run();
  });
  add('↶', 'Undo', () => editor.chain().focus().undo().run());
  add('↷', 'Redo', () => editor.chain().focus().redo().run());

  return {
    editor,
    getHTML: () => (editor.isEmpty ? '' : editor.getHTML()),
    setHTML: (h) => editor.commands.setContent(h || '', { emitUpdate: false }),
    destroy: () => { editor.destroy(); host.innerHTML = ''; },
  };
}
