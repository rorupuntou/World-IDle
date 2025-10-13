import { useLanguage } from "@/contexts/LanguageContext";
import { motion } from "framer-motion";
import { XMarkIcon } from '@heroicons/react/24/outline';
import { Requirement, Effect, Autoclicker } from './types';

interface ItemDetailsModalProps {
    item: {
        id?: number;
        name: string;
        desc?: string;
        req?: Requirement;
        effect?: Effect[];
    };
    autoclickers: Autoclicker[];
    onClose: () => void;
    onPurchase?: (id: number) => void;
    isPurchasable?: boolean;
}

function formatRequirement(req: Requirement, autoclickers: Autoclicker[], t: (key: string, replacements?: { [key: string]: string | number }) => string): string[] {
    const requirements: string[] = [];
    if (req.totalTokensEarned) requirements.push(t('item_details.req_total_tokens', { amount: req.totalTokensEarned.toLocaleString() }));
    if (req.totalClicks) requirements.push(t('item_details.req_total_clicks', { amount: req.totalClicks.toLocaleString() }));
    if (req.tps) requirements.push(t('item_details.req_tps', { amount: req.tps.toLocaleString() }));
    if (req.eachAutoclickerAmount) requirements.push(t('item_details.req_each_autoclicker', { amount: req.eachAutoclickerAmount }));
    if (req.autoclickers) {
        const autoReqs = Array.isArray(req.autoclickers) ? req.autoclickers : [req.autoclickers];
        autoReqs.forEach(r => {
            const auto = autoclickers.find(a => a.id === r.id);
            requirements.push(t('item_details.req_autoclicker_amount', { amount: r.amount, name: auto ? t(auto.name) : `ID ${r.id}` }));
        });
    }
    if (req.verified) requirements.push(t('item_details.req_verified'));
    return requirements;
}

function formatEffect(effects: Effect[], autoclickers: Autoclicker[], t: (key: string, replacements?: { [key: string]: string | number }) => string): string[] {
    return effects.map(e => {
        switch (e.type) {
            case 'multiplyClick': return t('item_details.eff_multiply_click', { value: e.value });
            case 'addClick': return t('item_details.eff_add_click', { value: e.value });
            case 'multiplyGlobal': return t('item_details.eff_multiply_global', { value: e.value });
            case 'multiplyAutoclicker': {
                const auto = autoclickers.find(a => a.id === e.targetId);
                return t('item_details.eff_multiply_autoclicker', { name: auto ? t(auto.name) : `ID ${e.targetId}`, value: e.value });
            }
            case 'addCpSToClick': return t('item_details.eff_add_cps_to_click', { percent: e.percent * 100 });
            case 'addCpSToAutoclickerFromOthers': {
                const auto = autoclickers.find(a => a.id === e.targetId);
                return t('item_details.eff_add_cps_from_others', { name: auto ? t(auto.name) : `ID ${e.targetId}` });
            }
            case 'multiplyAutoclickerByOtherCount': {
                const target = autoclickers.find(a => a.id === e.targetId);
                const source = autoclickers.find(a => a.id === e.sourceId);
                return t('item_details.eff_multiply_by_other', { target: target ? t(target.name) : `ID ${e.targetId}`, source: source ? t(source.name) : `ID ${e.sourceId}` });
            }
            case 'addTps': return t('item_details.eff_add_tps', { value: e.value });
            default: return t('item_details.eff_unknown');
        }
    });
}

export default function ItemDetailsModal({ item, autoclickers, onClose, onPurchase, isPurchasable }: ItemDetailsModalProps) {
    const { t } = useLanguage();
    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
            onClick={onClose}
        >
            <motion.div
                initial={{ scale: 0.9, y: 20 }}
                animate={{ scale: 1, y: 0 }}
                exit={{ scale: 0.9, y: 20 }}
                className="bg-slate-800 border border-slate-700 rounded-xl p-6 w-full max-w-md text-white"
                onClick={e => e.stopPropagation()}
            >
                <div className="flex justify-between items-start">
                    <h2 className="text-2xl font-bold mb-4 text-cyan-400">{item.name}</h2>
                    <button onClick={onClose} className="p-1 -m-1 text-slate-400 hover:text-white rounded-full">
                        <XMarkIcon className="w-6 h-6" />
                    </button>
                </div>
                {item.desc && <p className="text-slate-400 italic mb-4">{item.desc}</p>}
                
                {item.req && (
                    <div className="mb-4">
                        <h3 className="font-bold mb-1 text-slate-200">{t('requirements')}</h3>
                        <ul className="list-disc list-inside text-slate-300 space-y-2">
                            {formatRequirement(item.req, autoclickers, t).map((r, i) => <li key={i}>{r}</li>)}
                        </ul>
                    </div>
                )}

                {item.effect && item.effect.length > 0 && (
                    <div className="mb-4">
                        <h3 className="font-bold mb-1 text-lime-300">{t('effect')}</h3>
                        <ul className="list-disc list-inside text-lime-400 space-y-2">
                            {formatEffect(item.effect, autoclickers, t).map((e, i) => <li key={i}>{e}</li>)}
                        </ul>
                    </div>
                )}

                {isPurchasable && onPurchase && item.id !== undefined && (
                    <button 
                        onClick={() => onPurchase(item.id!)}
                        className="w-full mt-4 bg-cyan-500/80 hover:bg-cyan-500 text-white font-bold py-2 px-4 rounded-lg"
                    >
                        {t('buy')}
                    </button>
                )}
            </motion.div>
        </motion.div>
    );
}
