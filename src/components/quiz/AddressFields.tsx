import { Loader2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import type { ParsedUsAddress } from "@/lib/address-validation";
import {
  formatVerifiedAddress,
  searchUsAddressSuggestions,
  verifyParsedUsAddress,
  type AddressSuggestion,
} from "@/lib/address-search";
import { Field, inputCls } from "./quiz-primitives";

type AddressValue = {
  address: string;
  city: string;
  zip: string;
  county: string;
  verified: boolean;
};

function toParsed(value: AddressValue, state?: string | null): ParsedUsAddress {
  return {
    address: value.address,
    city: value.city,
    zip: value.zip,
    state: state ?? "",
    county: value.county,
  };
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
  const onChangeRef = useRef(onChange);
  const expectedStateRef = useRef(expectedState);
  const searchSeqRef = useRef(0);
  const containerRef = useRef<HTMLDivElement>(null);

  const [query, setQuery] = useState(() =>
    value.verified && value.address
      ? formatVerifiedAddress(toParsed(value, expectedState))
      : "",
  );
  const [suggestions, setSuggestions] = useState<AddressSuggestion[]>([]);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [searching, setSearching] = useState(false);
  const [checking, setChecking] = useState(false);
  const [lookupError, setLookupError] = useState("");

  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  useEffect(() => {
    expectedStateRef.current = expectedState;
  }, [expectedState]);

  useEffect(() => {
    if (value.verified && value.address) {
      setQuery(formatVerifiedAddress(toParsed(value, expectedState)));
    }
    // Keep summary in sync when a saved draft is loaded.
    // eslint-disable-next-line react-hooks/exhaustive-deps -- value fields listed above
  }, [value.verified, value.address, value.city, value.zip, expectedState]);

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
    if (value.verified) {
      setSuggestions([]);
      setDropdownOpen(false);
      return;
    }

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
        if (items.length === 0) {
          setLookupError(
            "No matching addresses found. Try adding city or ZIP, then pick a suggestion.",
          );
        } else {
          setLookupError("");
        }
      });
    }, 350);

    return () => window.clearTimeout(timer);
  }, [query, value.verified]);

  function clearAddress() {
    setQuery("");
    setSuggestions([]);
    setDropdownOpen(false);
    setLookupError("");
    onChangeRef.current({
      address: "",
      city: "",
      zip: "",
      county: "",
      verified: false,
    });
  }

  async function selectSuggestion(suggestion: AddressSuggestion) {
    setDropdownOpen(false);
    setSuggestions([]);
    setLookupError("");
    setChecking(true);

    const result = await verifyParsedUsAddress(
      suggestion.parsed,
      expectedStateRef.current,
    );
    setChecking(false);

    if (!result.ok) {
      setLookupError(result.message);
      onChangeRef.current({
        address: suggestion.parsed.address,
        city: suggestion.parsed.city,
        zip: suggestion.parsed.zip,
        county: suggestion.parsed.county,
        verified: false,
      });
      setQuery(suggestion.label.split(",").slice(0, 2).join(",").trim());
      return;
    }

    setQuery(formatVerifiedAddress(suggestion.parsed));
    onChangeRef.current({
      address: suggestion.parsed.address,
      city: suggestion.parsed.city,
      zip: suggestion.parsed.zip,
      county: suggestion.parsed.county,
      verified: true,
    });
  }

  return (
    <div ref={containerRef} className="grid gap-2 sm:col-span-2">
      <Field label="Home address" required>
        <div className="relative">
          <input
            className={inputCls}
            value={query}
            autoComplete="off"
            placeholder="Start typing your full address…"
            readOnly={value.verified}
            onChange={(e) => {
              if (value.verified) return;
              setQuery(e.target.value);
              setLookupError("");
              onChangeRef.current({
                address: "",
                city: "",
                zip: "",
                county: "",
                verified: false,
              });
            }}
            onFocus={() => {
              if (
                !value.verified &&
                query.trim().length >= 4 &&
                (searching || suggestions.length > 0)
              ) {
                setDropdownOpen(true);
              }
            }}
          />
          {dropdownOpen &&
            !value.verified &&
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
                        onClick={() => void selectSuggestion(item)}
                      >
                        {item.label}
                      </button>
                    </li>
                  ))
                )}
              </ul>
            )}
        </div>
        {!value.verified && (
          <p className="mt-1.5 text-xs text-muted-foreground">
            Type your street address, city, or ZIP — then choose your home
            address from the list.
          </p>
        )}
      </Field>

      {value.verified && (
        <button
          type="button"
          className="justify-self-start text-sm text-primary underline"
          onClick={clearAddress}
        >
          Change address
        </button>
      )}

      {checking && (
        <p className="text-sm text-muted-foreground">Verifying address…</p>
      )}
      {lookupError && <p className="text-sm text-destructive">{lookupError}</p>}
      {value.verified && !lookupError && (
        <p className="text-sm text-primary">Address verified for delivery.</p>
      )}
    </div>
  );
}
