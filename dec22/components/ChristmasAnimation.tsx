
import React, { useMemo } from 'react';

const ChristmasAnimation: React.FC = () => {
  const symbols = ['❄️', '🎄', '🎅', '🎁', '🔔', '⛄', '🌟', '🍪', '🦌', '🕯️'];

  // Generate stable random values for the 10 items
  const items = useMemo(() => {
    return Array.from({ length: 10 }).map((_, i) => ({
      id: i,
      symbol: symbols[i % symbols.length],
      left: Math.floor(Math.random() * 95), // 0% to 95% width
      duration: 8 + Math.random() * 12,     // 8s to 20s fall time
      delay: Math.random() * 10,            // 0s to 10s start delay
      size: 1.5 + Math.random(),            // 1.5rem to 2.5rem size
      rotationDir: Math.random() > 0.5 ? 1 : -1 // Rotate left or right
    }));
  }, []);

  return (
    <div className="fixed inset-0 pointer-events-none z-[60] overflow-hidden" aria-hidden="true">
       <style>{`
         @keyframes christmas-fall {
           0% { 
             top: -10%; 
             transform: translateX(0px) rotate(0deg); 
             opacity: 0;
           }
           10% {
             opacity: 1;
           }
           100% { 
             top: 110%; 
             transform: translateX(50px) rotate(360deg); 
             opacity: 0.5;
           }
         }
       `}</style>
       {items.map((item) => (
         <div
           key={item.id}
           className="absolute top-[-10%]"
           style={{
             left: `${item.left}%`,
             fontSize: `${item.size}rem`,
             animationName: 'christmas-fall',
             animationDuration: `${item.duration}s`,
             animationDelay: `${item.delay}s`,
             animationTimingFunction: 'linear',
             animationIterationCount: 'infinite',
             // Add a slight horizontal sway direction based on rotation
             transform: `scale(${item.rotationDir})` 
           }}
         >
           {item.symbol}
         </div>
       ))}
    </div>
  );
};

export default ChristmasAnimation;
