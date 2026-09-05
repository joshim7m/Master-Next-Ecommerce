'use client';

import { useState } from 'react';

export default function VariantGenerator({ onGenerate, existingOptions }) {
  const [options, setOptions] = useState(
    existingOptions.length > 0
      ? existingOptions
      : [
          { name: 'Size', values: '' },
          { name: 'Color', values: '' },
        ]
  );

  const updateOption = (index, field, value) => {
    setOptions((prev) => prev.map((o, i) => (i === index ? { ...o, [field]: value } : o)));
  };

  const canGenerate = options.some((o) => o.values.trim());

  const handleGenerate = () => {
    const parsed = options
      .filter((o) => o.values.trim())
      .map((o) => ({
        name: o.name.trim() || 'Option',
        values: o.values.split(',').map((v) => v.trim()).filter(Boolean),
      }));

    if (parsed.length === 0) return;

    let combinations = parsed[0].values.map((v) => ({ optionValues: [v] }));
    for (let i = 1; i < parsed.length; i++) {
      const next = [];
      for (const combo of combinations) {
        for (const val of parsed[i].values) {
          next.push({ optionValues: [...combo.optionValues, val] });
        }
      }
      combinations = next;
    }

    onGenerate(parsed, combinations);
  };

  return (
    <div className="space-y-4">
      <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider dark:text-slate-400">Variant Options</p>
      <p className="text-sm text-slate-400 dark:text-slate-500">Define option names and values, then generate all combinations.</p>

      {options.map((opt, i) => (
        <div key={i} className="grid gap-3 sm:grid-cols-3 items-start">
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1 dark:text-slate-500">Option {i + 1} Name</label>
            <input
              value={opt.name}
              onChange={(e) => updateOption(i, 'name', e.target.value)}
              placeholder="e.g. Size"
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-[#2f0f6b] focus:outline-none focus:ring-1 focus:ring-[#2f0f6b] dark:border-slate-700 dark:bg-slate-900 dark:text-white dark:focus:border-[#a78bfa] dark:focus:ring-[#a78bfa]"
            />
          </div>
          <div className="sm:col-span-2">
            <label className="block text-xs font-medium text-slate-400 mb-1 dark:text-slate-500">Values (comma separated)</label>
            <input
              value={opt.values}
              onChange={(e) => updateOption(i, 'values', e.target.value)}
              placeholder="e.g. S, M, L"
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-[#2f0f6b] focus:outline-none focus:ring-1 focus:ring-[#2f0f6b] dark:border-slate-700 dark:bg-slate-900 dark:text-white dark:focus:border-[#a78bfa] dark:focus:ring-[#a78bfa]"
            />
          </div>
        </div>
      ))}

      <button
        type="button"
        onClick={handleGenerate}
        disabled={!canGenerate}
        className="rounded-lg bg-[#2f0f6b] px-4 py-2 text-sm font-medium text-white hover:bg-[#2f0f6b]/90 transition disabled:opacity-50"
      >
        Generate Variants
      </button>
    </div>
  );
}
