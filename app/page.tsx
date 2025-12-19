'use client';

import { useEffect, useState, useMemo } from 'react';
import { VirtuosoGrid } from 'react-virtuoso';
import { Card } from './components/Card';
import { Modal } from './components/Modal';
import { Drawer, type FilterOptions, type Tag } from './components/Drawer';
import type { MediaItem } from './types/media';

export default function ListPage() {
  const [list, setList] = useState<MediaItem[]>([]);
  const [sortOrder, setSortOrder] = useState('newest');
  const [selectedMedia, setSelectedMedia] = useState<MediaItem | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [tags, setTags] = useState<Tag[]>([]);
  const [filters, setFilters] = useState<FilterOptions>({
    searchText: '',
    selectedRates: [],
    selectedTypes: [],
    selectedTags: [],
  });

  useEffect(() => {
    fetch('/api/data')
      .then(r => r.json())
      .then((data: any[]) => {
        const mapped = data.map((item: any) => ({
          ...item,
          thumbs: [], // thumbs now fetched per-item from /api/thumbs/{id}
        }));
        setList(mapped.sort((a: any, b: any) => b.date - a.date));
      })
      .catch(console.error);
  }, []);

  // タグ一覧を取得
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch('/api/tags');
        if (!res.ok) return;
        const rows: Tag[] = await res.json();
        setTags(rows);
      } catch (e) {
        console.error('failed to load tags', e);
      }
    })();
  }, []);

  // 旧: listからタグ文字列を抽出して初期化するロジックは削除（DBのtag_itemsを使用）

  // helper to fetch thumbs for a media id
  const fetchThumbs = async (mediaId: number): Promise<string[]> => {
    try {
      const res = await fetch(`/api/thumbs/${mediaId}`);
      if (!res.ok) return [];
      const json = await res.json();
      if (Array.isArray(json)) return json;
      if (json && Array.isArray(json.thumbs)) return json.thumbs;
      return [];
    } catch (err) {
      console.error('failed to fetch thumbs', err);
      return [];
    }
  };

  // 利用可能なタグはDBから取得したもの
  const availableTags = useMemo(() => {
    return [...tags].sort((a, b) => a.name.localeCompare(b.name));
  }, [tags]);

  // フィルタリングとソート
  const filteredAndSortedList = useMemo(() => {
    // 空選択の扱い: 評価 or タイプが全未選択なら結果なし
    if (filters.selectedRates.length === 0 || filters.selectedTypes.length === 0) {
      return [];
    }

    // まずフィルタリング
    let filtered = [...list];

    // ファイル名検索
    if (filters.searchText) {
      const searchLower = filters.searchText.toLowerCase();
      filtered = filtered.filter(item => 
        item.title.toLowerCase().includes(searchLower)
      );
    }

    // 評価フィルター
    if (filters.selectedRates.length > 0) {
      filtered = filtered.filter(item => 
        filters.selectedRates.includes(item.rate)
      );
    }

    // メディアタイプフィルター
    if (filters.selectedTypes.length > 0) {
      filtered = filtered.filter(item => 
        filters.selectedTypes.includes(item.type)
      );
    }

    // タグフィルター（selectedTagsはtag id配列）
    if (filters.selectedTags.length > 0) {
      const nameToId = new Map<string, number>(tags.map(t => [t.name, t.id]));
      filtered = filtered.filter(item => {
        if (!item.tags) return false;

        // JSON配列（例: "[72,65,48]"）を優先して解析
        const itemTagIds = (() => {
          const raw = item.tags;
          try {
            const parsed = JSON.parse(raw);
            if (Array.isArray(parsed)) {
              return parsed
                .map(v => Number(v))
                .filter(n => !Number.isNaN(n));
            }
          } catch (_) {
            // JSONでなければ後続のフォールバックへ
          }

          // フォールバック1: 文字列から数字以外を除去してID配列化（角括弧等を無視）
          const onlyNums = raw.replace(/[^0-9,]/g, '');
          const numeric = onlyNums
            .split(',')
            .map(s => Number(s))
            .filter(n => !Number.isNaN(n));
          if (numeric.length > 0) return numeric;

          // フォールバック2: 名前が入っている場合はname->id変換
          const names = raw.split(',').map(s => s.trim()).filter(Boolean);
          const fromNames = names
            .map(name => nameToId.get(name))
            .filter((id): id is number => typeof id === 'number');
          return fromNames;
        })();

        if (itemTagIds.length === 0) return false;
        return filters.selectedTags.some(selId => itemTagIds.includes(selId));
      });
    }

    // 次にソート
    switch (sortOrder) {
      case 'newest':
        return filtered.sort((a, b) => b.date - a.date);
      case 'oldest':
        return filtered.sort((a, b) => a.date - b.date);
      case 'most_played':
        return filtered.sort((a, b) => (b.play_count || 0) - (a.play_count || 0));
      case 'highest_rated':
        return filtered.sort((a, b) => b.rate - a.rate);
      case 'last_played':
        return filtered.sort((a, b) => (b.last_played || 0) - (a.last_played || 0));
      default:
        return filtered.sort((a, b) => b.date - a.date);
    }
  }, [list, sortOrder, filters]);
  
  // 初期フィルター設定（DBからタグ取得後に全選択状態にする）
  useEffect(() => {
    if (list.length > 0 && tags.length > 0) {
      setFilters(prev => {
        // 既に選択済みなら変更しない
        if (prev.selectedRates.length && prev.selectedTypes.length && prev.selectedTags.length) return prev;
        return {
          searchText: '',
          selectedRates: [5, 4, 3, 2, 1, 0],
          selectedTypes: ['video', 'image', 'anime'],
          selectedTags: [],
        };
      });
    }
  }, [list, tags]);

  const openModal = (item: MediaItem) => {
    (async () => {
      const thumbs = await fetchThumbs(item.id);
      setSelectedMedia({ ...item, thumbs });
      setIsModalOpen(true);
    })();
  }
  const closeModal = async () => {
    // Refresh thumbs for the selected media before closing
    if (selectedMedia) {
      const thumbs = await fetchThumbs(selectedMedia.id);
      setList(prev => prev.map(m => m.id === selectedMedia.id ? { ...m, thumbs } : m));
    }
    setIsModalOpen(false);
    setSelectedMedia(null);
  };

  const addThumbToMedia = (thumb: string) => {
    if (!selectedMedia) return;
    // persist to server then update local state
    (async () => {
      try {
        const res = await fetch('/api/thumbs/add', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ media: selectedMedia.id, thumb }),
        });
        const json = await res.json();
        if (!res.ok) throw new Error(json?.message || 'failed');
        const thumbs = json.thumbs || ((selectedMedia.thumbs || []).concat([thumb]));
        setList(prev => prev.map(m => m.id === selectedMedia.id ? { ...m, thumbs } : m));
        setSelectedMedia(prev => prev ? { ...prev, thumbs } : prev);
      } catch (err) {
        console.error('failed to add thumb', err);
      }
    })();
  };

  const removeThumbFromMedia = (index: number) => {
    if (!selectedMedia) return;
    (async () => {
      try {
        const res = await fetch('/api/thumbs/remove', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ media: selectedMedia.id, index }),
        });
        const json = await res.json();
        if (!res.ok) throw new Error(json?.message || 'failed');
        const thumbs = json.thumbs || (selectedMedia.thumbs || []).filter((_, i) => i !== index);
        setList(prev => prev.map(m => m.id === selectedMedia.id ? { ...m, thumbs } : m));
        setSelectedMedia(prev => prev ? { ...prev, thumbs } : prev);
      } catch (err) {
        console.error('failed to remove thumb', err);
      }
    })();
  };

  // 評価を行う（楽観更新してサーバーへ送信）
  const rateMedia = (mediaId: number, rating: number) => {
    // optimistic update
    setList(prev => prev.map(m => m.id === mediaId ? { ...m, rate: rating } : m));
    setSelectedMedia(prev => prev ? { ...prev, rate: rating } : prev);

    (async () => {
      try {
        await fetch('/api/rate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ media: mediaId, rate: rating }),
        });
      } catch (err) {
        console.error('failed to send rating', err);
      }
    })();
  };

  const openLocally = async (item: MediaItem) => {
    const confirmed = window.confirm(`${item.title} をローカルで開きますか？`);
    if (!confirmed) return;

    const now = Math.floor(Date.now() / 1000);
    const href = `mytube:N:\\Videos\\${item.title}`;

    try {
      await fetch('/api/history', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ media: item.id, date: now }),
      });
      setList(prev => prev.map(m => m.id === item.id ? { ...m, play_count: (m.play_count || 0) + 1, last_played: now } : m));
      setSelectedMedia(prev => (prev && prev.id === item.id) ? { ...prev, play_count: (prev.play_count || 0) + 1, last_played: now } : prev);
    } catch (err) {
      console.error('履歴の記録に失敗しました', err);
    }

    window.location.href = href;
  };

  return (
    <>
      <header>
        <Drawer 
          sortOrder={sortOrder} 
          setSortOrder={setSortOrder}
          filters={filters}
          setFilters={setFilters}
          availableTags={availableTags}
        />
      </header>
      <div className="pt-15">
        <VirtuosoGrid
          style={{ height: 'calc(100vh - var(--spacing) * 15)' }}
          totalCount={filteredAndSortedList.length}
          listClassName="container mx-auto p-5 grid grid-cols-2 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-3"
          itemContent={(index) => {
            const media = filteredAndSortedList[index];
            if (!media) return <div />;
            return (
              <div key={media.id}>
                <button onClick={() => openModal(media)} className="w-full p-0 bg-transparent border-0 text-left">
                  <Card media={media} />
                </button>
              </div>
            );
          }}
        />
      </div>
      {isModalOpen && (
        <Modal
          item={selectedMedia}
          onClose={closeModal}
          onAddThumb={addThumbToMedia}
          onRemoveThumb={removeThumbFromMedia}
          onRate={(r) => { if (selectedMedia) rateMedia(selectedMedia.id, r); }}
          onOpenLocal={openLocally}
        />
      )}
    </>
  );
}
