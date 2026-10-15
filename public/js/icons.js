// Einfache SVG-Icons im Stil von Kotlana OS
const s = (p, vb = '0 0 24 24') => `<svg viewBox="${vb}" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${p}</svg>`;

export const ICONS = {
  scamazon: s('<path d="M5 8h14l-1 12H6z" fill="#fff" stroke="#fff"/><path d="M9 8V6a3 3 0 0 1 6 0v2" stroke="#fff"/>'),
  giftcards: s('<rect x="3" y="9" width="18" height="11" rx="1" stroke="#fff"/><path d="M3 13h18M8 9c-2-1-2-4 0-4s4 4 4 4 2-4 4-4 2 3 0 4" stroke="#fff"/>'),
  browser: s('<circle cx="12" cy="12" r="9" stroke="#fff"/><path d="M3 12h18M12 3c3 3 3 15 0 18M12 3c-3 3-3 15 0 18" stroke="#fff"/>'),
  creditcard: s('<path d="M3 9l15-5 3 9-15 5z" fill="#fff" stroke="#fff"/><path d="M4.5 12.5l15-5" stroke="#139a8c" stroke-width="2.5"/>'),
  camera: s('<path d="M4 8h3l2-3h6l2 3h3v11H4z" fill="#fff" stroke="#fff"/><circle cx="12" cy="13" r="3.5" fill="#000" stroke="#000"/><circle cx="12" cy="13" r="2" fill="#fff" stroke="none"/>'),
  script: s('<path d="M6 4h11a2 2 0 0 1 2 2v1h-3v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-2h3z" stroke="#fff"/><path d="M9 9h5M9 12h5M9 15h3" stroke="#fff"/>'),
  phone: s('<path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2" stroke="#fff"/><path d="M15 3a6 6 0 0 1 6 6M15 7a2 2 0 0 1 2 2" stroke="#fff"/>'),
  settings: s('<circle cx="12" cy="12" r="3" stroke="#fff"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z" stroke="#fff"/>'),
  demo: s('<rect x="3" y="5" width="18" height="14" rx="2" stroke="#fff"/><path d="M10 9l5 3-5 3z" fill="#fff" stroke="#fff"/>'),
  banditcam: s('<circle cx="12" cy="12" r="9" fill="#e0353f" stroke="#fff"/><circle cx="12" cy="12" r="4" fill="#fff" stroke="none"/>'),
  power: s('<path d="M12 3v9" stroke="#fff"/><path d="M6.3 7a8 8 0 1 0 11.4 0" stroke="#fff"/>'),
  speaker: s('<path d="M4 9h4l5-4v14l-5-4H4z" fill="#fff" stroke="#fff"/><path d="M16 9a4 4 0 0 1 0 6M18.5 6.5a8 8 0 0 1 0 11" stroke="#fff"/>'),
  mute: s('<path d="M4 9h4l5-4v14l-5-4H4z" fill="#fff" stroke="#fff"/><path d="M17 9l5 6M22 9l-5 6" stroke="#fff"/>'),
  mic: s('<rect x="9" y="3" width="6" height="11" rx="3" fill="#fff" stroke="#fff"/><path d="M5 11a7 7 0 0 0 14 0M12 18v3" stroke="#fff"/>'),
  remotedesk: s('<rect x="3" y="4" width="18" height="12" rx="1" stroke="#fff"/><path d="M8 20h8M12 16v4" stroke="#fff"/><path d="M7 8l-2 2 2 2M17 8l2 2-2 2M13 7l-2 6" stroke="#fff"/>'),
};

export const APP_COLORS = {
  scamazon: '#f39a1f', giftcards: '#f0a23a', browser: '#5fb35a', creditcard: '#139a8c',
  camera: '#111', script: '#1e88e5', phone: '#0c8a2e', settings: '#5b6b7f', demo: '#8b3fd6', banditcam: '#333', remotedesk: '#7b3fe4',
};
