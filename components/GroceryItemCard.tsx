'use client';

import { useState } from 'react';
import { GroceryItem, AVAILABLE_UNITS, PRIORITY_LEVELS } from '@/types/grocery';

interface GroceryItemCardProps {
  item: GroceryItem;
  onUpdateStatus: (id: number, fields: Partial<GroceryItem>) => void;
  number?: number;
}

export default function GroceryItemCard({ item, onUpdateStatus, number }: GroceryItemCardProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState(item.name);
  const [editUnit, setEditUnit] = useState(item.unit);
  const [editPriority, setEditPriority] = useState(item.priority);
  const [editNotes, setEditNotes] = useState(item.notes);
  const [editQty, setEditQty] = useState<number | ''>(item.quantityNeeded);
  const [editStock, setEditStock] = useState<number | ''>(item.currentStock);

const priority = item.priority ?? 'Low'


const getPriorityBadge = (p?: 'Low' | 'Medium' | 'High') => {
    if (p === 'High') return 'bg-red-100 text-red-700 border-red-200';
    if (p === 'Medium') return 'bg-amber-100 text-amber-700 border-amber-200';
    return 'bg-gray-100 text-gray-600 border-gray-200';
  };

  const handleSave = () => {
    onUpdateStatus(item.id, {
      name: editName,
      unit: editUnit,
      priority: editPriority,
      notes: editNotes,
      quantityNeeded: editQty || 1,
      currentStock: editStock || 0
    });
    setIsEditing(false);
  };

  return (
    <li className="p-4 bg-white border rounded-xl flex flex-col shadow-sm gap-2">
      <div className="flex justify-between items-start gap-2">
        <div className="flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-bold text-gray-900 text-base">{number ? `${number}. ` : ''}{item.name}</span>
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${getPriorityBadge(priority)}`}>
              {priority}
            </span>
          </div>
          <p className="text-xs text-gray-500 mt-1">
            On-hand: <span className={item.currentStock === 0 ? "text-red-500 font-semibold" : ""}>{item.currentStock}</span> {item.unit} | Target: {item.quantityNeeded} {item.unit}
          </p>
          {item.notes && <p className="text-xs text-blue-600 bg-blue-50 px-2 py-1 rounded mt-1.5 border border-blue-100">{item.notes}</p>}
        </div>

        <div className="flex flex-col gap-1 text-right">
          <button 
            onClick={() => onUpdateStatus(item.id, { status: 'bought' })}
            className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold px-3 py-1.5 rounded-lg shadow-sm transition-transform active:scale-95"
          >
            Got Qty ✓
          </button>
          <button 
            onClick={() => onUpdateStatus(item.id, { status: 'unavailable' })}
            className="bg-rose-50 text-rose-600 hover:bg-rose-100 text-[11px] font-bold px-3 py-1.5 rounded-lg border border-rose-200"
          >
            Not Bought ❌
          </button>
          <button 
            onClick={() => setIsEditing(!isEditing)}
            className="text-gray-400 hover:text-blue-600 text-[10px] font-semibold underline mt-1 text-center"
          >
            Modify All Fields ✏️
          </button>
        </div>
      </div>

      {isEditing && (
        <div className="mt-3 pt-3 border-t border-dashed flex flex-col gap-2.5 bg-gray-50 p-3 rounded-lg border">
          <p className="text-[10px] font-black text-gray-400 uppercase tracking-wide">Edit Item Configuration</p>
          
          <div className="grid grid-cols-3 gap-2">
            <div className="col-span-2">
              <label className="text-[9px] font-bold text-gray-400 uppercase block mb-0.5">Item Name</label>
              <input 
                type="text" 
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                className="border p-1.5 rounded bg-white text-xs w-full"
              />
            </div>
            <div>
              <label className="text-[9px] font-bold text-gray-400 uppercase block mb-0.5">Unit</label>
              <select 
                value={editUnit}
                onChange={(e) => setEditUnit(e.target.value)}
                className="border p-1.5 rounded bg-white text-xs w-full h-[29px]"
              >
                {AVAILABLE_UNITS.map(u => <option key={u.value} value={u.value}>{u.value}</option>)}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-[9px] font-bold text-gray-400 uppercase block mb-0.5">Edit Stock</label>
              <input 
                type="number" 
                value={editStock}
                onChange={(e) => setEditStock(e.target.value === '' ? '' : Number(e.target.value))}
                className="border p-1.5 rounded bg-white text-xs w-full"
              />
            </div>
            <div>
              <label className="text-[9px] font-bold text-gray-400 uppercase block mb-0.5">Edit Target Qty</label>
              <input 
                type="number" 
                value={editQty}
                onChange={(e) => setEditQty(e.target.value === '' ? '' : Number(e.target.value))}
                className="border p-1.5 rounded bg-white text-xs w-full"
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2 items-center">
            <div className="col-span-2">
              <label className="text-[9px] font-bold text-gray-400 uppercase block mb-0.5">Change Notes</label>
              <input 
                type="text" 
                value={editNotes} 
                onChange={(e) => setEditNotes(e.target.value)}
                className="border p-1.5 rounded bg-white text-xs w-full"
              />
            </div>
            <div>
              <label className="text-[9px] font-bold text-gray-400 uppercase block mb-0.5">Priority</label>
              <select 
                value={editPriority} 
                onChange={(e) => setEditPriority(e.target.value as 'Low' | 'Medium' | 'High')}
                className="border p-1.5 rounded bg-white text-xs w-full h-[30px]"
              >
                {PRIORITY_LEVELS.map(p => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>
          </div>

          <div className="flex justify-end gap-2 mt-1">
            <button onClick={() => setIsEditing(false)} className="text-xs text-gray-500 px-2 py-1">Cancel</button>
            <button 
              onClick={handleSave}
              className="bg-blue-600 text-white text-xs font-bold px-3 py-1 rounded shadow-sm"
            >
              Save Changes
            </button>
          </div>
        </div>
      )}
    </li>
  );
}