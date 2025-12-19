import { useState } from 'react';
import { HiMenu, HiX } from 'react-icons/hi';

interface DrawerProps {
  sortOrder: string;
  setSortOrder: (s: string) => void;
}

export function Drawer({ sortOrder, setSortOrder }: DrawerProps) {
  const [isOpen, setIsOpen] = useState(false);

  const toggleDrawer = () => {
    setIsOpen(!isOpen);
  };

  return (
    <nav className="fixed top-0 left-0 w-full z-40 bg-white p-4 flex items-center">
      <button className="relative z-50 focus:outline-none" onClick={toggleDrawer} aria-label="Toggle Menu">
        {isOpen ? <HiX className="w-6 h-6" /> : <HiMenu className="w-6 h-6" />}
      </button>

      <div className="ml-3 text-lg font-semibold select-none">MyTube</div>

      <div
        className={`fixed top-0 left-0 h-full w-full sm:w-128 bg-white shadow-xl transform transition-transform duration-300 ease-in-out z-20 ${isOpen ? 'translate-x-0' : '-translate-x-full'}`}
      >
        <div className="p-4 pt-16">
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
        </div>
      </div>

      {isOpen && <div className="fixed inset-0 z-10" onClick={toggleDrawer}></div>}
    </nav>
  );
}
