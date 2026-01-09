import React, { useState, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { Button, ButtonProps } from './button';

interface Sparkle {
  id: number;
  x: number;
  y: number;
  color: string;
  size: number;
  rotation: number;
}

const SPARKLE_COLORS = [
  'hsl(350, 100%, 88%)', // Pink
  'hsl(30, 100%, 88%)',  // Orange
  'hsl(60, 100%, 88%)',  // Yellow
  'hsl(120, 100%, 88%)', // Green
  'hsl(200, 100%, 88%)', // Blue
  'hsl(280, 100%, 88%)', // Purple
];

export interface SparkleButtonProps extends ButtonProps {
  sparkleCount?: number;
  rainbow?: boolean;
}

export const SparkleButton = React.forwardRef<HTMLButtonElement, SparkleButtonProps>(
  ({ className, children, onClick, sparkleCount = 12, rainbow = false, ...props }, ref) => {
    const [sparkles, setSparkles] = useState<Sparkle[]>([]);
    const idCounter = useRef(0);

    const createSparkles = useCallback((e: React.MouseEvent<HTMLButtonElement>) => {
      const rect = e.currentTarget.getBoundingClientRect();
      const centerX = rect.width / 2;
      const centerY = rect.height / 2;

      const newSparkles: Sparkle[] = Array.from({ length: sparkleCount }, () => {
        const angle = Math.random() * Math.PI * 2;
        const distance = 30 + Math.random() * 40;
        
        return {
          id: idCounter.current++,
          x: centerX + Math.cos(angle) * distance,
          y: centerY + Math.sin(angle) * distance,
          color: SPARKLE_COLORS[Math.floor(Math.random() * SPARKLE_COLORS.length)],
          size: 4 + Math.random() * 6,
          rotation: Math.random() * 360,
        };
      });

      setSparkles(newSparkles);

      // Clear sparkles after animation
      setTimeout(() => setSparkles([]), 600);
    }, [sparkleCount]);

    const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
      createSparkles(e);
      onClick?.(e);
    };

    return (
      <Button
        ref={ref}
        className={cn(
          'relative overflow-visible',
          rainbow && 'btn-rainbow text-foreground font-semibold border-0',
          className
        )}
        onClick={handleClick}
        {...props}
      >
        <span className="relative z-10">{children}</span>
        
        <AnimatePresence>
          {sparkles.map((sparkle) => (
            <motion.span
              key={sparkle.id}
              className="pointer-events-none absolute"
              initial={{
                opacity: 1,
                scale: 0,
                x: '50%',
                y: '50%',
              }}
              animate={{
                opacity: 0,
                scale: 1.5,
                x: sparkle.x,
                y: sparkle.y,
                rotate: sparkle.rotation,
              }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.6, ease: 'easeOut' }}
              style={{
                left: 0,
                top: 0,
                width: sparkle.size,
                height: sparkle.size,
              }}
            >
              <svg
                viewBox="0 0 24 24"
                fill={sparkle.color}
                className="w-full h-full"
              >
                <path d="M12 0L14.59 9.41L24 12L14.59 14.59L12 24L9.41 14.59L0 12L9.41 9.41L12 0Z" />
              </svg>
            </motion.span>
          ))}
        </AnimatePresence>
      </Button>
    );
  }
);

SparkleButton.displayName = 'SparkleButton';
