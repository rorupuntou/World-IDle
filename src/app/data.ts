import { Autoclicker, Upgrade, Achievement } from "@/components/types";

// -- ESTADO INICIAL Y DATOS DEL JUEGO --
export const initialState = { tokens: 0, humanityGems: 0, tokensPerClick: 1, permanentBoostBonus: 0, lastSaved: 0, wldTimeWarpsPurchased: 0 };
export const initialStats = { totalTokensEarned: 0, totalClicks: 0, tokensPerSecond: 0 };
export const SAVE_KEY = 'worldIdleSave_v1';

export const initialAutoclickers: Autoclicker[] = [
    { id: 0, name: "autoclicker.cursor.name", desc: "autoclicker.cursor.desc", cost: 15, tps: 0.1, purchased: 0, icon: 'CursorArrowRaysIcon' },
    { id: 1, name: "autoclicker.dataminer.name", desc: "autoclicker.dataminer.desc", cost: 100, tps: 1, purchased: 0, req: { totalTokensEarned: 100 }, icon: 'CpuChipIcon' },
    { id: 2, name: "autoclicker.quantumcore.name", desc: "autoclicker.quantumcore.desc", cost: 1100, tps: 8, purchased: 0, req: { totalTokensEarned: 1000 }, icon: 'CircleStackIcon' },
    { id: 3, name: "autoclicker.droneswarm.name", desc: "autoclicker.droneswarm.desc", cost: 12000, tps: 47, purchased: 0, req: { totalTokensEarned: 10000 }, icon: 'PaperAirplaneIcon' },
    { id: 4, name: "autoclicker.serverfarm.name", desc: "autoclicker.serverfarm.desc", cost: 130000, tps: 260, purchased: 0, req: { totalTokensEarned: 100000 }, icon: 'ServerStackIcon' },
    { id: 5, name: "autoclicker.planetarynode.name", desc: "autoclicker.planetarynode.desc", cost: 1.4e6, tps: 1400, purchased: 0, req: { totalTokensEarned: 1e6 }, icon: 'GlobeAltIcon' },
    { id: 6, name: "autoclicker.computationalorbital.name", desc: "autoclicker.computationalorbital.desc", cost: 20e6, tps: 7800, purchased: 0, req: { totalTokensEarned: 10e6 }, icon: 'CloudIcon' },
    { id: 7, name: "autoclicker.interdimensionalportal.name", desc: "autoclicker.interdimensionalportal.desc", cost: 330e6, tps: 44000, purchased: 0, req: { totalTokensEarned: 100e6 }, icon: 'ArrowsRightLeftIcon' },
    { id: 8, name: "autoclicker.timemachine.name", desc: "autoclicker.timemachine.desc", cost: 5.1e9, tps: 260000, purchased: 0, req: { totalTokensEarned: 1e9 }, icon: 'ClockIcon' },
    { id: 9, name: "autoclicker.humanitycondenser.name", desc: "autoclicker.humanitycondenser.desc", cost: 75e9, tps: 1.6e6, purchased: 0, prestigeCost: 1, req: { totalTokensEarned: 50e9 }, icon: 'UserGroupIcon' },
    { id: 10, name: "autoclicker.transcendentsingularity.name", desc: "autoclicker.transcendentsingularity.desc", cost: 1e12, tps: 10e6, purchased: 0, prestigeCost: 5, req: { totalTokensEarned: 1e12 }, icon: 'SparklesIcon' },
    { id: 11, name: "autoclicker.blackholegenerator.name", desc: "autoclicker.blackholegenerator.desc", cost: 1.2e13, tps: 8e7, purchased: 0, prestigeCost: 25, req: { totalTokensEarned: 1e13 }, icon: 'StopCircleIcon' },
    { id: 12, name: "autoclicker.realityforge.name", desc: "autoclicker.realityforge.desc", cost: 15e13, tps: 50e7, purchased: 0, prestigeCost: 100, req: { totalTokensEarned: 10e13 }, icon: 'CubeTransparentIcon' },
    { id: 99, name: "autoclicker.devprocessor.name", desc: "autoclicker.devprocessor.desc", cost: 1, tps: 1e6, purchased: 0, icon: 'CogIcon', devOnly: true },
];

