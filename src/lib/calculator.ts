export const safeEval = (expression: string): number => {
  try {
    const sanitized = expression.replace(',', '.').trim();

    const validPattern = /^[\d\s\+\-\*\/\(\)\.]+$/;
    if (!validPattern.test(sanitized)) {
      return NaN;
    }

    if (/[a-zA-Z]/.test(sanitized)) {
      return NaN;
    }

    const tokens = sanitized.match(/(\d+\.?\d*|\+|\-|\*|\/|\(|\))/g);
    if (!tokens) {
      return NaN;
    }

    const result = Function('"use strict"; return (' + sanitized + ')')();

    return typeof result === 'number' && isFinite(result) ? result : NaN;
  } catch (error) {
    return NaN;
  }
};
