import { Link } from 'react-router-dom';
import {
  ChefHat,
  ShieldCheck,
  AlertCircle,
  FilePlus,
  Home,
  Database,
  ArrowRight,
} from 'lucide-react';
import Member4Header from '../../components/dashboard/Member4Header';

export default function DevIndex() {
  const routes = [
    {
      title: 'Kitchen & Demand Analytics',
      path: '/kitchen',
      icon: ChefHat,
      desc: 'Demand recommendations (4-wk weekday avg + pre-orders - >15% waste reduction), daily prep stats, CSV prep sheet export, sales charts.',
      role: 'Role: kitchen or admin',
      tag: 'Demand Engine',
    },
    {
      title: 'Admin Governance & Sustainability Impact',
      path: '/admin',
      icon: ShieldCheck,
      desc: 'Portions saved, donated & wasted, monthly trends (LAG window func), complaints-by-status breakdown, and trigger-generated audit logs (CDC).',
      role: 'Role: admin',
      tag: 'Sustainability KPI',
    },
    {
      title: 'Complaints & Escalation Desk',
      path: '/admin/complaints',
      icon: AlertCircle,
      desc: 'Filterable complaint tickets, dynamic countdown timer to SLA breach, slide-out triage drawer, and manual "Run Escalation Now" trigger.',
      role: 'Role: admin or kitchen',
      tag: 'SLA Escalation',
    },
    {
      title: 'Student Grievance Intake Form',
      path: '/complaints/new',
      icon: FilePlus,
      desc: 'Student submission form with automated rule-based NLP classification detecting incident severity and setting binding resolution deadlines.',
      role: 'Role: student, kitchen, or admin',
      tag: 'Public Intake',
    },
    {
      title: 'Campus Landing Page',
      path: '/',
      icon: Home,
      desc: 'The original unaltered PlateWise landing page at root ("/") with its complete existing component hierarchy and modals.',
      role: 'Role: all campus visitors',
      tag: 'Landing Page',
    },
  ];

  return (
    <div className="min-h-screen bg-[#F8F7F2] text-[#252A27] flex flex-col font-sans">
      <Member4Header
        title="PlateWise Developer & Viva Demonstration Hub"
        subtitle="Quick access navigation for Member 4 modules and DBMS objects"
      />

      <main className="flex-1 max-w-5xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        <div className="bg-white rounded-2xl border border-[#245C45]/10 shadow-sm p-5 sm:p-6">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-[#E6EFE7] text-[#245C45]">
              <Database className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-lg font-serif font-bold text-[#252A27]">
                Member 4: Database & Analytics Subsystem
              </h2>
              <p className="text-xs text-[#252A27]/60">
                All dashboards, APIs, triggers, stored procedures, and 3NF database artifacts
              </p>
            </div>
          </div>
        </div>

        {/* Route Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {routes.map((r) => {
            const Icon = r.icon;
            return (
              <Link
                key={r.path}
                to={r.path}
                className="group bg-white rounded-2xl border border-[#245C45]/10 shadow-sm p-5 hover:border-[#245C45]/30 hover:shadow-md transition-all flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <div className="flex items-center gap-2">
                      <div className="p-2 rounded-xl bg-[#E6EFE7] text-[#245C45] group-hover:bg-[#245C45] group-hover:text-white transition-colors">
                        <Icon className="w-5 h-5" />
                      </div>
                      <span className="font-serif font-bold text-base text-[#252A27]">
                        {r.title}
                      </span>
                    </div>
                    <span className="text-[11px] font-semibold text-[#245C45] bg-[#E6EFE7] px-2.5 py-0.5 rounded-full">
                      {r.tag}
                    </span>
                  </div>

                  <p className="text-xs text-[#252A27]/70 leading-relaxed">
                    {r.desc}
                  </p>
                </div>

                <div className="pt-4 border-t border-[#245C45]/10 flex items-center justify-between text-xs mt-4">
                  <span className="text-[#252A27]/50 font-medium">{r.role}</span>
                  <span className="font-semibold text-[#245C45] inline-flex items-center gap-1 group-hover:translate-x-1 transition-transform">
                    <span>Open Route</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </span>
                </div>
              </Link>
            );
          })}
        </div>
      </main>
    </div>
  );
}
