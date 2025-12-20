import React, { useState, useMemo } from 'react';
import { useNavigation } from '../contexts/NavigationContext';
import { ChevronLeftIcon, SearchIcon } from '../components/Icons';
import ExamCard from '../components/ExamCard';
import { targetAudienceOptions } from '../data/mockData';
import { useSEO } from '../hooks/useSEO';

const AllExamsPage: React.FC = () => {
    const { upcomingExams, handleNavigate } = useNavigation();
    const [searchQuery, setSearchQuery] = useState('');
    const [audienceFilter, setAudienceFilter] = useState('all');

    useSEO(
        'All Upcoming Exams | clazz.lk',
        'Stay updated on all upcoming national and school exams in Sri Lanka.'
    );

    const filteredExams = useMemo(() => {
        const now = new Date();
        now.setHours(0, 0, 0, 0);

        return upcomingExams
            .filter(exam => new Date(exam.date) >= now)
            .filter(exam => {
                const matchesAudience = audienceFilter === 'all' || exam.targetAudience === audienceFilter;
                const matchesSearch = !searchQuery.trim() || exam.name.toLowerCase().includes(searchQuery.toLowerCase());
                return matchesAudience && matchesSearch;
            })
            .sort((a, b) => {
                if (a.isHighPriority !== b.isHighPriority) {
                    return a.isHighPriority ? -1 : 1;
                }
                return new Date(a.date).getTime() - new Date(b.date).getTime();
            });
    }, [upcomingExams, searchQuery, audienceFilter]);

    return (
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8 animate-slideInUp">
            <div className="mb-8">
                <button onClick={() => handleNavigate({ name: 'home' })} className="flex items-center space-x-2 text-sm font-medium text-primary hover:text-primary-dark transition-colors">
                    <ChevronLeftIcon className="h-5 w-5" />
                    <span>Back to Home</span>
                </button>
            </div>
            
            <div className="text-center mb-8">
                <h1 className="text-4xl font-bold">Upcoming Exams</h1>
                <p className="mt-2 text-lg text-light-subtle dark:text-dark-subtle">Plan your studies with this schedule of upcoming exams.</p>
            </div>

            <div className="sticky top-16 z-20 py-4 bg-light-background/80 dark:bg-dark-background/80 backdrop-blur-sm -mx-4 sm:px-6 lg:-mx-8 px-4 sm:px-6 lg:px-8 mb-8">
                <div className="max-w-4xl mx-auto flex flex-col md:flex-row gap-4">
                    <div className="relative flex-grow">
                        <input
                            type="text"
                            placeholder="Search for an exam..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 border border-light-border dark:border-dark-border rounded-md bg-light-surface dark:bg-dark-surface focus:ring-primary focus:border-primary"
                        />
                        <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-light-subtle dark:text-dark-subtle" />
                    </div>
                    <select
                        value={audienceFilter}
                        onChange={(e) => setAudienceFilter(e.target.value)}
                        className="w-full md:w-auto px-4 py-2 border border-light-border dark:border-dark-border rounded-md bg-light-surface dark:bg-dark-surface focus:ring-primary focus:border-primary"
                    >
                        <option value="all">All Audiences</option>
                        {targetAudienceOptions.map(opt => (
                            <option key={opt.value} value={opt.value}>{opt.label}</option>
                        ))}
                    </select>
                </div>
            </div>

            {filteredExams.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredExams.map(exam => (
                        <ExamCard key={exam.id} exam={exam} />
                    ))}
                </div>
            ) : (
                <div className="text-center py-16 text-light-subtle dark:text-dark-subtle">
                    <p className="text-xl font-semibold">No exams found</p>
                    <p>Try adjusting your search or filter.</p>
                </div>
            )}
        </div>
    );
};

export default AllExamsPage;