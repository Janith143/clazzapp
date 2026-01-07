import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useData } from '../../contexts/DataContext';
import { useNavigation } from '../../contexts/NavigationContext';
import { Search, MapPin, BookOpen, GraduationCap, Users, Monitor, ArrowRight, ChevronDown } from 'lucide-react';
import { sriLankanDistricts, sriLankanTownsByDistrict, targetAudienceOptions, defaultSubjectsByAudience, secondarySchoolSubjects, advancedLevelSubjects } from '../../data/mockData';

type SearchCategory = 'teacher' | 'class' | 'course';
type ClassMode = 'all' | 'online' | 'physical' | 'both';

const AdvancedHeroFilter: React.FC = () => {
    const { teachers } = useData();
    const { handleNavigate, subjects: dynamicSubjects } = useNavigation();

    // --- State ---
    const [isExpanded, setIsExpanded] = useState(false);
    const [category, setCategory] = useState<SearchCategory>('teacher');

    // Filters
    const [searchQuery, setSearchQuery] = useState('');
    const [mode, setMode] = useState<ClassMode>('all');
    const [district, setDistrict] = useState<string>('');
    const [town, setTown] = useState<string>('');
    const [institute, setInstitute] = useState<string>('');
    const [audience, setAudience] = useState<string>('');
    const [subject, setSubject] = useState<string>('');
    const [medium, setMedium] = useState<string>('');

    // --- Data Extraction ---
    const activeTeachers = useMemo(() => {
        return teachers.filter(t => t.registrationStatus === 'approved' && t.isPublished !== false);
    }, [teachers]);

    // Extract unique Institutes from teachers, filtered by District/Town
    const institutes = useMemo(() => {
        const uniqueInstitutes = new Set<string>();
        activeTeachers.forEach(t => {
            // Check Teaching Locations (if structured data available)
            t.teachingLocations?.forEach(loc => {
                // If filtering by district, skip if location doesn't match (if location has district info)
                // Assuming 'loc' might have district/town or we might not be able to filter it perfectly without it.
                // For now, rely on individualClasses which has explicit location data.
                // If loc has district/town, use it.
                const locDistrict = (loc as any).district;
                const locTown = (loc as any).town;

                if (district && locDistrict && locDistrict !== district) return;
                if (town && locTown && locTown !== town) return;

                if (loc.instituteName) uniqueInstitutes.add(loc.instituteName);
            });

            // Check Individual Classes (Primary source of structured location data)
            t.individualClasses?.forEach(c => {
                if (district && c.district !== district) return;
                if (town && c.town !== town) return;
                if (c.institute) uniqueInstitutes.add(c.institute);
            });
        });
        return Array.from(uniqueInstitutes).sort();
    }, [activeTeachers, district, town]);

    const attributes = useMemo(() => {
        const subjects = new Set<string>();
        const mediums = new Set<string>();

        activeTeachers.forEach(t => {
            t.subjects.forEach(s => subjects.add(s));
            t.teachingItems?.forEach(item => {
                if (item.subject) subjects.add(item.subject);
                item.mediums.forEach(m => mediums.add(m));
            });
            t.individualClasses.forEach(c => {
                if (c.subject) subjects.add(c.subject);
                if (c.medium) mediums.add(c.medium);
            });
            t.courses.forEach(c => {
                if (c.subject) subjects.add(c.subject);
                if (c.medium) mediums.add(c.medium);
            });
        });

        let subjectList = Array.from(subjects).sort();

        // Filter subjects by audience if selected
        if (audience) {
            let allowedSubjects: Set<string> | undefined;

            // 1. Try authoritative source from Admin Dashboard (dynamicSubjects)
            if (dynamicSubjects && dynamicSubjects[audience]) {
                allowedSubjects = new Set(dynamicSubjects[audience].map(s => s.value));
            }

            // 2. Fallback: Check for substring matches if exact key lookup fails
            if (!allowedSubjects) {
                const lowerAudience = audience.toLowerCase();

                // Check dynamicSubjects keys for match
                if (dynamicSubjects) {
                    for (const [key, subList] of Object.entries(dynamicSubjects)) {
                        if ((lowerAudience.includes('secondary') || lowerAudience.includes('o/l')) && key.toLowerCase().includes('secondary')) {
                            allowedSubjects = new Set(subList.map(s => s.value));
                            break;
                        }
                        if ((lowerAudience.includes('advanced level') || lowerAudience.includes('a/l')) && key.toLowerCase().includes('advanced')) {
                            allowedSubjects = new Set(subList.map(s => s.value));
                            break;
                        }
                    }
                }

                // 3. Fallback to hardcoded/mock lists if dynamic failed entirely
                if (!allowedSubjects) {
                    if (lowerAudience.includes('secondary') || lowerAudience.includes('grade 6') || lowerAudience.includes('o/l')) {
                        allowedSubjects = new Set(secondarySchoolSubjects.map(s => s.value));
                    } else if (lowerAudience.includes('advanced level') || lowerAudience.includes('a/l')) {
                        allowedSubjects = new Set(advancedLevelSubjects.map(s => s.value));
                    }
                }
            }

            if (allowedSubjects) {
                subjectList = subjectList.filter(s => allowedSubjects!.has(s));
            }
        }

        return {
            subjects: subjectList,
            mediums: Array.from(mediums).sort()
        };
    }, [teachers, audience, dynamicSubjects]);

    // --- Handlers ---
    const handleCategorySelect = (c: SearchCategory) => {
        if (category === c && isExpanded) {
            setIsExpanded(false);
            return;
        }
        setCategory(c);
        setIsExpanded(true);
        if (c === 'course') {
            setMode('all');
            setDistrict('');
            setTown('');
            setInstitute('');
        }
    };

    const handleSearch = () => {
        let routeName = '';
        if (category === 'teacher') routeName = 'all_teachers';
        else if (category === 'course') routeName = 'all_courses';
        else routeName = 'all_classes';

        const filters = {
            searchQuery: searchQuery.trim() || undefined,
            mode: mode !== 'all' ? mode : undefined,
            district,
            town,
            institute,
            audience,
            subject,
            medium
        };

        const cleanFilters = Object.fromEntries(Object.entries(filters).filter(([_, v]) => v));
        handleNavigate({ name: routeName, filters: cleanFilters } as any);
    };

    return (
        <div className="w-full max-w-5xl mx-auto px-4 py-8 relative z-20 font-sans">
            <div className="text-center mb-6">
                <motion.h1
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6, ease: "easeOut" }}
                    className="text-4xl md:text-6xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-light-text to-primary dark:from-white dark:to-primary-light mb-6 drop-shadow-sm tracking-tight"
                >
                    Find Your Perfect Learning Path
                </motion.h1>
                <motion.p
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.3, duration: 0.6 }}
                    className="text-lg md:text-xl text-light-subtle dark:text-gray-300 max-w-2xl mx-auto leading-relaxed"
                >
                    Connect with expert teachers, join live classes, or master courses.
                </motion.p>
            </div>

            <motion.div
                layout
                className={`
                    relative overflow-hidden rounded-3xl transition-all duration-500 ease-[cubic-bezier(0.25,0.1,0.25,1)]
                    bg-white/80 dark:bg-white/5 backdrop-blur-xl border border-white/20 dark:border-white/10 shadow-2xl
                    ${isExpanded ? 'p-5 md:p-6' : 'p-6 md:p-8'}
                `}
            >
                {/* Decorative gradients */}
                <div className="absolute -top-24 -right-24 w-64 h-64 bg-primary/20 rounded-full blur-3xl pointer-events-none" />
                <div className="absolute -bottom-24 -left-24 w-64 h-64 bg-secondary/20 rounded-full blur-3xl pointer-events-none" />

                {/* Category Selection */}
                <div className={`grid gap-4 transition-all duration-500 ${isExpanded ? 'grid-cols-3 mb-8' : 'grid-cols-1 md:grid-cols-3'}`}>
                    {(['teacher', 'class', 'course'] as SearchCategory[]).map((cat) => (
                        <motion.button
                            key={cat}
                            onClick={() => handleCategorySelect(cat)}
                            whileHover={{ scale: 1.02, y: -2 }}
                            whileTap={{ scale: 0.98 }}
                            className={`
                                group relative flex items-center justify-center p-4 rounded-2xl transition-all duration-300 border
                                ${category === cat
                                    ? 'bg-gradient-to-br from-primary to-primary-dark text-white border-transparent shadow-lg shadow-primary/30'
                                    : 'bg-white dark:bg-white/5 text-gray-600 dark:text-gray-300 border-gray-200 dark:border-white/10 hover:border-primary/50 hover:bg-primary/5 dark:hover:bg-white/10'}
                                ${!isExpanded ? 'h-28 flex-col space-y-3' : 'h-12 space-x-2'}
                            `}
                        >
                            <div className={`
                                flex items-center justify-center rounded-xl transition-all duration-300
                                ${category === cat ? 'bg-white/20' : 'bg-gray-100 dark:bg-white/10 group-hover:bg-primary/20'}
                                ${!isExpanded ? 'w-12 h-12' : 'w-6 h-6'}
                            `}>
                                {cat === 'teacher' && <Users className={!isExpanded ? "w-6 h-6" : "w-3 h-3"} />}
                                {cat === 'class' && <Monitor className={!isExpanded ? "w-6 h-6" : "w-3 h-3"} />}
                                {cat === 'course' && <BookOpen className={!isExpanded ? "w-6 h-6" : "w-3 h-3"} />}
                            </div>
                            <span className={`font-bold capitalize tracking-wide ${!isExpanded ? 'text-lg' : 'text-sm'}`}>
                                {cat}s
                            </span>
                        </motion.button>
                    ))}
                </div>

                {/* Expanded Search Panel */}
                <AnimatePresence>
                    {isExpanded && (
                        <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                            className="space-y-6"
                        >
                            {/* Search Bar */}
                            <div className="relative group">
                                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                    <Search className="w-6 h-6 text-gray-400 group-focus-within:text-primary transition-colors" />
                                </div>
                                <input
                                    type="text"
                                    placeholder={`Search for ${category}s by name, topic, or keywords...`}
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="block w-full pl-14 pr-4 py-4 rounded-xl text-lg 
                                    bg-gray-50 dark:bg-black/20 border-2 border-gray-100 dark:border-white/10 
                                    text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500
                                    focus:border-primary focus:bg-white dark:focus:bg-black/40 focus:ring-0 focus:outline-none 
                                    transition-all duration-200 shadow-inner"
                                />
                            </div>

                            {/* Filters Grid */}
                            <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 md:gap-6">
                                {/* Mode */}
                                {category !== 'course' && (
                                    <div className="space-y-2">
                                        <label className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider ml-1">Mode</label>
                                        <div className="relative group">
                                            <select
                                                value={mode}
                                                onChange={(e) => {
                                                    const newMode = e.target.value as ClassMode;
                                                    setMode(newMode);
                                                    if (newMode === 'online') {
                                                        setDistrict('');
                                                        setTown('');
                                                        setInstitute('');
                                                    }
                                                }}
                                                className="w-full appearance-none pl-3 md:pl-4 pr-8 md:pr-10 py-3 rounded-xl bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 text-base text-gray-900 dark:text-white focus:border-primary focus:ring-1 focus:ring-primary focus:outline-none transition-all cursor-pointer hover:bg-white dark:hover:bg-white/10 truncate"
                                            >
                                                <option value="all" className="text-gray-900 bg-white">Any Mode</option>
                                                <option value="online" className="text-gray-900 bg-white">Online</option>
                                                <option value="physical" className="text-gray-900 bg-white">Physical</option>
                                                <option value="both" className="text-gray-900 bg-white">Both</option>
                                            </select>
                                            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none group-hover:text-primary transition-colors" />
                                        </div>
                                    </div>
                                )}

                                {/* District - Hide if Online */}
                                {category !== 'course' && mode !== 'online' && (
                                    <div className="space-y-2">
                                        <label className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider ml-1">District</label>
                                        <div className="relative group">
                                            <select
                                                value={district}
                                                onChange={(e) => { setDistrict(e.target.value); setTown(''); }}
                                                className="w-full appearance-none pl-3 md:pl-4 pr-8 md:pr-10 py-3 rounded-xl bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 text-base text-gray-900 dark:text-white focus:border-primary focus:ring-1 focus:ring-primary focus:outline-none transition-all cursor-pointer hover:bg-white dark:hover:bg-white/10 truncate"
                                            >
                                                <option value="" className="text-gray-900 bg-white">All Districts</option>
                                                {sriLankanDistricts.map((d: string) => <option key={d} value={d} className="text-gray-900 bg-white">{d}</option>)}
                                            </select>
                                            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none group-hover:text-primary transition-colors" />
                                        </div>
                                    </div>
                                )}

                                {/* Town - Only show if District is selected */}
                                {category !== 'course' && district && (
                                    <div className="space-y-2">
                                        <label className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider ml-1">Town</label>
                                        <div className="relative group">
                                            <select
                                                value={town}
                                                onChange={(e) => setTown(e.target.value)}
                                                className="w-full appearance-none pl-3 md:pl-4 pr-8 md:pr-10 py-3 rounded-xl bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 text-base text-gray-900 dark:text-white focus:border-primary focus:ring-1 focus:ring-primary focus:outline-none transition-all cursor-pointer hover:bg-white dark:hover:bg-white/10 truncate"
                                            >
                                                <option value="" className="text-gray-900 bg-white">All Towns</option>
                                                {(district && sriLankanTownsByDistrict[district]) && sriLankanTownsByDistrict[district].map((t: string) => (
                                                    <option key={t} value={t} className="text-gray-900 bg-white">{t}</option>
                                                ))}
                                            </select>
                                            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none group-hover:text-primary transition-colors" />
                                        </div>
                                    </div>
                                )}

                                {/* Institute - Hide if Online, Gray out if no District */}
                                {category !== 'course' && mode !== 'online' && (
                                    <div className="space-y-2">
                                        <label className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider ml-1">Institute</label>
                                        <div className="relative group">
                                            <select
                                                value={institute}
                                                onChange={(e) => setInstitute(e.target.value)}
                                                disabled={!district}
                                                className={`w-full appearance-none pl-3 md:pl-4 pr-8 md:pr-10 py-3 rounded-xl bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 text-base text-gray-900 dark:text-white focus:border-primary focus:ring-1 focus:ring-primary focus:outline-none transition-all cursor-pointer hover:bg-white dark:hover:bg-white/10 truncate ${!district ? 'opacity-50 cursor-not-allowed' : ''}`}
                                            >
                                                <option value="" className="text-gray-900 bg-white">All Institutes</option>
                                                {institutes.map(i => <option key={i} value={i} className="text-gray-900 bg-white">{i}</option>)}
                                            </select>
                                            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none group-hover:text-primary transition-colors" />
                                        </div>
                                    </div>
                                )}

                                {/* Audience */}
                                <div className="space-y-2">
                                    <label className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider ml-1">Audience</label>
                                    <div className="relative group">
                                        <select
                                            value={audience}
                                            onChange={(e) => { setAudience(e.target.value); setSubject(''); }}
                                            className="w-full appearance-none pl-3 md:pl-4 pr-8 md:pr-10 py-3 rounded-xl bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 text-base text-gray-900 dark:text-white focus:border-primary focus:ring-1 focus:ring-primary focus:outline-none transition-all cursor-pointer hover:bg-white dark:hover:bg-white/10 truncate"
                                        >
                                            <option value="" className="text-gray-900 bg-white">All Audiences</option>
                                            {targetAudienceOptions.map(a => <option key={a.value} value={a.value} className="text-gray-900 bg-white">{a.label}</option>)}
                                        </select>
                                        <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none group-hover:text-primary transition-colors" />
                                    </div>
                                </div>

                                {/* Subject - Only show if Audience is selected */}
                                {audience && (
                                    <div className="space-y-2">
                                        <label className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider ml-1">Subject</label>
                                        <div className="relative group">
                                            <select
                                                value={subject}
                                                onChange={(e) => setSubject(e.target.value)}
                                                className="w-full appearance-none pl-3 md:pl-4 pr-8 md:pr-10 py-3 rounded-xl bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 text-base text-gray-900 dark:text-white focus:border-primary focus:ring-1 focus:ring-primary focus:outline-none transition-all cursor-pointer hover:bg-white dark:hover:bg-white/10 truncate"
                                            >
                                                <option value="" className="text-gray-900 bg-white">All Subjects</option>
                                                {attributes.subjects.map(s => <option key={s} value={s} className="text-gray-900 bg-white">{s}</option>)}
                                            </select>
                                            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none group-hover:text-primary transition-colors" />
                                        </div>
                                    </div>
                                )}

                                {/* Medium */}
                                <div className="space-y-2">
                                    <label className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider ml-1">Medium</label>
                                    <div className="relative group">
                                        <select
                                            value={medium}
                                            onChange={(e) => setMedium(e.target.value)}
                                            className="w-full appearance-none pl-3 md:pl-4 pr-8 md:pr-10 py-3 rounded-xl bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 text-base text-gray-900 dark:text-white focus:border-primary focus:ring-1 focus:ring-primary focus:outline-none transition-all cursor-pointer hover:bg-white dark:hover:bg-white/10 truncate"
                                        >
                                            <option value="" className="text-gray-900 bg-white">All Mediums</option>
                                            {attributes.mediums.map(m => <option key={m} value={m} className="text-gray-900 bg-white">{m}</option>)}
                                        </select>
                                        <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none group-hover:text-primary transition-colors" />
                                    </div>
                                </div>
                            </div>

                            {/* Action Bar */}
                            <div className="pt-6 flex flex-col sm:flex-row justify-between items-center border-t border-gray-200 dark:border-white/10 mt-6 gap-4 sm:gap-0">
                                <div className="order-2 sm:order-1">
                                    {(searchQuery || mode !== 'all' || district || town || institute || audience || subject || medium) && (
                                        <button
                                            onClick={() => {
                                                setSearchQuery('');
                                                setMode('all');
                                                setDistrict('');
                                                setTown('');
                                                setInstitute('');
                                                setAudience('');
                                                setSubject('');
                                                setMedium('');
                                            }}
                                            className="text-sm text-gray-500 hover:text-red-500 dark:text-gray-400 dark:hover:text-red-400 font-medium transition-colors flex items-center space-x-1"
                                        >
                                            <span>Reset Filters</span>
                                        </button>
                                    )}
                                </div>
                                <motion.button
                                    whileHover={{ scale: 1.05 }}
                                    whileTap={{ scale: 0.95 }}
                                    onClick={handleSearch}
                                    className="order-1 sm:order-2 w-full sm:w-auto flex items-center justify-center space-x-2 px-10 py-4 bg-gradient-to-r from-primary to-purple-600 text-white text-lg font-bold rounded-2xl shadow-xl hover:shadow-2xl hover:shadow-primary/30 transition-all transform hover:-translate-y-1"
                                >
                                    <span>Search {category === 'class' ? 'Classes' : category === 'teacher' ? 'Teachers' : 'Courses'}</span>
                                    <ArrowRight className="w-6 h-6" />
                                </motion.button>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </motion.div>
        </div>
    );
};

export default AdvancedHeroFilter;
