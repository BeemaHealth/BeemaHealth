import { Loader2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import {
  formatVerifiedAddress,
  searchUsAddressSuggestions,
  type AddressSuggestion,
} from "@/lib/address-search";
import { formatPhoneInput } from "@/lib/form-validation";
import {
  searchPharmacySuggestions,
  type PharmacySuggestion,
} from "@/lib/pharmacy-search";
import { Field, inputCls } from "./quiz-primitives";

type PharmacyPrefs = {
  preferred_pharmacy?: string;
  pharmacy_phone?: string;
  pharmacy_address?: string;
  insurance_provider?: string;
  member_id?: string;
};

type LocationContext = {
  city?: string;
  state?: string;
  zip?: string;
};

export function PharmacyPreferenceFields({
  value,
  location,
  onChange,
}: {
  value: PharmacyPrefs;
  location?: LocationContext | null;
  onChange: (next: PharmacyPrefs) => void;
}) {
  return (
    <div className="grid gap-4">
      <PreferredPharmacyField
        value={value.preferred_pharmacy ?? ""}
        location={location}
        onChange={(preferred_pharmacy, pharmacy_address) =>
          onChange({
            ...value,
            preferred_pharmacy,
            ...(pharmacy_address ? { pharmacy_address } : {}),
          })
        }
      />
      <Field label="Pharmacy phone">
        <input
          className={inputCls}
          type="tel"
          autoComplete="tel"
          placeholder="(555) 123-4567"
          value={value.pharmacy_phone ?? ""}
          onChange={(e) =>
            onChange({
              ...value,
              pharmacy_phone: formatPhoneInput(e.target.value),
            })
          }
        />
      </Field>
      <PharmacyAddressField
        value={value.pharmacy_address ?? ""}
        onChange={(pharmacy_address) =>
          onChange({ ...value, pharmacy_address })
        }
      />
      <Field label="Insurance provider">
        <input
          className={inputCls}
          value={value.insurance_provider ?? ""}
          placeholder="e.g. Aetna, Blue Cross, UnitedHealthcare"
          onChange={(e) =>
            onChange({ ...value, insurance_provider: e.target.value })
          }
        />
      </Field>
      <Field label="Member ID">
        <input
          className={inputCls}
          value={value.member_id ?? ""}
          placeholder="Letters and numbers from your insurance card"
          onChange={(e) => onChange({ ...value, member_id: e.target.value })}
        />
      </Field>
    </div>
  );
}

function PreferredPharmacyField({
  value,
  location,
  onChange,
}: {
  value: string;
  location?: LocationContext | null;
  onChange: (name: string, address?: string) => void;
}) {
  const onChangeRef = useRef(onChange);
  const locationRef = useRef(location);
  const searchSeqRef = useRef(0);
  const containerRef = useRef<HTMLDivElement>(null);

  const [query, setQuery] = useState(value);
  const [suggestions, setSuggestions] = useState<PharmacySuggestion[]>([]);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [searching, setSearching] = useState(false);
  const [lookupError, setLookupError] = useState("");

  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  useEffect(() => {
    locationRef.current = location;
  }, [location]);

  useEffect(() => {
    setQuery(value);
  }, [value]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    const trimmed = query.trim();
    if (trimmed.length < 2) {
      setSuggestions([]);
      setDropdownOpen(false);
      setSearching(false);
      return;
    }

    const seq = ++searchSeqRef.current;
    setSearching(true);
    setDropdownOpen(true);
    const timer = window.setTimeout(() => {
      void searchPharmacySuggestions(trimmed, locationRef.current).then(
        (items) => {
          if (seq !== searchSeqRef.current) return;
          setSuggestions(items);
          setDropdownOpen(items.length > 0);
          setSearching(false);
          if (items.length === 0) {
            setLookupError(
              "No nearby pharmacies found. Try a chain name like Safeway or Costco, or enter details manually below.",
            );
          } else {
            setLookupError("");
          }
        },
      );
    }, 350);

    return () => window.clearTimeout(timer);
  }, [query]);

  function selectSuggestion(suggestion: PharmacySuggestion) {
    setDropdownOpen(false);
    setSuggestions([]);
    setLookupError("");
    setQuery(suggestion.name);
    onChangeRef.current(suggestion.name, suggestion.address);
  }

  return (
    <div ref={containerRef}>
      <Field label="Preferred pharmacy">
        <div className="relative">
          <input
            className={inputCls}
            value={query}
            autoComplete="off"
            placeholder="e.g. Safeway, Costco, CVS, Walgreens"
            onChange={(e) => {
              setQuery(e.target.value);
              setLookupError("");
              onChangeRef.current(e.target.value);
            }}
            onFocus={() => {
              if (
                query.trim().length >= 2 &&
                (searching || suggestions.length > 0)
              ) {
                setDropdownOpen(true);
              }
            }}
          />
          {dropdownOpen &&
            query.trim().length >= 2 &&
            (searching || suggestions.length > 0) && (
              <ul
                className="absolute z-20 mt-1 max-h-56 w-full overflow-auto rounded-2xl border border-border bg-background py-1 shadow-lg"
                role="listbox"
              >
                {searching ? (
                  <li
                    className="flex items-center gap-2 px-4 py-3 text-sm text-muted-foreground"
                    role="status"
                    aria-live="polite"
                  >
                    <Loader2
                      className="size-4 shrink-0 animate-spin"
                      aria-hidden="true"
                    />
                    Searching pharmacies…
                  </li>
                ) : (
                  suggestions.map((item) => (
                    <li key={item.id}>
                      <button
                        type="button"
                        role="option"
                        className="w-full px-4 py-2.5 text-left text-sm text-foreground hover:bg-muted/60"
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={() => selectSuggestion(item)}
                      >
                        <span className="block font-medium">{item.name}</span>
                        <span className="block text-xs text-muted-foreground">
                          {item.address}
                        </span>
                      </button>
                    </li>
                  ))
                )}
              </ul>
            )}
        </div>
        <p className="mt-1.5 text-xs text-muted-foreground">
          Enter your pharmacy name — we&apos;ll search near your home address
          when available.
        </p>
        {lookupError && !dropdownOpen && (
          <p className="mt-1.5 text-sm text-muted-foreground">{lookupError}</p>
        )}
      </Field>
    </div>
  );
}

