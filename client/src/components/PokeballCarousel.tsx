import { useEffect, useRef } from 'react';

interface PokeballCarouselProps {
  className?: string;
}

export function PokeballCarousel({ className = "" }: PokeballCarouselProps) {
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
    <div className={`pokeball-carousel-container ${className}`}>
      <div 
        ref={containerRef}
        className="pokeball-carousel"
        style={{
          transformStyle: 'preserve-3d',
          perspective: '1000px',
          transition: 'transform 0.1s ease-out'
        }}
      >
        {/* Master Ball */}
        <div 
          className="pokeball masterball"
          style={{
            transform: 'rotateY(0deg) translateZ(200px)',
            background: 'linear-gradient(135deg, #8B5CF6 0%, #A855F7 50%, #C084FC 100%)',
            boxShadow: '0 0 30px rgba(139, 92, 246, 0.6), inset 0 0 20px rgba(255, 255, 255, 0.2)'
          }}
        >
          <div className="pokeball-top">
            <div className="pokeball-button" style={{ background: 'linear-gradient(135deg, #F59E0B, #FCD34D)' }}></div>
          </div>
          <div className="pokeball-bottom" style={{ background: 'linear-gradient(135deg, #1F2937, #374151)' }}>
            <div className="pokeball-center-ring" style={{ background: 'linear-gradient(135deg, #8B5CF6, #A855F7)' }}></div>
          </div>
          <div className="pokeball-glow" style={{ background: 'radial-gradient(circle, rgba(139, 92, 246, 0.3) 0%, transparent 70%)' }}></div>
        </div>

        {/* Ultra Ball */}
        <div 
          className="pokeball ultraball"
          style={{
            transform: 'rotateY(90deg) translateZ(200px)',
            background: 'linear-gradient(135deg, #1E40AF 0%, #3B82F6 50%, #60A5FA 100%)',
            boxShadow: '0 0 30px rgba(59, 130, 246, 0.6), inset 0 0 20px rgba(255, 255, 255, 0.2)'
          }}
        >
          <div className="pokeball-top">
            <div className="pokeball-button" style={{ background: 'linear-gradient(135deg, #F59E0B, #FCD34D)' }}></div>
          </div>
          <div className="pokeball-bottom" style={{ background: 'linear-gradient(135deg, #1F2937, #374151)' }}>
            <div className="pokeball-center-ring" style={{ background: 'linear-gradient(135deg, #1E40AF, #3B82F6)' }}></div>
          </div>
          <div className="pokeball-glow" style={{ background: 'radial-gradient(circle, rgba(59, 130, 246, 0.3) 0%, transparent 70%)' }}></div>
        </div>

        {/* Great Ball */}
        <div 
          className="pokeball greatball"
          style={{
            transform: 'rotateY(180deg) translateZ(200px)',
            background: 'linear-gradient(135deg, #DC2626 0%, #EF4444 50%, #F87171 100%)',
            boxShadow: '0 0 30px rgba(239, 68, 68, 0.6), inset 0 0 20px rgba(255, 255, 255, 0.2)'
          }}
        >
          <div className="pokeball-top">
            <div className="pokeball-button" style={{ background: 'linear-gradient(135deg, #F59E0B, #FCD34D)' }}></div>
          </div>
          <div className="pokeball-bottom" style={{ background: 'linear-gradient(135deg, #1F2937, #374151)' }}>
            <div className="pokeball-center-ring" style={{ background: 'linear-gradient(135deg, #DC2626, #EF4444)' }}></div>
          </div>
          <div className="pokeball-glow" style={{ background: 'radial-gradient(circle, rgba(239, 68, 68, 0.3) 0%, transparent 70%)' }}></div>
        </div>

        {/* Poké Ball */}
        <div 
          className="pokeball pokeball-classic"
          style={{
            transform: 'rotateY(270deg) translateZ(200px)',
            background: 'linear-gradient(135deg, #EF4444 0%, #F87171 50%, #FCA5A5 100%)',
            boxShadow: '0 0 30px rgba(239, 68, 68, 0.6), inset 0 0 20px rgba(255, 255, 255, 0.2)'
          }}
        >
          <div className="pokeball-top">
            <div className="pokeball-button" style={{ background: 'linear-gradient(135deg, #F59E0B, #FCD34D)' }}></div>
          </div>
          <div className="pokeball-bottom" style={{ background: 'linear-gradient(135deg, #1F2937, #374151)' }}>
            <div className="pokeball-center-ring" style={{ background: 'linear-gradient(135deg, #EF4444, #F87171)' }}></div>
          </div>
          <div className="pokeball-glow" style={{ background: 'radial-gradient(circle, rgba(239, 68, 68, 0.3) 0%, transparent 70%)' }}></div>
        </div>
      </div>
    </div>
  );
}
