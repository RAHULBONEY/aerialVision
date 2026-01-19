
export const safeParseDate = (value) => {
  if (!value) return new Date();

  
  if (typeof value === 'object' && value.seconds) {
    return new Date(value.seconds * 1000);
  }

  
  if (value instanceof Date) {
    return value;
  }


  if (typeof value === 'string') {
    const d = new Date(value);
    if (!isNaN(d.getTime())) return d;

    const match = value.match(
      /(\d{1,2}) (\w+) (\d{4}) at (\d{2}):(\d{2}):(\d{2})/
    );
    if (match) {
      const [, day, monthName, year, h, m, s] = match;
      const monthMap = {
        January: 0, February: 1, March: 2, April: 3, May: 4, June: 5,
        July: 6, August: 7, September: 8, October: 9, November: 10, December: 11
      };
      return new Date(year, monthMap[monthName], day, h, m, s);
    }
  }

  return new Date();
};

export const formatTime = (date) => {
  try {
    const d = safeParseDate(date);
    return new Intl.DateTimeFormat('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    }).format(d);
  } catch {
    return '--:--';
  }
};

export const formatDateTime = (date) => {
  try {
    const d = safeParseDate(date);
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    }).format(d);
  } catch {
    return 'Invalid Date';
  }
};

export const formatFullDateTime = (date) => {
  try {
    const d = safeParseDate(date);
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false
    }).format(d);
  } catch {
    return 'Invalid Date';
  }
};