import { motion } from 'framer-motion';
import { useLanguage } from '@/contexts/LanguageContext';

interface OfflineGainsModalProps {
  amount: number;
  onConfirm: () => void;
  formatNumber: (num: number) => string;
}

const OfflineGainsModal: React.FC<OfflineGainsModalProps> = ({ amount, onConfirm, formatNumber }) => {
  const { t } = useLanguage();

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-gray-800 border border-slate-700 rounded-xl p-6 text-center shadow-2xl max-w-sm w-full"
      >
        <h2 className="text-2xl font-bold text-lime-400 mb-2">{t('offline_gains_title')}</h2>
        <p className="text-slate-300 mb-4">{t('offline_gains_desc')}</p>
        <p className="text-4xl font-bold text-white my-6">+{formatNumber(amount)}</p>
        <button
          onClick={onConfirm}
          className="w-full bg-lime-500 hover:bg-lime-600 text-slate-900 font-bold py-3 px-6 rounded-lg text-lg"
        >
          {t('offline_gains_confirm')}
        </button>
      </motion.div>
    </div>
  );
};

export default OfflineGainsModal;