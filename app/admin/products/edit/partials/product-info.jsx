import CategoryMultiSelect from '../../../../../src/components/admin/CategoryMultiSelect';
import TipTapEditor from '../../../../../src/components/admin/TipTapEditor';
import RichEditorSection from '../../../../../src/components/admin/RichEditorSection';

export default function ProductInfo({ form, onChange, categories, selectedCategories, onCategoriesChange, existingImages, newPreviews, onRemoveExisting, onRemoveNew, onAdd, onGenerateSlug, onGenerateSku }) {
  const inputCls = "mt-1 w-full rounded-lg border border-slate-200 p-2.5 text-sm focus:border-[#2f0f6b] focus:outline-none focus:ring-1 focus:ring-[#2f0f6b] dark:border-slate-700 dark:bg-slate-900 dark:text-white dark:focus:border-[#a78bfa] dark:focus:ring-[#a78bfa]";
  const labelCls = "block text-xs font-medium text-slate-500 uppercase tracking-wider dark:text-slate-400";
  const btnCls = "rounded-lg border border-slate-200 px-3 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-50 transition disabled:opacity-40 dark:border-slate-700 dark:text-slate-400 dark:hover:bg-slate-700";

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-800">
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className={labelCls}>Title</label>
          <input name="title" value={form.title} onChange={onChange} className={inputCls} />
        </div>
        <div>
          <label className={labelCls}>Slug</label>
          <div className="mt-1 flex gap-2">
            <input name="slug" value={form.slug} onChange={onChange} className="flex-1 rounded-lg border border-slate-200 p-2.5 text-sm focus:border-[#2f0f6b] focus:outline-none focus:ring-1 focus:ring-[#2f0f6b] dark:border-slate-700 dark:bg-slate-900 dark:text-white dark:focus:border-[#a78bfa] dark:focus:ring-[#a78bfa]" />
            {onGenerateSlug && (
              <button type="button" onClick={onGenerateSlug} disabled={!form.title.trim()} className={btnCls}>Generate</button>
            )}
          </div>
        </div>
        <div className="sm:col-span-2">
          <label className={labelCls}>Description</label>
          <div className="mt-1.5 space-y-3">
            <RichEditorSection id="description" label="Description" content={form.description || ''}>
              <TipTapEditor
                content={form.description}
                onChange={(html) => onChange({ target: { name: 'description', value: html } })}
              />
            </RichEditorSection>

            <RichEditorSection id="specification" label="Specifications" content={form.specification || ''}>
              <TipTapEditor
                content={form.specification || ''}
                onChange={(html) => onChange({ target: { name: 'specification', value: html } })}
              />
            </RichEditorSection>
          </div>
        </div>
        <div className="sm:col-span-2">
          <label className={labelCls}>YouTube Video URL <span className="text-slate-400 normal-case">(optional — shown as a slide in the product gallery)</span></label>
          <input name="videoUrl" type="url" value={form.videoUrl || ''} onChange={onChange} className={inputCls} placeholder="https://www.youtube.com/watch?v=…" />
        </div>
        <div className="sm:col-span-2">
          <label className={labelCls}>Meta Description <span className="text-slate-400 normal-case">(SEO — shown in search results, 150–160 chars)</span></label>
          <textarea name="metaDescription" value={form.metaDescription || ''} onChange={onChange} rows={2} maxLength={160} className={inputCls} placeholder="e.g. Buy soft polyester sleepwear set online with cash on delivery across Bangladesh." />
        </div>
        <div className="sm:col-span-2">
          <label className={labelCls}>Tags / Keywords <span className="text-slate-400 normal-case">(comma-separated, for SEO)</span></label>
          <input name="tags" value={form.tags || ''} onChange={onChange} className={inputCls} placeholder="e.g. sleepwear, women nightwear, buy online BD, eghuri" />
        </div>
        <div>
          <label className={labelCls}>Price (&#x9F3;)</label>
          <input name="unite_price" type="number" step="0.01" value={form.unite_price} onChange={onChange} className={inputCls} />
        </div>
        <div>
          <label className={labelCls}>Sale Price (&#x9F3;)</label>
          <input name="sale_price" type="number" step="0.01" value={form.sale_price} onChange={onChange} className={inputCls} />
        </div>
        <div>
          <label className={labelCls}>SKU</label>
          <div className="mt-1 flex gap-2">
            <input name="sku" value={form.sku} onChange={onChange} className="flex-1 rounded-lg border border-slate-200 p-2.5 text-sm focus:border-[#2f0f6b] focus:outline-none focus:ring-1 focus:ring-[#2f0f6b] dark:border-slate-700 dark:bg-slate-900 dark:text-white dark:focus:border-[#a78bfa] dark:focus:ring-[#a78bfa]" />
            {onGenerateSku && (
              <button type="button" onClick={onGenerateSku} className={btnCls}>Generate</button>
            )}
          </div>
        </div>
        <div>
          <label className={labelCls}>Stock</label>
          <input name="quantity" type="number" value={form.quantity} onChange={onChange} className={inputCls} />
        </div>
        <div>
          <label className={labelCls}>Status</label>
          <select name="status" value={form.status} onChange={onChange} className={inputCls}>
            <option value="draft">Draft</option>
            <option value="publish">Published</option>
          </select>
        </div>
        <div>
          <label className={labelCls}>Featured</label>
          <label className="mt-2 flex cursor-pointer items-center gap-3 rounded-lg border border-slate-200 p-2.5 dark:border-slate-700">
            <input
              type="checkbox"
              name="featured"
              checked={!!form.featured}
              onChange={onChange}
              className="h-4 w-4 rounded border-slate-300 text-[#2f0f6b] focus:ring-[#2f0f6b] dark:border-slate-600 dark:bg-slate-700"
            />
            <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
              Feature on Hot Sales
            </span>
          </label>
        </div>
        <div className="">
          <label className={labelCls}>Categories</label>
          <CategoryMultiSelect categories={categories} selected={selectedCategories || []} onChange={onCategoriesChange} />
        </div>
      </div>

      {/* Dedicated row: Product images */}
      <div className="mt-6 border-t border-slate-200 pt-5 sm:col-span-2 dark:border-slate-700">
        <label className={labelCls}>Product Images</label>
        <p className="mt-1 text-xs text-slate-400 dark:text-slate-500">
          {existingImages.length + newPreviews.length} image(s). Hover an image to remove it.
        </p>
        <div className="mt-3 flex flex-wrap gap-3">
          {existingImages.map((img) => (
            <div key={img.id} className="group relative">
              <img src={img.image_path} alt="" className="h-24 w-24 rounded-lg border border-slate-200 object-cover dark:border-slate-700" />
              <span className="absolute bottom-1 left-1 rounded bg-emerald-500/90 px-1.5 py-0.5 text-[10px] font-medium text-white opacity-0 group-hover:opacity-100 transition">Saved</span>
              <button type="button" onClick={() => onRemoveExisting(img.id)} className="absolute -top-2 -right-2 flex h-6 w-6 items-center justify-center rounded-full bg-red-500 text-white text-xs opacity-0 group-hover:opacity-100 transition hover:bg-red-600" title="Remove image">&times;</button>
            </div>
          ))}
          {newPreviews.map((src, i) => (
            <div key={`new-${i}`} className="group relative">
              <img src={src} alt="" className="h-24 w-24 rounded-lg border-2 border-dashed border-[#2f0f6b] object-cover" />
              <span className="absolute bottom-1 left-1 rounded bg-[#2f0f6b]/90 px-1.5 py-0.5 text-[10px] font-medium text-white opacity-0 group-hover:opacity-100 transition">New</span>
              <button type="button" onClick={() => onRemoveNew(i)} className="absolute -top-2 -right-2 flex h-6 w-6 items-center justify-center rounded-full bg-red-500 text-white text-xs opacity-0 group-hover:opacity-100 transition hover:bg-red-600" title="Remove image">&times;</button>
            </div>
          ))}
          <label className="flex h-24 w-24 cursor-pointer flex-col items-center justify-center gap-1 rounded-lg border-2 border-dashed border-slate-300 text-slate-400 hover:border-[#2f0f6b] hover:text-[#2f0f6b] transition dark:border-slate-600 dark:hover:border-[#a78bfa] dark:hover:text-[#a78bfa]">
            <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4v16m8-8H4" />
            </svg>
            <span className="text-[11px] font-medium">Upload</span>
            <input type="file" multiple accept="image/*" onChange={onAdd} className="hidden" />
          </label>
        </div>
      </div>
    </div>
  );
}
