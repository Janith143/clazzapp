
import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import ProductCard from '../components/ProductCard';
import { ChevronLeftIcon } from '../components/Icons';
import SearchBar from '../components/SearchBar';
import { useNavigation } from '../contexts/NavigationContext';
import { useData } from '../contexts/DataContext';
import { useSEO } from '../hooks/useSEO';
import { Product } from '../types';

const sortOptions = [
  { value: 'newest', label: 'Newest First' },
  { value: 'price_high', label: 'Price: High to Low' },
  { value: 'price_low', label: 'Price: Low to High' },
  { value: 'title_asc', label: 'Title (A-Z)' },
  { value: 'title_desc', label: 'Title (Z-A)' },
];
const ITEMS_PER_PAGE = 9;

const AllProductsPage: React.FC = () => {
  const { teachers } = useData();
  const { handleNavigate } = useNavigation();
  const [visibleCount, setVisibleCount] = useState(ITEMS_PER_PAGE);
  const [sortOption, setSortOption] = useState('newest');
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<'all' | 'digital' | 'physical'>('all');
  const loader = useRef(null);
  const isLoadingMore = useRef(false);

  useSEO(
    'Store | clazz.lk',
    'Browse digital and physical goods from our top educators.'
  );

  const onBack = () => handleNavigate({ name: 'home' });
  
  const allProducts = useMemo(() => {
    return teachers
      .filter(t => t.registrationStatus === 'approved')
      .flatMap(teacher => 
        (teacher.products || []).map(product => ({ ...product, teacher }))
      );
  }, [teachers]);

  const filteredAndSortedProducts = useMemo(() => {
    let filtered = allProducts.filter(item => {
      if (!item.isPublished || item.adminApproval !== 'approved') return false;
      if (searchQuery.trim()) {
          const lowerQuery = searchQuery.toLowerCase();
          const searchableContent = [item.title, item.description, item.teacher.name].join(' ').toLowerCase();
          if (!searchableContent.includes(lowerQuery)) return false;
      }
      if (typeFilter !== 'all' && item.type !== typeFilter) return false;
      return true;
    });

    return [...filtered].sort((a, b) => {
        switch(sortOption) {
            case 'newest': return b.id.localeCompare(a.id);
            case 'price_high': return b.price - a.price;
            case 'price_low': return a.price - b.price;
            case 'title_desc': return b.title.localeCompare(a.title);
            case 'title_asc':
            default:
                return a.title.localeCompare(b.title);
        }
    });
  }, [allProducts, searchQuery, sortOption, typeFilter]);

  useEffect(() => {
    setVisibleCount(ITEMS_PER_PAGE);
  }, [searchQuery, sortOption, typeFilter]);

  const paginatedProducts = useMemo(() => {
    return filteredAndSortedProducts.slice(0, visibleCount);
  }, [filteredAndSortedProducts, visibleCount]);
  
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
  }, [handleObserver, paginatedProducts]); // Added paginatedProducts to dependencies

  const onViewDetails = (product: Product) => {
    handleNavigate({ name: 'product_detail', productId: product.id });
  };

  return (
    <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8 animate-slideInUp">
      <div className="mb-8">
        <button onClick={onBack} className="flex items-center space-x-2 text-sm font-medium text-primary hover:text-primary-dark">
          <ChevronLeftIcon className="h-5 w-5" />
          <span>Back to Home</span>
        </button>
      </div>
      
      <div className="text-center mb-8">
        <h1 className="text-4xl font-bold">Educator's Store</h1>
        <p className="mt-2 text-lg text-light-subtle dark:text-dark-subtle">Digital & Physical goods created by our teachers.</p>
      </div>

      <div className="sticky top-16 z-20 py-4 bg-light-background/80 dark:bg-dark-background/80 backdrop-blur-sm -mx-4 sm:px-6 lg:-mx-8 px-4 sm:px-6 lg:px-8 mb-8">
        <div className="max-w-5xl mx-auto space-y-4">
            <SearchBar searchQuery={searchQuery} setSearchQuery={setSearchQuery} />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                    <label htmlFor="sort-products" className="block text-sm font-medium mb-1">Sort by</label>
                    <select id="sort-products" value={sortOption} onChange={(e) => setSortOption(e.target.value)} className="w-full p-2 border rounded-md bg-light-surface dark:bg-dark-surface border-light-border dark:border-dark-border">
                      {sortOptions.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}
                    </select>
                </div>
                 <div>
                    <label htmlFor="filter-type" className="block text-sm font-medium mb-1">Product Type</label>
                    <select id="filter-type" value={typeFilter} onChange={(e) => setTypeFilter(e.target.value as any)} className="w-full p-2 border rounded-md bg-light-surface dark:bg-dark-surface border-light-border dark:border-dark-border">
                      <option value="all">All Types</option>
                      <option value="digital">Digital</option>
                      <option value="physical">Physical</option>
                    </select>
                </div>
            </div>
        </div>
      </div>
      
      {paginatedProducts.length > 0 ? (
        <>
          <p className="text-sm text-light-subtle dark:text-dark-subtle mb-6">Showing {paginatedProducts.length} of {filteredAndSortedProducts.length} products.</p>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {paginatedProducts.map(({teacher, ...product}) => (
              <ProductCard
                key={product.id}
                product={product}
                teacher={teacher}
                viewMode="public"
                onViewDetails={onViewDetails}
              />
            ))}
          </div>
          {paginatedProducts.length < filteredAndSortedProducts.length && (
            <div ref={loader} className="flex justify-center items-center h-20">
                <div className="w-8 h-8 border-4 border-dashed rounded-full animate-spin border-primary"></div>
            </div>
          )}
        </>
      ) : (
        <div className="text-center py-16 text-light-subtle dark:text-dark-subtle">
          <p className="text-xl font-semibold">No products found</p>
          <p>Try adjusting your search query or filters.</p>
        </div>
      )}
    </div>
  );
};

export default AllProductsPage;
