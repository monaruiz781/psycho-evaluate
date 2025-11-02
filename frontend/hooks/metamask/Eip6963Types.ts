export interface Eip6963ProviderInfo {
  uuid: string;
  name: string;
  icon: string;
  rdns: string;
}

export interface Eip6963ProviderDetail {
  info: Eip6963ProviderInfo;
  provider: unknown;
}

export interface Eip6963AnnounceProviderEvent {
  detail: Eip6963ProviderDetail;
}

