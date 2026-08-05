export function CinematicBackground() {
  return (
    <div className="cinematic-background" aria-hidden="true">
      <video
        className="cinematic-background__video"
        autoPlay
        muted
        loop
        playsInline
        preload="metadata"
        poster="/media/zerion-x1-poster.jpg"
      >
        <source src="/media/zerion-x1-loop.webm" type="video/webm" />
        <source src="/media/zerion-x1-loop.mp4" type="video/mp4" />
      </video>

      <div className="cinematic-background__fallback" />
      <div className="cinematic-background__overlay" />
      <div className="cinematic-background__grain" />
    </div>
  );
}
