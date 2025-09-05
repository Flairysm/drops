import { useEffect, useRef } from 'react';

interface PackCarouselProps {
  className?: string;
}

export function PokeballCarousel({ className = "" }: PackCarouselProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // Auto-rotate the carousel
    let rotation = 0;
    const rotate = () => {
      rotation += 0.5;
      container.style.transform = `rotateY(${rotation}deg)`;
      requestAnimationFrame(rotate);
    };
    rotate();

    // Handle mouse movement for interactive rotation
    const handleMouseMove = (e: MouseEvent) => {
      const rect = container.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;
      
      const deltaX = e.clientX - centerX;
      const deltaY = e.clientY - centerY;
      
      const rotateX = (deltaY / rect.height) * 20;
      const rotateY = (deltaX / rect.width) * 20;
      
      container.style.transform = `rotateY(${rotation}deg) rotateX(${rotateX}deg) rotateY(${rotateY}deg)`;
    };

    document.addEventListener('mousemove', handleMouseMove);
    
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
    };
  }, []);

  return (
    <div className={`pack-carousel-container ${className}`}>
      <div 
        ref={containerRef}
        className="pack-carousel"
        style={{
          transformStyle: 'preserve-3d',
          perspective: '1000px',
          transition: 'transform 0.1s ease-out'
        }}
      >
        {/* Master Ball Pack */}
        <div 
          className="pack masterball-pack"
          style={{
            transform: 'rotateY(0deg) translateZ(200px)',
          }}
        >
          <img 
            src="/assets/packs/masterball-pack.png" 
            alt="Master Ball Pack"
            className="pack-image"
            onError={(e) => {
              // Fallback to a placeholder if image fails to load
              const target = e.target as HTMLImageElement;
              target.style.display = 'none';
              target.parentElement!.innerHTML = '<div class="pack-fallback masterball-fallback">M</div>';
            }}
          />
          <div className="pack-glow masterball-glow"></div>
        </div>

        {/* Ultra Ball Pack */}
        <div 
          className="pack ultraball-pack"
          style={{
            transform: 'rotateY(90deg) translateZ(200px)',
          }}
        >
          <img 
            src="/assets/packs/ultraball-pack.png" 
            alt="Ultra Ball Pack"
            className="pack-image"
            onError={(e) => {
              const target = e.target as HTMLImageElement;
              target.style.display = 'none';
              target.parentElement!.innerHTML = '<div class="pack-fallback ultraball-fallback">U</div>';
            }}
          />
          <div className="pack-glow ultraball-glow"></div>
        </div>

        {/* Great Ball Pack */}
        <div 
          className="pack greatball-pack"
          style={{
            transform: 'rotateY(180deg) translateZ(200px)',
          }}
        >
          <img 
            src="/assets/packs/greatball-pack.png" 
            alt="Great Ball Pack"
            className="pack-image"
            onError={(e) => {
              const target = e.target as HTMLImageElement;
              target.style.display = 'none';
              target.parentElement!.innerHTML = '<div class="pack-fallback greatball-fallback">G</div>';
            }}
          />
          <div className="pack-glow greatball-glow"></div>
        </div>

        {/* Poké Ball Pack */}
        <div 
          className="pack pokeball-pack"
          style={{
            transform: 'rotateY(270deg) translateZ(200px)',
          }}
        >
          <img 
            src="/assets/packs/pokeball-pack.png" 
            alt="Poké Ball Pack"
            className="pack-image"
            onError={(e) => {
              const target = e.target as HTMLImageElement;
              target.style.display = 'none';
              target.parentElement!.innerHTML = '<div class="pack-fallback pokeball-fallback">P</div>';
            }}
          />
          <div className="pack-glow pokeball-glow"></div>
        </div>
      </div>
    </div>
  );
}
