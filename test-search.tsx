import React, { useState } from 'react';
import { renderToString } from 'react-dom/server';
import { Search, X } from 'lucide-react';

function Test() {
  const [searchTerm, setSearchTerm] = useState('test');
  return (
        <div className="relative w-full md:w-96 flex items-center">
          <div className="absolute inset-y-0 start-0 ps-3.5 flex items-center pointer-events-none">
            <Search className="w-4 h-4 text-slate-500" />
          </div>
          <input
            type="text"
            placeholder="Search debtor name, phone, item, invoice..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-slate-900 border border-slate-700/80 rounded-xl py-2 ps-10 pe-9 text-xs text-white placeholder-slate-500 focus:border-indigo-500"
          />
            {searchTerm && (
              <button 
                type="button"
                onClick={() => setSearchTerm('')} 
                className="absolute end-2.5 inset-y-0 my-auto h-7 w-7 flex items-center justify-center text-slate-500 hover:text-slate-200 hover:bg-slate-800 rounded-md transition-colors cursor-pointer"
                title="Clear search"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
        </div>
  );
}
console.log(renderToString(<Test />));