const tieredUpgrade = (id: number, autoclickerId: number, nameKey: string, descKey: string, amount: number, cost: number, tier: string): Upgrade => ({
    id,
    name: nameKey,
    desc: descKey,
    cost,
    purchased: false,
    effect: [{ type: 'multiplyAutoclicker', targetId: autoclickerId, value: 2 }],
    req: { autoclickers: { id: autoclickerId, amount } },
    tier,
    dynamicName: { key: nameKey, replacements: { amount } }
});

export const initialUpgrades: Upgrade[] = [
    // --- Upgrades Globales y de Clic ---
    { id: 1, name: "upgrade.reinforcedCursor.name", desc: "upgrade.reinforcedCursor.desc", cost: 1000, purchased: false, effect: [{ type: 'multiplyClick', value: 2 }, { type: 'multiplyAutoclicker', targetId: 0, value: 2 }], req: { autoclickers: {id: 0, amount: 1} }, tier: 'common' },
    { id: 10, name: "upgrade.titaniumMouse.name", desc: "upgrade.titaniumMouse.desc", cost: 5000, purchased: false, effect: [{ type: 'multiplyClick', value: 2 }], req: { autoclickers: {id: 0, amount: 5} }, tier: 'common' },
    { id: 100, name: "upgrade.thousandFingers.name", desc: "upgrade.thousandFingers.desc", cost: 100000, purchased: false, effect: [{ type: 'addCpSToAutoclickerFromOthers', targetId: 0, value: 0.1 }], req: { autoclickers: {id: 0, amount: 25} }, tier: 'rare' },
    { id: 101, name: "upgrade.millionFingers.name", desc: "upgrade.millionFingers.desc", cost: 10e6, purchased: false, effect: [{ type: 'addCpSToAutoclickerFromOthers', targetId: 0, value: 0.5 }], req: { autoclickers: {id: 0, amount: 50} }, tier: 'epic' },
    { id: 102, name: "upgrade.assistedClicks.name", desc: "upgrade.assistedClicks.desc", cost: 10e7, purchased: false, effect: [{ type: 'addCpSToClick', percent: 0.01 }], req: { totalTokensEarned: 50e6 }, tier: 'epic' },
    { id: 103, name: "upgrade.exponentialClicks.name", desc: "upgrade.exponentialClicks.desc", cost: 10e9, purchased: false, effect: [{ type: 'addCpSToClick', percent: 0.01 }], req: { totalTokensEarned: 1e9 }, tier: 'legendary' },
    { id: 4, name: "upgrade.synergyProtocol.name", desc: "upgrade.synergyProtocol.desc", cost: 25000, purchased: false, effect: [{ type: 'multiplyGlobal', value: 1.05 }], req: { totalTokensEarned: 20000 }, tier: 'common' },
    { id: 200, name: "upgrade.globalOptimization.name", desc: "upgrade.globalOptimization.desc", cost: 1e6, purchased: false, effect: [{ type: 'multiplyGlobal', value: 1.10 }], req: { totalTokensEarned: 1e6 }, tier: 'rare' },
    { id: 201, name: "upgrade.decentralizedNeuralNetwork.name", desc: "upgrade.decentralizedNeuralNetwork.desc", cost: 100e6, purchased: false, effect: [{ type: 'multiplyGlobal', value: 1.15 }], req: { totalTokensEarned: 100e6 }, tier: 'epic' },

    // --- Synergy Upgrades ---
    { id: 500, name: "upgrade.minerFarmSynergy.name", desc: "upgrade.minerFarmSynergy.desc", cost: 10e6, purchased: false, effect: [{ type: 'multiplyAutoclickerByOtherCount', targetId: 1, sourceId: 4, value: 0.01 }], req: { autoclickers: [{id: 1, amount: 50}, {id: 4, amount: 10}] }, tier: 'rare' },
    { id: 501, name: "upgrade.portalTimeSynergy.name", desc: "upgrade.portalTimeSynergy.desc", cost: 100e9, purchased: false, effect: [{ type: 'multiplyAutoclickerByOtherCount', targetId: 7, sourceId: 8, value: 0.01 }], req: { autoclickers: [{id: 7, amount: 50}, {id: 8, amount: 10}] }, tier: 'epic' },

    // --- Tiered Upgrades para Autoclickers ---
    tieredUpgrade(1001, 1, "upgrade.tiered_dataminer.name", "upgrade.tiered_dataminer.desc", 1, 1000, 'common'),
    tieredUpgrade(1002, 1, "upgrade.tiered_dataminer.name", "upgrade.tiered_dataminer.desc", 5, 5000, 'common'),
    tieredUpgrade(1003, 1, "upgrade.tiered_dataminer.name", "upgrade.tiered_dataminer.desc", 25, 50000, 'rare'),
    tieredUpgrade(1004, 1, "upgrade.tiered_dataminer.name", "upgrade.tiered_dataminer.desc", 50, 500000, 'rare'),
    tieredUpgrade(1005, 1, "upgrade.tiered_dataminer.name", "upgrade.tiered_dataminer.desc", 100, 50e6, 'epic'),
    tieredUpgrade(1006, 1, "upgrade.tiered_dataminer.name", "upgrade.tiered_dataminer.desc", 150, 50e7, 'epic'),

    tieredUpgrade(2001, 2, "upgrade.tiered_quantumcore.name", "upgrade.tiered_quantumcore.desc", 1, 10000, 'common'),
    tieredUpgrade(2002, 2, "upgrade.tiered_quantumcore.name", "upgrade.tiered_quantumcore.desc", 5, 50000, 'common'),
    tieredUpgrade(2003, 2, "upgrade.tiered_quantumcore.name", "upgrade.tiered_quantumcore.desc", 25, 500000, 'rare'),
    tieredUpgrade(2004, 2, "upgrade.tiered_quantumcore.name", "upgrade.tiered_quantumcore.desc", 50, 5e6, 'rare'),
    tieredUpgrade(2005, 2, "upgrade.tiered_quantumcore.name", "upgrade.tiered_quantumcore.desc", 100, 500e6, 'epic'),
    tieredUpgrade(2006, 2, "upgrade.tiered_quantumcore.name", "upgrade.tiered_quantumcore.desc", 150, 500e7, 'epic'),

    tieredUpgrade(3001, 3, "upgrade.tiered_droneswarm.name", "upgrade.tiered_droneswarm.desc", 1, 120000, 'common'),
    tieredUpgrade(3002, 3, "upgrade.tiered_droneswarm.name", "upgrade.tiered_droneswarm.desc", 5, 600000, 'common'),
    tieredUpgrade(3003, 3, "upgrade.tiered_droneswarm.name", "upgrade.tiered_droneswarm.desc", 25, 6e6, 'rare'),
    tieredUpgrade(3004, 3, "upgrade.tiered_droneswarm.name", "upgrade.tiered_droneswarm.desc", 50, 60e6, 'rare'),
    tieredUpgrade(3005, 3, "upgrade.tiered_droneswarm.name", "upgrade.tiered_droneswarm.desc", 100, 6e9, 'epic'),
    tieredUpgrade(3006, 3, "upgrade.tiered_droneswarm.name", "upgrade.tiered_droneswarm.desc", 150, 6e10, 'epic'),

    tieredUpgrade(4001, 4, "upgrade.tiered_serverfarm.name", "upgrade.tiered_serverfarm.desc", 1, 1.3e6, 'common'),
    tieredUpgrade(4002, 4, "upgrade.tiered_serverfarm.name", "upgrade.tiered_serverfarm.desc", 5, 6.5e6, 'common'),
    tieredUpgrade(4003, 4, "upgrade.tiered_serverfarm.name", "upgrade.tiered_serverfarm.desc", 25, 65e6, 'rare'),
    tieredUpgrade(4004, 4, "upgrade.tiered_serverfarm.name", "upgrade.tiered_serverfarm.desc", 50, 650e6, 'rare'),
    tieredUpgrade(4005, 4, "upgrade.tiered_serverfarm.name", "upgrade.tiered_serverfarm.desc", 100, 65e9, 'epic'),
    tieredUpgrade(4006, 4, "upgrade.tiered_serverfarm.name", "upgrade.tiered_serverfarm.desc", 150, 65e10, 'epic'),

    tieredUpgrade(5001, 5, "upgrade.tiered_planetarynode.name", "upgrade.tiered_planetarynode.desc", 1, 14e6, 'common'),
    tieredUpgrade(5002, 5, "upgrade.tiered_planetarynode.name", "upgrade.tiered_planetarynode.desc", 5, 70e6, 'common'),
    tieredUpgrade(5003, 5, "upgrade.tiered_planetarynode.name", "upgrade.tiered_planetarynode.desc", 25, 700e6, 'rare'),
    tieredUpgrade(5004, 5, "upgrade.tiered_planetarynode.name", "upgrade.tiered_planetarynode.desc", 50, 7e9, 'rare'),
    tieredUpgrade(5005, 5, "upgrade.tiered_planetarynode.name", "upgrade.tiered_planetarynode.desc", 100, 700e9, 'epic'),
    tieredUpgrade(5006, 5, "upgrade.tiered_planetarynode.name", "upgrade.tiered_planetarynode.desc", 150, 700e10, 'epic'),

    tieredUpgrade(6001, 6, "upgrade.tiered_computationalorbital.name", "upgrade.tiered_computationalorbital.desc", 1, 200e6, 'common'),
    tieredUpgrade(6002, 6, "upgrade.tiered_computationalorbital.name", "upgrade.tiered_computationalorbital.desc", 5, 1e9, 'common'),
    tieredUpgrade(6003, 6, "upgrade.tiered_computationalorbital.name", "upgrade.tiered_computationalorbital.desc", 25, 10e9, 'rare'),
    tieredUpgrade(6004, 6, "upgrade.tiered_computationalorbital.name", "upgrade.tiered_computationalorbital.desc", 50, 100e9, 'rare'),
    tieredUpgrade(6005, 6, "upgrade.tiered_computationalorbital.name", "upgrade.tiered_computationalorbital.desc", 100, 10e12, 'epic'),
    tieredUpgrade(6006, 6, "upgrade.tiered_computationalorbital.name", "upgrade.tiered_computationalorbital.desc", 150, 10e13, 'epic'),

    tieredUpgrade(7001, 7, "upgrade.tiered_interdimensionalportal.name", "upgrade.tiered_interdimensionalportal.desc", 1, 3.3e9, 'common'),
    tieredUpgrade(7002, 7, "upgrade.tiered_interdimensionalportal.name", "upgrade.tiered_interdimensionalportal.desc", 5, 16.5e9, 'common'),
    tieredUpgrade(7003, 7, "upgrade.tiered_interdimensionalportal.name", "upgrade.tiered_interdimensionalportal.desc", 25, 165e9, 'rare'),
    tieredUpgrade(7004, 7, "upgrade.tiered_interdimensionalportal.name", "upgrade.tiered_interdimensionalportal.desc", 50, 1.65e12, 'rare'),
    tieredUpgrade(7005, 7, "upgrade.tiered_interdimensionalportal.name", "upgrade.tiered_interdimensionalportal.desc", 100, 165e12, 'epic'),
    tieredUpgrade(7006, 7, "upgrade.tiered_interdimensionalportal.name", "upgrade.tiered_interdimensionalportal.desc", 150, 165e13, 'epic'),

    tieredUpgrade(8001, 8, "upgrade.tiered_timemachine.name", "upgrade.tiered_timemachine.desc", 1, 51e9, 'common'),
    tieredUpgrade(8002, 8, "upgrade.tiered_timemachine.name", "upgrade.tiered_timemachine.desc", 5, 255e9, 'common'),
    tieredUpgrade(8003, 8, "upgrade.tiered_timemachine.name", "upgrade.tiered_timemachine.desc", 25, 2.55e12, 'rare'),
    tieredUpgrade(8004, 8, "upgrade.tiered_timemachine.name", "upgrade.tiered_timemachine.desc", 50, 25.5e12, 'rare'),
    tieredUpgrade(8005, 8, "upgrade.tiered_timemachine.name", "upgrade.tiered_timemachine.desc", 100, 2.55e15, 'epic'),
    tieredUpgrade(8006, 8, "upgrade.tiered_timemachine.name", "upgrade.tiered_timemachine.desc", 150, 2.55e16, 'epic'),

    tieredUpgrade(9001, 9, "upgrade.tiered_humanitycondenser.name", "upgrade.tiered_humanitycondenser.desc", 1, 750e9, 'common'),
    tieredUpgrade(9002, 9, "upgrade.tiered_humanitycondenser.name", "upgrade.tiered_humanitycondenser.desc", 5, 3.75e12, 'common'),
    tieredUpgrade(9003, 9, "upgrade.tiered_humanitycondenser.name", "upgrade.tiered_humanitycondenser.desc", 25, 37.5e12, 'rare'),
    tieredUpgrade(9004, 9, "upgrade.tiered_humanitycondenser.name", "upgrade.tiered_humanitycondenser.desc", 50, 375e12, 'rare'),
    tieredUpgrade(9005, 9, "upgrade.tiered_humanitycondenser.name", "upgrade.tiered_humanitycondenser.desc", 100, 37.5e15, 'epic'),
    tieredUpgrade(9006, 9, "upgrade.tiered_humanitycondenser.name", "upgrade.tiered_humanitycondenser.desc", 150, 37.5e16, 'epic'),

    tieredUpgrade(10001, 10, "upgrade.tiered_transcendentsingularity.name", "upgrade.tiered_transcendentsingularity.desc", 1, 1e12, 'common'),
    tieredUpgrade(10002, 10, "upgrade.tiered_transcendentsingularity.name", "upgrade.tiered_transcendentsingularity.desc", 5, 5e12, 'common'),
    tieredUpgrade(10003, 10, "upgrade.tiered_transcendentsingularity.name", "upgrade.tiered_transcendentsingularity.desc", 25, 50e12, 'rare'),
    tieredUpgrade(10004, 10, "upgrade.tiered_transcendentsingularity.name", "upgrade.tiered_transcendentsingularity.desc", 50, 500e12, 'rare'),
    tieredUpgrade(10005, 10, "upgrade.tiered_transcendentsingularity.name", "upgrade.tiered_transcendentsingularity.desc", 100, 5e15, 'epic'),
    tieredUpgrade(10006, 10, "upgrade.tiered_transcendentsingularity.name", "upgrade.tiered_transcendentsingularity.desc", 150, 5e16, 'epic'),
    
    tieredUpgrade(11001, 11, "upgrade.tiered_blackholegenerator.name", "upgrade.tiered_blackholegenerator.desc", 1, 1.2e13, 'common'),
    tieredUpgrade(11002, 11, "upgrade.tiered_blackholegenerator.name", "upgrade.tiered_blackholegenerator.desc", 5, 6e13, 'common'),
    tieredUpgrade(11003, 11, "upgrade.tiered_blackholegenerator.name", "upgrade.tiered_blackholegenerator.desc", 25, 60e13, 'rare'),
    tieredUpgrade(11004, 11, "upgrade.tiered_blackholegenerator.name", "upgrade.tiered_blackholegenerator.desc", 50, 600e13, 'rare'),
    tieredUpgrade(11005, 11, "upgrade.tiered_blackholegenerator.name", "upgrade.tiered_blackholegenerator.desc", 100, 6e18, 'epic'),
    tieredUpgrade(11006, 11, "upgrade.tiered_blackholegenerator.name", "upgrade.tiered_blackholegenerator.desc", 150, 6e19, 'epic'),

    tieredUpgrade(12001, 12, "upgrade.tiered_realityforge.name", "upgrade.tiered_realityforge.desc", 1, 15e13, 'common'),
    tieredUpgrade(12002, 12, "upgrade.tiered_realityforge.name", "upgrade.tiered_realityforge.desc", 5, 75e13, 'common'),
    tieredUpgrade(12003, 12, "upgrade.tiered_realityforge.name", "upgrade.tiered_realityforge.desc", 25, 750e13, 'rare'),
    tieredUpgrade(12004, 12, "upgrade.tiered_realityforge.name", "upgrade.tiered_realityforge.desc", 50, 7.5e18, 'rare'),
    tieredUpgrade(12005, 12, "upgrade.tiered_realityforge.name", "upgrade.tiered_realityforge.desc", 100, 75e18, 'epic'),
    tieredUpgrade(12006, 12, "upgrade.tiered_realityforge.name", "upgrade.tiered_realityforge.desc", 150, 75e19, 'epic'),
];


