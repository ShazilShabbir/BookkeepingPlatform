import { useState } from 'react';
import clsx from 'clsx';

interface AccordionItem {
  question: string;
  answer: string;
}

interface AccordionProps {
  items: AccordionItem[];
}

export default function Accordion({ items }: AccordionProps) {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  return (
    <div className="space-y-3">
      {items.map((item, i) => {
        const isOpen = openIndex === i;
        return (
          <div key={i} className="border border-surface-200 rounded-xl overflow-hidden transition-all duration-200">
            <button
              onClick={() => setOpenIndex(isOpen ? null : i)}
              className="w-full flex items-center justify-between px-6 py-4 text-left bg-white hover:bg-surface-50 transition-colors duration-200"
            >
              <span className="text-sm font-medium text-surface-900 pr-4">{item.question}</span>
              <svg className={clsx('w-5 h-5 text-surface-400 shrink-0 transition-transform duration-200', isOpen && 'rotate-180')} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            <div className={clsx(
              'overflow-hidden transition-all duration-300',
              isOpen ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'
            )}>
              <div className="px-6 pb-4 text-sm text-surface-500 leading-relaxed">
                {item.answer}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
