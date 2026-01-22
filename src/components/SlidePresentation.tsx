import { motion, AnimatePresence } from 'framer-motion';
import { useState, useEffect } from 'react';
import './SlidePresentation.css';

interface Slide {
    id: number;
    image: string;
    alt: string;
}

const slides: Slide[] = [
    {
        id: 1,
        image: '/slides/slide_image_1_1769038596461.png',
        alt: 'Abstract geometric shapes with purple and pink gradient',
    },
    {
        id: 2,
        image: '/slides/slide_image_2_1769038612387.png',
        alt: 'Flowing waves pattern with blue and cyan gradient',
    },
    {
        id: 3,
        image: '/slides/slide_image_3_1769038631905.png',
        alt: 'Organic shapes with green and emerald gradient',
    },
    {
        id: 4,
        image: '/slides/slide_image_4_1769038653733.png',
        alt: 'Circular patterns with orange and amber gradient',
    },
    {
        id: 5,
        image: '/slides/slide_image_5_1769038667843.png',
        alt: 'Dynamic lines with indigo and purple gradient',
    },
];

export default function SlidePresentation() {
    const [currentSlide, setCurrentSlide] = useState(0);
    const [direction, setDirection] = useState(0);
    const [touchStart, setTouchStart] = useState(0);
    const [touchEnd, setTouchEnd] = useState(0);

    const slideVariants = {
        enter: (direction: number) => ({
            opacity: 0,
            scale: 0.95,
            x: direction > 0 ? 50 : -50,
        }),
        center: {
            opacity: 1,
            scale: 1,
            x: 0,
        },
        exit: (direction: number) => ({
            opacity: 0,
            scale: 0.95,
            x: direction < 0 ? 50 : -50,
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

    // Minimum swipe distance (in px)
    const minSwipeDistance = 50;

    const onTouchStart = (e: React.TouchEvent) => {
        setTouchEnd(0); // Reset touch end
        setTouchStart(e.targetTouches[0].clientX);
    };

    const onTouchMove = (e: React.TouchEvent) => {
        setTouchEnd(e.targetTouches[0].clientX);
    };

    const onTouchEnd = () => {
        if (!touchStart || !touchEnd) return;

        const distance = touchStart - touchEnd;
        const isLeftSwipe = distance > minSwipeDistance;
        const isRightSwipe = distance < -minSwipeDistance;

        if (isLeftSwipe) {
            nextSlide();
        } else if (isRightSwipe) {
            prevSlide();
        }
    };

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
        <div
            className="slide-container"
            onTouchStart={onTouchStart}
            onTouchMove={onTouchMove}
            onTouchEnd={onTouchEnd}
        >
            <AnimatePresence initial={false} custom={direction} mode="wait">
                <motion.div
                    key={currentSlide}
                    custom={direction}
                    variants={slideVariants}
                    initial="enter"
                    animate="center"
                    exit="exit"
                    transition={{
                        opacity: { duration: 0.5 },
                        scale: { duration: 0.5 },
                        x: { duration: 0.5 },
                    }}
                    className="slide"
                >
                    <img
                        src={slides[currentSlide].image}
                        alt={slides[currentSlide].alt}
                        className="slide-image"
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
