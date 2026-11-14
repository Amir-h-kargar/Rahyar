import { useEffect, useRef, useState } from 'react';
import { useStore } from '../store/store';
import { useUi } from '../ui/ui';
import { Sheet, ConfirmDialog } from './Sheet';
import { Icon } from './Icon';
import { serializeState, parseImportedState, STORAGE_KEY } from '../lib/storage';
import { todayKey } from '../lib/date';

export function SettingsSheet() {
  const { state, dispatch } = useStore();
  const { settingsOpen, closeSettings, install, canInstall, toast } = useUi();
  const [name, setName] = useState(state.profile.name);
  const [confirm, setConfirm] = useState<'clear' | 'sample' | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (settingsOpen) setName(state.profile.name);
  }, [settingsOpen, state.profile.name]);

  const seedCount =
    state.tasks.filter((t) => t.source === 'seed').length +
    state.goals.filter((g) => g.source === 'seed').length +
    state.rituals.filter((r) => r.source === 'seed').length;

  const exportData = () => {
    const blob = new Blob([serializeState(state)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `rahyar-backup-${todayKey()}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    toast('نسخهٔ پشتیبان دانلود شد.', { tone: 'success' });
  };

  const importData = async (file: File) => {
    const text = await file.text();
    const imported = parseImportedState(text);
    if (!imported) {
      toast('فایل پشتیبان معتبر نیست.', { tone: 'default' });
      return;
    }
    dispatch({ type: 'importState', state: imported, today: todayKey() });
    toast('داده‌ها با موفقیت بازیابی شدند.', { tone: 'success' });
    closeSettings();
  };

  const saveName = () => {
    dispatch({ type: 'updateName', name });
    toast(name.trim() ? `اسمت را ذخیره کردم، ${name.trim()}.` : 'اسم ذخیره شد.', {
      tone: 'success',
    });
  };

  return (
    <>
      <Sheet
        open={settingsOpen}
        onClose={closeSettings}
        title="تنظیمات"
        subtitle="رهیار، ساده و خصوصی."
        size="md"
      >
        <div className="settings">
          <section className="settings-section">
            <h3>تو</h3>
            <div className="field">
              <label className="field-label" htmlFor="profile-name">
                اسمی که رهیار صدایت کند
              </label>
              <div className="row gap-8">
                <input
                  id="profile-name"
                  className="input grow"
                  placeholder="اختیاری"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  maxLength={40}
                />
                <button type="button" className="btn btn--soft" onClick={saveName}>
                  ذخیره
                </button>
              </div>
            </div>
            <p className="settings-note">
              <Icon name="lock" size={14} /> همهٔ داده‌ها فقط روی همین دستگاه ذخیره می‌شوند؛ هیچ چیز به سرور فرستاده نمی‌شود.
            </p>
          </section>

          <section className="settings-section">
            <h3>برنامه</h3>
            <div className="settings-rows">
              <div className="settings-row">
                <span>
                  <strong>نصب روی دستگاه</strong>
                  <small>دسترسی سریع، تمام‌صفحه و آفلاین.</small>
                </span>
                <button type="button" className="btn btn--soft btn--sm" onClick={() => void install()}>
                  <Icon name="download" size={15} />
                  {canInstall ? 'نصب رهیار' : 'راهنمای نصب'}
                </button>
              </div>
              <div className="settings-row">
                <span>
                  <strong>نسخهٔ پشتیبان</strong>
                  <small>یک فایل JSON از همهٔ داده‌ها.</small>
                </span>
                <div className="row gap-6">
                  <button type="button" className="icon-btn" onClick={exportData} aria-label="دانلود پشتیبان">
                    <Icon name="download" size={17} />
                  </button>
                  <button
                    type="button"
                    className="icon-btn"
                    onClick={() => fileRef.current?.click()}
                    aria-label="بازیابی پشتیبان"
                  >
                    <Icon name="upload" size={17} />
                  </button>
                </div>
              </div>
              {seedCount > 0 ? (
                <div className="settings-row">
                  <span>
                    <strong>داده‌های نمونه</strong>
                    <small>{seedCount.toLocaleString('fa-IR')} مورد نمونه در برنامه هست.</small>
                  </span>
                  <button type="button" className="btn btn--ghost btn--sm" onClick={() => setConfirm('sample')}>
                    پاک کردن نمونه‌ها
                  </button>
                </div>
              ) : null}
            </div>
          </section>

          <section className="settings-section">
            <h3>دربارهٔ رهیار</h3>
            <p className="about-copy">
              رهیار یک لیست کار نیست؛ یک سیستم اجرای زندگی است. تصمیم می‌گیرد حرکت بعدی تو چه باشد و نشان
              می‌دهد آیا زمان و توجهت زندگی‌ای را می‌سازد که برایش هدف گذاشته‌ای.
            </p>
            <div className="about-meta">
              <span>نسخهٔ ۱٫۰ · PWA</span>
              <span>پردازش کامل روی دستگاه</span>
              <span>{state.tasks.length.toLocaleString('fa-IR')} کار ثبت‌شده</span>
            </div>
          </section>

          <section className="settings-section settings-danger">
            <h3>منطقهٔ حساس</h3>
            <button type="button" className="btn btn--danger btn--sm" onClick={() => setConfirm('clear')}>
              پاک کردن همهٔ داده‌ها
            </button>
            <p className="settings-note">
              این کار همهٔ کارها، حوزه‌ها، اهداف، آیین‌ها و مرورها را حذف می‌کند و رهیار را از نو شروع می‌کند.
            </p>
          </section>
        </div>

        <input
          ref={fileRef}
          type="file"
          accept="application/json,.json"
          hidden
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) void importData(file);
            event.target.value = '';
          }}
        />
      </Sheet>

      <ConfirmDialog
        open={confirm === 'sample'}
        title="نمونه‌ها پاک شوند؟"
        description="کارها، اهداف، آیین‌ها و مرورهای نمونه حذف می‌شوند. چیزهایی که خودت ساخته‌ای دست نمی‌خورند."
        confirmLabel="پاک کن"
        onClose={() => setConfirm(null)}
        onConfirm={() => {
          dispatch({ type: 'clearSample' });
          setConfirm(null);
          toast('داده‌های نمونه پاک شدند.', { tone: 'success' });
        }}
      />

      <ConfirmDialog
        open={confirm === 'clear'}
        title="از نو شروع کنیم؟"
        description="همهٔ داده‌های محلی رهیار پاک می‌شود. این کار برگشت‌پذیر نیست. اگر می‌خواهی، اول از تنظیمات پشتیبان بگیر."
        confirmLabel="همه را پاک کن"
        danger
        onClose={() => setConfirm(null)}
        onConfirm={() => {
          try {
            localStorage.removeItem(STORAGE_KEY);
          } catch {
            /* ignore */
          }
          dispatch({ type: 'clearAll' });
          setConfirm(null);
          closeSettings();
        }}
      />
    </>
  );
}
