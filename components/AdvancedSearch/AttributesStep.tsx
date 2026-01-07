
import React from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, Search } from 'lucide-react';

interface AttributesStepProps {
    category: 'teacher' | 'class' | 'course';
    subject: string; setSubject: (s: string) => void;
    grade: string; setGrade: (g: string) => void;
    medium: string; setMedium: (m: string) => void;
    options: { subjects: string[], grades: string[], mediums: string[] };
    onBack: () => void;
    onSearch: () => void;
}

const AttributesStep: React.FC<AttributesStepProps> = ({
    category, subject, setSubject, grade, setGrade, medium, setMedium, options, onBack, onSearch
}) => {

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
                <div className="text-white font-semibold text-lg">Step 3 of 3</div>
            </div>

            <h2 className="text-2xl font-bold text-white mb-6 text-center">Refine your {category} search</h2>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                <div className="space-y-2">
                    <label className="text-white text-sm font-medium ml-1">Subject</label>
                    <select
                        value={subject}
                        onChange={(e) => setSubject(e.target.value)}
                        className="w-full bg-white/10 border border-white/20 text-white rounded-lg p-3 outline-none focus:ring-2 focus:ring-primary focus:border-transparent appearance-none"
                    >
                        <option value="" className="text-gray-900">Any Subject</option>
                        {options.subjects.map(s => <option key={s} value={s} className="text-gray-900">{s}</option>)}
                    </select>
                </div>

                <div className="space-y-2">
                    <label className="text-white text-sm font-medium ml-1">Grade / Audience</label>
                    <select
                        value={grade}
                        onChange={(e) => setGrade(e.target.value)}
                        className="w-full bg-white/10 border border-white/20 text-white rounded-lg p-3 outline-none focus:ring-2 focus:ring-primary focus:border-transparent appearance-none"
                    >
                        <option value="" className="text-gray-900">Any Grade</option>
                        {options.grades.map(g => <option key={g} value={g} className="text-gray-900">{g}</option>)}
                    </select>
                </div>

                <div className="space-y-2">
                    <label className="text-white text-sm font-medium ml-1">Medium</label>
                    <select
                        value={medium}
                        onChange={(e) => setMedium(e.target.value)}
                        className="w-full bg-white/10 border border-white/20 text-white rounded-lg p-3 outline-none focus:ring-2 focus:ring-primary focus:border-transparent appearance-none"
                    >
                        <option value="" className="text-gray-900">Any Medium</option>
                        {options.mediums.map(m => <option key={m} value={m} className="text-gray-900">{m}</option>)}
                    </select>
                </div>
            </div>

            <div className="flex justify-center mt-4">
                <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={onSearch}
                    className="w-full md:w-auto px-12 py-4 bg-gradient-to-r from-yellow-400 to-orange-500 text-white font-bold text-xl rounded-full shadow-xl hover:shadow-2xl transition-all flex items-center justify-center transform"
                >
                    <Search className="w-6 h-6 mr-3" />
                    Search Now
                </motion.button>
            </div>
        </motion.div>
    );
};

export default AttributesStep;
