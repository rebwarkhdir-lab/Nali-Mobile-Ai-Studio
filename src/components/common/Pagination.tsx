import React from 'react';
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { cn } from '../../lib/utils';

export interface PaginationProps {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  pageSize: number;
  pageSizeOptions?: number[];
  onPageChange: (page: number) => void;
  onPageSizeChange?: (pageSize: number) => void;
  itemLabel?: string;
  className?: string;
  showPageSizeSelector?: boolean;
}

export const Pagination: React.FC<PaginationProps> = ({
  currentPage,
  totalPages,
  totalItems,
  pageSize,
  pageSizeOptions = [10, 20, 50],
  onPageChange,
  onPageSizeChange,
  itemLabel,
  className,
  showPageSizeSelector = true,
}) => {
  const { t, i18n } = useTranslation();
  const isRtl = i18n.language === 'ku' || i18n.language === 'ar' || document.documentElement.dir === 'rtl';

  if (totalItems <= 0) return null;

  const validTotalPages = Math.max(1, totalPages);
  const safeCurrentPage = Math.min(Math.max(1, currentPage), validTotalPages);

  const startItem = Math.min((safeCurrentPage - 1) * pageSize + 1, totalItems);
  const endItem = Math.min(safeCurrentPage * pageSize, totalItems);

  // Generate visible page numbers with ellipsis
  const getPageNumbers = () => {
    const delta = 2; // Number of pages around current page
    const range: (number | string)[] = [];
    const rangeWithDots: (number | string)[] = [];
    let l: number | undefined;

    for (let i = 1; i <= validTotalPages; i++) {
      if (i === 1 || i === validTotalPages || (i >= safeCurrentPage - delta && i <= safeCurrentPage + delta)) {
        range.push(i);
      }
    }

    for (const i of range) {
      if (typeof i === 'number') {
        if (l !== undefined) {
          if (i - l === 2) {
            rangeWithDots.push(l + 1);
          } else if (i - l !== 1) {
            rangeWithDots.push('...');
          }
        }
        rangeWithDots.push(i);
        l = i;
      }
    }

    return rangeWithDots;
  };

  const pages = getPageNumbers();

  const handlePrev = () => {
    if (safeCurrentPage > 1) {
      onPageChange(safeCurrentPage - 1);
    }
  };

  const handleNext = () => {
    if (safeCurrentPage < validTotalPages) {
      onPageChange(safeCurrentPage + 1);
    }
  };

  return (
    <div
      className={cn(
        "flex flex-col sm:flex-row items-center justify-between gap-3 px-4 py-3 bg-[#0d121f] border-t border-slate-800/80 rounded-b-2xl text-xs text-slate-400 select-none",
        className
      )}
      aria-label="Pagination Navigation"
    >
      {/* Left side: Showing X-Y of Z items */}
      <div className="flex items-center gap-2 text-slate-400 w-full sm:w-auto justify-between sm:justify-start">
        <div className="flex items-center gap-1.5 font-medium">
          <span>{t('common.showing', 'Showing')}</span>
          <span className="font-mono font-bold text-white px-1.5 py-0.5 rounded bg-slate-800 border border-slate-700/60">
            {startItem}–{endItem}
          </span>
          <span>{t('common.of', 'of')}</span>
          <span className="font-mono font-bold text-indigo-300">
            {totalItems}
          </span>
          <span>{itemLabel || t('common.items', 'items')}</span>
        </div>

        {/* Mobile quick page badge */}
        <div className="sm:hidden font-mono font-bold px-2 py-0.5 rounded-full bg-slate-800/90 text-indigo-400 border border-slate-700/80">
          {safeCurrentPage} / {validTotalPages}
        </div>
      </div>

      {/* Right side: Page size selector & Page buttons */}
      <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-end flex-wrap sm:flex-nowrap">
        {/* Page Size Selector */}
        {showPageSizeSelector && onPageSizeChange && pageSizeOptions.length > 1 && (
          <div className="flex items-center gap-1.5 text-xs text-slate-400 shrink-0">
            <span className="hidden md:inline">{t('common.rowsPerPage', 'Rows per page:')}</span>
            <select
              value={pageSize}
              onChange={(e) => onPageSizeChange(Number(e.target.value))}
              className="bg-slate-900 border border-slate-700/80 hover:border-slate-600 text-slate-200 rounded-lg px-2 py-1 text-xs font-mono focus:outline-none focus:ring-1 focus:ring-indigo-500 cursor-pointer transition-colors"
              aria-label="Select items per page"
            >
              {pageSizeOptions.map((opt) => (
                <option key={opt} value={opt} className="bg-slate-900 text-white">
                  {opt} {t('common.perPage', '/ page')}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Pagination Navigation Buttons */}
        <nav className="flex items-center gap-1 shrink-0" aria-label="Pagination">
          {/* First Page button (hidden on extra small) */}
          <button
            type="button"
            onClick={() => onPageChange(1)}
            disabled={safeCurrentPage <= 1}
            className={cn(
              "hidden sm:flex p-1.5 rounded-lg border transition-all cursor-pointer items-center justify-center",
              safeCurrentPage <= 1
                ? "text-slate-600 border-slate-800/50 cursor-not-allowed bg-transparent"
                : "text-slate-400 hover:text-white hover:bg-slate-800 border-slate-700/60 bg-slate-900/60 active:scale-95"
            )}
            title={t('common.firstPage', 'First Page')}
          >
            <ChevronsLeft className={cn("w-3.5 h-3.5", isRtl && "rotate-180")} />
          </button>

          {/* Previous Page button */}
          <button
            type="button"
            onClick={handlePrev}
            disabled={safeCurrentPage <= 1}
            className={cn(
              "px-2 sm:px-2.5 py-1.5 rounded-lg border transition-all cursor-pointer flex items-center gap-1",
              safeCurrentPage <= 1
                ? "text-slate-600 border-slate-800/50 cursor-not-allowed bg-transparent"
                : "text-slate-300 hover:text-white hover:bg-slate-800 border-slate-700/60 bg-slate-900/60 active:scale-95"
            )}
            title={t('common.previous', 'Previous')}
          >
            <ChevronLeft className={cn("w-3.5 h-3.5", isRtl && "rotate-180")} />
            <span className="hidden sm:inline font-medium">{t('common.prev', 'Prev')}</span>
          </button>

          {/* Page Number Buttons (Desktop & Tablet) */}
          <div className="hidden sm:flex items-center gap-1">
            {pages.map((p, idx) => {
              if (p === '...') {
                return (
                  <span
                    key={`ellipsis-${idx}`}
                    className="w-7 h-7 flex items-center justify-center text-slate-500 font-mono select-none"
                  >
                    …
                  </span>
                );
              }

              const pageNum = Number(p);
              const isActive = pageNum === safeCurrentPage;

              return (
                <button
                  key={`page-${pageNum}`}
                  type="button"
                  onClick={() => onPageChange(pageNum)}
                  className={cn(
                    "min-w-[28px] h-7 px-1.5 rounded-lg text-xs font-mono font-semibold transition-all cursor-pointer flex items-center justify-center",
                    isActive
                      ? "bg-indigo-600 text-white shadow-sm shadow-indigo-600/30 border border-indigo-500"
                      : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/80 border border-transparent"
                  )}
                  aria-current={isActive ? 'page' : undefined}
                >
                  {pageNum}
                </button>
              );
            })}
          </div>

          {/* Next Page button */}
          <button
            type="button"
            onClick={handleNext}
            disabled={safeCurrentPage >= validTotalPages}
            className={cn(
              "px-2 sm:px-2.5 py-1.5 rounded-lg border transition-all cursor-pointer flex items-center gap-1",
              safeCurrentPage >= validTotalPages
                ? "text-slate-600 border-slate-800/50 cursor-not-allowed bg-transparent"
                : "text-slate-300 hover:text-white hover:bg-slate-800 border-slate-700/60 bg-slate-900/60 active:scale-95"
            )}
            title={t('common.next', 'Next')}
          >
            <span className="hidden sm:inline font-medium">{t('common.next', 'Next')}</span>
            <ChevronRight className={cn("w-3.5 h-3.5", isRtl && "rotate-180")} />
          </button>

          {/* Last Page button (hidden on extra small) */}
          <button
            type="button"
            onClick={() => onPageChange(validTotalPages)}
            disabled={safeCurrentPage >= validTotalPages}
            className={cn(
              "hidden sm:flex p-1.5 rounded-lg border transition-all cursor-pointer items-center justify-center",
              safeCurrentPage >= validTotalPages
                ? "text-slate-600 border-slate-800/50 cursor-not-allowed bg-transparent"
                : "text-slate-400 hover:text-white hover:bg-slate-800 border-slate-700/60 bg-slate-900/60 active:scale-95"
            )}
            title={t('common.lastPage', 'Last Page')}
          >
            <ChevronsRight className={cn("w-3.5 h-3.5", isRtl && "rotate-180")} />
          </button>
        </nav>
      </div>
    </div>
  );
};
