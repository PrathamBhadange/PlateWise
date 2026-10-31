import { GraduationCap, Users, Heart, ShieldCheck } from 'lucide-react';

const ROLES = [
  {
    id: 'student',
    label: 'Student',
    icon: GraduationCap,
  },
  {
    id: 'staff',
    label: 'Staff',
    icon: Users,
  },
  {
    id: 'ngo',
    label: 'NGO',
    icon: Heart,
  },
  {
    id: 'admin',
    label: 'Admin',
    icon: ShieldCheck,
  },
];

export default function RoleSelector({ selectedRole, onSelectRole }) {
  return (
    <div className="w-full">
      <label className="block text-xs font-semibold text-[#252A27] mb-1.5 tracking-wide">
        Select Your Role
      </label>

      {/* 2 columns on mobile, 4 columns on sm+ */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-2.5">
        {ROLES.map((role) => {
          const isSelected = selectedRole === role.id;
          const IconComponent = role.icon;

          return (
            <button
              key={role.id}
              type="button"
              onClick={() => onSelectRole(role.id)}
              className={`group flex flex-col items-center justify-center py-2 px-1.5 sm:py-2.5 sm:px-2 min-h-[46px] rounded-xl transition-all duration-200 cursor-pointer ${
                isSelected
                  ? 'bg-[#E6EFE7] border-2 border-[#245C45] text-[#245C45] shadow-xs'
                  : 'bg-white border border-[#245C45]/15 text-[#252A27]/80 hover:bg-[#E6EFE7]/40 hover:border-[#245C45]/40 hover:text-[#245C45]'
              }`}
              aria-pressed={isSelected}
            >
              <div
                className={`w-6 h-6 sm:w-7 sm:h-7 rounded-lg flex items-center justify-center transition-transform group-hover:scale-105 ${
                  isSelected
                    ? 'text-[#245C45]'
                    : 'text-[#6B8F71] group-hover:text-[#245C45]'
                }`}
              >
                <IconComponent className="w-4 h-4" />
              </div>
              <span
                className={`text-xs tracking-tight ${
                  isSelected ? 'font-semibold text-[#245C45]' : 'font-medium'
                }`}
              >
                {role.label}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
