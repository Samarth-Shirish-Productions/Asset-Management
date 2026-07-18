import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import axios from 'axios';
import { ShieldCheck, ShieldAlert, BadgeInfo, CalendarClock, Building } from 'lucide-react';
import { motion } from 'framer-motion';

const PublicScan = () => {
  const { assetId } = useParams();
  const [asset, setAsset] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchPublicInfo = async () => {
      try {
        const apiBaseUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
        const res = await axios.get(`${apiBaseUrl}/assets/qr/${assetId}`);
        if (res.data?.success) {
          setAsset(res.data.asset);
        }
      } catch (err) {
        setError(err.response?.data?.message || 'Asset details not found or invalid QR code');
      } finally {
        setLoading(false);
      }
    };

    if (assetId) {
      fetchPublicInfo();
    }
  }, [assetId]);

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 dark:bg-slate-950 font-sans p-6 text-center">
        <div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mb-3" />
        <p className="text-sm font-semibold text-slate-400">Loading audit validation record...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950 font-sans p-6 transition-colors duration-300">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800/80 p-8 rounded-3xl shadow-xl backdrop-blur-md"
      >
        {error ? (
          <div className="text-center space-y-4">
            <ShieldAlert className="w-12 h-12 text-rose-500 mx-auto" />
            <h2 className="text-lg font-black text-slate-800 dark:text-slate-100">Verification Failure</h2>
            <p className="text-xs text-slate-400 font-semibold">{error}</p>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Header Badge */}
            <div className="text-center">
              <ShieldCheck className="w-12 h-12 text-emerald-500 mx-auto mb-3" />
              <h2 className="text-xl font-black text-slate-800 dark:text-slate-100">Audit Verification Successful</h2>
              <span className="inline-block mt-1 px-3 py-1 bg-indigo-50 dark:bg-indigo-950/20 text-indigo-600 dark:text-indigo-400 font-extrabold text-[10px] uppercase rounded-lg tracking-wider">
                {asset.assetId}
              </span>
            </div>

            {/* Asset specifications */}
            <div className="divide-y divide-slate-100 dark:divide-slate-800/40 text-xs font-semibold text-slate-650 dark:text-slate-350">
              <div className="py-3 flex justify-between">
                <span className="text-slate-400">Asset Name</span>
                <span className="font-extrabold text-slate-800 dark:text-slate-100">{asset.name}</span>
              </div>
              <div className="py-3 flex justify-between">
                <span className="text-slate-400">Model / Version</span>
                <span className="text-slate-800 dark:text-slate-100">{asset.model}</span>
              </div>
              <div className="py-3 flex justify-between">
                <span className="text-slate-400">Category Type</span>
                <span className="text-slate-800 dark:text-slate-100">{asset.category}</span>
              </div>
              <div className="py-3 flex justify-between">
                <span className="text-slate-400">Sub-category</span>
                <span className="text-slate-800 dark:text-slate-100">{asset.subCategory}</span>
              </div>
              <div className="py-3 flex justify-between">
                <span className="text-slate-400">Department</span>
                <span className="text-slate-800 dark:text-slate-100">{asset.department}</span>
              </div>
              <div className="py-3 flex justify-between">
                <span className="text-slate-400">Branch Office</span>
                <span className="text-slate-800 dark:text-slate-100">{asset.branch}</span>
              </div>
              <div className="py-3 flex justify-between">
                <span className="text-slate-400">Warranty Status</span>
                <span className="text-slate-800 dark:text-slate-100">
                  {asset.warrantyExpiry 
                    ? new Date(asset.warrantyExpiry) > new Date()
                      ? `Valid until ${new Date(asset.warrantyExpiry).toLocaleDateString()}`
                      : `Expired on ${new Date(asset.warrantyExpiry).toLocaleDateString()}`
                    : 'No Warranty Registered'
                  }
                </span>
              </div>
              <div className="py-3 flex justify-between items-center">
                <span className="text-slate-400">Status</span>
                <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                  asset.status === 'Active' 
                    ? 'bg-emerald-500/10 text-emerald-500' 
                    : asset.status === 'In Storage' 
                    ? 'bg-blue-500/10 text-blue-500' 
                    : 'bg-amber-500/10 text-amber-500'
                }`}>
                  {asset.status}
                </span>
              </div>
            </div>

            <div className="pt-2 flex items-start gap-2 text-[10px] text-slate-400 bg-slate-50 dark:bg-slate-950/20 p-3 rounded-xl border border-slate-100 dark:border-slate-800/40">
              <BadgeInfo className="w-4 h-4 text-indigo-500 flex-shrink-0" />
              <p className="leading-relaxed">
                This is a secure audit confirmation record. Only non-sensitive parameters are visible for on-site checks.
              </p>
            </div>
          </div>
        )}
      </motion.div>
    </div>
  );
};

export default PublicScan;
