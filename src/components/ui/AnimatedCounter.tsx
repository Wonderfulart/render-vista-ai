import React, { useEffect, useRef, useState } from 'react';
import { motion, useSpring, useTransform } from 'framer-motion';
import { cn } from '@/lib/utils';

interface AnimatedCounterProps {
  value: number;
  prefix?: string;
  suffix?: string;
  decimals?: number;
  className?: string;
  duration?: number;
}

export function AnimatedCounter({
  value,
  prefix = '',
  suffix = '',
  decimals = 2,
  className,
  duration = 0.5,
}: AnimatedCounterProps) {
  const spring = useSpring(value, { damping: 30, stiffness: 100, duration });
  const display = useTransform(spring, (current) =>
    current.toFixed(decimals)
  );
  const [displayValue, setDisplayValue] = useState(value.toFixed(decimals));

  useEffect(() => {
    spring.set(value);
  }, [spring, value]);

  useEffect(() => {
    return display.on('change', (latest) => {
      setDisplayValue(latest);
    });
  }, [display]);

  return (
    <motion.span
      className={cn('tabular-nums', className)}
      key={value}
      initial={{ opacity: 0.8, y: 5 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
    >
      {prefix}
      {displayValue}
      {suffix}
    </motion.span>
  );
}
