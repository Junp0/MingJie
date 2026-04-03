import dayjs, { type Dayjs } from "dayjs";
import customParseFormat from "dayjs/plugin/customParseFormat";
import timezone from "dayjs/plugin/timezone";
import utc from "dayjs/plugin/utc";

dayjs.extend(utc);
dayjs.extend(timezone);
dayjs.extend(customParseFormat);

export const BEIJING_TIMEZONE = "Asia/Shanghai";
export const DEFAULT_DATE_TIME_FORMAT = "YYYY-MM-DD HH:mm:ss";

const LOCAL_DATE_PATTERNS = [
  "YYYY-MM-DD HH:mm:ss",
  "YYYY-MM-DD HH:mm",
  "YYYY-MM-DD",
];

const hasExplicitTimezone = (value: string) =>
  /(?:Z|[+-]\d{2}:\d{2})$/i.test(value.trim());

export const parseBeijingDateTime = (
  value?: string | Date | null
): Dayjs | null => {
  if (!value) return null;

  if (value instanceof Date) {
    const parsed = dayjs(value).tz(BEIJING_TIMEZONE);
    return parsed.isValid() ? parsed : null;
  }

  const normalized = value.trim();
  if (!normalized) return null;

  if (hasExplicitTimezone(normalized)) {
    const parsed = dayjs(normalized).tz(BEIJING_TIMEZONE);
    return parsed.isValid() ? parsed : null;
  }

  const normalizedLocalValue = normalized.replace("T", " ");
  for (const pattern of LOCAL_DATE_PATTERNS) {
    const parsed = dayjs.tz(
      normalizedLocalValue,
      pattern,
      BEIJING_TIMEZONE
    );
    if (parsed.isValid()) {
      return parsed;
    }
  }

  return null;
};

export const formatBeijingDateTime = (
  value?: string | Date | null,
  format: string = DEFAULT_DATE_TIME_FORMAT
) => parseBeijingDateTime(value)?.format(format) ?? "";
