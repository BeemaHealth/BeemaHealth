/** Account API: login identity, patient profile, addresses, data requests, export. */
import { apiDelete, apiGet, apiPatch, apiPost } from "./client";

export interface Me {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  phone: string;
  kind: string;
  timezone: string;
  language: string;
  email_verified: boolean;
  roles: { organization: string; role: string }[];
  has_patient_profile: boolean;
}

export interface MeUpdate {
  first_name?: string;
  last_name?: string;
  phone?: string;
  timezone?: string;
  language?: string;
}

export interface PatientProfile {
  id: string;
  /** YYYY-MM-DD */
  date_of_birth: string | null;
  sex_at_birth: string;
  gender_identity: string;
  height_inches: string | null;
  starting_weight_lbs: string | null;
  goal_weight_lbs: string | null;
  preferred_pharmacy_note: string;
  created_at: string;
  updated_at: string;
}

export type AddressKind = "home" | "shipping" | "billing";

export interface Address {
  id: string;
  kind: AddressKind;
  line1: string;
  line2: string;
  city: string;
  state: string;
  zip_code: string;
  is_default: boolean;
  validated_at: string | null;
  created_at: string;
}

export type AddressInput = Omit<Address, "id" | "validated_at" | "created_at">;

export type DataRequestKind = "export" | "deletion";
export type DataRequestStatus =
  | "requested"
  | "in_review"
  | "completed"
  | "denied";

export interface DataRequest {
  id: string;
  kind: DataRequestKind;
  status: DataRequestStatus;
  completed_at: string | null;
  created_at: string;
}

export function getMe(): Promise<Me> {
  return apiGet<Me>("/auth/me/");
}

export function updateMe(input: MeUpdate): Promise<Me> {
  return apiPatch<Me>("/auth/me/", input);
}

export function getProfile(): Promise<PatientProfile> {
  return apiGet<PatientProfile>("/patients/me/profile/");
}

export function listAddresses(): Promise<Address[]> {
  return apiGet<Address[]>("/patients/addresses/");
}

export function createAddress(input: AddressInput): Promise<Address> {
  return apiPost<Address>("/patients/addresses/", input);
}

export function updateAddress(
  id: string,
  input: Partial<AddressInput>,
): Promise<Address> {
  return apiPatch<Address>(
    `/patients/addresses/${encodeURIComponent(id)}/`,
    input,
  );
}

export function deleteAddress(id: string): Promise<void> {
  return apiDelete(`/patients/addresses/${encodeURIComponent(id)}/`);
}

export function listDataRequests(): Promise<DataRequest[]> {
  return apiGet<DataRequest[]>("/patients/data-requests/");
}

export function createDataRequest(kind: DataRequestKind): Promise<DataRequest> {
  return apiPost<DataRequest>("/patients/data-requests/", { kind });
}

/** Full export as JSON. Hold in memory only and hand straight to a file download. */
export function exportMyData(): Promise<Record<string, unknown>> {
  return apiGet<Record<string, unknown>>("/patients/export/");
}
