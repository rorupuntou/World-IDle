import { Autoclicker, Upgrade, Achievement } from "@/components/types";

// -- ESTADO INICIAL Y DATOS DEL JUEGO --
export const initialState = { tokens: 0, humanityGems: 0, tokensPerClick: 1 };
export const initialStats = { totalTokensEarned: 0, totalClicks: 0, tokensPerSecond: 0 };
export const SAVE_KEY = 'worldIdleSave_v1';

export const initialAutoclickers: Autoclicker[] = [
    { id: 0, name: "Cursor", desc: "El comienzo de todo. Un simple clic.", cost: 15, tps: 0.1, purchased: 0, icon: 'CursorArrowRaysIcon' },
    { id: 1, name: "Dato-Minero", desc: "Extrae datos de la red en busca de $WCLICK.", cost: 100, tps: 1, purchased: 0, req: { totalTokensEarned: 100 }, icon: 'CpuChipIcon' },
    { id: 2, name: "Quantum-Core", desc: "Un núcleo cuántico que procesa realidades paralelas.", cost: 1100, tps: 8, purchased: 0, req: { totalTokensEarned: 1000 }, icon: 'CircleStackIcon' },
    { id: 3, name: "Enjambre de Drones", desc: "Drones autónomos que recorren el mundo en busca de $WCLICK.", cost: 12000, tps: 47, purchased: 0, req: { totalTokensEarned: 10000 }, icon: 'PaperAirplaneIcon' },
    { id: 4, name: "Granja de Servidores", desc: "Un centro de datos masivo dedicado a la minería.", cost: 130000, tps: 260, purchased: 0, req: { totalTokensEarned: 100000 }, icon: 'ServerStackIcon' },
    { id: 5, name: "Nodo Planetario", desc: "Una red de computación que abarca todo un planeta.", cost: 1.4e6, tps: 1400, purchased: 0, req: { totalTokensEarned: 1e6 }, icon: 'GlobeAltIcon' },
    { id: 6, name: "Orbital de Cómputo", desc: "Una estación espacial que utiliza la energía estelar para computar.", cost: 20e6, tps: 7800, purchased: 0, req: { totalTokensEarned: 10e6 }, icon: 'CloudIcon' },
    { id: 7, name: "Portal Interdimensional", desc: "Abre portales a otras dimensiones para obtener sus riquezas.", cost: 330e6, tps: 44000, purchased: 0, req: { totalTokensEarned: 100e6 }, icon: 'ArrowsRightLeftIcon' },
    { id: 8, name: "Máquina del Tiempo", desc: "Viaja al futuro para traer los $WCLICK que aún no se han minado.", cost: 5.1e9, tps: 260000, purchased: 0, req: { totalTokensEarned: 1e9 }, icon: 'ClockIcon' },
    { id: 9, name: "Condensador de Humanidad", desc: "Convierte la conciencia colectiva en $WCLICK.", cost: 75e9, tps: 1.6e6, purchased: 0, humanityGemsCost: 100, req: { totalTokensEarned: 50e9 }, icon: 'UserGroupIcon' },
    { id: 10, name: "Singularidad Trascendente", desc: "El punto final de la computación. Reescribe la realidad.", cost: 1e12, tps: 10e6, purchased: 0, humanityGemsCost: 500, req: { totalTokensEarned: 1e12 }, icon: 'SparklesIcon' },
    { id: 11, name: "Generador de Agujeros Negros", desc: "Comprime la realidad para generar $WCLICK.", cost: 1.2e13, tps: 8e7, purchased: 0, req: { totalTokensEarned: 1e13 }, icon: 'StopCircleIcon' },
    { id: 12, name: "Forja de Realidades", desc: "Crea universos de bolsillo para farmear $WCLICK.", cost: 15e13, tps: 50e7, purchased: 0, req: { totalTokensEarned: 10e13 }, icon: 'CubeTransparentIcon' },
];

const tieredUpgrade = (id: number, autoclickerId: number, name: string, amount: number, cost: number, tier: string): Upgrade => ({
    id,
    name: `${name} x${amount}`,
    desc: `Duplica la producción de ${initialAutoclickers[autoclickerId].name}.`,
    cost,
    purchased: false,
    effect: [{ type: 'multiplyAutoclicker', targetId: autoclickerId, value: 2 }],
    req: { autoclickers: { id: autoclickerId, amount } },
    tier,
});

