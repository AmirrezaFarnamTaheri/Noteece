/**
 * Sleep utility for testing and timing operations
 * Avoids ESLint promise/avoid-new warnings
 */

export const sleep = (ms: number): Promise<void> => {
  // eslint-disable-next-line promise/avoid-new
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
};
