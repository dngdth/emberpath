import { useThemeTransition } from '../../hooks/useThemeTransition';
import { motion } from 'framer-motion';
import { Sun, Moon } from 'lucide-react';

interface SwitchThemeProps {
  className?: string;
}

export function SwitchTheme({ className }: SwitchThemeProps) {
  const { darkMode, toggleWithTransition } = useThemeTransition();

  return (
    <motion.button
      onClick={toggleWithTransition}
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      className={
        className ||
        `flex items-center justify-center p-2 rounded-xl border shadow-sm transition-all focus:outline-none ${
          darkMode
            ? 'border-slate-800 bg-slate-900 text-yellow-400 hover:bg-slate-800'
            : 'border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100'
        }`
      }
      aria-label="Toggle theme"
    >
      <motion.div
        animate={{ rotate: darkMode ? 360 : 0 }}
        transition={{ duration: 0.5, ease: 'easeInOut' }}
        className="flex items-center justify-center"
      >
        {darkMode ? (
          <Sun className="h-5 w-5 fill-yellow-400/10" />
        ) : (
          <Moon className="h-5 w-5 fill-slate-700/10" />
        )}
      </motion.div>
    </motion.button>
  );
}

export default SwitchTheme;
