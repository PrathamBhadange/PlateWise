import { useState, useMemo } from 'react';
import {
  QrCode,
  Scan,
  CheckCircle2,
  AlertCircle,
  Clock,
  Sparkles,
  Camera,
  ArrowRight,
  RefreshCw,
  Info,
} from 'lucide-react';
import { useStaffOrders } from '../../context/StaffOrderContext';

export default function TokenVerification() {
  const { verifyTokenDetails, markOrderCollected } = useStaffOrders();

  const [activeMode, setActiveMode] = useState('qr'); // 'qr' or 'manual'
  const [tokenInput, setTokenInput] = useState('#A-42');
  const [verifiedToken, setVerifiedToken] = useState('#A-42');
  const [lookupError, setLookupError] = useState('');
  const [actionFeedback, setActionFeedback] = useState('');
  const [isScanning, setIsScanning] = useState(false);
  const [scanNotice, setScanNotice] = useState('');

  // Synchronized verification state derived from centralized orders
  const verificationInfo = useMemo(() => {
    if (!verifiedToken) return null;
    return verifyTokenDetails(verifiedToken);
  }, [verifiedToken, verifyTokenDetails]);

  // Handle manual token submit
  const handleManualVerify = (e) => {
    e.preventDefault();
    setLookupError('');
    setActionFeedback('');
    setScanNotice('');

    const formatted = tokenInput.trim().toUpperCase();
    if (!formatted) {
      setLookupError('Please enter a pickup token code (e.g. #A-42).');
      setVerifiedToken(null);
      return;
    }

    const tokenKey = formatted.startsWith('#') ? formatted : `#${formatted}`;
    const result = verifyTokenDetails(tokenKey);

    if (result.found) {
      setVerifiedToken(tokenKey);
      setTokenInput(tokenKey);
      setLookupError('');
    } else {
      setVerifiedToken(null);
      setLookupError(result.error);
    }
  };

  // Shortcut pill selection: updates both input and verified card simultaneously
  const handleSelectShortcut = (tokenCode) => {
    setTokenInput(tokenCode);
    setVerifiedToken(tokenCode);
    setLookupError('');
    setActionFeedback('');
    setScanNotice('');
  };

  // Simulate camera QR detection (transparent prototype)
  const handleSimulateScan = () => {
    setIsScanning(true);
    setActionFeedback('');
    setLookupError('');
    setScanNotice('');

    setTimeout(() => {
      setIsScanning(false);
      // Pick a ready token for demonstration (#B-19 or next ready)
      const targetToken = '#B-19';
      setTokenInput(targetToken);
      setVerifiedToken(targetToken);
      setScanNotice(`Simulated QR Scan: Detected token ${targetToken} (Sneha Jadhav) for evaluation.`);
    }, 700);
  };

  // Confirm collection and hand over
  const handleConfirmCollection = () => {
    if (!verificationInfo || !verificationInfo.found || !verificationInfo.eligible) return;
    markOrderCollected(verificationInfo.token);
    setActionFeedback(`Meal handed over! Order ${verificationInfo.token} marked as Collected.`);
  };

  return (
    <div className="bg-white rounded-2xl sm:rounded-3xl p-5 sm:p-6 border border-[#245C45]/15 shadow-2xs text-left">
      {/* Component Title and Mode Toggle Tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-[#245C45]/10">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="font-serif text-lg sm:text-xl font-bold text-[#252A27]">
              Quick Token Verification
            </h3>
            <span className="text-[10px] font-semibold text-[#245C45] bg-[#E6EFE7] px-2 py-0.5 rounded-full border border-[#245C45]/20">
              Session Synced
            </span>
          </div>
          <p className="text-[11px] text-[#252A27]/60">
            Verify student mobile token QR code or enter token code manually
          </p>
        </div>

        {/* Mode Switcher Tabs */}
        <div className="flex items-center bg-[#E6EFE7]/80 p-1 rounded-xl border border-[#245C45]/10 w-fit">
          <button
            type="button"
            onClick={() => {
              setActiveMode('qr');
              setLookupError('');
            }}
            className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              activeMode === 'qr'
                ? 'bg-[#245C45] text-white shadow-xs'
                : 'text-[#252A27]/70 hover:text-[#245C45]'
            }`}
          >
            Scan QR Code
          </button>
          <button
            type="button"
            onClick={() => {
              setActiveMode('manual');
              setLookupError('');
            }}
            className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              activeMode === 'manual'
                ? 'bg-[#245C45] text-white shadow-xs'
                : 'text-[#252A27]/70 hover:text-[#245C45]'
            }`}
          >
            Enter Token Manually
          </button>
        </div>
      </div>

      {/* Verification Layout Grid */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-5 mt-5 items-stretch">
        {/* Left Column: Scanner or Manual Input (6 cols) */}
        <div className="md:col-span-6 flex flex-col justify-between p-4 sm:p-5 rounded-2xl bg-[#F8F7F2] border border-[#245C45]/15">
          {activeMode === 'qr' ? (
            /* Mode 1: QR Scanner Frame with clear simulation transparency */
            <div className="flex flex-col items-center justify-center text-center space-y-3 py-2">
              <span className="text-[10px] font-bold text-[#245C45] bg-[#E6EFE7] px-2.5 py-0.5 rounded-full border border-[#245C45]/20">
                Prototype Camera Simulation
              </span>

              <div className="relative w-36 h-36 rounded-2xl border-2 border-dashed border-[#245C45] flex items-center justify-center bg-white shadow-xs group">
                <Scan className="w-16 h-16 text-[#245C45]/70 group-hover:scale-105 transition-transform" />
                <div className="absolute top-2 left-2 w-3 h-3 border-t-2 border-l-2 border-[#245C45]" />
                <div className="absolute top-2 right-2 w-3 h-3 border-t-2 border-r-2 border-[#245C45]" />
                <div className="absolute bottom-2 left-2 w-3 h-3 border-b-2 border-l-2 border-[#245C45]" />
                <div className="absolute bottom-2 right-2 w-3 h-3 border-b-2 border-r-2 border-[#245C45]" />
              </div>

              <div>
                <span className="text-xs font-bold text-[#252A27] block">
                  Simulate QR Token Detection
                </span>
                <span className="text-[11px] text-[#252A27]/60 block max-w-[240px] mx-auto mt-0.5">
                  Physical kiosk barcode scanner is simulated for prototype demonstration.
                </span>
              </div>

              {scanNotice && (
                <div className="p-2 rounded-xl bg-[#E6EFE7] border border-[#245C45]/20 text-[11px] text-[#245C45] font-semibold flex items-center gap-1.5 animate-fade-in text-left">
                  <Sparkles className="w-3.5 h-3.5 text-[#E99A55] flex-shrink-0" />
                  <span>{scanNotice}</span>
                </div>
              )}

              <button
                type="button"
                onClick={handleSimulateScan}
                disabled={isScanning}
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#245C45] hover:bg-[#164B38] text-white text-xs font-semibold rounded-xl transition-all cursor-pointer shadow-xs disabled:opacity-60"
              >
                {isScanning ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Simulating Camera Scan...</span>
                  </>
                ) : (
                  <>
                    <Camera className="w-3.5 h-3.5" />
                    <span>Simulate Camera Scan (Demo)</span>
                  </>
                )}
              </button>

              <p className="text-[10px] text-[#252A27]/50 italic pt-1">
                * Camera simulation: Physical barcode hardware and webcam scanning activate with backend integration.
              </p>
            </div>
          ) : (
            /* Mode 2: Manual Token Entry */
            <form onSubmit={handleManualVerify} className="space-y-3 py-2 flex flex-col justify-between h-full">
              <div>
                <label
                  htmlFor="manual-token"
                  className="block text-xs font-semibold text-[#252A27] mb-1"
                >
                  Enter Pickup Token Code
                </label>
                <div className="relative">
                  <QrCode className="w-4 h-4 text-[#245C45] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    id="manual-token"
                    type="text"
                    value={tokenInput}
                    onChange={(e) => {
                      setTokenInput(e.target.value);
                      if (lookupError) setLookupError('');
                    }}
                    placeholder="e.g. #A-42, #B-19, #C-08"
                    className="w-full pl-9 pr-3 py-2 text-sm bg-white border border-[#245C45]/20 rounded-xl outline-none focus:ring-2 focus:ring-[#245C45]/20 focus:border-[#245C45] font-mono"
                  />
                </div>

                {lookupError && (
                  <div className="p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-700 mt-2 flex items-start gap-1.5 animate-fade-in">
                    <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0 mt-0.5" />
                    <span>{lookupError}</span>
                  </div>
                )}
              </div>

              {/* Sample Token Shortcut Pills */}
              <div className="py-2">
                <span className="text-[10px] font-semibold text-[#252A27]/60 block mb-1">
                  Click Sample Pre-Orders to Test:
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {['#A-42', '#B-19', '#C-08', '#D-11', '#H-07'].map((tok) => (
                    <button
                      key={tok}
                      type="button"
                      onClick={() => handleSelectShortcut(tok)}
                      className={`px-2 py-1 rounded-lg text-[11px] font-mono border transition-all cursor-pointer ${
                        tokenInput === tok
                          ? 'bg-[#245C45] text-white border-[#245C45]'
                          : 'bg-white border-[#245C45]/15 hover:bg-[#E6EFE7] text-[#245C45]'
                      }`}
                    >
                      {tok}
                    </button>
                  ))}
                </div>
                <p className="text-[10px] text-[#252A27]/50 mt-1">
                  Tip: #A-42 (Ready), #C-08 (Preparing), #H-07 (Collected).
                </p>
              </div>

              <button
                type="submit"
                className="w-full py-2.5 bg-[#245C45] hover:bg-[#164B38] text-white text-xs sm:text-sm font-semibold rounded-xl transition-all cursor-pointer shadow-xs flex items-center justify-center gap-1.5"
              >
                <span>Verify Token</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </form>
          )}
        </div>

        {/* Right Column: Verified Details Card (6 cols) */}
        <div className="md:col-span-6 flex flex-col justify-between p-4 sm:p-5 rounded-2xl bg-white border border-[#245C45]/20 shadow-xs relative">
          <div>
            <div className="flex items-center justify-between pb-2 border-b border-[#245C45]/10">
              <span className="text-[11px] font-bold uppercase tracking-wider text-[#245C45] flex items-center gap-1">
                <Sparkles className="w-3.5 h-3.5 text-[#E99A55]" />
                <span>
                  Token Details {verificationInfo && verificationInfo.found ? '(Verified)' : ''}
                </span>
              </span>

              {verificationInfo && verificationInfo.found && (
                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                    verificationInfo.status === 'Ready'
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                      : verificationInfo.status === 'Preparing'
                      ? 'bg-amber-50 text-amber-700 border-amber-200'
                      : verificationInfo.status === 'Pending'
                      ? 'bg-rose-50 text-rose-700 border-rose-200'
                      : 'bg-[#E6EFE7] text-[#245C45] border-[#245C45]/20'
                  }`}
                >
                  {verificationInfo.status === 'Ready'
                    ? 'Ready for Pickup'
                    : verificationInfo.status === 'Preparing'
                    ? 'Preparing in Kitchen'
                    : verificationInfo.status === 'Pending'
                    ? 'Pending in Queue'
                    : 'Collected & Served'}
                </span>
              )}
            </div>

            {verificationInfo && verificationInfo.found ? (
              <div className="space-y-2.5 mt-3 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-[#252A27]/60">Pickup Token:</span>
                  <span className="font-mono text-base font-bold text-[#245C45]">
                    {verificationInfo.token}
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-[#252A27]/60">Student:</span>
                  <span className="font-semibold text-[#252A27]">
                    {verificationInfo.student}{' '}
                    <span className="text-[10px] text-[#252A27]/50 font-normal">
                      ({verificationInfo.studentId})
                    </span>
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-[#252A27]/60">Meal Ordered:</span>
                  <span className="font-semibold text-[#252A27]">
                    {verificationInfo.meal}
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-[#252A27]/60">Order Time:</span>
                  <span className="text-[#252A27]/80">
                    {verificationInfo.time} · {verificationInfo.counter}
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-[#252A27]/60">Payment:</span>
                  <span className="text-[#252A27]/80 font-medium">
                    {verificationInfo.payment}
                  </span>
                </div>

                {/* Eligibility / Status Alert Box */}
                {!verificationInfo.eligible ? (
                  <div
                    className={`p-2.5 rounded-xl border text-[11px] flex items-start gap-1.5 mt-2 ${
                      verificationInfo.status === 'Collected'
                        ? 'bg-[#E6EFE7] border-[#245C45]/20 text-[#245C45]'
                        : 'bg-amber-50 border-amber-200 text-amber-800'
                    }`}
                  >
                    {verificationInfo.status === 'Collected' ? (
                      <CheckCircle2 className="w-3.5 h-3.5 mt-0.5 flex-shrink-0 text-[#245C45]" />
                    ) : (
                      <Clock className="w-3.5 h-3.5 mt-0.5 flex-shrink-0 text-amber-600" />
                    )}
                    <span>{verificationInfo.reason}</span>
                  </div>
                ) : (
                  <div className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-[11px] flex items-start gap-1.5 mt-2">
                    <CheckCircle2 className="w-3.5 h-3.5 mt-0.5 flex-shrink-0 text-emerald-600" />
                    <span>Meal is ready at express counter. Eligible for immediate pickup!</span>
                  </div>
                )}
              </div>
            ) : (
              <div className="py-10 text-center text-[#252A27]/50 text-xs flex flex-col items-center justify-center">
                <Info className="w-8 h-8 text-[#252A27]/30 mb-2" />
                <span className="font-semibold">No Verified Order Found</span>
                <span className="text-[11px] mt-0.5 max-w-[220px]">
                  Please enter a valid registered token code or simulate a camera scan.
                </span>
              </div>
            )}
          </div>

          {/* Action Confirmation Button */}
          <div className="mt-4 pt-3 border-t border-[#245C45]/10">
            {actionFeedback ? (
              <div className="py-2.5 px-3 bg-[#E6EFE7] border border-[#245C45]/30 rounded-xl text-center text-xs font-bold text-[#245C45] flex items-center justify-center gap-1.5 animate-fade-in">
                <CheckCircle2 className="w-4 h-4 text-[#245C45]" />
                <span>{actionFeedback}</span>
              </div>
            ) : (
              <button
                type="button"
                onClick={handleConfirmCollection}
                disabled={!verificationInfo || !verificationInfo.found || !verificationInfo.eligible}
                className={`w-full py-2.5 px-4 rounded-xl text-xs sm:text-sm font-semibold transition-all flex items-center justify-center gap-2 cursor-pointer ${
                  verificationInfo && verificationInfo.found && verificationInfo.eligible
                    ? 'bg-[#245C45] hover:bg-[#164B38] text-white shadow-xs active:scale-[0.99]'
                    : 'bg-gray-100 text-gray-400 cursor-not-allowed border border-gray-200'
                }`}
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>
                  {verificationInfo && verificationInfo.status === 'Collected'
                    ? 'Meal Already Handed Over'
                    : 'Verify Token & Hand Over Meal'}
                </span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
