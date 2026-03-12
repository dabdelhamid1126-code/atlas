import React, { useState, useEffect, useRef } from 'react';
import { Search, Check, X } from 'lucide-react';
import { Input } from '@/components/ui/input';

export default function ProductSearchDropdown({ 
  products, 
  value, 
  onChange, 
  onSelect,
  searchValue,
  onSearchChange
}) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef(null);
  const inputRef = useRef(null);

  const filteredProducts = products.filter(p => 
    searchValue.length >= 2 && (
      p.name?.toLowerCase().includes(searchValue.toLowerCase()) ||
      p.upc?.toLowerCase().includes(searchValue.toLowerCase())
    )
  );

  const selectedProduct = value ? products.find(p => p.id === value) : null;

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelect = (product) => {
    onChange(product.id);
    onSelect?.(product);
    onSearchChange('');
    setIsOpen(false);
  };

  const handleClear = () => {
    onChange('');
    onSearchChange('');
    setIsOpen(false);
  };

  return (
    <div className="relative" ref={containerRef}>
      {selectedProduct && !isOpen ? (
        // Selected state - show product with image and tag
        <div className="flex items-center gap-2 p-2 bg-white border border-slate-200 rounded-lg">
          {selectedProduct.image && (
            <img 
              src={selectedProduct.image} 
              alt={selectedProduct.name}
              className="h-8 w-8 rounded object-cover"
            />
          )}
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-slate-900 truncate">{selectedProduct.name}</p>
            {selectedProduct.upc && (
              <p className="text-xs text-slate-500">{selectedProduct.upc}</p>
            )}
          </div>
          <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded whitespace-nowrap">
            ✓ From inventory
          </span>
          <button
            onClick={handleClear}
            className="p-1 hover:bg-slate-100 rounded"
            type="button"
          >
            <X className="h-4 w-4 text-slate-400" />
          </button>
        </div>
      ) : (
        // Search input
        <div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              ref={inputRef}
              value={searchValue}
              onChange={(e) => {
                onSearchChange(e.target.value);
                setIsOpen(e.target.value.length >= 2);
              }}
              onFocus={() => searchValue.length >= 2 && setIsOpen(true)}
              placeholder="Search by name or UPC (min 2 chars)..."
              className="pl-9"
            />
          </div>

          {/* Dropdown Results */}
          {isOpen && (
            <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-slate-200 rounded-lg shadow-lg z-50 max-h-64 overflow-y-auto">
              {searchValue.length < 2 ? (
                <div className="p-4 text-sm text-slate-500 text-center">
                  Type at least 2 characters to search
                </div>
              ) : filteredProducts.length > 0 ? (
                filteredProducts.map(product => (
                  <button
                    key={product.id}
                    onClick={() => handleSelect(product)}
                    className="w-full text-left p-3 hover:bg-slate-50 border-b border-slate-100 last:border-b-0 flex items-start gap-3 transition-colors"
                    type="button"
                  >
                    {/* Product Image */}
                    {product.image && (
                      <img 
                        src={product.image}
                        alt={product.name}
                        className="h-12 w-12 rounded object-cover flex-shrink-0"
                      />
                    )}
                    
                    {/* Product Details */}
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-slate-900 text-sm">{product.name}</p>
                      {product.upc && (
                        <p className="text-xs text-slate-500">{product.upc}</p>
                      )}
                    </div>

                    {/* Right side: Price and Category */}
                    <div className="flex flex-col items-end gap-1 flex-shrink-0">
                      {product.price && (
                        <p className="text-sm font-semibold text-purple-600">
                          ${parseFloat(product.price).toFixed(2)}
                        </p>
                      )}
                      {product.category && (
                        <span className="text-xs bg-slate-100 text-slate-700 px-2 py-0.5 rounded capitalize">
                          {product.category}
                        </span>
                      )}
                    </div>
                  </button>
                ))
              ) : (
                <div className="p-4 text-sm text-slate-500 text-center">
                  Not in inventory - enter manually
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}