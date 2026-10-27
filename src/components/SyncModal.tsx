import React, { useState } from 'react';
import {
  CheckCircle2,
  AlertCircle,
  X,
  Copy,
  Download,
  Upload,
  Trash2,
} from 'lucide-react';
import {
  exportLocalSyncCode,
  importLocalSyncCode,
  ProgressMap,
} from '../utils/studyLogic';

interface SyncModalProps {
  isOpen: boolean;
  onClose: () => void;
  progress: ProgressMap;
  masteredCount: number;
  learningCount: number;
  onImportProgress: (imported: ProgressMap) => void;
  onResetProgress: () => void;
}

export const SyncModal: React.FC<SyncModalProps> = ({
  isOpen,
  onClose,
  progress,
  masteredCount,
  learningCount,
  onImportProgress,
  onResetProgress,
}) => {
  const [pasteCode, setPasteCode] = useState('');
  const [confirmReset, setConfirmReset] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);

  if (!isOpen) return null;

  const currentSyncCode = exportLocalSyncCode(progress);

  const handleCopyCode = async () => {
    try {
      await navigator.clipboard.writeText(currentSyncCode);
      setStatusMessage({
        type: 'success',
        text: 'Đã sao chép mã tiến độ! Em có thể dán mã này sang máy tính hoặc điện thoại khác để gộp tiến độ.',
      });
    } catch {
      setStatusMessage({
        type: 'error',
        text: 'Không thể tự động sao chép, em hãy bôi đen và copy dòng mã bên dưới nhé.',
      });
    }
  };

  const handleApplyPastedCode = (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = importLocalSyncCode(pasteCode);
    if (!parsed) {
      setStatusMessage({
        type: 'error',
        text: 'Mã tiến độ không hợp lệ. Mã đúng bắt đầu bằng "PM1:...".',
      });
      return;
    }
    onImportProgress(parsed);
    setPasteCode('');
    setStatusMessage({
      type: 'success',
      text: 'Đã gộp tiến độ thành công vào thiết bị này!',
    });
  };

  const handleDownloadBackup = () => {
    const payload = JSON.stringify(
      {
        version: 1,
        exportedAt: new Date().toISOString(),
        syncCode: currentSyncCode,
        progress,
      },
      null,
      2
    );
    const blob = new Blob([payload], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'prepmaster-tien-do.json';
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleUploadFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const json = JSON.parse(String(reader.result));
        if (json && typeof json.progress === 'object') {
          onImportProgress(json.progress as ProgressMap);
          setStatusMessage({
            type: 'success',
            text: 'Đã khôi phục tiến độ từ file sao lưu thành công!',
          });
        } else {
          setStatusMessage({
            type: 'error',
            text: 'File không đúng định dạng sao lưu của PrepMaster.',
          });
        }
      } catch {
        setStatusMessage({
          type: 'error',
          text: 'Không thể đọc file sao lưu.',
        });
      }
    };
    reader.readAsText(file);
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="sync-modal-title"
    >
      <div className="bg-white border border-slate-200 rounded-2xl max-w-md w-full p-5 space-y-4 shadow-xl">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2
              id="sync-modal-title"
              className="text-base sm:text-lg font-bold text-slate-900"
            >
              Tiến Độ Cá Nhân (Lưu Trực Tiếp Trên Máy)
            </h2>
            <p className="text-xs text-slate-600 mt-0.5">
              Tự động lưu riêng biệt trên trình duyệt của mỗi học sinh, không dùng chung dữ liệu.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Đóng cửa sổ"
            className="min-h-[38px] min-w-[38px] -mr-1.5 -mt-1 flex items-center justify-center rounded-xl text-slate-400 hover:text-slate-800 hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Summary Card */}
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 flex items-center justify-between text-xs">
          <span className="text-slate-600"> Đã lưu tự động trên máy này:</span>
          <span className="font-mono font-semibold text-slate-900 tabular-nums">
            Thuộc {masteredCount}/196 · Đang ôn {learningCount}
          </span>
        </div>

        {/* Copy / Paste Code to move between Phone & PC locally */}
        <div className="space-y-2">
          <label
            htmlFor="local-export-code"
            className="block text-xs font-semibold text-slate-700"
          >
            1. Chuyển tiến độ sang thiết bị khác (Sao chép mã):
          </label>
          <div className="flex items-center gap-2">
            <input
              id="local-export-code"
              type="text"
              readOnly
              value={currentSyncCode}
              className="flex-1 min-h-[40px] px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl font-mono text-xs text-slate-700 select-all"
            />
            <button
              type="button"
              onClick={handleCopyCode}
              className="min-h-[40px] px-3.5 py-1.5 rounded-xl bg-slate-900 text-white text-xs font-semibold hover:bg-slate-800 transition-colors flex items-center gap-1.5 whitespace-nowrap shrink-0"
            >
              <Copy className="w-3.5 h-3.5" />
              <span>Copy mã</span>
            </button>
          </div>
        </div>

        <form onSubmit={handleApplyPastedCode} className="space-y-2">
          <label
            htmlFor="local-import-code"
            className="block text-xs font-semibold text-slate-700"
          >
            2. Nhập mã tiến độ từ điện thoại / máy tính của em:
          </label>
          <div className="flex items-center gap-2">
            <input
              id="local-import-code"
              type="text"
              value={pasteCode}
              onChange={(e) => setPasteCode(e.target.value)}
              placeholder="Dán mã PM1:... vào đây"
              className="flex-1 min-h-[40px] px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl font-mono text-xs text-slate-900 focus:outline-none focus:bg-white focus:border-sky-600"
            />
            <button
              type="submit"
              className="min-h-[40px] px-3.5 py-1.5 rounded-xl bg-sky-600 text-white text-xs font-semibold hover:bg-sky-700 transition-colors whitespace-nowrap shrink-0"
            >
              Gộp tiến độ
            </button>
          </div>
        </form>

        {/* Status Feedback */}
        {statusMessage && (
          <div
            className={`rounded-xl p-3 text-xs flex items-start gap-2 border ${
              statusMessage.type === 'success'
                ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                : 'bg-rose-50 border-rose-200 text-rose-900'
            }`}
          >
            {statusMessage.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0 mt-0.5" />
            ) : (
              <AlertCircle className="w-4 h-4 text-rose-700 shrink-0 mt-0.5" />
            )}
            <span>{statusMessage.text}</span>
          </div>
        )}

        {/* File Backup & Reset */}
        <div className="pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={handleDownloadBackup}
              className="min-h-[38px] px-2.5 py-1.5 rounded-lg bg-slate-100 text-slate-700 hover:bg-slate-200 text-xs font-medium flex items-center gap-1"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Tải file</span>
            </button>

            <label className="min-h-[38px] px-2.5 py-1.5 rounded-lg bg-slate-100 text-slate-700 hover:bg-slate-200 text-xs font-medium flex items-center gap-1 cursor-pointer">
              <Upload className="w-3.5 h-3.5" />
              <span>Nhập file</span>
              <input
                type="file"
                accept=".json"
                onChange={handleUploadFile}
                className="sr-only"
              />
            </label>
          </div>

          {!confirmReset ? (
            <button
              type="button"
              onClick={() => setConfirmReset(true)}
              className="min-h-[38px] px-2.5 py-1.5 rounded-lg text-xs font-medium text-rose-600 hover:bg-rose-50 flex items-center gap-1"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Xóa tiến độ</span>
            </button>
          ) : (
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => {
                  onResetProgress();
                  setConfirmReset(false);
                  setStatusMessage({
                    type: 'success',
                    text: 'Đã đặt lại tiến độ trên thiết bị này về 0.',
                  });
                }}
                className="min-h-[36px] px-2.5 py-1 rounded-lg bg-rose-600 text-white text-xs font-semibold"
              >
                Xác nhận xóa
              </button>
              <button
                type="button"
                onClick={() => setConfirmReset(false)}
                className="min-h-[36px] px-2.5 py-1 rounded-lg bg-slate-100 text-slate-700 text-xs font-medium"
              >
                Hủy
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
