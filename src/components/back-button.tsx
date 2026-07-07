'use client';

import { ArrowLeft } from 'lucide-react';
import { motion } from 'framer-motion';

interface BackButtonProps {
  label: string;
  onClick: () => void;
}

export function BackButton({ label, onClick }: BackButtonProps) {
  return (
    <motion.button
      onClick={onClick}
      whileHover={{ x: -2 }}
      transition={{ type: 'spring', stiffness: 400, damping: 25 }}
      className="inline-flex items-center gap-1.5 text-sm text-muted-foreground
                 hover:text-foreground transition-colors px-3 py-1.5 -ml-3
                 rounded-lg hover:bg-muted/50"
    >
      <ArrowLeft className="size-3.5" />
      Back to {label}
    </motion.button>
  );
}
