import assert from 'node:assert/strict';
import { test } from 'node:test';
import { buildViewMenuItems } from '../../src/constants/view-menu.ts';

test('view menu exposes print preview as a ready action', () => {
    const items = buildViewMenuItems({
        printLayout: true,
        canToggleMode: true,
        canConfigureLayout: true,
        viewMode: 'editing',
        zoom: 100,
        isFullscreen: false,
        showRuler: false,
        showFormattingMarks: false,
    });

    assert.ok(items.some((item) => (
        item.type === 'action' &&
        item.actionId === 'view:print-preview' &&
        item.label === 'Print preview'
    )));
});