export const initialAchievements: Achievement[] = [
    { id: 1, name: "achievement.journeyBegins.name", desc: "achievement.journeyBegins.desc", unlocked: false, req: { totalTokensEarned: 1 } },
    { id: 3, name: "achievement.smallCapitalist.name", desc: "achievement.smallCapitalist.desc", unlocked: false, req: { totalTokensEarned: 1000 } },
    { id: 6, name: "achievement.digitalTycoon.name", desc: "achievement.digitalTycoon.desc", unlocked: false, req: { totalTokensEarned: 1000000 } },
    { id: 10, name: "achievement.bitBillionaire.name", desc: "achievement.bitBillionaire.desc", unlocked: false, req: { totalTokensEarned: 1e9 } },
    { id: 11, name: "achievement.transcendentTrillionaire.name", desc: "achievement.transcendentTrillionaire.desc", unlocked: false, req: { totalTokensEarned: 1e12 } },
    { id: 16, name: "achievement.cosmicQuadrillionaire.name", desc: "achievement.cosmicQuadrillionaire.desc", unlocked: false, req: { totalTokensEarned: 1e15 } },
    { id: 17, name: "achievement.quantumQuintillionaire.name", desc: "achievement.quantumQuintillionaire.desc", unlocked: false, req: { totalTokensEarned: 1e18 } },
    { id: 2, name: "achievement.beginnerClicker.name", desc: "achievement.beginnerClicker.desc", unlocked: false, req: { totalClicks: 100 } },
    { id: 7, name: "achievement.clickFrenzy.name", desc: "achievement.clickFrenzy.desc", unlocked: false, req: { totalClicks: 5000 } },
    { id: 12, name: "achievement.compulsiveClicker.name", desc: "achievement.compulsiveClicker.desc", unlocked: false, req: { totalClicks: 100000 } },
    { id: 18, name: "achievement.divineFinger.name", desc: "achievement.divineFinger.desc", unlocked: false, req: { totalClicks: 1e6 } },
    { id: 4, name: "achievement.steadyFlow.name", desc: "achievement.steadyFlow.desc", unlocked: false, req: { tps: 10 } },
    { id: 13, name: "achievement.dataHighway.name", desc: "achievement.dataHighway.desc", unlocked: false, req: { tps: 1000 } },
    { id: 14, name: "achievement.lightSpeed.name", desc: "achievement.lightSpeed.desc", unlocked: false, req: { tps: 100000 } },
    { id: 15, name: "achievement.economicSingularity.name", desc: "achievement.economicSingularity.desc", unlocked: false, req: { tps: 1e6 } },
    { id: 19, name: "achievement.beyondPhysics.name", desc: "achievement.beyondPhysics.desc", unlocked: false, req: { tps: 1e9 } },
    { id: 20, name: "achievement.diversification.name", desc: "achievement.diversification.desc", unlocked: false, req: { eachAutoclickerAmount: 1 } },
    { id: 21, name: "achievement.clickArmy.name", desc: "achievement.clickArmy.desc", unlocked: false, req: { autoclickers: { id: 0, amount: 100 } } },
    { id: 22, name: "achievement.largeScaleMining.name", desc: "achievement.largeScaleMining.desc", unlocked: false, req: { autoclickers: { id: 1, amount: 100 } } },
    { id: 23, name: "achievement.totalComputing.name", desc: "achievement.totalComputing.desc", unlocked: false, req: { eachAutoclickerAmount: 50 } },
    { id: 24, name: "achievement.worldArchitect.name", desc: "achievement.worldArchitect.desc", unlocked: false, req: { eachAutoclickerAmount: 100 } },
    { id: 25, name: "achievement.realityBuilder.name", desc: "achievement.realityBuilder.desc", unlocked: false, req: { eachAutoclickerAmount: 150 } },
    { id: 5, name: "achievement.proofOfHumanity.name", desc: "achievement.proofOfHumanity.desc", unlocked: false, req: { verified: true }, reward: { humanityGems: 10 } },
    { id: 1000, name: "achievement.obsession.name", desc: "achievement.obsession.desc", unlocked: false, req: { autoclickers: { id: 0, amount: 500 } }, type: 'shadow' },
    { id: 1001, name: "achievement.minimalist.name", desc: "achievement.minimalist.desc", unlocked: false, req: { totalTokensEarned: 100000 }, type: 'shadow' },
];

export const newsFeed = [
    "news.0", "news.1", "news.2", "news.3", "news.4", "news.5", "news.6", "news.7", "news.8"
];

// -- CONSTANTES DE CONFIGURACIÓN DEL JUEGO --
export const HUMAN_BOOST_MULTIPLIER = 10;
export const PRICE_INCREASE_RATE = 1.15;
export const TIER_THRESHOLDS = [10, 50, 150, 250, 350, 450, 550];
export const GLOBAL_UPGRADE_THRESHOLDS = [1000, 10000, 1e5, 1e6, 1e7, 1e8, 1e9];