import { createRoot } from 'react-dom/client';
import CardNav from '../components/CardNav.jsx';
import logo from '../assets/icon.svg';
import './portfolio-ui.css';

const items = [
  { label: 'Projects', links: [{ label: 'Browse projects', href: '#projects' }] },
  { label: 'About', links: [{ label: 'About me', href: '#about' }] },
  {
    label: 'Contact',
    links: [
      { label: 'Email', href: 'mailto:joemonjoy241@gmail.com' },
      { label: 'LinkedIn', href: 'https://www.linkedin.com/in/joemon24/' },
      { label: 'GitHub', href: 'https://github.com/Joemon24' },
    ],
  },
];

const palette = {
  '--cn-panel': 'var(--paper)',
  '--cn-edge': 'var(--rule)',
  '--cn-highlight': 'transparent',
  '--cn-shadow': 'none',
  '--cn-text': 'var(--ink)',
  '--cn-muted': 'var(--muted)',
  '--cn-hover': 'var(--hover)',
  '--cn-ring': 'var(--ink)',
  '--cn-tile': 'var(--surface)',
  '--cn-tile-rim': 'inset 0 0 0 1px var(--rule)',
  '--cn-radius': '8px',
};

function focusSection(link) {
  if (!link.href.startsWith('#')) return;
  const heading = document.getElementById(link.href.slice(1))?.querySelector('h2');
  if (!heading) return;
  heading.tabIndex = -1;
  requestAnimationFrame(() => heading.focus({ preventScroll: true }));
}

createRoot(document.querySelector('#card-nav-root')).render(
  <CardNav
    logo={logo}
    logoAlt="Portfolio home"
    logoHref="#top"
    items={items}
    onLinkClick={focusSection}
    cardEffect="rise"
    openOn="click"
    theme="light"
    surface="solid"
    intro={false}
    style={palette}
  />,
);
