import React from 'react';

const Footer: React.FC = () => {
  return (
    <footer
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        gap: 16,
        padding: '8px 0 0',
        color: 'var(--nd-text-secondary)',
        fontFamily: '"Space Mono", "JetBrains Mono", monospace',
        fontSize: 11,
        fontWeight: 700,
        letterSpacing: '0.08em',
        textTransform: 'uppercase',
      }}
    >
      <span>MingJie Data Governance Console</span>
      <span>Build for Asset Classification</span>
    </footer>
  );
};

export default Footer;
