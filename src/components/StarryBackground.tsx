/**
 * SPDX-License-Identifier: Apache-2.0
 */

import { useMemo } from 'react';

interface Star {
  id: number;
  x: number; // percentage
  y: number; // percentage
  size: number; // px
  color: string;
  delay: string;
  duration: string;
}

export default function StarryBackground() {
  // Memoize stars so they don't regenerate and cause flicker on every render
  const stars = useMemo<Star[]>(() => {
    const starList: Star[] = [];
    const colors = [
      'rgba(255, 255, 255, 0.95)', // White
      'rgba(255, 255, 255, 0.8)',  // White dim
      'rgba(229, 193, 88, 0.9)',   // Gold/yellow
      'rgba(147, 197, 253, 0.9)',  // Blue/cyan
      'rgba(244, 114, 182, 0.8)',  // Pink/magenta
    ];

    for (let i = 0; i < 90; i++) {
      const size = Math.random() < 0.15 ? 2.5 : Math.random() < 0.5 ? 1.5 : 1;
      starList.push({
        id: i,
        x: Math.random() * 100,
        y: Math.random() * 100,
        size,
        color: colors[Math.floor(Math.random() * colors.length)],
        delay: `${(Math.random() * 8).toFixed(2)}s`,
        duration: `${(3 + Math.random() * 6).toFixed(2)}s`,
      });
    }
    return starList;
  }, []);

  return (
    <div className="absolute inset-0 z-0 overflow-hidden select-none pointer-events-none">
      {/* Immersive Deep Cosmic Background Gradient */}
      <div className="absolute inset-0 bg-gradient-to-b from-[#020617] via-[#090d23] to-[#030712]" />

      {/* Pulsing Nebulous Dust Clouds */}
      <div 
        className="absolute -top-[20%] -left-[10%] w-[60%] h-[60%] rounded-full bg-indigo-950/20 blur-[120px] animate-nebula-pulse"
        style={{ animationDelay: '0s' }}
      />
      <div 
        className="absolute -bottom-[10%] -right-[10%] w-[50%] h-[50%] rounded-full bg-purple-950/20 blur-[130px] animate-nebula-pulse"
        style={{ animationDelay: '-10s' }}
      />
      <div 
        className="absolute top-[40%] left-[30%] w-[40%] h-[40%] rounded-full bg-amber-950/10 blur-[110px] animate-nebula-pulse"
        style={{ animationDelay: '-5s' }}
      />

      {/* Twinkling Stars */}
      {stars.map((star) => (
        <div
          key={star.id}
          className="absolute rounded-full animate-twinkle"
          style={{
            left: `${star.x}%`,
            top: `${star.y}%`,
            width: `${star.size}px`,
            height: `${star.size}px`,
            backgroundColor: star.color,
            boxShadow: star.size > 2 ? `0 0 8px ${star.color}` : 'none',
            '--twinkle-duration': star.duration,
            animationDelay: star.delay,
          } as any}
        />
      ))}

      {/* Shooting Stars cascading in different timings */}
      <div className="shooting-star" style={{ top: '15%', right: '-10%', animationDelay: '2s' }} />
      <div className="shooting-star" style={{ top: '40%', right: '-15%', animationDelay: '7s' }} />
      <div className="shooting-star" style={{ top: '65%', right: '-5%', animationDelay: '12s' }} />
    </div>
  );
}
