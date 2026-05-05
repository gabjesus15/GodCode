export function AnimatedLogo() {
  return (
    <>
      <span
        style={{
          fontFamily: 'Nevis, sans-serif',
          fontSize: '2rem',
          fontWeight: 'bold',
          letterSpacing: '-2px',
          color: 'var(--logo-color, #6d28d9)',
          transition: 'color 0.2s',
        }}
        className="logo-godcode"
      >
        GodCode
      </span>
      <div
        style={{
          fontFamily: 'Aleo-Light, sans-serif',
          fontSize: '1rem',
          color: 'var(--slogan-color, #888)',
          marginTop: '-8px',
          minHeight: '24px',
          transition: 'color 0.2s',
        }}
        className="logo-slogan"
      >
        Tu visión, nuestro código.
      </div>
      <style>{`
        .logo-godcode {
          color: #6d28d9;
        }
        .logo-slogan {
          color: #888;
        }
        @media (prefers-color-scheme: dark) {
          .logo-godcode {
            color: #7c3aed;
          }
          .logo-slogan {
            color: #888;
          }
        }
        @media (prefers-color-scheme: light) {
          .logo-godcode {
            color: #6d28d9;
          }
          .logo-slogan {
            color: #444;
          }
        }
      `}</style>
    </>
  );
}