export const initialUpgrades: Upgrade[] = [
    // --- Upgrades Globales y de Clic ---
    { id: 1, name: "Cursor Reforzado", desc: "Clics y cursores x2", cost: 1000, purchased: false, effect: [{ type: 'multiplyClick', value: 2 }, { type: 'multiplyAutoclicker', targetId: 0, value: 2 }], req: { autoclickers: {id: 0, amount: 1} }, tier: 'common' },
    { id: 10, name: "Mouse de Titanio", desc: "Clics x2", cost: 5000, purchased: false, effect: [{ type: 'multiplyClick', value: 2 }], req: { autoclickers: {id: 0, amount: 5} }, tier: 'common' },
    { id: 100, name: "Mil Dedos", desc: "Cursores ganan +0.1 por cada Autoclicker que no sea un cursor.", cost: 100000, purchased: false, effect: [{ type: 'addCpSToAutoclickerFromOthers', targetId: 0, value: 0.1 }], req: { autoclickers: {id: 0, amount: 25} }, tier: 'rare' },
    { id: 101, name: "Un Millón de Dedos", desc: "Cursores ganan +0.5 por cada Autoclicker que no sea un cursor.", cost: 10e6, purchased: false, effect: [{ type: 'addCpSToAutoclickerFromOthers', targetId: 0, value: 0.5 }], req: { autoclickers: {id: 0, amount: 50} }, tier: 'epic' },
    { id: 102, name: "Clics Asistidos", desc: "Los clics ganan un 1% de tu CpS total.", cost: 10e7, purchased: false, effect: [{ type: 'addCpSToClick', percent: 0.01 }], req: { totalTokensEarned: 50e6 }, tier: 'epic' },
    { id: 103, name: "Clics Exponenciales", desc: "Los clics ganan un 1% adicional de tu CpS total.", cost: 10e9, purchased: false, effect: [{ type: 'addCpSToClick', percent: 0.01 }], req: { totalTokensEarned: 1e9 }, tier: 'legendary' },
    { id: 4, name: "Protocolo de Sinergia", desc: "Producción total +5%", cost: 25000, purchased: false, effect: [{ type: 'multiplyGlobal', value: 1.05 }], req: { totalTokensEarned: 20000 }, tier: 'common' },
    { id: 200, name: "Optimización Global", desc: "Producción total +10%", cost: 1e6, purchased: false, effect: [{ type: 'multiplyGlobal', value: 1.10 }], req: { totalTokensEarned: 1e6 }, tier: 'rare' },
    { id: 201, name: "Red Neuronal Descentralizada", desc: "Producción total +15%", cost: 100e6, purchased: false, effect: [{ type: 'multiplyGlobal', value: 1.15 }], req: { totalTokensEarned: 100e6 }, tier: 'epic' },

    // --- Synergy Upgrades ---
    { id: 500, name: "Sinergia Minero-Granja", desc: "Dato-Mineros ganan +1% de producción por cada Granja de Servidores.", cost: 10e6, purchased: false, effect: [{ type: 'multiplyAutoclickerByOtherCount', targetId: 1, sourceId: 4, value: 0.01 }], req: { autoclickers: [{id: 1, amount: 50}, {id: 4, amount: 10}] }, tier: 'rare' },
    { id: 501, name: "Sinergia Portal-Tiempo", desc: "Portales ganan +1% de producción por cada Máquina del Tiempo.", cost: 100e9, purchased: false, effect: [{ type: 'multiplyAutoclickerByOtherCount', targetId: 7, sourceId: 8, value: 0.01 }], req: { autoclickers: [{id: 7, amount: 50}, {id: 8, amount: 10}] }, tier: 'epic' },

    // --- Tiered Upgrades para Autoclickers ---
    // Dato-Minero (ID 1)
    tieredUpgrade(1001, 1, "Mineros Eficientes", 1, 1000, 'common'),
    tieredUpgrade(1002, 1, "Mineros Eficientes", 5, 5000, 'common'),
    tieredUpgrade(1003, 1, "Mineros Eficientes", 25, 50000, 'rare'),
    tieredUpgrade(1004, 1, "Mineros Eficientes", 50, 500000, 'rare'),
    tieredUpgrade(1005, 1, "Mineros Eficientes", 100, 50e6, 'epic'),
    tieredUpgrade(1006, 1, "Mineros Eficientes", 150, 50e7, 'epic'),

    // Quantum-Core (ID 2)
    tieredUpgrade(2001, 2, "Núcleos Optimizados", 1, 10000, 'common'),
    tieredUpgrade(2002, 2, "Núcleos Optimizados", 5, 50000, 'common'),
    tieredUpgrade(2003, 2, "Núcleos Optimizados", 25, 500000, 'rare'),
    tieredUpgrade(2004, 2, "Núcleos Optimizados", 50, 5e6, 'rare'),
    tieredUpgrade(2005, 2, "Núcleos Optimizados", 100, 500e6, 'epic'),
    tieredUpgrade(2006, 2, "Núcleos Optimizados", 150, 500e7, 'epic'),

    // Enjambre de Drones (ID 3)
    tieredUpgrade(3001, 3, "Logística de Enjambre", 1, 120000, 'common'),
    tieredUpgrade(3002, 3, "Logística de Enjambre", 5, 600000, 'common'),
    tieredUpgrade(3003, 3, "Logística de Enjambre", 25, 6e6, 'rare'),
    tieredUpgrade(3004, 3, "Logística de Enjambre", 50, 60e6, 'rare'),
    tieredUpgrade(3005, 3, "Logística de Enjambre", 100, 6e9, 'epic'),
    tieredUpgrade(3006, 3, "Logística de Enjambre", 150, 6e10, 'epic'),

    // Granja de Servidores (ID 4)
    tieredUpgrade(4001, 4, "Refrigeración Líquida", 1, 1.3e6, 'common'),
    tieredUpgrade(4002, 4, "Refrigeración Líquida", 5, 6.5e6, 'common'),
    tieredUpgrade(4003, 4, "Refrigeración Líquida", 25, 65e6, 'rare'),
    tieredUpgrade(4004, 4, "Refrigeración Líquida", 50, 650e6, 'rare'),
    tieredUpgrade(4005, 4, "Refrigeración Líquida", 100, 65e9, 'epic'),
    tieredUpgrade(4006, 4, "Refrigeración Líquida", 150, 65e10, 'epic'),

    // Nodo Planetario (ID 5)
    tieredUpgrade(5001, 5, "Ancho de Banda Galáctico", 1, 14e6, 'common'),
    tieredUpgrade(5002, 5, "Ancho de Banda Galáctico", 5, 70e6, 'common'),
    tieredUpgrade(5003, 5, "Ancho de Banda Galáctico", 25, 700e6, 'rare'),
    tieredUpgrade(5004, 5, "Ancho de Banda Galáctico", 50, 7e9, 'rare'),
    tieredUpgrade(5005, 5, "Ancho de Banda Galáctico", 100, 700e9, 'epic'),
    tieredUpgrade(5006, 5, "Ancho de Banda Galáctico", 150, 700e10, 'epic'),

    // Orbital de Cómputo (ID 6)
    tieredUpgrade(6001, 6, "Computronium Estable", 1, 200e6, 'common'),
    tieredUpgrade(6002, 6, "Computronium Estable", 5, 1e9, 'common'),
    tieredUpgrade(6003, 6, "Computronium Estable", 25, 10e9, 'rare'),
    tieredUpgrade(6004, 6, "Computronium Estable", 50, 100e9, 'rare'),
    tieredUpgrade(6005, 6, "Computronium Estable", 100, 10e12, 'epic'),
    tieredUpgrade(6006, 6, "Computronium Estable", 150, 10e13, 'epic'),

    // Portal Interdimensional (ID 7)
    tieredUpgrade(7001, 7, "Sincronización Dimensional", 1, 3.3e9, 'common'),
    tieredUpgrade(7002, 7, "Sincronización Dimensional", 5, 16.5e9, 'common'),
    tieredUpgrade(7003, 7, "Sincronización Dimensional", 25, 165e9, 'rare'),
    tieredUpgrade(7004, 7, "Sincronización Dimensional", 50, 1.65e12, 'rare'),
    tieredUpgrade(7005, 7, "Sincronización Dimensional", 100, 165e12, 'epic'),
    tieredUpgrade(7006, 7, "Sincronización Dimensional", 150, 165e13, 'epic'),

    // Máquina del Tiempo (ID 8)
    tieredUpgrade(8001, 8, "Paradojas Estabilizadas", 1, 51e9, 'common'),
    tieredUpgrade(8002, 8, "Paradojas Estabilizadas", 5, 255e9, 'common'),
    tieredUpgrade(8003, 8, "Paradojas Estabilizadas", 25, 2.55e12, 'rare'),
    tieredUpgrade(8004, 8, "Paradojas Estabilizadas", 50, 25.5e12, 'rare'),
    tieredUpgrade(8005, 8, "Paradojas Estabilizadas", 100, 2.55e15, 'epic'),
    tieredUpgrade(8006, 8, "Paradojas Estabilizadas", 150, 2.55e16, 'epic'),

    // Condensador de Humanidad (ID 9)
    tieredUpgrade(9001, 9, "Conciencia Colectiva", 1, 750e9, 'common'),
    tieredUpgrade(9002, 9, "Conciencia Colectiva", 5, 3.75e12, 'common'),
    tieredUpgrade(9003, 9, "Conciencia Colectiva", 25, 37.5e12, 'rare'),
    tieredUpgrade(9004, 9, "Conciencia Colectiva", 50, 375e12, 'rare'),
    tieredUpgrade(9005, 9, "Conciencia Colectiva", 100, 37.5e15, 'epic'),
    tieredUpgrade(9006, 9, "Conciencia Colectiva", 150, 37.5e16, 'epic'),

    // Singularidad Trascendente (ID 10)
    tieredUpgrade(10001, 10, "Leyes Físicas Editables", 1, 1e12, 'common'),
    tieredUpgrade(10002, 10, "Leyes Físicas Editables", 5, 5e12, 'common'),
    tieredUpgrade(10003, 10, "Leyes Físicas Editables", 25, 50e12, 'rare'),
    tieredUpgrade(10004, 10, "Leyes Físicas Editables", 50, 500e12, 'rare'),
    tieredUpgrade(10005, 10, "Leyes Físicas Editables", 100, 5e15, 'epic'),
    tieredUpgrade(10006, 10, "Leyes Físicas Editables", 150, 5e16, 'epic'),
    
    // Generador de Agujeros Negros (ID 11)
    tieredUpgrade(11001, 11, "Horizonte de Sucesos Estable", 1, 1.2e13, 'common'),
    tieredUpgrade(11002, 11, "Horizonte de Sucesos Estable", 5, 6e13, 'common'),
    tieredUpgrade(11003, 11, "Horizonte de Sucesos Estable", 25, 60e13, 'rare'),
    tieredUpgrade(11004, 11, "Horizonte de Sucesos Estable", 50, 600e13, 'rare'),
    tieredUpgrade(11005, 11, "Horizonte de Sucesos Estable", 100, 6e18, 'epic'),
    tieredUpgrade(11006, 11, "Horizonte de Sucesos Estable", 150, 6e19, 'epic'),

    // Forja de Realidades (ID 12)
    tieredUpgrade(12001, 12, "Multiversos Productivos", 1, 15e13, 'common'),
    tieredUpgrade(12002, 12, "Multiversos Productivos", 5, 75e13, 'common'),
    tieredUpgrade(12003, 12, "Multiversos Productivos", 25, 750e13, 'rare'),
    tieredUpgrade(12004, 12, "Multiversos Productivos", 50, 7.5e18, 'rare'),
    tieredUpgrade(12005, 12, "Multiversos Productivos", 100, 75e18, 'epic'),
    tieredUpgrade(12006, 12, "Multiversos Productivos", 150, 75e19, 'epic'),
];


