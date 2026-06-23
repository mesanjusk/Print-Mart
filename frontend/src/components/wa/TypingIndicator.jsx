import '../../styles/whatsapp-theme.css';

export default function TypingIndicator() {
  return (
    <div className="wa-fade-up" style={{ display: 'flex', justifyContent: 'flex-start', marginBottom: 8 }}>
      <div style={{
        background: '#1F2C34',
        borderRadius: '0 12px 12px 12px',
        padding: '11px 15px',
        boxShadow: '0 1px 2px rgba(0,0,0,0.4)',
        display: 'flex',
        gap: 5,
        alignItems: 'center',
      }}>
        <span className="wa-dot" />
        <span className="wa-dot" />
        <span className="wa-dot" />
      </div>
    </div>
  );
}
