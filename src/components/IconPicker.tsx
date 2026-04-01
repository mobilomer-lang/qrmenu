import { useState } from 'react';
import * as Icons from 'lucide-react';

const FOOD_ICONS = [
  'Utensils', 'Pizza', 'Coffee', 'Beer', 'IceCream', 'Sandwich', 'Soup', 'Wine', 'Apple', 'Cherry', 'Burger', 'CupSoda', 'Drumstick', 'Fish', 'Milk', 'Salad',
  'Cake', 'Croissant', 'Cookie', 'Donut', 'Beef', 'Carrot', 'Citrus', 'Egg', 'Grapes', 'Ice', 'Lemon', 'Mushroom', 'Nut', 'Pepper', 'Pizza', 'Sandwich', 'Shrimp', 'Sprout', 'Wheat'
];

export default function IconPicker({ selectedIcon, onSelect }: { selectedIcon: string, onSelect: (icon: string) => void }) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');

  const filteredIcons = FOOD_ICONS.filter(icon => icon.toLowerCase().includes(search.toLowerCase()));
  const SelectedIcon = (Icons as any)[selectedIcon] || Icons.Utensils;

  return (
    <div className="relative">
      <button type="button" onClick={() => setIsOpen(!isOpen)} className="flex items-center gap-2 border border-gray-200 p-2 rounded-lg text-sm w-full">
        <SelectedIcon size={20} />
        <span>{selectedIcon || 'İkon Seç'}</span>
      </button>
      {isOpen && (
        <div className="absolute z-10 bg-white border border-gray-200 p-3 rounded-lg shadow-lg w-64 mt-1 max-h-64 overflow-y-auto">
          <input 
            value={search} 
            onChange={e => setSearch(e.target.value)}
            placeholder="İkon ara..."
            className="border border-gray-200 p-2 rounded-lg text-sm w-full mb-2"
          />
          <div className="grid grid-cols-4 gap-2">
            {filteredIcons.map(iconName => {
              const Icon = (Icons as any)[iconName];
              if (!Icon) return null;
              return (
                <button 
                  key={iconName}
                  onClick={() => { onSelect(iconName); setIsOpen(false); }}
                  className={`p-2 rounded-lg hover:bg-gray-100 ${selectedIcon === iconName ? 'border-2 border-[#22c55e]' : ''}`}
                >
                  <Icon size={24} />
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
