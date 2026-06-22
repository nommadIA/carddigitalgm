import { useEffect, useState, useRef } from 'react';

export const usePullToRefresh = (onRefresh: () => void) => {
  // Disabled pull-to-refresh to prevent accidental/unsolicited screen reloads on touch scrolling
  return { pullProgress: 0, isPulling: false };
};
