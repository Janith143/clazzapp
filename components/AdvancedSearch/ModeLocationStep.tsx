
import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, ArrowRight } from 'lucide-react'; // Assuming generic Left/Right icons
import FormInput from '../FormInput'; // Or use standard select

interface ModeLocationStepProps {
    mode: 'all' | 'online' | 'physical' | 'both';
    setMode: (m: 'all' | 'online' | 'physical' | 'both') => void;
    district: string;
    setDistrict: (d: string) => void;
    town: string;
    setTown: (t: string) => void;
    districts: string[];
    townsByDistrict: Record<string, Set<string>>;
    onNext: () => void;
    onBack: () => void;
}

const ModeLocationStep: React.FC<ModeLocationStepProps> = ({
    mode, setMode, district, setDistrict, town, setTown, districts, townsByDistrict, onNext, onBack
}) => {

    const modes = [
        { id: 'online', label: 'Online Only' },
        { id: 'physical', label: 'Physical (In-Person)' },
        { id: 'both', label: 'Hybrid / Both' },
        { id: 'all', label: 'Any Mode' }
    ] as const;

    const showLocation = mode === 'physical' || mode === 'both';

    return (
        <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="flex flex-col w-full"
        >
            <div className="flex justify-between items-center mb-6">
                <button onClick={onBack} className="text-white/70 hover:text-white flex items-center">
                    <ArrowLeft className="w-5 h-5 mr-1" /> Back
                </button>
                <div className="text-white font-semibold text-lg">Step 2 of 3</div>
            </div>

            <h2 className="text-2xl font-bold text-white mb-6 text-center">How do you want to learn?</h2>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                {modes.map((m) => (
                    <button
                        key={m.id}
                        onClick={() => {
                            setMode(m.id);
                            // If switching to online/all, clear location to avoid confusion? 
                            // Or keep it. Let's keep it but hide fields.
                        }}
                        className={`
                            py-3 px-4 rounded-lg font-medium transition-all
                            ${mode === m.id
                                ? 'bg-primary text-white shadow-lg ring-2 ring-white/50'
                                : 'bg-white/10 text-white hover:bg-white/20'}
                        `}
                    >
                        {m.label}
                    </button>
                ))}
            </div>

            <AnimatePresence>
                {showLocation && (
                    <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8 overflow-hidden"
                    >
                        <div className="space-y-2">
                            <label className="text-white text-sm font-medium ml-1">District</label>
                            <select
                                value={district}
                                onChange={(e) => { setDistrict(e.target.value); setTown(''); }}
                                className="w-full bg-white/10 border border-white/20 text-white rounded-lg p-3 outline-none focus:ring-2 focus:ring-primary focus:border-transparent appearance-none"
                            >
                                <option value="" className="text-gray-900">Select District</option>
                                {districts.map(d => <option key={d} value={d} className="text-gray-900">{d}</option>)}
                            </select>
                        </div>

                        <div className="space-y-2">
                            <label className="text-white text-sm font-medium ml-1">Town</label>
                            <select
                                value={town}
                                onChange={(e) => setTown(e.target.value)}
                                disabled={!district}
                                className="w-full bg-white/10 border border-white/20 text-white rounded-lg p-3 outline-none focus:ring-2 focus:ring-primary focus:border-transparent appearance-none disabled:opacity-50"
                            >
                                <option value="" className="text-gray-900">Select Town</option>
                                {district && townsByDistrict[district] && Array.from(townsByDistrict[district]).sort().map(t => (
                                    <option key={t} value={t} className="text-gray-900">{t}</option>
                                ))}
                            </select>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            <div className="flex justify-end">
                <button
                    onClick={onNext}
                    className="flex items-center bg-white text-primary px-8 py-3 rounded-xl font-bold text-lg hover:bg-gray-100 transition-colors shadow-lg"
                >
                    Next <ArrowRight className="w-5 h-5 ml-2" />
                </button>
            </div>
        </motion.div>
    );
};

export default ModeLocationStep;
