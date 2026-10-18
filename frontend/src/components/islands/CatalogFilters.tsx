type Props = {
  genre?: string;
  language?: string;
  type?: string;
  sort?: string;
};

export default function CatalogFilters({ genre, language, type, sort }: Props) {
  return (
    <form
      method="get"
      className="flex flex-wrap gap-3 rounded-[var(--radius-card)] border border-line bg-paper p-4"
    >
      <label className="text-sm font-semibold text-ink-900">
        Language
        <select
          name="language"
          defaultValue={language ?? ''}
          className="ml-2 min-h-10 rounded-lg border border-line px-2"
        >
          <option value="">Any</option>
          <option value="bn">Bangla</option>
          <option value="en">English</option>
        </select>
      </label>
      <label className="text-sm font-semibold text-ink-900">
        Type
        <select
          name="type"
          defaultValue={type ?? ''}
          className="ml-2 min-h-10 rounded-lg border border-line px-2"
        >
          <option value="">Any</option>
          <option value="NEW">New</option>
          <option value="USED">Used</option>
        </select>
      </label>
      <label className="text-sm font-semibold text-ink-900">
        Sort
        <select
          name="sort"
          defaultValue={sort ?? 'newest'}
          className="ml-2 min-h-10 rounded-lg border border-line px-2"
        >
          <option value="newest">Newest</option>
          <option value="price_asc">Price ↑</option>
          <option value="price_desc">Price ↓</option>
          <option value="title">Title</option>
        </select>
      </label>
      {genre && <input type="hidden" name="genre" value={genre} />}
      <button
        type="submit"
        className="min-h-10 rounded-lg bg-brand-600 px-4 text-sm font-semibold text-paper"
      >
        Apply
      </button>
    </form>
  );
}
