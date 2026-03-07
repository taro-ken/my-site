import React, { useState, useMemo } from 'react';
import { TrendingUp, ShieldCheck, Home, Coffee, Info } from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

// --- Utils ---
function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

// --- Types ---
type CategoryKey = 'growth' | 'stability' | 'essentials' | 'rewards';

interface CategoryData {
    key: CategoryKey;
    label: string;
    percentage: number;
    color: string;
    gradientId?: string;
    icon: React.ElementType;
    description: string;
}

const CATEGORIES: CategoryData[] = [
    {
        key: 'growth',
        label: '投資・成長',
        percentage: 25,
        color: '#D4AF37', // Gold
        gradientId: 'goldGradient',
        icon: TrendingUp,
        description: '将来の自分への投資。新NISAやスキル習得に活用。',
    },
    {
        key: 'stability',
        label: '安定・貯蓄',
        percentage: 15,
        color: '#B8860B', // Dark Gold
        icon: ShieldCheck,
        description: '心の平穏のための防波堤。生活費5ヶ月分が目安。',
    },
    {
        key: 'essentials',
        label: '生活必需・固定費',
        percentage: 50,
        color: '#27272a', // zinc-800
        icon: Home,
        description: '見栄ではなく機能。家賃や通信費等の固定費を。',
    },
    {
        key: 'rewards',
        label: '娯楽・浪費',
        percentage: 10,
        color: '#18181b', // zinc-900
        icon: Coffee,
        description: '持続可能な節約のための、戦略的な自己投資。',
    },
];

// --- Gold Gradient Donut Chart Component ---
const DonutChart = ({
    data,
    total,
}: {
    data: { color: string; value: number; gradientId?: string }[];
    total: number;
}) => {
    let cumulativePercent = 0;

    const getCoordinatesForPercent = (percent: number) => {
        const x = Math.cos(2 * Math.PI * percent);
        const y = Math.sin(2 * Math.PI * percent);
        return [x, y];
    };

    const slices = data.map((slice, index) => {
        const startPercent = cumulativePercent;
        const slicePercent = slice.value / total;
        cumulativePercent += slicePercent;
        const endPercent = cumulativePercent;

        const [startX, startY] = getCoordinatesForPercent(startPercent);
        const [endX, endY] = getCoordinatesForPercent(endPercent);

        const largeArcFlag = slicePercent > 0.5 ? 1 : 0;

        const pathData = [
            `M 0 0`,
            `L ${startX} ${startY}`,
            `A 1 1 0 ${largeArcFlag} 1 ${endX} ${endY}`,
            `Z`,
        ].join(' ');

        return (
            <path
                d={pathData}
                fill={slice.gradientId ? `url(#${slice.gradientId})` : slice.color}
                key={index}
                stroke="#000"
                strokeWidth="0.01"
                className="transition-all duration-1000"
            />
        );
    });

    return (
        <div className="relative w-48 h-48 md:w-64 md:h-64 flex items-center justify-center flex-shrink-0">
            <svg
                viewBox="-1.1 -1.1 2.2 2.2"
                className="transform -rotate-90 w-full h-full"
            >
                <defs>
                    <linearGradient id="goldGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor="#BF953F" />
                        <stop offset="25%" stopColor="#FCF6BA" />
                        <stop offset="50%" stopColor="#B38728" />
                        <stop offset="75%" stopColor="#FBF5B7" />
                        <stop offset="100%" stopColor="#AA771C" />
                    </linearGradient>
                </defs>
                {slices}
                <circle cx="0" cy="0" r="0.75" fill="#000000" />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <span className="text-xs text-white font-bold tracking-[0.4em] uppercase opacity-90">Rule</span>
            </div>
        </div>
    );
};

