interface Props {
  search: string;
  onSearch: (value: string) => void;
  filter: string;
  onFilter: (value: string) => void;
  sort: string;
  onSort: (value: string) => void;
  resultCount: number;
}

export function SearchBar({ search, onSearch, filter, onFilter, sort, onSort, resultCount }: Props) {
  return (
    <div className="list-toolbar">
      <div className="search-wrap">
        <span className="search-icon" aria-hidden>
          🔍
        </span>
        <input
          className="search"
          placeholder="搜索名称 / 编号 / 精准度 / 尝试 / 飚速…"
          value={search}
          onChange={(e) => onSearch(e.target.value)}
        />
        {search && (
          <button className="search-clear" onClick={() => onSearch("")} aria-label="清除搜索">
            ×
          </button>
        )}
      </div>

      <select value={filter} onChange={(e) => onFilter(e.target.value)}>
        <option value="all">全部</option>
        <option value="completed">已完成</option>
        <option value="in_progress">进行中</option>
        <option value="unplayed">未完成</option>
      </select>

      <select value={sort} onChange={(e) => onSort(e.target.value)}>
        <option value="num">按关卡号</option>
        <option value="accuracy">精准度 ↓</option>
        <option value="attempts">尝试次数 ↓</option>
      </select>

      <span className="result-count">{resultCount} 个关卡</span>
    </div>
  );
}
