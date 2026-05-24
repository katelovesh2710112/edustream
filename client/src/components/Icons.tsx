import React from 'react';

// Common SVG Props for our premium system
export interface IconProps extends React.SVGProps<SVGSVGElement> {
  size?: number | string;
  color?: string;
  glow?: boolean;
}

// 1. Wallet / Cash Transfer Icon (Replacing 💸)
export const TransferIcon: React.FC<IconProps> = ({ size = 20, color = 'var(--cyan-accent)', glow = false, className = '', ...props }) => {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={`svg-icon-hover ${glow ? 'svg-glow-cyan' : ''} ${className}`}
      style={{
        transition: 'transform 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275), filter 0.3s ease',
        cursor: 'pointer',
        ...props.style
      }}
      {...props}
    >
      <rect x="2" y="5" width="20" height="14" rx="2" ry="2" />
      <line x1="2" y1="10" x2="22" y2="10" />
      <path d="M6 14h.01M10 14h2" />
      <path d="M18 10v4" style={{ animation: 'pulse 1.5s infinite ease-in-out' }} />
    </svg>
  );
};

// 2. Gold / Vault Sponsor Icon (Replacing 💰)
export const SponsorIcon: React.FC<IconProps> = ({ size = 20, color = 'var(--gold-accent)', glow = false, className = '', ...props }) => {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={`svg-icon-hover ${glow ? 'svg-glow-gold' : ''} ${className}`}
      style={{
        transition: 'transform 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
        ...props.style
      }}
      {...props}
    >
      <circle cx="12" cy="12" r="10" />
      <path d="M12 6v12M15 9H10.5a2.5 2.5 0 0 0 0 5H14a2.5 2.5 0 0 1 0 5H9" />
      <path d="M17 5l1.5-1.5M7 19l-1.5 1.5M19 19l1.5 1.5M5 5L3.5 3.5" style={{ opacity: 0.6, animation: 'pulse 2s infinite alternate' }} />
    </svg>
  );
};

// 3. Launch / Rocket Icon (Replacing 🚀)
export const RocketIcon: React.FC<IconProps> = ({ size = 20, color = 'var(--cyan-accent)', glow = false, className = '', ...props }) => {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={`svg-icon-hover ${glow ? 'svg-glow-cyan' : ''} ${className}`}
      style={{
        transition: 'transform 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
        ...props.style
      }}
      {...props}
    >
      <path d="M4.5 16.5c-1.5 1.25-2.5 3.5-2.5 3.5s2.25-1 3.5-2.5M12 2C6.5 2 2 6.5 2 12c0 2.2 1 4.3 2.5 5.8l6.7-6.7c-.5-.7-.5-1.7.2-2.4.7-.7 1.7-.7 2.4-.2l6.7-6.7C18.3 3 16.2 2 12 2z" />
      <path d="M19 5l2.5-2.5" />
      <path d="M9 15l-3 3v2l3-3z" />
      <path d="M15 9l3-3v-2l-3 3z" />
      <circle cx="12" cy="7" r="1" fill={color} />
    </svg>
  );
};

// 4. Help / Question Icon (Replacing ❓)
export const HelpIcon: React.FC<IconProps> = ({ size = 16, color = 'var(--cyan-accent)', glow = false, className = '', ...props }) => {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={`svg-icon-hover ${className}`}
      style={{
        display: 'inline-block',
        verticalAlign: 'middle',
        transition: 'transform 0.2s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
        ...props.style
      }}
      {...props}
    >
      <circle cx="12" cy="12" r="10" strokeOpacity="0.4" />
      <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
      <line x1="12" y1="17" x2="12.01" y2="17" strokeWidth="3" />
    </svg>
  );
};

// 5. Diploma / Graduation Icon (Replacing 🎓)
export const DiplomaIcon: React.FC<IconProps> = ({ size = 24, color = 'var(--gold-accent)', glow = false, className = '', ...props }) => {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={`svg-icon-hover ${glow ? 'svg-glow-gold' : ''} ${className}`}
      style={{
        transition: 'transform 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
        ...props.style
      }}
      {...props}
    >
      <path d="M22 10v6M2 10l10-5 10 5-10 5z" />
      <path d="M6 12v5c0 2 2 3 6 3s6-1 6-3v-5" />
      <path d="M22 10v6c0 1-1.5 2-3 2" style={{ strokeDasharray: '3 3' }} />
    </svg>
  );
};

// 6. Energy / Flash / Lightning Sponsor Icon (Replacing ⚡)
export const FlashIcon: React.FC<IconProps> = ({ size = 18, color = 'var(--gold-accent)', glow = false, className = '', ...props }) => {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={`svg-icon-hover ${glow ? 'svg-glow-gold' : ''} ${className}`}
      style={{
        transition: 'transform 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
        ...props.style
      }}
      {...props}
    >
      <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
    </svg>
  );
};

