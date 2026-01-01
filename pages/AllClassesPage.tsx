
import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import ClassCard from '../components/ClassCard.tsx';
import { ChevronLeftIcon } from '../components/Icons.tsx';
import SearchBar from '../components/SearchBar.tsx';
import SearchableSelect from '../components/SearchableSelect.tsx';
import { sriLankanDistricts, sriLankanTownsByDistrict, targetAudienceOptions } from '../data/mockData.ts';
import { getDynamicClassStatus } from '../utils.ts';
import { slugify } from '../utils/slug.ts';
import { useNavigation } from '../contexts/NavigationContext.tsx';
import { useData } from '../contexts/DataContext.tsx';

import { useAuth } from '../contexts/AuthContext.tsx';
import { useUI } from '../contexts/UIContext.tsx';

const ITEMS_PER_PAGE = 9;

const classSortOptions = [
  { value: 'newest', label: 'Newest First' },
  { value: 'date_asc', label: 'Date: Upcoming First' },
  { value: 'date_desc', label: 'Date: Latest First' },
  { value: 'fee_low', label: 'Fee: Low to High' },
  { value: 'fee_high', label: 'Fee: High to Low' },
];

const AllClassesPage: React.FC = () => {
  const { teachers } = useData();
  const { handleNavigate, allSubjects, subjects, pageState } = useNavigation();
  const options = (pageState as any).options;

  const [searchQuery, setSearchQuery] = useState('');
  const [districtFilter, setDistrictFilter] = useState('all');
  const [townFilter, setTownFilter] = useState('all');
  const [audienceFilter, setAudienceFilter] = useState('all');
  const [subjectFilter, setSubjectFilter] = useState('all');
  const [mediumFilter, setMediumFilter] = useState('all');
  const [modeFilter, setModeFilter] = useState<'all' | 'Online' | 'Physical'>('all');
  const [paymentFilter, setPaymentFilter] = useState<'all' | 'platform' | 'manual'>('all');
  const [sortOption, setSortOption] = useState('date_asc');
  const [showLiveOnly, setShowLiveOnly] = useState(false);
  const [isFilterVisible, setIsFilterVisible] = useState(true);

  const [visibleCount, setVisibleCount] = useState(ITEMS_PER_PAGE);
  const isLoadingMore = useRef(false);
  const loader = useRef(null);

  // Scroll Logic for Sticky Header
  const lastScrollY = useRef(0);
  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;

      if (currentScrollY < 50) {
        setIsFilterVisible(true);
      } else if (currentScrollY > lastScrollY.current + 5) { // Threshold to avoid jitter
        setIsFilterVisible(false);
      } else if (currentScrollY < lastScrollY.current - 5) {
        setIsFilterVisible(true);
      }

      lastScrollY.current = currentScrollY;
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const onViewClass = (classInfo: any, teacher: any) => handleNavigate({ name: 'class_detail_slug', slug: slugify(classInfo.title) });
  const onBack = () => handleNavigate({ name: 'home' });

  const approvedTeachers = useMemo(() => teachers.filter(t => t.registrationStatus === 'approved'), [teachers]);

  const { maxPrice } = useMemo(() => {
    const all_classes = approvedTeachers.flatMap(t => t.individualClasses);
    let max = 0;
    all_classes.forEach(classInfo => {
      if (classInfo.fee > max) {
        max = classInfo.fee;
      }
    });
    return {
      maxPrice: Math.ceil(max / 500) * 500
    };
  }, [approvedTeachers]);

  const [priceFilter, setPriceFilter] = useState(maxPrice);

  useEffect(() => {
    setPriceFilter(maxPrice);
  }, [maxPrice]);


  const townOptions = useMemo(() => {
    if (districtFilter === 'all') return [];
    const towns = sriLankanTownsByDistrict[districtFilter] || [];
    return [{ value: 'all', label: 'All Towns' }, ...towns.map(t => ({ value: t, label: t }))];
  }, [districtFilter]);

  const availableSubjects = useMemo(() => {
    if (audienceFilter === 'all') return allSubjects;
    return subjects[audienceFilter] || [];
  }, [audienceFilter, allSubjects, subjects]);

  const liveClassesAvailable = useMemo(() => {
    return approvedTeachers.some(teacher =>
      teacher.individualClasses.some(classInfo =>
        classInfo.isPublished && (classInfo.mode === 'Online' || classInfo.mode === 'Both') && getDynamicClassStatus(classInfo) === 'live'
      )
    );
  }, [approvedTeachers]);

  const handleDistrictChange = (value: string) => {
    setDistrictFilter(value);
    setTownFilter('all');
  };

  const handleAudienceChange = (value: string) => {
    setAudienceFilter(value);
    setSubjectFilter('all'); // Reset subject when audience changes to ensure valid selection
  };

  const filteredAndSortedClasses = useMemo(() => {
    const allPotentialClasses = approvedTeachers.flatMap(teacher =>
      teacher.individualClasses
        .filter(classInfo => classInfo.isPublished && classInfo.status !== 'canceled')
        .map(classInfo => ({ ...classInfo, teacher }))
    );

    const filtered = allPotentialClasses.filter(item => {
      const dynamicStatus = getDynamicClassStatus(item);

      if (showLiveOnly) {
        const isOnlineOrHybrid = item.mode === 'Online' || item.mode === 'Both';
        if (dynamicStatus !== 'live' || !isOnlineOrHybrid) {
          return false;
        }
      } else {
        if (dynamicStatus === 'finished') {
          return false;
        }
      }

      const lowerQuery = searchQuery.toLowerCase();
      const searchableContent = [
        item.title,
        item.description,
        item.subject,
        item.teacher.name,
        item.teacher.id, // Enable searching by Teacher ID
        item.teacher.username, // Enable searching by username
        item.teacher.contact?.location,
        item.institute,
        item.town,
        item.district
      ].filter(Boolean).join(' ').toLowerCase();

      const matchesSearch = !searchQuery.trim() || searchableContent.includes(lowerQuery);

      const matchesMode = modeFilter === 'all' || item.mode === modeFilter || item.mode === 'Both';
      const matchesDistrict = districtFilter === 'all' || item.district === districtFilter;
      const matchesTown = townFilter === 'all' || item.town === townFilter;
      const matchesPayment = paymentFilter === 'all' ||
        (paymentFilter === 'platform' && (item.paymentMethod === 'platform' || !item.paymentMethod)) ||
        (paymentFilter === 'manual' && item.paymentMethod === 'manual');

      // Filter by Audience
      const matchesAudience = audienceFilter === 'all' || item.targetAudience === audienceFilter;

      // Filter by Subject
      const matchesSubject = subjectFilter === 'all' || item.subject === subjectFilter;

      // Filter by Medium
      const matchesMedium = mediumFilter === 'all' || item.medium === mediumFilter;

      if (item.fee > priceFilter) {
        return false;
      }

      return matchesSearch && matchesMode && matchesDistrict && matchesTown && matchesPayment && matchesAudience && matchesSubject && matchesMedium;
    });

    return [...filtered].sort((a, b) => {
      switch (sortOption) {
        case 'newest': return b.id - a.id;
        case 'date_desc': return new Date(b.date).getTime() - new Date(a.date).getTime();
        case 'fee_high': return b.fee - a.fee;
        case 'fee_low': return a.fee - b.fee;
        case 'date_asc':
        default: return new Date(a.date).getTime() - new Date(b.date).getTime();
      }
    });
  }, [approvedTeachers, searchQuery, sortOption, modeFilter, districtFilter, townFilter, showLiveOnly, paymentFilter, priceFilter, audienceFilter, subjectFilter, mediumFilter]);

  useEffect(() => {
    setVisibleCount(ITEMS_PER_PAGE);
  }, [searchQuery, sortOption, modeFilter, districtFilter, townFilter, showLiveOnly, paymentFilter, priceFilter, audienceFilter, subjectFilter, mediumFilter]);

  const paginatedClasses = useMemo(() => {
    return filteredAndSortedClasses.slice(0, visibleCount);
  }, [filteredAndSortedClasses, visibleCount]);

  const hasMore = paginatedClasses.length < filteredAndSortedClasses.length;

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
  }, [handleObserver, paginatedClasses]); // Added paginatedClasses to dependencies

  const pageTitle = options?.ongoingOnly && showLiveOnly ? "Ongoing Live Classes" : "Explore All Classes";
  const pageSubtitle = options?.ongoingOnly && showLiveOnly
    ? "Join these classes happening right now!"
    : "Find individual and group classes that fit your schedule.";

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
        <h1 className="text-4xl font-bold">{pageTitle}</h1>
        <p className="mt-2 text-lg text-light-subtle dark:text-dark-subtle">{pageSubtitle}</p>
      </div>

      <div className={`sticky top-16 z-20 py-4 bg-light-background/80 dark:bg-dark-background/80 backdrop-blur-sm -mx-4 sm:-mx-6 lg:-mx-8 px-4 sm:px-6 lg:px-8 mb-8 transition-transform duration-300 ${isFilterVisible ? 'translate-y-0' : '-translate-y-full'}`}>
        <div className="max-w-5xl mx-auto space-y-4">
          <SearchBar searchQuery={searchQuery} setSearchQuery={setSearchQuery} />
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {/* 1. Audience */}
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

            {/* 2. Subject */}
            <div>
              <label htmlFor="filter-subject" className="block text-sm font-medium text-light-text dark:text-dark-text mb-1">Subject</label>
              <select
                id="filter-subject"
                value={subjectFilter}
                onChange={(e) => setSubjectFilter(e.target.value)}
                className="w-full px-3 py-2 border border-light-border dark:border-dark-border text-light-text dark:text-dark-text bg-light-surface dark:bg-dark-surface rounded-md focus:outline-none focus:ring-primary focus:border-primary sm:text-sm"
              >
                <option value="all">All Subjects</option>
                {availableSubjects.map(subject => (
                  <option key={subject.value} value={subject.value}>{subject.label}</option>
                ))}
              </select>
            </div>

            {/* 3. Medium */}
            <div>
              <label htmlFor="filter-medium" className="block text-sm font-medium text-light-text dark:text-dark-text mb-1">Medium</label>
              <select
                id="filter-medium"
                value={mediumFilter}
                onChange={(e) => setMediumFilter(e.target.value)}
                className="w-full px-3 py-2 border border-light-border dark:border-dark-border text-light-text dark:text-dark-text bg-light-surface dark:bg-dark-surface rounded-md focus:outline-none focus:ring-primary focus:border-primary sm:text-sm"
              >
                <option value="all">All Mediums</option>
                <option value="Sinhala">Sinhala</option>
                <option value="English">English</option>
                <option value="Tamil">Tamil</option>
              </select>
            </div>

            {/* 4. Sort */}
            <div>
              <label htmlFor="sort-classes" className="block text-sm font-medium text-light-text dark:text-dark-text mb-1">Sort by</label>
              <select
                id="sort-classes"
                value={sortOption}
                onChange={(e) => setSortOption(e.target.value)}
                className="w-full px-3 py-2 border border-light-border dark:border-dark-border text-light-text dark:text-dark-text bg-light-surface dark:bg-dark-surface rounded-md focus:outline-none focus:ring-primary focus:border-primary sm:text-sm"
              >
                {classSortOptions.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}
              </select>
            </div>

            {/* 5. Mode */}
            <div>
              <label htmlFor="filter-mode" className="block text-sm font-medium text-light-text dark:text-dark-text mb-1">Mode</label>
              <select
                id="filter-mode"
                value={modeFilter}
                onChange={(e) => setModeFilter(e.target.value as any)}
                className="w-full px-3 py-2 border border-light-border dark:border-dark-border text-light-text dark:text-dark-text bg-light-surface dark:bg-dark-surface rounded-md focus:outline-none focus:ring-primary focus:border-primary sm:text-sm"
              >
                <option value="all">All Modes</option>
                <option value="Online">Online</option>
                <option value="Physical">Physical</option>
              </select>
            </div>

            {/* 6. District */}
            <SearchableSelect
              label="District"
              options={[{ value: 'all', label: 'All Districts' }, ...sriLankanDistricts.map(d => ({ value: d, label: d }))]}
              value={districtFilter}
              onChange={handleDistrictChange}
              placeholder="Filter by District"
            />

            {/* 7. Town */}
            <SearchableSelect
              label="Town"
              options={townOptions}
              value={townFilter}
              onChange={setTownFilter}
              placeholder="Select District First"
              disabled={districtFilter === 'all'}
            />

            {/* 8. Payment */}
            <div>
              <label htmlFor="filter-payment" className="block text-sm font-medium text-light-text dark:text-dark-text mb-1">Payment</label>
              <select
                id="filter-payment"
                value={paymentFilter}
                onChange={(e) => setPaymentFilter(e.target.value as any)}
                className="w-full px-3 py-2 border border-light-border dark:border-dark-border text-light-text dark:text-dark-text bg-light-surface dark:bg-dark-surface rounded-md focus:outline-none focus:ring-primary focus:border-primary sm:text-sm"
              >
                <option value="all">All Methods</option>
                <option value="platform">Platform</option>
                <option value="manual">Manual</option>
              </select>
            </div>

            {/* 9. Price */}
            <div>
              <label htmlFor="filter-price" className="block text-sm font-medium text-light-text dark:text-dark-text mb-1">Max Price: <span className="font-bold text-primary">{currencyFormatter.format(priceFilter)}</span></label>
              <input
                id="filter-price"
                type="range"
                min="0"
                max={maxPrice}
                step={250}
                value={priceFilter}
                onChange={(e) => setPriceFilter(Number(e.target.value))}
                className="w-full h-2 bg-light-border dark:bg-dark-border rounded-lg appearance-none cursor-pointer accent-primary"
              />
            </div>

            {liveClassesAvailable && (
              <div className="flex flex-col justify-end md:col-span-4">
                <div className="flex items-center space-x-2">
                  <button
                    type="button"
                    onClick={() => setShowLiveOnly(!showLiveOnly)}
                    className={`${showLiveOnly ? 'bg-red-600' : 'bg-gray-200 dark:bg-gray-600'
                      } relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2`}
                    role="switch"
                    aria-checked={showLiveOnly}
                  >
                    <span
                      aria-hidden="true"
                      className={`${showLiveOnly ? 'translate-x-5' : 'translate-x-0'
                        } pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out`}
                    />
                  </button>
                  <label htmlFor="live-only-toggle" className="text-sm font-medium whitespace-nowrap">Live Only</label>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {paginatedClasses.length > 0 ? (
        <>
          <p className="text-sm text-light-subtle dark:text-dark-subtle mb-6">Showing {paginatedClasses.length} of {filteredAndSortedClasses.length} classes.</p>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {paginatedClasses.map(({ teacher, ...classInfo }) => (
              <ClassCard
                key={classInfo.id}
                classInfo={classInfo}
                teacher={teacher}
                viewMode="public"
                onView={(c) => onViewClass(c, teacher)}
              />
            ))}
          </div>
          {hasMore && (
            <div ref={loader} className="flex justify-center items-center h-20">
              <div className="w-8 h-8 border-4 border-dashed rounded-full animate-spin border-primary"></div>
            </div>
          )}
        </>
      ) : (
        <div className="text-center py-16 text-light-subtle dark:text-dark-subtle">
          <p className="text-xl font-semibold">No classes found</p>
          <p>Try adjusting your search query or filters.</p>
        </div>
      )}
    </div>
  );
};

export default AllClassesPage;
