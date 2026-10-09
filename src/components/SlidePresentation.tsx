import { motion } from 'framer-motion';
import type { PanInfo } from 'framer-motion';
import { useState, useEffect, useRef } from 'react';
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

const FADE_MS = 300;

const wrap = (index: number) => (index + slides.length) % slides.length;

export default function SlidePresentation() {
    const [currentSlide, setCurrentSlide] = useState(0);
    // フェード中、新しいスライドの下に不透明のまま残す直前のスライド
    const [previousSlide, setPreviousSlide] = useState<number | null>(null);
    const fadeTimer = useRef<number | undefined>(undefined);

    const showSlide = (index: number) => {
        if (index === currentSlide) return;
        setPreviousSlide(currentSlide);
        setCurrentSlide(index);
        window.clearTimeout(fadeTimer.current);
        fadeTimer.current = window.setTimeout(() => setPreviousSlide(null), FADE_MS);
    };

    const nextSlide = () => showSlide(wrap(currentSlide + 1));
    const prevSlide = () => showSlide(wrap(currentSlide - 1));
    const goToSlide = (index: number) => showSlide(index);

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

    useEffect(() => () => window.clearTimeout(fadeTimer.current), []);

    // 前後のスライドも常に DOM に置き、切り替え時に画像の読み込み・デコードが起きないようにする
    const mounted = new Set([wrap(currentSlide - 1), currentSlide, wrap(currentSlide + 1)]);
    if (previousSlide !== null) mounted.add(previousSlide);

    return (
        <div className="slide-container">
            <motion.div
                drag="x"
                dragConstraints={{ left: 0, right: 0 }}
                dragElastic={0.2}
                onDragEnd={handleDragEnd}
                className="slide-track"
            >
                {[...mounted].map((index) => {
                    const state =
                        index === currentSlide ? 'is-current' : index === previousSlide ? 'is-previous' : '';
                    return (
                        <div key={slides[index].id} className={`slide ${state}`}>
                            <img
                                src={slides[index].image}
                                alt={slides[index].alt}
                                className="slide-image"
                                loading="eager"
                                draggable={false}
                            />
                        </div>
                    );
                })}
            </motion.div>

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