// 7. Scroll Document / Empty State Icon (Replacing 📜)
export const ScrollIcon: React.FC<IconProps> = ({ size = 32, color = 'var(--text-muted)', glow = false, className = '', ...props }) => {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={`svg-icon-hover ${className}`}
      style={{
        transition: 'transform 0.3s ease',
        ...props.style
      }}
      {...props}
    >
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
      <line x1="16" y1="13" x2="8" y2="13" strokeOpacity="0.5" />
      <line x1="16" y1="17" x2="8" y2="17" strokeOpacity="0.5" />
      <polyline points="10 9 9 9 8 9" strokeOpacity="0.5" />
    </svg>
  );
};

// 8. Teacher Shield Command Icon (Replacing 🛡️)
export const ShieldIcon: React.FC<IconProps> = ({ size = 20, color = 'var(--gold-accent)', glow = false, className = '', ...props }) => {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={`svg-icon-hover ${glow ? 'svg-glow-gold' : ''} ${className}`}
      style={{
        transition: 'transform 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
        ...props.style
      }}
      {...props}
    >
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    </svg>
  );
};

// 9. Idea / Bulb / Info Icon (Replacing 💡)
export const BulbIcon: React.FC<IconProps> = ({ size = 16, color = 'var(--text-muted)', glow = false, className = '', ...props }) => {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={`svg-icon-hover ${className}`}
      style={{
        display: 'inline-block',
        verticalAlign: 'middle',
        transition: 'transform 0.2s ease',
        ...props.style
      }}
      {...props}
    >
      <path d="M15 14c.2-1 .7-1.7 1.5-2.5 1-.9 1.5-2.2 1.5-3.5A5 5 0 0 0 8 8c0 1.3.5 2.6 1.5 3.5.8.8 1.3 1.5 1.5 2.5" />
      <line x1="9" y1="18" x2="15" y2="18" />
      <line x1="10" y1="22" x2="14" y2="22" />
    </svg>
  );
};

// 10. Award / Trophy / Success Star Icon (Replacing 🏆 or success checks)
export const TrophyIcon: React.FC<IconProps> = ({ size = 24, color = 'var(--gold-accent)', glow = false, className = '', ...props }) => {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={`svg-icon-hover ${glow ? 'svg-glow-gold' : ''} ${className}`}
      style={{
        transition: 'transform 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
        ...props.style
      }}
      {...props}
    >
      <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6" />
      <path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18" />
      <path d="M4 22h16" />
      <path d="M10 14.66V17c0 .55-.45 1-1 1H4v2h16v-2h-5c-.55 0-1-.45-1-1v-2.34" />
      <path d="M12 2a5 5 0 0 0-5 5v5a5 5 0 0 0 10 0V7a5 5 0 0 0-5-5z" />
    </svg>
  );
};

// 11. Learn / Video Streaming Play Icon (Replacing generic media/play buttons)
export const PlayStreamIcon: React.FC<IconProps> = ({ size = 18, color = 'var(--cyan-accent)', glow = false, className = '', ...props }) => {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={`svg-icon-hover ${glow ? 'svg-glow-cyan' : ''} ${className}`}
      style={{
        transition: 'transform 0.2s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
        ...props.style
      }}
      {...props}
    >
      <polygon points="5 3 19 12 5 21 5 3" />
    </svg>
  );
};

// 12. Clock / Real-Time Streaming Icon (Replacing stopwatch / timer emojis)
export const ClockStreamIcon: React.FC<IconProps> = ({ size = 18, color = 'var(--cyan-accent)', glow = false, className = '', ...props }) => {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={`svg-icon-hover ${glow ? 'svg-glow-cyan' : ''} ${className}`}
      style={{
        transition: 'transform 0.2s ease',
        ...props.style
      }}
      {...props}
    >
      <circle cx="12" cy="12" r="10" />
      <polyline points="12 6 12 12 16 14" />
    </svg>
  );
};

// 13. Student Hat Icon / Tiny (Replacing 🎓 for buttons or labels)
export const MiniDiplomaIcon: React.FC<IconProps> = ({ size = 16, color = 'var(--gold-accent)', glow = false, className = '', ...props }) => {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={`svg-icon-hover ${className}`}
      style={{
        display: 'inline-block',
        verticalAlign: 'middle',
        transition: 'transform 0.25s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
        ...props.style
      }}
      {...props}
    >
      <path d="M22 10v6M2 10l10-5 10 5-10 5z" />
      <path d="M6 12v5c0 2 2 3 6 3s6-1 6-3v-5" />
    </svg>
  );
};
