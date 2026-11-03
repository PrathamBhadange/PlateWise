import { useState, useEffect } from 'react';
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
import api from '../../services/api';

export default function TokenVerification({ onOrderUpdated, sampleTokens = [] }) {
  const [activeMode, setActiveMode] = useState('qr'); // 'qr' or 'manual'
  const [tokenInput, setTokenInput] = useState('');
  const [verifiedOrder, setVerifiedOrder] = useState(null);
  const [lookupError, setLookupError] = useState('');
  const [actionFeedback, setActionFeedback] = useState('');
  const [isScanning, setIsScanning] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [isHandingOver, setIsHandingOver] = useState(false);
  const [scanNotice, setScanNotice] = useState('');

  const handleVerifyToken = async (tokenCode) => {
    if (!tokenCode || !tokenCode.trim()) {
      setLookupError('Please enter a pickup token code or order number.');
      setVerifiedOrder(null);
      return;
    }

    setLookupError('');
    setActionFeedback('');
    setIsVerifying(true);

    try {
      const cleanToken = tokenCode.trim();
      const res = await api.get(`/cashier/verify/${encodeURIComponent(cleanToken)}`);
      setVerifiedOrder(res.data);
      setTokenInput(res.data.token || cleanToken);
    } catch (err) {
      setVerifiedOrder(null);
      setLookupError(err.response?.data?.error || err.response?.data?.message || 'Order not found for this token.');
    } finally {
      setIsVerifying(false);
    }
  };

  // Auto-verify if sample tokens are available and no token verified yet
  useEffect(() => {
    let active = true;
    if (sampleTokens.length > 0 && !tokenInput) {
      const defaultTok = sampleTokens[0];
      api.get(`/cashier/verify/${encodeURIComponent(defaultTok)}`)
        .then((res) => {
          if (active) {
            setVerifiedOrder(res.data);
            setTokenInput(res.data.token || defaultTok);
          }
        })
        .catch(() => {});
    }
    return () => {
      active = false;
    };
  }, [sampleTokens, tokenInput]);

  const handleManualSubmit = (e) => {
    e.preventDefault();
    setScanNotice('');
    handleVerifyToken(tokenInput);
  };

  const handleSelectShortcut = (tokenCode) => {
    setTokenInput(tokenCode);
    setScanNotice('');
    handleVerifyToken(tokenCode);
  };

  const handleSimulateScan = () => {
    setIsScanning(true);
    setActionFeedback('');
    setLookupError('');
    setScanNotice('');

    setTimeout(async () => {
      setIsScanning(false);
      // Pick first real active token from live database
      const targetToken = sampleTokens.length > 0 ? sampleTokens[0] : null;
      if (targetToken) {
        setTokenInput(targetToken);
        setScanNotice(`Simulated QR Scan: Detected token ${targetToken} at counter scanner.`);
        await handleVerifyToken(targetToken);
      } else {
        setLookupError('No active counter orders currently available to simulate.');
      }
    }, 600);
  };

  const handleConfirmCollection = async () => {
    if (!verifiedOrder || !verifiedOrder.eligible || !verifiedOrder.order_id) return;

    setIsHandingOver(true);
    setActionFeedback('');
    setLookupError('');

    try {
      await api.patch(`/cashier/orders/${verifiedOrder.order_id}/handover`);
      setActionFeedback(`Meal handed over! Order ${verifiedOrder.token} successfully transitioned to Collected.`);
      setVerifiedOrder((prev) => ({
        ...prev,
        status: 'Collected',
        eligible: false,
        reason: 'Order has already been collected and served.',
      }));

      if (onOrderUpdated) {
        onOrderUpdated();
      }
    } catch (err) {
      const errMsg = err.response?.data?.message || err.response?.data?.error || 'Failed to hand over meal.';
      setLookupError(errMsg);
    } finally {
      setIsHandingOver(false);
    }
  };

  return (
    <div className="bg-white rounded-2xl sm:rounded-3xl p-5 sm:p-6 border border-[#245C45]/15 shadow-2xs text-left">
      {/* Title & Mode Switcher */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-[#245C45]/10">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="font-serif text-lg sm:text-xl font-bold text-[#252A27]">
              Quick Token Verification
            </h3>
            <span className="text-[10px] font-semibold text-[#245C45] bg-[#E6EFE7] px-2 py-0.5 rounded-full border border-[#245C45]/20">
              Live Database
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

      {/* Grid Layout */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-5 mt-5 items-stretch">
        {/* Left Column: QR / Manual Input (6 cols) */}
        <div className="md:col-span-6 flex flex-col justify-between p-4 sm:p-5 rounded-2xl bg-[#F8F7F2] border border-[#245C45]/15">
          {activeMode === 'qr' ? (
            <div className="flex flex-col items-center justify-center text-center space-y-3 py-2">
              <span className="text-[10px] font-bold text-[#245C45] bg-[#E6EFE7] px-2.5 py-0.5 rounded-full border border-[#245C45]/20">
                Counter Scanner Simulation
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
                  Reads pickup token and queries MySQL database instantly.
                </span>
              </div>

              {scanNotice && (
                <div className="p-2 rounded-xl bg-[#E6EFE7] border border-[#245C45]/20 text-[11px] text-[#245C45] font-semibold flex items-center gap-1.5 text-left">
                  <Sparkles className="w-3.5 h-3.5 text-[#E99A55] flex-shrink-0" />
                  <span>{scanNotice}</span>
                </div>
              )}

              <button
                type="button"
                onClick={handleSimulateScan}
                disabled={isScanning || isVerifying}
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#245C45] hover:bg-[#164B38] text-white text-xs font-semibold rounded-xl transition-all cursor-pointer shadow-xs disabled:opacity-60"
              >
                {isScanning ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Simulating Scanner...</span>
                  </>
                ) : (
                  <>
                    <Camera className="w-3.5 h-3.5" />
                    <span>Scan Next Order QR (Demo)</span>
                  </>
                )}
              </button>
            </div>
          ) : (
            <form onSubmit={handleManualSubmit} className="space-y-3 py-2 flex flex-col justify-between h-full">
              <div>
                <label
                  htmlFor="cashier-token-input"
                  className="block text-xs font-semibold text-[#252A27] mb-1"
                >
                  Enter Pickup Token or Order ID
                </label>
                <div className="relative">
                  <QrCode className="w-4 h-4 text-[#245C45] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    id="cashier-token-input"
                    type="text"
                    value={tokenInput}
                    onChange={(e) => {
                      setTokenInput(e.target.value);
                      if (lookupError) setLookupError('');
                    }}
                    placeholder="e.g. #B-11, #B-25, or order number"
                    className="w-full pl-9 pr-3 py-2 text-sm bg-white border border-[#245C45]/20 rounded-xl outline-none focus:ring-2 focus:ring-[#245C45]/20 focus:border-[#245C45] font-mono"
                  />
                </div>

                {lookupError && (
                  <div className="p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-700 mt-2 flex items-start gap-1.5">
                    <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0 mt-0.5" />
                    <span>{lookupError}</span>
                  </div>
                )}
              </div>

              {/* Sample Token Shortcuts */}
              {sampleTokens.length > 0 && (
                <div className="py-2">
                  <span className="text-[10px] font-semibold text-[#252A27]/60 block mb-1">
                    Quick Select Active Counter Tokens:
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {sampleTokens.slice(0, 5).map((tok) => (
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
                </div>
              )}

              <button
                type="submit"
                disabled={isVerifying}
                className="w-full py-2.5 bg-[#245C45] hover:bg-[#164B38] text-white text-xs sm:text-sm font-semibold rounded-xl transition-all cursor-pointer shadow-xs flex items-center justify-center gap-1.5 disabled:opacity-60"
              >
                {isVerifying ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Querying Database...</span>
                  </>
                ) : (
                  <>
                    <span>Verify Token</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
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
                <span>Token Details {verifiedOrder ? '(Verified)' : ''}</span>
              </span>

              {verifiedOrder && (
                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                    verifiedOrder.status === 'Ready'
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                      : verifiedOrder.status === 'Preparing'
                      ? 'bg-amber-50 text-amber-700 border-amber-200'
                      : verifiedOrder.status === 'Collected' || verifiedOrder.status === 'picked_up'
                      ? 'bg-[#E6EFE7] text-[#245C45] border-[#245C45]/20'
                      : 'bg-rose-50 text-rose-700 border-rose-200'
                  }`}
                >
                  {verifiedOrder.status === 'Ready'
                    ? 'Ready for Pickup'
                    : verifiedOrder.status === 'Preparing'
                    ? 'Preparing in Kitchen'
                    : verifiedOrder.status === 'Collected' || verifiedOrder.status === 'picked_up'
                    ? 'Collected & Served'
                    : 'Pending in Queue'}
                </span>
              )}
            </div>

            {verifiedOrder ? (
              <div className="space-y-2.5 mt-3 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-[#252A27]/60">Pickup Token:</span>
                  <span className="font-mono text-base font-bold text-[#245C45]">
                    {verifiedOrder.token}
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-[#252A27]/60">Student:</span>
                  <span className="font-semibold text-[#252A27]">
                    {verifiedOrder.student}{' '}
                    <span className="text-[10px] text-[#252A27]/50 font-normal">
                      ({verifiedOrder.studentId})
                    </span>
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-[#252A27]/60">Meal Ordered:</span>
                  <span className="font-semibold text-[#252A27] text-right max-w-[200px] truncate">
                    {verifiedOrder.meal}
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-[#252A27]/60">Order Time:</span>
                  <span className="text-[#252A27]/80">
                    {verifiedOrder.time} · {verifiedOrder.counter}
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-[#252A27]/60">Payment:</span>
                  <span className="text-[#252A27]/80 font-medium">
                    {verifiedOrder.payment}
                  </span>
                </div>

                {/* Eligibility / Status Alert Box */}
                {!verifiedOrder.eligible ? (
                  <div
                    className={`p-2.5 rounded-xl border text-[11px] flex items-start gap-1.5 mt-2 ${
                      verifiedOrder.status === 'Collected' || verifiedOrder.status === 'picked_up'
                        ? 'bg-[#E6EFE7] border-[#245C45]/20 text-[#245C45]'
                        : 'bg-amber-50 border-amber-200 text-amber-800'
                    }`}
                  >
                    {verifiedOrder.status === 'Collected' || verifiedOrder.status === 'picked_up' ? (
                      <CheckCircle2 className="w-3.5 h-3.5 mt-0.5 flex-shrink-0 text-[#245C45]" />
                    ) : (
                      <Clock className="w-3.5 h-3.5 mt-0.5 flex-shrink-0 text-amber-600" />
                    )}
                    <span>{verifiedOrder.reason || `Order status is '${verifiedOrder.status}'. Only 'Ready' orders can be handed over.`}</span>
                  </div>
                ) : (
                  <div className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-[11px] flex items-start gap-1.5 mt-2">
                    <CheckCircle2 className="w-3.5 h-3.5 mt-0.5 flex-shrink-0 text-emerald-600" />
                    <span>Meal is confirmed ready at counter. Eligible for immediate handover!</span>
                  </div>
                )}
              </div>
            ) : (
              <div className="py-10 text-center text-[#252A27]/50 text-xs flex flex-col items-center justify-center">
                <Info className="w-8 h-8 text-[#252A27]/30 mb-2" />
                <span className="font-semibold">No Order Verified Yet</span>
                <span className="text-[11px] mt-0.5 max-w-[220px]">
                  Enter a valid order number or click a sample token to verify with the database.
                </span>
              </div>
            )}
          </div>

          {/* Action Confirmation Button */}
          <div className="mt-4 pt-3 border-t border-[#245C45]/10">
            {actionFeedback ? (
              <div className="py-2.5 px-3 bg-[#E6EFE7] border border-[#245C45]/30 rounded-xl text-center text-xs font-bold text-[#245C45] flex items-center justify-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-[#245C45]" />
                <span>{actionFeedback}</span>
              </div>
            ) : (
              <button
                type="button"
                onClick={handleConfirmCollection}
                disabled={!verifiedOrder || !verifiedOrder.eligible || isHandingOver}
                className={`w-full py-2.5 px-4 rounded-xl text-xs sm:text-sm font-semibold transition-all flex items-center justify-center gap-2 cursor-pointer ${
                  verifiedOrder && verifiedOrder.eligible && !isHandingOver
                    ? 'bg-[#245C45] hover:bg-[#164B38] text-white shadow-xs active:scale-[0.99]'
                    : 'bg-gray-100 text-gray-400 cursor-not-allowed border border-gray-200'
                }`}
              >
                {isHandingOver ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Updating State Machine...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    <span>
                      {verifiedOrder && (verifiedOrder.status === 'Collected' || verifiedOrder.status === 'picked_up')
                        ? 'Meal Already Handed Over'
                        : 'Verify Token & Hand Over Meal'}
                    </span>
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
