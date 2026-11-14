import { Icon } from './Icon';
import { formatFullDate } from '../lib/date';

interface DateFieldProps {
  value: string | null;
  onChange: (value: string | null) => void;
  label: string;
  emptyLabel?: string;
}

export function DateField({ value, onChange, label, emptyLabel = 'انتخاب تاریخ' }: DateFieldProps) {
  return (
    <div className="date-field-row">
      <label className="date-field">
        <Icon name="calendar" size={16} />
        <span className={value ? '' : 'is-empty'}>{value ? formatFullDate(value) : emptyLabel}</span>
        <input
          type="date"
          value={value ?? ''}
          onChange={(event) => onChange(event.target.value || null)}
          aria-label={label}
        />
      </label>
      {value ? (
        <button
          type="button"
          className="icon-btn"
          onClick={() => onChange(null)}
          aria-label="پاک کردن تاریخ"
        >
          <Icon name="close" size={15} />
        </button>
      ) : null}
    </div>
  );
}
