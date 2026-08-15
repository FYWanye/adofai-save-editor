import { useMemo, useState } from "react";
import { Virtuoso } from "react-virtuoso";
import type { Level } from "../utils/levels";
import { matchesSearch } from "../utils/levels";
import { SearchBar } from "./SearchBar";
import { LevelItem } from "./LevelItem";

interface Props {
  levels: Level[];
  selected: string | null;
  onSelect: (num: string) => void;
}

export function LevelList({ levels, selected, onSelect }: Props) {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");
  const [sort, setSort] = useState("num");

  const visible = useMemo(() => {
    let list = levels.filter((l) => {
      if (filter === "completed" && l.status !== "completed") return false;
      if (filter === "in_progress" && l.status !== "in_progress") return false;
      if (filter === "unplayed" && l.status !== "unplayed") return false;
      return matchesSearch(l, search);
    });

    if (sort === "accuracy") {
      list = [...list].sort((a, b) => (b.accuracy ?? -1) - (a.accuracy ?? -1));
    } else if (sort === "attempts") {
      list = [...list].sort((a, b) => (b.attempts ?? -1) - (a.attempts ?? -1));
    } else {
      list = [...list].sort((a, b) => a.numInt - b.numInt);
    }
    return list;
  }, [levels, search, filter, sort]);

  return (
    <div className="level-list-panel">
      <SearchBar
        search={search}
        onSearch={setSearch}
        filter={filter}
        onFilter={setFilter}
        sort={sort}
        onSort={setSort}
        resultCount={visible.length}
      />

      <div className="level-list">
        {visible.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">🔍</div>
            <div className="empty-text">没有找到匹配的关卡</div>
          </div>
        ) : (
          <Virtuoso
            data={visible}
            computeItemKey={(_, item) => item.num}
            itemContent={(_, item) => (
              <div className="level-item-wrap">
                <LevelItem level={item} selected={item.num === selected} onSelect={onSelect} />
              </div>
            )}
            overscan={400}
            style={{ height: "100%" }}
          />
        )}
      </div>
    </div>
  );
}

