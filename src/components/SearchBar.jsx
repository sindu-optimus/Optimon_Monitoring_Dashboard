import "./SearchBar.css";

const SearchBar = ({
  value,
  onChange,
  onClear,
  label,
  placeholder = "Search here...",
  className = "",
  labelClassName = "",
  fieldClassName = "",
  inputClassName = "",
  id,
}) => {
  const inputId = id || label?.toLowerCase().replace(/\s+/g, "-") || "search";

  return (
    <div className={`search-bar ${className}`.trim()}>
      {label && (
        <label className={labelClassName} htmlFor={inputId}>
          {label}
        </label>
      )}
      <div className={`search-bar-field ${fieldClassName}`.trim()}>
        <i className="ri-search-line" aria-hidden="true" />
        <input
          id={inputId}
          type="search"
          className={inputClassName}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder={placeholder}
        />
        {value && (
          <button
            type="button"
            className="search-bar-clear"
            onClick={() => (onClear ? onClear() : onChange(""))}
            aria-label="Clear search"
          >
            <i className="ri-close-line" aria-hidden="true" />
          </button>
        )}
      </div>
    </div>
  );
};

export default SearchBar;
