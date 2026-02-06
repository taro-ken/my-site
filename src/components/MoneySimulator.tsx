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
    icon: React.ElementType;
    description: string;
    subtext: string;
}

const CATEGORIES: CategoryData[] = [
    {
        key: 'growth',
        label: '投資・成長',
        percentage: 25,
        color: '#10b981', // emerald-500
        icon: TrendingUp,
        description: '将来の自分への投資。新NISAやスキル習得に活用。',
        subtext: '',
    },
    {
        key: 'stability',
        label: '安定・貯蓄',
        percentage: 15,
        color: '#3b82f6', // blue-500
        icon: ShieldCheck,
        description: '心の平穏のための防波堤。まずは生活費5ヶ月分を目指す。',
        subtext: '',
    },
    {
        key: 'essentials',
        label: '生活必需・固定費',
        percentage: 50,
        color: '#64748b', // slate-500
        icon: Home,
        description: '見栄ではなく機能。家賃や交通費の見直しを。',
        subtext: '',
    },
    {
        key: 'rewards',
        label: '娯楽・浪費',
        percentage: 10,
        color: '#f43f5e', // rose-500
        icon: Coffee,
        description: '持続可能な節約のための戦略的支出。経験に投資。',
        subtext: '',
    },
];

// --- Simple Donut Chart Component ---
const DonutChart = ({
    data,
    total,
}: {
    data: { color: string; value: number }[];
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

        // SVG path command for a slice
        const pathData = [
            `M 0 0`,
            `L ${startX} ${startY}`,
            `A 1 1 0 ${largeArcFlag} 1 ${endX} ${endY}`,
            `Z`,
        ].join(' ');

        return <path d={pathData} fill={slice.color} key={index} />;
    });

    return (
        <div className="relative w-48 h-48 md:w-64 md:h-64">
            <svg
                viewBox="-1 -1 2 2"
                className="transform -rotate-90 w-full h-full"
            >
                {slices}
                {/* Inner circle to make it a donut */}
                <circle cx="0" cy="0" r="0.6" fill="currentColor" className="text-white transition-colors" />
            </svg>
            {/* Center text */}
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <span className="text-xs text-gray-400 font-medium tracking-wider">合計</span>
            </div>
        </div>
    );
};


