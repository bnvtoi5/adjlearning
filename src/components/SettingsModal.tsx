import React, { useState, useEffect } from 'react';
import { X, Key, Sparkles, CheckCircle2, Eye, EyeOff, RotateCcw } from 'lucide-react';
import {
  AISettings,
  DEFAULT_AI_SETTINGS,
  loadAISettings,
  saveAISettings,
} from '../utils/memriseQuizEngine';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: AISettings;
  onSaveSettings: (next: AISettings) => void;
}

const GEMINI_SUGGESTED_MODELS = [
  { id: 'gemini-3.1-flash-lite-preview', label: 'Gemini 3.1 Flash Lite (Nhanh, khuyên dùng)' },
  { id: 'gemini-3-flash-preview', label: 'Gemini 3 Flash Preview' },
  { id: 'gemini-2.5-flash', label: 'Gemini 2.5 Flash (Ổn định)' },
  { id: 'gemini-2.5-pro', label: 'Gemini 2.5 Pro (Sâu sắc)' },
];

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  settings,
  onSaveSettings,
}) => {
  const [provider, setProvider] = useState<AISettings['provider']>(settings.provider);
  const [apiKey, setApiKey] = useState(settings.apiKey);
  const [model, setModel] = useState(settings.model);
  const [customBaseUrl, setCustomBaseUrl] = useState(settings.customBaseUrl || '');
  const [batchSize, setBatchSize] = useState(settings.batchSize || 3);
  const [showKey, setShowKey] = useState(false);
  const [savedNotice, setSavedNotice] = useState(false);

  useEffect(() => {
    if (isOpen) {
      const latest = loadAISettings();
      setProvider(latest.provider);
      setApiKey(latest.apiKey);
      setModel(latest.model);
      setCustomBaseUrl(latest.customBaseUrl || '');
      setBatchSize(latest.batchSize || 3);
      setSavedNotice(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    const next: AISettings = {
      provider,
      apiKey: apiKey.trim(),
      model: model.trim() || DEFAULT_AI_SETTINGS.model,
      customBaseUrl: customBaseUrl.trim(),
      batchSize: Math.max(1, Math.min(10, Number(batchSize) || 3)),
    };
    saveAISettings(next);
    onSaveSettings(next);
    setSavedNotice(true);
    setTimeout(() => {
      setSavedNotice(false);
      onClose();
    }, 600);
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="settings-modal-title"
    >
      <div className="bg-white border border-slate-200 rounded-2xl max-w-lg w-full p-4 sm:p-6 space-y-4 shadow-xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-start justify-between gap-3 border-b border-slate-100 pb-3">
          <div>
            <h2
              id="settings-modal-title"
              className="text-base sm:text-lg font-bold text-slate-900 flex items-center gap-2"
            >
              <Sparkles className="w-5 h-5 text-sky-600 shrink-0" />
              <span>Cài Đặt AI & Tạo Đề Quiz</span>
            </h2>
            <p className="text-xs text-slate-600 mt-0.5">
              Dành cho giáo viên/người tạo đề bằng AI (lưu trực tiếp trên trình duyệt của bạn). Học sinh tải file JSON về học không cần nhập API Key.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Đóng cài đặt"
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSave} className="space-y-4">
          {/* Provider Selector */}
          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-slate-800">
              1. Chọn Nhà Cung Cấp AI (Provider)
            </label>
            <div className="grid grid-cols-3 gap-2">
              {(
                [
                  { id: 'gemini', label: 'Google Gemini' },
                  { id: 'openrouter', label: 'OpenRouter' },
                  { id: 'openai', label: 'OpenAI / Khác' },
                ] as const
              ).map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => {
                    setProvider(item.id);
                    if (item.id === 'gemini' && !model.startsWith('gemini')) {
                      setModel('gemini-3.1-flash-lite-preview');
                    }
                  }}
                  className={`min-h-[40px] px-3 py-2 rounded-xl text-xs font-semibold border transition-colors ${
                    provider === item.id
                      ? 'bg-sky-600 text-white border-sky-600'
                      : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>

          {/* API Key Input */}
          <div className="space-y-1.5">
            <label
              htmlFor="ai-api-key-input"
              className="block text-xs font-bold text-slate-800"
            >
              2. Nhập API Key riêng ({provider === 'gemini' ? 'Google AI Studio Key' : 'Bearer API Key'})
            </label>
            <div className="relative flex items-center">
              <Key className="w-4 h-4 text-slate-400 absolute left-3 pointer-events-none" />
              <input
                id="ai-api-key-input"
                type={showKey ? 'text' : 'password'}
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder={
                  provider === 'gemini'
                    ? 'AIzaSy... (Dán Gemini API Key của bạn vào đây)'
                    : 'sk-... (Dán API Key vào đây)'
                }
                className="w-full min-h-[42px] pl-9 pr-10 py-2 rounded-xl border border-slate-300 bg-slate-50 text-xs sm:text-sm font-mono text-slate-900 focus:bg-white focus:border-sky-600 focus:outline-none"
              />
              <button
                type="button"
                onClick={() => setShowKey((s) => !s)}
                aria-label={showKey ? 'Ẩn API Key' : 'Hiện API Key'}
                className="absolute right-2.5 p-1 text-slate-500 hover:text-slate-800"
              >
                {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Model Name Input + Quick Chips */}
          <div className="space-y-2">
            <label
              htmlFor="ai-model-input"
              className="block text-xs font-bold text-slate-800"
            >
              3. Tên Model AI (Có thể tự gõ tên model bất kỳ hoặc bấm chọn nhanh)
            </label>
            <input
              id="ai-model-input"
              type="text"
              value={model}
              onChange={(e) => setModel(e.target.value)}
              placeholder="Ví dụ: gemini-3.1-flash-lite-preview, gemini-2.5-flash..."
              className="w-full min-h-[42px] px-3 py-2 rounded-xl border border-slate-300 bg-slate-50 text-xs sm:text-sm font-mono text-slate-900 focus:bg-white focus:border-sky-600 focus:outline-none"
            />
            {provider === 'gemini' && (
              <div className="flex flex-wrap gap-1.5 pt-0.5">
                {GEMINI_SUGGESTED_MODELS.map((m) => (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => setModel(m.id)}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-mono border transition-colors ${
                      model === m.id
                        ? 'bg-slate-900 text-white border-slate-900 font-semibold'
                        : 'bg-slate-100 text-slate-700 border-slate-200 hover:bg-slate-200'
                    }`}
                  >
                    {m.id}
                  </button>
                ))}
              </div>
            )}
          </div>

          {provider === 'openai' && (
            <div className="space-y-1.5">
              <label
                htmlFor="ai-baseurl-input"
                className="block text-xs font-bold text-slate-800"
              >
                Base URL tùy chỉnh (Nếu dùng proxy / endpoint tương thích OpenAI)
              </label>
              <input
                id="ai-baseurl-input"
                type="text"
                value={customBaseUrl}
                onChange={(e) => setCustomBaseUrl(e.target.value)}
                placeholder="https://api.openai.com/v1"
                className="w-full min-h-[40px] px-3 py-2 rounded-xl border border-slate-300 bg-slate-50 text-xs font-mono text-slate-900"
              />
            </div>
          )}

          {/* Batch Size Selector */}
          <div className="space-y-1.5 pt-1 border-t border-slate-100">
            <label className="block text-xs font-bold text-slate-800">
              4. Số cụm từ mỗi đợt học (Batch / Round)
            </label>
            <div className="grid grid-cols-3 gap-2">
              {[3, 5, 10].map((sz) => (
                <button
                  key={sz}
                  type="button"
                  onClick={() => setBatchSize(sz)}
                  className={`min-h-[38px] px-3 py-1.5 rounded-xl text-xs font-semibold border transition-colors ${
                    batchSize === sz
                      ? 'bg-slate-900 text-white border-slate-900'
                      : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  {sz} từ / đợt {sz === 3 ? '(Chuẩn)' : ''}
                </button>
              ))}
            </div>
          </div>

          {/* Footer Actions */}
          <div className="flex items-center justify-between gap-2 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={() => {
                setProvider(DEFAULT_AI_SETTINGS.provider);
                setModel(DEFAULT_AI_SETTINGS.model);
                setBatchSize(DEFAULT_AI_SETTINGS.batchSize);
              }}
              className="min-h-[40px] px-3 py-2 rounded-xl bg-slate-100 text-slate-700 text-xs font-semibold hover:bg-slate-200 flex items-center gap-1.5"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Mặc định</span>
            </button>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="min-h-[40px] px-4 py-2 rounded-xl bg-slate-100 text-slate-700 text-xs font-semibold hover:bg-slate-200"
              >
                Đóng
              </button>
              <button
                type="submit"
                className="min-h-[40px] px-4 py-2 rounded-xl bg-sky-600 text-white text-xs font-semibold hover:bg-sky-700 flex items-center gap-1.5"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>{savedNotice ? 'Đã lưu!' : 'Lưu cài đặt'}</span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