// --- Accordion Component ---
const RecommendationAccordion = ({
    title,
    items,
    buttonColorClass = "text-sky-400 hover:text-sky-200"
}: {
    title: string;
    items: { label: string; url: string }[];
    buttonColorClass?: string;
}) => {
    const [isOpen, setIsOpen] = useState(false);

    return (
        <div className="flex flex-col items-end w-full">
            <button
                onClick={() => setIsOpen(!isOpen)}
                className={cn("inline-flex items-center text-[10px] font-semibold transition-colors focus:outline-none", buttonColorClass)}
            >
                {title}
                <svg
                    className={cn("w-3 h-3 ml-1 transform transition-transform duration-200", isOpen ? "rotate-180" : "")}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    xmlns="http://www.w3.org/2000/svg"
                >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path>
                </svg>
            </button>
            <div
                className={cn(
                    "overflow-hidden transition-all duration-300 ease-in-out w-full",
                    isOpen ? "max-h-40 opacity-100 mt-2" : "max-h-0 opacity-0"
                )}
            >
                <div className="flex flex-col gap-1 items-end">
                    {items.map((item, idx) => (
                        <a
                            key={idx}
                            href={item.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-[10px] text-sky-400 hover:text-sky-200 transition-colors flex items-center"
                        >
                            {item.label}
                            <svg className="w-3 h-3 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"></path></svg>
                        </a>
                    ))}
                </div>
            </div>
        </div>
    );
};


export default function MoneySimulator() {
    const [incomeStr, setIncomeStr] = useState<string>('');

    const income = useMemo(() => {
        return parseInt(incomeStr.replace(/,/g, ''), 10) || 0;
    }, [incomeStr]);

    const calculatedValues = useMemo(() => {
        return CATEGORIES.map((cat) => ({
            ...cat,
            amount: Math.round(income * (cat.percentage / 100)),
        }));
    }, [income]);

    const handleIncomeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const val = e.target.value.replace(/,/g, '');
        if (val === '') {
            setIncomeStr('');
            return;
        }
        const num = parseInt(val, 10);
        if (!isNaN(num)) {
            setIncomeStr(num.toLocaleString());
        }
    };

    const formatCurrency = (val: number) => {
        return val.toLocaleString() + '円';
    };

    // Helper to scale font based on amount string length（改行させずにフォントサイズで調整）
    const getResponsiveFontSize = (str: string, baseSize: string, maxSize: string) => {
        const len = str.length;
        if (len > 12) return 'text-[10px] md:text-xs';
        if (len > 10) return 'text-xs md:text-sm';
        if (len > 8) return 'text-sm md:text-base';
        if (len > 6) return 'text-base md:text-lg';
        return `${baseSize} ${maxSize}`;
    };

    // Monthly Net Income の表示用フォントサイズ
    const getIncomeFontSize = (str: string) => {
        const len = str.length || 1;
        if (len > 15) return 'text-xl md:text-2xl'; // More aggressive scaling
        if (len > 12) return 'text-2xl md:text-3xl';
        if (len > 10) return 'text-3xl md:text-5xl';
        if (len > 8) return 'text-4xl md:text-6xl';
        if (len > 6) return 'text-5xl md:text-7xl';
        return 'text-5xl md:text-8xl';
    };

    const getIncomeUnitFontSize = (str: string) => {
        const len = str.length || 1;
        if (len > 12) return 'text-[10px] md:text-xs mb-1 md:mb-2';
        return 'text-lg md:text-2xl';
    };

    return (
        <div className="w-full max-w-5xl mx-auto px-6 py-4 md:p-16 space-y-16 md:space-y-24 bg-black min-h-screen selection:bg-[#BF953F] selection:text-black" style={{ color: '#ffffff' }}>

            {/* Header Section */}
            <div className="text-center space-y-6 md:space-y-8 pt-8 md:pt-12">
                <div className="flex flex-col items-center gap-2">
                    <h2 className="text-[#BF953F] tracking-[0.6em] text-xs md:text-sm font-black uppercase">The Golden Rule</h2>
                    <div className="w-12 h-[1px] bg-[#BF953F]/30" />
                    <h2 className="text-[#BF953F] tracking-[0.4em] text-xs font-medium uppercase mt-1">Of Asset Allocation</h2>
                </div>

                <div className="space-y-3 md:space-y-4">
                    <h1 className="text-2xl md:text-7xl font-black tracking-tighter leading-[1.1]" style={{ color: '#ffffff' }}>
                        The Golden Rule
                    </h1>
                    <p className="max-w-xl mx-auto font-medium leading-relaxed opacity-90 px-4 md:px-0" style={{ color: '#ffffff', fontSize: '11px' }}>
                        安定した資産形成と経済的自由を実現するポートフォリオ戦略。 時代を超えて機能するシミュレーター。
                    </p>
                </div>
            </div>

            {/* Input Section */}
            <div className="flex flex-col items-center justify-center space-y-6 md:space-y-8">
                <div className="flex flex-col items-center gap-2">
                    <label htmlFor="income" className="text-[10px] font-bold uppercase tracking-[0.5em]" style={{ color: '#ffffff' }}>
                        Monthly Net Income
                    </label>
                    <span className="text-[10px] font-medium" style={{ color: '#ffffff' }}>手取り月収を入力</span>
                </div>

                <div className="flex items-end justify-center w-full max-w-2xl mx-auto gap-2 md:gap-4 group relative px-4">
                    <input
                        id="income"
                        type="text"
                        inputMode="numeric"
                        value={incomeStr}
                        onChange={handleIncomeChange}
                        placeholder="0"
                        className={cn(
                            "w-full text-center font-black bg-black border-b-2 border-zinc-900 focus:border-[#BF953F] outline-none pb-4 transition-all duration-300 placeholder:text-zinc-900 cursor-pointer text-white",
                            getIncomeFontSize(incomeStr || '0')
                        )}
                    />
                    <span
                        className={cn(
                            "pb-5 md:pb-8 text-zinc-700 font-black group-focus-within:text-[#BF953F] transition-colors shrink-0",
                            getIncomeUnitFontSize(incomeStr || '0')
                        )}
                    >
                        JPY
                    </span>
                </div>
            </div>

            {/* Visualization Section */}
            <div className="flex flex-col lg:flex-row items-center justify-center gap-12 md:gap-20 py-8 md:py-16">
                <DonutChart
                    total={100}
                    data={CATEGORIES.map(c => ({ color: c.color, value: c.percentage, gradientId: c.gradientId }))}
                />

                {/* Legend List */}
                <div className="grid grid-cols-2 gap-x-6 gap-y-10 w-full max-w-sm md:max-w-md pt-6 md:pt-0">
                    {calculatedValues.map((cat) => {
                        const amount = formatCurrency(cat.amount);
                        return (
                            <div key={cat.key} className="flex flex-col group min-w-0">
                                <div className="flex items-center gap-2 mb-2">
                                    <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: cat.color }} />
                                    <span className="text-[10px] sm:text-[11px] md:text-xs font-bold text-zinc-300 group-hover:text-white transition-colors">
                                        {cat.label}
                                    </span>
                                </div>
                                <span className={cn(
                                    "font-black text-white tabular-nums transition-all duration-300 whitespace-nowrap mb-1",
                                    getResponsiveFontSize(amount, "text-xl", "md:text-3xl")
                                )}>
                                    {amount}
                                </span>
                                <span className="text-[10px] md:text-xs font-bold text-zinc-500">{cat.percentage}%</span>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Cards Detail Section */}
            <div className="flex flex-col gap-4 md:gap-8 pb-20 w-full px-2 md:px-0">
                {calculatedValues.map((cat) => {
                    const amount = formatCurrency(cat.amount);
                    return (
                        <div
                            key={cat.key}
                            className="relative overflow-hidden p-6 md:p-8 rounded-2xl border border-zinc-800 bg-[#0c0c0c] hover:bg-zinc-900/40 transition-all duration-500 group flex flex-col gap-5 w-full"
                        >
                            <div className="flex items-center justify-between w-full">
                                <div className={cn(
                                    "p-3 rounded-xl border border-zinc-800 bg-black transition-all duration-300",
                                    cat.percentage > 20 ? "border-[#BF953F]/30 text-[#BF953F]" : "text-zinc-500"
                                )}>
                                    <cat.icon size={20} strokeWidth={2} />
                                </div>
                                <span className="bg-zinc-900 text-zinc-400 text-[11px] font-bold px-3 py-1.5 rounded-full tracking-wider">
                                    {cat.percentage}%
                                </span>
                            </div>

                            <div className="space-y-3">
                                <h3 className="text-xl md:text-2xl font-black tracking-widest leading-tight" style={{ color: '#ffffff' }}>
                                    {cat.label}
                                </h3>

                                <p className={cn(
                                    "font-black tabular-nums tracking-tighter transition-all duration-300 pt-2",
                                    getResponsiveFontSize(amount, "text-3xl", "md:text-4xl")
                                )} style={{ color: '#ffffff' }}>
                                    {amount}
                                </p>

                                <p className="text-sm text-zinc-500 leading-relaxed font-medium pt-2">
                                    {cat.description}
                                </p>
                            </div>
                            {/* Action specific sections (Recommendations) */}
                            {cat.key === 'stability' && (
                                <div className="mt-2 pt-4 border-t border-zinc-800 w-full flex flex-col gap-2">
                                    <p className="flex items-center justify-start md:justify-end gap-2 text-[9px] md:text-xs text-zinc-500">
                                        <Info size={12} />
                                        <span>目標: {formatCurrency(Math.round(income * 0.5 * 5))} (生活費5ヶ月分)</span>
                                    </p>
                                    <div className="flex justify-start md:justify-end">
                                        <RecommendationAccordion
                                            title="おすすめの証券口座"
                                            items={[
                                                { label: "SBI証券", url: "https://www.sbisec.co.jp/visitor/" },
                                                { label: "楽天証券", url: "https://ad2.trafficgate.net/t/r/1258/738/312778_390421" },
                                            ]}
                                        />
                                    </div>
                                </div>
                            )}
                            {cat.key === 'essentials' && (
                                <div className="mt-2 pt-4 border-t border-zinc-800 w-full flex flex-col gap-2">
                                    <div className="flex justify-start md:justify-end">
                                        <RecommendationAccordion
                                            title="おすすめのサービス"
                                            items={[
                                                { label: "格安SIM：楽天モバイル", url: "https://ad2.trafficgate.net/t/r/416/4401/312778_390421" },
                                                { label: "ハピタス", url: "https://hapitas.jp/register?i=25697521" },
                                            ]}
                                        />
                                    </div>
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>

            {/* Back Link */}
            <div className="pt-12 text-center pb-12">
                <a href="/" className="group inline-flex flex-col items-center gap-4 text-xs font-bold uppercase tracking-[0.5em] text-zinc-800 hover:text-[#BF953F] transition-all">
                    <div className="w-[1px] h-10 bg-zinc-900 group-hover:bg-[#BF953F] transition-colors mb-2" />
                    <span>Back to Home</span>
                </a>
            </div>

        </div>
    );
}
