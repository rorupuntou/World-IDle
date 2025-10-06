import { motion } from "framer-motion";
import { XMarkIcon } from '@heroicons/react/24/outline';
import { Requirement, Effect, Autoclicker } from './types';

interface ItemDetailsModalProps {
    item: {
        name: string;
        desc?: string;
        req?: Requirement;
        effect?: Effect[];
    };
    autoclickers: Autoclicker[];
    onClose: () => void;
}

function formatRequirement(req: Requirement, autoclickers: Autoclicker[]): string[] {
    const requirements: string[] = [];
    if (req.totalTokensEarned) requirements.push(`Haber ganado un total de ${req.totalTokensEarned.toLocaleString()} $WCLICK.`);
    if (req.totalClicks) requirements.push(`Haber hecho ${req.totalClicks.toLocaleString()} clics.`);
    if (req.tps) requirements.push(`Alcanzar ${req.tps.toLocaleString()} $WCLICK/s.`);
    if (req.eachAutoclickerAmount) requirements.push(`Tener al menos ${req.eachAutoclickerAmount} de cada autoclicker.`);
    if (req.autoclickers) {
        const autoReqs = Array.isArray(req.autoclickers) ? req.autoclickers : [req.autoclickers];
        autoReqs.forEach(r => {
            const auto = autoclickers.find(a => a.id === r.id);
            requirements.push(`Tener ${r.amount} ${auto ? auto.name : `autoclicker con ID ${r.id}`}.`);
        });
    }
    if (req.verified) requirements.push("Estar verificado con World ID.");
    return requirements;
}

function formatEffect(effects: Effect[], autoclickers: Autoclicker[]): string[] {
    return effects.map(e => {
        switch (e.type) {
            case 'multiplyClick': return `Multiplica el valor del clic por ${e.value}.`;
            case 'addClick': return `Añade ${e.value} al valor del clic.`;
            case 'multiplyGlobal': return `Multiplica la producción total por ${e.value}.`;
            case 'multiplyAutoclicker': {
                const auto = autoclickers.find(a => a.id === e.targetId);
                return `Multiplica la producción de ${auto ? auto.name : `autoclicker con ID ${e.targetId}`} por ${e.value}.`;
            }
            case 'addCpSToClick': return `Añade un ${e.percent * 100}% de tu CpS al valor del clic.`;
            case 'addCpSToAutoclickerFromOthers': {
                const auto = autoclickers.find(a => a.id === e.targetId);
                return `Añade producción a ${auto ? auto.name : `autoclicker con ID ${e.targetId}`} basado en otros autoclickers.`;
            }
            case 'multiplyAutoclickerByOtherCount': {
                const target = autoclickers.find(a => a.id === e.targetId);
                const source = autoclickers.find(a => a.id === e.sourceId);
                return `Multiplica la producción de ${target ? target.name : `ID ${e.targetId}`} por cada ${source ? source.name : `ID ${e.sourceId}`}.`;
            }
            case 'addTps': return `Añade ${e.value} a la producción base por segundo.`;
            default: return "Efecto desconocido.";
        }
    });
}

export default function ItemDetailsModal({ item, autoclickers, onClose }: ItemDetailsModalProps) {
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
                    <h2 className="text-2xl font-bold mb-2 text-cyan-400">{item.name}</h2>
                    <button onClick={onClose} className="p-1 -m-1 text-slate-400 hover:text-white rounded-full">
                        <XMarkIcon className="w-6 h-6" />
                    </button>
                </div>
                {item.desc && <p className="text-slate-400 italic mb-4">{item.desc}</p>}
                
                {item.req && (
                    <div className="mb-4">
                        <h3 className="font-bold mb-1 text-slate-200">Requisitos:</h3>
                        <ul className="list-disc list-inside text-slate-300 space-y-1">
                            {formatRequirement(item.req, autoclickers).map((r, i) => <li key={i}>{r}</li>)}
                        </ul>
                    </div>
                )}

                {item.effect && item.effect.length > 0 && (
                    <div>
                        <h3 className="font-bold mb-1 text-lime-300">Efecto:</h3>
                        <ul className="list-disc list-inside text-lime-400 space-y-1">
                            {formatEffect(item.effect, autoclickers).map((e, i) => <li key={i}>{e}</li>)}
                        </ul>
                    </div>
                )}
            </motion.div>
        </motion.div>
    );
}
