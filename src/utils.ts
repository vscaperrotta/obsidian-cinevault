export function logger(message: string, color: string = 'white') {
  console.log(`%c ${message}`, `background: ${color}; color: black; padding: 6px 8px`);
}

export function nullSafe<T>(func: () => T, fallbackValue: T | null = null): T | null {
  try {
    const value = func();
    return value === null || value === undefined ? fallbackValue : value;
  } catch (e) {
    console.error('Error: ', e);
    return fallbackValue;
  }
}