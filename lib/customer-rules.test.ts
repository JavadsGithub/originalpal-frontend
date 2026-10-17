import { describe, expect, it } from "vitest";
import {
  MIN_PASSWORD_LENGTH,
  PASSWORD_TOO_SHORT_MESSAGE,
  formatAddressLine,
  validateAddress,
  validatePasswordReset,
  validateProfileUpdate,
  validateRegistration,
} from "./customer-rules";

/**
 * These rules mirror what the live backend answered (see `docs/integration/contract-audit.md` §11):
 * 8-character passwords, no email in `PUT /api/auth/me`, and non-blank address fields.
 */
describe("validateRegistration", () => {
  const valid = {
    firstName: "Cus",
    lastName: "Tomer",
    email: "cus@example.com",
    username: "cus",
    password: "Secret123",
  };

  it("accepts a complete registration", () => {
    expect(validateRegistration(valid)).toEqual({});
  });

  it("names the exact fields the API would answer for", () => {
    expect(
      validateRegistration({ ...valid, email: "", username: "   ", firstName: "", lastName: "" }),
    ).toEqual({
      firstName: "This field is required",
      lastName: "This field is required",
      email: "This field is required",
      username: "This field is required",
    });
  });

  it("uses the backend's own password message", () => {
    expect(validateRegistration({ ...valid, password: "short" })).toEqual({
      password: PASSWORD_TOO_SHORT_MESSAGE,
    });
    expect(MIN_PASSWORD_LENGTH).toBe(8);
    expect(validateRegistration({ ...valid, password: "12345678" })).toEqual({});
  });
});

describe("validateProfileUpdate", () => {
  it("refuses an empty form, the way the API does (422 field=profile)", () => {
    expect(validateProfileUpdate({ firstName: "", lastName: "", username: "" })).toEqual({
      profile: "Fill in at least one field to update",
    });
  });

  it("accepts a single changed field", () => {
    expect(validateProfileUpdate({ firstName: "Renamed", lastName: "", username: "" })).toEqual({});
  });
});

describe("validateAddress", () => {
  const valid = {
    label: "Home",
    recipientName: "Cus Tomer",
    phone: "+15550001",
    country: "US",
    city: "Boston",
    addressLine1: "1 Beacon St",
    postalCode: "02108",
    isDefault: false,
  };

  it("accepts a complete address", () => {
    expect(validateAddress(valid)).toEqual({});
  });

  it("flags blank fields (the API answers a FastAPI 422 for the same inputs)", () => {
    expect(validateAddress({ ...valid, label: "  " })).toEqual({ label: "This field is required" });
    expect(Object.keys(validateAddress({ ...valid, postalCode: "" }))).toEqual(["postalCode"]);
  });

  it("never flags the default checkbox", () => {
    expect(validateAddress({ ...valid, isDefault: true })).toEqual({});
  });
});

describe("validatePasswordReset", () => {
  it("requires a token and a long enough password", () => {
    expect(validatePasswordReset("", "")).toEqual({
      token: "Paste the recovery token from the previous step",
      newPassword: "This field is required",
    });
    expect(validatePasswordReset("tok", "short")).toEqual({
      newPassword: PASSWORD_TOO_SHORT_MESSAGE,
    });
    expect(validatePasswordReset("tok", "NewSecret1")).toEqual({});
  });
});

describe("formatAddressLine", () => {
  it("renders the one-line form used by the address book", () => {
    expect(
      formatAddressLine({
        address_line1: "1 Beacon St",
        city: "Boston",
        postal_code: "02108",
        country: "US",
      }),
    ).toBe("1 Beacon St, Boston 02108, US");
  });
});
