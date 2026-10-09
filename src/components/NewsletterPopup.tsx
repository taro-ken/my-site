import { motion, AnimatePresence } from 'framer-motion';
import { useState, useEffect } from 'react';

export default function NewsletterPopup() {
    const [isOpen, setIsOpen] = useState(false);

    useEffect(() => {
        // Listen for a custom event from the Astro page to open the modal
        const handleOpenModal = () => setIsOpen(true);
        window.addEventListener('open-newsletter-modal', handleOpenModal);

        // Check URL parameters or path on mount
        const params = new URLSearchParams(window.location.search);
        if (params.get('newsletter') === 'true' || window.location.pathname === '/letter') {
            setIsOpen(true);
        }

        return () => {
            window.removeEventListener('open-newsletter-modal', handleOpenModal);
        };
    }, []);

    useEffect(() => {
        if (isOpen) {
            // Prevent scrolling when modal is open
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = 'unset';
        }
    }, [isOpen]);

    return (
        <AnimatePresence>
            {isOpen && (
                <div
                    className="fixed inset-0 z-[100] flex items-center justify-center p-4"
                >
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={() => setIsOpen(false)}
                        className="absolute inset-0 bg-black/80 backdrop-blur-sm"
                    />

                    {/* Modal Content */}
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: 10 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 10 }}
                        transition={{ type: "spring", damping: 25, stiffness: 300 }}
                        className="relative w-full max-w-xl bg-zinc-950 border border-zinc-800 rounded-lg shadow-2xl overflow-hidden pt-8 pb-4 px-8 flex flex-col items-center"
                    >
                        {/* Close Button */}
                        <button
                            onClick={() => setIsOpen(false)}
                            className="absolute top-4 right-4 text-zinc-500 hover:text-white p-2 transition-colors z-[110]"
                            aria-label="Close modal"
                        >
                            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>

                        <div className="w-full">
                            <h2 className="text-2xl font-black mb-1 text-center text-white">最新情報を購読</h2>
                            <p className="text-zinc-400 text-xs mb-1 text-center leading-relaxed">
                                よりシンプルに、より本質的な視点を。<br />最新の記事やプロジェクトのアップデートをお届けします。
                            </p>

                            <iframe
                                src="https://kentarokk.substack.com/embed"
                                title="ニュースレターを購読"
                                className="block w-full h-[150px] mt-4 border-0 bg-transparent"
                                scrolling="no"
                            />
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
}
