import React from 'react';
import { ArrowDown, ArrowRight, ArrowUpRight, BookOpen, Compass, Layers } from 'lucide-react';
import { CONFUSING_PAIRS, PREPOSITION_META, PrepositionCategory } from '../data/collocations';

interface GrammarViewProps {
  onJumpToSearch: (keyword: string) => void;
  onJumpToPreposition: (prep: PrepositionCategory) => void;
}

export const GrammarView: React.FC<GrammarViewProps> = ({
  onJumpToSearch,
  onJumpToPreposition,
}) => {
  return (
    <section className="space-y-4 sm:space-y-6" aria-label="Bản đồ ngữ pháp và cặp từ dễ nhầm">
      {/* Section 1: Core Grammar Formula (100% Mobile Fitted, Zero Horizontal Scroll) */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-6 space-y-4">
        <div className="space-y-1">
          <div className="text-xs text-slate-500 font-medium">
            01. Bản Đồ Ngữ Pháp Cốt Lõi
          </div>
          <h1 className="text-base sm:text-xl font-bold text-slate-900 tracking-tight">
            Công Thức Chung: Tính Từ + Giới Từ
          </h1>
        </div>

        {/* Responsive Formula Diagram: Stacks vertically on mobile, horizontal on desktop */}
        <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3.5 sm:p-5 space-y-3 lg:space-y-0 lg:flex lg:items-center lg:gap-4">
          {/* Left Part: S + be + Adj + Prep (Fits 100% on 390px mobile screen) */}
          <div className="grid grid-cols-3 gap-1.5 sm:gap-2 items-center text-center lg:w-[340px] shrink-0">
            <div className="px-2 py-2.5 bg-white border border-slate-200 rounded-xl font-mono text-xs sm:text-sm font-semibold text-slate-900">
              S + be
            </div>
            <div className="px-2 py-2.5 bg-white border border-slate-200 rounded-xl font-mono text-xs sm:text-sm font-semibold text-sky-700">
              + Adj
            </div>
            <div className="px-2 py-2.5 bg-slate-900 text-white rounded-xl font-mono text-xs sm:text-sm font-semibold">
              + Prep
            </div>
          </div>

          {/* Connector: Down label on mobile, Right arrow on desktop */}
          <div className="flex items-center justify-center gap-1.5 text-xs font-medium text-slate-500 lg:shrink-0">
            <ArrowDown className="w-4 h-4 lg:hidden text-sky-600" />
            <span className="lg:hidden">Theo sau giới từ là 1 trong 4 dạng:</span>
            <ArrowRight className="hidden lg:block w-5 h-5 text-slate-400" />
          </div>

          {/* Right Part: 4 Possible Followers in a neat grid */}
          <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-2">
            <div className="bg-white border border-slate-200 rounded-xl px-3 py-2 flex items-center justify-between gap-2">
              <span className="font-mono text-xs font-bold text-slate-900">
                1. Noun / N-Phrase
              </span>
              <span className="text-xs text-slate-500">Danh từ / Cụm DT</span>
            </div>
            <div className="bg-white border border-slate-200 rounded-xl px-3 py-2 flex items-center justify-between gap-2">
              <span className="font-mono text-xs font-bold text-slate-900">
                2. Object Pronoun
              </span>
              <span className="text-xs text-slate-500">me, him, them...</span>
            </div>
            <div className="bg-white border border-slate-200 rounded-xl px-3 py-2 flex items-center justify-between gap-2">
              <span className="font-mono text-xs font-bold text-sky-700">
                3. V-ing (Gerund)
              </span>
              <span className="text-xs text-slate-500">Động từ thêm -ing</span>
            </div>
            <div className="bg-white border border-slate-200 rounded-xl px-3 py-2 flex items-center justify-between gap-2">
              <span className="font-mono text-xs font-bold text-slate-900">
                4. Wh-clause
              </span>
              <span className="text-xs text-slate-500">what / how...</span>
            </div>
          </div>
        </div>

        {/* Special Note on TO */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 space-y-1.5">
            <div className="flex items-center justify-between gap-2">
              <h2 className="text-xs sm:text-sm font-bold text-slate-900 whitespace-nowrap">
                1. TO là Giới từ (+ N / V-ing)
              </h2>
              <button
                type="button"
                onClick={() => onJumpToPreposition('TO')}
                className="text-xs font-semibold text-sky-600 hover:text-sky-700 flex items-center gap-0.5 whitespace-nowrap shrink-0"
              >
                <span>Xem 20 cụm</span>
                <ArrowUpRight className="w-3.5 h-3.5" />
              </button>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              Khi <code className="font-mono font-semibold text-slate-900">to</code> là giới từ chỉ hướng/quan hệ, theo sau bắt buộc là <strong>Danh từ</strong> hoặc <strong>V-ing</strong>.
            </p>
            <p className="text-xs font-mono text-slate-800">
              VD: accustomed to waking up · addicted to games
            </p>
          </div>

          <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 space-y-1.5">
            <div className="flex items-center justify-between gap-2">
              <h2 className="text-xs sm:text-sm font-bold text-slate-900 whitespace-nowrap">
                2. TO là Nguyên mẫu (+ V-bare)
              </h2>
              <button
                type="button"
                onClick={() => onJumpToPreposition('TO')}
                className="text-xs font-semibold text-sky-600 hover:text-sky-700 flex items-center gap-0.5 whitespace-nowrap shrink-0"
              >
                <span>Xem 6 cụm</span>
                <ArrowUpRight className="w-3.5 h-3.5" />
              </button>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              Khi <code className="font-mono font-semibold text-slate-900">to</code> thuộc dạng <strong>to-infinitive</strong> chỉ cảm xúc khi làm gì, theo sau là <strong>V nguyên mẫu</strong>.
            </p>
            <p className="text-xs font-mono text-slate-800">
              VD: delighted to welcome · proud to present
            </p>
          </div>
        </div>
      </div>

      {/* Section 2: 4 Confusing Pairs */}
      <div className="space-y-3">
        <div className="px-1">
          <div className="text-xs text-slate-500 font-medium">
            02. Các Cặp Dễ Gây Nhầm Lẫn Cần Phân Biệt
          </div>
          <h2 className="text-base sm:text-xl font-bold text-slate-900 mt-0.5">
            4 Cặp Giới Từ Hay Bẫy Nhất Trong Bài Thi
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
          {CONFUSING_PAIRS.map((group) => (
            <div
              key={group.id}
              className="bg-white border border-slate-200 rounded-2xl p-4 space-y-3"
            >
              <div>
                <h3 className="text-sm sm:text-base font-bold text-slate-900">
                  {group.title}
                </h3>
                <p className="text-xs text-slate-600 mt-0.5">
                  {group.summary}
                </p>
              </div>

              <div className="space-y-2">
                {group.items.map((sub, i) => (
                  <div
                    key={i}
                    className="bg-slate-50 border border-slate-200 rounded-xl p-3 space-y-1"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-mono text-xs sm:text-sm font-bold text-sky-700">
                        {sub.phrase}
                      </span>
                      <button
                        type="button"
                        onClick={() =>
                          onJumpToSearch(sub.phrase.split(' ')[0])
                        }
                        className="text-xs font-medium text-slate-600 hover:text-slate-900 flex items-center gap-0.5 whitespace-nowrap shrink-0"
                      >
                        <span>Tra từ</span>
                        <ArrowUpRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    <p className="text-xs font-medium text-slate-800">
                      {sub.rule}
                    </p>
                    <p className="text-xs text-slate-600 italic">
                      “{sub.example}” — {sub.meaningVi}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Section 3: 3 Peak Learning Methods */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-6 space-y-4">
        <div>
          <div className="text-xs text-slate-500 font-medium">
            03. Phương Pháp Học & Luyện Tập
          </div>
          <h2 className="text-base sm:text-xl font-bold text-slate-900 mt-0.5">
            3 Nguyên Tắc Ghi Nhớ Không Học Vẹt
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-2">
            <div className="flex items-center gap-2 text-slate-900 font-bold text-sm">
              <Layers className="w-4 h-4 text-sky-600 shrink-0" />
              <span>1. Học Cụm 3 Từ (Chunks)</span>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              Không học rời rạc từng từ. Hãy đọc to và nhớ theo cụm 3 từ: <strong>[Tính từ + Giới từ + Danh từ]</strong>.
            </p>
            <div className="text-xs font-mono text-slate-800 space-y-0.5">
              <div>• Angry about the delay</div>
              <div>• Good at Math</div>
              <div>• Fed up with traffic</div>
            </div>
          </div>

          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-2">
            <div className="flex items-center gap-2 text-slate-900 font-bold text-sm">
              <BookOpen className="w-4 h-4 text-sky-600 shrink-0" />
              <span>2. Đặt Câu Về Bản Thân</span>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              Não bộ nhớ nhanh gấp 3 lần khi câu ví dụ gắn với sở thích hoặc trải nghiệm thật của chính em.
            </p>
            <div className="text-xs text-slate-800 space-y-0.5">
              <div>Thay vì: “He is keen on music.”</div>
              <div className="font-medium text-sky-800">
                Hãy đặt: “I am keen on playing football.”
              </div>
            </div>
          </div>

          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-2">
            <div className="flex items-center gap-2 text-slate-900 font-bold text-sm">
              <Compass className="w-4 h-4 text-sky-600 shrink-0" />
              <span>3. Bản Chất Năng Lượng Giới Từ</span>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              Hiểu ý nghĩa cốt lõi của giới từ để tự suy luận khi gặp cụm mới:
            </p>
            <div className="text-xs text-slate-800 space-y-0.5">
              <div><strong>AT:</strong> Nhắm vào mục tiêu kỹ năng.</div>
              <div><strong>ABOUT:</strong> Xoay quanh chủ đề tâm lý.</div>
              <div><strong>FOR:</strong> Hướng đến lợi ích / lý do.</div>
              <div><strong>WITH:</strong> Tương tác / đồng hành.</div>
            </div>
          </div>
        </div>

        {/* Quick 10 Preposition Energy Table */}
        <div className="pt-1">
          <h3 className="text-xs sm:text-sm font-bold text-slate-900 mb-2.5">
            Chạm vào giới từ bất kỳ để tra từ ngay:
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
            {PREPOSITION_META.map((m) => (
              <button
                key={m.key}
                type="button"
                onClick={() => onJumpToPreposition(m.key)}
                className="min-h-[56px] p-2.5 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200 text-left transition-colors flex flex-col justify-between"
              >
                <div className="flex items-center justify-between w-full">
                  <span className="font-mono font-bold text-xs sm:text-sm text-slate-900">
                    {m.label}
                  </span>
                  <span className="text-[11px] font-mono text-slate-500 tabular-nums">
                    {m.count} cụm
                  </span>
                </div>
                <p className="text-[11px] text-slate-600 line-clamp-2 mt-1">
                  {m.energyDescription}
                </p>
              </button>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};
