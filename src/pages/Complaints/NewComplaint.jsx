import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Send,
  CheckCircle2,
  Clock,
  Sparkles,
  ArrowRight,
  ShieldAlert,
  UploadCloud,
  Trash2,
} from 'lucide-react';
import Member4Header from '../../components/dashboard/Member4Header';
import SeverityBadge from '../../components/dashboard/SeverityBadge';
import ErrorMessage from '../../components/dashboard/ErrorMessage';
import { submitComplaint, getMenuItems } from '../../services/member4Api';
import { useAuth } from '../../context/useAuth';

export default function NewComplaint() {
  const { user } = useAuth();
  const [menuItems, setMenuItems] = useState([]);
  const [loadingMenu, setLoadingMenu] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  const [selectedItem, setSelectedItem] = useState('');
  const [description, setDescription] = useState('');
  const [proofImage, setProofImage] = useState('');
  const [proofFileName, setProofFileName] = useState('');
  const [submissionResult, setSubmissionResult] = useState(null);

  useEffect(() => {
    let active = true;

    async function loadDishes() {
      try {
        const dishes = await getMenuItems();
        if (active) {
          setMenuItems(dishes || []);
          setLoadingMenu(false);
        }
      } catch (err) {
        if (active) {
          console.error('Failed to load menu dishes:', err);
          setLoadingMenu(false);
        }
      }
    }
    loadDishes();

    return () => {
      active = false;
    };
  }, []);

  const handleImageChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setError('Please select a valid image file (PNG, JPG, JPEG, WEBP).');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setError('Image size exceeds 5MB limit. Please upload a smaller image.');
      return;
    }

    setError(null);
    const reader = new FileReader();
    reader.onload = () => {
      setProofImage(reader.result);
      setProofFileName(file.name);
    };
    reader.onerror = () => {
      setError('Failed to read image file. Please try another image.');
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveImage = () => {
    setProofImage('');
    setProofFileName('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!description.trim()) {
      setError('Please provide a description of your issue.');
      return;
    }

    if (!proofImage) {
      setError('Proof image is mandatory. Please upload an image showing proof of your complaint.');
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      const payload = {
        user_id: user?.user_id,
        menu_item_id: selectedItem ? Number(selectedItem) : null,
        description: description.trim(),
        proof_image: proofImage,
      };

      const res = await submitComplaint(payload);
      setSubmissionResult(res);
      setDescription('');
      setSelectedItem('');
      setProofImage('');
      setProofFileName('');
    } catch (err) {
      console.error('Submission failed:', err);
      setError(err.message || 'Failed to submit complaint');
    } finally {
      setSubmitting(false);
    }
  };

  const getSlaHours = (severity) => {
    switch ((severity || '').toLowerCase()) {
      case 'critical':
        return '2 Hours';
      case 'high':
        return '4 Hours';
      case 'medium':
        return '24 Hours';
      case 'low':
        return '72 Hours';
      default:
        return '24 Hours';
    }
  };

  return (
    <div className="min-h-screen bg-[#F8F7F2] text-[#252A27] flex flex-col font-sans">
      <Member4Header
        title="Student Grievance & Food Quality Portal"
        subtitle="Accountable hygiene reporting with automatic SLA classification"
      />

      <main className="flex-1 max-w-3xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        {/* Intro Banner */}
        <div className="bg-white rounded-2xl border border-[#245C45]/10 shadow-sm p-5 sm:p-6">
          <div className="flex items-start gap-3">
            <div className="p-2.5 rounded-xl bg-[#E6EFE7] text-[#245C45] shrink-0">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-serif font-bold text-[#252A27]">
                Submit an Accountable Canteen Grievance
              </h2>
              <p className="mt-1 text-xs sm:text-sm text-[#252A27]/70 leading-relaxed">
                PlateWise uses an automated MySQL rule-based classifier to instantly detect hygiene hazards, foreign objects, and food quality issues. Tickets are tracked against binding SLA resolution deadlines.
              </p>
            </div>
          </div>
        </div>

        {error && <ErrorMessage message={error} onRetry={() => setError(null)} />}

        {/* Post-Submission Result Card */}
        {submissionResult && (
          <div className="bg-white rounded-2xl border-2 border-[#245C45]/20 shadow-md p-6 animate-fade-in space-y-4">
            <div className="flex items-center gap-2.5 text-[#245C45]">
              <CheckCircle2 className="w-6 h-6" />
              <h3 className="text-base font-serif font-bold text-[#252A27]">
                Complaint Successfully Registered
              </h3>
            </div>

            <div className="p-4 rounded-xl bg-[#F8F7F2] border border-[#245C45]/10 space-y-3 text-xs sm:text-sm">
              <div className="flex items-center justify-between">
                <span className="text-[#252A27]/60">Ticket Reference:</span>
                <span className="font-bold font-mono text-[#245C45]">
                  #{submissionResult.ticket?.complaint_id}
                </span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-[#252A27]/60">Detected Category:</span>
                <span className="font-semibold text-[#252A27] capitalize">
                  {submissionResult.classification?.category?.replace('_', ' ')}
                </span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-[#252A27]/60">Assigned Severity:</span>
                <SeverityBadge severity={submissionResult.classification?.severity} />
              </div>

              <div className="flex items-center justify-between">
                <span className="text-[#252A27]/60">Guaranteed Resolution SLA:</span>
                <span className="font-semibold text-[#245C45] inline-flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5" />
                  {getSlaHours(submissionResult.classification?.severity)}
                </span>
              </div>

              {submissionResult.ticket?.proof_image && (
                <div className="pt-2 border-t border-[#245C45]/10">
                  <span className="text-[#252A27]/60 block mb-1 font-semibold">Attached Proof Photo:</span>
                  <img
                    src={submissionResult.ticket.proof_image}
                    alt="Proof Evidence"
                    className="max-h-40 w-auto rounded-lg border border-[#245C45]/20 object-contain bg-white"
                  />
                </div>
              )}

              <div className="pt-2 border-t border-[#245C45]/10 text-xs text-[#252A27]/70">
                If the canteen kitchen does not resolve this issue within the SLA window, our automated database daemon escalates the ticket directly to campus administration.
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 pt-2">
              <button
                type="button"
                onClick={() => setSubmissionResult(null)}
                className="bg-[#245C45] hover:bg-[#164B38] text-white rounded-xl text-xs font-semibold px-4 py-2.5 transition-colors cursor-pointer"
              >
                Submit Another Grievance
              </button>
              <Link
                to="/admin/complaints"
                className="inline-flex items-center justify-center gap-1.5 border border-[#245C45]/30 text-[#245C45] hover:bg-[#E6EFE7]/50 rounded-xl text-xs font-semibold px-4 py-2.5 transition-colors"
              >
                <span>Track Escalation Board</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>
        )}

        {/* Complaint Form */}
        {!submissionResult && (
          <form
            onSubmit={handleSubmit}
            className="bg-white rounded-2xl border border-[#245C45]/10 shadow-sm p-6 space-y-5"
          >
            {/* Dish Selection */}
            <div>
              <label htmlFor="dish-select" className="block text-xs font-semibold uppercase tracking-wider text-[#252A27]/70 mb-1.5">
                Related Menu Dish (Optional)
              </label>
              {loadingMenu ? (
                <div className="text-xs text-[#252A27]/50">Loading canteen dishes...</div>
              ) : (
                <select
                  id="dish-select"
                  value={selectedItem}
                  onChange={(e) => setSelectedItem(e.target.value)}
                  className="w-full bg-white border border-[#245C45]/20 rounded-xl text-sm px-3.5 py-2.5 focus:outline-none focus:ring-2 focus:ring-[#245C45]/30 focus:border-[#245C45] font-medium"
                >
                  <option value="">General Canteen / Premises</option>
                  {menuItems.map((dish) => (
                    <option key={dish.menu_item_id} value={dish.menu_item_id}>
                      {dish.name} — {dish.category} (₹{dish.price})
                    </option>
                  ))}
                </select>
              )}
            </div>

            {/* Description Textarea */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label htmlFor="complaint-description" className="block text-xs font-semibold uppercase tracking-wider text-[#252A27]/70">
                  Incident Description <span className="text-[#B3402F]">*</span>
                </label>
                <span className="text-[11px] text-[#252A27]/50">
                  Be specific (mention hair, stale odor, insect, etc.)
                </span>
              </div>
              <textarea
                id="complaint-description"
                rows={5}
                required
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Example: Found a foreign hair inside the paneer roll, or the sambhar had a stale sour odor during breakfast rush..."
                className="w-full bg-white border border-[#245C45]/20 rounded-xl text-sm p-3.5 focus:outline-none focus:ring-2 focus:ring-[#245C45]/30 focus:border-[#245C45] leading-relaxed"
              />
            </div>

            {/* Proof Image Upload (Compulsory) */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-semibold uppercase tracking-wider text-[#252A27]/70">
                  Incident Proof Photo <span className="text-[#B3402F]">*</span>
                </label>
                <span className="text-[10px] font-bold text-rose-600 bg-rose-50 px-2 py-0.5 rounded border border-rose-200">
                  Compulsory
                </span>
              </div>

              {!proofImage ? (
                <label className="flex flex-col items-center justify-center p-6 border-2 border-dashed border-[#245C45]/30 rounded-xl bg-[#F8F7F2] hover:bg-[#E6EFE7]/40 cursor-pointer transition-colors group">
                  <div className="w-10 h-10 rounded-full bg-[#245C45]/10 flex items-center justify-center text-[#245C45] mb-2 group-hover:scale-105 transition-transform">
                    <UploadCloud className="w-5 h-5" />
                  </div>
                  <span className="text-sm font-semibold text-[#245C45]">
                    Click to upload proof photo
                  </span>
                  <span className="text-xs text-[#252A27]/50 mt-1">
                    PNG, JPG, JPEG or WEBP (Max 5MB)
                  </span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageChange}
                    className="hidden"
                    required
                  />
                </label>
              ) : (
                <div className="p-4 bg-[#F8F7F2] border border-[#245C45]/20 rounded-xl space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5 text-emerald-700 text-xs font-semibold">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      <span>Proof Photo Attached</span>
                    </div>
                    <button
                      type="button"
                      onClick={handleRemoveImage}
                      className="inline-flex items-center gap-1 text-xs text-rose-600 hover:text-rose-800 font-semibold px-2 py-1 rounded hover:bg-rose-50 transition-colors cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Remove</span>
                    </button>
                  </div>

                  <div className="relative group overflow-hidden rounded-xl border border-[#245C45]/15 bg-white">
                    <img
                      src={proofImage}
                      alt="Complaint Proof Preview"
                      className="w-full max-h-52 object-contain bg-stone-50"
                    />
                    <div className="p-2 bg-white/95 border-t border-[#245C45]/10 text-xs text-[#252A27]/70 flex items-center justify-between truncate">
                      <span className="truncate max-w-[240px] font-medium">{proofFileName}</span>
                      <span className="text-emerald-700 font-semibold">Ready to submit</span>
                    </div>
                  </div>
                </div>
              )}
              <span className="text-[11px] text-[#252A27]/50 mt-1 block">
                Visual proof is mandatory for canteen staff verification and prompt redressal.
              </span>
            </div>

            {/* Keyword Hints Pill Row */}
            <div className="p-3 bg-[#F8F7F2] rounded-xl border border-[#245C45]/10 text-xs space-y-1">
              <div className="flex items-center gap-1 font-semibold text-[#245C45]">
                <Sparkles className="w-3.5 h-3.5 text-[#E99A55]" />
                <span>Automated Classifier Hints:</span>
              </div>
              <p className="text-[#252A27]/70 text-[11px]">
                Keywords like <code className="bg-white px-1 py-0.5 rounded border border-gray-200">cockroach</code>, <code className="bg-white px-1 py-0.5 rounded border border-gray-200">glass</code>, or <code className="bg-white px-1 py-0.5 rounded border border-gray-200">worm</code> trigger Critical severity (2h deadline). Words like <code className="bg-white px-1 py-0.5 rounded border border-gray-200">hair</code> or <code className="bg-white px-1 py-0.5 rounded border border-gray-200">stale</code> trigger High severity (4h deadline).
              </p>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={submitting || !description.trim() || !proofImage}
              className="w-full bg-[#245C45] hover:bg-[#164B38] text-white rounded-xl text-sm font-semibold py-3 px-4 transition-all duration-200 shadow-sm flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 active:scale-[0.99]"
            >
              <Send className="w-4 h-4" />
              <span>{submitting ? 'Classifying and Submitting...' : 'Submit Grievance Ticket'}</span>
            </button>
          </form>
        )}
      </main>
    </div>
  );
}
