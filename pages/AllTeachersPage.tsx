
import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import TeacherCard from '../components/TeacherCard.tsx';
import SearchBar from '../components/SearchBar.tsx';
import { ChevronLeftIcon } from '../components/Icons.tsx';
import { useNavigation } from '../contexts/NavigationContext.tsx';
import { useData } from '../contexts/DataContext.tsx';
import { getAverageRating } from '../utils.ts';
import { useSEO } from '../hooks/useSEO.ts';

const teacherSortOptions = [
  { value: 'newest', label: 'Newest First' },
  { value: 'rating_desc', label: 'Highest Rated' },
  { value: 'name_asc', label: 'Name (A-Z)' },
  { value: 'name_desc', label: 'Name (Z-A)' },
  { value: 'experience_desc', label: 'Most Experienced' },
];
const ITEMS_PER_PAGE = 9;

const AllTeachersPage: React.FC = () => {
  const { teachers, users } = useData();
  const { handleNavigate } = useNavigation();
  const [visibleCount, setVisibleCount] = useState(ITEMS_PER_PAGE);
  const [sortOption, setSortOption] = useState('newest');
  const [searchQuery, setSearchQuery] = useState('');
  const loader = useRef(null);
  const isLoadingMore = useRef(false);

  useSEO(
    'All Teachers | clazz.lk',
    'Browse and find expert tutors for a variety of subjects across Sri Lanka.'
  );

  const onViewTeacher = (teacherId: string) => {
    const teacher = teachers.find(t => t.id === teacherId);
    if (teacher?.username) {
      handleNavigate({ name: 'teacher_profile_slug', slug: teacher.username });
    } else if (teacher) {
      // Fallback for older data without username
      handleNavigate({ name: 'teacher_profile', teacherId: teacher.id });
    }
  };
  const onBack = () => handleNavigate({ name: 'home' });

  const filteredAndSortedTeachers = useMemo(() => {
    const approvedTeachers = teachers.filter(t => t.registrationStatus === 'approved' && t.isPublished !== false);

    const filtered = approvedTeachers.filter(teacher => {
      if (!searchQuery.trim()) return true;
      const lowerQuery = searchQuery.toLowerCase();

      const locations = teacher.teachingLocations
        ? teacher.teachingLocations.map(l => `${l.instituteName} ${l.town} ${l.district}`).join(' ')
        : '';

      const searchableContent = [
        teacher.id,
        teacher.name,
        teacher.tagline,
        teacher.bio,
        teacher.contact?.location,
        ...teacher.subjects,
        ...teacher.qualifications,
        locations
      ].join(' ').toLowerCase();
      return searchableContent.includes(lowerQuery);
    });

    const userMap = new Map(users.map(u => [u.id, u]));

    return [...filtered].sort((a, b) => {
      switch (sortOption) {
        case 'newest':
          const userA = userMap.get(a.userId);
          const userB = userMap.get(b.userId);
          return new Date(userB?.createdAt || 0).getTime() - new Date(userA?.createdAt || 0).getTime();
        case 'rating_desc': return getAverageRating(b.ratings).average - getAverageRating(a.ratings).average;
        case 'name_desc': return b.name.localeCompare(a.name);
        case 'experience_desc': return b.experienceYears - a.experienceYears;
        case 'name_asc':
        default: return a.name.localeCompare(b.name);
      }
    });
  }, [teachers, users, searchQuery, sortOption]);

  useEffect(() => {
    setVisibleCount(ITEMS_PER_PAGE);
  }, [searchQuery, sortOption]);

  const paginatedTeachers = useMemo(() => {
    return filteredAndSortedTeachers.slice(0, visibleCount);
  }, [filteredAndSortedTeachers, visibleCount]);

  const handleObserver = useCallback((entries: IntersectionObserverEntry[]) => {
    const target = entries[0];
    if (target.isIntersecting && !isLoadingMore.current) {
      isLoadingMore.current = true;
      setVisibleCount(prev => prev + ITEMS_PER_PAGE);
    }
  }, []);

  useEffect(() => {
    isLoadingMore.current = false;
  }, [visibleCount]);

  useEffect(() => {
    const observer = new IntersectionObserver(handleObserver, {
      root: null,
      rootMargin: "200px",
      threshold: 0
    });
    const currentLoader = loader.current;
    if (currentLoader) {
      observer.observe(currentLoader);
    }
    return () => {
      if (currentLoader) {
        observer.unobserve(currentLoader);
      }
    };
  }, [handleObserver, paginatedTeachers]); // Added paginatedTeachers to dependency array

  return (
    <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8 animate-slideInUp">
      <div className="mb-8">
        <button onClick={onBack} className="flex items-center space-x-2 text-sm font-medium text-primary hover:text-primary-dark transition-colors">
          <ChevronLeftIcon className="h-5 w-5" />
          <span>Back to Home</span>
        </button>
      </div>

      <div className="text-center mb-8">
        <p className="mb-3 text-xs text-light-subtle dark:text-dark-subtle">
          Interested in teaching? <a href="https://info.clazz.lk" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline font-medium">Join as a teacher today</a>
        </p>
        <h1 className="text-4xl font-bold">Meet Our Educators</h1>
        <p className="mt-2 text-lg text-light-subtle dark:text-dark-subtle">Find the perfect teacher to guide you on your learning journey.</p>
      </div>

      <div className="sticky top-16 z-20 py-4 bg-light-background/80 dark:bg-dark-background/80 backdrop-blur-sm -mx-4 sm:-mx-6 lg:-mx-8 px-4 sm:px-6 lg:px-8 mb-8">
        <div className="max-w-4xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-4 items-center">
          <div className="md:col-span-2">
            <SearchBar searchQuery={searchQuery} setSearchQuery={setSearchQuery} />
          </div>
          <div className="flex items-center space-x-2">
            <label htmlFor="sort-teachers" className="text-sm font-medium flex-shrink-0">Sort by:</label>
            <select
              id="sort-teachers"
              value={sortOption}
              onChange={(e) => setSortOption(e.target.value)}
              className="w-full px-3 py-2 border border-light-border dark:border-dark-border text-light-text dark:text-dark-text bg-light-surface dark:bg-dark-surface rounded-md focus:outline-none focus:ring-primary focus:border-primary sm:text-sm"
            >
              {teacherSortOptions.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}
            </select>
          </div>
        </div>
      </div>

      {paginatedTeachers.length > 0 ? (
        <>
          <p className="text-sm text-light-subtle dark:text-dark-subtle mb-6">Showing {paginatedTeachers.length} of {filteredAndSortedTeachers.length} teachers.</p>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {paginatedTeachers.map(teacher => (
              <TeacherCard
                key={teacher.id}
                teacher={teacher}
                onViewProfile={onViewTeacher}
              />
            ))}
          </div>
          {paginatedTeachers.length < filteredAndSortedTeachers.length && (
            <div ref={loader} className="flex justify-center items-center h-20">
              <div className="w-8 h-8 border-4 border-dashed rounded-full animate-spin border-primary"></div>
            </div>
          )}
        </>
      ) : (
        <div className="text-center py-16 text-light-subtle dark:text-dark-subtle">
          <p className="text-xl font-semibold">No teachers found</p>
          <p>Try adjusting your search query or filters.</p>
        </div>
      )}
    </div>
  );
};

export default AllTeachersPage;
