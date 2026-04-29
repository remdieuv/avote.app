"use client";

/**
 * Résout le mode (TEST / RÉEL) à partir d'un objet event ou poll.
 * - côté backend : `isLiveConsumed`, `isLocked`
 * - côté public/pollToJson : `eventIsLiveConsumed`, `eventIsLocked`
 */
export function useEventMode(eventLike) {
  const isLiveConsumed =
    eventLike?.eventIsLiveConsumed ?? eventLike?.isLiveConsumed ?? null;
  const isLocked = eventLike?.eventIsLocked ?? eventLike?.isLocked ?? null;

  return {
    isLiveConsumed: isLiveConsumed === true || isLiveConsumed === false ? isLiveConsumed : null,
    isRealMode: isLiveConsumed === true,
    isTestMode: isLiveConsumed === false,
    isLocked: isLocked === true,
  };
}

