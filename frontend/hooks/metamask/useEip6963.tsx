import { useEffect, useMemo, useRef, useState } from "react";

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

export interface Eip6963State {
  uuids: Record<string, Eip6963ProviderDetail> | undefined;
  error: Error | undefined;
  providers: Eip6963ProviderDetail[];
}

export function useEip6963(): Eip6963State {
  const [error, setError] = useState<Error | undefined>(undefined);
  const [uuids, setUuids] = useState<
    Record<string, Eip6963ProviderDetail> | undefined
  >(undefined);
  const activeLoadId = useRef(0);
  const isListener = useRef<boolean>(false);
  const providers = useMemo<Eip6963ProviderDetail[]>(() => uuids ? Object.values(uuids) : [], [uuids]);

  function _addUuidInternal(providerDetail: Eip6963ProviderDetail) {
    setUuids((prev) => {
      if (!prev) {
        return { [providerDetail.info.uuid]: providerDetail };
      }
      const existing = prev[providerDetail.info.uuid];
      if (
        !!existing &&
        existing.info.uuid === providerDetail.info.uuid &&
        existing.info.name === providerDetail.info.name &&
        existing.info.rdns === providerDetail.info.rdns &&
        existing.info.icon === providerDetail.info.icon &&
        existing.provider === providerDetail.provider
      ) {
        return prev;
      }
      return { ...prev, [providerDetail.info.uuid]: providerDetail };
    });
  }

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    if (isListener.current) {
      return;
    }

    isListener.current = true;
    const thisLoadId = ++activeLoadId.current;

    const handler = (event: Event) => {
      const customEvent = event as CustomEvent<Eip6963ProviderDetail>;
      const detail = customEvent.detail;
      if (thisLoadId !== activeLoadId.current) {
        return;
      }
      _addUuidInternal({
        info: detail.info,
        provider: detail.provider,
      });
    };

    window.addEventListener("eip6963:announceProvider", handler);
    window.dispatchEvent(new Event("eip6963:requestProvider"));

    return () => {
      window.removeEventListener("eip6963:announceProvider", handler);
    };
  }, []);

  return {
    uuids,
    error,
    providers,
  };
}


