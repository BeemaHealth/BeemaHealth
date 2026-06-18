import { useEffect, useRef, useState } from "react";
import {
  isValidCity,
  isValidStreetAddress,
  isValidUsZip,
  parseGoogleAddressComponents,
  verifyCityZip,
} from "@/lib/address-validation";
import { Field, inputCls } from "./quiz-primitives";

type AddressValue = {
  address: string;
  city: string;
  zip: string;
  verified: boolean;
};

type GoogleMapsPlaces = {
  maps: {
    places: {
      Autocomplete: new (
        input: HTMLInputElement,
        opts?: {
          componentRestrictions?: { country: string | string[] };
          fields?: string[];
          types?: string[];
        },
      ) => {
        addListener: (event: string, handler: () => void) => void;
        getPlace: () => { address_components?: { long_name: string; short_name: string; types: string[] }[] };
      };
    };
  };
};

declare global {
  interface Window {
    google?: GoogleMapsPlaces;
  }
}

const GOOGLE_KEY = import.meta.env.VITE_GOOGLE_PLACES_API_KEY?.trim() ?? "";

let googleLoader: Promise<void> | null = null;

function loadGooglePlaces(): Promise<void> {
  if (!GOOGLE_KEY) return Promise.reject(new Error("Google Places API key not configured"));
  if (window.google?.maps?.places) return Promise.resolve();
  if (googleLoader) return googleLoader;

  googleLoader = new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(GOOGLE_KEY)}&libraries=places&loading=async`;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Failed to load address suggestions"));
    document.head.appendChild(script);
  });

  return googleLoader;
}

export function AddressFields({
  value,
  expectedState,
  onChange,
}: {
  value: AddressValue;
  expectedState?: string | null;
  onChange: (next: AddressValue) => void;
}) {
  const addressRef = useRef<HTMLInputElement>(null);
  const onChangeRef = useRef(onChange);
  const expectedStateRef = useRef(expectedState);
  const valueRef = useRef(value);
  const skipNextBlurRef = useRef(false);
  const [lookupError, setLookupError] = useState("");
  const [checking, setChecking] = useState(false);
  const [placesReady, setPlacesReady] = useState(false);

  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  useEffect(() => {
    expectedStateRef.current = expectedState;
  }, [expectedState]);

  useEffect(() => {
    valueRef.current = value;
  }, [value]);

  useEffect(() => {
    if (value.verified) return;
    if (!isValidStreetAddress(value.address) || !isValidCity(value.city) || !isValidUsZip(value.zip)) {
      return;
    }
    void validateManualEntry(value);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!GOOGLE_KEY) return;
    let cancelled = false;

    loadGooglePlaces()
      .then(() => {
        if (cancelled || !addressRef.current || !window.google?.maps?.places) return;

        const autocomplete = new window.google.maps.places.Autocomplete(addressRef.current, {
          componentRestrictions: { country: "us" },
          fields: ["address_components"],
          types: ["address"],
        });

        autocomplete.addListener("place_changed", () => {
          const place = autocomplete.getPlace();
          if (!place.address_components?.length) return;

          const parsed = parseGoogleAddressComponents(place.address_components);
          if (!parsed.address || !parsed.city || !parsed.zip) {
            setLookupError("Select a complete street address from the suggestions.");
            onChangeRef.current({ address: parsed.address, city: parsed.city, zip: parsed.zip, verified: false });
            return;
          }

          const accountState = expectedStateRef.current?.trim();
          if (accountState && parsed.state.toUpperCase() !== accountState.toUpperCase()) {
            setLookupError(
              `This address is in ${parsed.state}, but your account state is ${accountState.toUpperCase()}. Use your home address in ${accountState.toUpperCase()}.`,
            );
            onChangeRef.current({
              address: parsed.address,
              city: parsed.city,
              zip: parsed.zip,
              verified: false,
            });
            return;
          }

          setLookupError("");
          skipNextBlurRef.current = true;
          onChangeRef.current({
            address: parsed.address,
            city: parsed.city,
            zip: parsed.zip,
            verified: true,
          });
        });

        setPlacesReady(true);
      })
      .catch(() => {
        if (!cancelled) setPlacesReady(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  function handleBlur() {
    if (skipNextBlurRef.current) {
      skipNextBlurRef.current = false;
      return;
    }
    void validateManualEntry(valueRef.current);
  }

  async function validateManualEntry(next: AddressValue) {
    setLookupError("");
    if (!isValidStreetAddress(next.address)) {
      onChange({ ...next, verified: false });
      return;
    }
    if (!isValidCity(next.city) || !isValidUsZip(next.zip)) {
      onChange({ ...next, verified: false });
      return;
    }

    setChecking(true);
    const result = await verifyCityZip(next.city, next.zip, expectedState);
    setChecking(false);

    if (!result.ok) {
      setLookupError(result.message);
      onChange({ ...next, verified: false });
      return;
    }

    setLookupError("");
    onChange({ ...next, verified: true });
  }

  function patch(partial: Partial<AddressValue>) {
    const next = { ...value, ...partial, verified: false };
    onChange(next);
    setLookupError("");
  }

  return (
    <div className="grid gap-3 sm:col-span-2">
      <Field label="Home address" required>
        <input
          ref={addressRef}
          className={inputCls}
          value={value.address}
          autoComplete="street-address"
          placeholder={placesReady ? "Start typing your street address…" : "123 Main St"}
          onChange={(e) => patch({ address: e.target.value })}
          onBlur={handleBlur}
        />
        {placesReady && (
          <p className="mt-1.5 text-xs text-muted-foreground">
            Select your address from the suggestions so we can verify it.
          </p>
        )}
      </Field>

      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="City" required>
          <input
            className={inputCls}
            value={value.city}
            autoComplete="address-level2"
            onChange={(e) => patch({ city: e.target.value })}
            onBlur={handleBlur}
          />
        </Field>
        <Field label="ZIP" required>
          <input
            className={inputCls}
            value={value.zip}
            inputMode="numeric"
            autoComplete="postal-code"
            placeholder="12345"
            onChange={(e) => patch({ zip: e.target.value })}
            onBlur={handleBlur}
          />
        </Field>
      </div>

      {checking && <p className="text-sm text-muted-foreground">Checking address…</p>}
      {lookupError && <p className="text-sm text-destructive">{lookupError}</p>}
      {value.verified && !lookupError && (
        <p className="text-sm text-primary">Address verified.</p>
      )}
    </div>
  );
}
