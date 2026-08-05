'use client';

import Link from 'next/link';
import Image from 'next/image';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';

const item = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0 },
};

export function MarketingHero() {
  return (
    <motion.div
      initial="hidden"
      animate="show"
      transition={{ staggerChildren: 0.1, delayChildren: 0.05 }}
      className="flex flex-col items-center text-center"
    >
      <motion.div variants={item} transition={{ type: 'spring', stiffness: 300, damping: 24 }} className="mb-6">
        <Image src="/icons/icon-192.png" alt="Tote" width={80} height={80} className="mx-auto rounded-3xl" priority />
      </motion.div>
      <motion.h1
        variants={item}
        className="mb-3 text-3xl font-semibold tracking-tight"
        style={{ color: 'var(--text)' }}
      >
        Tote
      </motion.h1>
      <motion.p
        variants={item}
        className="mb-8 max-w-xs text-base"
        style={{ color: 'var(--text-muted)' }}
      >
        Your grocery lists, one per store.
      </motion.p>
      <motion.div variants={item}>
        <Link href="/sign-in">
          <Button
            size="lg"
            className="rounded-full px-8 font-medium transition-transform hover:scale-[1.03] active:scale-95"
            style={{ backgroundColor: 'var(--accent)', color: '#fff' }}
          >
            Get started
          </Button>
        </Link>
      </motion.div>
    </motion.div>
  );
}
