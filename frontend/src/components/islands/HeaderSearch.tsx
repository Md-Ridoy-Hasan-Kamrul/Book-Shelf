import SearchSuggest from './SearchSuggest';

/** Header-sized search with suggest (P2 shell). */
export default function HeaderSearch() {
  return (
    <div className="w-full min-[720px]:max-w-xl min-[720px]:flex-1">
      <SearchSuggest />
    </div>
  );
}
