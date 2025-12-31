import React, { useMemo, useEffect, useState } from 'react';

const NewYearAnimation: React.FC = () => {
  const colors = ['#FFD700', '#E5E4E2', '#FFFFFF']; // gold, silver, white

  const items = useMemo(() => {
    return Array.from({ length: 5 }).map((_, i) => ({
      id: i,
      left: Math.random() * 98,
      size: 6 + Math.random() * 4,           // small particles
      duration: 22 + Math.random() * 15,     // very slow
      delay: Math.random() * 12,
      color: colors[i % colors.length],
      drift: Math.random() * 40 - 20
    }));
  }, []);

  // 🎯 Countdown logic
  const [timeLeft, setTimeLeft] = useState('');

  useEffect(() => {
    const target = new Date('2026-01-01T00:00:00');

    const timer = setInterval(() => {
      const now = new Date();
      const diff = target.getTime() - now.getTime();

      if (diff <= 0) {
        setTimeLeft('Happy New Year 🎆');
        clearInterval(timer);
        return;
      }

      const h = Math.floor(diff / (1000 * 60 * 60));
      const m = Math.floor((diff / (1000 * 60)) % 60);
      const s = Math.floor((diff / 1000) % 60);

      setTimeLeft(`2026 in ${h.toString().padStart(2, '0')}:${m
        .toString()
        .padStart(2, '0')}:${s.toString().padStart(2, '0')}`);
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  return (
    <>
      {/* Confetti */}
      <div className="fixed inset-0 pointer-events-none z-[60] overflow-hidden">
        <style>{`
          @keyframes confetti-fall {
            0% {
              top: -10%;
              opacity: 0;
              transform: translateX(0) rotate(0deg);
            }
            15% { opacity: 0.8; }
            100% {
              top: 110%;
              opacity: 0.3;
              transform: translateX(var(--drift)) rotate(180deg);
            }
          }
        `}</style>

        {items.map((item) => (
          <span
            key={item.id}
            className="absolute rounded-sm"
            style={{
              left: `${item.left}%`,
              width: `${item.size}px`,
              height: `${item.size}px`,
              backgroundColor: item.color,
              animation: `confetti-fall ${item.duration}s linear ${item.delay}s infinite`,
              '--drift': `${item.drift}px`
            } as React.CSSProperties}
          />
        ))}
      </div>

      {/* Small countdown badge 
      <div className="fixed bottom-4 right-4 z-[61] pointer-events-none">
        <div className="backdrop-blur-md bg-black/40 text-white text-sm px-3 py-1.5 rounded-full shadow-md">
          {timeLeft}
        </div>
      </div>*/}
    </>
  );
};

export default NewYearAnimation;
