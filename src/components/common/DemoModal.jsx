import { X, Sparkles, Smartphone, QrCode, HeartHandshake } from 'lucide-react';
import heroMealImg from '../../assets/images/hero-meal.jpg';

export default function DemoModal({ isOpen, onClose }) {
  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-2xl bg-[#F8F7F2] rounded-2xl shadow-2xl border border-[#245C45]/20 overflow-hidden p-6 sm:p-8 max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-[#252A27]/60 hover:text-[#252A27] hover:bg-[#E6EFE7] rounded-lg transition-colors cursor-pointer"
          aria-label="Close modal"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Title */}
        <div className="flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold tracking-wider uppercase bg-[#E6EFE7] text-[#245C45] w-fit mb-3">
          <Sparkles className="w-3.5 h-3.5 text-[#E99A55]" />
          <span>PlateWise Interactive Walkthrough</span>
        </div>

        <h3 className="font-serif text-2xl sm:text-3xl font-bold text-[#252A27]">
          How the Zero-Waste Ecosystem Operates
        </h3>
        <p className="mt-2 text-sm text-[#252A27]/75">
          See how our AI-powered smart canteen connects the dining hall with community food equity.
        </p>

        {/* Visual Banner */}
        <div className="mt-5 rounded-xl overflow-hidden border border-[#245C45]/15 relative">
          <img
            src={heroMealImg}
            alt="PlateWise meal workflow"
            className="w-full h-44 object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent flex items-end p-4">
            <span className="text-white text-sm font-medium">
              Fresh vegetarian thali meals tracked from kitchen preparation to pickup
            </span>
          </div>
        </div>

        {/* Workflow Steps */}
        <div className="mt-6 space-y-4">
          <div className="p-4 rounded-xl bg-white border border-[#245C45]/10 flex gap-4 items-start">
            <div className="w-9 h-9 rounded-lg bg-[#E6EFE7] text-[#245C45] flex items-center justify-center flex-shrink-0">
              <Smartphone className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-sm font-semibold text-[#252A27]">
                1. Demand-Based Pre-Ordering
              </h4>
              <p className="text-xs text-[#252A27]/75 mt-0.5">
                Students lock in their meal preferences 1–2 hours in advance. Canteen chefs cook accurate portion counts instead of guesswork bulk preparation.
              </p>
            </div>
          </div>

          <div className="p-4 rounded-xl bg-white border border-[#245C45]/10 flex gap-4 items-start">
            <div className="w-9 h-9 rounded-lg bg-[#E6EFE7] text-[#245C45] flex items-center justify-center flex-shrink-0">
              <QrCode className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-sm font-semibold text-[#252A27]">
                2. Contactless Express Pickup
              </h4>
              <p className="text-xs text-[#252A27]/75 mt-0.5">
                Flash your digital order token at the designated PlateWise express counter. Zero queue congestion and guaranteed fresh warm food.
              </p>
            </div>
          </div>

          <div className="p-4 rounded-xl bg-white border border-[#245C45]/10 flex gap-4 items-start">
            <div className="w-9 h-9 rounded-lg bg-[#E6EFE7] text-[#245C45] flex items-center justify-center flex-shrink-0">
              <HeartHandshake className="w-5 h-5 text-[#E99A55]" />
            </div>
            <div>
              <h4 className="text-sm font-semibold text-[#252A27]">
                3. Surplus Redistribution Dispatch
              </h4>
              <p className="text-xs text-[#252A27]/75 mt-0.5">
                At the closing bell, any untouched meals are logged in the database and picked up by local verified NGOs for immediate redistribution in Nashik.
              </p>
            </div>
          </div>
        </div>

        {/* Close Button at Bottom */}
        <div className="mt-6 pt-4 border-t border-[#245C45]/10 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2.5 bg-[#245C45] hover:bg-[#164B38] text-white text-sm font-medium rounded-xl transition-colors cursor-pointer"
          >
            Got It, Close Walkthrough
          </button>
        </div>
      </div>
    </div>
  );
}
