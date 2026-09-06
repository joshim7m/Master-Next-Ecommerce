'use client';

'use client';

const MAX_OPTIONS = 3;

export default function VariantGenerator({ options, onOptionsChange, onGenerate }) {
  const updateOption = (index, field, value) => {
    onOptionsChange(options.map((o, i) => (i === index ? { ...o, [field]: value } : o)));
  };

  const addOption = () => {
    if (options.length >= MAX_OPTIONS) return;
    onOptionsChange([...options, { name: '', values: '' }]);
  };

  const removeOption = (index) => {
    onOptionsChange(options.filter((_, i) => i !== index));
  };

  const active = options
    .filter((o) => o.values.trim())
    .map((o) => ({
      name: o.name.trim() || 'Option',
      values: o.values.split(',').map((v) => v.trim()).filter(Boolean),
    }));

  const names = active.map((o) => o.name.toLowerCase());
  const hasDuplicateNames = new Set(names).size !== names.length;
  const hasEmptyValues = active.some((o) => o.values.length === 0);
  const canGenerate = active.length > 0 && !hasDuplicateNames && !hasEmptyValues;

  const handleGenerate = () => {
    if (!canGenerate) return;

    let combinations = active[0].values.map((v) => ({ optionValues: [v] }));
    for (let i = 1; i < active.length; i++) {
      const next = [];
      for (const combo of combinations) {
        for (const val of active[i].values) {
          next.push({ optionValues: [...combo.optionValues, val] });
        }
      }
      combinations = next;
    }

    onGenerate(active, combinations);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider dark:text-slate-400">Variant Options</p>
          <p className="mt-1 text-sm text-slate-400 dark:text-slate-500">Name your options anything (Size, Color, Material, Weight&hellip;), add comma-separated values, then generate all combinations.</p>
        </div>
        {options.length < MAX_OPTIONS && (
          <button
            type="button"
            onClick={addOption}
            className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 hover:border-[#2f0f6b] hover:text-[#2f0f6b] transition dark:border-slate-700 dark:text-slate-300 dark:hover:border-[#a78bfa] dark:hover:text-[#a78bfa]"
          >
            <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Add option
          </button>
        )}
      </div>

      {options.map((opt, i) => (
        <div key={i} className="grid gap-3 sm:grid-cols-[1fr_2fr_auto] items-start">
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1 dark:text-slate-500">Option {i + 1} Name</label>
            <input
              value={opt.name}
              onChange={(e) => updateOption(i, 'name', e.target.value)}
              placeholder={['e.g. Size', 'e.g. Color', 'e.g. Material'][i] || `e.g. Option ${i + 1}`}
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-[#2f0f6b] focus:outline-none focus:ring-1 focus:ring-[#2f0f6b] dark:border-slate-700 dark:bg-slate-900 dark:text-white dark:focus:border-[#a78bfa] dark:focus:ring-[#a78bfa]"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1 dark:text-slate-500">Values (comma separated)</label>
            <input
              value={opt.values}
              onChange={(e) => updateOption(i, 'values', e.target.value)}
              placeholder={['e.g. S, M, L', 'e.g. Red, Blue', 'e.g. Cotton, Leather'][i] || 'e.g. Value 1, Value 2'}
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-[#2f0f6b] focus:outline-none focus:ring-1 focus:ring-[#2f0f6b] dark:border-slate-700 dark:bg-slate-900 dark:text-white dark:focus:border-[#a78bfa] dark:focus:ring-[#a78bfa]"
            />
          </div>
          <div className={options.length > 1 ? 'pt-6' : 'pt-6 opacity-40 pointer-events-none'}>
            <button
              type="button"
              onClick={() => removeOption(i)}
              disabled={options.length <= 1}
              title="Remove option"
              className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-400 hover:bg-red-50 hover:text-red-500 transition dark:hover:bg-red-900/20 dark:hover:text-red-400"
            >
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </button>
          </div>
        </div>
      ))}

      {hasDuplicateNames && (
        <p className="text-xs font-medium text-red-500">Option names must be unique.</p>
      )}
      {hasEmptyValues && (
        <p className="text-xs font-medium text-red-500">Every active option needs at least one value.</p>
      )}

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