export const initialAchievements: Achievement[] = [
    // --- Logros de Producción ---
    { id: 1, name: "El Viaje Comienza", desc: "Gana tu primer $WCLICK", unlocked: false, req: { totalTokensEarned: 1 } },
    { id: 3, name: "Pequeño Capitalista", desc: "Alcanza 1,000 $WCLICK", unlocked: false, req: { totalTokensEarned: 1000 } },
    { id: 6, name: "Magnate Digital", desc: "Alcanza 1,000,000 $WCLICK", unlocked: false, req: { totalTokensEarned: 1000000 } },
    { id: 10, name: "Billonario de Bits", desc: "Alcanza 1,000,000,000 $WCLICK", unlocked: false, req: { totalTokensEarned: 1e9 } },
    { id: 11, name: "Trillonario Trascendente", desc: "Alcanza 1,000,000,000,000 $WCLICK", unlocked: false, req: { totalTokensEarned: 1e12 } },
    { id: 16, name: "Cuatrillonario Cósmico", desc: "Alcanza 1e15 $WCLICK", unlocked: false, req: { totalTokensEarned: 1e15 } },
    { id: 17, name: "Quintillonario Quántico", desc: "Alcanza 1e18 $WCLICK", unlocked: false, req: { totalTokensEarned: 1e18 } },

    // --- Logros de Clics ---
    { id: 2, name: "Clicker Principiante", desc: "Haz 100 clics", unlocked: false, req: { totalClicks: 100 } },
    { id: 7, name: "Frenesí de Clics", desc: "Haz 5,000 clics", unlocked: false, req: { totalClicks: 5000 } },
    { id: 12, name: "Clicker Compulsivo", desc: "Haz 100,000 clics", unlocked: false, req: { totalClicks: 100000 } },
    { id: 18, name: "Dedo Divino", desc: "Haz 1,000,000 de clics", unlocked: false, req: { totalClicks: 1e6 } },

    // --- Logros de TPS ---
    { id: 4, name: "Flujo Constante", desc: "Alcanza 10 $WCLICK/s", unlocked: false, req: { tps: 10 } },
    { id: 13, name: "Autopista de Datos", desc: "Alcanza 1,000 $WCLICK/s", unlocked: false, req: { tps: 1000 } },
    { id: 14, "name": "Velocidad de la Luz", "desc": "Alcanza 100,000 $WCLICK/s", unlocked: false, req: { tps: 100000 } },
    { id: 15, "name": "Singularidad Económica", "desc": "Alcanza 1,000,000 $WCLICK/s", unlocked: false, req: { tps: 1e6 } },
    { id: 19, "name": "Más Allá de la Física", "desc": "Alcanza 1e9 $WCLICK/s", unlocked: false, req: { tps: 1e9 } },

    // --- Logros de Construcción ---
    { id: 20, name: "Diversificación", desc: "Posee al menos un autoclicker de cada tipo.", unlocked: false, req: { eachAutoclickerAmount: 1 } },
    { id: 21, name: "Ejército de Clics", desc: "Posee 100 Cursors.", unlocked: false, req: { autoclickers: { id: 0, amount: 100 } } },
    { id: 22, name: "Minería a Gran Escala", desc: "Posee 100 Dato-Mineros.", unlocked: false, req: { autoclickers: { id: 1, amount: 100 } } },
    { id: 23, name: "Computación Total", desc: "Posee 50 de cada autoclicker.", unlocked: false, req: { eachAutoclickerAmount: 50 } },
    { id: 24, name: "Arquitecto de Mundos", desc: "Posee 100 de cada autoclicker.", unlocked: false, req: { eachAutoclickerAmount: 100 } },
    { id: 25, name: "Constructor de Realidades", desc: "Posee 150 de cada autoclicker.", unlocked: false, req: { eachAutoclickerAmount: 150 } },

    // --- Logros Especiales ---
    { id: 5, name: "Prueba de Humanidad", desc: "Verifícate con World ID", unlocked: false, req: { verified: true }, reward: { humanityGems: 10 } },

    // --- Logros Oscuros ---
    { id: 1000, name: "Obsesión", desc: "Posee 500 cursores.", unlocked: false, req: { autoclickers: { id: 0, amount: 500 } }, type: 'shadow' },
    { id: 1001, name: "Minimalista", desc: "Haz prestigio con exactamente 1 punto de prestigio para reclamar.", unlocked: false, req: { totalTokensEarned: 100000 }, type: 'shadow' },
];

