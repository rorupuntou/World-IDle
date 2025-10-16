"use client";

import Image from 'next/image';

export default function TelegramButton() {
    const telegramLink = "https://t.me/worldidlecommunity";

    return (
        <div className="fixed top-4 right-4 z-50">
            <a href={telegramLink} target="_blank" rel="noopener noreferrer">
                <button 
                    className="bg-slate-500/20 hover:bg-slate-500/40 text-white font-bold py-2 px-4 rounded-lg"
                >
                    <Image src="/telegram.svg" alt="Telegram" width={24} height={24} />
                </button>
            </a>
        </div>
    );
}
