import React from "react";
import { AnimatePresence, motion } from "framer-motion";

/**
 * Modal com física de mola, no espírito do Vaul/Sonner (Emil Kowalski):
 * timing curto, easing de mola (não linear), leve escala de entrada.
 * Uso:
 *   <PremiumDialog open={open} onClose={() => setOpen(false)}>
 *     ...conteúdo...
 *   </PremiumDialog>
 */
export default function PremiumDialog({
  open,
  onClose,
  children,
  maxWidth = "max-w-md",
}: {
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
  maxWidth?: string;
}) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[1000] flex items-center justify-center p-4 bg-black/70"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18 }}
          onClick={onClose}
        >
          <motion.div
            className={`gm-modal w-full ${maxWidth} rounded-lg p-6 shadow-lg`}
            initial={{ opacity: 0, scale: 0.96, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.97, y: 4 }}
            transition={{ type: "spring", stiffness: 420, damping: 32, mass: 0.9 }}
            onClick={(e) => e.stopPropagation()}
          >
            {children}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
