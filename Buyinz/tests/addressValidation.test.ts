import {
  isValidUsStateCode,
  isValidUsZipFormat,
  normalizeUsStateRegion,
  normalizeUsZipToFiveDigits,
  validateUsStoreAddressFormat,
} from '../lib/addressValidation';

describe('normalizeUsZipToFiveDigits', () => {
  it('returns first five digits', () => {
    expect(normalizeUsZipToFiveDigits('15213-1234')).toBe('15213');
    expect(normalizeUsZipToFiveDigits('15213')).toBe('15213');
  });
});

describe('isValidUsZipFormat', () => {
  it('accepts 5-digit and ZIP+4', () => {
    expect(isValidUsZipFormat('15213')).toBe(true);
    expect(isValidUsZipFormat('15213-1234')).toBe(true);
  });

  it('rejects invalid', () => {
    expect(isValidUsZipFormat('1234')).toBe(false);
    expect(isValidUsZipFormat('')).toBe(false);
    expect(isValidUsZipFormat('1521-1234')).toBe(false);
  });
});

describe('normalizeUsStateRegion and isValidUsStateCode', () => {
  it('normalizes to two uppercase letters', () => {
    expect(normalizeUsStateRegion('pa')).toBe('PA');
    expect(normalizeUsStateRegion('Pa ')).toBe('PA');
  });

  it('validates two-letter codes', () => {
    expect(isValidUsStateCode('PA')).toBe(true);
    expect(isValidUsStateCode('pa')).toBe(true);
    expect(isValidUsStateCode('P')).toBe(false);
    expect(isValidUsStateCode('Penn')).toBe(false);
  });
});

describe('validateUsStoreAddressFormat', () => {
  it('passes a typical US store address', () => {
    expect(
      validateUsStoreAddressFormat({
        address_line1: '5000 Forbes Ave',
        city: 'Pittsburgh',
        region: 'PA',
        postal_code: '15213',
      }).ok,
    ).toBe(true);
  });

  it('fails bad ZIP', () => {
    const r = validateUsStoreAddressFormat({
      address_line1: '1 Main St',
      city: 'Town',
      region: 'PA',
      postal_code: '1234',
    });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.message).toMatch(/ZIP/i);
  });

  it('fails non-two-letter state', () => {
    const r = validateUsStoreAddressFormat({
      address_line1: '1 Main St',
      city: 'Town',
      region: 'Pennsylvania',
      postal_code: '15213',
    });
    expect(r.ok).toBe(false);
  });
});
