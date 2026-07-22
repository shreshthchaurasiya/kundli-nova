export interface LocationResolutionInput {
  city: string;
  district?: string;
  state: string;
  country: string; // "India"
}

export interface LocationResolutionResult {
  latitude: number;
  longitude: number;
  timezone: string;
}

export interface LocationResolver {
  resolve(input: LocationResolutionInput): Promise<LocationResolutionResult>;
}
