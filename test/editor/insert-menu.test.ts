import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
    INSERT_ACTION_IDS,
    INSERT_ACTIONS,
    INSERT_MENU_ITEMS,
} from '../../src/constants/insert-menu.ts';

test('insert menu exposes page break as a ready action', () => {
    assert.equal(INSERT_ACTION_IDS.pageBreak, 'insert:page-break');
    assert.equal(INSERT_ACTIONS.pageBreak.status, 'ready');
    assert.equal(INSERT_ACTIONS.pageBreak.shortcut, '⌘↵');
    assert.ok(INSERT_MENU_ITEMS.some((item) => (
        item.type === 'action' && item.actionId === INSERT_ACTION_IDS.pageBreak
    )));
});

test('insert menu exposes section break as a ready action', () => {
    assert.equal(INSERT_ACTION_IDS.sectionBreak, 'insert:section-break');
    assert.equal(INSERT_ACTIONS.sectionBreak.status, 'ready');
    assert.ok(INSERT_MENU_ITEMS.some((item) => (
        item.type === 'action' && item.actionId === INSERT_ACTION_IDS.sectionBreak
    )));
});

test('insert menu exposes header and footer settings', () => {
    assert.equal(INSERT_ACTIONS.headerFooter.status, 'ready');
    assert.ok(INSERT_MENU_ITEMS.some((item) => (
        item.type === 'action' && item.actionId === INSERT_ACTION_IDS.headerFooter
    )));
});
