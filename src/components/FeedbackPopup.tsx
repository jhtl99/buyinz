import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ExternalLink, Clock } from 'lucide-react';

const INITIAL_DELAY_MS = 10_000;
const SNOOZE_DELAY_MS = 60_000;
const FEEDBACK_URL = 'https://forms.gle/cZUsH2AKMbEqETbP9';

export function FeedbackPopup() {
  const [visible, setVisible] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout>>();

  const schedulePopup = useCallback((delay: number) => {
    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => setVisible(true), delay);
  }, []);

  useEffect(() => {
    schedulePopup(INITIAL_DELAY_MS);
    return () => clearTimeout(timerRef.current);
  }, [schedulePopup]);

  const handleSnooze = () => {
    setVisible(false);
    schedulePopup(SNOOZE_DELAY_MS);
  };

  const handleClose = () => {
    setVisible(false);
    setDismissed(true);
  };

  if (dismissed) return null;

  return (
    <AnimatePresence>
      {visible && (
        <>
          <motion.div
            className="fixed inset-0 bg-background/70 backdrop-blur-sm z-[60]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={handleClose}
          />
          <motion.div
            className="fixed inset-0 z-[60] flex items-center justify-center p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              className="relative w-full max-w-sm bg-card rounded-3xl overflow-hidden shadow-lg"
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-[var(--space-md)] space-y-[var(--space-sm)]">
                <div className="flex items-start justify-between">
                  <div>
                    <h2 className="text-[length:var(--text-price-sm)] font-bold text-foreground">
                      We'd love your feedback
                    </h2>
                    <p className="text-sm text-muted-foreground mt-1">
                      How's your experience so far?
                    </p>
                  </div>
                  <button
                    onClick={handleClose}
                    className="p-1.5 rounded-full bg-secondary hover:bg-secondary/80 transition-colors -mt-1 -mr-1"
                  >
                    <X className="w-4 h-4 text-muted-foreground" />
                  </button>
                </div>

                <div className="flex flex-col gap-2">
                  <a
                    href={FEEDBACK_URL}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={handleClose}
                    className="flex items-center justify-center gap-2 w-full py-3 rounded-2xl text-sm font-semibold bg-primary text-primary-foreground shadow-glow hover:opacity-90 transition-opacity"
                  >
                    <ExternalLink className="w-4 h-4" />
                    Take the Survey
                  </a>

                  <button
                    onClick={handleSnooze}
                    className="flex items-center justify-center gap-2 w-full py-2.5 rounded-2xl text-sm font-medium text-muted-foreground hover:bg-secondary/60 transition-colors"
                  >
                    <Clock className="w-3.5 h-3.5" />
                    Ask me in 1 minute
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
