import { motion } from 'framer-motion';

export const PageWrapper = ({ children }: { children: React.ReactNode }) => {
    return (
        <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            transition={{
                duration: 0.4,
                ease: [0.4, 0, 0.2, 1] // Native-like ease
            }}
            style={{ width: '100%' }}
        >
            {children}
        </motion.div>
    );
};
