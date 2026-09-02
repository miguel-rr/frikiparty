/**
 * Backdrop for the bearers' page: no mountain parallax — a treasury
 * chamber's velvet instead. Deep near-black cloth with two scales of
 * woven grain, a faint golden breath falling from above (as if the Ring
 * itself lit the room) and a heavy vignette that pushes every eye to
 * the cards.
 */

const GRAIN_FINE =
  "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='240' height='240'%3E%3Cfilter id='f'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='3' seed='23'/%3E%3CfeColorMatrix type='saturate' values='0'/%3E%3C/filter%3E%3Crect width='240' height='240' filter='url(%23f)' opacity='0.5'/%3E%3C/svg%3E\")";

const GRAIN_CLOTH =
  "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='520' height='520'%3E%3Cfilter id='c'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.014' numOctaves='4' seed='31'/%3E%3CfeColorMatrix type='saturate' values='0'/%3E%3C/filter%3E%3Crect width='520' height='520' filter='url(%23c)' opacity='0.7'/%3E%3C/svg%3E\")";

const TreasuryBackdrop = () => (
  <div aria-hidden="true" className="pointer-events-none fixed inset-0 -z-10">
    {/* Velvet ground */}
    <div
      className="absolute inset-0"
      style={{
        backgroundImage:
          'radial-gradient(120% 90% at 50% 0%, #10150f 0%, #0b0f0a 45%, #070a07 100%)',
      }}
    />
    {/* Cloth mottling, broad scale */}
    <div
      className="absolute inset-0 opacity-25 mix-blend-soft-light"
      style={{ backgroundImage: GRAIN_CLOTH, backgroundSize: '520px 520px' }}
    />
    {/* Fine weave */}
    <div
      className="absolute inset-0 opacity-30 mix-blend-soft-light"
      style={{ backgroundImage: GRAIN_FINE, backgroundSize: '240px 240px' }}
    />
    {/* The Ring's breath: a warm exhalation from above */}
    <div
      className="absolute inset-0"
      style={{
        backgroundImage:
          'radial-gradient(70% 42% at 50% 0%, rgba(201,165,87,0.07) 0%, rgba(201,165,87,0.02) 55%, transparent 78%)',
      }}
    />
    {/* Vignette pressing the corners into shadow */}
    <div className="absolute inset-0 shadow-[inset_0_0_180px_60px_rgba(0,0,0,0.55)]" />
  </div>
);

export { TreasuryBackdrop };
