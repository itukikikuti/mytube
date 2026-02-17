import { useEffect, useState } from 'react';

export interface Tag {
  id: number;
  name: string;
}

export interface FilterOptions {
  searchText: string;
  selectedRates: number[];
  selectedTypes: string[];
  selectedTags: number[]; // tag ids
}

interface DrawerProps {
  sortOrder: string;
  setSortOrder: (s: string) => void;
  filters: FilterOptions;
  setFilters: (f: FilterOptions) => void;
  availableTags: Tag[];
}

export function Drawer({ sortOrder, setSortOrder, filters, setFilters, availableTags }: DrawerProps) {
  const [tempFilters, setTempFilters] = useState<FilterOptions>(filters);

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setTempFilters({ ...tempFilters, searchText: e.target.value });
  };

  const handleRateToggle = (rate: number) => {
    const newRates = tempFilters.selectedRates.includes(rate)
      ? tempFilters.selectedRates.filter(r => r !== rate)
      : [...tempFilters.selectedRates, rate];
    setTempFilters({ ...tempFilters, selectedRates: newRates });
  };

  const handleTypeToggle = (type: string) => {
    const newTypes = tempFilters.selectedTypes.includes(type)
      ? tempFilters.selectedTypes.filter(t => t !== type)
      : [...tempFilters.selectedTypes, type];
    setTempFilters({ ...tempFilters, selectedTypes: newTypes });
  };

  const handleTagToggle = (tagId: number) => {
    const newTags = tempFilters.selectedTags.includes(tagId)
      ? tempFilters.selectedTags.filter(t => t !== tagId)
      : [...tempFilters.selectedTags, tagId];
    setTempFilters({ ...tempFilters, selectedTags: newTags });
  };

  const applyFilters = () => {
    setFilters(tempFilters);
  };

  // 親のfiltersが更新されたら一時フィルターも同期（初期表示で全チェック反映）
  useEffect(() => {
    setTempFilters(filters);
  }, [filters]);

  return (
    <aside className="w-full sm:w-64 sm:h-screen bg-white sm:shadow-xl overflow-y-auto sm:sticky sm:top-0">
      <div className="p-4">
        <div className="text-lg font-semibold select-none mb-4">MyTube</div>
          {/* 検索ボックス */}
          <div className="mb-4">
            <label className="block text-sm font-medium mb-1">ファイル名検索</label>
            <input
              type="text"
              value={tempFilters.searchText}
              onChange={handleSearchChange}
              placeholder="タイトルで検索"
              className="w-full border rounded p-2 text-md"
            />
          </div>

          {/* 並び順 */}
          <div className="mb-4">
            <label className="block text-sm font-medium mb-1">並び順</label>
            <select
              value={sortOrder}
              onChange={(e) => setSortOrder(e.target.value)}
              className="w-full border rounded p-2 text-md"
              aria-label="並び順"
            >
              <option value="newest">新しい順</option>
              <option value="oldest">古い順</option>
              <option value="last_played">再生した順</option>
              <option value="most_played">再生回数が多い順</option>
              <option value="highest_rated">評価が高い順</option>
            </select>
          </div>

          {/* 評価フィルター */}
          <div className="mb-4">
            <label className="block text-sm font-medium mb-2">評価</label>
            <div className="space-y-1">
              {[5, 4, 3, 2, 1, 0].map(rate => (
                <label key={rate} className="flex items-center">
                  <input
                    type="checkbox"
                    checked={tempFilters.selectedRates.includes(rate)}
                    onChange={() => handleRateToggle(rate)}
                    className="mr-2"
                  />
                  <span>{rate === 0 ? '未評価' : `${rate}★`}</span>
                </label>
              ))}
            </div>
          </div>

          {/* メディアタイプフィルター */}
          <div className="mb-4">
            <label className="block text-sm font-medium mb-2">メディアタイプ</label>
            <div className="space-y-1">
              {['video', 'image', 'anime'].map(type => (
                <label key={type} className="flex items-center">
                  <input
                    type="checkbox"
                    checked={tempFilters.selectedTypes.includes(type)}
                    onChange={() => handleTypeToggle(type)}
                    className="mr-2"
                  />
                  <span className="capitalize">
                    {type === 'video' ? '動画' : type === 'image' ? '画像' : 'GIF'}
                  </span>
                </label>
              ))}
            </div>
          </div>

          {/* タグフィルター */}
          <div className="mb-4">
            <label className="block text-sm font-medium mb-2">タグ</label>
            {availableTags.length > 0 ? (
              <div className="space-y-1 max-h-48 overflow-y-auto">
                {availableTags.map(tag => (
                  <label key={tag.id} className="flex items-center">
                    <input
                      type="checkbox"
                      checked={tempFilters.selectedTags.includes(tag.id)}
                      onChange={() => handleTagToggle(tag.id)}
                      className="mr-2"
                    />
                    <span>{tag.name}</span>
                  </label>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-500">タグがありません</p>
            )}
          </div>

          {/* 適用ボタン */}
          <div className="mb-4">
            <button
              onClick={applyFilters}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded transition-colors"
            >
              この条件で絞り込む
            </button>
          </div>
      </div>
    </aside>
  );
}
