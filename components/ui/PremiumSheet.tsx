import React from "react";
import { AnimatePresence, motion } from "framer-motion";

/**
 * Bottom sheet arrastável (estilo Vaul) para mobile — arraste pra baixo
 * pra fechar. Em telas grandes, o app já mostra os modais centralizados
 * (use PremiumDialog nesse caso); este componente é focado na experiência
 * mobile do seu app auto-adaptável.
 * Uso:
 *   <PremiumSheet open={open} onClose={() => setOpen(false)}>
 *     ...conteúdo...
 *   </PremiumSheet>
 */
export default function PremiumSheet({
  open,
  onClose,
  children,
}: {
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[1000] bg-black/70"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18 }}
          onClick={onClose}
        >
          <motion.div
            className="gm-modal absolute bottom-0 left-0 right-0 rounded-t-lg rounded-b-none pt-3 pb-[env(safe-area-inset-bottom,16px)] px-5 max-h-[85vh] overflow-y-auto"
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", stiffness: 380, damping: 34, mass: 0.9 }}
            drag="y"
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={{ top: 0, bottom: 0.5 }}
            onDragEnd={(_, info) => {
              if (info.offset.y > 120 || info.velocity.y > 500) onClose();
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Alça de arrastar */}
            <div className="w-9 h-1.5 rounded-full bg-white/20 mx-auto mb-4" />
            {children}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
