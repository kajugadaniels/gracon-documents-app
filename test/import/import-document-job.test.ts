import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
    canUseImportWorker,
    isDocxImportFile,
} from '../../src/lib/import-document-job.ts';

describe('document import job routing', () => {
    it('routes only DOCX files to the background worker path', () => {
        assert.equal(isDocxImportFile({ name: 'contract.docx' }), true);
        assert.equal(isDocxImportFile({ name: 'legacy.doc' }), false);
        assert.equal(isDocxImportFile({ name: 'scan.pdf' }), false);
    });

    it('falls back outside the browser worker environment', () => {
        assert.equal(canUseImportWorker({ name: 'contract.docx' }), false);
    });
});