function PharmacyAddressField({
  value,
  onChange,
}: {
  value: string;
  onChange: (address: string) => void;
}) {
  const onChangeRef = useRef(onChange);
  const searchSeqRef = useRef(0);
  const containerRef = useRef<HTMLDivElement>(null);

  const [query, setQuery] = useState(value);
  const [suggestions, setSuggestions] = useState<AddressSuggestion[]>([]);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [searching, setSearching] = useState(false);

  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  useEffect(() => {
    setQuery(value);
  }, [value]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    const trimmed = query.trim();
    if (trimmed.length < 4) {
      setSuggestions([]);
      setDropdownOpen(false);
      setSearching(false);
      return;
    }

    const seq = ++searchSeqRef.current;
    setSearching(true);
    setDropdownOpen(true);
    const timer = window.setTimeout(() => {
      void searchUsAddressSuggestions(trimmed).then((items) => {
        if (seq !== searchSeqRef.current) return;
        setSuggestions(items);
        setDropdownOpen(items.length > 0);
        setSearching(false);
      });
    }, 350);

    return () => window.clearTimeout(timer);
  }, [query]);

  function selectSuggestion(suggestion: AddressSuggestion) {
    setDropdownOpen(false);
    setSuggestions([]);
    const formatted = formatVerifiedAddress(suggestion.parsed);
    setQuery(formatted);
    onChangeRef.current(formatted);
  }

  return (
    <div ref={containerRef}>
      <Field label="Pharmacy address">
        <div className="relative">
          <input
            className={inputCls}
            value={query}
            autoComplete="off"
            placeholder="Street address, city, and ZIP"
            onChange={(e) => {
              setQuery(e.target.value);
              onChangeRef.current(e.target.value);
            }}
            onFocus={() => {
              if (
                query.trim().length >= 4 &&
                (searching || suggestions.length > 0)
              ) {
                setDropdownOpen(true);
              }
            }}
          />
          {dropdownOpen &&
            query.trim().length >= 4 &&
            (searching || suggestions.length > 0) && (
              <ul
                className="absolute z-20 mt-1 max-h-56 w-full overflow-auto rounded-2xl border border-border bg-background py-1 shadow-lg"
                role="listbox"
              >
                {searching ? (
                  <li
                    className="flex items-center gap-2 px-4 py-3 text-sm text-muted-foreground"
                    role="status"
                    aria-live="polite"
                  >
                    <Loader2
                      className="size-4 shrink-0 animate-spin"
                      aria-hidden="true"
                    />
                    Searching addresses…
                  </li>
                ) : (
                  suggestions.map((item) => (
                    <li key={item.id}>
                      <button
                        type="button"
                        role="option"
                        className="w-full px-4 py-2.5 text-left text-sm text-foreground hover:bg-muted/60"
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={() => selectSuggestion(item)}
                      >
                        {item.label}
                      </button>
                    </li>
                  ))
                )}
              </ul>
            )}
        </div>
        <p className="mt-1.5 text-xs text-muted-foreground">
          Start typing the pharmacy street address and choose a match, or enter
          the full address manually.
        </p>
      </Field>
    </div>
  );
}
