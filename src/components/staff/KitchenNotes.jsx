import { useState } from 'react';
import { ClipboardCheck, Plus, Check } from 'lucide-react';

export default function KitchenNotes() {
  const [tasks, setTasks] = useState([
    { id: 1, text: 'Check sambar stock', completed: false },
    { id: 2, text: 'Prepare more chapatis', completed: false },
    { id: 3, text: 'Paneer supply received', completed: false },
    { id: 4, text: 'Clean preparation area', completed: true },
    { id: 5, text: 'Update menu availability', completed: false },
  ]);

  const [newTaskInput, setNewTaskInput] = useState('');
  const [isAdding, setIsAdding] = useState(false);

  const toggleTask = (id) => {
    setTasks((prev) =>
      prev.map((t) => (t.id === id ? { ...t, completed: !t.completed } : t))
    );
  };

  const handleAddTask = (e) => {
    e.preventDefault();
    if (!newTaskInput.trim()) return;
    setTasks((prev) => [
      ...prev,
      { id: Date.now(), text: newTaskInput.trim(), completed: false },
    ]);
    setNewTaskInput('');
    setIsAdding(false);
  };

  const completedCount = tasks.filter((t) => t.completed).length;

  return (
    <div className="bg-white rounded-2xl sm:rounded-3xl p-5 sm:p-6 border border-[#245C45]/15 shadow-2xs text-left">
      <div className="flex items-center justify-between pb-3 border-b border-[#245C45]/10">
        <div>
          <h3 className="font-serif text-lg font-bold text-[#252A27]">
            Kitchen Notes
          </h3>
          <p className="text-[11px] text-[#252A27]/60">
            Shift checklist ({completedCount}/{tasks.length} completed)
          </p>
        </div>

        <button
          type="button"
          onClick={() => setIsAdding(!isAdding)}
          className="p-1.5 rounded-lg text-[#245C45] hover:bg-[#E6EFE7] transition-colors cursor-pointer"
          aria-label="Add checklist item"
        >
          <Plus className="w-4 h-4" />
        </button>
      </div>

      {/* Add Task input */}
      {isAdding && (
        <form onSubmit={handleAddTask} className="mt-3 flex gap-2">
          <input
            type="text"
            value={newTaskInput}
            onChange={(e) => setNewTaskInput(e.target.value)}
            placeholder="New kitchen task..."
            className="flex-1 text-xs px-3 py-1.5 border border-[#245C45]/20 rounded-xl outline-none focus:border-[#245C45]"
          />
          <button
            type="submit"
            className="px-3 py-1.5 bg-[#245C45] text-white text-xs font-semibold rounded-xl"
          >
            Add
          </button>
        </form>
      )}

      {/* Checklist items */}
      <div className="mt-3 space-y-2">
        {tasks.map((task) => (
          <label
            key={task.id}
            className={`flex items-center gap-2.5 p-2 rounded-xl transition-all cursor-pointer ${
              task.completed ? 'bg-[#E6EFE7]/40 text-[#252A27]/50 line-through' : 'hover:bg-[#F8F7F2] text-[#252A27]'
            }`}
          >
            <input
              type="checkbox"
              checked={task.completed}
              onChange={() => toggleTask(task.id)}
              className="w-4 h-4 rounded text-[#245C45] focus:ring-[#245C45] accent-[#245C45] cursor-pointer"
            />
            <span className="text-xs font-medium flex-1 select-none">
              {task.text}
            </span>
            {task.completed && (
              <Check className="w-3.5 h-3.5 text-[#245C45]" />
            )}
          </label>
        ))}
      </div>

      <div className="pt-3 mt-3 border-t border-[#245C45]/10 flex items-center gap-1.5 text-[10px] text-[#6B8F71]">
        <ClipboardCheck className="w-3.5 h-3.5" />
        <span>Hygiene & inventory verified by Head Chef</span>
      </div>
    </div>
  );
}
