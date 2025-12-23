import React from 'react';
import { ChevronLeftIcon, ChevronRightIcon } from './Icons.tsx';

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

const Pagination: React.FC<PaginationProps> = ({ currentPage, totalPages, onPageChange }) => {
  if (totalPages <= 1) {
    return null;
  }

  const handlePageChange = (page: number) => {
    if (page >= 1 && page <= totalPages) {
      onPageChange(page);
    }
  };

  // Basic pagination logic (Prev, Current/Total, Next)
  return (
    <div className="flex items-center justify-center mt-8">
      <button
        onClick={() => handlePageChange(currentPage - 1)}
        disabled={currentPage === 1}
        className="px-4 py-2 mx-1 text-sm font-medium text-light-text dark:text-dark-text bg-light-surface dark:bg-dark-surface rounded-md border border-light-border dark:border-dark-border hover:bg-light-border dark:hover:bg-dark-border disabled:opacity-50"
      >
        <ChevronLeftIcon className="w-5 h-5" />
      </button>

      <span className="px-4 py-2 mx-1 text-sm">
        Page {currentPage} of {totalPages}
      </span>

      <button
        onClick={() => handlePageChange(currentPage + 1)}
        disabled={currentPage === totalPages}
        className="px-4 py-2 mx-1 text-sm font-medium text-light-text dark:text-dark-text bg-light-surface dark:bg-dark-surface rounded-md border border-light-border dark:border-dark-border hover:bg-light-border dark:hover:bg-dark-border disabled:opacity-50"
      >
        <ChevronRightIcon className="w-5 h-5" />
      </button>
    </div>
  );
};

export default Pagination;
