'use client';

import React, { useState, useEffect, useCallback, useImperativeHandle, forwardRef } from 'react';

export interface FloatingParticlesRef {
  triggerBurst: (x?: number, y?: number, emojis?: string[]) => void;
}

interface Particle {
  id: number;
  emoji: string;
  x: number;
  y: number;
  size: number;
}

const DEFAULT_EMOJIS = ['💖', '✨', '💕', '🦔', '🌟', '💫', '🎉'];

const FloatingParticles = forwardRef<FloatingParticlesRef, {}>((props, ref) => {
  const [particles, setParticles] = useState<Particle[]>([]);

  const triggerBurst = useCallback((x = window.innerWidth / 2, y = window.innerHeight - 100, emojis = DEFAULT_EMOJIS) => {
    const newParticles: Particle[] = [];
    const count = 10;

    for (let i = 0; i < count; i++) {
      const offsetX = (Math.random() - 0.5) * 160;
      const offsetY = (Math.random() - 0.2) * 40;
      const randomEmoji = emojis[Math.floor(Math.random() * emojis.length)];
      
      newParticles.push({
        id: Date.now() + i + Math.random(),
        emoji: randomEmoji,
        x: x + offsetX,
        y: y + offsetY,
        size: Math.floor(Math.random() * 16) + 18,
      });
    }

    setParticles((prev) => [...prev, ...newParticles]);

    // Clean up particles after float animation completes
    setTimeout(() => {
      setParticles((prev) => prev.filter((p) => !newParticles.some((np) => np.id === p.id)));
    }, 2500);
  }, []);

  useImperativeHandle(ref, () => ({
    triggerBurst,
  }));

  return (
    <div className="fixed inset-0 pointer-events-none z-50 overflow-hidden">
      {particles.map((p) => (
        <div
          key={p.id}
          className="floating-particle select-none"
          style={{
            left: `${p.x}px`,
            top: `${p.y}px`,
            fontSize: `${p.size}px`,
          }}
        >
          {p.emoji}
        </div>
      ))}
    </div>
  );
});

FloatingParticles.displayName = 'FloatingParticles';
export default FloatingParticles;
