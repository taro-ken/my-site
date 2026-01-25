import { motion, AnimatePresence } from 'framer-motion';
import type { PanInfo } from 'framer-motion';
import { useState, useEffect } from 'react';
import './SlidePresentation.css';

interface Slide {
    id: number;
    image: string;
    alt: string;
}

// Generate slides array from 1.png to 22.png in public/slides folder
const slides: Slide[] = Array.from({ length: 22 }, (_, i) => ({
    id: i + 1,
    image: `/slides/${i + 1}.png`,
    alt: `Slide ${i + 1}`,
}));

export default function SlidePresentation() {
    const [currentSlide, setCurrentSlide] = useState(0);
    const [direction, setDirection] = useState(0);

    const slideVariants = {
        enter: (direction: number) => ({
            opacity: 0,
        }),
        center: {
            opacity: 1,
        },
        exit: (direction: number) => ({
            opacity: 0,
        }),
    };

    const nextSlide = () => {
        setDirection(1);
        setCurrentSlide((prev) => (prev + 1) % slides.length);
    };

    const prevSlide = () => {
        setDirection(-1);
        setCurrentSlide((prev) => (prev - 1 + slides.length) % slides.length);
    };

    const goToSlide = (index: number) => {
        setDirection(index > currentSlide ? 1 : -1);
        setCurrentSlide(index);
    };

    // Handle drag end for swipe detection
    const handleDragEnd = (event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
        const swipeThreshold = 50;

        if (info.offset.x > swipeThreshold) {
            // Swiped right - go to previous slide
            prevSlide();
        } else if (info.offset.x < -swipeThreshold) {
            // Swiped left - go to next slide
            nextSlide();
        }
    };

    // Preload only next and previous slides for better performance
    useEffect(() => {
        const preloadImages = () => {
            const imagesToPreload = [];

            // Preload next slide
            const nextIndex = (currentSlide + 1) % slides.length;
            imagesToPreload.push(slides[nextIndex].image);

            // Preload previous slide
            const prevIndex = (currentSlide - 1 + slides.length) % slides.length;
            imagesToPreload.push(slides[prevIndex].image);

            imagesToPreload.forEach((src) => {
                const img = new Image();
                img.src = src;
            });
        };

        preloadImages();
    }, [currentSlide]);

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'ArrowRight') {
                nextSlide();
            } else if (e.key === 'ArrowLeft') {
                prevSlide();
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [currentSlide]);

    return (
        <div className="slide-container">
            <AnimatePresence initial={false} custom={direction} mode="wait">
                <motion.div
                    key={currentSlide}
                    custom={direction}
                    variants={slideVariants}
                    initial="enter"
                    animate="center"
                    exit="exit"
                    transition={{
                        duration: 0.3,
                        ease: "easeInOut",
                    }}
                    drag="x"
                    dragConstraints={{ left: 0, right: 0 }}
                    dragElastic={0.2}
                    onDragEnd={handleDragEnd}
                    className="slide"
                >
                    <img
                        src={slides[currentSlide].image}
                        alt={slides[currentSlide].alt}
                        className="slide-image"
                        loading="eager"
                        draggable={false}
                    />
                </motion.div>
            </AnimatePresence>

            {/* Navigation Buttons */}
            <button
                onClick={prevSlide}
                className="nav-button nav-button-left"
                aria-label="Previous slide"
            >
                <svg
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                    strokeWidth={2.5}
                    stroke="currentColor"
                    className="nav-icon"
                >
                    <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M15.75 19.5L8.25 12l7.5-7.5"
                    />
                </svg>
            </button>

            <button
                onClick={nextSlide}
                className="nav-button nav-button-right"
                aria-label="Next slide"
            >
                <svg
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                    strokeWidth={2.5}
                    stroke="currentColor"
                    className="nav-icon"
                >
                    <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M8.25 4.5l7.5 7.5-7.5 7.5"
                    />
                </svg>
            </button>

            {/* Slide Indicators */}
            <div className="slide-indicators">
                {slides.map((_, index) => (
                    <button
                        key={index}
                        onClick={() => goToSlide(index)}
                        className={`indicator ${index === currentSlide ? 'indicator-active' : ''}`}
                        aria-label={`Go to slide ${index + 1}`}
                    />
                ))}
            </div>

            {/* Keyboard Hint */}
            <div className="keyboard-hint">
                <span className="hint-text">← → キーで操作できます</span>
            </div>
        </div>
    );
}
