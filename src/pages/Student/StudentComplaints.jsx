import { useState, useEffect, useCallback } from 'react';
import { AlertCircle, CheckCircle2, Clock, ShieldCheck, Send, RotateCcw, UploadCloud, Trash2, Image as ImageIcon } from 'lucide-react';
import { getStudentComplaints, submitStudentComplaint, getStudentMenu } from '../../services/studentApi';
import LoadingSpinner from '../../components/dashboard/LoadingSpinner';

export default function StudentComplaints() {
  const [complaints, setComplaints] = useState([]);
  const [menuItems, setMenuItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [formSuccess, setFormSuccess] = useState('');
  const [formError, setFormError] = useState('');

  const [selectedMenuItem, setSelectedMenuItem] = useState('');
  const [description, setDescription] = useState('');
  const [proofImage, setProofImage] = useState('');
  const [proofFileName, setProofFileName] = useState('');

  const reloadComplaints = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [compData, menuData] = await Promise.all([
        getStudentComplaints(),
        getStudentMenu().catch(() => []),
      ]);
      setComplaints(Array.isArray(compData) ? compData : []);
      setMenuItems(Array.isArray(menuData) ? menuData : []);
    } catch (err) {
      console.error('Failed to load grievances:', err);
      setError(
        err.response?.data?.message || err.response?.data?.error || 'Failed to load your grievance history.'
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let ignore = false;
    Promise.all([
      getStudentComplaints(),
      getStudentMenu().catch(() => []),
    ])
      .then(([compData, menuData]) => {
        if (!ignore) {
          setComplaints(Array.isArray(compData) ? compData : []);
          setMenuItems(Array.isArray(menuData) ? menuData : []);
          setLoading(false);
        }
      })
      .catch((err) => {
        if (!ignore) {
          console.error('Failed to load grievances:', err);
          setError(
            err.response?.data?.message || err.response?.data?.error || 'Failed to load your grievance history.'
          );
          setLoading(false);
        }
      });
    return () => {
      ignore = true;
    };
  }, []);

  const handleImageChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setFormError('Please select a valid image file (PNG, JPG, JPEG, WEBP).');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setFormError('Image size exceeds 5MB limit. Please upload a smaller image.');
      return;
    }

    setFormError('');
    const reader = new FileReader();
    reader.onload = () => {
      setProofImage(reader.result);
      setProofFileName(file.name);
    };
    reader.onerror = () => {
      setFormError('Failed to read image file. Please try another image.');
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
      setFormError('Please describe your concern or grievance.');
      return;
    }

    if (!proofImage) {
      setFormError('Proof image is mandatory. Please upload an image showing proof of your complaint.');
      return;
    }

    setSubmitting(true);
    setFormError('');
    setFormSuccess('');

    try {
      const payload = {
        menu_item_id: selectedMenuItem ? Number(selectedMenuItem) : null,
        description: description.trim(),
        proof_image: proofImage,
      };
      const res = await submitStudentComplaint(payload);
      setFormSuccess(
        `Grievance submitted successfully (Ref #${res.ticket?.complaint_id || 'Submitted'}). Categorized as ${
          res.classification?.category || 'General'
        }.`
      );
      setDescription('');
      setSelectedMenuItem('');
      setProofImage('');
      setProofFileName('');
      await reloadComplaints();
    } catch (err) {
      console.error('Submission error:', err);
      setFormError(
        err.response?.data?.message || err.response?.data?.error || 'Failed to lodge grievance. Please retry.'
      );
    } finally {
      setSubmitting(false);
    }
  };

  const getStatusBadge = (status) => {
    const s = String(status || '').toLowerCase();
    if (s === 'resolved' || s === 'closed') {
      return (
        <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider bg-emerald-50 text-emerald-800 border border-emerald-200 px-2 py-0.5 rounded-md">
          <CheckCircle2 className="w-3 h-3" /> {status}
        </span>
      );
    }
    if (s === 'escalated') {
      return (
        <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider bg-rose-50 text-rose-800 border border-rose-200 px-2 py-0.5 rounded-md">
          <AlertCircle className="w-3 h-3" /> Escalated
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider bg-amber-50 text-amber-800 border border-amber-200 px-2 py-0.5 rounded-md">
        <Clock className="w-3 h-3" /> {status || 'Open'}
      </span>
    );
  };

  if (loading) {
    return (
      <div className="py-24 flex justify-center">
        <LoadingSpinner text="Retrieving student grievance records..." />
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white rounded-2xl p-8 border border-rose-200 text-center max-w-md mx-auto my-12">
        <AlertCircle className="w-10 h-10 text-rose-500 mx-auto mb-3" />
        <h3 className="text-base font-bold text-[#252A27]">Load Error</h3>
        <p className="text-xs text-rose-600 mt-1">{error}</p>
        <button
          onClick={reloadComplaints}
          className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold bg-[#245C45] text-white hover:bg-[#1b4634] transition-colors cursor-pointer"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>Retry</span>
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-serif font-bold text-[#252A27]">Student Grievance Redressal</h1>
        <p className="text-xs text-[#252A27]/70 mt-1">
          Lodge food quality or hygiene feedback. All submissions are automatically categorized and tracked.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Submission Form (1 col) */}
        <div className="bg-white rounded-3xl p-6 border border-[#245C45]/15 shadow-xs h-fit">
          <h3 className="text-base font-serif font-bold text-[#252A27] pb-3 border-b border-[#245C45]/10">
            Submit New Grievance
          </h3>

          {formSuccess && (
            <div className="mt-3 bg-emerald-50 border border-emerald-200 text-emerald-800 p-3 rounded-xl text-xs">
              {formSuccess}
            </div>
          )}

          {formError && (
            <div className="mt-3 bg-rose-50 border border-rose-200 text-rose-800 p-3 rounded-xl text-xs">
              {formError}
            </div>
          )}

          <form onSubmit={handleSubmit} className="mt-4 space-y-4 text-xs">
            <div>
              <label className="block text-[#252A27]/70 font-semibold mb-1">
                Related Dish (Optional)
              </label>
              <select
                value={selectedMenuItem}
                onChange={(e) => setSelectedMenuItem(e.target.value)}
                className="w-full bg-[#F8F7F2] border border-[#245C45]/20 rounded-xl px-3 py-2 text-xs text-[#252A27] focus:outline-none focus:ring-2 focus:ring-[#245C45]/30"
              >
                <option value="">General Canteen Feedback (No specific dish)</option>
                {menuItems.map((item) => (
                  <option key={item.menu_item_id} value={item.menu_item_id}>
                    {item.name} ({item.category})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[#252A27]/70 font-semibold mb-1">
                Description of Issue *
              </label>
              <textarea
                rows={4}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe your issue with clarity (e.g. lukewarm food, foreign object, hygiene observation)..."
                className="w-full bg-[#F8F7F2] border border-[#245C45]/20 rounded-xl p-3 text-xs text-[#252A27] focus:outline-none focus:ring-2 focus:ring-[#245C45]/30 resize-none leading-relaxed"
                required
              />
              <span className="text-[10px] text-[#252A27]/50 mt-1 block">
                Auto-assigned category & severity via MySQL intelligence keywords.
              </span>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-[#252A27]/70 font-semibold">
                  Proof Image of Complaint *
                </label>
                <span className="text-[10px] font-bold text-rose-600 bg-rose-50 px-1.5 py-0.5 rounded border border-rose-200">
                  Compulsory
                </span>
              </div>

              {!proofImage ? (
                <label className="flex flex-col items-center justify-center p-4 border-2 border-dashed border-[#245C45]/30 rounded-xl bg-[#F8F7F2] hover:bg-[#E6EFE7]/40 cursor-pointer transition-colors group">
                  <div className="w-9 h-9 rounded-full bg-[#245C45]/10 flex items-center justify-center text-[#245C45] mb-2 group-hover:scale-105 transition-transform">
                    <UploadCloud className="w-5 h-5" />
                  </div>
                  <span className="text-xs font-semibold text-[#245C45]">
                    Click to upload proof photo
                  </span>
                  <span className="text-[10px] text-[#252A27]/50 mt-0.5">
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
                <div className="p-3 bg-[#F8F7F2] border border-[#245C45]/20 rounded-xl space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5 text-emerald-700 text-xs font-semibold">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      <span>Proof Photo Attached</span>
                    </div>
                    <button
                      type="button"
                      onClick={handleRemoveImage}
                      className="inline-flex items-center gap-1 text-[11px] text-rose-600 hover:text-rose-800 font-semibold px-2 py-0.5 rounded hover:bg-rose-50 transition-colors cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Remove</span>
                    </button>
                  </div>

                  <div className="relative group overflow-hidden rounded-lg border border-[#245C45]/15 bg-white">
                    <img
                      src={proofImage}
                      alt="Complaint Proof Preview"
                      className="w-full h-36 object-contain bg-stone-50"
                    />
                    <div className="p-1.5 bg-white/95 border-t border-[#245C45]/10 text-[10px] text-[#252A27]/70 flex items-center justify-between truncate">
                      <span className="truncate max-w-[200px]">{proofFileName}</span>
                      <span className="text-emerald-700 font-medium">Ready to submit</span>
                    </div>
                  </div>
                </div>
              )}
              <span className="text-[10px] text-[#252A27]/50 mt-1 block">
                Visual proof is mandatory for canteen staff verification and prompt redressal.
              </span>
            </div>

            <button
              type="submit"
              disabled={submitting}
              className={`w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-xs font-semibold text-white transition-all shadow-xs ${
                submitting
                  ? 'bg-[#245C45]/60 cursor-not-allowed'
                  : 'bg-[#245C45] hover:bg-[#1b4634] cursor-pointer'
              }`}
            >
              <Send className="w-3.5 h-3.5" />
              <span>{submitting ? 'Submitting Grievance...' : 'Submit Grievance'}</span>
            </button>
          </form>
        </div>

        {/* Complaints History (2 cols) */}
        <div className="lg:col-span-2 space-y-3">
          <div className="flex items-center justify-between pb-1">
            <span className="text-xs font-bold uppercase text-[#252A27]/60 tracking-wider">
              My Submitted Grievances ({complaints.length})
            </span>
          </div>

          {complaints.length > 0 ? (
            <div className="space-y-3">
              {complaints.map((c) => (
                <div
                  key={c.complaint_id}
                  className="bg-white rounded-2xl border border-[#245C45]/15 p-5 shadow-xs space-y-3"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-2 border-b border-stone-100 gap-2">
                    <div className="flex items-center gap-2.5">
                      <span className="font-serif font-bold text-sm text-[#252A27]">
                        Ticket #{c.complaint_id}
                      </span>
                      {getStatusBadge(c.status)}
                      <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-[#E6EFE7] text-[#245C45]">
                        {c.category}
                      </span>
                    </div>
                    <span className="text-xs text-[#252A27]/60">
                      {new Date(c.created_at).toLocaleDateString([], {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                      })}
                    </span>
                  </div>

                  <p className="text-xs text-[#252A27] leading-relaxed bg-[#F8F7F2] p-3 rounded-xl border border-[#245C45]/10">
                    {c.description}
                  </p>

                  {c.proof_image && (
                    <div className="pt-1">
                      <span className="text-[10px] text-[#252A27]/60 font-semibold block mb-1">
                        Proof Photo Attached:
                      </span>
                      <div className="relative inline-block group">
                        <img
                          src={c.proof_image}
                          alt="Grievance Proof"
                          className="h-28 w-auto max-w-full rounded-xl border border-[#245C45]/20 object-cover shadow-xs cursor-pointer hover:opacity-90 transition-opacity"
                          onClick={() => window.open(c.proof_image, '_blank')}
                          title="Click to view full image"
                        />
                        <span className="text-[9px] text-[#245C45] block mt-0.5 font-medium">
                          Click photo to enlarge
                        </span>
                      </div>
                    </div>
                  )}

                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-[11px] text-[#252A27]/70 pt-1">
                    <div>
                      <span className="text-[#252A27]/50 block">Dish:</span>
                      <span className="font-semibold text-[#252A27]">
                        {c.menu_item_name || 'General / None'}
                      </span>
                    </div>
                    <div>
                      <span className="text-[#252A27]/50 block">Severity:</span>
                      <span className="font-semibold capitalize text-[#252A27]">
                        {c.severity || 'Normal'}
                      </span>
                    </div>
                    <div>
                      <span className="text-[#252A27]/50 block">Assigned Staff:</span>
                      <span className="font-semibold text-[#252A27]">
                        {c.assigned_to_name || 'Pending Assignment'}
                      </span>
                    </div>
                  </div>

                  {c.resolved_at && (
                    <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 p-2.5 rounded-xl text-xs flex items-center gap-2">
                      <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                      <span>
                        Resolved on {new Date(c.resolved_at).toLocaleDateString()}
                      </span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="bg-white rounded-2xl p-10 border border-[#245C45]/10 text-center">
              <CheckCircle2 className="w-10 h-10 text-emerald-600 mx-auto mb-2" />
              <h4 className="text-sm font-bold text-[#252A27]">No Grievances Lodged</h4>
              <p className="text-xs text-[#252A27]/60 mt-1 max-w-sm mx-auto">
                You have not filed any issues with canteen services. If you experience food quality or hygiene concerns, submit them here.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
