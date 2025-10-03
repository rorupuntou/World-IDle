import { Autoclicker, Upgrade, Achievement } from "@/components/types";

// -- ESTADO INICIAL Y DATOS DEL JUEGO --
export const initialState = { tokens: 0, humanityGems: 0, tokensPerClick: 1 };
export const initialStats = { totalTokensEarned: 0, totalClicks: 0, tokensPerSecond: 0 };
export const SAVE_KEY = 'worldIdleSave_v1';

export const initialAutoclickers: Autoclicker[] = [
    { id: 0, name: "Cursor", cost: 15, tps: 0.1, purchased: 0 },
    { id: 1, name: "Dato-Minero", cost: 100, tps: 1, purchased: 0, req: { totalTokensEarned: 100 } },
    { id: 2, name: "Quantum-Core", cost: 1100, tps: 8, purchased: 0, req: { totalTokensEarned: 1000 } },
    { id: 3, name: "Enjambre de Drones", cost: 12000, tps: 47, purchased: 0, req: { totalTokensEarned: 10000 } },
    { id: 4, name: "Granja de Servidores", cost: 130000, tps: 260, purchased: 0, req: { totalTokensEarned: 100000 } },
    { id: 5, name: "Nodo Planetario", cost: 1.4e6, tps: 1400, purchased: 0, req: { totalTokensEarned: 1e6 } },
    { id: 6, name: "Orbital de Cómputo", cost: 20e6, tps: 7800, purchased: 0, req: { totalTokensEarned: 10e6 } },
    { id: 7, name: "Portal Interdimensional", cost: 330e6, tps: 44000, purchased: 0, req: { totalTokensEarned: 100e6 } },
    { id: 8, name: "Máquina del Tiempo", cost: 5.1e9, tps: 260000, purchased: 0, req: { totalTokensEarned: 1e9 } },
    { id: 9, name: "Condensador de Humanidad", cost: 75e9, tps: 1.6e6, purchased: 0, humanityGemsCost: 100, req: { totalTokensEarned: 50e9 } },
    { id: 10, name: "Singularidad Trascendente", cost: 0, tps: 10e6, purchased: 0, humanityGemsCost: 500, req: { totalTokensEarned: 1e12 } },
];

export const initialUpgrades: Upgrade[] = [
    { id: 1, name: "Cursor Reforzado", desc: "Clics y cursores x2", cost: 1000, purchased: false, effect: [{ type: 'multiplyClick', value: 2 }, { type: 'multiplyAutoclicker', targetId: 0, value: 2 }], req: { autoclickers: {id: 0, amount: 1} } },
    { id: 10, name: "Mouse de Titanio", desc: "Clics x2", cost: 5000, purchased: false, effect: [{ type: 'multiplyClick', value: 2 }], req: { autoclickers: {id: 0, amount: 5} } },
    { id: 100, name: "Mil Dedos", desc: "Cursores ganan +0.1 por cada Autoclicker que no sea un cursor.", cost: 100000, purchased: false, effect: [{ type: 'addCpSToAutoclickerFromOthers', targetId: 0, value: 0.1 }], req: { autoclickers: {id: 0, amount: 25} } },
    { id: 101, name: "Un Millón de Dedos", desc: "Cursores ganan +0.5 por cada Autoclicker que no sea un cursor.", cost: 10e6, purchased: false, effect: [{ type: 'addCpSToAutoclickerFromOthers', targetId: 0, value: 0.5 }], req: { autoclickers: {id: 0, amount: 50} } },
    { id: 102, name: "Clics Asistidos", desc: "Los clics ganan un 1% de tu CpS total.", cost: 10e7, purchased: false, effect: [{ type: 'addCpSToClick', percent: 0.01 }], req: { totalTokensEarned: 50e6 } },
    { id: 2, name: "Mineros Eficientes", desc: "Dato-Mineros x2", cost: 1000, purchased: false, effect: [{ type: 'multiplyAutoclicker', targetId: 1, value: 2 }], req: { autoclickers: { id: 1, amount: 1 } } },
    { id: 3, name: "Núcleos Optimizados", desc: "Quantum-Cores x2", cost: 10000, purchased: false, effect: [{ type: 'multiplyAutoclicker', targetId: 2, value: 2 }], req: { autoclickers: { id: 2, amount: 1 } } },
    { id: 4, name: "Protocolo de Sinergia", desc: "Producción total +5%", cost: 25000, purchased: false, effect: [{ type: 'multiplyGlobal', value: 1.05 }], req: { totalTokensEarned: 20000 } },
    { id: 103, name: "Clics Exponenciales", desc: "Los clics ganan un 1% adicional de tu CpS total.", cost: 10e9, purchased: false, effect: [{ type: 'addCpSToClick', percent: 0.01 }], req: { totalTokensEarned: 1e9 } },
];

export const initialAchievements: Achievement[] = [
    { id: 1, name: "El Viaje Comienza", desc: "Gana tu primer $WCLICK", unlocked: false, req: { totalTokensEarned: 1 } },
    { id: 2, name: "Clicker Principiante", desc: "Haz 100 clics", unlocked: false, req: { totalClicks: 100 } },
    { id: 3, name: "Pequeño Capitalista", desc: "Alcanza 1,000 $WCLICK", unlocked: false, req: { totalTokensEarned: 1000 } },
    { id: 4, name: "Flujo Constante", desc: "Alcanza 10 $WCLICK/s", unlocked: false, req: { tps: 10 } },
    { id: 5, name: "Prueba de Humanidad", desc: "Verifícate con World ID", unlocked: false, req: { verified: true }, reward: { humanityGems: 10 } },
    { id: 6, name: "Magnate Digital", desc: "Alcanza 1,000,000 $WCLICK", unlocked: false, req: { totalTokensEarned: 1000000 } },
    { id: 7, name: "Frenesí de Clics", desc: "Haz 5,000 clics", unlocked: false, req: { totalClicks: 5000 } },
];

export const newsFeed = ["Noticia: Se sospecha que las granjas de datos emplean mano de obra de IA no declarada.", "Noticia: Científico advierte que los núcleos cuánticos liberan 'demasiada verdad' en los ríos de información.", "Noticia: Hombre roba un banco, lo invierte todo en Autoclickers.", "Noticia: 'Francamente, toda esta historia de los $WCLICK es un poco sospechosa', dice un idiota confundido.", "Noticia: La epidemia de procrastinación golpea a la nación; los expertos culpan a los videos de gatos.", "<q>Humedad de datos.</q><sig>IA Autónoma</sig>", "<q>Estamos observando.</q><sig>IA Autónoma</sig>", "Noticia: El valor de $WCLICK se dispara después de que se rumorea que 'es bueno para la economía'.", "Noticia: La verificación de humanidad ahora es más popular que el pan rebanado, según una encuesta.",];

// -- CONSTANTES DE CONFIGURACIÓN DEL JUEGO --
export const HUMAN_BOOST_MULTIPLIER = 10;
export const PRICE_INCREASE_RATE = 1.15;
export const TIER_THRESHOLDS = [10, 50, 150, 250, 350, 450, 550];
export const GLOBAL_UPGRADE_THRESHOLDS = [1000, 10000, 1e5, 1e6, 1e7, 1e8, 1e9];