'use client';

import { useState } from 'react';
import { AuthUser, AVAILABLE_UNITS, PRIORITY_LEVELS } from '@/types/grocery';

interface GroceryFormProps {
  onItemAdded: () => void;
}

export default function GroceryForm({ onItemAdded }: GroceryFormProps) {
  const [name, setName] = useState('');
  const [currentStock, setCurrentStock] = useState<number | ''>(0);
  const [quantityNeeded, setQuantityNeeded] = useState<number | ''>(1);
  const [unit, setUnit] = useState('pcs');
  const [priority, setPriority] = useState('Medium');
  const [notes, setNotes] = useState('');

 const handlePublish = async () => {
  if (!name) return;

  const savedUser = localStorage.getItem('household_user');

  if (!savedUser) {
    alert('Please login again.');
    return;
  }

  const user = JSON.parse(savedUser) as AuthUser;

  await fetch('/api/grocery', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      action: 'add',
      userId: user.id,
      userRole: user.role,
      name,
      currentStock,
      quantityNeeded,
      unit,
      priority,
      notes,
    }),
  });

  setName('');
  setNotes('');
  setCurrentStock(0);
  setQuantityNeeded(1);
  setUnit('pcs');
  setPriority('Medium');
  onItemAdded();
};

  return (
    <div className="flex flex-col gap-3 p-4 bg-gray-50 rounded-xl border mb-6">
      <h2 className="text-sm font-bold text-gray-500 uppercase tracking-wider">Add New Requirement</h2>
      <input 
        type="text" 
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Item Name (e.g. Beef)" 
        className="border p-2.5 rounded-lg text-black bg-white focus:outline-blue-500 text-sm"
      />

      <div className="grid grid-cols-3 gap-2">
        <div>
          <label className="text-[10px] font-bold text-gray-400 block mb-1 uppercase">Stock Level</label>
          <input 
            type="number" 
            value={currentStock}
            onChange={(e) => setCurrentStock(e.target.value === '' ? '' : Number(e.target.value))}
            className="border p-2 rounded-lg w-full text-black bg-white text-sm"
          />
        </div>
        <div>
          <label className="text-[10px] font-bold text-gray-400 block mb-1 uppercase">Target Need</label>
          <input 
            type="number" 
            value={quantityNeeded}
            onChange={(e) => setQuantityNeeded(e.target.value === '' ? '' : Number(e.target.value))}
            className="border p-2 rounded-lg w-full text-black bg-white text-sm"
          />
        </div>
        <div>
          <label className="text-[10px] font-bold text-gray-400 block mb-1 uppercase">Unit</label>
          <select
            value={unit}
            onChange={(e) => setUnit(e.target.value)}
            className="border p-2 rounded-lg w-full text-black bg-white h-[38px] text-sm focus:outline-blue-500"
          >
            {AVAILABLE_UNITS.map((u) => <option key={u.value} value={u.value}>{u.label}</option>)}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2 items-end">
        <div className="col-span-2">
          <label className="text-[10px] font-bold text-gray-400 block mb-1 uppercase">Optional Notes</label>
          <input 
            type="text" 
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="e.g. Ribeye cuts only" 
            className="border p-2 rounded-lg w-full text-black bg-white text-sm focus:outline-blue-500"
          />
        </div>
        <div>
          <label className="text-[10px] font-bold text-gray-400 block mb-1 uppercase">Priority</label>
          <select
            value={priority}
            onChange={(e) => setPriority(e.target.value)}
            className="border p-2 rounded-lg w-full text-black bg-white h-[38px] text-sm focus:outline-blue-500"
          >
            {PRIORITY_LEVELS.map((p) => <option key={p} value={p}>{p}</option>)}
          </select>
        </div>
      </div>

      <button onClick={handlePublish} className="bg-blue-600 hover:bg-blue-700 text-white font-bold p-2.5 rounded-lg shadow-sm mt-2 text-sm">
        Publish to Household List
      </button>
    </div>
  );
}