
import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import EventCard from '../components/EventCard.tsx';
import { ChevronLeftIcon } from '../components/Icons.tsx';
import SearchBar from '../components/SearchBar.tsx';
import { useNavigation } from '../contexts/NavigationContext.tsx';
import { useData } from '../contexts/DataContext.tsx';
import { getDynamicEventStatus } from '../utils.ts';
import { slugify } from '../utils/slug.ts';
import { useSEO } from '../hooks/useSEO.ts';

const ITEMS_PER_PAGE = 9;

const eventSortOptions = [
  { value: 'newest', label: 'Newest First' },
  { value: 'date_asc', label: 'Date: Upcoming First' },
  { value: 'date_desc', label: 'Date: Latest First' },
  { value: 'price_low', label: 'Price: Low to High' },
  { value: 'price_high', label: 'Price: High to Low' },
];

const eventCategories = ['All Categories', 'Education', 'Workshop', 'Seminar', 'Competition', 'Other'];

const AllEventsPage: React.FC = () => {
  const { tuitionInstitutes } = useData();
  const { handleNavigate } = useNavigation();

  const [searchQuery, setSearchQuery] = useState('');
  const [sortOption, setSortOption] = useState('date_asc');
  const [categoryFilter, setCategoryFilter] = useState('all');

  const [visibleCount, setVisibleCount] = useState(ITEMS_PER_PAGE);
  const isLoadingMore = useRef(false);
  const loader = useRef(null);

  const onViewEvent = (event: any) => handleNavigate({ name: 'event_detail_slug', slug: slugify(event.title) });
  const onBack = () => handleNavigate({ name: 'home' });

  const filteredAndSortedEvents = useMemo(() => {
    const allEvents = tuitionInstitutes.flatMap(ti =>
      (ti.events || []).map(event => ({ ...event, organizer: ti }))
    );

    const filtered = allEvents.filter(item => {
      if (!item.isPublished || item.status === 'canceled' || getDynamicEventStatus(item) === 'finished') return false;
      if (searchQuery.trim()) {
        const lowerQuery = searchQuery.toLowerCase();
        const searchableContent = [item.title, item.description, item.organizer.name, item.category].join(' ').toLowerCase();
        if (!searchableContent.includes(lowerQuery)) return false;
      }
      if (categoryFilter !== 'all' && item.category !== categoryFilter) {
        return false;
      }
      return true;
    });

    return [...filtered].sort((a, b) => {
      switch (sortOption) {
        case 'newest': return b.id.localeCompare(a.id);
        case 'date_desc': return new Date(b.startDate).getTime() - new Date(a.startDate).getTime();
        case 'price_high': return b.tickets.price - a.tickets.price;
        case 'price_low': return a.tickets.price - b.tickets.price;
        case 'date_asc':
        default: return new Date(a.startDate).getTime() - new Date(b.startDate).getTime();
      }
    });
  }, [tuitionInstitutes, searchQuery, sortOption, categoryFilter]);

  useEffect(() => {
    setVisibleCount(ITEMS_PER_PAGE);
  }, [searchQuery, sortOption, categoryFilter]);

  const paginatedEvents = useMemo(() => {
    return filteredAndSortedEvents.slice(0, visibleCount);
  }, [filteredAndSortedEvents, visibleCount]);

  const handleObserver = useCallback((entries: IntersectionObserverEntry[]) => {
    const target = entries[0];
    if (target.isIntersecting && !isLoadingMore.current) {
      isLoadingMore.current = true;
      setVisibleCount((prev) => prev + ITEMS_PER_PAGE);
    }
  }, []);

  useEffect(() => {
    isLoadingMore.current = false;
  }, [visibleCount]);

  useEffect(() => {
    const observer = new IntersectionObserver(handleObserver, { root: null, rootMargin: "200px", threshold: 0 });
    const currentLoader = loader.current;
    if (currentLoader) observer.observe(currentLoader);
    return () => { if (currentLoader) observer.unobserve(currentLoader); };
  }, [handleObserver, paginatedEvents]); // Added paginatedEvents to dependencies

  return (
    <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8 animate-slideInUp">
      <div className="mb-8">
        <button onClick={onBack} className="flex items-center space-x-2 text-sm font-medium text-primary hover:text-primary-dark transition-colors">
          <ChevronLeftIcon className="h-5 w-5" />
          <span>Back to Home</span>
        </button>
      </div>

      <div className="text-center mb-8">
        <h1 className="text-4xl font-bold">Explore All Events</h1>
        <p className="mt-2 text-lg text-light-subtle dark:text-dark-subtle">Find exciting educational events happening online and near you.</p>
      </div>

      <div className="sticky top-16 z-20 py-4 bg-light-background/80 dark:bg-dark-background/80 backdrop-blur-sm -mx-4 sm:px-6 lg:-mx-8 px-4 sm:px-6 lg:px-8 mb-8">
        <div className="max-w-5xl mx-auto space-y-4">
          <SearchBar searchQuery={searchQuery} setSearchQuery={setSearchQuery} />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="sort-events" className="block text-sm font-medium text-light-text dark:text-dark-text mb-1">Sort by</label>
              <select id="sort-events" value={sortOption} onChange={(e) => setSortOption(e.target.value)} className="w-full px-3 py-2 border border-light-border dark:border-dark-border text-light-text dark:text-dark-text bg-light-surface dark:bg-dark-surface rounded-md focus:outline-none focus:ring-primary focus:border-primary sm:text-sm">
                {eventSortOptions.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}
              </select>
            </div>
            <div>
              <label htmlFor="filter-category" className="block text-sm font-medium text-light-text dark:text-dark-text mb-1">Category</label>
              <select id="filter-category" value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)} className="w-full px-3 py-2 border border-light-border dark:border-dark-border text-light-text dark:text-dark-text bg-light-surface dark:bg-dark-surface rounded-md focus:outline-none focus:ring-primary focus:border-primary sm:text-sm">
                <option value="all">All Categories</option>
                {eventCategories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
              </select>
            </div>
          </div>
        </div>
      </div>

      {paginatedEvents.length > 0 ? (
        <>
          <p className="text-sm text-light-subtle dark:text-dark-subtle mb-6">Showing {paginatedEvents.length} of {filteredAndSortedEvents.length} events.</p>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {paginatedEvents.map(({ organizer, ...event }) => (
              <EventCard
                key={event.id}
                event={event}
                organizer={organizer}
                onView={onViewEvent}
              />
            ))}
          </div>
          {paginatedEvents.length < filteredAndSortedEvents.length && (
            <div ref={loader} className="flex justify-center items-center h-20">
              <div className="w-8 h-8 border-4 border-dashed rounded-full animate-spin border-primary"></div>
            </div>
          )}
        </>
      ) : (
        <div className="text-center py-16 text-light-subtle dark:text-dark-subtle">
          <p className="text-xl font-semibold">No events found</p>
          <p>Try adjusting your search query or filters.</p>
        </div>
      )}
    </div>
  );
};

export default AllEventsPage;
