import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  hasDocxZipSignature,
  parsePdfPageCount,
} from '../src/modules/task-documents/taskDocumentPreview.service';

describe('task document DOCX preview', () => {
  it('accepts the standard ZIP signatures used by DOCX containers', () => {
    assert.equal(hasDocxZipSignature(Buffer.from([0x50, 0x4b, 0x03, 0x04])), true);
    assert.equal(hasDocxZipSignature(Buffer.from([0x50, 0x4b, 0x05, 0x06])), true);
    assert.equal(hasDocxZipSignature(Buffer.from('not-a-docx')), false);
  });

  it('reads a positive page count from pdfinfo output', () => {
    assert.equal(parsePdfPageCount('Title: Test\nPages:          49\n'), 49);
    assert.equal(parsePdfPageCount('Pages: 0\n'), null);
    assert.equal(parsePdfPageCount('Page size: 612 x 792 pts\n'), null);
  });
});
