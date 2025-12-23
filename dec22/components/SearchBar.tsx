import React from 'react';
import { SearchIcon } from './Icons';

interface SearchBarProps {
  searchQuery: string;
  setSearchQuery: (query: string) => void;
}

const SearchBar: React.FC<SearchBarProps> = ({ searchQuery, setSearchQuery }) => {
  return (
    <div className="relative w-full group transition-shadow duration-300 rounded-full hover:shadow-2xl">
      <input
        type="text"
        placeholder="Search for teachers, classes, or courses..."
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        className="w-full pl-6 pr-20 h-16 text-lg border border-light-border/50 dark:border-dark-border/50 text-light-text dark:text-dark-text bg-light-surface/80 dark:bg-dark-surface/80 backdrop-blur-md rounded-full focus:outline-none focus:ring-4 focus:ring-primary/50 transition-all duration-300 shadow-xl"
      />
      <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
         <button
            type="button"
            className="h-12 w-12 rounded-full bg-primary text-white flex items-center justify-center hover:bg-primary-dark focus:outline-none focus:ring-4 focus:ring-primary/50 transition-all duration-300 transform group-hover:scale-105"
            aria-label="Search"
          >
            <SearchIcon className="h-6 w-6" />
        </button>
      </div>
    </div>
  );
};

export default SearchBar;