const backgroundSrc = `${import.meta.env.BASE_URL}images/background.jpg`;

type LandingScreenProps = {
  arCapable: boolean;
  onStartAr: () => void;
  onStartDemo: () => void;
};

export function LandingScreen({
  arCapable,
  onStartAr,
  onStartDemo,
}: LandingScreenProps) {
  return (
    <div
      className="landing"
      style={{ backgroundImage: `url(${backgroundSrc})` }}
    >
      <div className="landing-veil" aria-hidden="true" />

      <div className="landing-panel">
        <h1>Callum&apos;s Chill Relaxing ASMR Fox Shooting Simulator</h1>
        <p>
          {arCapable
            ? "Place an animal on the floor, shoot, and explode it."
            : "Try the 3D demo here, or open this page on a phone for AR."}
        </p>

        <div className="landing-actions">
          {arCapable ? (
            <button
              type="button"
              className="button button--start"
              onClick={onStartAr}
            >
              Start AR
            </button>
          ) : null}

          <button
            type="button"
            className="button button--link"
            onClick={onStartDemo}
          >
            Try desktop demo
          </button>
        </div>
      </div>
    </div>
  );
}
