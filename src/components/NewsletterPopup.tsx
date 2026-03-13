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

            // Inject the Kit script into the container
            const container = document.getElementById('kit-form-container');
            if (container && !container.querySelector('script')) {
                const script = document.createElement('script');
                script.async = true;
                script.dataset.uid = "62545307c6";
                script.src = "https://kentaro.kit.com/62545307c6/index.js";
                container.appendChild(script);
            }
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

                            {/* Kit Form Placeholder/Target */}
                            <div id="kit-form-container" className="flex items-center justify-center bg-zinc-900/5 rounded-md">
                                {/* Kit script will inject form here */}
                            </div>
                        </div>

                        <style dangerouslySetInnerHTML={{
                            __html: `
              /* Custom styles for Kit form to match your theme */
              #kit-form-container iframe {
                width: 100% !important;
                border: none !important;
              }
              .formkit-powered-by-convertkit-container {
                display: none !important;
              }
              /* Ensure the Kit form's own modal styles don't conflict or appear */
              .formkit-modal {
                position: static !important;
                display: block !important;
                opacity: 1 !important;
                visibility: visible !important;
                background: transparent !important;
                padding: 0 !important;
                box-shadow: none !important;
              }
            ` }} />
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
}
