import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import CourseCard from '../components/CourseCard.tsx';
import { ChevronLeftIcon } from '../components/Icons.tsx';
import SearchBar from '../components/SearchBar.tsx';
import { useNavigation } from '../contexts/NavigationContext.tsx';
import { useData } from '../contexts/DataContext.tsx';
import { getAverageRating } from '../utils.ts';
import { slugify, generateEntitySlug } from '../utils/slug.ts';
import { useSEO } from '../hooks/useSEO.ts';
import { targetAudienceOptions } from '../data/mockData.ts';

const ITEMS_PER_PAGE = 9;

const courseSortOptions = [
  { value: 'newest', label: 'Newest First' },
  { value: 'rating_desc', label: 'Highest Rated' },
  { value: 'title_asc', label: 'Title: A-Z' },
  { value: 'title_desc', label: 'Title: Z-A' },
  { value: 'fee_low', label: 'Price: Low to High' },
  { value: 'fee_high', label: 'Price: High to Low' },
];

const AllCoursesPage: React.FC = () => {
  const { teachers } = useData();
  const { handleNavigate, allSubjects, subjects } = useNavigation();
  const pageState = useNavigation().pageState;

  const [searchQuery, setSearchQuery] = useState(() => {
    return (pageState as any).filters?.searchQuery || '';
  });
  const [audienceFilter, setAudienceFilter] = useState('all');
  const [instituteFilter, setInstituteFilter] = useState('all');
  const [subjectFilter, setSubjectFilter] = useState('all');
  const [sortOption, setSortOption] = useState<string>('newest');
  const [visibleCount, setVisibleCount] = useState(ITEMS_PER_PAGE);
  const [isFilterVisible, setIsFilterVisible] = useState(true);
  const isLoadingMore = useRef(false);
  const loader = useRef(null);

  // Initialize filters from PageState
  useEffect(() => {
    const filters = (pageState as any).filters;
    if (filters) {
      if (filters.subject) setSubjectFilter(filters.subject);
      if (filters.audience) setAudienceFilter(filters.audience);
      if (filters.institute) setInstituteFilter(filters.institute);
      if (filters.grade && !filters.audience) setAudienceFilter(filters.grade);
    }
  }, [pageState]);

  // Scroll Logic for Sticky Header
  const lastScrollY = useRef(0);
  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;

      if (currentScrollY < 50) {
        setIsFilterVisible(true);
      } else if (currentScrollY > lastScrollY.current + 5) {
        setIsFilterVisible(false);
      } else if (currentScrollY < lastScrollY.current - 5) {
        setIsFilterVisible(true);
      }

      lastScrollY.current = currentScrollY;
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useSEO(
    'All Courses | clazz.lk',
    'Explore our comprehensive list of online courses to enhance your knowledge.'
  );

  const onViewCourse = (course: any, teacher: any) => handleNavigate({ name: 'course_detail_slug', slug: generateEntitySlug(course.title, course.id) });
  const onBack = () => handleNavigate({ name: 'home' });

  const approvedTeachers = useMemo(() => teachers.filter(t => t.registrationStatus === 'approved'), [teachers]);

  // Calculate unique subjects and max price from all courses
  const { maxPrice } = useMemo(() => {
    const allCourses = approvedTeachers.flatMap(teacher => teacher.courses);
    let max = 0;

    allCourses.forEach(course => {
      if (course.fee > max) {
        max = course.fee;
      }
    });

    return {
      maxPrice: Math.ceil(max / 1000) * 1000 // Round up to nearest 1000
    };
  }, [approvedTeachers]);

  const [priceFilter, setPriceFilter] = useState(maxPrice);

  // Effect to update the price filter's max value when the data changes
  useEffect(() => {
    setPriceFilter(maxPrice);
  }, [maxPrice]);

  const availableSubjects = useMemo(() => {
    if (audienceFilter === 'all') return allSubjects;
    return subjects[audienceFilter] || [];
  }, [audienceFilter, allSubjects, subjects]);

  const handleAudienceChange = (value: string) => {
    setAudienceFilter(value);
    setSubjectFilter('all'); // Reset subject when audience changes to ensure valid selection
  };

  const filteredAndSortedCourses = useMemo(() => {
    const allCourses = approvedTeachers.flatMap(teacher =>
      teacher.courses.map(course => ({ ...course, teacher }))
    );

    const filtered = allCourses.filter(item => {
      // Published filter
      if (!item.isPublished) return false;

      // Deleted filter
      if (item.isDeleted) return false;

      // Admin Approval filter
      if (item.adminApproval !== 'approved') return false;

      // Search query filter
      if (searchQuery.trim()) {
        const lowerQuery = searchQuery.toLowerCase();
        const searchableContent = [
          item.title,
          item.description,
          item.subject,
          item.teacher.name,
          item.teacher.id,
          item.teacher.username,
          item.teacher.contact?.location,
          item.teacher.teachingLocations?.map((l: any) => l.instituteName).join(' ')
        ].filter(Boolean).join(' ').toLowerCase();
        if (!searchableContent.includes(lowerQuery)) return false;
      }

      // Institute filter
      if (instituteFilter !== 'all') {
        const teacherHasInstitute = item.teacher.teachingLocations?.some((l: any) => l.instituteName === instituteFilter);
        if (!teacherHasInstitute) return false;
      }

      // Audience filter
      if (audienceFilter !== 'all') {
        let validSubjects = subjects[audienceFilter]?.map(s => s.value);

        if (!validSubjects) {
          const lowerAudience = audienceFilter.toLowerCase();
          const allKeys = Object.keys(subjects);
          for (const key of allKeys) {
            if ((lowerAudience.includes('secondary') || lowerAudience.includes('o/l')) && key.toLowerCase().includes('secondary')) {
              validSubjects = subjects[key].map(s => s.value);
              break;
            }
            if ((lowerAudience.includes('advanced level') || lowerAudience.includes('a/l')) && key.toLowerCase().includes('advanced')) {
              validSubjects = subjects[key].map(s => s.value);
              break;
            }
          }
        }

        // If even fallback fails, maybe we shouldn't filter strict? Or assume mismatch = empty?
        // If validSubjects is still undefined, it means this audience has no specific subject mapping (e.g. 'Other').
        // In that case, should we hide all courses? Or show all?
        // The previous logic `if (!validSubjects ... return false` hid EVERYTHING.
        // Better behavior: If no mapping found, SHOW ALL (return true) or proceed.
        // BUT, if it's "Secondary" and we failed to find mapping, we shouldn't show A/L subjects.
        // Robust fallback ideally finds the mapping.

        if (validSubjects && !validSubjects.includes(item.subject)) {
          return false;
        }
      }

      // Subject filter
      if (subjectFilter !== 'all' && item.subject !== subjectFilter) {
        return false;
      }

      // Price filter
      if (item.fee > priceFilter) {
        return false;
      }

      return true;
    });

    return [...filtered].sort((a, b) => {
      switch (sortOption) {
        case 'newest': return b.id.localeCompare(a.id);
        case 'rating_desc': return getAverageRating(b.ratings).average - getAverageRating(a.ratings).average;
        case 'title_desc': return b.title.localeCompare(a.title);
        case 'fee_high': return b.fee - a.fee;
        case 'fee_low': return a.fee - b.fee;
        case 'title_asc':
        default:
          return a.title.localeCompare(b.title);
      }
    });
  }, [approvedTeachers, searchQuery, sortOption, subjectFilter, priceFilter, audienceFilter, subjects, instituteFilter]);

  useEffect(() => {
    setVisibleCount(ITEMS_PER_PAGE);
  }, [searchQuery, sortOption, subjectFilter, priceFilter, audienceFilter, instituteFilter]);

  const paginatedCourses = useMemo(() => {
    return filteredAndSortedCourses.slice(0, visibleCount);
  }, [filteredAndSortedCourses, visibleCount]);

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
  }, [handleObserver, paginatedCourses]);

  const currencyFormatter = new Intl.NumberFormat('en-LK', { style: 'currency', currency: 'LKR', minimumFractionDigits: 0 });

  return (
    <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8 animate-slideInUp">
      <div className="mb-8">
        <button onClick={onBack} className="flex items-center space-x-2 text-sm font-medium text-primary hover:text-primary-dark transition-colors">
          <ChevronLeftIcon className="h-5 w-5" />
          <span>Back to Home</span>
        </button>
      </div>

      <div className="text-center mb-8">
        <h1 className="text-4xl font-bold">Explore All Courses</h1>
        <p className="mt-2 text-lg text-light-subtle dark:text-dark-subtle">Deepen your knowledge with structured courses from top educators.</p>
      </div>

      <div className={`sticky top-16 z-20 py-4 bg-light-background/80 dark:bg-dark-background/80 backdrop-blur-sm -mx-4 sm:px-6 lg:-mx-8 px-4 sm:px-6 lg:px-8 mb-8 transition-transform duration-300 ${isFilterVisible ? 'translate-y-0' : '-translate-y-full'}`}>
        <div className="max-w-5xl mx-auto space-y-4">
          <SearchBar searchQuery={searchQuery} setSearchQuery={setSearchQuery} />
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <label htmlFor="filter-audience" className="block text-sm font-medium text-light-text dark:text-dark-text mb-1">Audience</label>
              <select
                id="filter-audience"
                value={audienceFilter}
                onChange={(e) => handleAudienceChange(e.target.value)}
                className="w-full px-3 py-2 border border-light-border dark:border-dark-border text-light-text dark:text-dark-text bg-light-surface dark:bg-dark-surface rounded-md focus:outline-none focus:ring-primary focus:border-primary sm:text-sm"
              >
                <option value="all">All Audiences</option>
                {targetAudienceOptions.map(opt => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="filter-subject" className="block text-sm font-medium text-light-text dark:text-dark-text mb-1">Subject</label>
              <select
                id="filter-subject"
                value={subjectFilter}
                onChange={(e) => setSubjectFilter(e.target.value)}
                className="w-full px-3 py-2 border border-light-border dark:border-dark-border text-light-text dark:text-dark-text bg-light-surface dark:bg-dark-surface rounded-md focus:outline-none focus:ring-primary focus:border-primary sm:text-sm"
              >
                <option value="all">All Subjects</option>
                {availableSubjects.map(subject => <option key={subject.value} value={subject.value}>{subject.label}</option>)}
              </select>
            </div>

            <div>
              <label htmlFor="sort-courses" className="block text-sm font-medium text-light-text dark:text-dark-text mb-1">Sort by</label>
              <select
                id="sort-courses"
                value={sortOption}
                onChange={(e) => setSortOption(e.target.value)}
                className="w-full px-3 py-2 border border-light-border dark:border-dark-border text-light-text dark:text-dark-text bg-light-surface dark:bg-dark-surface rounded-md focus:outline-none focus:ring-primary focus:border-primary sm:text-sm"
              >
                {courseSortOptions.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}
              </select>
            </div>

            <div className="">
              <label htmlFor="filter-price" className="block text-sm font-medium text-light-text dark:text-dark-text mb-1">Max Price: <span className="font-bold text-primary">{currencyFormatter.format(priceFilter)}</span></label>
              <input
                id="filter-price"
                type="range"
                min="0"
                max={maxPrice}
                step={500}
                value={priceFilter}
                onChange={(e) => setPriceFilter(Number(e.target.value))}
                className="w-full h-2 bg-light-border dark:bg-dark-border rounded-lg appearance-none cursor-pointer accent-primary"
              />
            </div>
          </div>
        </div>
      </div>

      {paginatedCourses.length > 0 ? (
        <>
          <p className="text-sm text-light-subtle dark:text-dark-subtle mb-6">Showing {paginatedCourses.length} of {filteredAndSortedCourses.length} courses.</p>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-8">
            {paginatedCourses.map(({ teacher, ...course }) => (
              <CourseCard
                key={course.id}
                course={course}
                teacher={teacher}
                viewMode="public"
                onView={(c) => onViewCourse(c, teacher)}
              />
            ))}
          </div>
          {paginatedCourses.length < filteredAndSortedCourses.length && (
            <div ref={loader} className="flex justify-center items-center h-20">
              <div className="w-8 h-8 border-4 border-dashed rounded-full animate-spin border-primary"></div>
            </div>
          )}
        </>
      ) : (
        <div className="text-center py-16 text-light-subtle dark:text-dark-subtle">
          <p className="text-xl font-semibold">No courses found</p>
          <p>Try adjusting your search query or filters.</p>
        </div>
      )}
    </div>
  );
};

export default AllCoursesPage;
