
import React from 'react';
import { motion } from 'framer-motion';
import { User, GraduationCap, BookOpen } from 'lucide-react';

// Custom Icons could be replaced by imported SVGs or Lucide icons
// Using HeroIcons names but you might need to map them to your project's icon set.
// Assuming CheckIcon, UserIcon etc exist in ../Icons or I will use text/emojis if generic.

interface CategoryStepProps {
    selected: 'teacher' | 'class' | 'course';
    onSelect: (category: 'teacher' | 'class' | 'course') => void;
}

const CategoryStep: React.FC<CategoryStepProps> = ({ selected, onSelect }) => {

    const categories = [
        { id: 'teacher', label: 'Find a Teacher', icon: User, color: 'bg-blue-500' },
        { id: 'class', label: 'Join a Class', icon: GraduationCap, color: 'bg-green-500' },
        { id: 'course', label: 'Buy a Course', icon: BookOpen, color: 'bg-purple-500' },
    ] as const;

    return (
        <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="flex flex-col items-center"
        >
            <h2 className="text-2xl font-bold text-white mb-8">What are you looking for?</h2>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full">
                {categories.map((cat) => (
                    <motion.button
                        key={cat.id}
                        whileHover={{ scale: 1.05, translateY: -5 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => onSelect(cat.id)}
                        className={`
                            relative overflow-hidden rounded-xl p-6 h-40 flex flex-col items-center justify-center gap-4
                            transition-all duration-300 border-2
                            ${selected === cat.id
                                ? 'bg-white text-gray-900 border-white shadow-lg'
                                : 'bg-white/5 text-white border-white/10 hover:bg-white/10 hover:border-white/30'}
                        `}
                    >
                        <div className={`p-3 rounded-full ${selected === cat.id ? 'bg-gray-100' : 'bg-white/10'}`}>
                            <cat.icon className="w-8 h-8" />
                        </div>
                        <span className="text-xl font-semibold">{cat.label}</span>

                        {/* Selected Indicator */}
                        {selected === cat.id && (
                            <motion.div
                                layoutId="outline"
                                className="absolute inset-0 border-4 border-blue-400/50 rounded-xl"
                                transition={{ duration: 0.2 }}
                            />
                        )}
                    </motion.button>
                ))}
            </div>
        </motion.div>
    );
};

export default CategoryStep;
