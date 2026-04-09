import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from '@/contexts/AuthContext';

export const MAX_FREE_LISTINGS = 6;

const keyPro = (userId: string) => `buyinz_pro_${userId}`;
const keyCount = (userId: string) => `listing_count_${userId}`;

type SubscriptionContextType = {
  /** False until AsyncStorage has been read for the current user. */
  isReady: boolean;
  isBuyinzPro: boolean;
  listingCount: number;
  maxFreeListings: number;
  canCreateListing: boolean;
  setBuyinzPro: (value: boolean) => Promise<void>;
  incrementListingCount: () => Promise<void>;
  decrementListingCount: () => Promise<void>;
  resetForCurrentUser: () => Promise<void>;
};

const SubscriptionContext = createContext<SubscriptionContextType | null>(null);

export function SubscriptionProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const storageId = user?.id ?? user?.username ?? 'guest';

  const [isReady, setIsReady] = useState(false);
  const [isBuyinzPro, setIsBuyinzProState] = useState(false);
  const [listingCount, setListingCountState] = useState(0);

  const load = useCallback(async () => {
    setIsReady(false);
    try {
      const [proRaw, countRaw] = await Promise.all([
        AsyncStorage.getItem(keyPro(storageId)),
        AsyncStorage.getItem(keyCount(storageId)),
      ]);
      setIsBuyinzProState(proRaw === 'true');
      const n = countRaw ? parseInt(countRaw, 10) : 0;
      setListingCountState(Number.isFinite(n) && n >= 0 ? n : 0);
    } catch {
      setIsBuyinzProState(false);
      setListingCountState(0);
    } finally {
      setIsReady(true);
    }
  }, [storageId]);

  useEffect(() => {
    load();
  }, [load]);

  const setBuyinzPro = useCallback(
    async (value: boolean) => {
      setIsBuyinzProState(value);
      await AsyncStorage.setItem(keyPro(storageId), value ? 'true' : 'false');
    },
    [storageId],
  );

  const incrementListingCount = useCallback(async () => {
    setListingCountState((c) => {
      const next = c + 1;
      void AsyncStorage.setItem(keyCount(storageId), String(next));
      return next;
    });
  }, [storageId]);

  const decrementListingCount = useCallback(async () => {
    setListingCountState((c) => {
      const next = Math.max(0, c - 1);
      void AsyncStorage.setItem(keyCount(storageId), String(next));
      return next;
    });
  }, [storageId]);

  const resetForCurrentUser = useCallback(async () => {
    setIsBuyinzProState(false);
    setListingCountState(0);
    await Promise.all([
      AsyncStorage.removeItem(keyPro(storageId)),
      AsyncStorage.removeItem(keyCount(storageId)),
    ]);
  }, [storageId]);

  const canCreateListing = isBuyinzPro || listingCount < MAX_FREE_LISTINGS;

  const value = useMemo(
    () => ({
      isReady,
      isBuyinzPro,
      listingCount,
      maxFreeListings: MAX_FREE_LISTINGS,
      canCreateListing,
      setBuyinzPro,
      incrementListingCount,
      decrementListingCount,
      resetForCurrentUser,
    }),
    [
      isReady,
      isBuyinzPro,
      listingCount,
      canCreateListing,
      setBuyinzPro,
      incrementListingCount,
      decrementListingCount,
      resetForCurrentUser,
    ],
  );

  return <SubscriptionContext.Provider value={value}>{children}</SubscriptionContext.Provider>;
}

export function useSubscription() {
  const ctx = useContext(SubscriptionContext);
  if (!ctx) throw new Error('useSubscription must be used within SubscriptionProvider');
  return ctx;
}
