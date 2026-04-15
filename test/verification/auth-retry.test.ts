import test from 'node:test';
import assert from 'node:assert/strict';
import { AxiosHeaders } from 'axios';
import {
    canRetryUnauthorizedRequest,
    handleUnauthorizedRetry,
    type RetryableRequestConfig,
} from '../../src/api/auth-retry.ts';

test('retries one unauthorized request after a successful refresh', async () => {
    const original: RetryableRequestConfig = {
        url: '/verification/status',
        headers: { Accept: 'application/json' },
    };
    const calls: RetryableRequestConfig[] = [];

    const result = await handleUnauthorizedRetry(
        {
            response: { status: 401 },
            config: original,
        },
        {
            retryRequest: async (config) => {
                calls.push(config);
                return { ok: true };
            },
            refreshAccessToken: async () => ({
                status: 'refreshed',
                accessToken: 'new-access-token',
            }),
            redirectToLogin: () => {
                throw new Error('redirect should not be called');
            },
            getIntendedPath: () => '/invitations/token-123',
        },
    );

    assert.deepEqual(result, { ok: true });
    assert.equal(calls.length, 1);
    assert.equal(calls[0]?._retry, true);
    assert.ok(calls[0]?.headers instanceof AxiosHeaders);
    assert.equal(
        calls[0]?.headers?.get('Authorization'),
        'Bearer new-access-token',
    );
});

test('redirects to login when refresh reports unauthenticated', async () => {
    const redirects: string[] = [];

    await assert.rejects(() =>
        handleUnauthorizedRetry(
            {
                response: { status: 401 },
                config: { url: '/verification/submit' },
            },
            {
                retryRequest: async () => ({ ok: true }),
                refreshAccessToken: async () => ({
                    status: 'unauthenticated',
                }),
                redirectToLogin: (path) => {
                    redirects.push(path);
                },
                getIntendedPath: () => '/invitations/token-123',
            },
        ),
    );

    assert.deepEqual(redirects, ['/invitations/token-123']);
});

test('does not retry non-401 or already retried requests', async () => {
    assert.equal(
        canRetryUnauthorizedRequest({
            response: { status: 500 },
            config: { url: '/verification/status' },
        }),
        false,
    );
    assert.equal(
        canRetryUnauthorizedRequest({
            response: { status: 401 },
            config: { url: '/verification/status', _retry: true },
        }),
        false,
    );

    const error = {
        response: { status: 401 },
        config: { url: '/verification/status', _retry: true },
    };

    await assert.rejects(() =>
        handleUnauthorizedRetry(error, {
            retryRequest: async () => ({ ok: true }),
            refreshAccessToken: async () => ({
                status: 'refreshed',
                accessToken: 'unused',
            }),
            redirectToLogin: () => undefined,
            getIntendedPath: () => '/',
        }),
    );
});
