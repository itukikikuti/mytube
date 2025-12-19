'use client';

import { useEffect, useState, useMemo } from 'react';
import { VirtuosoGrid } from 'react-virtuoso';
import { Card } from './components/Card';
import { Modal } from './components/Modal';
import { Drawer, type FilterOptions } from './components/Drawer';
import type { MediaItem } from './types/media';

export default function ListPage() {
  const [list, setList] = useState<MediaItem[]>([]);
  const [sortOrder, setSortOrder] = useState('newest');
  const [selectedMedia, setSelectedMedia] = useState<MediaItem | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
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

  // 初期フィルター設定（データ読み込み後に全選択状態にする）
  useEffect(() => {
    if (list.length > 0 && filters.selectedRates.length === 0) {
      const tagSet = new Set<string>();
      list.forEach(item => {
        if (item.tags) {
          item.tags.split(',').forEach(tag => {
            const trimmed = tag.trim();
            if (trimmed) tagSet.add(trimmed);
          });
        }
      });
      
      setFilters({
        searchText: '',
        selectedRates: [5, 4, 3, 2, 1, 0],
        selectedTypes: ['video', 'image', 'anime'],
        selectedTags: Array.from(tagSet),
      });
    }
  }, [list]);

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

  // 利用可能なタグを抽出
  const availableTags = useMemo(() => {
    const tagSet = new Set<string>();
    list.forEach(item => {
      if (item.tags) {
        item.tags.split(',').forEach(tag => {
          const trimmed = tag.trim();
          if (trimmed) tagSet.add(trimmed);
        });
      }
    });
    return Array.from(tagSet).sort();
  }, [list]);

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

    // タグフィルター
    if (filters.selectedTags.length > 0) {
      filtered = filtered.filter(item => {
        if (!item.tags) return false;
        const itemTags = item.tags.split(',').map(t => t.trim());
        return filters.selectedTags.some(selectedTag => 
          itemTags.includes(selectedTag)
        );
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
