import { useState, useEffect, useCallback, useRef } from 'react';
import { HomeApi } from '../services/api/homeApi';
import { HomePersonalizedResponse } from '../services/api/homeTypes';
import { ApiError } from '../services/api/apiErrors';

type LoadStatus =
  | 'idle'
  | 'loading'
  | 'success'
  | 'partial'
  | 'empty-profile'
  | 'error';

const PROFILE_ERROR_CODES = new Set([
  'SELF_PROFILE_NOT_FOUND',
  'INCOMPLETE_BIRTH_DATA',
  'LOCATION_COORDINATES_MISSING',
  'TIMEZONE_MISSING',
]);

export function usePersonalizedHome() {
  const [status, setStatus] = useState<LoadStatus>('idle');
  const [data, setData] = useState<HomePersonalizedResponse | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isProfileError, setIsProfileError] = useState(false);
  const isMounted = useRef(true);
  const isFetching = useRef(false);

  const fetch = useCallback(async () => {
    // Prevent duplicate in-flight requests
    if (isFetching.current) return;
    isFetching.current = true;
    setStatus('loading');
    setErrorMessage(null);
    setIsProfileError(false);

    try {
      const result = await HomeApi.getPersonalizedHome();
      if (!isMounted.current) return;
      setData(result);
      setStatus(result.dataStatus === 'partial' ? 'partial' : 'success');
    } catch (err: unknown) {
      if (!isMounted.current) return;
      if (err instanceof ApiError) {
        if (PROFILE_ERROR_CODES.has(err.code)) {
          setIsProfileError(true);
          setStatus('empty-profile');
          setErrorMessage("Your birth details are incomplete. Please update your Kundli profile to see personalized insights.");
        } else if (err.statusCode === 401 || err.code === 'UNAUTHENTICATED') {
          // Let the app-level auth flow handle this; just set error state
          setStatus('error');
          setErrorMessage("Your session has expired. Please sign in again.");
        } else {
          setStatus('error');
          setErrorMessage("We couldn't load today's personalized insights.");
        }
      } else {
        setStatus('error');
        setErrorMessage("We couldn't load today's personalized insights.");
      }
    } finally {
      if (isMounted.current) {
        isFetching.current = false;
      }
    }
  }, []);

  useEffect(() => {
    isMounted.current = true;
    fetch();
    return () => {
      isMounted.current = false;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return {
    status,
    data,
    errorMessage,
    isProfileError,
    retry: fetch,
  };
}
