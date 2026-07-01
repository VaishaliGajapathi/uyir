import { cn } from "../lib/utils";
import { Loader2, ChevronDown, X, Search } from "lucide-react";
import type { ReactNode, ButtonHTMLAttributes, InputHTMLAttributes, SelectHTMLAttributes } from "react";
import { useState, useRef, useEffect } from "react";

export function Button({
  className, variant = "primary", size = "md", loading, children, ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "outline" | "ghost" | "danger" | "soft"; size?: "sm" | "md" | "lg"; loading?: boolean;
}) {
  const variants = {
    primary: "bg-uyir-600 text-white hover:bg-uyir-700 active:bg-uyir-800 shadow-sm shadow-uyir-600/30",
    danger: "bg-uyir-600 text-white hover:bg-uyir-700",
    outline: "border border-slate-300 bg-white text-slate-700 hover:bg-slate-50",
    ghost: "text-slate-600 hover:bg-slate-100",
    soft: "bg-uyir-50 text-uyir-700 hover:bg-uyir-100",
  };
  const sizes = { sm: "h-9 px-3 text-sm", md: "h-11 px-4 text-[15px]", lg: "h-14 px-6 text-base" };
  return (
    <button
      className={cn("inline-flex items-center justify-center gap-2 rounded-xl font-semibold transition disabled:opacity-50 disabled:pointer-events-none", variants[variant], sizes[size], className)}
      disabled={loading || props.disabled}
      {...props}
    >
      {loading && <Loader2 className="h-4 w-4 animate-spin" />}
      {children}
    </button>
  );
}

export function Card({ className, children }: { className?: string; children: ReactNode }) {
  return <div className={cn("rounded-2xl bg-white shadow-sm ring-1 ring-slate-100", className)}>{children}</div>;
}

export function Input({ className, label, onChange, ...props }: InputHTMLAttributes<HTMLInputElement> & { label?: string }) {
  return (
    <label className="block">
      {label && <span className="mb-1 block text-sm font-medium text-slate-600">{label}</span>}
      <input
        className={cn("h-12 w-full rounded-xl border border-slate-200 bg-white px-4 text-[15px] outline-none transition focus:border-uyir-500 focus:ring-2 focus:ring-uyir-100", className)}
        onChange={(e) => onChange && onChange(e)}
        {...props}
      />
    </label>
  );
}

export function Select({ className, label, children, ...props }: SelectHTMLAttributes<HTMLSelectElement> & { label?: string }) {
  return (
    <label className="block">
      {label && <span className="mb-1 block text-sm font-medium text-slate-600">{label}</span>}
      <select
        className={cn("h-12 w-full appearance-none rounded-xl border border-slate-200 bg-white px-4 text-[15px] outline-none focus:border-uyir-500 focus:ring-2 focus:ring-uyir-100", className)}
        {...props}
      >
        {children}
      </select>
    </label>
  );
}

export function Badge({ className, children }: { className?: string; children: ReactNode }) {
  return <span className={cn("inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold", className)}>{children}</span>;
}

export function Spinner() {
  return (
    <div className="flex items-center justify-center py-10 text-slate-400">
      <Loader2 className="h-6 w-6 animate-spin" />
    </div>
  );
}

export function Sheet({ open, onClose, children }: { open: boolean; onClose: () => void; children: ReactNode }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center" onClick={onClose}>
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
      <div className="relative z-10 w-full max-w-md animate-slidein rounded-t-3xl bg-white p-5 sm:rounded-3xl" onClick={(e) => e.stopPropagation()}>
        {children}
      </div>
    </div>
  );
}

export function SearchableSelect({
  label,
  options,
  value,
  onChange,
  placeholder = "Search...",
  className,
}: {
  label?: string;
  options: string[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);

  const filteredOptions = options.filter((option) =>
    option.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const displayValue = value || placeholder;

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  function handleSelect(option: string) {
    onChange(option);
    setIsOpen(false);
    setSearchTerm("");
  }

  function handleClear() {
    onChange("");
    setSearchTerm("");
  }

  return (
    <label className="block">
      {label && <span className="mb-1 block text-sm font-medium text-slate-600">{label}</span>}
      <div className="relative" ref={containerRef}>
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className={cn(
            "h-12 w-full rounded-xl border border-slate-200 bg-white px-4 text-left text-[15px] outline-none transition focus:border-uyir-500 focus:ring-2 focus:ring-uyir-100",
            !value && "text-slate-400",
            className
          )}
        >
          <span className="truncate">{displayValue}</span>
          <ChevronDown className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        </button>
        {value && (
          <button
            type="button"
            onClick={handleClear}
            className="absolute right-8 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
          >
            <X className="h-4 w-4" />
          </button>
        )}
        {isOpen && (
          <div className="absolute z-10 mt-1 w-full rounded-xl border border-slate-200 bg-white shadow-lg">
            <div className="border-b border-slate-100 p-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder={placeholder}
                  className="h-9 w-full rounded-lg border border-slate-200 bg-slate-50 pl-9 pr-3 text-sm outline-none focus:border-uyir-500 focus:ring-1 focus:ring-uyir-500"
                  autoFocus
                />
              </div>
            </div>
            <div className="max-h-60 overflow-y-auto">
              {filteredOptions.length === 0 ? (
                <div className="p-3 text-sm text-slate-400">No results found</div>
              ) : (
                filteredOptions.map((option) => (
                  <button
                    key={option}
                    type="button"
                    onClick={() => handleSelect(option)}
                    className={cn(
                      "w-full px-4 py-2 text-left text-sm transition hover:bg-slate-50",
                      value === option && "bg-uyir-50 font-medium text-uyir-700"
                    )}
                  >
                    {option}
                  </button>
                ))
              )}
            </div>
          </div>
        )}
      </div>
    </label>
  );
}
