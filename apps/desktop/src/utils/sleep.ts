/**
 * Sleep utility for testing and timing operations
 * Avoids ESLint promise/avoid-new warnings
 */

/* eslint-disable-next-line promise/avoid-new */
export const sleep = (ms: number): Promise<void> => {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
};