// --- Accordion Component ---
const RecommendationAccordion = ({
    title,
    items,
    buttonColorClass = "text-blue-600 hover:text-blue-800"
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
                className={cn("inline-flex items-center text-xs font-semibold transition-colors focus:outline-none", buttonColorClass)}
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
                <div className="flex flex-col gap-2 items-end">
                    {items.map((item, idx) => (
                        <a
                            key={idx}
                            href={item.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs text-gray-600 hover:text-gray-900 transition-colors flex items-center"
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

    return (
        <div className="w-full max-w-4xl mx-auto p-4 md:p-8 space-y-8 bg-white text-gray-800 min-h-[50vh] rounded-3xl shadow-sm">

            {/* Header Section */}
            <div className="text-center space-y-4">
                <h1
                    className="font-extrabold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-gray-700 to-gray-900 whitespace-nowrap"
                    style={{
                        fontSize: 'clamp(1.5rem, 5vw, 2.25rem)'
                    }}
                >
                    25-15-50-10の法則
                </h1>
                <p className="text-sm md:text-base text-gray-500 max-w-lg mx-auto">
                    手取り収入を入力して、理想的な資産配分をシミュレーション。
                    <br />
                    富裕層の規律をあなたの家計に。
                </p>
            </div>

            {/* Input Section */}
            <div className="flex flex-col items-center justify-center space-y-2">
                <label htmlFor="income" className="text-xs font-semibold text-gray-400 uppercase tracking-widest">
                    手取り月収
                </label>
                <div className="flex items-center gap-1">
                    <input
                        id="income"
                        type="text"
                        inputMode="numeric"
                        value={incomeStr}
                        onChange={handleIncomeChange}
                        placeholder="200,000"
                        className="w-48 text-center text-3xl font-bold bg-transparent border-b-2 border-gray-200 focus:border-black outline-none py-2 transition-colors placeholder:text-gray-200"
                    />
                    <span className="text-gray-400 font-light text-sm pb-2">円</span>
                </div>
            </div>

            {/* Visualization Section */}
            <div className="flex flex-col md:flex-row items-center justify-center gap-12 py-8">
                <DonutChart
                    total={100} // Percentages always sum to 100
                    data={CATEGORIES.map(c => ({ color: c.color, value: c.percentage }))}
                />

                {/* Legend / Summary */}
                <div className="grid grid-cols-2 gap-4 md:gap-8">
                    {calculatedValues.map((cat) => {
                        const formattedAmount = formatCurrency(cat.amount);
                        const getLegendFontSize = (length: number) => {
                            if (length > 15) return 'text-sm';
                            if (length > 10) return 'text-base';
                            return 'text-xl md:text-2xl';
                        };

                        return (
                            <div key={cat.key} className="flex flex-col">
                                <div className="flex items-center gap-2 mb-1">
                                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: cat.color }} />
                                    <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">{cat.label}</span>
                                </div>
                                <span className={`${getLegendFontSize(formattedAmount.length)} font-bold tabular-nums`}>
                                    {formattedAmount}
                                </span>
                                <span className="text-xs text-gray-400">{cat.percentage}%</span>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Detailed Cards Section - Stacked Vertically */}
            <div className="flex flex-col gap-4">
                {calculatedValues.map((cat) => {
                    const formattedAmount = formatCurrency(cat.amount);
                    // Dynamic font size based on length
                    const getAmountSize = (length: number) => {
                        if (length > 13) return 'text-sm'; // Very long numbers
                        if (length > 10) return 'text-base'; // Long numbers
                        return 'text-xl'; // Standard
                    };
                    const amountSize = getAmountSize(formattedAmount.length);

                    return (
                        <div
                            key={cat.key}
                            className="relative overflow-hidden group p-4 md:p-6 rounded-2xl border border-gray-100 bg-gray-50 hover:bg-white transition-all duration-300 hover:shadow-lg hover:-translate-y-1 w-full"
                        >
                            <div className="flex flex-col md:flex-row items-start justify-between gap-4 md:gap-0">

                                {/* Icon & Label */}
                                <div className="flex flex-col gap-2 w-full md:w-auto md:min-w-[30%]">
                                    <div className="flex items-center gap-2">
                                        <div className={cn("p-2 rounded-lg bg-white shadow-sm", `text-[${cat.color}]`)} style={{ color: cat.color }}>
                                            <cat.icon size={20} />
                                        </div>
                                        <span className="text-xs font-medium px-2 py-1 rounded-full bg-gray-200 text-gray-600">
                                            {cat.percentage}%
                                        </span>
                                    </div>
                                    <h3
                                        className="font-bold mt-2 text-gray-900 whitespace-nowrap transition-all"
                                        style={{
                                            fontSize: cat.label.length > 7
                                                ? 'clamp(12px, 2vw, 16px)'
                                                : cat.label.length > 5
                                                    ? 'clamp(14px, 2.5vw, 18px)'
                                                    : 'clamp(16px, 3vw, 20px)'
                                        }}
                                    >
                                        {cat.label}
                                    </h3>
                                </div>

                                {/* Amount & Description */}
                                <div className="flex flex-col items-start md:items-end text-left md:text-right flex-1 gap-2 w-full overflow-hidden">
                                    <span className={cn("font-bold tabular-nums text-gray-900 whitespace-nowrap transition-all", amountSize)}>
                                        {formattedAmount}
                                    </span>
                                    <p className="text-xs text-gray-600 leading-relaxed max-w-full md:max-w-sm break-words">
                                        {cat.description}
                                    </p>
                                </div>
                            </div>

                            {cat.key === 'stability' && (
                                <div className="mt-4 pt-4 border-t border-gray-200 w-full flex flex-col gap-2">
                                    <p className="flex items-center justify-start md:justify-end gap-2 text-[10px] text-gray-400">
                                        <Info size={12} />
                                        <span>目標: {formatCurrency(Math.round(income * 0.5 * 5))} (生活費5ヶ月分)</span>
                                    </p>
                                    <RecommendationAccordion
                                        title="おすすめの証券口座"
                                        items={[
                                            { label: "SBI証券", url: "https://www.sbisec.co.jp/visitor/" },
                                            { label: "楽天証券", url: "https://ad2.trafficgate.net/t/r/1258/738/312778_390421" },
                                        ]}
                                        buttonColorClass="text-blue-600 hover:text-blue-800"
                                    />
                                </div>
                            )}

                            {cat.key === 'essentials' && (
                                <div className="mt-4 pt-4 border-t border-gray-200 w-full flex flex-col gap-2">
                                    <RecommendationAccordion
                                        title="おすすめのサービス"
                                        items={[
                                            { label: "格安SIM：楽天モバイル", url: "https://ad2.trafficgate.net/t/r/416/4401/312778_390421" },
                                            { label: "ハピタス", url: "https://hapitas.jp/register?i=25697521" },
                                        ]}
                                        buttonColorClass="text-blue-600 hover:text-blue-800"
                                    />
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>

        </div>
    );
}
