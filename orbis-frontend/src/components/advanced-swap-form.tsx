'use client';

import { useState } from 'react';
import type { SwapConfig } from '../types/relayer';
import { DEFAULT_SWAP_CONFIG } from '../types/relayer';

interface AdvancedSwapFormProps {
    config: SwapConfig;
    onConfigChange: (config: SwapConfig) => void;
}

export function AdvancedSwapForm({ config, onConfigChange }: AdvancedSwapFormProps) {
    const [localConfig, setLocalConfig] = useState<SwapConfig>(config);

    const handleChange = (field: keyof SwapConfig, value: any) => {
        const newConfig = { ...localConfig, [field]: value };
        setLocalConfig(newConfig);
        onConfigChange(newConfig);
    };

    const resetToDefaults = () => {
        setLocalConfig(DEFAULT_SWAP_CONFIG);
        onConfigChange(DEFAULT_SWAP_CONFIG);
    };

    const formatTime = (seconds: number): string => {
        if (seconds < 60) return `${seconds}s`;
        if (seconds < 3600) return `${Math.floor(seconds / 60)}m`;
        return `${Math.floor(seconds / 3600)}h`;
    };

    if (!config.showAdvanced) {
        return (
            <div className="mt-6">
                <button
                    onClick={() => handleChange('showAdvanced', true)}
                    className="text-sm text-purple-400 hover:text-purple-300 transition-colors flex items-center gap-2"
                >
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4" />
                    </svg>
                    Advanced Options
                </button>
            </div>
        );
    }

    return (
        <div className="mt-6 rounded-xl border border-gray-700 bg-gray-800/30 p-6 backdrop-blur">
            <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                    <svg className="h-5 w-5 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4" />
                    </svg>
                    Advanced Options
                </h3>
                <button
                    onClick={() => handleChange('showAdvanced', false)}
                    className="text-gray-400 hover:text-gray-300 transition-colors"
                >
                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                </button>
            </div>

            <div className="space-y-4">
                {/* Timelock Duration */}
                <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                        Timelock Duration ({formatTime(localConfig.timelockDuration)})
                    </label>
                    <div className="flex items-center gap-4">
                        <input
                            type="range"
                            min="300"
                            max="86400"
                            step="300"
                            value={localConfig.timelockDuration}
                            onChange={(e) => handleChange('timelockDuration', parseInt(e.target.value))}
                            className="flex-1 h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer slider"
                        />
                        <input
                            type="number"
                            value={localConfig.timelockDuration}
                            onChange={(e) => handleChange('timelockDuration', parseInt(e.target.value) || 3600)}
                            className="w-20 px-2 py-1 text-sm bg-gray-700 border border-gray-600 rounded text-white focus:outline-none focus:border-purple-500"
                        />
                    </div>
                    <p className="text-xs text-gray-400 mt-1">
                        Time before funds can be refunded if swap fails
                    </p>
                </div>

                {/* Finality Timelock */}
                <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                        Finality Timelock ({formatTime(localConfig.finalityTimelock)})
                    </label>
                    <div className="flex items-center gap-4">
                        <input
                            type="range"
                            min="300"
                            max="7200"
                            step="300"
                            value={localConfig.finalityTimelock}
                            onChange={(e) => handleChange('finalityTimelock', parseInt(e.target.value))}
                            className="flex-1 h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer slider"
                        />
                        <input
                            type="number"
                            value={localConfig.finalityTimelock}
                            onChange={(e) => handleChange('finalityTimelock', parseInt(e.target.value) || 1800)}
                            className="w-20 px-2 py-1 text-sm bg-gray-700 border border-gray-600 rounded text-white focus:outline-none focus:border-purple-500"
                        />
                    </div>
                    <p className="text-xs text-gray-400 mt-1">
                        Time to wait for transaction finality
                    </p>
                </div>

                {/* Exclusive Period */}
                <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                        Exclusive Period ({formatTime(localConfig.exclusivePeriod)})
                    </label>
                    <div className="flex items-center gap-4">
                        <input
                            type="range"
                            min="300"
                            max="14400"
                            step="300"
                            value={localConfig.exclusivePeriod}
                            onChange={(e) => handleChange('exclusivePeriod', parseInt(e.target.value))}
                            className="flex-1 h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer slider"
                        />
                        <input
                            type="number"
                            value={localConfig.exclusivePeriod}
                            onChange={(e) => handleChange('exclusivePeriod', parseInt(e.target.value) || 3600)}
                            className="w-20 px-2 py-1 text-sm bg-gray-700 border border-gray-600 rounded text-white focus:outline-none focus:border-purple-500"
                        />
                    </div>
                    <p className="text-xs text-gray-400 mt-1">
                        Time window for exclusive order execution
                    </p>
                </div>

                {/* Safety Deposit */}
                <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                        Maker Safety Deposit (TON)
                    </label>
                    <input
                        type="number"
                        step="0.001"
                        min="0.001"
                        value={(parseInt(localConfig.makerSafetyDeposit) / 1e9).toFixed(3)}
                        onChange={(e) => {
                            const tonAmount = parseFloat(e.target.value) || 0.01;
                            const nanotons = Math.floor(tonAmount * 1e9).toString();
                            handleChange('makerSafetyDeposit', nanotons);
                        }}
                        className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white focus:outline-none focus:border-purple-500"
                    />
                    <p className="text-xs text-gray-400 mt-1">
                        Security deposit to prevent malicious behavior
                    </p>
                </div>

                {/* Reset Button */}
                <div className="pt-4 border-t border-gray-700">
                    <button
                        onClick={resetToDefaults}
                        className="text-sm text-gray-400 hover:text-gray-300 transition-colors flex items-center gap-2"
                    >
                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                        </svg>
                        Reset to Defaults
                    </button>
                </div>
            </div>
        </div>
    );
} 