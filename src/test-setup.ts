import '@testing-library/jest-dom';

// jsdom does not implement DataTransfer — polyfill for paste event tests
if (typeof globalThis.DataTransfer === 'undefined') {
  class DataTransferPolyfill {
    private data: Record<string, string> = {};
    setData(format: string, value: string) { this.data[format] = value; }
    getData(format: string) { return this.data[format] ?? ''; }
    clearData() { this.data = {}; }
  }
  (globalThis as any).DataTransfer = DataTransferPolyfill;
}
