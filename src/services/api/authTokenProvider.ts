type TokenProvider = () => Promise<string | null>;

let tokenProvider: TokenProvider = async () => null;

export const setTokenProvider = (provider: TokenProvider) => {
  tokenProvider = provider;
};

export const getAccessToken = async (): Promise<string | null> => {
  return await tokenProvider();
};