export const newsFeed = ["Noticia: Se sospecha que las granjas de datos emplean mano de obra de IA no declarada.", "Noticia: Científico advierte que los núcleos cuánticos liberan 'demasiada verdad' en los ríos de información.", "Noticia: Hombre roba un banco, lo invierte todo en Autoclickers.", "Noticia: 'Francamente, toda esta historia de los $WCLICK es un poco sospechosa', dice un idiota confundido.", "Noticia: La epidemia de procrastinación golpea a la nación; los expertos culpan a los videos de gatos.", "<q>Humedad de datos.</q><sig>IA Autónoma</sig>", "<q>Estamos observando.</q><sig>IA Autónoma</sig>", "Noticia: El valor de $WCLICK se dispara después de que se rumorea que 'es bueno para la economía'.", "Noticia: La verificación de humanidad ahora es más popular que el pan rebanado, según una encuesta.",];

// -- CONSTANTES DE CONFIGURACIÓN DEL JUEGO --
export const HUMAN_BOOST_MULTIPLIER = 10;
export const PRICE_INCREASE_RATE = 1.15;
export const TIER_THRESHOLDS = [10, 50, 150, 250, 350, 450, 550];
export const GLOBAL_UPGRADE_THRESHOLDS = [1000, 10000, 1e5, 1e6, 1e7, 1e8, 1e9];
